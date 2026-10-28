# Coolify Auto-Poller Durdurucu
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$PidFile = "$ProjectRoot\.coolify-poller.pid"

if (Test-Path $PidFile) {
    $existingPid = Get-Content $PidFile -ErrorAction SilentlyContinue
    if ($existingPid) {
        $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($proc) {
            Stop-Process -Id $existingPid -Force
            Write-Host "Coolify Poller durduruldu (PID: $existingPid)" -ForegroundColor Green
            & "$PSScriptRoot\notify.ps1" -Title "Coolify Auto-Deploy" -Message "Arka plan otomatik senkronizasyon servisi durduruldu."
        } else {
            Write-Host "Belirtilen PID ($existingPid) zaten calismiyor." -ForegroundColor Yellow
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Calisan bir Coolify Poller bulunamadi." -ForegroundColor Yellow
}

