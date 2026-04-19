param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$InputPath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ExtraArgs
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
$script = Join-Path $root "audio.py"

if (-not (Test-Path $python)) {
    throw "Python virtual environment not found at $python. Run 'npm run setup:audio' from the repository root."
}

$arguments = @($script, $InputPath) + $ExtraArgs

& $python @arguments
exit $LASTEXITCODE
