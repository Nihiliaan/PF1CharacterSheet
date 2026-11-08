# PF1CharacterSheet

[![Project Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()
[![Pathfinder 1E](https://img.shields.io/badge/System-Pathfinder%201e-blue.svg)]()
[![PureEP Friendly](https://img.shields.io/badge/Community-纯美苹果园-orange.svg)]()

PF1CharacterSheet 是一款专为 Pathfinder 1st Edition (PF1) 玩家设计的角色卡管理与排版工具，旨在满足桌面角色扮演游戏（TRPG）玩家在论坛开团与跑团记录中的录入、管理与导出需求。

## 设计原则

- **手动输入与逻辑校验**：保留属性、豁免、攻击加值等核心战斗数值的手动计算与录入流程，帮助玩家明确各项数值的规则来源与加值类型。
- **辅助性自动计算**：对变动频繁且规则计算繁琐的负重（Encumbrance）与资产（Assets）模块提供即时自动计算与超重校验。

## 功能特性

### 1. 论坛排版导出 (BBCode 导出)
提供面向跑团论坛的 BBCode 模板渲染能力。用户在结构化表单中录入数据后，可一键生成兼容主流论坛语法的 BBCode 文本，直接用于开团登记与角色发布。

### 2. AI 角色信息提取 (AI Extraction)
集成 Google Gemini API，支持用户录入文本或格式混乱的旧角色卡信息。通过大语言模型结构化解析，将分散的数值与描述自动映射并填充至对应的数据字段中。API Key 由用户本地提供并在前端调用，不经由后端中转。

### 3. 可扩展导出模板
除默认论坛模板外，支持用户自定义导出模板（涵盖 Markdown、HTML 及纯文本格式），满足不同组织与平台的存档要求。

### 4. 数据存储与云端同步
- **云端存储**：用户角色档案及目录结构托管于 Google Cloud Firestore，支持多端登录与数据拉取。
- **Google Drive 云同步**：支持对接用户的 Google Drive，提供角色数据的云端导入、导出与独立备份机制。
- **本地存储支持**：提供本地文件导入与导出能力，确保数据可离线归档。

## 技术栈

- **前端框架**：React 18 + TypeScript + Vite
- **样式方案**：Tailwind CSS v4
- **状态管理**：React Context + 自定义 Hooks
- **持久化与认证**：Firebase Authentication + Cloud Firestore
- **备份与同步**：Google Drive API
- **AI 能力**：Google Gemini API (`@google/genai`)

## 快速开始

### 开发环境要求
- Node.js >= 18.0.0
- npm / pnpm / yarn

### 安装与启动
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产产物
npm run build
```

## 贡献与反馈
欢迎针对 BBCode 模板规范、字段校验逻辑或多语言支持提交 Issue 与 Pull Request。

## 致谢
- 感谢纯美苹果园社区提供的 Pathfinder 1e 规则资料与论坛模板范例。
