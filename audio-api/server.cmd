@echo off
setlocal

set "ROOT=%~dp0"
set "PYTHON=%ROOT%.venv\Scripts\python.exe"
set "SCRIPT=%ROOT%server.py"

if not exist "%PYTHON%" (
    echo Python virtual environment not found at "%PYTHON%".
    echo Create it first and install requirements.
    exit /b 1
)

"%PYTHON%" "%SCRIPT%" %*
exit /b %ERRORLEVEL%
