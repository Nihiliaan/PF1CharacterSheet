import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, ChevronRight, User, Search, Download, HardDrive, Folder, Check, 
  CloudUpload, RotateCcw, FolderPlus, Grid, List as ListIcon, FilePlus, Sparkles, 
  Copy, Move, Settings, Cloud, Link, FileText
} from 'lucide-react';
import { getCharacterById } from '../../services/characterService';
import { FirebaseUser, FolderMetadata } from '../../schema/types';
import Toast from '../common/Toast';
import Dialog from '../common/Dialog';
import ContextMenu from '../common/ContextMenu';
import DriveBrowser from './DriveBrowser';
import MarkdownPreview from '../common/MarkdownPreview';

import { useTranslation } from 'react-i18next';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { useVault } from '../../contexts/VaultContext';

const VaultContent = ({
  user,
  onAdd
}: {
  user: FirebaseUser,
  onAdd: () => void
}) => {
  const { t } = useTranslation();
  const {
    selectCharacter: onSelect,
    saveCharacter,
    setData,
    setCurrentCharacterId,
    // 从 context 中统一获取 Drive 相关状态和动作
    driveModal,
    setDriveModal,
    handleBrowseDrive,
    handleBrowseDriveRoot,
    navigateDrive,
    importFromDrive,
    handleCloudBackup,
    handleCloudRestore,
    isSyncingDrive,
    navigateToPathIndex,
    // 从 context 中获取 AI 相关动作
    setShowAIModal
  } = useCharacter();

  const {
    toast,
    setToast
  } = useUI();

  const {
    myCharacters: characters,
    folders,
    currentFolderId,
    setCurrentFolderId,
    refreshCharacterList: onRefresh,
    moveCharacter,
    moveFolder,
    createFolder,
    deleteFolder,
    deleteCharacter,
    renameItem,
    copyCharacter,
    ensureLocalFolder,
    search,
    viewMode,
    cutItems,
    onCut,
    onPaste,
    clearClipboard
  } = useVault();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; isFolder: boolean } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'character' | 'folder' } | null>(null);

  const filteredFolders = folders.filter(f => (f.parentId || null) === currentFolderId && (search ? (f.name || '').toLowerCase().includes(search.toLowerCase()) : true));
  const filteredChars = characters.filter(c => (c.folderId || null) === currentFolderId && (search ? (c.name || '').toLowerCase().includes(search.toLowerCase()) : true));

  const getDeepAvatars = (folderId: string): { url: string; isTemplate?: boolean }[] => {
    const directChars = characters.filter(c => c.folderId === folderId);
    let items = directChars.map(c => ({
      url: c.data?.basic?.avatars?.url?.[0] || 'https://ui-avatars.com/api/?name=' + (c.name || ''),
      isTemplate: !!c.isTemplate
    }));
    
    if (items.length < 4) {
      const subFolders = folders.filter(f => f.parentId === folderId);
      for (const sub of subFolders) {
        const subItems = getDeepAvatars(sub.id);
        items = [...items, ...subItems];
        if (items.length >= 4) break;
      }
    }
    return items.slice(0, 4);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);

  const allItems = [...filteredFolders.map(f => ({ ...f, type: 'folder' })), ...filteredChars.map(c => ({ ...c, type: 'character' }))];

  const handleDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'character') => {
    if (selectedIds.includes(id)) {
      setDraggedItem({ id: 'multiple', type: 'character' }); // Special case for multiple
      e.dataTransfer.setData('text/plain', JSON.stringify({ ids: selectedIds, type: 'multiple' }));
    } else {
      setDraggedItem({ id, type });
      e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    }
  };

  const handleDropOnFolder = async (targetId: string | null) => {
    if (!draggedItem) return;
    try {
      if (draggedItem.id === 'multiple') {
        const itemsToMove = selectedIds.filter(id => id !== targetId);
        await Promise.all(itemsToMove.map(async id => {
          const isFolder = folders.some(f => f.id === id);
          if (isFolder) await moveFolder(id, targetId);
          else await moveCharacter(id, targetId);
        }));
        setToast({ message: t('common.moved_items', { n: itemsToMove.length }) });
      } else {
        if (draggedItem.id === targetId) return;
        if (draggedItem.type === 'character') await moveCharacter(draggedItem.id, targetId);
        else await moveFolder(draggedItem.id, targetId);
        setToast({ message: t('common.moved_item') });
      }
      setSelectedIds([]);
      onRefresh();
    } catch (e) {
      setToast({ message: t('common.move_failed'), type: 'error' });
    }
    setDraggedItem(null);
  };

  const handleItemClick = (e: React.MouseEvent, id: string, index: number) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const rangeIds = allItems.slice(start, end + 1).map(item => item.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...rangeIds])));
    } else {
      setSelectedIds([id]);
    }
    setLastSelectedIndex(index);
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (e.ctrlKey || e.shiftKey) return; // Don't start box if modifying selection
    
    // Check if clicked on space or item
    const target = e.target as HTMLElement;
    if (target.closest('.selectable-item')) return;

    setSelectedIds([]);
    const rect = explorerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + (explorerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (explorerRef.current?.scrollTop || 0);
    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selectionBox || !explorerRef.current) return;
    const rect = explorerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (explorerRef.current.scrollLeft || 0);
    const y = e.clientY - rect.top + (explorerRef.current.scrollTop || 0);
    setSelectionBox(prev => prev ? { ...prev, x2: x, y2: y } : null);

    // Calc selection
    const boxX = Math.min(selectionBox.x1, x);
    const boxY = Math.min(selectionBox.y1, y);
    const boxW = Math.abs(selectionBox.x1 - x);
    const boxH = Math.abs(selectionBox.y1 - y);

    const items = explorerRef.current.querySelectorAll('.selectable-item');
    const newSelected: string[] = [];
    items.forEach(el => {
      const itemRect = (el as HTMLElement).getBoundingClientRect();
      const relativeX = itemRect.left - rect.left + explorerRef.current!.scrollLeft;
      const relativeY = itemRect.top - rect.top + explorerRef.current!.scrollTop;
      
      if (
        relativeX < boxX + boxW &&
        relativeX + itemRect.width > boxX &&
        relativeY < boxY + boxH &&
        relativeY + itemRect.height > boxY
      ) {
        newSelected.push(el.getAttribute('data-id')!);
      }
    });
    setSelectedIds(newSelected);
  };

  const handleMouseUp = () => {
    setSelectionBox(null);
  };

  const path = (() => {
    let p = [];
    let curId = currentFolderId;
    while (curId) {
      const f = folders.find(folder => folder.id === curId);
      if (f) {
        p.unshift(f);
        curId = f.parentId;
      } else break;
    }
    return p;
  })();

  const [modal, setModal] = useState<{ 
    type: 'prompt' | 'confirm', 
    title: string, 
    defaultValue?: string,
    onConfirm: (val: string) => void,
    confirmLabel?: string,
    confirmClassName?: string
  } | null>(null);

  const handleImportLocal = async (files: FileList | null) => {
    if (!files || !user) return;
    let importCount = 0;
    let failCount = 0;
    let errorMsgs: string[] = [];
    setToast({ message: t('common.importing_local') });

    // 使用 Map 缓存已创建的目录 ID，减少查询并防止并发冲突
    const folderIdMap = new Map<string, string>();

    // 改为顺序执行，以确保目录结构的稳定性，防止并发创建重复文件夹
    for (const file of Array.from(files)) {
      const isPf1 = file.name.endsWith('.pf1');
      const isBbc = file.name.endsWith('.bbc');
      if (!isPf1 && !isBbc) continue;

      try {
        const text = await file.text();
        let content;
        try {
          content = JSON.parse(text);
        } catch (e) {
          if (isBbc) content = { content: text };
          else {
            failCount++;
            errorMsgs.push(`${file.name}: 无效的 JSON 格式`);
            continue;
          }
        }
        
        let folderId = currentFolderId;
        const relativePath = (file as any).webkitRelativePath;
        if (relativePath) {
          const parts = relativePath.split('/');
          // 从 0 开始，包含被选中的根文件夹名称，确保完整结构
          let currentPathKey = "";
          for (let j = 0; j < parts.length - 1; j++) {
            const part = parts[j];
            currentPathKey += (currentPathKey ? "/" : "") + part;
            
            if (folderIdMap.has(currentPathKey)) {
              folderId = folderIdMap.get(currentPathKey)!;
            } else {
              const newFolderId = await ensureLocalFolder(part, folderId, user.uid);
              folderId = newFolderId;
              folderIdMap.set(currentPathKey, folderId);
            }
          }
        }

        if (isBbc) {
          const templateContent = content.content || (typeof content === 'string' ? content : text);
          const templateName = content.name || file.name.replace('.bbc', '');
          await (saveCharacter as any)({ content: templateContent, name: templateName }, undefined, folderId, true);
        } else {
          // pf1 -彻底剥离可能存在的元数据
          const { id, ownerId, targetId, folderId: oldFolderId, ...cleanData } = content;
          const finalData = { ...cleanData };
          
          if (finalData.basic?.avatars && Array.isArray(finalData.basic.avatars)) {
            finalData.basic.avatars = {
              url: finalData.basic.avatars.map((a: any) => a.url || ''),
              note: finalData.basic.avatars.map((a: any) => a.note || '')
            };
          }
          finalData.basic = {
            ...finalData.basic,
            name: finalData.basic?.name || file.name.replace('.pf1', '')
          };
          await (saveCharacter as any)(finalData, undefined, folderId, false);
        }
        importCount++;
      } catch (e: any) {
        console.error("Failed to parse local file", e);
        failCount++;
        errorMsgs.push(`${file.name}: ${e.message || '未知错误'}`);
      }
    }

    await onRefresh();
    if (failCount > 0) {
      setToast({ message: `导入完成。成功: ${importCount}, 失败: ${failCount}。\n${errorMsgs.slice(0, 3).join('\n')}${errorMsgs.length > 3 ? '\n...' : ''}`, type: 'error' });
    } else {
      setToast({ message: t('common.import_success', { n: importCount }) });
    }
  };

  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const content = JSON.parse(text);
      
      // Determine type based on content
      const isTemplate = !!content.content && !content.basic;

      if (isTemplate) {
        await (saveCharacter as any)({ 
          content: content.content, 
          name: content.name || t('common.clipboard_content') 
        }, undefined, currentFolderId, true);
      } else {
        if (!content.basic || !content.attributes) throw new Error("无效的人物卡格式");
        const finalData = { ...content };
        if (finalData.basic?.avatars && Array.isArray(finalData.basic.avatars)) {
          finalData.basic.avatars = {
            url: finalData.basic.avatars.map((a: any) => a.url || ''),
            note: finalData.basic.avatars.map((a: any) => a.note || '')
          };
        }
        finalData.basic = {
          ...finalData.basic,
          name: finalData.basic?.name || t('common.clipboard_content')
        };
        await (saveCharacter as any)(finalData, undefined, currentFolderId, false);
      }
      
      onRefresh();
      setToast({ message: t('common.clipboard_import_success') });
    } catch (e: any) {
      setToast({ message: t('common.clipboard_import_failed') + ": " + e.message, type: 'error' });
    }
  };

  const handleCreateFolder = async () => {
    setModal({
      type: 'prompt',
      title: t('common.new_folder'),
      defaultValue: t('common.new_folder'),
      onConfirm: async (name) => {
        if (name && name.trim()) {
          const trimmedName = name.trim();
          try {
            await createFolder(trimmedName, currentFolderId);
            onRefresh();
            setToast({ message: t('common.new_folder') + " " + t('common.save') });
          } catch (e: any) {
            setToast({ message: e.message || t('common.failed_to_create_folder'), type: 'error' });
          }
        }
      }
    });
  };

  const handleAction = async (action: string, item: any, isFolder: boolean) => {
    try {
      if (action === 'delete') {
        const idsToDelete = (item.id === 'multiple' || selectedIds.includes(item.id)) ? selectedIds : [item.id];
        setModal({
          type: 'confirm',
          title: t('common.delete_confirm', { n: idsToDelete.length }),
          confirmLabel: t('common.delete_selected'),
          confirmClassName: 'text-rose-600',
          onConfirm: async () => {
            await Promise.all(idsToDelete.map(async id => {
              const isF = folders.some(f => f.id === id);
              if (isF) await deleteFolder(id);
              else await deleteCharacter(id);
            }));
            setToast({ message: t('common.delete') + " " + t('common.save') });
            setSelectedIds([]);
            onRefresh();
          }
        });
        return; 
      } else if (action === 'cut') {
        const idsToCut = selectedIds.includes(item.id) ? selectedIds : [item.id];
        onCut(idsToCut);
        return;
      } else if (action === 'paste') {
        await onPaste(isFolder ? item.id : currentFolderId);
        return;
      } else if (action === 'rename') {
          // Strip extension for editing if it's a file
          let editName = item.name || '';
          if (!isFolder) {
            const lastDot = editName.lastIndexOf('.');
            if (lastDot > 0) {
              if (editName.endsWith('.pf1') || editName.endsWith('.bbc')) {
                editName = editName.substring(0, lastDot);
              } else if (editName.endsWith('.lnk')) {
                const mainName = editName.substring(0, lastDot);
                const secondDot = mainName.lastIndexOf('.');
                if (secondDot > 0 && (mainName.endsWith('.pf1') || mainName.endsWith('.bbc'))) {
                  editName = mainName.substring(0, secondDot);
                } else {
                  editName = mainName;
                }
              }
            }
          }

          setModal({
            type: 'prompt',
            title: isFolder ? t('common.rename_folder') : t('common.rename_file'),
            defaultValue: editName,
            onConfirm: async (newName) => {
              const trimmed = newName.trim();
              if (!trimmed || trimmed === editName) return;
              try {
                await renameItem(item.id, isFolder ? 'folder' : 'character', trimmed);
                setToast({ message: t('common.rename_success') });
                onRefresh();
              } catch (e: any) {
                setToast({ message: e.message || t('common.rename_failed'), type: 'error' });
              }
            }
          });
          return;
      } else if (action === 'create_from_link') {
        if (!item.targetId) return;
        const targetChar = await getCharacterById(item.targetId);
        if (targetChar) {
          await (saveCharacter as any)(targetChar.data, null, currentFolderId, targetChar.isTemplate);
          setToast({ message: t('common.create_editable_copy') });
        } else {
          setToast({ message: t('common.original_not_found'), type: 'error' });
        }
      } else if (action === 'copy') {
        if (selectedIds.includes(item.id)) {
          await Promise.all(selectedIds.map(id => folders.some(f => f.id === id) ? null : copyCharacter(id)));
        } else {
          await copyCharacter(item.id);
        }
        setToast({ message: t('common.copy') });
      } else if (action === 'share') {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
        navigator.clipboard.writeText(shareUrl);
        setToast({ message: t('common.share') });
      }
      onRefresh();
    } catch (e) {
      setToast({ message: t('common.move_failed'), type: 'error' });
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden" 
      onContextMenu={e => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        // Show background context menu if clicking anywhere that isn't an item 
        // OR is explicitly marked as background
        if (!target.closest('.selectable-item')) {
          setContextMenu({ x: e.clientX, y: e.clientY, item: null, isFolder: false });
        }
      }}
    >
      {/* Hidden inputs for imports */}
      <input 
        id="local-import-input"
        type="file" 
        multiple 
        accept=".pf1,.bbc"
        className="hidden"
        onChange={(e) => handleImportLocal(e.target.files)}
      />
      <input 
        id="local-folder-import-input"
        type="file" 
        /* @ts-ignore */
        webkitdirectory=""
        accept=".pf1,.bbc"
        className="hidden"
        onChange={(e) => handleImportLocal(e.target.files)}
      />
      {modal && (
        <Dialog 
          type={modal.type} 
          title={modal.title} 
          defaultValue={modal.defaultValue}
          confirmLabel={modal.confirmLabel}
          confirmClassName={modal.confirmClassName}
          onConfirm={(val) => { modal.onConfirm(val); setModal(null); }} 
          onCancel={() => setModal(null)} 
        />
      )}
      {/* Explorer Content */}
      <div 
        ref={explorerRef}
        className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar relative select-none"
        data-context-bg="true"
        onDragOver={e => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={async (e) => {
            e.preventDefault();
            handleDropOnFolder(currentFolderId);
        }}
      >
        {selectionBox && (
          <div 
            className="absolute z-50 border border-primary/50 bg-primary/10 pointer-events-none"
            style={{
              left: Math.min(selectionBox.x1, selectionBox.x2),
              top: Math.min(selectionBox.y1, selectionBox.y2),
              width: Math.abs(selectionBox.x1 - selectionBox.x2),
              height: Math.abs(selectionBox.y1 - selectionBox.y2)
            }}
          />
        )}
        {(filteredFolders.length === 0 && filteredChars.length === 0) ? (
          <div 
            className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50"
            data-context-bg="true"
          >
            <RotateCcw size={64} className="mb-4 animate-reverse-spin-slow" />
            <p className="font-serif italic">{t('common.empty_vault')}</p>
          </div>
        ) : (
          <div 
            data-context-bg="true"
            className={viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6" 
            : "flex flex-col gap-1"
          }>
            {/* Folders */}
            {filteredFolders.map((folder, idx) => {
              const previewAvatars = getDeepAvatars(folder.id);
              const isSelected = selectedIds.includes(folder.id);
              return (
                <div 
                  key={folder.id}
                  data-id={folder.id}
                  className={viewMode === 'grid'
                    ? `group relative flex flex-col p-2 rounded-2xl transition-all cursor-pointer select-none border-2 selectable-item ${isSelected ? 'bg-primary/5 border-primary shadow-md' : 'hover:bg-white hover:shadow-xl border-transparent hover:border-stone-100'}`
                    : `group relative flex items-center gap-4 p-2 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-white border-transparent'}`
                  }
                  onClick={(e) => handleItemClick(e, folder.id, idx)}
                  onDoubleClick={() => setCurrentFolderId(folder.id)}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: folder, isFolder: true });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async (e) => {
                      e.stopPropagation();
                      handleDropOnFolder(folder.id);
                  }}
                >
                  {/* Windows-style Selection Checkbox */}
                  <div 
                    onClick={(e) => toggleSelection(e, folder.id)}
                    className={`${viewMode === 'grid' ? 'absolute top-2 left-2' : 'relative'} z-20 w-5 h-5 rounded border shadow-sm flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected 
                        ? 'bg-blue-500 border-blue-600 text-white opacity-100 scale-100' 
                        : 'bg-white/80 border-stone-300 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  <div className={viewMode === 'grid' ? "mb-3" : "w-10 h-10 flex items-center justify-center"}>
                    {viewMode === 'grid' ? (
                      <div className="aspect-square w-full bg-stone-100/80 rounded-xl overflow-hidden grid grid-cols-2 gap-0.5 p-0.5 group-hover:bg-amber-100/50 transition-colors relative">
                        {getDeepAvatars(folder.id).map((item, i) => (
                          <div key={i} className="bg-white/60 rounded-md overflow-hidden flex items-center justify-center relative border border-stone-200/50 aspect-square">
                            {item.isTemplate ? (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                                <FileText size={10} />
                              </div>
                            ) : (
                              <img 
                                src={item.url} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        ))}
                        {/* Placeholder for empty quadrants */}
                        {Array.from({ length: Math.max(0, 4 - getDeepAvatars(folder.id).length) }).map((_, i) => (
                           <div key={`empty-${i}`} className="bg-white/40 rounded-md overflow-hidden flex items-center justify-center border border-stone-200/50 aspect-square opacity-20">
                              <User size={10} className="text-stone-400" />
                           </div>
                        ))}
                      </div>
                    ) : (
                      <Folder size={28} className="text-amber-400 fill-amber-400/20 group-hover:fill-amber-400 transition-colors" />
                    )}
                  </div>
                  <div className={viewMode === 'grid' ? "flex-1 text-center truncate w-full px-1" : "flex-1 text-left"}>
                      <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-stone-800'}`}>{folder.name}</p>
                      <p className="text-[9px] text-stone-400 font-medium">
                        {folders.filter(f => f.parentId === folder.id).length} {t('common.local_folder')} · {characters.filter(c => c.folderId === folder.id).length} {t('editor.title')}
                      </p>
                  </div>
                </div>
              );
            })}

            {/* Characters */}
            {filteredChars.map((char, charIdx) => {
              const idx = filteredFolders.length + charIdx;
              const isSelected = selectedIds.includes(char.id);
              const isCut = cutItems.includes(char.id);
              return (
                <div 
                  key={char.id}
                  data-id={char.id}
                  className={viewMode === 'grid'
                    ? `group relative flex flex-col p-2 rounded-2xl bg-white border-2 transition-all cursor-pointer select-none selectable-item ${isSelected ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-stone-100 hover:border-primary hover:shadow-2xl'} ${isCut ? 'opacity-40' : 'opacity-100'}`
                    : `group relative flex items-center gap-4 p-2 bg-white border-2 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'border-primary bg-primary/5' : 'border-stone-100 hover:border-primary'} ${isCut ? 'opacity-40' : 'opacity-100'}`
                  }
                  onClick={(e) => handleItemClick(e, char.id, idx)}
                  onDoubleClick={() => {
                    onSelect(char);
                  }}
                  onContextMenu={e => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, item: char, isFolder: false });
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, char.id, 'character')}
                >
                  {/* Windows-style Selection Checkbox */}
                  <div 
                    onClick={(e) => toggleSelection(e, char.id)}
                    className={`${viewMode === 'grid' ? 'absolute top-2 left-2' : 'relative'} z-20 w-5 h-5 rounded border shadow-sm flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected 
                        ? 'bg-blue-500 border-blue-600 text-white opacity-100 scale-100' 
                        : 'bg-white/80 border-stone-300 opacity-0 group-hover:opacity-100 scale-90 hover:scale-100'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>

                  <div className={viewMode === 'grid' ? "aspect-square rounded-xl overflow-hidden mb-2 relative bg-stone-100 shadow-inner" : "w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 relative"}>
                      {char.isTemplate ? (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                          <FileText size={viewMode === 'grid' ? 48 : 24} />
                        </div>
                      ) : (
                        <img
                          src={char.data?.basic?.avatars?.url?.[0] || 'https://ui-avatars.com/api/?name=' + char.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      )}
                      {char.data?.targetId && (
                        <div className="absolute top-1 right-1 bg-white/90 backdrop-blur text-blue-600 p-1 rounded border border-blue-100 shadow-sm" title={t('common.share')}>
                          <Link size={12} strokeWidth={2.5} />
                        </div>
                      )}
                  </div>
                  <div className={viewMode === 'grid' ? "text-center min-w-0" : "flex-1 min-w-0"}>
                      <MarkdownPreview 
                        text={char.name} 
                        className={`text-xs font-bold line-clamp-1 block ${isSelected ? 'text-primary' : 'text-stone-800'}`} 
                      />
                      <div className="text-[9px] text-stone-400 font-medium truncate mt-0.5">
                        {char.isTemplate ? t('common.bbcode_editor') : (
                          <>
                            <MarkdownPreview text={char.data?.basic?.name || t('common.none')} className="inline text-stone-500" />
                            {' • '}
                            <MarkdownPreview text={char.data?.basic?.race || t('common.none')} className="inline" />
                            {' · '}
                            <MarkdownPreview text={char.data?.basic?.classes || t('common.none')} className="inline" />
                          </>
                        )}
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onClose={() => setContextMenu(null)}
          items={
            contextMenu.item 
            ? [
                { 
                  label: contextMenu.isFolder ? t('common.open') : (contextMenu.item.isTemplate ? t('common.view_template') : t('common.open_character')), 
                  icon: contextMenu.isFolder ? Folder : (contextMenu.item.isTemplate ? FileText : User), 
                  onClick: () => {
                    if (contextMenu.isFolder) {
                      setCurrentFolderId(contextMenu.item.id);
                    } else {
                      onSelect(contextMenu.item);
                    }
                  } 
                },
                { label: t('common.rename'), icon: Settings, onClick: () => handleAction('rename', contextMenu.item, contextMenu.isFolder) },
                ...(contextMenu.item.data?.targetId && !contextMenu.isFolder ? [
                   { label: t('common.create_editable_copy'), icon: Copy, onClick: () => handleAction('create_from_link', contextMenu.item, false) }
                ] : [
                   { label: t('common.copy'), icon: Copy, onClick: () => handleAction('copy', contextMenu.item, contextMenu.isFolder) }
                ]),
                { label: t('common.cut'), icon: Move, onClick: () => handleAction('cut', contextMenu.item, contextMenu.isFolder) },
                ...(cutItems.length > 0 ? [{ label: t('common.paste'), icon: Check, onClick: () => handleAction('paste', contextMenu.item, contextMenu.isFolder) }] : []),
                { label: t('common.delete'), icon: Trash2, onClick: () => handleAction('delete', contextMenu.item, contextMenu.isFolder), danger: true },
              ]
            : [
                { label: t('common.new_character'), icon: FilePlus, onClick: onAdd },
                { label: t('common.new_folder'), icon: FolderPlus, onClick: handleCreateFolder },
                ...(cutItems.length > 0 ? [{ label: t('common.paste_here'), icon: Check, onClick: () => handleAction('paste', null, false) }] : []),
              ]
          } 
        />
      )}

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>

      {driveModal && (
        <DriveBrowser 
          modal={driveModal}
          onClose={() => setDriveModal(null)}
          onNavigate={navigateDrive}
          onImport={importFromDrive}
          onJumpToPath={navigateToPathIndex}
        />
      )}
    </div>
  );
};

export default VaultContent;
