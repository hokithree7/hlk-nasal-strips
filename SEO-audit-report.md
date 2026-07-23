# HLK 独立站全站 SEO 体检与关键词固化报告

> 执行时间：2026-07-23 ｜ 站点：en.hlknasalstrips.com（Astro 静态站 + Cloudflare Pages）
> 提交：569f0ae ｜ 本地构建：54 页通过

## 一、体检方法
用 `scripts/seo_audit.py` 扫描线上实际产物（dist），逐页检查：title 长度、description 长度、H1 数量、H2 数量、图片 alt 缺失、canonical、keywords meta、og:url、robots。

## 二、发现的问题（已修复 ✅）

| # | 问题 | 严重度 | 修复 |
|---|------|--------|------|
| 1 | `NasalDilator` 落地页 `og:url` 指向 `bodytapeoem.com`（跨域，污染社交分享与权重） | 🔴 严重 | 改为 `en.hlknasalstrips.com/NasalDilator/`，并补 canonical |
| 2 | `astro.config.mjs` 的 `site` 是 `hlknasalstrips.com`，与真实域名不符 | 🟡 中 | 改为 `https://en.hlknasalstrips.com` |
| 3 | 全站 Astro 页面**一个 `<meta name="keywords">` 都没有** | 🟡 中 | BaseLayout 增加 keywords 属性，11 类页面逐页填入业务热词 |
| 4 | `admin`（Decap CMS 后台）公开可访问且无 noindex | 🟡 中 | 加 `<meta name="robots" content="noindex, nofollow">` |
| 5 | `ClassicNasalStrips` description 201 字符（超 160，SERP 截断） | 🟢 轻 | 压缩至 151 字符 |

**体检通过项**：全站 H1 唯一（每页 1 个）、图片 alt 0 缺失、canonical/OG/Twitter/hreflang 齐全、结构化数据（Organization + WebSite + Article + FAQ）完整。

## 三、业务热词固化（核心交付）

词簇来源：WebSearch 调研竞品（VivaTape / KangdiMedical 等）确认的高意图 B2B 词簇。

| 页面 | 固化关键词（meta keywords） |
|------|------------------------------|
| 首页 | nasal strips manufacturer, nasal strips OEM, nasal strips wholesale, custom nasal strips, B2B nasal strips supplier, China nasal strip factory, anti snore nasal strips, mouth tape manufacturer, sleep patches OEM, FDA CE ISO13485 nasal strips |
| 产品 | nasal strips, mouth tape, sleep patches, face tape, kinesiology tape, BJJ finger tape, nasal dilator, adhesive patches wholesale, OEM tape manufacturer, sleep mouth tape, anti snore strips |
| OEM | OEM nasal strips, private label nasal strips, custom nasal strips, nasal strips ODM, mouth tape OEM, private label mouth tape, low MOQ manufacturer China, custom adhesive patches, white label nasal strips |
| 关于 | nasal strips manufacturer China, HLK factory, adhesive tape manufacturer, 20+ years experience, FDA CE ISO13485 certified, Quanzhou tape factory, B2B OEM supplier |
| 信任 | secure B2B payment, T/T PayPal nasal strips, verified manufacturer, TÜV Rheinland certified, reliable Chinese supplier, nasal strips supplier trust, safe OEM order |
| 联系 | contact nasal strips manufacturer, request quote nasal strips, OEM inquiry, free sample nasal strips, factory direct quote, nasal strips supplier email, WhatsApp nasal strips |
| FAQ | nasal strips FAQ, OEM MOQ nasal strips, nasal strips shipping, CE FDA certifications, payment terms, private label questions, B2B manufacturer FAQ |
| 博客 | 每篇按 `分类 + 标题 + nasal strips manufacturer, OEM nasal strips, HLK tape, B2B wellness supplier` 自动生成 |

> 注：Google 不读 keywords，但 Bing / Yahoo / Yandex 仍参考；更重要的是这些词已自然分布在各页 title / H1 / H2 / 正文 / 图片 alt 中，构成完整的关键词主题信号。

## 四、构建与部署状态

- ✅ 本地 `npm run build`：54 页通过，dist 已验证含全部 keywords（56 个 HTML 文件均带 keywords）。
- ✅ 代码已推送：`2024bfe..569f0ae main -> main`（推送时远程领先 77 个提交——另一流程推了 25 篇客户案例博客，已 rebase 合并）。
- ⏳ **线上部署**：推送后约 5 分钟，线上仍显示旧版本（sitemap=54 但首页无 keywords、`og:url` 仍是 bodytapeoem.com）。`cf-cache-status: DYNAMIC` 说明非缓存问题，疑似 Cloudflare 免费额度下本次构建排队中或构建回退。
- 👉 **建议**：在 Cloudflare Pages 后台查看最新 Production 构建日志确认状态；或等待 CF 完成部署后硬刷新（Ctrl+F5）。本地预览（见下方）已 100% 正确，可立即核对效果。

## 五、可选后续优化（非必须，不降权）
1. 部分博客标题过长（94–112 字符，仅 SERP 截断展示）：可精简到 ≤70。
2. 少量博客 description 超 160：可压缩（Google 常自动重写摘要，影响有限）。
3. 可加 `BreadcrumbList` 结构化数据增强面包屑富媒体摘要。
4. 可针对核心词（如 "nasal strips OEM"、"mouth tape manufacturer"）在首页/产品页增加 FAQ 或对比区块，进一步强化主题权重。
