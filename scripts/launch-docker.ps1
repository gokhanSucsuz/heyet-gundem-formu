$sh = New-Object -ComObject Shell.Application
$sh.ShellExecute("C:\Program Files\Docker\Docker\Docker Desktop.exe")
Write-Output "Docker Desktop ShellExecute executed."

