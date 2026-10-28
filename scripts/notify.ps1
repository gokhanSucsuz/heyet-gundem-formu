param(
    [string]$Title = "Coolify Auto-Deploy",
    [string]$Message = "Bildirim",
    [string]$Type = "Info"
)

$ErrorActionPreference = "SilentlyContinue"

$shown = $false
try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    
    $template = @"
<toast duration="short">
    <visual>
        <binding template="ToastGeneric">
            <text>$Title</text>
            <text>$Message</text>
        </binding>
    </visual>
    <audio src="ms-winsoundevent:Notification.Default" />
</toast>
"@
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
    
    $appIds = @(
        '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe',
        'Microsoft.WindowsTerminal_8wekyb3d8bbwe!App',
        'Windows.SystemToast.SecurityAndMaintenance'
    )
    
    foreach ($appId in $appIds) {
        try {
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
            $notifier.Show($toast)
            $shown = $true
            break
        } catch {}
    }
} catch {}

if (-not $shown) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.BalloonTipTitle = $Title
        $notify.BalloonTipText = $Message
        $notify.Visible = $true
        $notify.ShowBalloonTip(4000)
        Start-Sleep -Seconds 1
        $notify.Dispose()
    } catch {}
}
Write-Output "Notification execution finished (Shown: $shown)"

