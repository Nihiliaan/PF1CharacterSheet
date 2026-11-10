# PF1CharacterSheet 项目审查意见与优化方案

> 审查日期：2026-11-08
> 审查范围：全项目（约 22.6K 行 TS/TSX 源码，99 个文件）
> 审查方式：静态代码审查 + 构建产物分析 + `tsc --noEmit` 全量类型检查

---

## 修复进度（2026-11-11 更新）

**已修复**：
- 2.1.1 packs 已移出 git（105MB 仓库瘦身）
- 2.1.2 全部 12 个类型错误已修复，`tsc --noEmit` 通过
- 2.1.3 代码分割已落地（App.tsx 视图级 React.lazy + manualChunks）
- 2.1.4 CharacterContext 已 useMemo/useCallback，`computed` 已有类型
- 1.5 `schemaVersion` 版本链迁移已建立（v0→v1）
- 1.6 草稿冲突已加 `baseUpdatedAt` 检测弹窗（原文"无条件覆盖"的描述已过时）
- 1.7 联动规则注册表（LINKAGE_RULES）+ 路径失败告警已落地
- 2.2.1 / 2.2.2 vite.config 与依赖归类已清理
- 1.2(b) `.lnk` 只读判断及 1.2 列表查询：已改为 REST runQuery + fieldMask 投影
- 1.4 元数据搅拌已随模板独立存储部分缓解；saveCharacter 用 setDoc 一次写入

**原报告勘误**：
- 1.7(c) "dataUpdateService.addBag 是死代码"记载有误：它与 useCharacterActions.addBag 是调用关系（后者委托前者），并非重复实现

**本轮新增（2026-11-10/11）**：
- vitest + 122 个测试（dataMigration / calculations / bbcodeExporter / equipmentBatchParser）
- BBCode 模板独立到 Firestore `templates` 集合（templateService，旧模板"编辑即搬"迁移；需 `firebase deploy --only firestore:rules`）
- dataMigration 纯函数化（不再突变输入）
- 四个巨型文件拆分：handlers.ts（1337→5 域文件+转发层）、PFSSection（1074）、ForumSyncModal（967）、AppHeader（905）
- useCharacterPersistence 参数 24 → 1 个 options 对象（15 字段），保存流程拆 persist/afterSave

**仍未做**：
- 2.2.4 测试覆盖扩展（forumSyncHelper、statBlockFormatter 等）
- 1.3 `isPublic` 隐私模型的产品决策
- 2.3 小项（TrustedTypes、metadata 等）

---

## 总评

项目整体完成度不错，有几处值得肯定的设计：

- ✅ `firestore.rules` 质量很高：默认全拒绝（deny all）+ 字段级校验 + owner 校验，是很多商业项目都做不到的规范程度
- ✅ AI 密钥由用户自行提供（`useCharacterAI` 的 `userApiKey`），不存在密钥打包进前端产物的泄漏（已验证 dist 产物，`AIzaSy...` 字样为 Firebase 公开 Web 配置，属正常）
- ✅ `.gitignore` 覆盖到位（`log/`、`.temp/`、`dist/`、`.env*` 均已排除）
- ✅ schema 层有统一的字段类型系统（`schema/handlers.ts` 的 Handler 体系）和 Immer 不可变更新，思路正确

**核心结论：项目的结构风险不在"代码写得乱"，而在数据层从未被当成一个需要设计的层。** 存储模型（在 Firestore 上模拟文件系统）、数据契约（无版本号、双真相、元数据搅拌）、一致性策略（无冲突检测）都是随功能生长出来的。UI 层反而相对健康。

问题分为两大类：

1. **系统结构级硬伤**（第一部分）——决定项目能走多远
2. **工程与代码质量问题**（第二部分）——影响开发效率与交付质量

---

# 第一部分：系统结构级硬伤

## 1.1 存储架构：产品承诺与实现根本背离 🔴

**问题**：README 宣称"数据不存储在第三方服务器，直接保存在你自己的云端硬盘中（Google Drive 云同步）"，但实际主存储是 **Firestore**：

- `src/services/characterService.ts` 全部读写走 Firestore `characters` / `folders` 集合
- Google Drive 只在 `src/contexts/hooks/useDriveSync.ts` 中充当导入/备份渠道

这不只是文档偏差，而是架构身份问题——它决定了数据归属、成本模型和隐私边界。

**建议**（二选一，需产品决策）：
- 方案 A：修改 README 与产品表述，明确"数据托管于 Firebase/Firestore"
- 方案 B：Firestore 降级为纯 Auth + 轻量元数据索引，角色内容真正存 Drive（工作量大，但兑现承诺）

