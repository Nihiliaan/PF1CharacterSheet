/**
 * 编辑器分栏布局（VS Code 式）：横向排列的编辑栏，每栏是一个完整单元：
 *  - 栏顶小标签条：本栏的文档标签（dnd-kit 可跨栏拖拽排序、右键文件操作）
 *    + 右侧 [+] 新建 / [▦] 向右分栏 / [👁] 预览分栏（仅聚焦栏显示后两者）
 *  - 路径行：本栏活动文档的路径（含脏标记 / 只读标记）
 *  - 内容区：聚焦栏渲染 live 状态（可编辑）；未聚焦栏经影子作用域渲染只读视图，
 *    点击分栏任意位置即聚焦（live 状态切换到该栏文档）
 * chooser 标签渲染"新建标签页"大页面；preview 标签经 PreviewPane 渲染（人物卡 + 模板
 * 两个来源下拉，仅列打开的标签与最近文件；点击预览窗格时自动同步刚失去焦点的文档）。
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, useDroppable,
  type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Columns2, Eye, FileText, Braces, X, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CharacterContext, useCharacter,
  type EditorPane, type TabSnapshot, type CharacterContextType,
} from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance,
} from '../../utils/calculations';
import CharacterEditor from './CharacterEditor';
import BBCodeTemplateEditor from '../BBCodeTemplateEditor';
import NewTabPage from './NewTabPage';
import PreviewPane from './PreviewPane';
import ContextMenu from '../common/ContextMenu';
import { buildTabMenuItems } from './tabMenuItems';

interface TabContextMenu {
  x: number;
  y: number;
  tabKey: string;
}

// ===== 分栏宽度模型（自底向上） =====
// 叶子声明最小宽（InlineInput/MultilineInput 的 minWidth、表格列 min-w）→
// min-content 沿布局树自然上传（水平求和、垂直取最大）→ 栏根 min-width:min-content 作下限 →
// 外层按 flexGrow 权重比例分配（拖拽分隔条改权重、持久化）；
// 总宽 < Σ(栏最小宽) 时 zoom = W/Σmin 整体缩放兜底（重置测量法，见 recomputeZoom）。
const PANE_WEIGHTS_KEY = 'pf1_pane_weights';
/** 整体缩放下限：更窄时宁可让溢出表格回退横向滚动，也不无限缩小文字 */
const MIN_ZOOM = 0.5;

/** 可拖拽分隔条：1px 视觉线 + 左右各 6px 命中热区 */
function PaneDivider({ index, onDragStart }: { index: number; onDragStart: (index: number, e: React.MouseEvent) => void }) {
  return (
    <div className="w-px shrink-0 bg-stone-300 relative z-10">
      <div
        onMouseDown={e => onDragStart(index, e)}
        title="拖拽调整分栏宽度"
        className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/50 transition-colors"
      />
    </div>
  );
}

/** 分配求解：请求宽度 + 各栏最小宽地板 → zoom 与实际宽度。
 *  1) 总宽装不下全部最小宽时整体缩放（z ≤ W/Σmin），并保证每栏请求 ≥ 其虚拟最小宽（拖拽联动）；
 *  2) 触底的栏钳制在地板，亏空在未触底的栏间按请求比例回摊（Σactual = 可分配宽，守恒）。 */
