param(
  [ValidateSet("monitor", "enforce")]
  [string]$Mode = "enforce"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Layer 4 requires an elevated PowerShell window. Start PowerShell as Administrator."
}

py -3 layer4/l4_guard.py --mode $Mode