## 1.2 在 Firestore 上模拟文件系统 + 全量文档读写 🔴

三层问题叠加：

**(a) 用文档数据库模拟文件系统**
- 文件夹是 `parentId` 树（`src/services/characterService.ts:270` `moveFolder`）
- 文件名唯一性靠应用层 `checkUniqueName`（`src/services/characterService.ts:81`）两次查询 + while 循环重试（`:128`）——**存在竞态**，并发保存会产生同名文件，没有事务或唯一索引兜底
- 软链接用 `targetId` + `.lnk` 文件名后缀模拟

**(b) 用文件名后缀做语义判断**
- `src/contexts/hooks/useCharacterPersistence.ts:180`：`if (char.name?.endsWith('.lnk')) return true;` ——链接的只读性由**文件名**推断，用户一重命名就破坏语义。应改用 `targetId` 字段判断（`isLink: !!targetId` 已经在做了，这里应统一）。

**(c) 列表查询拉全量文档**
- `getCharacterList`（`src/services/characterService.ts:404`）把每个角色的**完整 data** 全部下载，但档案库列表只需要 name / updatedAt
- 每次保存后还要 `refreshCharacterList()` 再拉一遍全量（`src/contexts/hooks/useCharacterPersistence.ts:97`）
- 角色越多越卡；Firestore 按传输文档大小计费，这是成本和性能双重放血

**(d) Firestore 单文档 1MB 上限风险**
- 角色卡带多表格、法术列表、多段 Markdown 长文本，必然逼近上限
- `saveCharacter` 里硬编码的"嵌套数组消毒"补丁（`src/services/characterService.ts:136-165`，针对 `feats.type`、`attacks.melee.damageType` 的空数组特判）就是症状：**UI 层的字段编码（EncodedSelect）产生的数据形态与 Firestore 不兼容，只能在存储层打补丁**，且只覆盖了已发现的字段，新增 EncodedSelect 字段会再炸

**建议**：
1. 列表/详情分离：档案库列表改用 Firestore `select()` 投影查询（只取 name/updatedAt/folderId/isTemplate），或另建轻量 `characterIndex` 集合。改动小、收益立竿见影
2. 接受同名（用 id 寻址，文件名只是显示名）或 `checkUniqueName` 包 `runTransaction`——前者更符合 Firestore 模型，推荐
3. 从根上解决编码问题：EncodedSelect 的空数组应在 schema Handler 的 `update()` 输出层规范化，而不是存储层逐字段打补丁

## 1.3 `isPublic: true` 硬编码——所有角色默认全局可读 🔴

- `src/services/characterService.ts:176`：每次保存角色都写死 `isPublic: true`
- 配合 `firestore.rules` 的 `allow get: if isValidId(characterId);`——**任何人的任何角色，拿到 id 即可读，用户没有"私有"选项**
- 分享机制就是把 id 放进 URL（`?id=`），一旦链接外流（论坛贴、截图）即永久公开

**建议**（需产品决策）：
- 若"全公开共享"是有意的产品决策：UI 至少明示"此角色对所有持有链接的人可见"
- 若不是：`isPublic` 改为用户可选（默认私有），rules 改为 `allow get: if isPublic() || isOwner()`

另：`src/services/characterService.ts:134` 更新路径信任 `characterData.ownerId`（`id ? (characterData.ownerId || currentUid) : currentUid`）——服务层完全不设防，目前全靠 rules 兜底。建议服务层也不要信任客户端传入的 ownerId。

## 1.4 双真相：业务数据与文件元数据互相搅拌 🔴

**写入**时把元数据塞进业务树（`src/services/characterService.ts:169-174`）：

```ts
data: {
  ...sanitizedData,
  id: id || '',          // ← 文件元数据混进业务数据
  folderId: ...,
  ownerId: ...,
  targetId: ...
}
```

**读取**时再反向搅拌回来（`formatCharacterDoc`，`src/services/characterService.ts:466-474`）。后果：

- 同一元数据存在**两份真相**（doc 顶层 vs `data` 内层），`saveLink` / `copyCharacter` / `handleSaveAs` 各自手工重置字段，极易不同步
- `CharacterData` 领域模型被迫携带 `id / ownerId / folderId / targetId / isLink / isTemplate`——schema 被存储关注点污染
- 新建文档**两次写**（`addDoc` 后再 `updateDoc` 回写 `data.id`，`src/services/characterService.ts:190-196`），非原子，中途失败留下 `id: ''` 的脏数据

