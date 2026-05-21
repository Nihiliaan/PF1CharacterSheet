import React from 'react';
import { useTranslation } from 'react-i18next';
import Section from '../../common/Section';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';

const StorySection: React.FC = () => {
  const { t } = useTranslation();
  const { data, lastSavedData, update } = useCharacter();

  return (
    <Section id="story" title={t('editor.sections.story')}>
      <MultilineInput
        label={t('editor.sections.story')}
        path="story"
        value={data.story || ''}
        originalValue={lastSavedData.story || ''}
        onChange={v => update('story', v)}
        placeholder={t('editor.basic.story_placeholder')}
        height="100px"
      />
    </Section>
  );
};

export default StorySection;
