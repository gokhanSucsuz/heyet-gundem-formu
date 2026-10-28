const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  intervalMs: 60 * 1000,
  logFile: path.resolve(__dirname, 'coolify-sync.log'),
  pidFile: path.resolve(__dirname, '..', '.coolify-poller.pid'),
  shaFile: path.resolve(__dirname, '..', '.coolify-deployed-sha'),
  dbContainer: 'coolify-db',
  dbUser: 'coolify',
  dbName: 'coolify'
};

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    process.stdout.write(line);
  } catch (e) {}
  try {
    fs.appendFileSync(CONFIG.logFile, line, 'utf8');
  } catch (e) {}
}

function getLastDeployedShaFromDb() {
  try {
    const cmd = `docker exec ${CONFIG.dbContainer} psql -U ${CONFIG.dbUser} -d ${CONFIG.dbName} -t -A -c "SELECT commit FROM application_deployment_queues WHERE application_id = '2' AND status = 'finished' ORDER BY id DESC LIMIT 1;"`;
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    if (out && out.length === 40) return out;
  } catch (e) {
    log(`[HATA] getLastDeployedShaFromDb: ${e.message}`);
  }
  return null;
}

function getRemoteSha() {
  try {
    const out = execSync('git ls-remote origin main', { cwd: CONFIG.projectRoot, encoding: 'utf8', timeout: 20000 });
    const match = out.match(/^([a-f0-9]{40})/);
    if (match) return match[1];
  } catch (e) {
    log(`[UYARI] Remote commit sorgulanamadı: ${e.message}`);
  }
  return null;
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

function runDeploy(commitSha) {
  return new Promise((resolve) => {
    log(`🚀 Yeni commit bulundu (${commitSha.slice(0, 7)}). Deploy başlatılıyor...`);
    const child = spawn('node', [path.join(__dirname, 'coolify-deploy.js'), '--commit', commitSha], {
      cwd: CONFIG.projectRoot,
      stdio: 'ignore'
    });

    child.on('close', (code) => {
      log(`Deploy script tamamlandı (Çıkış kodu: ${code})`);
      resolve(code === 0);
    });

    child.on('error', (err) => {
      log(`Deploy script çalıştırma hatası: ${err.message}`);
      resolve(false);
    });
  });
}

let isDeploying = false;

async function checkAndSync() {
  log('checkAndSync döngüsü başladı.');
  if (isDeploying) {
    log('Zaten devam eden bir deploy işlemi var, bu döngü atlandı.');
    return;
  }

  if (isCoolifyBusy()) {
    log('Coolify şu an meşgul (build işlemi sürüyor), bekleniyor...');
    return;
  }

  let localDeployedSha = '';
  if (fs.existsSync(CONFIG.shaFile)) {
    localDeployedSha = fs.readFileSync(CONFIG.shaFile, 'utf8').trim();
  }
  if (!localDeployedSha) {
    localDeployedSha = getLastDeployedShaFromDb() || '';
    if (localDeployedSha) {
      fs.writeFileSync(CONFIG.shaFile, localDeployedSha, 'utf8');
    }
  }

  const remoteSha = getRemoteSha();
  log(`Mevcut yerel SHA: ${localDeployedSha.slice(0, 7) || 'Yok'}, Uzak GitHub SHA: ${remoteSha ? remoteSha.slice(0, 7) : 'Yok'}`);
  if (!remoteSha) return;

  if (remoteSha !== localDeployedSha) {
    log(`Değişiklik saptandı! Mevcut: ${localDeployedSha.slice(0, 7) || 'Yok'} -> GitHub: ${remoteSha.slice(0, 7)}`);
    isDeploying = true;
    try {
      await runDeploy(remoteSha);
    } catch (err) {
      log(`Deploy hatası: ${err.message}`);
    } finally {
      isDeploying = false;
    }
  } else {
    log('Sistem güncel. Değişiklik yok.');
  }
}

process.on('uncaughtException', (err) => {
  log(`[KRİTİK HATA] uncaughtException: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[KRİTİK HATA] unhandledRejection: ${reason}`);
});

process.on('exit', (code) => {
  log(`[EXIT] Process ${process.pid} çıkış yapıyor (Kod: ${code})`);
  cleanup();
});

process.on('SIGINT', () => {
  log(`[SIGINT] Sinyal alındı.`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log(`[SIGTERM] Sinyal alındı.`);
  process.exit(0);
});

function cleanup() {
  try {
    if (fs.existsSync(CONFIG.pidFile)) {
      const savedPid = fs.readFileSync(CONFIG.pidFile, 'utf8').trim();
      if (savedPid === process.pid.toString()) {
        fs.unlinkSync(CONFIG.pidFile);
      }
    }
  } catch (e) {}
}

fs.writeFileSync(CONFIG.pidFile, process.pid.toString(), 'utf8');
log(`Coolify Auto-Poller başlatıldı. (PID: ${process.pid}, Kontrol aralığı: ${CONFIG.intervalMs / 1000}sn)`);

checkAndSync().catch(err => log(`İlk kontrol hatası: ${err.message}`));

setInterval(() => {
  checkAndSync().catch(err => log(`Periyodik kontrol hatası: ${err.message}`));
}, CONFIG.intervalMs);
