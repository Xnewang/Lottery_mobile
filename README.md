# 🎰 澳门六合彩智能分析助手

## Railway 一键部署

### 步骤 1：推送到 GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 步骤 2：Railway 部署
1. 打开 [railway.app](https://railway.app)
2. 点击 **New Project → Deploy from GitHub repo**
3. 选择你的仓库
4. Railway 会自动检测 Python 项目并部署

### 步骤 3：设置环境变量
在 Railway 项目面板中，点击 **Variables**，添加：

| 变量名 | 值 | 必须 |
|--------|-----|------|
| `OPENAI_API_KEY` | `sk-你的密钥` | ✅ |
| `OPENAI_BASE_URL` | `https://api.dcprwo.cc.cd` | 可选（有默认值） |
| `AI_WIRE_API` | `responses` | 使用 Responses API |
| `AI_REASONING_EFFORT` | `high` | 推理强度 |
| `AI_DISABLE_RESPONSE_STORAGE` | `true` | 禁止服务端存储响应 |
| `CACHE_DURATION` | `300` | 可选（缓存秒数） |

### 步骤 4：访问
Railway 会自动分配一个 `xxx.railway.app` 域名，打开即可使用。

---

## 本地开发

```bash
cd server
pip install -r requirements.txt
# 设置环境变量（不要把 Key 写入 config.py）
export OPENAI_API_KEY=sk-xxx
export OPENAI_BASE_URL=https://api.dcprwo.cc.cd
export AI_WIRE_API=responses
export AI_REASONING_EFFORT=high
export AI_DISABLE_RESPONSE_STORAGE=true
python app.py
# 浏览器打开 http://localhost:5000
```

## 功能模块

- 📋 **开奖大厅** - 最新100期真实开奖记录
- 📈 **数据分析** - 热号冷号/频率图表/波色生肖五行分布
- 🤖 **AI策略助手** - 多维度购买建议 + 自选分析 + 自由对话
- 💰 **庄家助手** - 复式投注风险评估 + AI分析报告

---

## 阿里云 ECS 自动部署

服务器首次完成 Docker、Git、Nginx 安装并将仓库克隆到
`/opt/Lottery_mobile` 后，执行：

```bash
cd /opt/Lottery_mobile
git pull origin main
sudo bash deploy/install-auto-deploy.sh
```

安装程序会创建 systemd 定时器，每两分钟检查 GitHub `main` 分支。检测到
新提交后会先构建 Docker 镜像，再替换正在运行的容器并检查
`/api/health`。新版本无法启动时会自动恢复旧容器，并等待下一次新提交。

常用管理命令：

```bash
# 查看定时器
systemctl status lottery-auto-deploy.timer

# 查看最近部署日志
journalctl -u lottery-auto-deploy.service -n 100 --no-pager

# 立即检查并强制重新部署
/usr/local/sbin/lottery-auto-deploy --force
```
