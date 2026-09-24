# 共用 start.bat 的 Python 检测、虚拟环境和依赖安装逻辑。
& (Join-Path $PSScriptRoot 'start.bat')
exit $LASTEXITCODE
