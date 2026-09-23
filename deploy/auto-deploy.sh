#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/Lottery_mobile}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
CONTAINER_NAME="${CONTAINER_NAME:-lottery-mobile}"
IMAGE_NAME="${IMAGE_NAME:-lottery-mobile}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
PORT_BINDING="${PORT_BINDING:-127.0.0.1:5000:5000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5000/api/health}"
STATE_DIR="${STATE_DIR:-/var/lib/lottery-deploy}"
LOCK_FILE="${LOCK_FILE:-/run/lock/lottery-deploy.lock}"
FORCE_DEPLOY=false

if [[ "${1:-}" == "--force" ]]; then
  FORCE_DEPLOY=true
fi

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail_commit() {
  printf '%s\n' "$1" > "${STATE_DIR}/failed-commit"
}

mkdir -p "$STATE_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "已有部署任务正在运行，本次跳过"
  exit 0
fi

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "项目目录不存在或不是 Git 仓库：${APP_DIR}"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  log "环境变量文件不存在：${ENV_FILE}"
  exit 1
fi

cd "$APP_DIR"
git fetch --prune origin "$DEPLOY_BRANCH"

target_commit="$(git rev-parse "origin/${DEPLOY_BRANCH}")"
last_commit="$(cat "${STATE_DIR}/last-successful-commit" 2>/dev/null || true)"
failed_commit="$(cat "${STATE_DIR}/failed-commit" 2>/dev/null || true)"

if [[ "$FORCE_DEPLOY" != true ]]; then
  if [[ "$target_commit" == "$failed_commit" ]]; then
    log "提交 ${target_commit:0:12} 上次部署失败，等待新的提交"
    exit 0
  fi

  if [[ "$target_commit" == "$last_commit" ]] && \
     docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q '^true$'; then
    exit 0
  fi
fi

log "开始部署提交 ${target_commit:0:12}"
git reset --hard "$target_commit"
git clean -fd -e .env

image_tag="${IMAGE_NAME}:${target_commit:0:12}"
if ! docker build -t "$image_tag" .; then
  fail_commit "$target_commit"
  log "镜像构建失败，现有网站继续运行"
  exit 1
fi

old_image="$(docker inspect -f '{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

if ! docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -p "$PORT_BINDING" \
  "$image_tag" >/dev/null; then
  fail_commit "$target_commit"
  log "新容器启动失败，尝试恢复旧版本"
  if [[ -n "$old_image" ]]; then
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --env-file "$ENV_FILE" \
      -p "$PORT_BINDING" \
      "$old_image" >/dev/null
  fi
  exit 1
fi

healthy=false
for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  log "健康检查失败，恢复旧版本"
  docker logs --tail 100 "$CONTAINER_NAME" || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fail_commit "$target_commit"

  if [[ -n "$old_image" ]]; then
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --env-file "$ENV_FILE" \
      -p "$PORT_BINDING" \
      "$old_image" >/dev/null
  fi
  exit 1
fi

printf '%s\n' "$target_commit" > "${STATE_DIR}/last-successful-commit"
rm -f "${STATE_DIR}/failed-commit"
docker image prune -af --filter 'until=168h' >/dev/null 2>&1 || true
log "部署完成：${target_commit:0:12}"
