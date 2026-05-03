# Pathfinder 1e 人物卡项目架构梳理与重构方案

作为项目架构师，经过对现有代码资产（重点分析了 `CharacterContext.tsx` 与 `CharacterEditor.tsx` 等核心文件）的通盘盘点，确认目前系统存在典型的“面条代码（Spaghetti Code）”和“上帝对象（God Object）”问题。业务逻辑、状态管理、UI 渲染与外部服务调用严重耦合。

以下是针对该项目的彻底梳理和建议的架构重构方案。

---

## 1. 项目文件目录结构概览

目前项目的主要源码结构如下：

```text
D:\PROJECTS\PF1CHARACTERSHEET\SRC
│  App.tsx                 - 应用根组件，包含路由/视图切换和全局顶层结构
│  constants.ts            - 全局常量（如 DEFAULT_DATA）
│  index.css               - 全局样式
│  main.tsx                - React 挂载入口
│  types.ts                - TypeScript 类型定义（核心数据模型）
│
├─components               - UI 组件库
│  │  BBCodeTemplateEditor.tsx - BBCode 模板编辑器
│  │
│  ├─character             - 人物/账号相关复合组件（图库、网盘浏览、目录等）
│  │      AccountMenu.tsx, AccountSettings.tsx, AIExtractionModal.tsx, AvatarGallery.tsx, DriveBrowser.tsx, TableOfContents.tsx, VaultContent.tsx
│  │
│  ├─common                - 通用基础视图组件
│  │      ContextMenu.tsx, Dialog.tsx, DynamicInput.tsx, DynamicTable.tsx, InlineInput.tsx, MarkdownInlineEditor.tsx, MultilineInput.tsx, Section.tsx, SpellTable.tsx, Toast.tsx
│  │
│  ├─editor                - 编辑器核心组件
│  │      CharacterEditor.tsx - **(主要痛点) 巨型表单渲染组件**
│  │
│  └─layout                - 整体布局组件
│          AppFooter.tsx, AppHeader.tsx, AppOverlays.tsx
│
├─contexts
│      CharacterContext.tsx - **(主要痛点) 上帝 Context，承载了整个应用的所有状态**
│
├─hooks
│      useNumericStepper.ts - 数字步进器 Hook
│
├─i18n
│  │  config.ts            - 国际化配置
│  └─locales               - 语言包 (en.json, zh.json)
│
├─lib
│      firebase.ts         - Firebase 初始化及配置
│
├─services                 - 外部依赖与服务封装
│      aiService.ts        - AI 数据抽取
│      authService.ts      - 登录及账号绑定
│      characterService.ts - 本地与云端数据持久化
│      googleDriveService.ts - 谷歌网盘交互
│
└─utils                    - 纯函数工具库
        bbcodeExporter.ts  - 导出 BBCode 逻辑
        calculations.ts    - 负重、造价、属性等计算逻辑
        formatters.ts      - 格式化工具
        validation.ts      - 表单验证
```

---

## 2. 核心对象与功能概述

### `src/types.ts`
- **主要对象**：`CharacterData` (人物卡数据根模型), `FolderMetadata`, `CharacterMetadata`。
- **功能概述**：定义了人物的所有属性、防御、装备、法术等字段的强类型接口，是整个项目的数据核心。

### `src/contexts/CharacterContext.tsx`
- **主要对象**：`CharacterContext`, `CharacterProvider` 及其维护的一庞大 State 集合。
- **功能概述**：当前架构中的**God Object（上帝对象）**。它目前充当了全局状态机，不仅管理人物卡底层数据 `data`，还承担了：UI 视图模式 (`view`)、只读状态 (`isReadOnly`)、网络同步状态 (`isSyncing`)、弹窗与 Toast控制、文件拖拽逻辑 (`handleDragDrop`)、云端网盘与账号的交互 (`handleLogin`, `navigateDrive`) 等**所有事物**。超过 1400 行代码，职责极度不单一。

### `src/components/editor/CharacterEditor.tsx`
- **主要对象**：`CharacterEditor` 组件。
- **功能概述**：巨无霸视图组件。内部直接堆砌了大量的基础组件（`Section`, `DynamicTable`, `InlineInput`），并在组件内部定义了极长的数据映射和拖拽渲染逻辑。没有子模块切分，导致 DOM 结构冗长、渲染性能低下。

### `src/services/` 目录下的各类 Service
- **功能概述**：封装了与 Firebase 数据库、Google Drive API 和 AI 调用的网络请求逻辑。部分剥离了网络层，但目前在 Context 中仍有严重的回调和异常处理耦合。

### `src/utils/calculations.ts` & `formatters.ts`
- **功能概述**：业务逻辑层。负责计算背包的总重量、护甲惩罚及属性加值等。

---

## 3. 面临的问题与痛点 (Spaghetti Code 分析)

1. **状态极度膨胀 (State Bloat)**：`CharacterContext` 既管业务层数据（HP、属性、装备），又管交互层状态（拖动条目 ID、弹窗是否打开、Header 钉选状态），还管系统层级（Auth, Firebase 状态）。只要任何一个 UI 状态改变，这 1400 行的 Context 会触发整个下层应用的重新渲染。
2. **渲染性能瓶颈**：`CharacterEditor` 一次性渲染了全张人物卡的所有 Block (法术、装备、技能、属性)。每次只要在 `CharacterContext` 里修改了一个字母，整个大表单都面临重渲染风险。
3. **领域逻辑泄露 (Leaking Domain Logic)**：大量业务相关的操作（如：如何添加一个背包 `addBag`，如何计算总重）没有采用 Reducer 或 Service 类管理，而是直接作为 Context 的匿名函数传递给 UI 去绑定。
4. **巨型文件难以维护**：`CharacterContext.tsx` 和 `CharacterEditor.tsx` 体积过大，多人协作极易引发合并冲突。

