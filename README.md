# Browser Automation - 浏览器自动化与漏洞情报

**版本**: 3.0.0 (生产级)
**更新日期**: 2026-04-02

---

## 📋 项目简介

本项目提供两种核心能力：

1. **浏览器自动化** - 支持 Lightpanda 和 Playwright 两种后端
2. **漏洞情报抓取** - 真实生产级 CVE 数据源（GitHub Advisories + CISA KEV）

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境

```bash
cp .env.example .env
```

---

## 🛡️ 漏洞情报抓取（生产级）

### 1. CISA KEV 在野利用漏洞 ⭐ 推荐

**数据源**: 美国 CISA 官方在野利用漏洞列表

**特点**:
- ✅ 真实在野活跃利用
- ✅ 已知勒索软件攻击
- ✅ 官方强制修复要求
- ✅ 1556+ 条漏洞，313+ 条勒索软件利用

```bash
# 获取最新 CISA KEV 数据
./scripts/fetch-cisa-kev.sh

# 输出文件
scripts/output/cisa-kev-$(date +%Y-%m-%d).json
```

**查看数据**:
```bash
# 查看完整数据
cat scripts/output/cisa-kev-2026-04-02.json | jq

# 查看勒索软件利用
cat scripts/output/cisa-kev-2026-04-02.json | jq '.vulnerabilities[] | select(.knownRansomwareCampaignUse=="Known")'

# 查看最近 30 天新增
cat scripts/output/cisa-kev-2026-04-02.json | jq '[.vulnerabilities[] | select((.dateAdded | strptime("%Y-%m-%d") | mktime) > (now - 2592000))]'
```

---

### 2. GitHub Advisories CVE

**数据源**: GitHub Security Advisories API

**特点**:
- ✅ 真实 CVE 编号
- ✅ 开源项目漏洞
- ✅ 每日更新
- ✅ 包含 CVSS 评分和 CWE 分类

```bash
# 获取最新 20 条 GitHub CVE
node scripts/fetch-github-cve-api.js 20

# 输出文件
scripts/output/real-cve-github-api-$(date +%Y-%m-%d).json
```

**查看数据**:
```bash
# 查看完整数据
cat scripts/output/real-cve-github-api-2026-04-02.json | jq

# 按严重程度筛选
cat scripts/output/real-cve-github-api-2026-04-02.json | jq '.data[] | select(.severity=="critical")'

# 查看特定产品漏洞
cat scripts/output/real-cve-github-api-2026-04-02.json | jq '.data[] | select(.sourceCodeLocation | contains("lodash"))'
```

---

### 3. 数据导出与报告

```bash
# 导出为 CSV
node scripts/export-cve-csv.js scripts/output/cisa-kev-2026-04-02.json

# 生成中文报告
node scripts/generate-cve-chinese-report.js scripts/output/real-cve-github-api-2026-04-02.json
```

---

## 📦 浏览器自动化

### 方案 1: Lightpanda（静态网站）

```bash
# 直接抓取
./lightpanda-x86_64-linux.bin fetch --dump html "https://example.com"

# 使用优化脚本
node scripts/lightpanda-optimized.js "https://example.com"
```

### 方案 2: Docker Playwright（动态网站）

```bash
# 使用 Docker 脚本
./scripts/docker-playwright.sh "https://example.com"

# 或使用 pw-docker.js
sg docker -c "docker run --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.40.0 \
  node scripts/pw-docker.js 'https://example.com'"
```

### 方案 3: jsdom（轻度动态）

```bash
node scripts/curl-jsdom.js "https://example.com"
```

---

## 📁 项目结构

```
live/
├── 📄 README.md                     # 使用指南
├── 📄 项目整理总结.md                # 整理报告
├── 📄 使用技巧大全.md                # 使用技巧
│
├── 📂 scripts/                      # 核心脚本
│   ├── 🔐 漏洞情报
│   │   ├── fetch-cisa-kev.sh        # ⭐ CISA 在野利用
│   │   ├── fetch-github-cve-api.js  # GitHub Advisories
│   │   ├── export-cve-csv.js        # 导出 CSV
│   │   └── generate-cve-chinese-report.js  # 中文报告
│   │
│   ├── 🌐 浏览器抓取
│   │   ├── lightpanda-optimized.js  # Lightpanda 优化
│   │   ├── curl-jsdom.js            # jsdom 抓取
│   │   ├── docker-playwright.sh     # Docker Playwright
│   │   └── pw-docker.js             # Playwright 脚本
│   │
│   └── 📁 output/                   # 输出文件
│
├── 📂 archive/                      # 历史文档
├── 🔧 .env                          # 环境配置
├── 🔧 .env.example                  # 配置示例
├── 📦 package.json                  # 依赖配置
└── 🚀 lightpanda-x86_64-linux.bin   # Lightpanda 二进制
```

