import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import DynamicTable from '../../common/DynamicTable';
import { useUI } from '../../../contexts/UIContext';
import { useCharacter } from '../../../contexts/CharacterContext';
import EquipmentBatchImportModal from '../EquipmentBatchImportModal';
import { ParsedEquipmentItem } from '../../../utils/equipmentBatchParser';

interface EquipmentBagItemProps {
  bag: any;
  bagIndex: number;
  originalBag: any;
  tableActionMode: 'drag' | 'delete';
  onToggleTableActionMode: () => void;
  update: (path: string, val: any) => void;
  /** 跨背包拖拽的插入指示线位置（null = 本背包无预览） */
  insertPreviewIndex: number | null;
  /** 折叠状态（纯界面记忆；背包拖拽期间宿主会强制全折叠） */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const EquipmentBagItem: React.FC<EquipmentBagItemProps> = ({
  bag,
  bagIndex,
  originalBag,
  tableActionMode,
  onToggleTableActionMode,
  update,
  insertPreviewIndex,
  collapsed,
  onToggleCollapse
}) => {
  // 背包容器排序（dnd-kit）：把手为唯一激活器；不用原生位移（多容器落点由宿主指针真值判定，
  // 位移会让视觉位置偏离布局位置），拖拽预览 = DragOverlay 卡片 + 宿主的背包插入指示线
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({ id: bag.id, data: { type: 'bag', bagId: bag.id, bagIndex } });
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();
  const { removeBag } = useCharacter();
  const [showBatchImport, setShowBatchImport] = useState(false);

  const handleRemove = () => {
    setConfirmModal({
      title: t('common.confirm_delete_container'),
      onConfirm: () => removeBag(bag.id)
    });
  };

  const handleBatchImport = (items: ParsedEquipmentItem[], strategy: 'append' | 'replace') => {
    const newItems = items.map(i => i.item);
    const newQuantities = items.map(i => i.quantity);
    const newCosts = items.map(i => i.cost);
    const newWeights = items.map(i => i.weight);
    const newNotes = items.map(i => i.notes);

    if (strategy === 'replace') {
      const newBag = {
        ...bag,
        item: newItems,
        quantity: newQuantities,
        cost: newCosts,
        weight: newWeights,
        notes: newNotes
      };
      update(`equipment.container[${bagIndex}]`, newBag);
    } else {
      const newBag = {
        ...bag,
        item: [...(bag.item || []), ...newItems],
        quantity: [...(bag.quantity || []), ...newQuantities],
        cost: [...(bag.cost || []), ...newCosts],
        weight: [...(bag.weight || []), ...newWeights],
        notes: [...(bag.notes || []), ...newNotes]
      };
      update(`equipment.container[${bagIndex}]`, newBag);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`border rounded bg-stone-50/50 border-stone-200 ${collapsed ? 'px-4 py-2' : 'p-4'} ${isDragging ? 'opacity-40' : ''}`}
      data-bag-zone={bag.id}
    >
      <div className={`flex items-center justify-between gap-4 ${collapsed ? '' : 'mb-3'}`}>
        <div className="flex items-center gap-4 flex-1">
          <input
            className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 max-w-sm w-full"
            value={bag.name}
            onChange={e => update(`equipment.container[${bagIndex}].name`, e.target.value)}
          />
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-2">
            <input
              type="checkbox"
              checked={!!bag.ignoreWeight}
              onChange={e => update(`equipment.container[${bagIndex}].ignoreWeight`, e.target.checked)}
              className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3"
            />
            {t('editor.items.ignore_weight')}
          </label>
          {collapsed && (
            <span className="text-xs text-stone-400 shrink-0">{(bag.item || []).length} 项</span>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-1">
            <input
              type="checkbox"
              checked={!!bag.ignoreCost}
              onChange={e => update(`equipment.container[${bagIndex}].ignoreCost`, e.target.checked)}
              className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3"
            />
            {t('editor.items.ignore_cost')}
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBatchImport(true)}
            className="text-stone-500 hover:text-primary text-xs flex items-center gap-1.5 transition-colors px-2 py-1 rounded border border-stone-200 bg-white hover:bg-stone-50 shadow-xs"
            title={t('editor.items.batch_import')}
          >
            <FileSpreadsheet size={13} /> {t('editor.items.batch_import')}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="text-stone-400 hover:text-red-500 text-xs flex items-center gap-1 transition-colors px-1.5 py-1"
          >
            <Trash2 size={13} /> {t('common.delete_container')}
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
            title={collapsed ? t('common.expand') : t('common.collapse')}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          {/* 拖拽把手统一右上角（与行排序"奔右"逻辑一致，2026-11-16 用户裁决） */}
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            data-dnd-activator
            className="cursor-grab touch-none text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1"
          >
            <GripVertical size={18} />
          </div>
        </div>
      </div>
      {/* 折叠态：隐藏物品表（标题区仍可作为投放目标 = 追加到末尾） */}
      {!collapsed && (
      <>
      {/* 共享 DndContext 模式：行 sortable id 加背包前缀保证全局唯一，data 携带 bagId/bagIndex
          供 EquipmentSection 的 onDragEnd 判定同背包排序/跨背包移动；容器 droppable 兜住空背包投放 */}
      <DynamicTable
        path={`equipment.container[${bagIndex}]`}
        data={bag}
        originalData={originalBag}
        onChange={v => update(`equipment.container[${bagIndex}]`, v)}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={onToggleTableActionMode}
        insertPreviewIndex={insertPreviewIndex}
        sharedDnd={{
          idPrefix: `bag-${bag.id}-`,
          rowData: { bagId: bag.id, bagIndex },
          containerId: `bag-container-${bag.id}`,
          containerData: { bagId: bag.id, bagIndex, isContainer: true }
        }}
      />

      </>
      )}
      <EquipmentBatchImportModal
        isOpen={showBatchImport}
        onClose={() => setShowBatchImport(false)}
        bagName={bag.name}
        onImport={handleBatchImport}
      />
    </div>
  );
};

export default EquipmentBagItem;
