/**
 * 档案库条目共享业务层：侧栏文件树（ExplorerSidebar）与档案库网格（VaultContent）
 * 共用的拖拽协议、移动执行、打开、级联删除、重命名/新建/删除统一弹窗与右键菜单模型。
 * 两个界面只保留各自的表现形式（树行 vs 网格卡片），内核一律走这里。
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FolderPlus, Scissors, ClipboardPaste, Copy, Pencil, Trash2,
  ExternalLink, Share2, FilePlus, CloudUpload, CloudDownload, Columns2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useVault } from '../VaultContext';
import { useCharacter } from '../CharacterContext';
import { useUI } from '../UIContext';
import { getCharacterById, saveCharacter as saveCharacterService } from '../../services/characterService';
import { getTemplateById, saveTemplate } from '../../services/templateService';

/** 与两处拖拽共用的原生 dataTransfer 协议 */
export const DND_MIME = 'text/plain';

export interface VaultDragItem {
  id: string;
  type: 'character' | 'folder';
}

export interface VaultMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

export type VaultMenuTarget =
  | { kind: 'folder'; id: string; name: string }
  | { kind: 'doc'; id: string; name: string }
  | { kind: 'background' };

/** 与 common/Dialog props 对接的统一弹窗状态 */
export interface VaultDialogState {
  type: 'prompt' | 'confirm';
  title: string;
  defaultValue?: string;
  confirmLabel?: string;
  confirmClassName?: string;
  onConfirm: (val: string) => void;
}

/** 去掉已知扩展名（供重命名对话框预显示） */
function stripExt(name: string): string {
  return name.replace(/\.(pf1|bbc|lnk)$/i, '');
}

