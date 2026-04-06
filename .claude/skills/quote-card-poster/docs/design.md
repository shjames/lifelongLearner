# 设计说明

这个版本面向 Claude Code 的 `.claude/skills/[skill-name]/` 结构。

目标：
- 用户直接用自然语言触发 skill
- Claude 先根据 `SKILL.md` 提取结构化字段
- 然后调用 scripts 生成 HTML
- 用户需要时再渲染为 PNG

推荐用法：
1. 用户自然语言提出需求
2. Claude 将内容写入 `output/quote-card/_input.json`
3. Claude 调用脚本生成
4. 返回文件路径与后续修改建议
