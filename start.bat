@echo off
chcp 65001 >nul
set "PYTHON=C:\Users\17497\.workbuddy\binaries\python\versions\3.13.12\python.exe"
cd /d "%~dp0server"
echo Installing/checking dependencies...
"%PYTHON%" -m pip install -r requirements.txt -q
echo.
echo Starting server... open http://localhost:5000
"%PYTHON%" app.py
