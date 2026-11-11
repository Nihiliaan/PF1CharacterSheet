/**
 * 编辑器分栏布局（VS Code 式）：把 panes 渲染为横向排列的编辑栏。
 * 每栏 = 小标签条（本栏的文档标签，可拖拽到其它栏）+ 内容区。
 * - 聚焦栏（focused）：渲染 live 状态，可编辑；
 * - 未聚焦栏：通过影子作用域（ShadowScope）用各自快照数据渲染只读视图，
 *   点击分栏任意位置即聚焦（live 状态切换到该栏文档）。
 * chooser 标签渲染"新建标签页"大页面。
 */
import React, { useMemo, useRef } from 'react';
import { FileText, Braces } from 'lucide-react';
import {
  CharacterContext, useCharacter,
  type EditorPane, type TabSnapshot, type CharacterContextType,
} from '../../contexts/CharacterContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAttributeModifiers, calculateTotalCost, calculateTotalWeightNum, getComputedEncumbrance,
} from '../../utils/calculations';
import CharacterEditor from './CharacterEditor';
import BBCodeTemplateEditor from '../BBCodeTemplateEditor';
import NewTabPage from './NewTabPage';
import BBCodePreview from '../common/BBCodePreview';

/** 标签在分栏间拖拽所用的原生 dataTransfer 协议 */
const TAB_MIME = 'application/x-pf1-tab';

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

/** 单栏内容：按活动标签类型与聚焦状态选择渲染方式 */
function PaneContent({ pane, focused }: { pane: EditorPane; focused: boolean }) {
  const { tabs, getTabSnapshot, bbcodeTemplate } = useCharacter();
  const { user } = useAuth();
  const activeTab = tabs.find(t => t.key === pane.activeTabKey);

  if (!activeTab || activeTab.kind === 'chooser') {
    // 新建标签页：所有分栏都渲染完整页面；未聚焦栏的动作通过 chooserKey 作用于自身标签
    return <NewTabPage chooserKey={focused ? undefined : pane.activeTabKey ?? undefined} />;
  }

  // 预览窗格：实时渲染当前编辑中的模板内容（读 live 状态，无论聚焦与否）
  if (activeTab.kind === 'preview') {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50 p-4">
        <BBCodePreview bbcode={bbcodeTemplate} />
      </div>
    );
  }

  const snap = getTabSnapshot(pane.activeTabKey!);

  if (activeTab.kind === 'template') {
    // 模板：聚焦栏渲染完整编辑器；未聚焦栏渲染只读预览
    if (focused) return <BBCodeTemplateEditor />;
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-stone-50 p-4">
        {snap ? <BBCodePreview bbcode={snap.bbcodeTemplate} /> : (
          <div className="text-xs text-stone-400 italic">点击聚焦此栏以加载内容</div>
        )}
        <div className="mt-2 text-[10px] text-stone-400 text-center">只读预览 · 点击分栏任意位置聚焦后可编辑</div>
      </div>
    );
  }

  // 人物卡：聚焦栏渲染 live 编辑器；未聚焦栏用快照渲染只读编辑器
  if (focused) return <CharacterEditor user={user} />;
  if (!snap) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-stone-400 italic">
        点击聚焦此栏以加载内容
      </div>
    );
  }
  return (
    <ShadowScope snapshot={snap}>
      <CharacterEditor user={user} />
    </ShadowScope>
  );
}

/** 分栏布局主组件：把 panes 渲染为横向排列的编辑栏 */
export default function EditorPanes() {
  const { panes, focusedPaneId, focusPane } = useCharacter();

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {panes.map((pane, i) => {
        const focused = pane.id === focusedPaneId;
        return (
          <div
            key={pane.id}
            onPointerDown={() => { if (!focused) focusPane(pane.id); }}
            className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
              'bg-white'
            } ${i < panes.length - 1 ? 'border-r border-stone-300' : ''}`}
          >
            <PaneContent pane={pane} focused={focused} />
          </div>
        );
      })}
    </div>
  );
}
