@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "SERVER_DIR=%PROJECT_DIR%server"
set "VENV_PYTHON=%PROJECT_DIR%.venv\Scripts\python.exe"
set "BOOTSTRAP_PYTHON="

if not exist "%SERVER_DIR%\app.py" goto missing_server
if exist "%VENV_PYTHON%" goto install

call :find_python
if not defined BOOTSTRAP_PYTHON goto missing_python

echo Creating the project Python environment...
"%BOOTSTRAP_PYTHON%" -m venv "%PROJECT_DIR%.venv"
if errorlevel 1 goto venv_failed

:install
echo Installing/checking dependencies...
"%VENV_PYTHON%" -m pip install -r "%SERVER_DIR%\requirements.txt" -q
if errorlevel 1 goto install_failed

cd /d "%SERVER_DIR%"
echo.
echo Starting server. Open http://localhost:5000
"%VENV_PYTHON%" app.py
if errorlevel 1 goto server_failed
exit /b 0

:find_python
for /f "delims=" %%I in ('where python 2^>nul') do (
    if not defined BOOTSTRAP_PYTHON (
        "%%I" --version >nul 2>&1
        if not errorlevel 1 set "BOOTSTRAP_PYTHON=%%I"
    )
)

if not defined BOOTSTRAP_PYTHON if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
    set "BOOTSTRAP_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
)

if not defined BOOTSTRAP_PYTHON (
    for /d %%D in ("%USERPROFILE%\.workbuddy\binaries\python\versions\*") do (
        if not defined BOOTSTRAP_PYTHON if exist "%%~fD\python.exe" set "BOOTSTRAP_PYTHON=%%~fD\python.exe"
    )
)
exit /b 0

:missing_server
echo [ERROR] Server file not found: %SERVER_DIR%\app.py
goto failed

:missing_python
echo [ERROR] Python 3 was not found.
echo Install Python from https://www.python.org/downloads/ and enable "Add Python to PATH".
goto failed

:venv_failed
echo [ERROR] Failed to create the project Python environment.
goto failed

:install_failed
echo [ERROR] Failed to install dependencies. Check the network connection and try again.
goto failed

:server_failed
echo.
echo [ERROR] The server stopped unexpectedly.

:failed
pause
exit /b 1
