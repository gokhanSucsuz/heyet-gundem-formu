const crypto = require('crypto');
const http = require('http');
const { execSync, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  coolifyHost: 'localhost',
  coolifyPort: 8000,
  webhookPath: '/webhooks/source/github/events/manual',
  webhookSecret: 'fOjb8XD5maV6Oc5b7fiFh5s6yBtw4hVfFsxCvLXu',
  repoFullName: 'gokhanSucsuz/heyet-gundem-formu',
  branch: 'main',
  appUuid: 'w03fp62f5yw95qrwkx4t103e',
  dbContainer: 'coolify-db',
  dbUser: 'coolify',
  dbName: 'coolify',
  projectRoot: path.resolve(__dirname, '..')
};

function log(msg) {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${timestamp}] ${msg}`);
}

function sendNotification(title, message, type = 'Info') {
  try {
    const notifyScript = path.join(__dirname, 'notify.ps1');
    execFile('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', notifyScript,
      '-Title', title,
      '-Message', message,
      '-Type', type
    ], { windowsHide: true }, () => {});
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

function getTargetCommit() {
  const commitArgIndex = process.argv.indexOf('--commit');
  if (commitArgIndex !== -1 && process.argv[commitArgIndex + 1]) {
    return process.argv[commitArgIndex + 1].trim();
  }

  try {
    const remoteOut = execSync('git ls-remote origin main', { cwd: CONFIG.projectRoot, encoding: 'utf8' });
    const match = remoteOut.match(/^([a-f0-9]{40})/);
    if (match) return match[1];
  } catch (e) {}

  try {
    return execSync('git rev-parse HEAD', { cwd: CONFIG.projectRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    return 'HEAD';
  }
}

function isCoolifyBusy() {
  try {
    const cmd = `docker exec ${CONFIG.dbContainer} psql -U ${CONFIG.dbUser} -d ${CONFIG.dbName} -t -A -c "SELECT count(*) FROM application_deployment_queues WHERE application_id = '2' AND status IN ('in_progress', 'queued');"`;
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    return parseInt(out, 10) > 0;
  } catch (e) {
    return false;
  }
}

function checkDeploymentStatus(deploymentUuid) {
  try {
    const cmd = `docker exec ${CONFIG.dbContainer} psql -U ${CONFIG.dbUser} -d ${CONFIG.dbName} -t -A -c "SELECT status FROM application_deployment_queues WHERE deployment_uuid = '${deploymentUuid}';"`;
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function triggerWebhook(commitSha) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      ref: `refs/heads/${CONFIG.branch}`,
      after: commitSha,
      repository: {
        full_name: CONFIG.repoFullName
      }
    });

    const signature = crypto.createHmac('sha256', CONFIG.webhookSecret).update(payload).digest('hex');

    const req = http.request({
      hostname: CONFIG.coolifyHost,
      port: CONFIG.coolifyPort,
      path: CONFIG.webhookPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': `local-${Date.now()}`,
        'X-Hub-Signature-256': `sha256=${signature}`
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json[0]?.deployment_uuid) {
            resolve({ success: true, deploymentUuid: json[0].deployment_uuid, raw: json[0] });
          } else {
            resolve({ success: res.statusCode === 200, raw: data });
          }
        } catch (e) {
          resolve({ success: res.statusCode === 200, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function triggerFallbackTinker(commitSha) {
  try {
    log('Webhook bağlantısı başarısız oldu, doğrudan Coolify PHP motoru üzerinden tetikleniyor...');
    const tinkerCmd = `docker exec coolify php artisan tinker --execute="\$r = queue_application_deployment(application: App\\Models\\Application::where('uuid', '${CONFIG.appUuid}')->first(), deployment_uuid: new_public_id(), commit: '${commitSha}', is_webhook: true); echo json_encode(\$r);"`;
    const out = execSync(tinkerCmd, { encoding: 'utf8' });
    return { success: true, fallback: true, raw: out };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function waitForCompletion(deploymentUuid, commitSha) {
  const maxAttempts = 60; // 60 * 5s = 5 minutes
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000));
    attempts++;
    const status = checkDeploymentStatus(deploymentUuid);
    log(`[Deploy Durumu] ${status} (${attempts * 5}s)`);

    if (status === 'finished') {
      sendNotification(
        'Coolify Deploy Başarılı! ✅',
        `heyet-gundem-formu (${commitSha.slice(0, 7)}) başarıyla güncellendi ve yayında.`
      );
      fs.writeFileSync(path.join(CONFIG.projectRoot, '.coolify-deployed-sha'), commitSha, 'utf8');
      return true;
    } else if (status === 'failed' || status === 'cancelled') {
      sendNotification(
        'Coolify Deploy Başarısız! ❌',
        `Derleme hatası oluştu (Durum: ${status}). Coolify loglarını kontrol ediniz.`,
        'Error'
      );
      return false;
    }
  }

  sendNotification(
    'Coolify Deploy Zaman Aşımı ⚠️',
    'Derleme işlemi 5 dakikadan uzun sürdü. Arka planda devam ediyor olabilir.',
    'Warning'
  );
  return false;
}

async function main() {
  const commitSha = getTargetCommit();
  const shortSha = commitSha.slice(0, 7);

  log(`Deploy hedef commit: ${shortSha} (${commitSha})`);

  if (isCoolifyBusy()) {
    log('⚠️ Zaten devam eden bir Coolify derleme işlemi var (Debounce koruması). Bu istek sıraya alındı veya atlandı.');
    return;
  }

  sendNotification(
    'Coolify Deploy Başlatıldı 🚀',
    `Commit: ${shortSha} Coolify üzerinde derleniyor...`
  );

  let deployResult;
  try {
    deployResult = await triggerWebhook(commitSha);
  } catch (err) {
    log(`Webhook isteği hata verdi (${err.message}). Fallback deneniyor...`);
    deployResult = triggerFallbackTinker(commitSha);
  }

  if (deployResult.success) {
    log(`✅ Dağıtım sıraya alındı! UUID: ${deployResult.deploymentUuid || 'N/A'}`);
    if (deployResult.deploymentUuid) {
      await waitForCompletion(deployResult.deploymentUuid, commitSha);
    }
  } else {
    log(`❌ Dağıtım başlatılamadı: ${JSON.stringify(deployResult)}`);
    sendNotification(
      'Coolify Deploy Başlatılamadı! ❌',
      'Tetikleme isteği Coolify tarafından reddedildi.',
      'Error'
    );
  }
}

main().catch(err => {
  log(`Kritik hata: ${err.message}`);
  process.exit(1);
});

