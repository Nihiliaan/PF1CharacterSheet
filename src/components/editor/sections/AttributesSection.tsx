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
    name: ATTRIBUTE_NAMES.map(attr => t('editor.attributes.' + attr))
  }), [data.attributes, t]);

  const originalTableData = React.useMemo(() => ({
    ...lastSavedData.attributes,
    name: ATTRIBUTE_NAMES.map(attr => t('editor.attributes.' + attr))
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
      <div className="flex flex-col md:flex-row gap-6 mt-4 items-stretch">
        <div className="w-full md:w-1/2 flex flex-col">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex justify-between">
            {t('editor.attributes.combat_stats')}
            <span className="text-stone-400 font-normal">BAB / CMB / CMD</span>
          </label>
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
          className="w-full md:w-1/2"
          label={t('editor.attributes.maneuver_notes')}
          path="combatManeuver.notes"
          value={data.combatManeuver.notes || ''}
          originalValue={lastSavedData.combatManeuver?.notes}
          onChange={v => update('combatManeuver.notes', v)}
          placeholder={t('editor.attributes.maneuver_placeholder')}
          height="100%"
        />
      </div>
    </Section>
  );
};

export default AttributesSection;
