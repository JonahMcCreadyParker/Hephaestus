<#
.SYNOPSIS
Registers a running local InferSSD model as a named Hermes provider.
#>
[CmdletBinding()]
param(
    [string]$Hermes = 'hermes',
    [ValidateRange(1, 65535)][int]$Port = 8080,
    [ValidateRange(64000, 2147483647)][int]$ContextLength = 64000,
    [string]$ModelId
)

$ErrorActionPreference = 'Stop'
$baseUrl = "http://127.0.0.1:$Port/v1"
$catalog = Invoke-RestMethod -Uri "$baseUrl/models" -TimeoutSec 10
$ids = @($catalog.data | ForEach-Object id | Where-Object { $_ })
if (!$ModelId -and $ids.Count -eq 1) {
    $ModelId = $ids[0]
}
if (!$ModelId -or $ModelId -cnotin $ids) {
    throw "Select a model with -ModelId. Server advertised: $($ids -join ', ')"
}

$providerKey = 'providers.inferssd'
$provider = @{
    api = $baseUrl
    default_model = $ModelId
    transport = 'chat_completions'
    context_length = $ContextLength
} | ConvertTo-Json -Compress

& $Hermes config set $providerKey $provider
if ($LASTEXITCODE -ne 0) {
    throw 'Hermes could not save the InferSSD provider.'
}

Write-Output "Select /model custom:inferssd:$ModelId in a Hermes chat."
