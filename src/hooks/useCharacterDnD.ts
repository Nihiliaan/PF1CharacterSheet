import React, { useRef } from 'react';
import { produce } from 'immer';
import { dataUpdateService } from '../services/dataUpdateService';
import { CharacterData } from '../types';

/**
 * 专门处理角色表拖拽排序和跨容器移动的交互逻辑
 */
export function useCharacterDnD(data: CharacterData, setData: React.Dispatch<React.SetStateAction<CharacterData>>) {
  // Refs for Drag & Drop
  const draggedTableItem = useRef<{ listKey: string, itemIndex: number } | null>(null);
  const draggedBagIndex = useRef<number | null>(null);
  const draggedItem = useRef<{ bagId: string, itemIndex: number } | null>(null);
  const draggedBlockId = useRef<string | null>(null);

  // --- 通用表格行拖拽 ---
  const handleTableItemDragStart = (listKey: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedTableItem.current = { listKey, itemIndex };
    e.stopPropagation();
  };

  const handleTableItemDragOver = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentDrag = draggedTableItem.current;
    if (currentDrag !== null && currentDrag.listKey === listKey) {
      const sourceItemIndex = currentDrag.itemIndex;
      if (sourceItemIndex !== targetItemIndex) {
        setData(p => dataUpdateService.reorderList(p, listKey, sourceItemIndex, targetItemIndex));
        draggedTableItem.current = { listKey, itemIndex: targetItemIndex };
      }
    }
  };

  const handleTableItemDrop = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedTableItem.current = null;
  };

  // --- 背包容器拖拽 ---
  const handleBagDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedBagIndex.current = index;
  };

  const handleBagDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sourceIndex = draggedBagIndex.current;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      setData(p => dataUpdateService.reorderList(p, 'equipmentBags', sourceIndex, targetIndex));
      draggedBagIndex.current = targetIndex;
    }
  };

  const handleBagDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem.current !== null) {
      const currentDrag = draggedItem.current;
      const targetBag = data.equipmentBags[dropIndex];
      if (currentDrag.bagId !== targetBag.id) {
        const targetItems = targetBag.items as any;
        const targetLength = Array.isArray(targetItems) ? targetItems.length : (Object.values(targetItems)[0] as any[])?.length || 0;
        setData(p => dataUpdateService.moveItemBetweenBags(p, currentDrag.bagId, currentDrag.itemIndex, targetBag.id, targetLength));
      }
    }
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  // --- 跨背包物品拖拽 ---
  const handleItemDragStart = (bagId: string, itemIndex: number, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    draggedItem.current = { bagId, itemIndex };
    e.stopPropagation();
  };

  const handleItemDragOver = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentDrag = draggedItem.current;
    if (currentDrag !== null) {
      const { bagId: sourceBagId, itemIndex: sourceItemIndex } = currentDrag;
      if (sourceBagId !== targetBagId || sourceItemIndex !== targetItemIndex) {
        setData(p => {
          if (sourceBagId === targetBagId) {
            return produce(p, draft => {
              const bag = draft.equipmentBags.find(b => b.id === sourceBagId);
              if (bag) {
                const items = bag.items as any;
                Object.keys(items).forEach(key => {
                  if (Array.isArray(items[key])) {
                    const [val] = items[key].splice(sourceItemIndex, 1);
                    items[key].splice(targetItemIndex, 0, val);
                  }
                });
              }
            });
          }
          return dataUpdateService.moveItemBetweenBags(p, sourceBagId, sourceItemIndex, targetBagId, targetItemIndex);
        });
        draggedItem.current = { bagId: targetBagId, itemIndex: targetItemIndex };
      }
    }
  };

  const handleItemDrop = (targetBagId: string, targetItemIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggedBagIndex.current = null;
    draggedItem.current = null;
  };

  // --- 模块化数据块拖拽 (Magic Blocks / Additional Data) ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedBlockId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sourceId = draggedBlockId.current;
    if (sourceId && sourceId !== targetId) {
      setData(p => dataUpdateService.reorderList(p, listName,
        p[listName].findIndex(b => b.id === sourceId),
        p[listName].findIndex(b => b.id === targetId)
      ));
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    e.preventDefault();
    draggedBlockId.current = null;
  };

  return {
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleBagDragStart, handleBagDragOver, handleBagDrop,
    handleItemDragStart, handleItemDragOver, handleItemDrop,
    handleDragStart, handleDragOver, handleDrop
  };
}
