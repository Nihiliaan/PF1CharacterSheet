# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览
一个基于 React + Vite 的 Pathfinder 1st Edition (PF1) 角色表编辑器。集成 Firebase (Auth/Firestore) 和 Google Drive。

## 常用命令
- **安装依赖**: `npm install`
- **开发服务器**: `npm run dev` (端口 3000)
- **构建项目**: `npm run build`
- **代码规范检查**: `npm run lint`

## 技术栈
- **框架**: React 19
- **构建工具**: Vite
- **状态管理**: React Context (`CharacterContext`)
- **样式**: Tailwind CSS
- **后端/存储**: Firebase, Google Drive API
- **语言**: TypeScript

## 核心架构
- `src/components/editor/CharacterEditor.tsx`: 核心编辑界面 (潜在重构重点)
- `src/contexts/CharacterContext.tsx`: 角色数据状态管理
- `src/utils/calculations.ts`: PF1 数值计算逻辑
- `src/services/`: 外部 API 服务 (Firebase, AI, Drive)
- `src/types.ts`: 全局类型定义

## 重构目标
1. **逻辑抽离**: 将计算和数据处理逻辑从组件中移至 `services` 或 `utils`。
2. **状态优化**: 考虑将复杂的 Context 逻辑重构为 Zustand 或更清晰的模式。
3. **组件拆分**: 减小大型组件的体积，提高复用性。
