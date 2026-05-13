import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import Section from '../../common/Section';
import { useCharacter } from '../../../contexts/CharacterContext';
import MagicBlockItem from './MagicBlockItem';

const SpellsSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    lastSavedData,
    dragEnabledFor,
    setDragEnabledFor,
    handleDragStart,
    handleDragOver,
    handleDrop,
    updateMagicBlock,
    removeMagicBlock,
    addMagicBlock,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="spells" title={t('editor.sections.spells')}>
      <div className="flex flex-col gap-6 w-full">
        {data.magicBlocks.map((block, blockIndex) => (
          <MagicBlockItem
            key={block.id}
            block={block}
            blockIndex={blockIndex}
            originalBlock={lastSavedData.magicBlocks?.[blockIndex]}
            dragEnabled={dragEnabledFor === block.id}
            onSetDragEnabled={(enabled) => setDragEnabledFor(enabled ? block.id : null)}
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={(e) => handleDragOver(e, block.id, 'magicBlocks')}
            onDrop={(e) => handleDrop(e, block.id, 'magicBlocks')}
            onUpdate={updateMagicBlock}
            onRemove={removeMagicBlock}
            onTableItemDragStart={handleTableItemDragStart}
            onTableItemDragOver={handleTableItemDragOver}
            onTableItemDrop={handleTableItemDrop}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => addMagicBlock('spell', 2)}
            className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors"
          >
            <Plus size={14} /> 添加施法块 Add Spell Block
          </button>
        </div>
      </div>
    </Section>
  );
};

export default SpellsSection;
