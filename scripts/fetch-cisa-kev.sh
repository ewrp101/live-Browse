#!/bin/bash

# 获取 CISA KEV 在野利用漏洞数据
# 使用 curl + jq 方式（更可靠）

OUTPUT_DIR="$(dirname $0)/output"
TODAY=$(date +%Y-%m-%d)
OUTPUT_FILE="${OUTPUT_DIR}/cisa-kev-${TODAY}.json"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     CISA KEV 在野利用漏洞（生产级情报）            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "📡 数据源：CISA Known Exploited Vulnerabilities"
echo "📋 URL: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
echo ""
echo "⚠️  这是真正的"在野利用"漏洞列表！"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 下载数据
echo "📥 正在下载 CISA KEV 数据..."

curl -sL --max-time 60 \
    -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json" \
    -o "$OUTPUT_FILE"

if [ $? -ne 0 ] || [ ! -s "$OUTPUT_FILE" ]; then
    echo "❌ 下载失败！"
    exit 1
fi

echo "✅ 下载成功！"
echo ""

# 统计
COUNT=$(cat "$OUTPUT_FILE" | jq -r '.count // 0')
CATALOG_VERSION=$(cat "$OUTPUT_FILE" | jq -r '.catalogVersion // "N/A"')
RELEASE_DATE=$(cat "$OUTPUT_FILE" | jq -r '.dateReleased // "N/A"')

echo "════════════════════════════════════════════════════════════"
echo "✅ 获取成功！"
echo "════════════════════════════════════════════════════════════"
echo "📊 目录版本：${CATALOG_VERSION}"
echo "📈 漏洞总数：${COUNT} 条"
echo "📅 发布日期：${RELEASE_DATE}"
echo "🔥 在野利用：是 ✅"
echo "🔒 数据类型：生产级漏洞情报 ✅"
echo ""

# 勒索软件统计
RANSOMWARE_COUNT=$(cat "$OUTPUT_FILE" | jq '[.vulnerabilities[] | select(.knownRansomwareCampaignUse == "Known")] | length')
echo "📊 统计信息:"
echo "   🔴 已知勒索软件利用：${RANSOMWARE_COUNT} 条"
echo ""

# 显示前 20 条
echo "════════════════════════════════════════════════════════════"
echo "📋 最新在野利用漏洞（前 20 条）:"
echo "════════════════════════════════════════════════════════════"

cat "$OUTPUT_FILE" | jq -r '
    .vulnerabilities 
    | sort_by(.dateAdded) 
    | reverse 
    | .[0:20] 
    | .[] 
    | "\(.cveID) | \(.vendorProject) \(.product) | \(.vulnerabilityName) | \(.dateAdded)"
' | while IFS='|' read -r cve vendor name date; do
    # 计算天数
    days_ago=$(( ( $(date +%s) - $(date -d "$date" +%s 2>/dev/null || echo $(date +%s)) ) / 86400 ))
    
    # 勒索软件标记
    ransomware=$(cat "$OUTPUT_FILE" | jq -r --arg cve "$cve" '.vulnerabilities[] | select(.cveID == $cve) | .knownRansomwareCampaignUse')
    icon="⚪"
    [ "$ransomware" = "Known" ] && icon="🔴"
    
    echo ""
    echo "${icon} ${cve}"
    echo "   厂商/产品：${vendor}"
    echo "   漏洞：${name}"
    echo "   日期：${date} (${days_ago}天前)"
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "💡 提示:"
echo "   查看完整数据：cat ${OUTPUT_FILE} | jq"
echo "   查看勒索软件利用：cat ${OUTPUT_FILE} | jq '.vulnerabilities[] | select(.knownRansomwareCampaignUse==\"Known\")'"
echo "   访问 CISA 官网：https://www.cisa.gov/known-exploited-vulnerabilities"
echo ""
echo "⚠️  重要提示:"
echo "   这些是真实在野利用的漏洞，请优先修复！"
