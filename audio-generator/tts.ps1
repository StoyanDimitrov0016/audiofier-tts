param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$InputPath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $root "audio.py"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    throw "uv was not found on PATH. Install it with Winget and restart the terminal."
}

$arguments = @("run", "--project", $root, "--frozen", "python", $script, $InputPath) + $ExtraArgs

& uv @arguments
exit $LASTEXITCODE
