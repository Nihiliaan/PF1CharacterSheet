import React from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Trash2 } from 'lucide-react';
import SpellTable from '../../common/SpellTable';
import MultilineInput from '../../common/MultilineInput';
import InlineInput from '../../common/InlineInput';
import { useUI } from '../../../contexts/UIContext';
import { useCharacter } from '../../../contexts/CharacterContext';
import { getHandlerByPath } from '../../../schema/fieldRegistry';
import handlers from '../../../schema/handlers';

interface MagicBlockItemProps {
  block: any;
  blockIndex: number;
  originalBlock: any;
  dragEnabled: boolean;
  onSetDragEnabled: (enabled: boolean) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  update: (path: string, val: any) => void;
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
  update,
  onRemove
}) => {
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();

  const handleRemove = () => {
    setConfirmModal({
      title: t('common.confirm_delete_container'),
      onConfirm: () => onRemove(block.id)
    });
  };
  const handleTypeChange = (val: string) => {
    const newType = parseInt(val, 10);
    const oldType = Number(block.type ?? 2);
    if (newType === oldType) return;

    let updates: any = { type: newType };
    const targetMax = handlers.SpellTypeHandler.getRequiredRowCount(newType);

    const isFM = (t: number) => t === 0 || t === 2;
    const isMinor = (t: number) => t === 1 || t === 3;
    const isAlc = (t: number) => t === 4;
    const isSLA = (t: number) => t === 5;

    // 确保 spells 和 uses 数组长度同步（以 spells 为准）
    const spells = Array.isArray(block.spells) ? [...block.spells] : [];
    const currentLen = spells.length;
    
    ['spells', 'uses'].forEach(key => {
      let arr = key === 'spells' ? spells : (Array.isArray(block[key]) ? [...block[key]] : []);
      while (arr.length < currentLen) arr.push(key === 'uses' ? 0 : '');

      // 1. 低往高：次等/化合 -> 完整中等，补 0 环
      if ((isMinor(oldType) || isAlc(oldType)) && isFM(newType)) {
        arr.push(key === 'uses' ? 0 : '');
      }

      // 2. 高往低
      if (isSLA(oldType)) {
        if (targetMax !== null && arr.length > targetMax) arr = arr.slice(-targetMax);
      } else if (isFM(oldType) && (isMinor(newType) || isAlc(newType))) {
        if (arr.length > 0) arr.pop(); // 删 0 环
        if (targetMax !== null && arr.length > targetMax) arr = arr.slice(-targetMax);
      } else if (isAlc(oldType) && isMinor(newType)) {
        if (targetMax !== null && arr.length > targetMax) arr = arr.slice(-targetMax);
      }

      updates[key] = arr;
    });

    update(`magicBlocks[${blockIndex}]`, { ...block, ...updates });
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
        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
          <input
            className={`text-sm font-bold uppercase tracking-wider bg-transparent border-b outline-none transition-colors w-full ${block.title !== originalBlock?.title ? 'text-amber-600 border-amber-300' : 'text-stone-700 border-transparent focus:border-stone-400'}`}
            value={block.title}
            onChange={e => update(`magicBlocks[${blockIndex}].title`, e.target.value)}
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
          <div className="flex items-center gap-3">
            <div className="w-24">
              <InlineInput
                label={t('editor.spells.caster_level')}
                path={`magicBlocks[${blockIndex}].casterLevel`}
                value={block.casterLevel || ''}
                originalValue={originalBlock?.casterLevel}
                onChange={v => update(`magicBlocks[${blockIndex}].casterLevel`, v)}
              />
            </div>
            <div className={`w-24 ${block.type === 4 ? 'invisible' : ''}`}>
              <InlineInput
                label={t('editor.spells.concentration')}
                path={`magicBlocks[${blockIndex}].concentration`}
                value={block.concentration || ''}
                originalValue={originalBlock?.concentration}
                onChange={v => update(`magicBlocks[${blockIndex}].concentration`, v)}
              />
            </div>
            <div className="w-32">
              <InlineInput
                label="类型 TYPE"
                path={`magicBlocks[${blockIndex}].type`}
                value={block.type ?? 2}
                originalValue={originalBlock?.type}
                onChange={handleTypeChange}
              />
            </div>
          </div>
        }
      </div>
      {
        <SpellTable
          spellType={block.type ?? 2}
          data={block}
          originalData={originalBlock}
          onChange={v => update(`magicBlocks[${blockIndex}]`, { ...block, ...v })}
          path={`magicBlocks[${blockIndex}]`}
        />
      }
      {
        <div className="mt-2">
          <MultilineInput
            label={t('editor.spells.notes')}
            path={`magicBlocks[${blockIndex}].notes`}
            value={block.notes || ''}
            originalValue={originalBlock?.notes}
            onChange={v => update(`magicBlocks[${blockIndex}].notes`, v)}
            placeholder={t('editor.spells.notes_placeholder')}
            isAutoHeight={true}
          />
        </div>
      }
    </div>
  );
};

export default MagicBlockItem;
