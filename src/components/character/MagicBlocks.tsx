import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import SchemaRenderer from '../../controls/SchemaRenderer';

export default function MagicBlocks({ path }: { path: string }) {
  const { t } = useTranslation();
  const blocks = useCharacterStore(s => get(s.data, path) || []);
  const updateField = useCharacterStore(s => s.updateField);

  // 这里的逻辑只负责块的管理，具体的表格内容交给 SpellTable 
  const addMagicBlock = (type: 'spell' | 'text', spellTemplate?: 'sla' | 'spontaneous' | 'prepared') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBlock = {
      id,
      type,
      title: spellTemplate === 'sla' ? t('editor.spells.add_sla_template') : t('editor.lists.block_title'),
      spellTemplate,
      casterLevel: '1',
      concentration: '0',
      baseLevel: 0,
      tableData: [], // 数据由 SpellTable 接管
      content: '',   // 如果是 text 类型
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
        <div key={block.id} className="relative group/magic border border-stone-100 hover:border-stone-200 p-4 rounded-lg transition-all bg-stone-50/30">
          {/* 块标题区域 */}
          <div className="flex items-center gap-2 mb-4">
             <div className="cursor-grab text-stone-300 hover:text-stone-500">
                <GripVertical size={16} />
             </div>
             <SchemaRenderer path={`${path}[${index}].title`} className="flex-1 font-bold uppercase tracking-wider text-stone-600 text-[11px]" />
             <button onClick={() => removeMagicBlock(block.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
             </button>
          </div>

          <div className="flex flex-col gap-4">
            {block.type === 'spell' && (
              <>
                <div className="flex gap-4">
                  <SchemaRenderer path={`${path}[${index}].casterLevel`} label={t('editor.spells.caster_level')} className="flex-1" />
                  <SchemaRenderer path={`${path}[${index}].concentration`} label={t('editor.spells.concentration')} className="flex-1" />
                </div>
                
                {/* 这里的魔法就在于：magicBlocks[index].tableData 的 handler 被指定为了 SpellTableHandler */}
                {/* SchemaRenderer 会自动调用 SpellTable，并把 block 的配置带过去 */}
                <SchemaRenderer 
                    path={`${path}[${index}].tableData`} 
                    spellTemplate={block.spellTemplate}
                    baseLevel={block.baseLevel}
                />

                <SchemaRenderer path={`${path}[${index}].notes`} label={t('editor.spells.notes')} />
              </>
            )}

            {block.type === 'text' && (
              <SchemaRenderer path={`${path}[${index}].content`} />
            )}
          </div>
        </div>
      ))}

      {/* 添加按钮区域 */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button onClick={() => addMagicBlock('spell', 'sla')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> {t('editor.spells.add_sla_template')}
        </button>
        <button onClick={() => addMagicBlock('spell', 'spontaneous')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> {t('editor.spells.add_spontaneous_template')}
        </button>
        <button onClick={() => addMagicBlock('spell', 'prepared')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> {t('editor.spells.add_prepared_template')}
        </button>
        <button onClick={() => addMagicBlock('text')} className="flex items-center gap-1 text-sm bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 rounded px-3 py-1.5 transition-colors">
          <Plus size={14} /> {t('common.add_text')}
        </button>
      </div>
    </div>
  );
}
