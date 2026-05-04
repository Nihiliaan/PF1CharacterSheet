import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import SchemaRenderer from '../../controls/SchemaRenderer';

export default function AdditionalData({ path }: { path: string }) {
  const { t } = useTranslation();
  const blocks = useCharacterStore(s => get(s.data, path) || []);
  const updateField = useCharacterStore(s => s.updateField);

  const addBlock = (type: 'text' | 'table' | 'image') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBlock = { 
      id, 
      type, 
      title: '', 
      content: '', 
      url: '', 
      tableData: [], 
      columns: type === 'table' ? [{ key: 'col1', label: 'Column 1' }] : [] 
    };
    updateField(path, [...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    updateField(path, blocks.filter((b: any) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      {blocks.map((block: any, index: number) => (
        <div key={block.id} className="border border-stone-200 rounded p-4 bg-stone-50/50">
          <div className="flex items-center gap-4 mb-3">
            <div className="cursor-move text-stone-400 px-1"><GripVertical size={20} /></div>
            <SchemaRenderer path={`${path}[${index}].title`} className="text-lg font-bold font-serif bg-transparent outline-none flex-1" placeholder={t('editor.lists.block_title')} />
            <button onClick={() => removeBlock(block.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors">
              <Trash2 size={14} /> {t('common.delete')}
            </button>
          </div>

          {block.type === 'text' && <SchemaRenderer path={`${path}[${index}].content`} />}
          {block.type === 'image' && <SchemaRenderer path={`${path}[${index}].url`} placeholder={t('editor.lists.image_url')} />}
          {block.type === 'table' && <SchemaRenderer path={`${path}[${index}].tableData`} />}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => addBlock('text')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2 hover:bg-stone-50 transition-colors"><Plus size={16} /> {t('common.add_text')}</button>
        <button onClick={() => addBlock('table')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2 hover:bg-stone-50 transition-colors"><Plus size={16} /> {t('common.add_table')}</button>
        <button onClick={() => addBlock('image')} className="flex items-center gap-1 text-sm bg-white text-stone-600 border border-stone-300 rounded px-4 py-2 hover:bg-stone-50 transition-colors"><Plus size={16} /> {t('common.add_image')}</button>
      </div>
    </div>
  );
}
