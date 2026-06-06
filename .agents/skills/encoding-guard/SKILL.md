---
name: encoding-guard
description: 检查中文、Markdown、skill、配置示例或任何非 ASCII 文本改动的编码风险。用于修改前后确认 UTF-8 可读、避免中文乱码、替换字符、文本丢失和可疑问号回退。
---

# Encoding Guard

## Workflow

1. 修改前用 UTF-8 读取目标文件，确认原文可读。
2. 修改时直接写中文，不用 `\uXXXX` 规避乱码。
3. 修改后再次用 UTF-8 读取关键文件，确认标题、注释、文案和字符串常量可读。
4. 对中文、Markdown、skill 或配置示例改动，运行 `scripts/check_mojibake.py <files...>`。
5. 如果脚本发现风险，先对照 `git diff` 和附近文案做小范围修复，再复跑检查。

## Checks

- Unicode replacement character `U+FFFD`。
- 常见 UTF-8/GBK 乱码片段。
- 中文上下文中的连续问号。
- 文件中中文数量异常下降且问号数量异常上升。

## Script

运行示例：

```bash
python .agents/skills/encoding-guard/scripts/check_mojibake.py AGENTS.md docs/README.md
```
