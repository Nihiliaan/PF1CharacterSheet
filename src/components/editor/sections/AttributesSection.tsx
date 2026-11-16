import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import SingleRowTable from '../../common/SingleRowTable';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';
import { ATTRIBUTE_NAMES } from '../../../schema/types';

const AttributesSection: React.FC = () => {
  const { t } = useTranslation();
  const { data, lastSavedData, update } = useCharacter();

  const tableData = React.useMemo(() => ({
    ...data.attributes,
    name: ATTRIBUTE_NAMES.map((_, i) => t('editor.attributes.' + i))
  }), [data.attributes, t]);

  const originalTableData = React.useMemo(() => ({
    ...lastSavedData.attributes,
    name: ATTRIBUTE_NAMES.map((_, i) => t('editor.attributes.' + i))
  }), [lastSavedData.attributes, t]);

  return (
    <Section id="attributes" title={t('editor.sections.attributes')}>
      <div className="mb-4">
        <DynamicTable
          path="attributes"
          data={tableData}
          originalData={originalTableData}
          onChange={newAttrs => {
            const { name, ...attributes } = newAttrs as any;
            update('attributes', attributes);
          }}
          readonlyColumns={['name']}
        />
      </div>
      {/* flex-wrap 替代 md:flex-row：并排阈值 = 两半各自 basis 之和（战技表 4 列×70 + 备注框 200），不足自动堆叠 */}
      <div className="flex flex-wrap gap-4 mt-4 items-stretch">
        <div className="flex-[1_1_280px] flex flex-col">
          {/* 组标签已删（2026-11-16 用户裁决）：与 SingleRowTable 表头完全重复 */}
          <div className="flex-1">
            <SingleRowTable
              path="combatManeuver"
              data={data.combatManeuver}
              originalData={lastSavedData.combatManeuver}
              onChange={v => update('combatManeuver', v)}
              minWidth="0"
            />
          </div>
        </div>
        <MultilineInput
          className="flex-[1_1_200px]"
          label={t('editor.combat.maneuver_notes')}
          path="combatManeuver.notes"
          value={data.combatManeuver.notes || ''}
          originalValue={lastSavedData.combatManeuver?.notes}
          onChange={v => update('combatManeuver.notes', v)}
          placeholder={t('editor.combat.maneuver_placeholder')}
          height="100%"
        />
      </div>
    </Section>
  );
};

export default AttributesSection;
