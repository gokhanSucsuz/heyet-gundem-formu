Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strProjectDir = fso.GetParentFolderName(strScriptDir)

WshShell.CurrentDirectory = strProjectDir
WshShell.Run "node """ & strScriptDir & "\coolify-poller.js""", 0, False