**建议**：
1. `CharacterData` 只留业务字段；id / ownerId / folderId / targetId / isTemplate 只存 doc 顶层，删除写入/读取两侧的搅拌逻辑
2. 新建文档用 `doc(collection(db, 'characters'))` 预生成 id 后 `setDoc`，一次写入，消除回写
3. 兼容读取：迁移期内 `data.id` 等字段读到了就忽略，写几次后旧字段自然消亡

## 1.5 迁移无版本号——启发式猜测旧数据 🟡

`src/utils/dataMigration.ts` 的 `migrate()` 靠**字段存在性**猜版本（如 `if (migrated.combatTable && !migrated.combatManeuver)`），没有 `schemaVersion` 字段，且每次加载角色都跑 `mergeWithDefault` 递归合并。这是数据产品的经典硬伤：

- 结构改版后无法区分"旧版本数据"与"用户故意清空的字段"
- 迁移规则只能无限叠加、不可测试（项目目前零测试）、不可逆
- 改错一个字段名，用户数据静默损坏

**建议**：
1. `CharacterData` 增加 `schemaVersion` 字段，新保存的文档写入当前版本
2. 迁移改为版本链：`v0 → v1 → v2`，按 `schemaVersion` 决定从哪级开始跑，跑完写入新版本号
3. 现有启发式逻辑保留为 `v0 → 当前` 的兜底，之后每次结构变更新增一个版本步骤

## 1.6 冲突处理：旧草稿静默覆盖新数据 🟡

`src/contexts/hooks/useCharacterPersistence.ts:206-218`：打开角色时如果 localStorage 有本地草稿（`pf1_char_draft_*`），**无条件覆盖**刚从服务器拉取的数据，无时间戳/版本对比。多设备场景（家里未保存的旧草稿 vs 俱乐部已保存的新版）= 旧数据静默吃掉新数据。

配套的一致性问题：
- `isDirty` 是手动 `setIsDirty` 的状态（`src/contexts/CharacterContext.tsx:137`），依赖各处记得正确设置/清除
- `lastSavedData` 用 `JSON.parse(JSON.stringify(...))` 全量深拷贝常驻内存做比较基准（`useCharacterPersistence.ts:69, 201`）
- 只读性由三重条件合成：`isReadOnly` + 文件名后缀推断 + `isSyncing || syncStatus === 'syncing' || isSyncingDrive`（`CharacterContext.tsx:257-259`）——一致性状态没有单一权威来源

**建议**：
1. 草稿写入时记录 `baseVersion`（保存时的文档 `updatedAt`）；打开时与服务器 `updatedAt` 对比，服务器更新则弹窗让用户选"用我的草稿 / 用服务器版本"，而非静默覆盖
2. `isDirty` 改为派生值：`data !== lastSavedData`（引用比较即可，配合不可变更新已经成立），删掉手动 setIsDirty

## 1.7 业务逻辑分布：一套自研表单 ORM，三处特化 🟡

更新管线：`update(path, value)` 字符串路径 → 全局 handler 注册表类型转换 → Immer 写树（`src/logic/dataUpdateService.ts`）。思路正确，但有四个结构问题：

**(a) 路径拼错静默失败**：`dataUpdateService.ts:44` 路径不存在直接 `return`，无任何警告。打错一个字段名，输入框看起来正常但数据没存上，极难排查。

**(b) 联动规则埋在 if 链里**：种族联动（改种族自动更新 type/subtype）硬编码在 `updateByPath` 内部（`dataUpdateService.ts:57-63`）。联动规则会越积越多，这里会变成垃圾场。

**(c) 同一业务两处实现**：`dataUpdateService.addBag`（Immer 版）与 `useCharacterActions.addBag`（手工展开版，`src/contexts/hooks/useCharacterActions.ts:24-45`）并存，CharacterContext 实际用的是后者——前者是死代码，改一处忘另一处的隐患。

**(d) 持久化 hook 的参数爆炸**：`useCharacterPersistence` 接收 **22 个参数**（`useCharacterPersistence.ts:21-44`）。保存一条路径横跨 6 个子系统：存储、URL、localStorage、最近列表、档案库刷新、论坛同步（`triggerForumSync`，`useCharacterPersistence.ts:89`）。这是所有状态互相纠缠的度量衡——说明状态所有权完全失守。

**建议**：
1. `updateByPath` 路径解析失败时 `console.error(path)` + 开发环境 toast
2. 联动规则改为注册表：`LINKAGE_RULES: { 'basic.race': (draft, value) => {...} }`，`updateByPath` 遍历执行
3. 删除 `dataUpdateService` 中的死代码 addBag/removeBag（或反过来让 hook 调用它，二选一）
4. 重构方向（长期）：`useCharacterPersistence` 改为内部消费各 Context（`useUI()`、`useVault()` 等），而非参数透传；保存流程拆为 `persist → afterSavePipeline` 两段

