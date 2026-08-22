# 一键启动 Lottery_mobile Flask 服务（使用 WorkBuddy managed Python）
$python = "C:\Users\17497\.workbuddy\binaries\python\versions\3.13.12\python.exe"
$serverDir = Join-Path $PSScriptRoot "server"
Set-Location $serverDir
Write-Host "启动澳门六合彩AI助手..." -ForegroundColor Green
& $python app.py
