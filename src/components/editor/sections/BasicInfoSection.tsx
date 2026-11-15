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
      {/* flex-wrap 替代 md:flex-row：并排阈值 = 头像列 + 表单并排需求 + 间距，
          栏宽不足时头像自动换行到表单下方，零断点。
          字段行同样 flex-wrap：成对字段 basis=50%-半间距、三连字段 basis=33.333%-半间距，
          各字段自带 88px 最小宽（InlineInput），宽度不足时按行内最小宽自动换行。
          紧凑化（2026-11-16 用户裁决）：InlineInput 改左右排版后字段高度减半，间距同步收紧，
          头像列 256→224px */}
      <div className="flex flex-wrap items-stretch gap-x-4 gap-y-2.5">
        <div className="flex-[1_1_200px] flex flex-wrap gap-x-2.5 gap-y-2 content-start">
          <InlineInput
            className="basis-[calc(50%-6px)] grow font-bold"
            label={t('editor.basic.name')}
            value={data.basic.name}
            path="basic.name"
            originalValue={lastSavedData.basic.name}
            onChange={v => update('basic.name', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow font-bold"
            label={t('editor.basic.classes')}
            value={data.basic.classes}
            path="basic.classes"
            originalValue={lastSavedData.basic.classes}
            onChange={v => update('basic.classes', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.alignment')}
            value={data.basic.alignment}
            path="basic.alignment"
            originalValue={lastSavedData.basic.alignment}
            onChange={v => update('basic.alignment', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.deity')}
            value={data.basic.deity || ''}
            path="basic.deity"
            originalValue={lastSavedData.basic.deity || ''}
            onChange={v => update('basic.deity', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.size')}
            value={data.basic.size}
            path="basic.size"
            originalValue={lastSavedData.basic.size}
            onChange={v => update('basic.size', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.gender')}
            value={data.basic.gender}
            path="basic.gender"
            originalValue={lastSavedData.basic.gender}
            onChange={v => update('basic.gender', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.race')}
            value={data.basic.race}
            path="basic.race"
            originalValue={lastSavedData.basic.race}
            onChange={v => update('basic.race', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.type')}
            value={data.basic.type}
            path="basic.type"
            originalValue={lastSavedData.basic.type}
            onChange={v => update('basic.type', v)}
          />
          <InlineInput
            className="basis-[calc(66.666%-4px)] grow"
            label={t('editor.basic.subtype')}
            value={data.basic.subtype || []}
            path="basic.subtype"
            originalValue={lastSavedData.basic.subtype || []}
            onChange={v => update('basic.subtype', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.age')}
            value={data.basic.age}
            path="basic.age"
            originalValue={lastSavedData.basic.age}
            onChange={v => update('basic.age', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.height')}
            value={data.basic.height}
            path="basic.height"
            originalValue={lastSavedData.basic.height}
            onChange={v => update('basic.height', v)}
          />
          <InlineInput
            className="basis-[calc(33.333%-8px)] grow"
            label={t('editor.basic.weight')}
            value={data.basic.weight}
            path="basic.weight"
            originalValue={lastSavedData.basic.weight}
            onChange={v => update('basic.weight', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.speed')}
            value={data.basic.speed.land}
            path="basic.speed.land"
            originalValue={lastSavedData.basic.speed.land}
            onChange={v => update('basic.speed.land', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.senses')}
            value={data.basic.senses}
            path="basic.senses"
            originalValue={lastSavedData.basic.senses}
            onChange={v => update('basic.senses', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.initiative')}
            value={data.basic.initiative}
            path="basic.initiative"
            originalValue={lastSavedData.basic.initiative}
            onChange={v => update('basic.initiative', v)}
          />
          <InlineInput
            className="basis-[calc(50%-6px)] grow"
            label={t('editor.basic.perception')}
            value={data.basic.perception}
            path="basic.perception"
            originalValue={lastSavedData.basic.perception}
            onChange={v => update('basic.perception', v)}
          />
          <InlineInput
            className="basis-full grow"
            label={t('editor.basic.languages')}
            path="basic.languages"
            value={data.basic.languages}
            originalValue={lastSavedData.basic.languages}
            onChange={v => update('basic.languages', v)}
            align="left"
            singleLine={false}
          />
        </div>
        <div className="w-56 max-w-full shrink-0">
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