---

## 📊 数据源对比

| 数据源 | 真实性 | 在野利用 | 更新频率 | 推荐度 |
|--------|--------|---------|---------|--------|
| **CISA KEV** | ✅ 官方 | ✅ 确认 | 每日 | ⭐⭐⭐⭐⭐ |
| **GitHub Advisories** | ✅ 官方 | ⚠️ 部分 | 实时 | ⭐⭐⭐⭐ |
| NVD | ✅ 官方 | ⚠️ 部分 | 每日 | ⭐⭐⭐⭐ |
| 仿真数据 | ❌ 测试 | ❌ 无 | - | ⭐⭐ |

---

## 🔧 常用命令

### 漏洞情报

```bash
# 获取 CISA 在野利用
./scripts/fetch-cisa-kev.sh

# 获取 GitHub CVE
node scripts/fetch-github-cve-api.js 20

# 导出 CSV
node scripts/export-cve-csv.js scripts/output/cisa-kev-2026-04-02.json

# 生成中文报告
node scripts/generate-cve-chinese-report.js scripts/output/cisa-kev-2026-04-02.json
```

### 浏览器抓取

```bash
# Lightpanda
./lightpanda-x86_64-linux.bin fetch "https://example.com"

# jsdom
node scripts/curl-jsdom.js "https://example.com"

# Docker Playwright
./scripts/docker-playwright.sh "https://example.com"
```

### 数据管理

```bash
# 查看输出文件
ls -lh scripts/output/

# 清理 7 天前数据
find scripts/output/ -type f -mtime +7 -delete

# 查看 JSON 数据
cat scripts/output/cisa-kev-2026-04-02.json | jq '.count'
```

---

## 📝 输出文件说明

### CISA KEV 数据

```json
{
  "title": "CISA Catalog of Known Exploited Vulnerabilities",
  "catalogVersion": "2026.04.01",
  "count": 1556,
  "vulnerabilities": [
    {
      "cveID": "CVE-2026-5281",
      "vendorProject": "Google",
      "product": "Dawn",
      "vulnerabilityName": "Google Dawn Use-After-Free Vulnerability",
      "dateAdded": "2026-04-01",
      "knownRansomwareCampaignUse": "Unknown"
    }
  ]
}
```

### GitHub Advisories 数据

```json
{
  "success": true,
  "source": "GitHub Advisories API",
  "data": [
    {
      "id": "CVE-2026-4370",
      "severity": "critical",
      "cvssScore": 10.0,
      "summary": "Juju has Improper TLS authentication",
      "publishDate": "2026-04-01T00:03:36Z"
    }
  ]
}
```

---

## ⚠️ 注意事项

### 1. 数据真实性

- ✅ **CISA KEV**: 真实在野利用，官方数据源
- ✅ **GitHub Advisories**: 真实 CVE，官方安全公告
- ❌ **仿真数据**: 已清理，不再提供

### 2. 网络连接

部分数据源可能需要稳定的网络连接：
- CISA: https://www.cisa.gov/
- GitHub API: https://api.github.com/

### 3. Docker 权限

使用 Docker Playwright 需要将用户添加到 docker 组：
```bash
sudo usermod -aG docker $USER
# 重新登录后生效
```

---

## 🎯 最佳实践

### 1. 每日漏洞监控

```bash
# 添加到 crontab，每日执行
0 9 * * * cd /home/song/下载/live && ./scripts/fetch-cisa-kev.sh
```

### 2. 优先级修复

根据 CISA KEV 数据优先修复：
1. 已知勒索软件利用 (knownRansomwareCampaignUse == "Known")
2. 最近 30 天新增 (dateAdded > 30 days ago)
3. CVSS 评分 >= 9.0

### 3. 数据持久化

```bash
# 定期备份
tar -czf cve-backup-$(date +%Y%m%d).tar.gz scripts/output/

# 压缩旧数据
find scripts/output/ -type f -mtime +30 -exec gzip {} \;
```

---

## 📞 获取帮助

### 查看文档

```bash
# 使用指南
cat README.md

# 使用技巧
cat 使用技巧大全.md

# 整理报告
cat 项目整理总结.md
```

### 检查环境

```bash
# 查看 npm 依赖
npm list --depth=0

# 查看输出文件
ls -lh scripts/output/

# 检查 jq 是否安装
jq --version
```

---

## 🎉 总结

### 核心能力

1. **CISA KEV 在野利用漏洞** - 生产级威胁情报
2. **GitHub Advisories CVE** - 开源项目漏洞
3. **浏览器自动化** - Lightpanda + Playwright

### 数据质量保证

- ✅ 所有数据来自官方权威源
- ✅ 真实 CVE 编号，非仿真数据
- ✅ 在野利用确认（CISA KEV）
- ✅ 每日更新

---

**📚 享受高效的安全情报收集！**
