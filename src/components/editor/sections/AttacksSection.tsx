import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const AttacksSection: React.FC = () => {
  const { t } = useTranslation();
  const {
    data,
    lastSavedData,
    update,
    tableActionMode,
    reorderRows,
    toggleTableActionMode,
    handleTableItemDrop
  } = useCharacter();

  // 近战/远程视为同一张表对齐：按列取两组内容的并集最长文本作为联合定宽行，
  // 传入两张表的 sizerRows（隐藏行）使它们的 auto 布局解析出相同的列宽
  const sizerRows = React.useMemo(() => {
    const meleeKeys = ['weapon', 'hit', 'damage', 'critRange', 'critMultiplier', 'touch', 'damageType', 'special'];
    const rangedKeys = ['weapon', 'hit', 'damage', 'critRange', 'critMultiplier', 'range', 'damageType', 'special'];
    const texts = (arr: any, k: string) => ((arr || {})[k] || []).map((v: any) => String(v ?? ''));
    const row = meleeKeys.map((_, idx) => {
      const k = meleeKeys[idx] === 'touch' ? 'range' : meleeKeys[idx];
      const pooled = [...texts(data.attacks?.melee, meleeKeys[idx]), ...texts(data.attacks?.ranged, k)];
      return pooled.sort((a, b) => b.length - a.length)[0] || '';
    });
    return [row];
  }, [data.attacks?.melee, data.attacks?.ranged]);

  return (
    <Section id="attacks" title={t('editor.sections.attacks')}>
      <div className="flex flex-col gap-0 border border-stone-300 rounded overflow-hidden shadow-sm">
        <div className="border-b border-stone-200">
          <DynamicTable
            minWidth="0"
            path="attacks.melee"
            data={data.attacks.melee}
            originalData={lastSavedData.attacks?.melee}
            onChange={v => update('attacks.melee', v)}
            rowDraggable={true}
            rowActionMode={tableActionMode}
            onRowActionModeToggle={toggleTableActionMode}
            onRowReorder={(from, to) => reorderRows('attacks.melee', from, to)}
            sizerRows={sizerRows}
          />
        </div>
        <DynamicTable
          minWidth="0"
          path="attacks.ranged"
          data={data.attacks.ranged}
          originalData={lastSavedData.attacks?.ranged}
          onChange={v => update('attacks.ranged', v)}
          rowDraggable={true}
          rowActionMode={tableActionMode}
          onRowActionModeToggle={toggleTableActionMode}
          onRowReorder={(from, to) => reorderRows('attacks.ranged', from, to)}
          sizerRows={sizerRows}
        />
      </div>
      <MultilineInput
        className="mt-6"
        label={t('editor.attacks.special_attacks')}
        path="attacks.specialAttacks"
        value={data.attacks.specialAttacks || ''}
        originalValue={lastSavedData.attacks.specialAttacks || ''}
        onChange={v => update('attacks.specialAttacks', v)}
        isAutoHeight={true}
      />
    </Section>
  );
};

export default AttacksSection;
