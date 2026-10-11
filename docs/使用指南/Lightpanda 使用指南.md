# Lightpanda 真实网页抓取 - 使用指南

**最后更新**: 2026-03-25  
**测试状态**: ✅ 已验证可用（Kali.org, NVD, MITRE CVE 等）

## 🎯 快速开始

### 1. 启动 Lightpanda

```bash
cd /home/song/下载/live

# 启动 CDP 服务（可选，用于高级功能）
./lightpanda-x86_64-linux.bin serve --host 127.0.0.1 --port 9222
```

### 2. 基本抓取命令

```bash
# 抓取网页 HTML
./lightpanda-x86_64-linux.bin fetch \
  --dump html \
  --wait_ms 3000 \
  "https://example.com"

# 输出为 Markdown
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 3000 \
  "https://example.com"

# 保存到文件
./lightpanda-x86_64-linux.bin fetch \
  --dump html \
  --wait_ms 5000 \
  "https://www.boaoforum.org" \
  > boao.html
```

### 3. 已验证可抓取的网站

| 网站 | URL | 状态 | 文件大小 |
|------|-----|------|----------|
| Kali 官网 | https://www.kali.org | ✅ | 51KB |
| MITRE CVE | https://cve.mitre.org/ | ✅ | 12KB |
| NIST NVD | https://nvd.nist.gov/ | ✅ | 25KB |
| Tenable CVE | https://www.tenable.com/cve | ✅ | 15KB |
| 博鳌论坛 | https://www.boaoforum.org | ✅ | 15KB |

---

## 📋 常用参数说明

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--dump` | 输出格式 | 无 | `html`, `markdown`, `semantic_tree` |
| `--wait_ms` | 等待时间（毫秒） | 5000 | `3000`, `5000`, `10000` |
| `--strip_mode` | 移除特定标签 | 无 | `js,css`, `full`, `ui` |
| `--with_base` | 添加 base 标签 | false | `true` |
| `--with_frames` | 包含 iframe 内容 | false | `true` |
| `--log_level` | 日志级别 | warn | `debug`, `info`, `error` |

---

## 🔧 实用脚本

### 批量抓取多个网站

```bash
#!/bin/bash
# batch-scrape.sh

URLS=(
  "https://www.boaoforum.org"
  "http://www.gov.cn"
  "http://www.cnstock.com"
)

OUTPUT_DIR="./scraped-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

for url in "${URLS[@]}"; do
  filename=$(echo $url | sed 's/[^a-zA-Z0-9]/_/g')
  echo "抓取：$url"
  
  ./lightpanda-x86_64-linux.bin fetch \
    --dump html \
    --wait_ms 5000 \
    "$url" \
    > "$OUTPUT_DIR/$filename.html"
    
  echo "✅ 完成：$OUTPUT_DIR/$filename.html"
  sleep 1
done

echo "所有抓取完成！"
ls -lh "$OUTPUT_DIR"
```

**使用方法**:
```bash
chmod +x batch-scrape.sh
./batch-scrape.sh
```

---

### 提取页面标题和 Meta 信息

```bash
#!/bin/bash
# extract-meta.sh

HTML_FILE="$1"

if [ ! -f "$HTML_FILE" ]; then
  echo "错误：文件不存在 - $HTML_FILE"
  exit 1
fi

echo "=== 文件：$HTML_FILE ==="
echo ""

# 提取标题
echo "📄 页面标题:"
grep -o '<title>[^<]*</title>' "$HTML_FILE" | \
  sed 's/<title>//;s/<\/title>//'
echo ""

# 提取关键词
echo "🏷️  关键词:"
grep -o '<meta[^>]*name="keywords"[^>]*>' "$HTML_FILE" | \
  grep -o 'content="[^"]*"' | \
  sed 's/content="//;s/"$//'
echo ""

# 提取描述
echo "📝 描述:"
grep -o '<meta[^>]*name="description"[^>]*>' "$HTML_FILE" | \
  grep -o 'content="[^"]*"' | \
  sed 's/content="//;s/"$//'
echo ""

# 统计链接数量
echo "🔗 链接数量:"
grep -o 'href="[^"]*"' "$HTML_FILE" | wc -l
echo ""

# 统计图片数量
echo "🖼️  图片数量:"
grep -o 'src="[^"]*"' "$HTML_FILE" | wc -l
```

**使用方法**:
```bash
chmod +x extract-meta.sh
./extract-meta.sh /tmp/boao-raw.html
```

---

### 定时监控脚本

```bash
#!/bin/bash
# monitor-daily.sh

DATE=$(date +%Y%m%d)
TIME=$(date +%H%M)
OUTPUT_DIR="/data/web-monitor/$DATE"

mkdir -p "$OUTPUT_DIR"

