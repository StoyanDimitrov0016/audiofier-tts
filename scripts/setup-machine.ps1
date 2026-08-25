[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$packages = @(
    "Git.Git",
    "Schniz.fnm",
    "astral-sh.uv",
    "Gyan.FFmpeg",
    "ChrisBagwell.SoX",
    "Ollama.Ollama"
)

foreach ($package in $packages) {
    winget install --id $package --exact --source winget --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) {
        throw "Winget failed while ensuring $package is installed."
    }
}

fnm install 24
fnm default 24

$fnmEnvironment = fnm env --shell powershell
if ($LASTEXITCODE -ne 0) {
    throw "FNM could not initialize the current PowerShell session."
}
$fnmEnvironment | Out-String | Invoke-Expression

npm install --global npm@12.0.2
if ($LASTEXITCODE -ne 0) {
    throw "npm 12.0.2 could not be installed for the active Node 24 runtime."
}

Write-Host "Machine toolchain is ready. Restart the terminal, then run npm run setup and npm run doctor."
