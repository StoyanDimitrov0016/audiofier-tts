@echo off
setlocal

set "ROOT=%~dp0"
set "PYTHON=%ROOT%.venv\Scripts\python.exe"
set "SCRIPT=%ROOT%audio.py"

if not exist "%PYTHON%" (
    echo Python virtual environment not found at "%PYTHON%".
    echo Run "npm run setup:audio" from the repository root.
    exit /b 1
)

"%PYTHON%" "%SCRIPT%" %*
exit /b %ERRORLEVEL%
