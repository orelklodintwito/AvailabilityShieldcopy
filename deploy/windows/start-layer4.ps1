param(
  [ValidateSet("monitor", "enforce")]
  [string]$Mode = "enforce",
  [string]$GatewayUrl = $env:LAYER4_GATEWAY_URL,
  [string]$AgentId = $(if ($env:LAYER4_AGENT_ID) { $env:LAYER4_AGENT_ID } else { "orel-windows" })
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Layer 4 requires an elevated PowerShell window. Start PowerShell as Administrator."
}

if ($GatewayUrl) { $env:LAYER4_GATEWAY_URL = $GatewayUrl }
$env:LAYER4_AGENT_ID = $AgentId

if (-not $env:LAYER4_GATEWAY_URL -or -not $env:LAYER4_AGENT_TOKEN) {
  Write-Warning "Cloud sync is disabled. Set LAYER4_GATEWAY_URL and LAYER4_AGENT_TOKEN to publish Layer 4 metrics to Render."
}

py -3 layer4/l4_guard.py --mode $Mode --agent-id $AgentId
