<#
.SYNOPSIS
Serves a local GGUF model for Hermes using the InferSSD Windows runtime.
#>
[CmdletBinding()]
param(
    [string]$InstallRoot = 'G:\InferSSD',
    [string]$ModelPath,
    [ValidateRange(1, 65535)][int]$Port = 8080,
    [ValidateRange(64000, 2147483647)][int]$ContextLength = 64000
)

$ErrorActionPreference = 'Stop'
$runtime = Join-Path $InstallRoot 'bin\inferssd.cmd'
if (!(Test-Path -LiteralPath $runtime -PathType Leaf)) {
    throw "InferSSD launcher missing at $runtime. Install the Windows runtime first."
}
if (!$ModelPath) {
    $ModelPath = Join-Path $InstallRoot 'models\qwen3.5-9b.gguf'
}
if (!(Test-Path -LiteralPath $ModelPath -PathType Leaf)) {
    throw "Model file missing at $ModelPath."
}
$model = (Get-Item -LiteralPath $ModelPath).FullName
if ([IO.Path]::GetExtension($model) -ine '.gguf') {
    throw "Expected a GGUF model file: $model"
}

& $runtime serve -m $model --host 127.0.0.1 --port $Port --context $ContextLength
exit $LASTEXITCODE
