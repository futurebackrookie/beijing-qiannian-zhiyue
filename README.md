# 北京 · 千年之约

一个中国风的北京宣传网站：水墨卷轴开场、四季北京、八百年建都史、中轴线、京城七景、京味儿美食、
京剧脸谱、北京话等级考试、二十四节气转盘、老北京的一天、行程规划器。

在线访问：<https://futurebackrookie.github.io/beijing-qiannian-zhiyue/>

## 技术说明

- **零依赖构建**：纯静态 HTML / CSS / JS，不需要任何构建步骤，`index.html` 直接可用。
- **完全自包含**：图片、字体、动画库（GSAP / ScrollTrigger / Lenis）全部在本仓库内，不依赖 CDN，离线可运行。
- **字体子集化**：中文字体（Ma Shan Zheng / ZCOOL XiaoWei / Noto Serif SC）按站内实际用字做了子集切分，
  35 个 woff2 文件共约 2MB 覆盖全站中文，并通过 `unicode-range` 按需加载。
- **渐进式图片**：`images/sd/` 为 1600px WebP（q78），进入视口前 1 屏开始加载，加载完成淡入。
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
images/sd/          48 张 1600px WebP 图片
fonts/              35 个 woff2 字体子集
vendor/             gsap / ScrollTrigger / lenis
audio/              背景音乐放置说明
```

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000
```

直接双击 `index.html` 也可以打开，但用本地服务器更接近线上环境。

## 内容修改

- **改文案**：编辑 `js/data.js` 中的 `seasons / timeline / axis / scenes / foods / masks / quiz / terms / day / planner`。
- **换图片**：把新图放进 `images/sd/<key>.jpg`（`<key>` 见 `js/data.js` 的 `images` 对象），再转成 WebP：
  ```bash
  cwebp -q 78 -resize 1600 0 images/sd/your.jpg -o images/sd/your.webp
  ```
  同时把 `js/main.js` 顶部的 `IMG_EXT` 改为 `'webp'`（本仓库已经是 WebP）。
- **改配色**：`css/style.css` 顶部 `:root` 里的 `--paper / --ink / --vermilion / --gold` 等变量。
- **放背景音乐**：将有播放权的音频命名为 `audio/youjing.m4a`（推荐）或 `audio/youjing.mp3`。
  文件缺失时，右上角「游京」按钮会自动回退到站内合成古琴，不影响使用。

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

- 代码：可自由使用、修改。
- 图片：遵循各自的 CC 许可证，**必须保留页脚署名与 `js/data.js` 中的 `credits` 数据**。
