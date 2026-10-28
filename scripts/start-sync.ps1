# Coolify Auto-Poller Başlatıcı
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$PidFile = "$ProjectRoot\.coolify-poller.pid"
$PollerScript = "$PSScriptRoot\coolify-poller.js"
$NodeExe = (Get-Command node.exe).Source

# Zaten çalışıyor mu kontrol et
if (Test-Path $PidFile) {
    $existingPid = (Get-Content $PidFile -ErrorAction SilentlyContinue)
    if ($existingPid) {
        $existingPid = "$existingPid".Trim()
        $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Coolify Poller zaten arka planda calisiyor (PID: $existingPid)" -ForegroundColor Yellow
            exit 0
        }
    }
}

# Windows Başlangıç Klasörüne Otomatik Başlatma Kısayolu Ekle
$StartupDir = [Environment]::GetFolderPath('Startup')
$ShortcutPath = "$StartupDir\Coolify-AutoSync-HeyetGundem.lnk"
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $NodeExe
    $Shortcut.Arguments = "`"$PollerScript`""
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.Description = "Coolify GitHub Auto-Deploy Poller"
    $Shortcut.WindowStyle = 7
    $Shortcut.Save()
    Write-Host "Windows Baslangicina (Startup) otomatik baslatma eklendi." -ForegroundColor Cyan
} catch {
    Write-Warning "Baslangic kisayolu eklenemedi: $($_.Exception.Message)"
}

# WMI ile tamamen bağımsız ve kalıcı bir arka plan süreci başlat
$cmdLine = "`"$NodeExe`" `"$PollerScript`""
$result = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $cmdLine
    CurrentDirectory = $ProjectRoot
}

if ($result.ReturnValue -eq 0) {
    $newPid = $result.ProcessId
    Set-Content -Path $PidFile -Value $newPid
    Write-Host "Coolify Poller basariyla baslatildi! (PID: $newPid)" -ForegroundColor Green
    & "$PSScriptRoot\notify.ps1" -Title "Coolify Auto-Deploy" -Message "Arka plan otomatik senkronizasyon servisi baslatildi."
} else {
    Write-Error "Surec baslatilamadi. Hata kodu: $($result.ReturnValue)"
}
