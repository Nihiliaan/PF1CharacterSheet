import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import DynamicInput from '../../controls/DynamicInput';
import SpellTable from '../tables/SpellTable';

export default function MagicBlocks({ path }: { path: string }) {
  const { t } = useTranslation();
  const blocks = useCharacterStore(s => get(s.data, path) || []);
  const updateField = useCharacterStore(s => s.updateField);

  const addMagicBlock = (type: 'spell' | 'text') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBlock = {
      id,
      type,
      title: type === 'spell' ? t('editor.spells.add_prepared_template') : t('editor.lists.block_title'),
      spellTemplate: type === 'spell' ? 'prepared_0' : undefined,
      casterLevel: '1',
      concentration: '0',
      tableData: {
        uses: [],
        spells: []
      },
      content: '',
      notes: ''
    };
    updateField(path, [...blocks, newBlock]);
  };

  const removeMagicBlock = (id: string) => {
    updateField(path, blocks.filter((b: any) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {blocks.map((block: any, index: number) => (
        <div key={block.id} className="relative group/magic border border-stone-100 hover:border-stone-200 p-4 rounded-lg transition-all bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
             <div className="cursor-grab text-stone-300 hover:text-stone-500">
                <GripVertical size={16} />
             </div>
             <DynamicInput path={`${path}[${index}].title`} className="flex-1 font-bold uppercase tracking-wider text-stone-600 text-[11px]" />
             
             <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
             </button>
          </div>

          <div className="flex flex-col gap-4">
            {block.type === 'spell' && (
              <>
                <div className="flex gap-4">
                   <DynamicInput path={`${path}[${index}].casterLevel`} label={t('editor.spells.caster_level')} className="flex-1" />
                  <DynamicInput path={`${path}[${index}].concentration`} label={t('editor.spells.concentration')} className="flex-1" />
                </div>
                
                <SpellTable 
                    path={`${path}[${index}].tableData`} 
                    spellTemplate={block.spellTemplate}
                    onTemplateChange={(val: string) => updateField(`${path}[${index}].spellTemplate`, val)}
                />

                <DynamicInput path={`${path}[${index}].notes`} label={t('editor.spells.notes')} />
              </>
            )}
            {block.type === 'text' && (
              <DynamicInput path={`${path}[${index}].content`} />
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => addMagicBlock('spell')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> 添加法术列表
        </button>
        <button onClick={() => addMagicBlock('text')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> {t('common.add_text')}
        </button>
      </div>
    </div>
  );
}