function solveAllocation(req: number[], mins: number[], rowClientW: number): { z: number; actual: number[] } {
  const n = req.length;
  const usable = Math.max(rowClientW - (n - 1), 1); // 减 (n-1) 个 1px 分隔条
  const sumMin = mins.reduce((s, m) => s + m, 0);
  let z = 1;
  if (sumMin + (n - 1) > rowClientW) {
    z = usable / Math.max(sumMin, 1);
    for (let i = 0; i < n; i++) if (mins[i] > 1) z = Math.min(z, req[i] / mins[i]);
    z = Math.max(MIN_ZOOM, Math.min(z, 1));
  }
  const floors = mins.map(m => m * z);
  const actual = req.slice();
  let pinnedSum = 0;
  let freeReqSum = 0;
  const pinned: boolean[] = req.map((r, i) => {
    const hit = r < floors[i];
    if (hit) { actual[i] = floors[i]; pinnedSum += floors[i]; } else { freeReqSum += r; }
    return hit;
  });
  const rem = Math.max(usable - pinnedSum, 0);
  const freeIdx: number[] = [];
  pinned.forEach((p, i) => { if (!p) freeIdx.push(i); });
  if (freeIdx.length > 0) {
    if (freeReqSum > 0) {
      freeIdx.forEach(i => { actual[i] = req[i] * (rem / freeReqSum); });
    } else {
      freeIdx.forEach(i => { actual[i] = rem / freeIdx.length; });
    }
  } else if (pinnedSum > 0) {
    // 全部触底：剩余空间按地板比例摊回
    const sf = floors.reduce((s, f) => s + f, 0) || 1;
    for (let i = 0; i < n; i++) actual[i] = floors[i] + rem * (floors[i] / sf);
  }
  return { z, actual };
}

/** 只读影子作用域：用快照数据覆写 CharacterContext，供未聚焦分栏渲染文档只读视图 */
function ShadowScope({ snapshot, children }: { snapshot: TabSnapshot; children: React.ReactNode }) {
  const ctx = useCharacter();
  // 用 ref 取最新 ctx，memo 仅依赖 snapshot：聚焦栏的每次击键不会引发影子分栏重渲染
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const shadowValue = useMemo<CharacterContextType>(() => {
    const base = ctxRef.current;
    return {
      ...base,
      data: snapshot.data,
      lastSavedData: snapshot.lastSavedData,
      bbcodeTemplate: snapshot.bbcodeTemplate,
      isReadOnly: true,
      computed: {
        modifiers: getAttributeModifiers(snapshot.data),
        totalCost: calculateTotalCost(snapshot.data),
        totalWeight: calculateTotalWeightNum(snapshot.data),
        encumbrance: getComputedEncumbrance(snapshot.data),
      },
      // 变更类 API 全部置空，防止影子分栏写入
      setData: (() => {}) as CharacterContextType['setData'],
      setBbcodeTemplate: () => {},
      update: () => {},
      handleSave: async () => undefined,
      handleSaveAs: async () => undefined,
      handleRevertChanges: () => {},
      saveCharacter: async () => undefined,
    };
  }, [snapshot]);
  return <CharacterContext.Provider value={shadowValue}>{children}</CharacterContext.Provider>;
}

/** 可排序的单个标签芯片（dnd-kit 指针拖拽，点击仍触发切换） */
function SortableTabChip({ tabKey, paneId, focused, active, title, dirty, onClose, onSwitch, onMenu }: {
  tabKey: string;
  paneId: string;
  focused: boolean;
  active: boolean;
  title: string;
  dirty: boolean;
  onClose: () => void;
  onSwitch: () => void;
  onMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tabKey, data: { paneId } });
  const Icon = tabKey.startsWith('preview-') ? Eye : (tabKey.startsWith('chooser-') ? FileText : FileText);

  return (
    <div
      ref={setNodeRef}
      data-tab-chip={tabKey}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onSwitch}
      onMouseDown={e => { if (e.button === 1) { e.preventDefault(); onClose(); } }}
      onContextMenu={onMenu}
      title={title}
      className={`group flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-xs whitespace-nowrap transition-colors border-r border-stone-200/70 touch-none ${
        isDragging ? 'opacity-40' : ''
      } ${
        active
          ? 'bg-white text-stone-800 font-bold'
          : 'bg-transparent text-stone-500 hover:bg-stone-300/50 hover:text-stone-700'
      }`}
    >
      <Icon size={12} className={active ? 'text-primary' : 'text-stone-400'} />
      <span className="max-w-[130px] truncate">{title}</span>
      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="有未保存的修改" />}
      <span
        onClick={e => { e.stopPropagation(); onClose(); }}
        onPointerDown={e => e.stopPropagation()}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-stone-300 text-stone-500"
        title="关闭标签页"
      >
        <X size={11} />
      </span>
    </div>
  );
}

