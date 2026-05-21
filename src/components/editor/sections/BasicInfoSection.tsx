import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import InlineInput from '../../common/InlineInput';
import MultilineInput from '../../common/MultilineInput';
import AvatarGallery from '../AvatarGallery';
import { useCharacter } from '../../../contexts/CharacterContext';

const BasicInfoSection: React.FC = () => {
  const { t } = useTranslation();
  const { data, lastSavedData, update } = useCharacter();

  return (
    <Section id="basic-info" title={t('editor.sections.basic')} className="max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 grid grid-cols-12 gap-y-4 gap-x-4">
          <InlineInput
            className="col-span-12 sm:col-span-6 font-bold"
            label={t('editor.basic.name')}
            value={data.basic.name}
            path="basic.name"
            originalValue={lastSavedData.basic.name}
            onChange={v => update('basic.name', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6 font-bold"
            label={t('editor.basic.classes')}
            value={data.basic.classes}
            path="basic.classes"
            originalValue={lastSavedData.basic.classes}
            onChange={v => update('basic.classes', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.alignment')}
            value={data.basic.alignment}
            path="basic.alignment"
            originalValue={lastSavedData.basic.alignment}
            onChange={v => update('basic.alignment', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.deity')}
            value={data.basic.deity || ''}
            path="basic.deity"
            originalValue={lastSavedData.basic.deity || ''}
            onChange={v => update('basic.deity', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.size')}
            value={data.basic.size}
            path="basic.size"
            originalValue={lastSavedData.basic.size}
            onChange={v => update('basic.size', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.gender')}
            value={data.basic.gender}
            path="basic.gender"
            originalValue={lastSavedData.basic.gender}
            onChange={v => update('basic.gender', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.race')}
            value={data.basic.race}
            path="basic.race"
            originalValue={lastSavedData.basic.race}
            onChange={v => update('basic.race', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.age')}
            value={data.basic.age}
            path="basic.age"
            originalValue={lastSavedData.basic.age}
            onChange={v => update('basic.age', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.height')}
            value={data.basic.height}
            path="basic.height"
            originalValue={lastSavedData.basic.height}
            onChange={v => update('basic.height', v)}
          />
          <InlineInput
            className="col-span-4"
            label={t('editor.basic.weight')}
            value={data.basic.weight}
            path="basic.weight"
            originalValue={lastSavedData.basic.weight}
            onChange={v => update('basic.weight', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.speed')}
            value={data.basic.speed.land}
            path="basic.speed.land"
            originalValue={lastSavedData.basic.speed.land}
            onChange={v => update('basic.speed.land', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.senses')}
            value={data.basic.senses}
            path="basic.senses"
            originalValue={lastSavedData.basic.senses}
            onChange={v => update('basic.senses', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.initiative')}
            value={data.basic.initiative}
            path="basic.initiative"
            originalValue={lastSavedData.basic.initiative}
            onChange={v => update('basic.initiative', v)}
          />
          <InlineInput
            className="col-span-12 sm:col-span-6"
            label={t('editor.basic.perception')}
            value={data.basic.perception}
            path="basic.perception"
            originalValue={lastSavedData.basic.perception}
            onChange={v => update('basic.perception', v)}
          />
          <MultilineInput
            className="col-span-12 mt-2"
            label={t('editor.basic.languages')}
            path="basic.languages"
            value={data.basic.languages}
            originalValue={lastSavedData.basic.languages}
            onChange={v => update('basic.languages', v)}
            isAutoHeight={true}
          />
        </div>
        <div className="w-full md:w-64">
          <AvatarGallery
            avatars={data.basic.avatars}
            onUpdate={(newAvatars) => update('basic.avatars', newAvatars)}
          />
        </div>
      </div>
    </Section>
  );
};

export default BasicInfoSection;
