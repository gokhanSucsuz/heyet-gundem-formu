# Docker ve WSL Servis Onarim Scripti
$logPath = "C:\Users\PC1\Desktop\heyet-gundem-formu\scripts\repair-docker.log"
"=== WSL & DOCKER SERVIS ONARIM BASLADI: $(Get-Date) ===" | Out-File -FilePath $logPath -Encoding utf8

function Log($msg) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $line
    $line | Out-File -FilePath $logPath -Append -Encoding utf8
}

try {
    # 1. WSLService Onarimi
    Log "1. WSLService servis yapilandirmasi kontrol ediliyor..."
    sc.exe config WSLService start= auto
    Start-Sleep -Seconds 1
    net start WSLService
    $wslSvc = Get-Service WSLService -ErrorAction SilentlyContinue
    Log "WSLService Durumu: $($wslSvc.Status), Baslangic: $($wslSvc.StartType)"

    # 2. Docker Desktop Service Onarimi
    Log "2. com.docker.service yapilandirmasi kontrol ediliyor..."
    sc.exe config com.docker.service start= auto
    Start-Sleep -Seconds 1
    net start com.docker.service
    $docSvc = Get-Service com.docker.service -ErrorAction SilentlyContinue
    Log "com.docker.service Durumu: $($docSvc.Status), Baslangic: $($docSvc.StartType)"

    # 3. WSL Testi
    Log "3. WSL durumu test ediliyor..."
    $wslOut = wsl.exe --status 2>&1 | Out-String
    Log "WSL Status:`n$wslOut"

    Log "=== ONARIM TAMAMLANDI ==="
} catch {
    Log "HATA: $_"
}

