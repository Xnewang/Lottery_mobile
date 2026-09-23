#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/Lottery_mobile}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "请使用 sudo bash deploy/install-auto-deploy.sh 运行安装程序"
  exit 1
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "找不到项目目录：${APP_DIR}"
  exit 1
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "找不到 ${APP_DIR}/.env，请先配置环境变量"
  exit 1
fi

install -m 0755 "${SCRIPT_DIR}/auto-deploy.sh" /usr/local/sbin/lottery-auto-deploy

cat > /etc/systemd/system/lottery-auto-deploy.service <<EOF
[Unit]
Description=Automatically deploy Lottery Mobile from GitHub
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
Environment=APP_DIR=${APP_DIR}
Environment=DEPLOY_BRANCH=main
ExecStart=/usr/local/sbin/lottery-auto-deploy
TimeoutStartSec=15min
EOF

cat > /etc/systemd/system/lottery-auto-deploy.timer <<'EOF'
[Unit]
Description=Check Lottery Mobile updates every two minutes

[Timer]
OnBootSec=1min
OnUnitInactiveSec=2min
RandomizedDelaySec=15s
Persistent=true
Unit=lottery-auto-deploy.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now lottery-auto-deploy.timer
systemctl start lottery-auto-deploy.service

echo
echo "自动部署安装完成。"
echo "查看定时器：systemctl status lottery-auto-deploy.timer"
echo "查看部署日志：journalctl -u lottery-auto-deploy.service -n 100 --no-pager"
echo "立即重新部署：/usr/local/sbin/lottery-auto-deploy --force"
