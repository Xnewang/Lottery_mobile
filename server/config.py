# -*- coding: utf-8 -*-
"""应用配置。API 环境变量同时兼容新的通用名称和旧名称。"""

import os

# ============================================================
# OpenAI 兼容 API 配置（从环境变量读取，保留旧变量名兼容）
# ============================================================
SILICONFLOW_API_KEY = (
    os.environ.get('OPENAI_API_KEY')
    or os.environ.get('SILICONFLOW_API_KEY', '')
).strip()
SILICONFLOW_API_URL = (
    os.environ.get('OPENAI_BASE_URL')
    or os.environ.get('SILICONFLOW_API_URL')
    or 'https://api.dcprwo.cc.cd'
).strip()
AI_WIRE_API = os.environ.get('AI_WIRE_API', 'responses').strip().lower()
AI_REASONING_EFFORT = os.environ.get('AI_REASONING_EFFORT', 'high').strip().lower()
AI_DISABLE_RESPONSE_STORAGE = os.environ.get(
    'AI_DISABLE_RESPONSE_STORAGE', 'true'
).strip().lower() in ('1', 'true', 'yes', 'on')

# ============================================================
# AI 模型列表
# 每个模型可选配置 api_url / api_key；不配则使用上面的默认端点
# ============================================================
AI_MODELS = [
    {"id": "gpt-5.5", "name": "GPT-5.5", "free": False},
]

# ============================================================
# 数据源配置（只需要 history API，无需先获取最新期号）
# ============================================================
HISTORY_API_BASE = 'https://history.macaumarksix.com/history/macaujc2/expect/'
MACAUJC_API_URL = 'https://history.macaumarksix.com/history/macaujc2/y/{year}'

# ============================================================
# 农历新年日期（用于动态计算生肖）
# ============================================================
CNY_DATES = {
    2020: (1, 25),   # 鼠
    2021: (2, 12),   # 牛
    2022: (2, 1),    # 虎
    2023: (1, 22),   # 兔
    2024: (2, 10),   # 龙
    2025: (1, 29),   # 蛇
    2026: (2, 17),   # 马
    2027: (2, 6),    # 羊
    2028: (1, 26),   # 猴
    2029: (2, 13),   # 鸡
    2030: (2, 3),    # 狗
    2031: (1, 23),   # 猪
    2032: (2, 11),   # 鼠
}

# ============================================================
# 服务配置
# ============================================================
SERVER_PORT = int(os.environ.get('PORT', 5000))
CACHE_DURATION = int(os.environ.get('CACHE_DURATION', 300))
REQUEST_TIMEOUT = 20
REQUEST_RETRIES = 3
MAX_DRAWS = 100
CONCURRENT_WORKERS = int(os.environ.get('CONCURRENT_WORKERS', 4))
HISTORY_BATCH_SIZE = int(os.environ.get('HISTORY_BATCH_SIZE', 10))
HISTORY_FETCH_RETRIES = int(os.environ.get('HISTORY_FETCH_RETRIES', 3))
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'