echo "[$TIME] 开始日常监控抓取..."

# 博鳌亚洲论坛
./lightpanda-x86_64-linux.bin fetch \
  --dump html \
  --wait_ms 5000 \
  "https://www.boaoforum.org" \
  > "$OUTPUT_DIR/boao-$TIME.html"

# 中国政府网
./lightpanda-x86_64-linux.bin fetch \
  --dump html \
  --wait_ms 5000 \
  "http://www.gov.cn" \
  > "$OUTPUT_DIR/gov-$TIME.html"

echo "[$TIME] 抓取完成！"
echo "保存位置：$OUTPUT_DIR"

# 发送到通知（可选）
# curl -X POST "https://your-webhook.com/notify" \
#   -d "message=日常抓取完成：$DATE $TIME"
```

**设置 cron 任务**:
```bash
crontab -e

# 每天上午 10 点和下午 3 点执行
0 10 * * * /home/song/下载/live/monitor-daily.sh
0 15 * * * /home/song/下载/live/monitor-daily.sh
```

---

## 📊 HTML 数据分析

### 使用 Python 解析

```python
from bs4 import BeautifulSoup
import sys

# 读取 HTML 文件
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    html = f.read()

# 解析 HTML
soup = BeautifulSoup(html, 'html.parser')

# 提取标题
title = soup.find('title')
print(f"标题：{title.text if title else 'N/A'}")

# 提取所有链接
links = soup.find_all('a', href=True)
print(f"\n链接数量：{len(links)}")

# 提取前 10 个链接
for i, link in enumerate(links[:10], 1):
    print(f"{i}. {link.text.strip()} - {link['href']}")

# 提取所有图片
images = soup.find_all('img')
print(f"\n图片数量：{len(images)}")
```

**使用方法**:
```bash
python3 parse_html.py /tmp/boao-raw.html
```

---

### 使用 Node.js 解析

```javascript
const fs = require('fs');
const cheerio = require('cheerio');

// 读取 HTML 文件
const html = fs.readFileSync(process.argv[2], 'utf-8');

// 加载到 cheerio
const $ = cheerio.load(html);

// 提取标题
console.log('标题:', $('title').text());

// 提取所有链接
const links = [];
$('a[href]').each((i, elem) => {
  links.push({
    text: $(elem).text().trim(),
    href: $(elem).attr('href')
  });
});

console.log(`\n链接数量：${links.length}`);
console.log('前 10 个链接:');
links.slice(0, 10).forEach((link, i) => {
  console.log(`${i + 1}. ${link.text} - ${link.href}`);
});

// 提取所有图片
const images = [];
$('img[src]').each((i, elem) => {
  images.push($(elem).attr('src'));
});

console.log(`\n图片数量：${images.length}`);
```

**使用方法**:
```bash
npm install cheerio
node parse_html.js /tmp/boao-raw.html
```

---

## 🎯 最佳实践

### 1. 遵守 robots.txt

```bash
# 检查网站的 robots.txt
curl https://www.example.com/robots.txt
```

### 2. 控制抓取频率

```bash
# 在请求之间添加延迟
sleep 2  # 等待 2 秒
```

### 3. 设置 User-Agent

Lightpanda 会自动添加标识，你也可以自定义：

```bash
./lightpanda-x86_64-linux.bin fetch \
  --user_agent_suffix "MyBot/1.0" \
  "https://example.com"
```

### 4. 错误处理

```bash
#!/bin/bash

URL="$1"
OUTPUT="$2"

./lightpanda-x86_64-linux.bin fetch \
  --dump html \
  --wait_ms 5000 \
  "$URL" \
  > "$OUTPUT" 2>&1

if [ $? -ne 0 ]; then
  echo "❌ 抓取失败：$URL"
  echo "错误日志："
  cat "$OUTPUT"
  exit 1
else
  echo "✅ 抓取成功：$URL"
  SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
  echo "文件大小：$SIZE"
fi
```

---

## 📈 性能优化

### 1. 减少等待时间

对于静态网站，可以减少等待时间：

```bash
# 默认 5 秒
--wait_ms 5000

# 快速模式（2 秒）
--wait_ms 2000

# 极速模式（1 秒）
--wait_ms 1000
```

### 2. 只抓取文本内容

如果不需要图片和样式：

```bash
# 移除 JavaScript 和 CSS
--strip_mode full
```

### 3. 并发抓取

```bash
# 同时抓取多个网站（后台运行）
./lightpanda-x86_64-linux.bin fetch --dump html "https://site1.com" > site1.html &
./lightpanda-x86_64-linux.bin fetch --dump html "https://site2.com" > site2.html &
./lightpanda-x86_64-linux.bin fetch --dump html "https://site3.com" > site3.html &