export function useVaultExplorer(options: {
  surface: 'tree' | 'grid';
  /** folder「打开」行为适配：tree = 展开 + 联动当前目录；grid = setCurrentFolderId */
  onOpenFolder: (id: string) => void;
  /** 新建子文件夹成功后的界面适配（如树自动展开父文件夹） */
  onFolderCreated?: (parentId: string | null) => void;
  /** 删除范围适配：网格多选时右键选中的项删除整组（缺省只删该项） */
  getDeleteIds?: (id: string) => string[];
  /** 剪切范围适配：网格多选时右键选中的项剪切整组（缺省只剪该项） */
  getCutIds?: (id: string) => string[];
  /** 「打开到侧边」适配（对齐 VS Code Alt+点击 / Open to the Side）：传入即显示菜单项 */
  onOpenToSide?: (id: string) => void;
}) {
  const { surface, onOpenFolder, onFolderCreated, getDeleteIds, getCutIds, onOpenToSide } = options;
  const { t } = useTranslation();
  const { setToast } = useUI();
  const {
    myCharacters, folders, currentFolderId,
    moveCharacter, moveFolder, createFolder, renameItem, copyCharacter,
    deleteCharacter, deleteFolder,
    cutItems, onCut, onPaste, importFromClipboard,
  } = useVault();
  const {
    selectCharacter, closeTabsByDocIds, openCharacterTab,
    handleCloudBackup, handleCloudRestore,
  } = useCharacter();

  const [dialog, setDialog] = useState<VaultDialogState | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  // 保持最新引用，供 dialog onConfirm 等闭包安全使用
  const foldersRef = useRef(folders);
  foldersRef.current = folders;
  const myCharactersRef = useRef(myCharacters);
  myCharactersRef.current = myCharacters;

  // ===== 拖拽协议 =====

  const encodeDragPayload = useCallback((items: VaultDragItem[]): string => {
    if (items.length > 1) {
      return JSON.stringify({ type: 'multiple', ids: items.map(it => it.id) });
    }
    const [it] = items;
    return JSON.stringify({ id: it.id, type: it.type });
  }, []);

  /** 解析 dataTransfer 负载；fallback 提供时用于负载为空的场景（如网格内部状态兜底） */
  const parseDropPayload = useCallback((e?: { dataTransfer?: DataTransfer | null }, fallback?: VaultDragItem[] | null): VaultDragItem[] => {
    const raw = e?.dataTransfer?.getData(DND_MIME);
    if (raw) {
      try {
        const p = JSON.parse(raw);
        if (p.type === 'multiple' && Array.isArray(p.ids)) {
          // 多选拖拽：按 folders 成员关系判断各项类型
          return p.ids.map((id: string) => ({
            id,
            type: foldersRef.current.some((f: any) => f.id === id) ? 'folder' : 'character',
          }));
        }
        return [{ id: p.id, type: p.type === 'folder' ? 'folder' : 'character' }];
      } catch { /* 忽略无法解析的负载 */ }
    }
    return fallback ?? [];
  }, []);

  const isDragPayload = useCallback((e: { dataTransfer?: DataTransfer | null }) =>
    !!e.dataTransfer?.types?.includes(DND_MIME), []);

  // ===== 移动 =====

  const moveItemsToFolder = useCallback(async (items: VaultDragItem[], targetFolderId: string | null) => {
    const targets = items.filter(it => it.id && it.id !== targetFolderId);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map(async it => {
        if (it.type === 'folder') await moveFolder(it.id, targetFolderId);
        else await moveCharacter(it.id, targetFolderId);
      }));
      setToast({
        message: targets.length > 1 ? t('common.moved_items', { n: targets.length }) : t('common.moved_item'),
      });
    } catch (e: any) {
      setToast({ message: t('common.move_failed') + (e?.message ? `: ${e.message}` : ''), type: 'error' });
    }
  }, [moveFolder, moveCharacter, setToast, t]);

  // ===== 打开（统一入口：selectCharacter 内含缓存秒开 / 云端对齐 / templates 集合兜底）=====

  const openDoc = useCallback(async (id: string) => {
    await selectCharacter(id, true, true);
  }, [selectCharacter]);

  // ===== 删除（子树级联 + 联动关闭已打开标签）=====

  const deleteItems = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      // 计算删除文件夹的整棵子树，其中的文档标签页一并关闭
      const doomedFolders = new Set<string>();
      const doomedDocs: string[] = [];
      for (const id of ids) {
        if (foldersRef.current.some((f: any) => f.id === id)) doomedFolders.add(id);
        else doomedDocs.push(id);
      }
      let grew = true;
      while (grew) {
        grew = false;
        for (const f of foldersRef.current) {
          if (doomedFolders.has(f.parentId) && !doomedFolders.has(f.id)) {
            doomedFolders.add(f.id);
            grew = true;
          }
        }
      }
      for (const c of myCharactersRef.current) {
        if (c.folderId && doomedFolders.has(c.folderId)) doomedDocs.push(c.id);
      }

      await Promise.all([
        ...Array.from(doomedFolders).map(id => deleteFolder(id)),
        ...Array.from(new Set(doomedDocs)).map(id => deleteCharacter(id)),
      ]);
      // 关闭被删子树内打开的标签页（跳过未保存确认）
      if (doomedDocs.length) closeTabsByDocIds(Array.from(new Set(doomedDocs)));
      setToast({ message: t('common.deleted') });
    } catch (e: any) {
      setToast({ message: t('common.delete') + ': ' + (e?.message || ''), type: 'error' });
    }
  }, [deleteFolder, deleteCharacter, closeTabsByDocIds, setToast, t]);

  // ===== 统一弹窗（重命名 / 新建子文件夹 / 删除确认）=====

  const requestRename = useCallback((id: string, type: 'character' | 'folder', currentName: string) => {
    const isFolder = type === 'folder';
    // 文档名编辑时剥离扩展名（确认后由 renameItem 按类型补回）
    const editName = isFolder ? (currentName || '') : stripExt(currentName || '');
    setDialog({
      type: 'prompt',
      title: isFolder ? t('common.rename_folder') : t('common.rename_file'),
      defaultValue: editName,
      onConfirm: (val) => {
        const trimmed = (val || '').trim();
        if (!trimmed || trimmed === editName) return;
        renameItem(id, type, trimmed)
          .then(() => setToast({ message: t('common.rename_success') }))
          .catch((e: any) => setToast({ message: t('common.rename_failed') + ': ' + (e?.message || ''), type: 'error' }));
      },
    });
  }, [renameItem, setToast, t]);

  const requestCreateFolder = useCallback((parentId: string | null) => {
    setDialog({
      type: 'prompt',
      title: t('common.new_folder'),
      defaultValue: t('common.new_folder'),
      onConfirm: (val) => {
        const name = (val || '').trim();
        if (!name) return;
        createFolder(name, parentId)
          .then(() => {
            setToast({ message: t('common.new_folder') + ' ✓' });
            onFolderCreated?.(parentId);
          })
          .catch((e: any) => setToast({ message: t('common.failed_to_create_folder') + ': ' + (e?.message || ''), type: 'error' }));
      },
    });
  }, [createFolder, setToast, t, onFolderCreated]);

  const requestDelete = useCallback((ids: string[], name?: string) => {
    if (!ids.length) return;
    setDialog({
      type: 'confirm',
      title: (ids.length > 1 ? t('common.delete_confirm', { n: ids.length })
        : `确定删除「${name || ''}」吗？该操作不可撤销。`),
      confirmLabel: ids.length > 1 ? t('common.delete_selected') : t('common.delete'),
      confirmClassName: 'text-rose-600',
      onConfirm: () => { void deleteItems(ids); },
    });
  }, [deleteItems, t]);

  // ===== 辅助动作 =====

  const shareDoc = useCallback((id: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard.writeText(shareUrl);
    setToast({ message: t('common.share') });
  }, [setToast, t]);

  /** 链接卡 → 以源文档内容创建可编辑副本（原网格 create_from_link 逻辑） */
  const createEditableCopy = useCallback(async (item: { id: string; targetId?: string }) => {
    if (!item.targetId) return;
    try {
      // 集合路由：链接目标可能是模板（templates 集合）或人物卡（characters 集合），
      // 副本分别写入各自的集合
      const tpl = await getTemplateById(item.targetId).catch(() => null);
      if (tpl) {
        await saveTemplate({ content: tpl.content, name: tpl.name }, null, currentFolderId);
      } else {
        const targetChar = await getCharacterById(item.targetId);
        if (!targetChar) throw new Error('original not found');
        await saveCharacterService(targetChar.data, null, currentFolderId);
      }
      setToast({ message: t('common.create_editable_copy') });
    } catch {
      setToast({ message: t('common.original_not_found'), type: 'error' });
    }
  }, [currentFolderId, setToast, t]);

  // ===== 右键菜单模型（两界面统一超集）=====

  const buildMenu = useCallback((target: VaultMenuTarget): VaultMenuItem[] => {
    if (target.kind === 'folder') {
      return [
        { label: t('common.open'), icon: ExternalLink, onClick: () => onOpenFolder(target.id) },
        { label: t('common.new_folder'), icon: FolderPlus, onClick: () => requestCreateFolder(target.id) },
        { label: t('common.cut'), icon: Scissors, onClick: () => onCut(getCutIds ? getCutIds(target.id) : [target.id]) },
        ...(cutItems.length > 0 ? [{ label: t('common.paste_here'), icon: ClipboardPaste, onClick: () => { void onPaste(target.id).catch(console.error); } }] : []),
        { label: t('common.copy'), icon: Copy, onClick: () => { void copyCharacter(target.id).catch(console.error); } },
        { label: t('common.rename'), icon: Pencil, onClick: () => requestRename(target.id, 'folder', target.name) },
        { label: t('common.delete'), icon: Trash2, danger: true, onClick: () => requestDelete(getDeleteIds ? getDeleteIds(target.id) : [target.id], target.name) },
      ];
    }
    if (target.kind === 'doc') {
      const doc = myCharacters.find(c => c.id === target.id);
      const isLink = !!doc?.targetId;
      return [
        { label: t('common.open'), icon: ExternalLink, onClick: () => { void openDoc(target.id); } },
        ...(onOpenToSide ? [{ label: t('common.open_to_side'), icon: Columns2, onClick: () => onOpenToSide(target.id) }] : []),
        { label: t('common.cut'), icon: Scissors, onClick: () => onCut(getCutIds ? getCutIds(target.id) : [target.id]) },
        ...(isLink
          ? [{ label: t('common.create_editable_copy'), icon: Copy, onClick: () => { void createEditableCopy(doc).catch(console.error); } }]
          : [{ label: t('common.copy'), icon: Copy, onClick: () => { void copyCharacter(target.id).catch(console.error); } }]),
        { label: t('common.share'), icon: Share2, onClick: () => shareDoc(target.id) },
        { label: t('common.rename'), icon: Pencil, onClick: () => requestRename(target.id, 'character', target.name) },
        { label: t('common.delete'), icon: Trash2, danger: true, onClick: () => requestDelete(getDeleteIds ? getDeleteIds(target.id) : [target.id], target.name) },
      ];
    }
    // 背景
    return [
      { label: t('common.new_character'), icon: FilePlus, onClick: () => openCharacterTab() },
      { label: t('common.new_folder'), icon: FolderPlus, onClick: () => requestCreateFolder(currentFolderId) },
      { label: t('common.import_clipboard'), icon: ClipboardPaste, onClick: () => { void importFromClipboard().catch(console.error); } },
      ...(cutItems.length > 0 ? [{ label: t('common.paste_here'), icon: ClipboardPaste, onClick: () => { void onPaste(currentFolderId).catch(console.error); } }] : []),
      { label: t('common.cloud_backup'), icon: CloudUpload, onClick: () => { void handleCloudBackup().catch(console.error); } },
      { label: t('common.cloud_restore'), icon: CloudDownload, onClick: () => { void handleCloudRestore().catch(console.error); } },
    ];
  }, [t, cutItems, currentFolderId, myCharacters, onOpenFolder, onCut, onPaste, copyCharacter,
      requestCreateFolder, requestRename, requestDelete, openDoc, createEditableCopy, shareDoc, getCutIds,
      openCharacterTab, importFromClipboard, handleCloudBackup, handleCloudRestore, onOpenToSide]);

  // 单项拖拽负载快捷构造（卡片/树行 onDragStart 用）
  const dragPropsFor = useMemo(() => (item: VaultDragItem) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      // 多选场景由调用方判定后传整组 items；单项默认只拖自身
      e.dataTransfer.setData(DND_MIME, encodeDragPayload([item]));
      e.dataTransfer.effectAllowed = 'move';
    },
  }), [encodeDragPayload]);

  return {
    surface,
    // 拖拽
    DND_MIME, encodeDragPayload, parseDropPayload, isDragPayload, dragPropsFor,
    moveItemsToFolder,
    // 打开
    openDoc,
    // 删除 / 重命名 / 新建
    deleteItems, requestRename, requestCreateFolder, requestDelete,
    // 菜单
    buildMenu,
    // 统一弹窗
    dialog, closeDialog,
    // 剪贴板（键盘 Ctrl+X / Ctrl+V 路由用）
    onCut, onPaste,
    // 辅助
    shareDoc, createEditableCopy,
  };
}
