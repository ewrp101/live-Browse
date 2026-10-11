#!/bin/bash

# 使用 Docker Playwright 抓取动态网页
# 用法：./scripts/docker-playwright.sh [URL]

URL=${1:-"https://news.ycombinator.com/"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Docker Playwright 抓取                            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "目标 URL: $URL"
echo ""

# 使用 sg 命令运行 Docker（无需 sudo）
sg docker -c "docker run --rm -v $PROJECT_DIR:/work -w /work mcr.microsoft.com/playwright:v1.40.0 node scripts/pw-v140.js '$URL'"
