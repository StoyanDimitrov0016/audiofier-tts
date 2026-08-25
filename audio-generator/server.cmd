@echo off
setlocal

set "ROOT=%~dp0"
set "SCRIPT=%ROOT%server.py"

where uv >nul 2>nul
if errorlevel 1 (
    echo uv was not found on PATH. Install it with Winget and restart the terminal.
    exit /b 1
)

uv run --project "%ROOT%" --frozen python "%SCRIPT%" %*
exit /b %ERRORLEVEL%
