# 业务逻辑地图 (Business Logic Mapping)

本文件记录了 Pathfinder 1st Edition 角色表编辑器的核心业务逻辑与其代码实现的对应关系，用于快速定位 Bug 和重构。

## 1. 核心数据流 (Data Flow)
- **全局状态**: `src/contexts/CharacterContext.tsx`
  - 角色数据的加载、保存、分发。
- **身份验证状态**: `src/contexts/AuthContext.tsx`
  - 用户登录、登出、第三方账号绑定。
- **派生计算**: `src/contexts/CharacterContext.tsx` 中的 `computed` 对象。
- **默认数据/结构**: `src/constants.ts` 中的 `DEFAULT_DATA`。
- **数据更新逻辑**: `src/services/dataUpdateService.ts` (基于 Immer)。

## 2. 外部服务 (Services)
- **身份验证 (Auth)**: `src/services/authService.ts` & `src/lib/firebase.ts`。
- **云端存储 (Drive Sync)**: 
  - 底层 API: `src/services/googleDriveService.ts`。
  - 业务流程: `src/services/driveSyncService.ts` (备份、还原、导入)。
- **AI 角色提取**: 
  - 业务流程: `src/services/aiService.ts` (处理提取与数据转换)。
- **档案库管理 (Vault)**: `src/services/characterService.ts` (处理文件/文件夹 CRUD)。

## 3. 编辑器业务 (Editor Business)
- **数值计算**: `src/utils/calculations.ts` (金币、重量、负重阈值)。
- **核心编辑 UI**: `src/components/editor/CharacterEditor.tsx`。
- **拖拽排序 (D&D)**: `src/hooks/useCharacterDnD.ts`。

## 4. 开发禁令 (Constraints)
- **禁止自动化核心属性计算**: 属性调整值 (Modifiers)、AC、豁免 (Saves)、命中加值等核心数值必须由玩家手动填写，**禁止**由程序自动填充或覆盖玩家输入。
  - **原因**: 尊重跑团玩家对手动计算数据的敏感度要求。
- **允许的自动计算**: 背包物品总价、总重量、负重状态（轻/中/重）。
  - **原因**: 减轻实时变动且繁琐的计算负担。

## 5. 错误记录与教训 (Post-mortems)
- **2026-05-12**: 试图强行引入属性调整值自动填充功能但未生效且违反需求。
  - **根本原因**: 逻辑判断未考虑到数据结构中空字符串的短路效应，且未提前与用户确认功能边界。
  - **教训**: 修改业务核心逻辑前必须通过 `AskUserQuestion` 或 `CONTEXT.md` 确认偏好。

## 6. 待办重构 (Refactoring Plan)
- [x] 分离 Google Drive 业务逻辑。
- [x] 分离 AI 提取与数据合并逻辑。
- [x] 整合数据更新逻辑为 Action 模式。
- [x] 分离 D&D 逻辑至独立 Hook。
- [x] 分离 Auth 状态至独立 Context。
