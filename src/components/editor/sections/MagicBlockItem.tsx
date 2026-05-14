import React from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Trash2 } from 'lucide-react';
import SpellTable from '../../common/SpellTable';
import MultilineInput from '../../common/MultilineInput';
import InlineInput from '../../common/InlineInput';
import { useUI } from '../../../contexts/UIContext';
import { useCharacter } from '../../../contexts/CharacterContext';
import { getHandlerByPath } from '../../../schema/fieldRegistry';

interface MagicBlockItemProps {
  block: any;
  blockIndex: number;
  originalBlock: any;
  dragEnabled: boolean;
  onSetDragEnabled: (enabled: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onUpdate: (id: string, updates: any) => void;
  onRemove: (id: string) => void;
  onTableItemDragStart: (listKey: string, idx: number, e: React.DragEvent) => void;
  onTableItemDragOver: (listKey: string, idx: number, e: React.DragEvent) => void;
  onTableItemDrop: (listKey: string, idx: number, e: React.DragEvent) => void;
}

const MagicBlockItem: React.FC<MagicBlockItemProps> = ({
  block,
  blockIndex,
  originalBlock,
  dragEnabled,
  onSetDragEnabled,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdate,
  onRemove
}) => {
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();
  const SpellTypeHandler = getHandlerByPath(`magicBlocks[${blockIndex}].type`);

  const handleRemove = () => {
    setConfirmModal({
      title: t('common.confirm_delete_container'),
      onConfirm: () => onRemove(block.id)
    });
  };
  const handleTypeChange = e => {
    const newType = parseInt(e.target.value, 10);
    let newTableData = { ...(block.tableData || {}) };
    const firstKey = Object.keys(newTableData)[0];
    if (firstKey && Array.isArray(newTableData[firstKey])) {
      const currentLen = newTableData[firstKey].length;
      let targetLen = currentLen;
      if (targetLen < currentLen) {
        Object.keys(newTableData).forEach(k => {
          newTableData[k] = newTableData[k].slice(currentLen - targetLen);
        });
      }
    }
    onUpdate(block.id, { spellType: newType, tableData: newTableData });
  };

  return (
    <div
      className="relative group/magic flex flex-col gap-1 -mx-2 px-2 py-1 rounded transition-colors hover:bg-stone-50"
      draggable={dragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-2 mt-1 group/title relative">
        <div
          onMouseEnter={() => onSetDragEnabled(true)}
          onMouseLeave={() => onSetDragEnabled(false)}
          className="cursor-move text-stone-300 hover:text-stone-500 transition-colors opacity-0 group-hover/magic:opacity-100 absolute -left-6 top-1"
        >
          <GripVertical size={16} />
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <input
            className={`text-sm font-bold uppercase tracking-wider bg-transparent border-b outline-none transition-colors w-full ${block.title !== originalBlock?.title ? 'text-amber-600 border-amber-300' : 'text-stone-700 border-transparent focus:border-stone-400'}`}
            value={block.title}
            onChange={e => onUpdate(block.id, { title: e.target.value })}
            placeholder={t('editor.lists.block_title')}
          />
          <button
            onClick={handleRemove}
            className="text-stone-300 hover:text-red-500 opacity-0 group-hover/title:opacity-100 transition-opacity p-0.5 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <div className="w-24">
              <InlineInput
                label={t('editor.spells.caster_level')}
                path={`magicBlocks[${blockIndex}].casterLevel`}
                value={block.casterLevel || ''}
                originalValue={originalBlock?.casterLevel}
                onChange={v => onUpdate(block.id, { casterLevel: v })}
              />
            </div>
            <div className="w-24">
              <InlineInput
                label={t('editor.spells.concentration')}
                path={`magicBlocks[${blockIndex}].concentration`}
                value={block.concentration || ''}
                originalValue={originalBlock?.concentration}
                onChange={v => onUpdate(block.id, { concentration: v })}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <div className="flex flex-col gap-0 border border-stone-200 bg-stone-50 rounded p-1.5 h-[42px] justify-center">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider leading-none mb-1">类型 TYPE</label>
                <select
                  value={block.spellType ?? 2}
                  onChange={handleTypeChange}
                  className="text-xs font-medium bg-transparent outline-none border-none text-stone-700 cursor-pointer w-full h-5 p-0"
                >
                  {SpellTypeHandler.options.map((value) => (
                    <option key={value} value={value}>{SpellTypeHandler.formatDisplay(value, { t })}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        }
      </div>
      {
        <SpellTable
          spellType={block.spellType ?? 2}
          data={block.tableData || { uses: [0], spells: [''] }}
          originalData={originalBlock?.tableData}
          onChange={v => onUpdate(block.id, { tableData: v })}
          path={`magicBlocks[${blockIndex}].tableData`}
        />
      }
      {
        <div className="mt-2">
          <MultilineInput
            label={t('editor.spells.notes')}
            path={`magicBlocks[${blockIndex}].notes`}
            value={block.notes || ''}
            originalValue={originalBlock?.notes}
            onChange={v => onUpdate(block.id, { notes: v })}
            placeholder={t('editor.spells.notes_placeholder')}
            isAutoHeight={true}
          />
        </div>
      }
    </div>
  );
};

export default MagicBlockItem;
