import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, GripVertical } from 'lucide-react';
import DynamicTable from '../../common/DynamicTable';
import { useUI } from '../../../contexts/UIContext';

interface EquipmentBagItemProps {
  bag: any;
  bagIndex: number;
  originalBag: any;
  tableActionMode: 'drag' | 'delete';
  onToggleTableActionMode: () => void;
  onUpdateBagName: (id: string, name: string) => void;
  onToggleBagWeight: (id: string, ignore: boolean) => void;
  onUpdateBagItems: (id: string, items: any) => void;
  onRemoveBag: (id: string) => void;
  onBagDragStart: (e: React.DragEvent, idx: number) => void;
  onBagDragOver: (e: React.DragEvent, idx: number) => void;
  onBagDrop: (e: React.DragEvent, idx: number) => void;
  onItemDragStart: (bagId: string, idx: number, e: React.DragEvent) => void;
  onItemDragOver: (bagId: string, idx: number, e: React.DragEvent) => void;
  onItemDrop: (bagId: string, idx: number, e: React.DragEvent) => void;
}

const EquipmentBagItem: React.FC<EquipmentBagItemProps> = ({
  bag,
  bagIndex,
  originalBag,
  tableActionMode,
  onToggleTableActionMode,
  onUpdateBagName,
  onToggleBagWeight,
  onUpdateBagItems,
  onRemoveBag,
  onBagDragStart,
  onBagDragOver,
  onBagDrop,
  onItemDragStart,
  onItemDragOver,
  onItemDrop
}) => {
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();

  const handleRemove = () => {
    setConfirmModal({
      title: t('common.confirm_delete_container'),
      onConfirm: () => onRemoveBag(bag.id)
    });
  };

  return (
    <div
      className="border rounded p-4 bg-stone-50/50 border-stone-200"
      onDragOver={(e) => onBagDragOver(e, bagIndex)}
      onDrop={(e) => onBagDrop(e, bagIndex)}
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-4 flex-1">
          <div
            className="cursor-grab text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1"
            draggable
            onDragStart={(e) => onBagDragStart(e, bagIndex)}
          >
            <GripVertical size={18} />
          </div>
          <input
            className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 max-w-sm w-full"
            value={bag.name}
            onChange={e => onUpdateBagName(bag.id, e.target.value)}
          />
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-2">
            <input
              type="checkbox"
              checked={bag.ignoreWeight}
              onChange={e => onToggleBagWeight(bag.id, e.target.checked)}
              className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3"
            />
            {t('editor.items.ignore_weight')}
          </label>
        </div>
        <button
          onClick={handleRemove}
          className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors"
        >
          <Trash2 size={14} /> {t('common.delete_container')}
        </button>
      </div>
      <DynamicTable
        path={`equipmentBags[${bagIndex}].items`}
        data={bag.items}
        originalData={originalBag?.items}
        onChange={v => onUpdateBagItems(bag.id, v)}
        newItemGenerator={() => ({ item: '', quantity: 1, cost: 0, weight: 0, notes: '' })}
        rowDraggable={true}
        rowActionMode={tableActionMode}
        onRowActionModeToggle={onToggleTableActionMode}
        onRowDragStart={(idx, e) => onItemDragStart(bag.id, idx, e)}
        onRowDragOver={(idx, e) => onItemDragOver(bag.id, idx, e)}
        onRowDrop={(idx, e) => onItemDrop(bag.id, idx, e)}
      />
    </div>
  );
};

export default EquipmentBagItem;
