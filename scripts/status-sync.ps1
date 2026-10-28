# Coolify Auto-Poller Durum Raporu
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$PidFile = "$ProjectRoot\.coolify-poller.pid"
$ShaFile = "$ProjectRoot\.coolify-deployed-sha"
$LogFile = "$PSScriptRoot\coolify-sync.log"

Write-Host "=== COOLIFY AUTO-SYNC DURUM RAPORU ===" -ForegroundColor Cyan

# 1. Poller Servis Durumu
if (Test-Path $PidFile) {
    $pidNum = (Get-Content $PidFile -ErrorAction SilentlyContinue)
    if ($pidNum) {
        $pidNum = "$pidNum".Trim()
        $proc = Get-Process -Id $pidNum -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "Servis Durumu     : AKTIF (PID: $pidNum)" -ForegroundColor Green
        } else {
            Write-Host "Servis Durumu     : PASIF (PID: $pidNum sonlandi)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Servis Durumu     : PASIF (Calisan servis yok)" -ForegroundColor Yellow
}

# 2. Son Değerlendirilen Commit
if (Test-Path $ShaFile) {
    $sha = (Get-Content $ShaFile).Trim()
    Write-Host "Son Deploy Commit : $sha" -ForegroundColor White
} else {
    Write-Host "Son Deploy Commit : Bilinmiyor" -ForegroundColor Gray
}

# 3. Coolify Konteyner Durumu
try {
    $coolifyStatus = docker inspect --format="{{.State.Status}}" heyetgundem.sydv 2>$null
    Write-Host "Konteyner Durumu  : $coolifyStatus (heyetgundem.sydv)" -ForegroundColor Green
} catch {
    Write-Host "Konteyner Durumu  : Docker erisilemedi" -ForegroundColor Red
}

# 4. Son Log Satırları
if (Test-Path $LogFile) {
    Write-Host "`nSon Loglar (Son 5 Satir):" -ForegroundColor Cyan
    Get-Content $LogFile -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}
