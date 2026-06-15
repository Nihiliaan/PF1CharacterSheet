# PF1CharacterSheet: 让角色卡回归本质

[![Project Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()
[![Pathfinder 1E](https://img.shields.io/badge/System-Pathfinder%201e-blue.svg)]()
[![PureEP Friendly](https://img.shields.io/badge/Community-纯美苹果园-orange.svg)]()

> **“手动填卡不仅仅是录入数据，它是玩家理解角色灵魂的过程。”**

PF1CharacterSheet 是一款专为 **Pathfinder 1st Edition (PF1)** 玩家设计的角色卡管理工具。它起源于“纯美苹果园”跑团社区的需求，旨在解决新人入门时面临的“排版难、录入慢、数据陌生”三大痛点。

## 🌟 核心理念：回归手动，拒绝“全自动”黑盒

在 Roll20 或 Foundry VTT 等平台中，自动化的角色卡虽然方便，但也让玩家逐渐失去了对数值来源和规则逻辑的敏感度。

PF1CharacterSheet 坚持 **“填表 + 校验”** 的逻辑：
- **拒绝过度自动化**：我们不会帮你计算 AC、豁免或攻击加值。我们相信，亲自计算这些数值是掌握规则的最佳方式。
- **繁琐工作自动化**：仅对负重（Encumbrance）和资产（Assets）进行自动计算，因为这些数据变动频繁且与规则逻辑理解关联较小。
- **数据敏感度**：通过手动输入，确保你对角色的每一项能力都了如指掌。

## 🔥 特色功能

### 1. 论坛排版救星 (BBCode 导出)
专为网团环境设计。内置强大的模板引擎，你可以像使用富文本编辑器一样填写卡片，然后一键生成排版精美的 BBCode，直接发布到“纯美苹果园”或其他论坛。

### 2. AI 角色识别 (AI Extraction)
手中有一份 PDF 或混乱的文本卡？通过集成的 AI 提取功能，无论原始内容是什么格式，AI 都能理解并自动帮你填充到对应的表格中，大幅缩短录入时间。

### 3. 万能导出模板
不受限于固定格式。你可以自定义任何文本模板（Markdown, HTML, 纯文本），让你的角色卡以任何你想要的样子呈现。

### 4. 深度数据库集成
内置海量的 PF1 规则数据库（职业、专长、法术、物品），提供即时的输入校验和参考，确保你的每一项数据都有据可依。

### 5. 数据自主与同步
- **Google Drive 云同步**：数据不存储在第三方服务器，而是直接保存在你自己的云端硬盘中。
- **本地存储**：数据完全属于你，随时可以导出备份。

## 🛠 技术栈
- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS (Focus on performance and customizability)
- **State Management**: React Context + Hooks
- **Storage**: Firebase (Auth) + Google Drive API
- **AI**: OpenAI / Claude API Integration

## 🚀 快速开始
1. 访问 [项目地址](#)
2. 登录 Google 账号以启用同步功能。
3. 开始创建你的第一个 PF1 角色！

## 🤝 贡献与反馈
本项目由社区驱动。如果你发现数据库缺失、AI 识别准确率问题或有更好的 BBCode 模板，欢迎提交 Issue 或 Pull Request。

---
*由跑团玩家为跑团玩家打造。愿你的 20 总是大成功。*
