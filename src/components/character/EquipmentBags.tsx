import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCharacterStore } from '../../store/characterStore';
import { get } from 'lodash-es';
import SchemaRenderer from '../../controls/SchemaRenderer';
import Section from '../common/Section';

export default function EquipmentBags({ path }: { path: string }) {
  const { t } = useTranslation();
  const bags = useCharacterStore(s => get(s.data, path) || []);
  const updateField = useCharacterStore(s => s.updateField);

  const addBag = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newBag = {
      id,
      name: t('editor.items.add_container'),
      ignoreWeight: false,
      // SoA 适配：初始化物品项的列对象
      items: {
        item: [],
        quantity: [],
        cost: [],
        weight: [],
        notes: []
      }
    };
    updateField(path, [...bags, newBag]);
  };

  const removeBag = (id: string) => {
    updateField(path, bags.filter((b: any) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {bags.map((bag: any, index: number) => (
        <div key={bag.id} className="border rounded-lg p-5 bg-white shadow-sm border-stone-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="cursor-grab text-stone-300 hover:text-stone-600 active:cursor-grabbing p-1">
                 <GripVertical size={18} />
              </div>
              <SchemaRenderer path={`${path}[${index}].name`} className="text-lg font-bold font-serif flex-1 border-none" />
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-stone-400 hover:text-stone-600 transition-colors shrink-0 ml-2">
                <input
                  type="checkbox"
                  checked={bag.ignoreWeight}
                  onChange={e => updateField(`${path}[${index}].ignoreWeight`, e.target.checked)}
                  className="rounded border-stone-300 text-primary focus:ring-primary h-3 w-3"
                />
                {t('editor.items.ignore_weight')}
              </label>
            </div>
            <button onClick={() => removeBag(bag.id)} className="text-stone-400 hover:text-red-500 text-sm flex items-center gap-1 transition-colors">
              <Trash2 size={14} /> {t('common.delete_container')}
            </button>
          </div>
          
          <SchemaRenderer 
            path={`${path}[${index}].items`} 
            columns={[
              { key: 'item', label: t('editor.items.headers.item'), width: '35%', hideRightBorder: true },
              { key: 'quantity', label: '', width: '5%' },
              { key: 'cost', label: t('editor.items.headers.cost'), width: '15%' },
              { key: 'weight', label: t('editor.items.headers.weight'), width: '15%' },
              { key: 'notes', label: t('editor.items.headers.notes'), width: '30%' },
            ]}
          />
        </div>
      ))}

      <button 
        onClick={addBag} 
        className="flex items-center gap-2 text-sm text-stone-500 border-2 border-dashed border-stone-200 hover:border-stone-400 hover:text-stone-800 rounded-lg p-5 justify-center transition-all bg-stone-50/30 font-medium"
      >
        <Plus size={18} /> {t('editor.items.add_container')}
      </button>
    </div>
  );
}