---

## 4. 架构重构建议与落地方案

为了提升代码的健壮性和可维护性，建议实施以下重构计划。

### 第一阶段（首要优先级）：确立由 Schema 驱动的单一数据源视图架构 (Schema-Driven UI)

这是彻底解决前后端耦合、数据流混乱的最核心基础。基于 MVVM 与 Schema 设计：

1. **四种数据格式分离**：建立清晰的数据转换流。前端内存只维护纯净的 **存储格式 (Storage)**，根据需要动态派生并呈现为 **显示格式 (Display)**、**交互格式 (Interactive)** 或 **导出格式 (Export)**。
2. **中心化的数据类型注册表 (Type Registry)**：为每个字段定义明确的数据类型架构（如 `Bonus` 继承自 `Integer`）。在类型中封装校验、存储到显示/交互/导出的映射函数。
3. **前端视图退化为“排版引擎”**：前端通过查询 Schema 字典来渲染输入框，拦截输入并在校验后统一修改内存级的 JSON对象，彻底避免为每个输入框手写双向绑定，减少成百上千行冗余代码。

### 第二阶段：拆分 Context，实行“状态分离” (State Segregation)

**不要把所有鸡蛋放在一个篮子里。** 针对 `CharacterContext`，应该拆分为以下多个独立的 Context 或采用状态管理库 (如 `Zustand` / `Redux Toolkit`)：

1. **`AuthContext` / `SessionContext`**：专门处理用户登录、Firebase 身份以及系统级别的只读/写权限。
2. **`UIContext` / `AppStore`**：专门处理界面开关（如 `view` 切换、`Toast` 通知、`ConfirmModal`、Header 状态、当前拖拽目标的状态）。
3. **`FileVaultContext`**：专门负责网盘浏览器、角色列表获取、文件树移动和重命名逻辑。
4. **`CharacterDataContext`**：仅仅处理当前打开的纯净 `CharacterData` (人物业务数据) 的增删改查。

> **推荐采用 Zustand 代替 React Context** 来管理数据仓库，可以有效避免 React Context 带来的“穿透重渲染”问题，并且能把 Action 函数（如 `addBag`、`updateDefenses`）平级归类提取到单独的文件中。

### 第三阶段：解耦和拆分编辑器组件 Component Isolation

`CharacterEditor.tsx` 需要按业务领域 (Domain) 进行扁平化切割：

1. **建立 `features` 目录结构**：
   - 提取 `components/editor/sections/BasicInfoSection.tsx`
   - 提取 `components/editor/sections/AttributesSection.tsx`
   - 提取 `components/editor/sections/DefenseSection.tsx`
   - 提取 `components/editor/sections/EquipmentSection.tsx`
   - 提取 `components/editor/sections/MagicSpellSection.tsx`
2. **职责单一化**：由原来的 `Editor` 统一向 `Context` 要所有方法，改为各个 Section 内部订阅它们自己所需的局部 State 或 Action，实现精确的局部更新。

### 第四阶段：抽象业务逻辑层 (Domain Logic Extraction)

在现有的 `utils` 外，建立形式化的**纯业务逻辑架构（Actions / Reducers）**。
例如目前的 `addBag`、`updateBagItems`：
```typescript
// 提取类似 Reducer 的纯函数或专门的封装服务
export const characterReducer = (state: CharacterData, action: CharacterAction) => {
    switch (action.type) {
        case 'ADD_BAG': ...
        case 'TOGGLE_BAG_WEIGHT': ...
    }
}
```
这样不仅能进行极高覆盖率的单元测试，还把视图组件与数据变易彻底解绑。

### 第五阶段：拖拽 (Drag & Drop) 架构重塑

把分布在 Context 中的几十个 `handleItemDragStart`, `handleTableItemDrop` 彻底移除。
引入如 `@hello-pangea/dnd` (原 `react-beautiful-dnd`) 或 `dnd-kit`，将拖拽状态局部化到具体的 Table 列表级，拖拽完成后只触发一个诸如 `onReorderItem(listId, sourcePos, targetPos)` 的原子化接口。

### 总结重构路线图
- **Step 1 (核心基础):** 确立四层数据结构分离机制，建立全局 Schema 数据类型映射表，引入 `Immer.js` 实现基于中心 JSON 字典的数据驱动修改架构。
- **Step 2:** 引入轻量级状态管理工具 (如 Zustand)，解耦 `CharacterContext`，将业务与 UI 状态分离。
- **Step 3:** 将 `CharacterEditor` 拆分为由 Schema 驱动的细粒度 Section 组件。
- **Step 4:** 书写纯测试和规范化的业务 Reducer 模型变异函数。
- **Step 5:** 抽取表单拖拽库，剥离状态机中的 DND 控制流。

通过实施这一方案，项目的可读性、渲染性能和后期迭代扩展性将获得指数级增强。
