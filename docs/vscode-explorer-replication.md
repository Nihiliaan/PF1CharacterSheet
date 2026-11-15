# VS Code 资源管理器（Explorer）复刻规格

> 目标：把本应用的侧栏文件树 / 标签系统对齐 VS Code 的官方行为。
> 依据均为官方一手资料：[User Interface 文档](https://code.visualstudio.com/docs/editing/getting-started/userinterface)、
> [v1.20 Release Notes](https://code.visualstudio.com/updates/v1_20)、
> [Theme Color Reference](https://code.visualstudio.com/docs/getstarted/theme-color-reference)、
> VS Code 源码 `files.contribution.ts`（设置注册）与 `fileActions.contribution.ts`（键位注册）。

---

## 一、行为规格

### 1. 选区模型（Multi-selection）

| 操作 | 行为 |
|---|---|
| 单击文件行 | 打开（见 §3 预览模式）并**选中该行**（选区重置为它） |
| `Ctrl/Cmd+点击` | 增减选区，**不打开**文件 |
| `Shift+点击` | 从上次锚点行到当前行的范围选择 |
| 右键项 ∈ 多选区 | 菜单作用于**整组选区**（扩展 API 收到 `Uri[]` 全量） |
| 右键项 ∉ 选区 | 选区先重置为被右键项，再弹菜单 |
| 点击树空白处 | 清空选区 |
| 恰好选中两项 | 右键出现 **Compare Selected**（对比）命令 |
| 点文件夹 | 选中 + 展开/折叠（VS Code 点文件夹同样是选中它） |

出处：User Interface 文档 Multi-selection 节；v1.20 Release Notes（该版本引入 Explorer 多选，同时把 `Ctrl+点击=打开到侧边` 的旧键位让位给多选，旧键位可用 `workbench.list.multiSelectModifier: "alt"` 找回）。

### 2. autoReveal（选区跟随活动文档）⭐ 核心差异

源码 `files.contribution.ts` 注册原文：

```
'explorer.autoReveal': {
  type: ['boolean', 'string'], enum: [true, false, 'focusNoScroll'], default: true,
  description: "Controls whether the Explorer should automatically reveal and
                select files when opening them."
  枚举说明:
    true            "Files will be revealed and selected."
    false           "Files will not be revealed and selected."
    focusNoScroll   "Files will not be scrolled into view, but will still be focused."
}
```

含义：**打开/切换文件时，树自动展开其祖先、滚动定位，并把选区重置到该文件。**
因此 VS Code 里永远不会出现"灰色选区滞留在无关文件上"——切到哪个文件，树的选中项就跟随到哪。
（关闭 autoReveal 后才有"手动 Show Active File in Explorer / revealFileInOS"类命令的需求。）

### 3. 预览模式（Preview mode）【暂缓，单独一轮】

官方原文：
> When you single-click or select a file in the Explorer view, it is shown in a preview mode and reuses an existing tab (preview tab). When you start editing the file or use double-click to open the file from the Explorer, a new tab is dedicated to that file. Preview mode is indicated by italics in the tab heading.

- 单击 = 预览打开（斜体、可复用、下一个预览顶替它）
- 双击 / 开始编辑 / `Ctrl+K Enter` = 固定（pinned）
- 设置：`workbench.editor.enablePreview`（默认开）
- 预览文件不进 Open Editors 列表

### 4. 分栏（Side by side）

- **`Alt+点击` 文件 = 打开到侧边新分栏**（官方文档 Side by side editing：*"Alt and select a file in the Explorer view"*）
- 右键菜单 **Open to the Side**（`Ctrl+Enter`）
- 编辑器右上角 **Split Editor** 按钮；**按住 `Alt` 悬停该按钮 → 提供切换分栏方向**（右/下互换）
- 默认向右分栏（列式），`workbench.editor.openSideBySideDirection` 可改为向下
- 已打开的文件 Alt+点击：VS Code 会在另一栏再显示一份（两栏同文件）；**我们一个文档只允许一个标签**，降级为聚焦既有标签（已在文档记录的偏差）

### 5. 键盘（源码 fileActions.contribution.ts 注册，Windows/Linux；树需聚焦）

| 键 | 命令 | 条件 |
|---|---|---|
| `F2` | renameFile（重命名） | 树聚焦 + 非根 + 可写 |
| `Delete` | moveFileToTrash（回收站） | 树聚焦 |
| `Shift+Delete` | deleteFile（永久删） | 树聚焦 |
| `Ctrl+X` / `Ctrl+C` / `Ctrl+V` | 剪切 / 复制 / 粘贴 | 树聚焦 |
| `Ctrl+Enter` | openToSide | 文件行 |
| `Ctrl+Alt+F` | 树内查找（Find 控件） | 树聚焦 |
| `↑` / `↓` | 焦点/选区在可见行间移动 | 树聚焦 |
| `Enter` | （mac 上是重命名；Windows 树内 Enter 默认无绑定） | — |

### 6. 右键菜单项（文件/文件夹）

文件：Open to the Side、Open With...、Reveal in File Explorer（系统文件管理器）、
Open in Integrated Terminal、Cut/Copy/Paste、Copy Path、Copy Relative Path、Rename (F2)、Delete。
文件夹：New File...、New Folder...、Reveal/Open in Terminal、Cut/Copy/Paste、Copy Path、Rename、Delete、
Find in Folder...（搜索该目录）。
两选中项：Compare Selected。

---

## 二、视觉规格（4 层高亮）

[Theme Color Reference](https://code.visualstudio.com/docs/getstarted/theme-color-reference) 原文语义
（"active" 的定义：**树持有键盘焦点**；否则 inactive）：

| 层 | token | 语义 | 我们的落法 |
|---|---|---|---|
| 悬停 | `list.hoverBackground` | 鼠标掠过行 | `hover:bg-stone-200/60`（现状保留） |
| 非焦点选中 | `list.inactiveSelectionBackground/Foreground` | 树未聚焦时的选中行：**纯底色、更淡、无外框** | `bg-stone-200` |
| 焦点选中 | `list.activeSelectionBackground` + `list.focusOutline` | 树聚焦时的选中行：底色 + **1px 外框** | 底色 + `ring-1 ring-primary/50` |
| 焦点+选中 | `list.focusAndSelectionOutline` | 二者重叠时的外框色 | 同上外框色 |
| 焦点未选中 | `list.focusBackground/Outline` | 键盘焦点行（可以不选中） | 本轮简化：焦点行恒在选区内 |
| 拖放落点 | `list.dropBackground` / `dropBetweenBorder` | 拖拽悬停落点 | 已有（`bg-primary/20 ring-primary/50`，保留） |

> 用户的原始观察"被点击的项目除了底色之外还有一层外框" = activeSelection 底色 + focusOutline 外框。

**结论：砍掉现在的第三体系（橙色 bg-primary/10 活动高亮）。**
活动文件就是"被 autoReveal 选中的那行"（焦点行，底色+外框），视觉体系与 VS Code 同构。
"打开的编辑器"列表的橙色选中样式保留（对应 VS Code Open Editors 的选中态）。

---

## 三、UI 布局规格（复刻要点）

来自官方 User Interface 文档：

1. **编辑器区**
   - 标签条在编辑区顶部；**编辑器动作（Editor Actions）位于标签条右侧**：Split Editor 按钮 + More Actions(`...`)
   - **Split Editor 按钮在编辑器右上角**；Alt+悬停切换分栏方向
   - 拖拽标签到屏幕边缘可任意方向分栏；Grid 布局（2×2 等）
   - 双击标签 = 固定预览标签；脏标记：未悬停时显示 ● 圆点，悬停时变 ×
   - 面包屑（Breadcrumbs）在标签条下方显示文件路径，可开关（View > Appearance > Toggle Breadcrumbs）
2. **Explorer 侧栏结构**（自上而下）
   - OPEN EDITORS 区（可经 `...` 菜单开/关；显示打开的标签、预览/固定状态；区头按钮：Save All / Close All；可拖拽排序区块）
   - 文件树区（区头按钮：New File、New Folder、Refresh、Collapse All）
   - OUTLINE / TIMELINE 区（底部，可折叠）
   - 区块经 `...` 菜单开/关、拖拽排序
3. **钉住标签**：pinned tab 永远可见（见 Custom Layout 文档 Pinned Tabs 节）
4. **视图显隐**：Activity Bar 右键显隐视图；拖拽排序

---

## 四、本应用现状对照与实施计划

| 项 | VS Code | 现状 | 计划 |
|---|---|---|---|
| autoReveal | 切换文件→树 reveal+select | 不跟随（P0 前还有旧目录高亮覆盖 bug，已修） | **P0a 本轮** |
| 视觉体系 | 底色+外框两层 | 橙色活动高亮+灰选区并行 | **P0b 本轮** |
| Alt+点击分栏 | 打开到侧边 | 无 | **P0c 本轮** |
| Open to the Side 菜单/Ctrl+Enter | ✓ | 无 | **P0c 本轮** |
| 键盘（↑↓/F2/Delete/Ctrl+XCV） | ✓ | 无 | **P0d 本轮** |
| 预览模式（单击斜体/双击固定） | 默认开 | 单击=永久标签 | 单独一轮（动核心标签系统） |
| Ctrl+Alt+F 树内查找 | ✓ | 无 | 暂缓 |
| Compare Selected | ✓ | 无对应概念 | 不做 |
| 面包屑开关 / 区块拖拽排序 / pinned | ✓ | 无 | 暂缓 |

### 实现要点（本应用映射）

- 选区即 `selectedIds`（已有 Ctrl/Shift/右键整组语义，全部保留）
- autoReveal = `activeDocId` 变化 → `setSelectedIds([activeDocId])` + 既有"展开祖先+滚动"逻辑；
  网格视图的目录联动保留（相当于 VS Code 没有的第二个浏览面）
- 焦点行 = 锚点行（最近点击/活动文档），渲染为底色+外框；其余选中行纯底色
- Alt+点击 / Open to the Side / 右键「打开到侧边」：新建分栏以 chooser 开场 → `pendingReplaceKeyRef`
  原位顶替（`handleOpenDocument` replace 优先），**保留 chooser 的唯一 key**——同一文档因此在
  多个分栏各持一个标签（tab key ≠ docId 由此引入；常规打开仍按 docId 去重）
- 标签右键菜单：`src/components/editor/tabMenuItems.ts` 统一构建器——菜单只由标签本身决定，
  与聚焦/激活无关；需要 live 状态的操作先 `switchTab` 激活被右键的标签再执行；
  ContextMenu 支持 `shortcut`（右侧灰色提示）与 `disabled`（置灰，如未修改时的"保存"）
- 关闭其他 / 关闭右侧标签页 / 全部关闭：`closeTabKeys`（CharacterContext）单次簿记批量关闭，
  含脏标签时弹一次统一确认
- 键盘：树容器 `tabIndex=0` 持焦，keydown 路由到现有 requestRename/deleteItems/onCut/onPaste/切换标签逻辑

### 结构性修复（实现中发现的基础设施问题）

1. **arborist DndProvider 单例**：react-arborist 的 `<Tree>` 内部自建 react-dnd Provider；
   StrictMode 双挂载 / Fast Refresh 重挂载会触发 "Cannot have two HTML5 backends" 白屏。
   解法：模块级 `createDragDropManager(HTML5Backend)` 单例经 `dndManager` prop 注入。
2. **后台标签页 RO 冻结**：ResizeObserver 回调依赖渲染步，Chrome 对 `document.hidden` 的标签页
   冻结渲染管线——后台挂载页面时 `treeSize` 恒为 0、树永不渲染。解法：effect 内先同步测量一次
   （`clientWidth/clientHeight`），RO 仅作为后续尺寸变化的增强。

### 已知偏差（有意为之）

- 同文档多分栏的编辑同步：VS Code 两个编辑器共享同一份模型；我们的未聚焦分栏渲染只读快照，
  在聚焦栏编辑后另一栏的快照不会实时刷新（切回时以各自的快照恢复）。查看对比场景无碍，
  双栏同时编辑同一文档时以"最后聚焦的栏"为准
- 无文件系统：Copy Path 复制的是应用内路径/分享链接；无回收站，Delete 直接走确认弹窗
- 网格视图（档案库）是 VS Code 没有的双浏览面：目录联动逻辑（currentFolderId ↔ 网格）保留原样
