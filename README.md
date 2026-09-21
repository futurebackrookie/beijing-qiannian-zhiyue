# 北京 · 千年之约

一个中国风的北京宣传网站：水墨卷轴开场、四季北京、八百年建都史、中轴线、京城七景、京味儿美食、
京剧脸谱、北京话等级考试、二十四节气转盘、老北京的一天、行程规划器。

在线访问：<https://futurebackrookie.github.io/beijing-qiannian-zhiyue/>

## 部署与分享

**线上地址（GitHub Pages）**：<https://futurebackrookie.github.io/beijing-qiannian-zhiyue/>
本仓库 `main` 分支根目录即站点，`git push` 后约 1 分钟自动更新。

**国内访问更稳的镜像（Cloudflare Pages，已部署）**：<https://beijing-qiannian-zhiyue.pages.dev/>
采用命令行直传（不连 GitHub），每次更新线上多跑一条命令：
```bash
bash scripts/build-deploy.sh        # 生成 .deploy/
bash scripts/deploy-cloudflare.sh   # 上传到 Cloudflare Pages（只传有变化的文件）
cd .deploy && git add -A && git commit -m "更新" && git push   # 同步 GitHub Pages
```
首次在新电脑上使用需先 `npx wrangler login`（浏览器点 Allow）。仓库里的 `_headers` 让 Cloudflare 对图片 / 字体 / 音频缓存一年。

**自定义域名**（可选）：
- GitHub Pages：仓库 Settings → Pages → Custom domain 填域名（例如 `beijing.example.com`），
  再到域名服务商加一条 CNAME 记录指向 `futurebackrookie.github.io`；GitHub 会自动签 HTTPS 证书。
- Cloudflare Pages：项目 → Custom domains → 添加，若域名本身托管在 Cloudflare 则一键完成。

**访问统计**（可选）：`index.html` 底部有一段注释标出了粘贴统计代码的位置，
支持百度统计（国内）或 Umami / Plausible（无 Cookie，隐私友好）。

## 背景音乐

右上角「古琴」按钮播放古琴曲《流水》（Charlie Huang 演奏，CC BY 2.5，来自 Wikimedia Commons），
文件在 `audio/liushui.m4a`（Safari / iOS）与 `audio/liushui.mp3`（其余浏览器）。
两个文件都缺时自动回退到 Web Audio 实时合成的古琴。只使用你有权公开传播的音频。

## 技术说明

- **零依赖构建**：纯静态 HTML / CSS / JS，不需要任何构建步骤，`index.html` 直接可用。
- **完全自包含**：图片、字体、动画库（GSAP / ScrollTrigger / Lenis）全部在本仓库内，不依赖 CDN，离线可运行。
- **字体子集化**：中文字体（Ma Shan Zheng / ZCOOL XiaoWei / Noto Serif SC）按站内实际用字做了子集切分，
  35 个 woff2 文件共约 2MB 覆盖全站中文，并通过 `unicode-range` 按需加载。
- **4K 图片**：`images/sd/` 为 3840px 原始 JPEG（无重压），全设备统一 4K。
  分片懒加载——进入视口前 1 屏才开始加载，首屏约 3.6MB，全部看完累计约 102MB。
- **可访问性**：图片 alt 齐备，按钮均有 aria-label，支持 `prefers-reduced-motion`，`lang="zh-CN"`。
- **响应式**：桌面 / 平板 / 手机三档断点，移动端中轴线与时间线自动切换为竖排单列布局。

## 目录结构

```
index.html          页面骨架
css/style.css       全部样式（设计令牌在文件顶部 :root）
css/fonts.css       自托管字体子集
js/data.js          所有文案与图片配置 —— 改文字、换图片改这里
js/site-utils.js    可测试的图片、音频等工具函数
js/main.js          全部交互
images/sd/          48 张 3840px 原始 JPEG
fonts/              35 个 woff2 字体子集
vendor/             gsap / ScrollTrigger / lenis
audio/              古琴曲《流水》m4a / mp3（CC BY 2.5）
```

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000
```

直接双击 `index.html` 也可以打开，但用本地服务器更接近线上环境。

## 内容修改

- **改文案**：编辑 `js/data.js` 中的 `seasons / timeline / axis / scenes / foods / masks / quiz / terms / day / planner`。
- **换图片**：把新图（建议 3840px 宽）放进 `images/sd/<key>.jpg`，`<key>` 见 `js/data.js` 的 `images` 对象。
- **改配色**：`css/style.css` 顶部 `:root` 里的 `--paper / --ink / --vermilion / --gold` 等变量。
- **背景音乐**：右上角「古琴」按钮播放古琴曲《流水》（`audio/liushui.m4a|mp3`，Charlie Huang 演奏，
  CC BY 2.5）。换曲子时替换这两个文件并改 `index.html` 里的 `<source>`；文件缺失时自动回退到合成古琴。

## 交互一览

| 区块 | 交互 |
|---|---|
| 开场 | 水墨「京」字加载 → 卷轴展开 → 「北京」落笔、印章落下；鼠标移动云雾视差 |
| 全站 | Lenis 平滑滚动；朱砂自定义鼠标；右侧卷轴目录；宣纸颗粒 |
| 四季 | 滚动 / 拖动 / 点击切换；花瓣、荷风、银杏、雪花粒子随季节变化 |
| 长河 | 横向时间线，金线随滚动绘出，当前朝代卡片描朱砂边并落印 |
| 中轴 | 金线随滚动生长，六个节点依次点亮，图片自下而上揭开 |
| 七景 | 悬停 3D 翻面，鼠标位置驱动卡片倾斜 |
| 美食 | 分类筛选、点开看故事、「尝一口」盖章集印、「帮我点单」随机菜单 |
| 脸谱 | 六种脸谱色一键换色，眼睛「点睛」眨动 |
| 京话 | 十道北京话选择题，答完评级盖章 |
| 节气 | 可拖动转盘，自动定位到今天的节气 |
| 行程 | 选天数与兴趣生成逐时段行程，可换一版、复制到剪贴板 |
| 一日 | 背景色温从晨到夜渐变，夜晚出现星空 |

## 图片版权

站内全部照片来自 [Wikimedia Commons](https://commons.wikimedia.org/)，共 48 张：

| 许可证 | 数量 |
|---|---|
| CC BY-SA 4.0 | 28 |
| CC0 | 5 |
| CC BY 2.0 | 5 |
| CC BY-SA 2.0 / 2.0 de / 3.0 / 3.0 de | 8 |
| CC BY 3.0 | 1 |
| Public domain | 2 |

完整的逐张署名（标题、作者、许可证、原始页面链接）以可展开列表的形式内置于页面底部
「图片来源与署名」中，数据源为 `js/data.js` 的 `credits` 字段。

**CC BY-SA 图片为「相同方式共享」**：二次使用、修改或再发布这些照片时，需要保留署名，
并以相同许可证分发。本仓库中的代码（HTML / CSS / JS）与图片许可证相互独立。

## 授权

- 代码：MIT（见 `LICENSE`），可自由使用、修改。
- 图片与古琴录音：遵循各自的 CC 许可证，**必须保留页脚署名与 `js/data.js` 中的 `credits` 数据**。
