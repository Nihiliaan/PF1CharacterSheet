// 文件职责：PFS 模块——基础概览面板（势力选择、PFS 编号、XP、Fame、Prestige 等基础字段）
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import InlineInput from '../../../common/InlineInput';
import {
  PFS_FACTION_ENUM,
  getLocalizedFactionText
} from '../../../../database/pfsFactions';
import { PfsData, CharacterData } from '../../../../schema/types';

interface PfsBasicFieldsProps {
  pfs: PfsData;
  lastSavedData: CharacterData;
  effectiveFactionId: number;
  hasChronicles: boolean;
  computedFame: number;
  isPfsActive: boolean;
  update: (path: string, val: any) => void;
  onFactionChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDisablePFS: () => void;
}

const PfsBasicFields: React.FC<PfsBasicFieldsProps> = ({
  pfs,
  lastSavedData,
  effectiveFactionId,
  hasChronicles,
  computedFame,
  isPfsActive,
  update,
  onFactionChange,
  onDisablePFS
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-stone-50/80 border border-stone-200 rounded-lg p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-stone-200 gap-3">
        <div className="flex items-center gap-2 text-stone-800 font-bold text-base">
          <Shield size={18} className="text-amber-700" />
          <span>{t('editor.pfs.title')}</span>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-stone-500 ml-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPfsActive}
                  onChange={e => {
                    if (!e.target.checked) onDisablePFS();
                  }}
                  className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                />
                <span>{t('editor.pfs.enable_pfs')}</span>
              </label>
            </div>
        </div>
      </div>

          <div className="grid grid-cols-12 gap-4">
            {/* 势力选择：有记录单时锁定，无记录单时允许选择初始势力 */}
            <div className="col-span-12 sm:col-span-6 md:col-span-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.faction')}</span>
                {hasChronicles && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-medium">
                    由最新记录单锁定
                  </span>
                )}
              </div>
              <select
                value={effectiveFactionId}
                disabled={hasChronicles}
                onChange={onFactionChange}
                title={hasChronicles ? "角色势力已根据最新记录单自动确定，无法手动修改" : "新角色无记录单时可自由选择初始势力"}
                className="w-full h-[34px] px-3 bg-white disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed border border-stone-300 rounded text-sm text-stone-800 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition-colors"
              >
                {PFS_FACTION_ENUM.filter(f => (!f.retired && f.id > 0) || f.id === effectiveFactionId).map(f => (
                  <option key={f.id} value={f.id}>
                    {getLocalizedFactionText(f.name, i18n.language)}
                  </option>
                ))}
              </select>
            </div>

            {/* PFS 编号：拆分为 [ 玩家编号 ] — [ 角色编号 ]，均限制正整数 */}
            <div className="col-span-12 sm:col-span-6 md:col-span-4 flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.pfs_number', 'PFS 编号')}</span>
              <div className="flex items-center gap-1.5 h-[34px]">
                <input
                  type="text"
                  value={pfs.playerNumber || ''}
                  onChange={e => update('pfs.playerNumber', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('editor.pfs.player_no_placeholder', '玩家编号')}
                  className="w-full h-full px-2.5 bg-white border border-stone-300 rounded text-sm text-stone-800 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
                <span className="text-stone-400 font-bold select-none">—</span>
                <input
                  type="text"
                  value={pfs.characterNumber || ''}
                  onChange={e => update('pfs.characterNumber', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder={t('editor.pfs.char_no_placeholder', '角色')}
                  className="w-20 h-full px-2 bg-white border border-stone-300 rounded text-sm text-stone-800 text-center focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>

            {/* 当前经验 (XP)：允许手动输入与滚轮步进，支持半整数 */}
            <InlineInput
              className="col-span-4 sm:col-span-4 md:col-span-4"
              label={t('editor.pfs.xp')}
              value={pfs.xp ?? 0}
              path="pfs.xp"
              originalValue={lastSavedData.pfs?.xp ?? 0}
              onChange={v => update('pfs.xp', v)}
              type="halfInt"
            />

            {/* 累积声誉 (Fame)：由所有记录单获得的声望点自动汇总，禁止手动输入 */}
            <div className="col-span-4 sm:col-span-4 md:col-span-4 flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-600">{t('editor.pfs.fame')}</span>
              <div className="w-full h-[34px] px-3 bg-stone-100/80 border border-stone-200 rounded flex items-center justify-between" title="由所有记录单获得的声望点（Prestige）自动汇总，无需手动输入">
                <span className="font-mono font-bold text-stone-900 text-sm">{computedFame}</span>
                <span className="text-[10px] text-stone-400">声望总额累计</span>
              </div>
            </div>

            {/* 可用声望 (Prestige) */}
            <InlineInput
              className="col-span-4 sm:col-span-4 md:col-span-4"
              label={t('editor.pfs.prestige')}
              value={pfs.prestige ?? 0}
              path="pfs.prestige"
              originalValue={lastSavedData.pfs?.prestige ?? 0}
              onChange={v => update('pfs.prestige', v)}
              type="halfInt"
            />
          </div>
        </div>
  );
};

export default PfsBasicFields;
