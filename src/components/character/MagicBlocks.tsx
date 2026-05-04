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

  const addMagicBlock = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBlock = {
      id,
      title: t('editor.lists.block_title'),
      spellTemplate: 'prepared_0',
      casterLevel: '1',
      concentration: '0',
      spellTable: {
        uses: [],
        spells: []
      },
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
          <div className="flex items-center gap-3 mb-4">
             <div className="cursor-grab text-stone-300 hover:text-stone-500">
                <GripVertical size={16} />
             </div>
             <DynamicInput path={`${path}[${index}].title`} className="flex-1 font-bold uppercase tracking-wider text-stone-600 text-[11px]" />
             
             <select
                value={block.spellTemplate}
                onChange={(e) => updateField(`${path}[${index}].spellTemplate`, e.target.value)}
                className="text-[9px] bg-stone-50 border border-stone-200 rounded px-2 py-1 font-bold text-stone-500 uppercase tracking-widest outline-none focus:border-stone-400 cursor-pointer"
             >
                <option value="prepared_0">0-環准备</option>
                <option value="prepared_1">無0環准备</option>
                <option value="spontaneous_0">0-環自发</option>
                <option value="spontaneous_1">無0環自发</option>
                <option value="sla">类法术</option>
             </select>

             <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
             </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <DynamicInput path={`${path}[${index}].casterLevel`} label={t('editor.spells.caster_level')} className="flex-1" />
              <DynamicInput path={`${path}[${index}].concentration`} label={t('editor.spells.concentration')} className="flex-1" />
            </div>
            
            <SpellTable 
                path={`${path}[${index}].spellTable`} 
                typePath={`${path}[${index}].spellTemplate`}
            />

            <DynamicInput path={`${path}[${index}].notes`} label={t('editor.spells.notes')} />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-center border-2 border-dashed border-stone-200 rounded-lg p-4 hover:border-stone-300 transition-colors bg-stone-50/30">
        <button onClick={addMagicBlock} className="flex items-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-600 uppercase tracking-widest">
          <Plus size={18} /> 添加法术列表
        </button>
      </div>
    </div>
  );
}
