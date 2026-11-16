import React, { useRef, useCallback } from 'react';
import { produce } from 'immer';
import { dataUpdateService } from '../../logic/dataUpdateService';
import { CharacterData } from '../../schema/types';

/**
 * 专门处理角色表拖拽排序和跨容器移动的交互逻辑
 *
 * 职责边界（2026-11-16 重构）：
 * - 表格行排序：DynamicTable 内置 dnd-kit，各 section 经 onRowReorder → reorderRows 提交
 * - 背包容器排序与物品行（排序/跨背包移动）：EquipmentSection 级共享 DndContext（dnd-kit 多容器），
 *   经 reorderRows / moveItemBetweenBags 提交
 * - 数据块（法术块/附加数据）排序：HTML5 原生拖拽（handleDrag*）
 */
export function useCharacterDnD(setData: React.Dispatch<React.SetStateAction<CharacterData>>, isReadOnly: boolean = false) {
  // Refs for Drag & Drop
  const draggedTableItem = useRef<{ listKey: string, itemIndex: number } | null>(null);
  const draggedBlockId = useRef<string | null>(null);

  /** 行排序提交（dnd-kit 拖拽结束调用；物理索引 from→to） */
  const reorderRows = useCallback((listKey: string, from: number, to: number) => {
    if (isReadOnly || from === to) return;
    setData(p => dataUpdateService.reorderList(p, listKey, from, to));
  }, [isReadOnly, setData]);

  /** 跨背包移动物品（dnd-kit 多容器拖拽结束调用） */
  const moveItemBetweenBags = useCallback((sourceBagId: string, sourceIndex: number, targetBagId: string, targetIndex: number) => {
    if (isReadOnly || sourceBagId === targetBagId) return;
    setData(p => dataUpdateService.moveItemBetweenBags(p, sourceBagId, sourceIndex, targetBagId, targetIndex));
  }, [isReadOnly, setData]);

  // --- 通用表格行拖拽（HTML5；SkillsTable 保持此模式） ---
  const handleTableItemDragStart = (listKey: string, itemIndex: number, e: React.DragEvent) => {
    if (isReadOnly) return;
    e.dataTransfer.effectAllowed = 'move';
    draggedTableItem.current = { listKey, itemIndex };
    e.stopPropagation();
  };

  const handleTableItemDragOver = (listKey: string, targetItemIndex: number, e: React.DragEvent) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    draggedTableItem.current = null;
  };

  // --- 模块化数据块拖拽 (Magic Blocks / Additional Data) ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isReadOnly) return;
    draggedBlockId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const sourceId = draggedBlockId.current;
    if (sourceId && sourceId !== targetId) {
      setData(p => dataUpdateService.reorderList(p, listName,
        p[listName].findIndex((b: any) => b.id === sourceId),
        p[listName].findIndex((b: any) => b.id === targetId)
      ));
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string, listName: 'additionalData' | 'magicBlocks') => {
    if (isReadOnly) return;
    e.preventDefault();
    draggedBlockId.current = null;
  };

  return {
    reorderRows, moveItemBetweenBags,
    handleTableItemDragStart, handleTableItemDragOver, handleTableItemDrop,
    handleDragStart, handleDragOver, handleDrop
  };
}