/** 单栏组件：标签条 + 路径行 + 内容区。
 *  栏根 min-width:min-content——内容最小宽（由叶子层沿布局树上传播导）作为分配的硬下限（CSS 兜底）；
 *  实际宽度由 EditorPanes 的 JS 分配器按"请求比例 → 地板钳制"显式写入（style.width，React 不接管）。 */
function EditorPaneView({ pane, paneIndex, focused }: {
  pane: EditorPane;
  paneIndex: number;
  focused: boolean;
}) {
  const { t } = useTranslation();
  const {
    tabs, activeTabKey, activeTabTitle, switchTab, closeTab, moveTabToPane, isDirty, isTemplateDirty, isReadOnly,
    data, getItemPath,
    openChooserTab, addPane, openPreviewTab, focusPane, getTabSnapshot, panes,
  } = useCharacter();
  // 完整上下文：供标签右键菜单构建器使用（菜单操作以"先激活再执行"作用于被右键标签）
  const characterCtx = useCharacter();
  const { gmCompactMode, setGmCompactMode, setForumSyncOpen, setBbcodeHelpOpen, setToast } = useUI();
  const { user } = useAuth();
  const [ctxMenu, setCtxMenu] = useState<TabContextMenu | null>(null);
  const liveDirty = isDirty || isTemplateDirty;

  const activeTab = tabs.find(tt => tt.key === pane.activeTabKey);

  // 本栏路径行文本（聚焦栏用 live 状态；未聚焦栏用快照/标签标题）
  const pathText = useMemo(() => {
    if (!activeTab) return '空分栏';
    if (activeTab.kind === 'chooser') return '新建标签页';
    if (activeTab.kind === 'preview') return '预览（实时渲染当前编辑中的模板）';
    const ro = focused ? isReadOnly : (getTabSnapshot(activeTab.key)?.isReadOnly ?? true);
    const dirty = focused ? liveDirty : activeTab.dirty;
    let p = '';
    if (activeTab.docId) p = getItemPath(activeTab.docId) || '';
    if (!p) p = focused ? (data.basic?.name?.trim() || activeTab.title) : activeTab.title;
    return p + (dirty ? '*' : '') + (ro ? ` (${t('common.read_only')})` : '');
  }, [activeTab, focused, isReadOnly, liveDirty, getItemPath, data.basic?.name, t, getTabSnapshot]);

  // ===== 标签右键菜单（统一构建器：菜单只由标签本身决定，与聚焦/激活无关）=====
  const menuItemsFor = (tabKey: string) => {
    const tab = tabs.find(tt => tt.key === tabKey);
    if (!tab) return [];
    return buildTabMenuItems({
      tab,
      ctx: characterCtx,
      ui: { setForumSyncOpen, gmCompactMode, setGmCompactMode, setBbcodeHelpOpen, setToast, t },
      liveDirty,
    });
  };

  const stripBtn = 'p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-800 transition-colors';
  const { setNodeRef: setStripDropRef, isOver: isStripOver } = useDroppable({ id: pane.id, data: { paneId: pane.id } });

  return (
    <div
      data-pane-index={paneIndex}
      onPointerDown={e => {
        // 聚焦分栏；但按下标签芯片时不打断后续的拖拽手势
        if (!focused && !(e.target as HTMLElement).closest('[data-tab-chip]')) focusPane(pane.id);
      }}
      className={`min-w-min flex flex-col overflow-hidden ${
        focused ? 'bg-white' : 'bg-stone-100/70'
      }`}
    >
      {/* 栏顶小标签条：标签区横向滚动，动作按钮钉在右侧边缘（对齐 VS Code editor actions） */}
      <div
        ref={setStripDropRef}
        onContextMenu={e => { e.preventDefault(); }}
        className={`shrink-0 flex items-stretch gap-0.5 px-1 ${
          focused ? 'bg-stone-50 border-b border-stone-200' : 'bg-stone-200/60 border-b border-stone-300'
        } ${isStripOver ? 'bg-primary/10' : ''}`}
      >
        {/* contain:inline-size：标签芯片横向滚动区不参与 min-content 传播，避免多标签撑高分栏最小宽 */}
        <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-x-auto custom-scrollbar [contain:inline-size]">
          <SortableContext items={pane.tabKeys} strategy={horizontalListSortingStrategy}>
            {pane.tabKeys.map(key => {
              const tab = tabs.find(tt => tt.key === key);
              if (!tab) return null;
              const active = focused && pane.activeTabKey === key;
              const dirty = active ? liveDirty : tab.dirty;
              const fallbackTitle = tab.kind === 'character' ? '人物卡' : tab.kind === 'preview' ? '预览' : '未命名模板';
              const title = active ? activeTabTitle : ((typeof tab.title === 'string' && tab.title.trim() && tab.title.trim() !== '{}' && tab.title.trim() !== '[object Object]') ? tab.title : fallbackTitle);
              return (
                <SortableTabChip
                  key={tab.key}
                  tabKey={tab.key}
                  paneId={pane.id}
                  focused={focused}
                  active={active}
                  title={title}
                  dirty={dirty}
                  onClose={() => closeTab(tab.key)}
                  onSwitch={() => switchTab(tab.key)}
                  onMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCtxMenu({ x: e.clientX, y: e.clientY, tabKey: tab.key });
                  }}
                />
              );
            })}
          </SortableContext>
        </div>

        {/* 栏内操作（钉右侧）：新建（本栏）；分栏/预览仅在聚焦栏显示一次 */}
        <div className="flex items-center gap-0.5 pl-1 pr-0.5 shrink-0 self-stretch">
          <button
            onClick={() => openChooserTab(pane.id)}
            title="新建标签页（本栏）"
            className="px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-300/50 hover:text-stone-700 transition-colors select-none h-full flex items-center"
          >
            <Plus size={12} />
          </button>
          {focused && (
            <>
              <button
                onClick={addPane}
                disabled={panes.length >= 4}
                title={panes.length >= 4 ? '最多支持 4 个分栏' : '向右拆分新分栏'}
                className={`${stripBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Columns2 size={13} />
              </button>
              <button
                onClick={() => openPreviewTab(true)}
                disabled={panes.length >= 4}
                title={panes.length >= 4 ? '最多支持 4 个分栏' : '在新分栏中打开预览窗格'}
                className={`${stripBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Eye size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 路径行（contain:inline-size：truncate 文本不参与 min-content 传播） */}
      <div className={`shrink-0 flex items-center gap-1 px-3 py-1 text-[11px] border-b [contain:inline-size] ${
        focused ? 'bg-stone-50 text-stone-500 border-stone-200' : 'bg-stone-200/40 text-stone-400 border-stone-300'
      }`}>
        {focused ? <ChevronRight size={11} className="text-stone-400" /> : <ChevronDown size={11} className="text-stone-400" />}
        <span className="truncate">{pathText}</span>
      </div>

      {/* 内容区：整体缩放（--pane-zoom，由 EditorPanes 重置测量法写入）作用于该层，
          标签条/路径行等 UI 外壳保持原始比例 */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ zoom: 'var(--pane-zoom, 1)' } as React.CSSProperties}>
        {!activeTab || activeTab.kind === 'chooser' ? (
          <NewTabPage chooserKey={pane.activeTabKey ?? undefined} />
        ) : activeTab.kind === 'preview' ? (
          // 预览窗格：可选择预览来源（人物卡 + 模板两个下拉）；focused 用于"点击同步来源"
          <PreviewPane tabKey={pane.activeTabKey!} focused={focused} />
        ) : activeTab.kind === 'template' ? (
          focused ? <BBCodeTemplateEditor /> : (
            (() => {
              const snap = getTabSnapshot(pane.activeTabKey ?? null);
              if (!snap) {
                return (
                  <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                    点击聚焦此栏以加载内容
                  </div>
                );
              }
              // 未聚焦栏保持编辑器形态（只读文本域），不切换为渲染预览
              return (
                <ShadowScope snapshot={snap}>
                  <BBCodeTemplateEditor />
                </ShadowScope>
              );
            })()
          )
        ) : focused ? (
          <CharacterEditor user={user} />
        ) : (
          (() => {
            const snap = getTabSnapshot(pane.activeTabKey ?? null);
            if (!snap) {
              return (
                <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                  点击聚焦此栏以加载内容
                </div>
              );
            }
            return (
              <ShadowScope snapshot={snap}>
                <CharacterEditor user={user} />
              </ShadowScope>
            );
          })()
        )}
      </div>

      {/* 标签右键菜单 */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={menuItemsFor(ctxMenu.tabKey)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

/** 分栏布局主组件 */
export default function EditorPanes() {
  const { panes, tabs, focusedPaneId, setFocusedPaneId, focusPane, moveTabToPane, switchTab, activeTabKey } = useCharacter();
  // 指针传感器：位移 5px 才启动拖拽（避免与点击切换冲突）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggingTabKey, setDraggingTabKey] = useState<string | null>(null);

  // ===== 分栏比例权重：默认全 1（均分），拖拽分隔条改相邻两栏，持久化到 localStorage =====
  const [weights, setWeights] = useState<number[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PANE_WEIGHTS_KEY) || '[]');
      if (Array.isArray(stored) && stored.length > 0 && stored.every(n => typeof n === 'number' && n > 0)) return stored;
    } catch { /* 忽略损坏数据 */ }
    return [];
  });
  const weightsRef = useRef(weights);
  weightsRef.current = weights;
  const rowRef = useRef<HTMLDivElement>(null);

  // ===== JS 分配器（模型的直译）=====
  // 请求比例（持久化权重）→ 最小宽地板钳制 → 亏空在未触底的栏间按请求比例回摊 → 显式 px 宽度。
  // 各栏最小宽由叶子层（输入框 minWidth / 表格列 min-w）经 min-content 沿布局树上传播导，此处实测缓存；
  // 总宽不足时整体 zoom 兜底：z = min(W/Σmin, min_i(请求_i/最小宽_i))——后者即"拖拽↔缩放联动"：
  // 把某栏拖到超出其最小宽的分配比例时，整体再缩一档腾出空间；W ≥ Σmin 时 z = 1（地板直接吸收冲突）。
  const minsRef = useRef<number[]>([]);

  /** 重算布局：实测各栏虚拟最小宽（zoom 置 1 + width:min-content）→ 由持久化权重求请求分配 →
   *  solveAllocation 解出 zoom 与实际宽度并命令式写入（React 不接管 style.width）。 */
  const layoutPanes = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const paneEls = Array.from(row.querySelectorAll<HTMLElement>('[data-pane-index]'));
    if (!paneEls.length) return;
    const n = paneEls.length;
    row.style.setProperty('--pane-zoom', '1');
    const prevWidths = paneEls.map(el => el.style.width);
    paneEls.forEach(el => { el.style.width = 'min-content'; });
    const mins = paneEls.map(el => el.getBoundingClientRect().width);
    minsRef.current = mins;
    paneEls.forEach((el, i) => { el.style.width = prevWidths[i]; });
    // 请求分配 = 持久化权重的归一比例（缺省权重取现有均值，新栏公平入场）
    const ws = weightsRef.current;
    const defined = ws.filter(v => typeof v === 'number' && v > 0);
    const avg = defined.length ? defined.reduce((s, v) => s + v, 0) / defined.length : 1;
    const raw = paneEls.map((_, i) => (typeof ws[i] === 'number' && ws[i] > 0 ? ws[i] : avg));
    const rawSum = raw.reduce((s, v) => s + v, 0) || 1;
    const req = raw.map(v => (v / rawSum) * row.clientWidth);
    const { z, actual } = solveAllocation(req, mins, row.clientWidth);
    row.style.setProperty('--pane-zoom', String(z));
    paneEls.forEach((el, i) => { el.style.width = `${actual[i]}px`; });
  }, []);

  const layoutRafRef = useRef(0);
  const scheduleLayout = useCallback(() => {
    cancelAnimationFrame(layoutRafRef.current);
    layoutRafRef.current = requestAnimationFrame(layoutPanes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 触发①：容器尺寸变化（拖窗口 / 侧栏拖宽）
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(scheduleLayout);
    ro.observe(row);
    return () => ro.disconnect();
  }, [scheduleLayout]);

  // 触发②：结构变化（栏数 / 活动标签类型——不同内容形态的最小宽不同）；useLayoutEffect 同步分配避免首帧闪动
  const structureKey = panes
    .map(p => {
      const active = tabs.find(tt => tt.key === p.activeTabKey);
      return `${p.id}:${p.tabKeys.length}:${active?.kind ?? 'empty'}`;
    })
    .join('|');
  useLayoutEffect(() => {
    layoutPanes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  // 触发③：内容最小宽变化（区块折叠/展开、GM 模式切换 → pf1:min-change）
  useEffect(() => {
    window.addEventListener('pf1:min-change', scheduleLayout);
    return () => window.removeEventListener('pf1:min-change', scheduleLayout);
  }, [scheduleLayout]);

  // ===== 分隔条拖拽：请求宽度在相邻两栏间此消彼长，经分配器求解（含缩放联动）；
  // 拖拽路径命令式写 DOM（不走 setState，避免 60Hz 重渲染重表格）=====
  const dragStateRef = useRef<{ index: number; startX: number; startWidths: number[]; paneEls: HTMLElement[]; row: HTMLElement } | null>(null);

  const startResize = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const row = rowRef.current;
    if (!row) return;
    const paneEls = Array.from(row.querySelectorAll<HTMLElement>('[data-pane-index]'));
    if (!paneEls[index] || !paneEls[index + 1]) return;
    dragStateRef.current = {
      index,
      startX: e.clientX,
      startWidths: paneEls.map(el => el.getBoundingClientRect().width),
      paneEls,
      row,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const st = dragStateRef.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      const req = st.startWidths.map((w, i) => (i === st.index ? w + dx : i === st.index + 1 ? w - dx : w));
      const { z, actual } = solveAllocation(req, minsRef.current, st.row.clientWidth);
      st.row.style.setProperty('--pane-zoom', String(z));
      st.paneEls.forEach((el, i) => { el.style.width = `${actual[i]}px`; });
    };
    const onUp = () => {
      const st = dragStateRef.current;
      if (!st) return;
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // 松手按实际布局宽度提交权重（含地板钳制结果）并持久化
      const next = st.paneEls.map(el => Math.max(el.getBoundingClientRect().width, 1));
      setWeights(next);
      try { localStorage.setItem(PANE_WEIGHTS_KEY, JSON.stringify(next)); } catch { /* 忽略写入失败 */ }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const onDragStart = (e: DragStartEvent) => {
    setDraggingTabKey(String(e.active.id));
  };

  // 拖拽悬停时实时移动标签到目标分栏/位置（VS Code 同款体验）
  const onDragOver = (e: DragOverEvent) => {
    const activeId = draggingTabKey;
    if (!activeId || !e.over) return;
    const overId = String(e.over.id);
    if (overId === activeId) return;
    const sourcePane = panes.find(p => p.tabKeys.includes(activeId));
    if (!sourcePane) return;
    // 目标分栏：over 是芯片 → 其所在栏；over 是分栏 droppable → 该栏
    const overPane = panes.find(p => p.tabKeys.includes(overId)) || panes.find(p => p.id === overId);
    if (!overPane) return;
    const index = overPane.tabKeys.includes(overId) ? overPane.tabKeys.indexOf(overId) : undefined;
    moveTabToPane(activeId, overPane.id, index);
    // 移动的是全局活动标签：聚焦跟随到目标栏
    if (activeId === activeTabKey) setFocusedPaneId(overPane.id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingTabKey(null);
    // 拖拽结束后聚焦被拖拽的标签（其所在分栏与视图由 switchTab 处理）
    const tabKey = String(e.active.id);
    void switchTab(tabKey);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingTabKey(null)}
    >
      <div ref={rowRef} className="flex-1 flex min-w-0 overflow-hidden">
        {panes.map((pane, i) => (
          <React.Fragment key={pane.id}>
            {i > 0 && <PaneDivider index={i - 1} onDragStart={startResize} />}
            <EditorPaneView
              pane={pane}
              paneIndex={i}
              focused={pane.id === focusedPaneId}
            />
          </React.Fragment>
        ))}
      </div>
    </DndContext>
  );
}
