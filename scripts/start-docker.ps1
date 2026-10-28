# Start Docker Backend
$backendExe = "C:\Program Files\Docker\Docker\resources\com.docker.backend.exe"
$workingDir = "C:\Program Files\Docker\Docker"

# Check if already running
$running = Get-Process "com.docker.backend" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "Docker Backend zaten calisiyor (PID: $($running.Id))" -ForegroundColor Yellow
} else {
    Write-Host "Docker Backend baslatiliyor..." -ForegroundColor Cyan
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
        CommandLine = "`"$backendExe`""
        CurrentDirectory = $workingDir
    }
    Write-Host "Process baslatildi. ProcessId: $($res.ProcessId), ReturnValue: $($res.ReturnValue)" -ForegroundColor Green
}

# Wait for named pipe to be ready
Write-Host "Docker daemon hazir olana kadar bekleniyor..." -ForegroundColor Cyan
$maxWait = 30
$count = 0
while ($count -lt $maxWait) {
    Start-Sleep -Seconds 2
    $count += 2
    $pipeReady = Test-Path "\\.\pipe\dockerDesktopLinuxEngine"
    if ($pipeReady) {
        Write-Host "Docker Engine baglanti noktasi (named pipe) hazir! ($count sn)" -ForegroundColor Green
        break
    }
    Write-Host "Bekleniyor... ($count sn)"
}

# Check docker ps
try {
    $psOut = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
    Write-Host "`nAktif Konteynerler:" -ForegroundColor Green
    Write-Host $psOut
} catch {
    Write-Warning "Docker ps alinamadi: $_"
}