---

# 第二部分：工程与代码质量问题

## 2.1 高优先级

### 2.1.1 105MB 数据库死重量（`src/database/packs/`）

- 48 个 JSONL 文件共 105MB（最大 `pf-companions.jsonl` 15MB），**全项目代码零引用**（无 import、无 fetch，也不在 dist 产物中），42 个被 git 追踪
- 后果：clone 慢、仓库膨胀、IDE 索引慢，无任何功能价值
- README 宣传的"深度数据库集成（职业、专长、法术、物品）"实际未接入

**建议**：
- 近期不接入：`git rm -r --cached src/database/packs` 并加入 `.gitignore`（如需保留历史体积，酌情 `git filter-repo`）
- 要接入：移到 `public/packs/` 或 CDN，运行时按需 `fetch` 单个 pack + 建索引，**绝不静态 import**

### 2.1.2 `tsc --noEmit` 失败（12 个错误），`lint` 形同虚设

`npx tsc --noEmit` 退出码 2。其中两个疑似**真实运行时 bug**：

- `src/contexts/hooks/useCharacterPersistence.ts:97, 143`：`Property 'catch' does not exist on type 'void'`——函数签名返回 void 却链式调 `.catch()`，若真返回 undefined 会直接 TypeError
- 类型不兼容：`src/contexts/CharacterContext.tsx:315`、`useCharacterPersistence.ts:89`——自定义 `t` 签名 `(key: string, defaultValue?: string) => string` 与 i18next v24 的 `TFunction` 冲突，建议统一用 `TFunction` 类型
- `src/components/SvgTemplateEditor.tsx:77, 654`：把 React `key` 当普通 prop 传给子组件（子组件 props 类型里没有 `key`）

**建议**：修复全部 12 个错误；把 `tsc --noEmit` 加入 pre-commit hook 或 CI，防止回归。

### 2.1.3 单一 3.7MB chunk，零代码分割

- `dist/assets/index-*.js` 单文件 3.7MB：App.tsx 静态导入全部视图（CharacterEditor、SvgTemplateEditor、VaultContent、GMStatBlockView、SettingsCenter…），全项目 **0 处 `React.lazy`**
- CodeMirror（6 个包）、`@google/genai`、`motion`、`handlebars`、firebase 全在首屏

**建议**：
1. 视图级 `React.lazy` + `Suspense`（模板编辑器、GM 视图、设置中心、Vault 都是典型候选）
2. `build.rollupOptions.output.manualChunks` 拆 vendor（firebase / codemirror / genai 各一块）
3. 首屏预期可从 3.7MB 降到 1MB 以内

### 2.1.4 CharacterContext"上帝 Context"，value 未 memo

- `src/contexts/CharacterContext.tsx:340` 的 `value` 对象（50+ 字段：数据、UI 状态、AI、Drive 同步、拖拽 handlers）**每次渲染重建**，未 `useMemo`
- 后果：输入任意一个字符 `setData` → 所有消费者（整棵编辑器树）重渲染
- `computed: any`（`CharacterContext.tsx:23`）——计算层无类型

**建议**（按侵入度递增）：
1. 最小改动：`useMemo` 包 value；handlers 全部 `useCallback`；编辑器行组件加 `React.memo`
2. 根治：拆为 State / Actions / AI / Sync 四个 context（actions 引用稳定，不随输入变化），或迁移 zustand
3. 给 `computed` 定义接口类型

## 2.2 中优先级

### 2.2.1 `vite.config.ts` 两处问题

- `vite.config.ts:96`：`define: {'process.env.GEMINI_API_KEY': ...}` 是**死配置**（src 无引用），但留着会诱导未来某处一引用就把真实密钥打进公开 bundle。建议删除（已验证当前 dist 无泄漏）
- `vite.config.ts:33`：dev-sync-channel 的 `id` 未消毒直接拼路径（`src/templates/svg/${id}.svgt`），`id=../../..` 可路径穿越写任意文件；且 dev server 绑 `0.0.0.0`（`package.json` 的 `--host=0.0.0.0`），局域网内任何设备可 POST。建议 `path.basename(id)` 白名单化

### 2.2.2 依赖归类混乱（`package.json`）

- `vite` 同时出现在 dependencies 和 devDependencies
- `@vitejs/plugin-react`、`@tailwindcss/vite`、`tailwindcss` 应移 devDependencies
- `express`、`dotenv`、`@types/express`、`csv-parse`、`tsx` 在 src 中零引用（仅 `.temp/` 一次性脚本用过）→ 删除或移 devDependencies

