/**
 * 标签右键菜单构建器（VS Code 式）：菜单内容只由标签本身决定，
 * 与聚焦/激活状态无关；需要文档处于 live 状态的操作会先激活标签再执行。
 * 标签条（EditorPanes）与「打开的编辑器」（ExplorerSidebar）共用同一份菜单。
 */
import { Columns2, ClipboardCopy, Undo2, Trash2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EditorTab, CharacterContextType } from '../../contexts/CharacterContext';
import { DEFAULT_BBCODE_TEMPLATE } from '../../constants';

export interface TabMenuItem {
  label: string;
  icon?: LucideIcon;
  /** 右侧灰色的快捷键提示（仅展示，真实键位以全局快捷键为准） */
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}

export interface TabMenuUi {
  setForumSyncOpen: (v: boolean) => void;
  gmCompactMode: boolean;
  setGmCompactMode: (v: boolean) => void;
  setBbcodeHelpOpen: (v: boolean) => void;
  setToast: (t: { message: string; type?: string }) => void;
  t: (key: string) => string;
}

export function buildTabMenuItems(args: {
  tab: EditorTab;
  ctx: CharacterContextType;
  ui: TabMenuUi;
  /** 活动标签的实时脏标记（非活动标签取 tab.dirty） */
  liveDirty: boolean;
}): TabMenuItem[] {
  const { tab, ctx, ui, liveDirty } = args;
  const items: TabMenuItem[] = [];
  const isDoc = tab.kind === 'character' || tab.kind === 'template';
  // 需要文档处于 live 状态的操作：先激活被右键的标签再执行（对齐 VS Code"菜单作用于目标编辑器"）
  const activateFirst = async (fn: () => unknown) => {
    if (tab.key !== ctx.activeTabKey) await ctx.switchTab(tab.key);
    await fn();
  };

  if (isDoc && tab.docId) {
    const readOnly = tab.key === ctx.activeTabKey
      ? ctx.isReadOnly
      : (ctx.getTabSnapshot(tab.key)?.isReadOnly ?? false);
    const dirty = tab.key === ctx.activeTabKey ? liveDirty : tab.dirty;
    if (tab.kind === 'character') {
      items.push({ label: '保存', shortcut: 'Ctrl+S', disabled: readOnly || !dirty, onClick: () => void activateFirst(() => ctx.handleSave()) });
      items.push({ label: '另存为', disabled: readOnly, onClick: () => void activateFirst(() => ctx.handleSaveAs()) });
    } else {
      items.push({
        label: '保存', shortcut: 'Ctrl+S', disabled: readOnly || !dirty,
        onClick: () => void activateFirst(async () => {
          if (ctx.currentTemplateId) await ctx.updateExistingTemplate(ctx.currentTemplateId, ctx.bbcodeTemplate);
          else await ctx.saveAsTemplate(ui.t('editor.bbcode.default_name'), ctx.bbcodeTemplate);
        }),
      });
      items.push({
        label: '另存为', disabled: readOnly,
        onClick: () => void activateFirst(async () => {
          const name = window.prompt(ui.t('editor.bbcode.prompt_name'), ui.t('editor.bbcode.default_name'));
          if (name) await ctx.saveAsTemplate(name, ctx.bbcodeTemplate);
        }),
      });
      items.push({ label: '变量参考', onClick: () => ui.setBbcodeHelpOpen(true) });
      items.push({
        label: '导入默认模板', disabled: readOnly,
        onClick: () => void activateFirst(() => {
          if (window.confirm(ui.t('editor.bbcode.confirm_reset'))) {
            ctx.setBbcodeTemplate(DEFAULT_BBCODE_TEMPLATE);
            ui.setToast({ message: ui.t('editor.bbcode.reset_success'), type: 'success' });
          }
        }),
      });
      items.push({ label: '复制模板文本', onClick: () => void activateFirst(() => navigator.clipboard.writeText(ctx.bbcodeTemplate)) });
    }
    // 有未保存修改：显式"放弃更改"（清本地草稿并重置为上次保存状态）；非活动标签先激活再执行
    if (dirty && !readOnly) {
      items.push({ label: '放弃更改', icon: Undo2, danger: true, onClick: () => void activateFirst(() => ctx.handleRevertChanges()) });
    }
    items.push({ label: '分享链接', onClick: () => void activateFirst(() => ctx.handleShare()) });
    items.push({ label: '导出文件', onClick: () => void activateFirst(() => ctx.handleExport()) });
    if (tab.kind === 'character') {
      items.push({ label: '复制 BBCode', onClick: () => void activateFirst(() => ctx.handleExportBBCode()) });
      items.push({ label: '同步到论坛', onClick: () => void activateFirst(() => ui.setForumSyncOpen(true)) });
      items.push({ label: ui.gmCompactMode ? '退出 GM 紧凑卡' : 'GM 紧凑数据卡', onClick: () => ui.setGmCompactMode(!ui.gmCompactMode) });
      items.push({ label: 'AI 识别导入', onClick: () => void activateFirst(() => ctx.setShowAIModal(true)) });
    }
    items.push({ label: '打开到侧边', icon: Columns2, onClick: () => ctx.openDocToSide(tab.docId!) });
    items.push({ label: '复制路径', icon: ClipboardCopy, onClick: () => { void navigator.clipboard.writeText(ctx.getItemPath(tab.docId!)); } });
  }

  items.push({ label: '关闭', icon: Trash2, danger: true, onClick: () => ctx.closeTab(tab.key) });
  // 关闭组（VS Code：Close Others / Close to the Right 作用于同栏；Close All 作用于全部栏）
  const ownerPane = ctx.panes.find(p => p.tabKeys.includes(tab.key));
  if (ownerPane && ownerPane.tabKeys.length > 1) {
    items.push({ label: '关闭其他', icon: X, onClick: () => ctx.closeTabKeys(ownerPane.tabKeys.filter(k => k !== tab.key)) });
    const rightKeys = ownerPane.tabKeys.slice(ownerPane.tabKeys.indexOf(tab.key) + 1);
    if (rightKeys.length) {
      items.push({ label: '关闭右侧标签页', icon: X, onClick: () => ctx.closeTabKeys(rightKeys) });
    }
  }
  if (ctx.tabs.length > 1) {
    items.push({ label: '全部关闭', icon: X, onClick: () => ctx.closeTabKeys(ctx.tabs.map(t => t.key)) });
  }
  return items;
}
