import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';
import { useUI } from '../../../contexts/UIContext';

const AdditionalDataSection: React.FC = () => {
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();
  const {
    data,
    lastSavedData,
    dragEnabledFor,
    setDragEnabledFor,
    tableActionMode,
    toggleTableActionMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    updateAdditionalBlock,
    removeAdditionalBlock,
    addAdditionalBlock,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  return (
    <Section id="additional-data" title={t('editor.sections.additional')}>
      <div className="flex flex-col gap-8">
        {data.additionalData.map((block, i) => (
          <div
            key={block.id}
            className="border border-stone-200 rounded p-4 bg-stone-50/50"
            draggable={dragEnabledFor === block.id}
            onDragStart={(e) => handleDragStart(e, block.id)}
            onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')}
            onDrop={(e) => handleDrop(e, block.id, 'additionalData')}
          >
            <div className="flex items-center gap-4 mb-3">
              <div
                onMouseEnter={() => setDragEnabledFor(block.id)}
                onMouseLeave={() => setDragEnabledFor(null)}
                className="cursor-move text-stone-400 px-1"
              >
                <GripVertical size={20} />
              </div>
              <input
                className="text-lg font-bold font-serif bg-transparent border-b border-transparent focus:border-primary outline-none px-1 py-0.5 flex-1"
                value={block.title}
                onChange={e => updateAdditionalBlock(block.id, { title: e.target.value })}
              />
              <button
                onClick={() => {
                  setConfirmModal({
                    title: t('common.confirm_delete_container'),
                    onConfirm: () => removeAdditionalBlock(block.id)
                  });
                }}
                className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1"
              >
                <Trash2 size={14} /> {t('common.delete_container')}
              </button>
            </div>
            {block.type === 'text' ? (
              <MultilineInput
                label={t('editor.lists.content')}
                path={`additionalData[${i}].content`}
                value={block.content || ''}
                originalValue={lastSavedData.additionalData?.[i]?.content}
                onChange={v => updateAdditionalBlock(block.id, { content: v })}
                height="120px"
              />
            ) : block.type === 'image' ? (
              <input
                className="w-full border rounded px-3 py-2 text-sm outline-none bg-white border-stone-200 focus:border-stone-400"
                value={block.url || ''}
                onChange={e => updateAdditionalBlock(block.id, { url: e.target.value })}
                placeholder={t('editor.lists.image_url')}
              />
            ) : (
              <DynamicTable
                path={`additionalData[${i}].tableData`}
                columns={block.columns || []}
                data={block.tableData || {}}
                originalData={lastSavedData.additionalData?.[i]?.tableData}
                onChange={v => updateAdditionalBlock(block.id, { tableData: v as any })}
                rowDraggable={true}
                rowActionMode={tableActionMode}
                onRowActionModeToggle={toggleTableActionMode}
                onRowDragStart={(idx, e) => handleTableItemDragStart(`additionalData[${i}].tableData`, idx, e)}
                onRowDragOver={(idx, e) => handleTableItemDragOver(`additionalData[${i}].tableData`, idx, e)}
                onRowDrop={(idx, e) => handleTableItemDrop(`additionalData[${i}].tableData`, idx, e)}
              />
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => addAdditionalBlock('text')}
            className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"
          >
            <Plus size={16} /> {t('common.add_text')}
          </button>
          <button
            onClick={() => addAdditionalBlock('table')}
            className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"
          >
            <Plus size={16} /> {t('common.add_table')}
          </button>
          <button
            onClick={() => addAdditionalBlock('image')}
            className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2"
          >
            <Plus size={16} /> {t('common.add_image')}
          </button>
        </div>
      </div>
    </Section>
  );
};

export default AdditionalDataSection;