### 2.2.3 ESLint 双配置并存且无实效 lint

- `.eslintrc.cjs`（旧格式）与 `eslint.config.mjs`（flat）并存，两者都只配置了 firestore.rules 的安全规则插件，JS/TS 代码完全没有 lint
- `lint` script 实际是 `tsc --noEmit`（且当前是失败的）

**建议**：删除旧配置；flat config 加 `@typescript-eslint` + `eslint-plugin-react-hooks`（本项目重 hooks，尤其值）+ `eslint-plugin-react-refresh`；`lint` script 改为 `eslint . && tsc --noEmit`

### 2.2.4 零测试

22.6K 行代码无任何测试。最值得优先覆盖的纯函数模块（按数据安全排序）：

1. `src/utils/dataMigration.ts` —— 迁移错一个字段就毁用户数据，必须先有
2. `src/utils/calculations.ts` —— 负重/资产计算是产品核心承诺
3. `src/utils/bbcodeExporter.ts` —— 论坛排版是核心卖点
4. `src/utils/equipmentBatchParser.ts` —— 批量导入解析

**建议**：引入 vitest（与 Vite 零配置集成），先给 `dataMigration` 补"旧版数据 → 期望输出"的快照用例。

## 2.3 低优先级

| 问题 | 位置 | 建议 |
|---|---|---|
| 超大文件 | `src/schema/handlers.ts`（1337 行）、`src/components/editor/sections/PFSSection.tsx`（1074）、`src/components/editor/ForumSyncModal.tsx`（967）、`src/components/layout/AppHeader.tsx`（905） | 按域拆分，不紧急 |
| TrustedTypes 全放行 | `src/main.tsx:10-20` default policy 直接放行所有 HTML/Script，削弱保护 | 改具名 policy 或至少注释风险 |
| README 过时 | 技术栈写 "Vanilla CSS"（实际 Tailwind 4）；宣传未接入的数据库功能 | 同步文档（结合 1.1 / 2.1.1 的决策） |
| `package.json` name | 还是 `react-example` | 改名 |
| `index.html` | `lang="en"` 但内容中文 | 改 `lang="zh-CN"` |

---

# 第三部分：修复路线图

## 按投入产出排序

| 序 | 措施 | 对应章节 | 量级 | 收益 |
|---|---|---|---|---|
| 1 | 修 12 个类型错误 + tsc 进 pre-commit | 2.1.2 | 半天 | 消除 2 个疑似运行时 bug，恢复质量门槛 |
| 2 | git 移除 105MB packs | 2.1.2 | 10 分钟 | 仓库立即瘦身 105MB |
| 3 | 列表查询改投影/索引集合 | 1.2(c) | 小 | 档案库性能与 Firestore 成本立降 |
| 4 | React.lazy + manualChunks | 2.1.3 | 小 | 首屏体积降约 70% |
| 5 | 草稿加 baseVersion 冲突检测 | 1.6 | 小 | 排掉"旧数据吃新数据"的雷 |
| 6 | 元数据出仓 + setDoc 一次写入 | 1.4 | 中 | 还清双真相债，消除两次写 |
| 7 | schemaVersion 版本链迁移 | 1.5 | 中 | 数据演进有了安全网 |
| 8 | CharacterContext memo / 拆分 | 2.1.4 | 中 | 输入流畅度显著改善 |
| 9 | isPublic 产品决策 + rules 调整 | 1.3 | 小（决策） | 隐私合规 |
| 10 | 清理依赖 + vite.config + ESLint 整顿 | 2.2 | 半天 | 工程卫生 |
| 11 | vitest 覆盖 dataMigration / calculations / bbcodeExporter | 2.2.4 | 渐进 | 长期质量保障 |
| 12 | updateByPath 静默失败告警 + 联动注册表 + 删死代码 | 1.7 | 小 | 可维护性 |

## 一句话总结

> UI 层健康，数据层欠账。第 1、3、5 项做完，最危险的三颗雷（运行时 bug、全量拉取、草稿覆盖）就排掉了；第 6、7 项做完，这个项目才真正具备"数据产品"的骨架。

---

## 附：验证命令

```bash
# 类型检查（当前失败，12 个错误）
npx tsc --noEmit

# 查看产物体积
ls -la dist/assets

# 确认 packs 无引用（应无输出）
grep -rn "packs/" src --include="*.ts" --include="*.tsx"

# 确认 git 追踪的 packs
git ls-files src/database/packs
```
