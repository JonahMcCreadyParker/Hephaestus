<#
.SYNOPSIS
Registers and tests local Crafting Apps MCP servers for the active Hermes profile.
.DESCRIPTION
Extract each official Windows portable release into its app-named folder under
ArtCraftRoot. The script registers the CLI builds as local stdio servers.
Existing entries are tested in place so custom settings are preserved.
#>
[CmdletBinding()]
param(
    [string]$ArtCraftRoot = 'G:\ArtCraft',
    [string]$Hermes = 'hermes'
)

$ErrorActionPreference = 'Stop'
$apps = @(
    'photocraft', 'vectorcraft', 'filmcraft', 'lightcraft', 'pdfcraft',
    'effectcraft', 'anicraft', 'designcraft', 'figcraft', 'texturecraft',
    'materialcraft', 'soundcraft', 'wordcraft', 'deckcraft', 'cadcraft',
    'gridcraft', 'craft-anything'
)

$existing = (& $Hermes mcp list | Out-String)
if ($LASTEXITCODE -ne 0) { throw 'Could not read the Hermes MCP configuration.' }

$failed = @()
foreach ($app in $apps) {
    $name = "artcraft-$app"
    $directory = Join-Path $ArtCraftRoot $app
    if ($existing -match ('\b' + [regex]::Escape($name) + '(?![\w-])')) {
        & $Hermes mcp test $name
        if ($LASTEXITCODE -ne 0) { $failed += $name }
        continue
    }

    $cli = @()
    if (Test-Path -LiteralPath $directory -PathType Container) {
        $cli = @(Get-ChildItem -LiteralPath $directory -Recurse -File -Filter '*-cli.exe')
    }
    if ($cli.Count -ne 1) {
        Write-Warning "Expected one CLI executable in $directory."
        $failed += $name
        continue
    }

    $serverArgs = @('mcp')
    if ($app -eq 'vectorcraft') { $serverArgs += '--headless' }
    $result = '' | & $Hermes mcp add $name --command $cli[0].FullName --connect-timeout 15 --args @serverArgs
    $result | Write-Output
    if ($LASTEXITCODE -ne 0 -or ($result -join "`n") -notmatch "Saved '$name' to .*tools enabled") {
        $failed += $name
    }
}

if ($failed.Count) {
    throw "MCP setup incomplete for $($failed -join ', ')."
}