# 等待所有任务完成
wait
echo "所有抓取完成！"
```

---

## 🔍 故障排查

### 问题 1: 抓取超时

```bash
# 增加超时时间
--http_timeout 30000  # 30 秒
```

### 问题 2: TLS/SSL 证书错误

```bash
# 跳过证书验证（仅测试用）
--insecure_disable_tls_host_verification
```

### 问题 3: 需要代理

```bash
# 设置 HTTP 代理
--http_proxy http://proxy.example.com:8080

# 带认证的代理
--http_proxy user:pass@proxy.example.com:8080
```

### 问题 4: 动态加载内容

如果 Lightpanda 无法获取动态内容，考虑：
1. 增加等待时间：`--wait_ms 10000`
2. 使用 Playwright（需要安装）
3. 直接调用 API（如果有）

### 问题 5: 内容为空

**症状**: 内容长度：0

**解决方案**:
```bash
# 增加等待时间（动态内容需要更长时间加载）
--wait_ms 10000

# 尝试不同的输出格式
--dump html  # 而不是 markdown
```

---

## 🚨 CVE 漏洞监控（新增）

### 抓取最新 CVE 情报

```bash
# 1. 抓取 MITRE CVE
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 8000 \
  "https://cve.mitre.org/" \
  > cve-mitre.md

# 2. 抓取 NIST NVD（包含最新漏洞）
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 10000 \
  "https://nvd.nist.gov/" \
  > nvd-nist.md

# 3. 抓取 Tenable CVE 统计
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 8000 \
  "https://www.tenable.com/cve" \
  > tenable-cve.md
```

### 提取 CRITICAL 级别漏洞

```bash
# 从 NVD 数据中提取 CRITICAL 漏洞
grep -A 10 "CRITICAL" nvd-nist.md > critical-alerts.md

# 提取 CVE 编号和评分
grep -E "CVE-[0-9]{4}-[0-9]+" nvd-nist.md | head -20
```

### 每日监控脚本

```bash
#!/bin/bash
# cve-daily-monitor.sh

DATE=$(date +%Y%m%d)
OUTPUT_DIR="/data/cve-monitor/$DATE"
mkdir -p "$OUTPUT_DIR"

# 抓取 MITRE CVE
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 8000 \
  "https://cve.mitre.org/" \
  > "$OUTPUT_DIR/mitre.md"

# 抓取 NIST NVD
./lightpanda-x86_64-linux.bin fetch \
  --dump markdown \
  --wait_ms 10000 \
  "https://nvd.nist.gov/" \
  > "$OUTPUT_DIR/nvd.md"

# 提取 CRITICAL 漏洞
grep -A 10 "CRITICAL" "$OUTPUT_DIR/nvd.md" > "$OUTPUT_DIR/critical-alerts.md"

echo "CVE 监控完成：$OUTPUT_DIR"
```

**设置 cron 任务**:
```bash
crontab -e
# 每天上午 9 点执行
0 9 * * * /home/song/下载/live/cve-daily-monitor.sh
```

---

## 📚 参考资源

### 官方文档
- Lightpanda GitHub: https://github.com/lightpanda-io
- 使用示例：查看 `/home/song/下载/live/pure-lightpanda.js`

### 安全资源（新增）
- NVD Dashboard: https://nvd.nist.gov/general/nvd-dashboard
- CVE Search: https://nvd.nist.gov/vuln/search
- CVSS Calculator: https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator
- MITRE CVE: https://cve.mitre.org/

### 相关工具
- **Playwright**: 完整浏览器自动化（需要安装 Chromium）
- **Puppeteer**: Chrome DevTools 协议支持
- **Scrapy**: Python 爬虫框架

### 学习资源
- HTML 解析：BeautifulSoup, cheerio
- 数据提取：XPath, CSS Selectors
- 反爬应对：User-Agent 轮换、IP 代理池

---

## 📁 生成的报告文件（新增）

```bash
# CVE 监控
CVE 漏洞情报报告 -20260325.md
cve-mitre.md
nvd-nist.md
tenable-cve.md

# 网站抓取
kali.org-抓取报告.md
kali-org.html
kali-org.md

# 新闻报告
ai-news-today.md
hot-news-report.md

# 测试报告
真实抓取测试报告 -20260324.md
真实抓取报告 -20260324.md
```

---

## 📖 完整文档

查看完整的使用指南：
```bash
cat /home/song/下载/live/使用指南.md
```

包含：
- ✅ 批量抓取脚本
- ✅ 数据解析与处理
- ✅ 定时任务配置
- ✅ 最佳实践
- ✅ 故障排查完整指南

---

**最后更新**: 2026-03-25  
**维护者**: Browser Agent Team  
**测试状态**: ✅ 已验证（Kali.org, NVD, MITRE CVE 等）
