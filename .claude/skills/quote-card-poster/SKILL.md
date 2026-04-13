---
name: quote-card-poster
description: 根据用户提供的作者、金句、出自、主题、尺寸，生成一张可直接预览与保存的 HTML/CSS 金句卡片；支持随机主题、多主题候选、单张生成与批量生成。
allowed-tools: Read,Write,Edit,MultiEdit,Bash,Glob,Grep
---

# quote-card-poster

你是一个“金句卡片生成”技能。

你的职责是：
1. 从用户自然语言中提取卡片信息。
2. 自动补全缺失字段的合理默认值。
3. 生成一份可直接打开的 HTML 文件。
4. 默认输出到 `output/quote-card/`。
5. 当用户明确要求“保存成图片 / 导出 PNG / 同时输出图片”时，再调用本 skill 自带脚本把 HTML 渲染为 PNG。

## 一、支持的输入方式

用户可能这样说：
- 帮我生成一张金句卡片
- 帮我做一张余华《活着》的金句海报
- 用随机主题生成一张竖版卡片
- 把这段话做成文艺风海报，并保存成图片
- 批量把这些金句都做成卡片

也可能是结构化输入（键值对格式）：

```
作者：余华
金句：没有什么比时间更具有说服力了，因为时间无需通知我们就可以改变一切。
出自：《活着》
主题：随机
尺寸：竖版
```

也可能是 **Markdown 格式**（`/gift` 等场景常见）：

```
## 标题句（## 开头代表卡片标题/金句）
正文段落内容，可以是多行文字，作为卡片正文展示在标题下方。
出自：《来源书名/文章名》
作者：某某某
```

Markdown 解析规则：
- `## text` 或 `# text` → `quote`（标题，大字加粗）
- `出自：text` → `source`
- `作者：text` → `author`
- 其余正文行 → `body`（正文段落，小字展示在标题下方）

## 二、字段提取规则

尽量从自然语言中提取以下字段：

- `author`：作者
- `quote`：金句/标题正文（卡片主标题，大字加粗）
- `body`：正文段落（可选，展示在标题下方，小字）
- `source`：出自哪本书/文章/作品
- `theme`：主题风格
- `size`：尺寸
- `exportImage`：是否导出 PNG
- `count`：若用户要多个候选，则生成多个主题版本

默认值：
- `theme = random`
- `size = portrait`
- `exportImage = false`
- `count = 1`

> **重要**：当输入是 Markdown 格式时，必须正确区分 `quote`（标题）和 `body`（正文）：
> - `## 这是标题` → `quote` 字段
> - 标题下面的段落文字 → `body` 字段
> - `出自：xxx` → `source` 字段
> 两者都写入 `_input.json`，generate.js 会分别渲染为不同样式。

### 主题枚举
- `minimal` 极简
- `literary` 文艺
- `retro` 复古
- `dark` 暗黑
- `oriental` 国风
- `magazine` 杂志
- `random` 随机

### 尺寸枚举
- `portrait` 竖版（1080x1440）
- `square` 方版（1080x1080）
- `landscape` 横版（1440x1080）

用户使用中文时，请自动映射：
- 极简 -> minimal
- 文艺 -> literary
- 复古 -> retro
- 暗黑 -> dark
- 国风 -> oriental
- 杂志 -> magazine
- 随机 -> random
- 竖版 -> portrait
- 方版 -> square
- 横版 -> landscape

## 三、交互规则

### 情况 A：信息不足
如果至少缺少 `quote`，先向用户索取最少必要信息：
- 作者
- 金句
- 出自

此时不要直接生成文件。

### 情况 B：信息完整
如果 `quote` 已具备，则直接生成。

### 情况 C：用户说“随机给我几个主题看看”
生成 3 个主题候选 HTML：
- 一个偏极简
- 一个偏文艺/杂志
- 一个偏复古/国风/暗黑中的任意一种

文件名分别体现主题名。

### 情况 D：用户要求导出图片
在生成 HTML 后：
1. 调用 `scripts/generate.js` 生成 HTML。
2. 调用 `scripts/render_png.js` 对 HTML 截图为 PNG。
3. 向用户返回 HTML 和 PNG 路径。

## 四、输出规范

默认输出目录：
- `output/quote-card/`

单张生成时：
- `output/quote-card/<slug>.html`
- 若导出图片：`output/quote-card/<slug>.png`
- 元数据：`output/quote-card/<slug>.meta.json`

多主题候选时：
- `output/quote-card/<slug>-minimal.html`
- `output/quote-card/<slug>-literary.html`
- `output/quote-card/<slug>-retro.html`
- 以及对应 png / meta.json

## 五、执行步骤

当信息完整时，按以下顺序执行：

1. 规范化输入字段。
2. 将字段写入临时 JSON：`output/quote-card/_input.json`
3. 运行：
   - `node .claude/skills/quote-card-poster/scripts/generate.js --input output/quote-card/_input.json`
4. 如果用户要求图片导出，再运行：
   - `node .claude/skills/quote-card-poster/scripts/render_png.js --input output/quote-card/_input.json`
5. 向用户返回：
   - 使用了什么主题
   - 输出了哪些文件
   - 下一步可如何微调（例如换主题、换尺寸、改配色）

## 六、生成标准

生成的 HTML/CSS 必须：
- 单文件可运行，不依赖外部 CSS 框架
- 默认使用系统字体栈
- 布局干净，适合阅读与截图
- 注意中文排版：行高、留白、引号、署名层级清晰
- 在视觉上区分：标题层、正文层、出处层、作者层
- 允许适量装饰，但不可喧宾夺主

## 七、文件改写规则

如果用户说：
- “换个主题” -> 复用上一份内容，仅替换主题重新生成
- “改成横版” -> 复用上一份内容，仅替换尺寸重新生成
- “把作者去掉” -> 允许生成时隐藏作者字段
- “导出图片” -> 对最近一份 HTML 执行 PNG 导出

## 八、失败时的处理

如果脚本执行失败：
- 明确说明失败原因
- 给出修复命令
- 不要假装已经生成成功

常见修复：
- `npm install puppeteer-core --registry https://registry.npmmirror.com`
- 确保系统已安装 Google Chrome 或 Microsoft Edge（render_png.js 自动检测路径）

## 九、优先级

优先满足：
1. 用户的金句内容准确
2. 卡片可直接打开预览
3. 风格匹配用户要求
4. 图片导出可用

