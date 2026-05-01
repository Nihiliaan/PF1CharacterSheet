import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CloudUpload, RotateCcw, FolderPlus, Grid, List as ListIcon, FilePlus, Sparkles, 
  Copy, Move, Settings, Cloud, Link, FileText
} from 'lucide-react';
import { getCharacterById } from '../../services/characterService';
import { FirebaseUser, FolderMetadata, CharacterMetadata } from '../../types';
import Toast from '../common/Toast';
import Dialog from '../common/Dialog';
import ContextMenu from '../common/ContextMenu';
import DriveBrowser from './DriveBrowser';

import { useCharacter } from '../../contexts/CharacterContext';

const VaultContent = ({ 
  user, 
  onAdd
}: { 
  user: FirebaseUser, 
  onAdd: () => void 
}) => {
  const {
    myCharacters: characters, 
    folders, 
    currentFolderId, 
    setCurrentFolderId,
    selectCharacter: onSelect, 
    refreshCharacterList: onRefresh, 
    // toast/setToast are usually global, but we use them from context too? 
    // Wait, setToast is in the character context provider props.
    // Actually, I'll just use the one from context if available, but for now I'll stick to what I have.
    driveModal,
    setDriveModal,
    handleBrowseDrive,
    navigateDrive,
    importFromDrive,
    handleCloudBackup,
    handleCloudRestore,
    isSyncingDrive,
    navigateToPathIndex,
    setShowAIModal,
    moveCharacter,
    moveFolder,
    createFolder,
    deleteFolder,
    deleteCharacter,
    renameItem,
    copyCharacter,
    ensureLocalFolder,
    saveCharacter,
    toast,
    setToast
  } = useCharacter();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; isFolder: boolean } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'character' | 'folder' } | null>(null);

  const filteredFolders = folders.filter(f => (f.parentId || null) === currentFolderId && (search ? f.name.toLowerCase().includes(search.toLowerCase()) : true));
  const filteredChars = characters.filter(c => (c.folderId || null) === currentFolderId && (search ? (c.name || '未命名').toLowerCase().includes(search.toLowerCase()) : true));

  const getDeepAvatars = (folderId: string): string[] => {
    const directChars = characters.filter(c => c.folderId === folderId);
    let avatars = directChars.map(c => c.data.basic.avatars?.[0]?.url || 'https://ui-avatars.com/api/?name=' + c.name);
    
    if (avatars.length < 4) {
      const subFolders = folders.filter(f => f.parentId === folderId);
      for (const sub of subFolders) {
        const subAvatars = getDeepAvatars(sub.id);
        avatars = [...avatars, ...subAvatars];
        if (avatars.length >= 4) break;
      }
    }
    return avatars.slice(0, 4);
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
        setToast({ message: `已移动 ${itemsToMove.length} 个项目` });
      } else {
        if (draggedItem.id === targetId) return;
        if (draggedItem.type === 'character') await moveCharacter(draggedItem.id, targetId);
        else await moveFolder(draggedItem.id, targetId);
        setToast({ message: "已移动项目" });
      }
      setSelectedIds([]);
      onRefresh();
    } catch (e) {
      setToast({ message: "移动失败", type: 'error' });
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
    setToast({ message: "正在导入本地文件..." });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.json')) continue;

      try {
        const text = await file.text();
        const content = JSON.parse(text);
        
        let folderId = currentFolderId;
        if ((file as any).webkitRelativePath) {
          const parts = (file as any).webkitRelativePath.split('/');
          for (let j = 1; j < parts.length - 1; j++) {
            folderId = await ensureLocalFolder(parts[j], folderId, user.uid);
          }
        }

        const finalData = {
          ...content,
          basic: { ...content.basic, name: content.basic?.name || file.name.replace('.json', '') }
        };

        await saveCharacter(finalData, undefined, folderId);
        importCount++;
      } catch (e) {
        console.error("Failed to parse local file", e);
      }
    }
    onRefresh();
    setToast({ message: `本地导入成功！共导入 ${importCount} 个人物卡` });
  };

  const handleImportClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const content = JSON.parse(text);
      if (!content.basic || !content.attributes) throw new Error("无效的人物卡格式");
      
      const finalData = {
        ...content,
        basic: { ...content.basic, name: content.basic?.name || "剪贴板导入" }
      };
      
      await saveCharacter(finalData, undefined, currentFolderId);
      onRefresh();
      setToast({ message: "剪贴板导入成功！" });
    } catch (e: any) {
      setToast({ message: "剪贴板导入失败: " + e.message, type: 'error' });
    }
  };

  const handleCreateFolder = async () => {
    setModal({
      type: 'prompt',
      title: '新建文件夹',
      defaultValue: '新文件夹',
      onConfirm: async (name) => {
        if (name && name.trim()) {
          const trimmedName = name.trim();
          // Unique folder name check
          if (folders.some(f => f.parentId === currentFolderId && f.name.toLowerCase() === trimmedName.toLowerCase())) {
            setToast({ message: "该目录下已存在同名文件夹", type: 'error' });
            return;
          }
          try {
            await createFolder(trimmedName, currentFolderId);
            onRefresh();
            setToast({ message: "文件夹创建成功" });
          } catch (e) {
            setToast({ message: "创建文件夹失败", type: 'error' });
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
          title: `确定要删除这 ${idsToDelete.length} 个项目吗？`,
          confirmLabel: '确认删除',
          confirmClassName: 'text-rose-600',
          onConfirm: async () => {
            await Promise.all(idsToDelete.map(async id => {
              const isF = folders.some(f => f.id === id);
              if (isF) {
                const f = folders.find(folder => folder.id === id);
                if (f?.name === '来自分享') return;
                await deleteFolder(id);
              }
              else await deleteCharacter(id);
            }));
            setToast({ message: "已删除所选项目" });
            setSelectedIds([]);
            onRefresh();
          }
        });
        return; 
      } else if (action === 'rename' && isFolder) {
          if (item.name === '来自分享') {
            setToast({ message: "无法重命名来源文件夹", type: 'error' });
            return;
          }
          setModal({
            type: 'prompt',
            title: '重命名文件夹',
            defaultValue: item.name,
            onConfirm: async (newName) => {
              const trimmed = newName.trim();
              if (!trimmed || trimmed === item.name) return;
              if (folders.some(f => f.parentId === item.parentId && f.name.toLowerCase() === trimmed.toLowerCase() && f.id !== item.id)) {
                setToast({ message: "该目录下已存在同名文件夹", type: 'error' });
                return;
              }
              await renameItem(item.id, 'folder', trimmed);
              setToast({ message: "重命名成功" });
              onRefresh();
            }
          });
          return;
      } else if (action === 'create_from_link') {
        if (!item.targetId) return;
        const targetChar = await getCharacterById(item.targetId);
        if (targetChar) {
          await saveCharacter(targetChar.data, null, currentFolderId);
          setToast({ message: "已创建可编辑副本" });
        } else {
          setToast({ message: "原角色不存在或无法访问", type: 'error' });
        }
      } else if (action === 'copy') {
        if (selectedIds.includes(item.id)) {
          await Promise.all(selectedIds.map(id => folders.some(f => f.id === id) ? null : copyCharacter(id)));
        } else {
          await copyCharacter(item.id);
        }
        setToast({ message: "已创建副本" });
      } else if (action === 'share') {
        const shareUrl = `${window.location.origin}${window.location.pathname}?id=${item.id}`;
        navigator.clipboard.writeText(shareUrl);
        setToast({ message: "分享链接已复制！" });
      } else if (action === 'rename') {
          setModal({
            type: 'prompt',
            title: '重命名',
            defaultValue: item.name,
            onConfirm: async (newName) => {
              if (newName && newName !== item.name) {
                await renameItem(item.id, isFolder ? 'folder' : 'character', newName);
                setToast({ message: "重命名成功" });
                onRefresh();
              }
            }
          });
          return;
      }
      onRefresh();
    } catch (e) {
      setToast({ message: "操作失败", type: 'error' });
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
        accept=".json"
        className="hidden"
        onChange={(e) => handleImportLocal(e.target.files)}
      />
      <input 
        id="local-folder-import-input"
        type="file" 
        /* @ts-ignore */
        webkitdirectory=""
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
      {/* Vault Toolbar */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <button 
            onClick={() => setCurrentFolderId(null)}
            onDragOver={e => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleDropOnFolder(null); }}
            className="flex items-center gap-1.5 text-stone-500 hover:text-primary transition-colors p-1 rounded hover:bg-stone-100"
          >
            <User size={16} /> 根目录
          </button>
          {path.map(f => (
            <React.Fragment key={f.id}>
              <ChevronRight size={14} className="text-stone-300" />
              <button 
                onClick={() => setCurrentFolderId(f.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleDropOnFolder(f.id); }}
                className="hover:text-primary transition-colors p-1 rounded hover:bg-stone-100"
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="搜索我的收藏..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent focus:border-stone-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg transition-all text-xs font-bold"
              >
                <Download size={16} /> 导入
              </button>
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-stone-200 shadow-xl rounded-xl py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button 
                  onClick={() => document.getElementById('local-import-input')?.click()}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <HardDrive size={14} /> 本地文件
                </button>
                <button 
                  onClick={() => document.getElementById('local-folder-import-input')?.click()}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <Folder size={14} /> 本地文件夹
                </button>
                <button 
                  onClick={handleImportClipboard}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <Check size={14} /> 剪贴板导入
                </button>
                <div className="h-px bg-stone-100 my-1"></div>
                <button 
                  onClick={handleBrowseDrive}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-primary"
                >
                  <Search size={14} /> 浏览云端导入...
                </button>
                <button 
                  onClick={() => setShowAIModal(true)}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 font-bold text-indigo-600"
                >
                  <Sparkles size={14} /> AI 识别导入...
                </button>
                <button 
                  onClick={handleCloudRestore}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <RotateCcw size={14} /> 从云端备份还原
                </button>
                <button 
                  onClick={handleCloudBackup}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-stone-50 flex items-center gap-2"
                >
                  <CloudUpload size={14} /> 云端备份当前数据
                </button>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleAction('delete', { id: 'multiple', name: '所选项目' }, false)}
                className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors text-xs font-bold"
              >
                <Trash2 size={16} /> 删除 ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={handleCloudBackup}
              disabled={isSyncingDrive}
              className={`p-2 rounded-lg transition-all ${
                isSyncingDrive 
                ? 'text-blue-400 animate-pulse' 
                : 'text-stone-500 hover:bg-stone-100 hover:text-blue-600'
              }`}
              title="云端快速备份"
            >
              <CloudUpload size={20} />
            </button>
            <button 
              onClick={handleCreateFolder}
              className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
              title="新建文件夹"
            >
              <FolderPlus size={20} />
            </button>
            <div className="w-px h-6 bg-stone-200 mx-1"></div>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-stone-500 hover:bg-stone-100'}`}
            >
              <ListIcon size={20} />
            </button>
        </div>
      </div>

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
            <p className="font-serif italic">这里空空如也...</p>
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
                    : `group relative flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'bg-primary/5 border-primary shadow-sm' : 'hover:bg-white border-transparent'}`
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

                  <div className={viewMode === 'grid' ? "mb-3" : ""}>
                    {viewMode === 'grid' ? (
                      <div className="aspect-square w-full bg-stone-100/80 rounded-xl overflow-hidden grid grid-cols-2 gap-1 p-1 group-hover:bg-amber-100/50 transition-colors relative">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="bg-white/60 rounded-md overflow-hidden relative border border-stone-200/50 aspect-square">
                            {previewAvatars[i] ? (
                              <img 
                                src={previewAvatars[i]} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-10">
                                <User size={12} className="text-stone-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Folder size={24} className="text-amber-400 fill-amber-400/20 group-hover:fill-amber-400 transition-colors" />
                    )}
                  </div>
                  <div className={viewMode === 'grid' ? "flex-1 text-center truncate w-full px-1" : "flex-1 text-left"}>
                      <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-stone-800'}`}>{folder.name}</p>
                      <p className="text-[9px] text-stone-400 font-medium">
                        {folders.filter(f => f.parentId === folder.id).length} 文件夹 · {characters.filter(c => c.folderId === folder.id).length} 人物
                      </p>
                  </div>
                </div>
              );
            })}

            {/* Characters */}
            {filteredChars.map((char, charIdx) => {
              const idx = filteredFolders.length + charIdx;
              const isSelected = selectedIds.includes(char.id);
              return (
                <div 
                  key={char.id}
                  data-id={char.id}
                  className={viewMode === 'grid'
                    ? `group relative flex flex-col p-2 rounded-2xl bg-white border-2 transition-all cursor-pointer select-none selectable-item ${isSelected ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' : 'border-stone-100 hover:border-primary hover:shadow-2xl'}`
                    : `group relative flex items-center gap-4 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all selectable-item ${isSelected ? 'border-primary bg-primary/5' : 'border-stone-100 hover:border-primary'}`
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

                  <div className={viewMode === 'grid' ? "aspect-square rounded-xl overflow-hidden mb-2 relative bg-stone-100 shadow-inner" : "w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 relative"}>
                      {char.isTemplate ? (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-400">
                          <FileText size={viewMode === 'grid' ? 48 : 24} />
                        </div>
                      ) : (
                        <img 
                          src={char.data?.basic?.avatars?.[0]?.url || 'https://ui-avatars.com/api/?name=' + char.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      )}
                      {char.isLink && (
                        <div className="absolute top-1 right-1 bg-white/90 backdrop-blur text-blue-600 p-1 rounded border border-blue-100 shadow-sm" title="分享链接">
                          <Link size={12} strokeWidth={2.5} />
                        </div>
                      )}
                  </div>
                  <div className={viewMode === 'grid' ? "text-center min-w-0" : "flex-1 min-w-0"}>
                      <p className={`text-xs font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-stone-800'}`}>{char.name}</p>
                      <p className="text-[9px] text-stone-400 font-medium truncate mt-0.5">
                        {char.isTemplate ? 'BBCode 导出模板' : (char.data?.basic?.race + ' · ' + char.data?.basic?.classes)}
                      </p>
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
                  label: contextMenu.isFolder ? '打开' : (contextMenu.item.isTemplate ? '查看模板' : '打开人物卡'), 
                  icon: contextMenu.isFolder ? Folder : (contextMenu.item.isTemplate ? FileText : User), 
                  onClick: () => {
                    if (contextMenu.isFolder) {
                      setCurrentFolderId(contextMenu.item.id);
                    } else {
                      onSelect(contextMenu.item);
                    }
                  } 
                },
                { label: '重命名', icon: Settings, onClick: () => handleAction('rename', contextMenu.item, contextMenu.isFolder) },
                ...(contextMenu.item.isLink && !contextMenu.isFolder ? [
                   { label: '创建可编辑副本', icon: Copy, onClick: () => handleAction('create_from_link', contextMenu.item, false) }
                ] : [
                   { label: '复制', icon: Copy, onClick: () => handleAction('copy', contextMenu.item, contextMenu.isFolder) }
                ]),
                { label: '移动', icon: Move, onClick: () => handleAction('move', contextMenu.item, contextMenu.isFolder) },
                { label: '删除', icon: Trash2, onClick: () => handleAction('delete', contextMenu.item, contextMenu.isFolder), danger: true },
              ]
            : [
                { label: '新建角色', icon: FilePlus, onClick: onAdd },
                { label: '新建文件夹', icon: FolderPlus, onClick: handleCreateFolder },
                { label: '从本地导入', icon: Download, onClick: () => document.getElementById('local-import-input')?.click() },
                { label: '从剪贴板导入', icon: Check, onClick: handleImportClipboard },
                { label: '浏览云端导入', icon: Search, onClick: handleBrowseDrive },
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
