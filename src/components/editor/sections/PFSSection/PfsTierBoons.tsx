// 文件职责：PFS 模块——势力任务卡面板内的“三档势力福利”列表（按目标完成数解锁）
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Sparkles, Lock } from 'lucide-react';
import CheckGroupInput, { decodeCheckGroup } from '../../../common/CheckGroupInput';
import { FactionDef, getLocalizedFactionText } from '../../../../database/pfsFactions';

interface PfsTierBoonsProps {
  factionDef: FactionDef;
  completedGoalsCount: number;
  factionBoonChecks?: Record<string, number>;
  onBoonChecksChange: (next: Record<string, number>) => void;
}

const PfsTierBoons: React.FC<PfsTierBoonsProps> = ({
  factionDef,
  completedGoalsCount,
  factionBoonChecks,
  onBoonChecksChange
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
          <Award size={14} className="text-amber-700" />
          <span>{t('editor.pfs.tier_1_boon')} / {t('editor.pfs.tier_2_boon')} / {t('editor.pfs.tier_3_boon')}</span>
        </h5>
        <span className="text-[11px] text-stone-400">
          {t('editor.pfs.completed_goals_count')}：{t('editor.pfs.goal_progress', { count: completedGoalsCount })}
        </span>
      </div>
      <div className="bg-white border border-stone-200 rounded-md overflow-hidden divide-y divide-stone-100 text-sm shadow-2xs">
        {factionDef.boons.map(b => {
          const isUnlocked = completedGoalsCount >= b.requiredGoals;
          const boonChecks = (factionBoonChecks && b.id && factionBoonChecks[b.id]) || 0;
          const hasLimit = typeof b.maxChecks === 'number' && b.maxChecks > 0;

          return (
            <div
              key={b.id || b.tier}
              className={`px-3 py-2 flex flex-col gap-1 transition-colors ${
                isUnlocked
                  ? 'bg-amber-50/40 text-stone-900'
                  : 'hover:bg-stone-50/70 text-stone-700'
              }`}
            >
              {/* 标题单独占一行 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {isUnlocked ? (
                    <Sparkles size={15} className="text-amber-600 shrink-0" />
                  ) : (
                    <Lock size={14} className="text-stone-400 shrink-0" />
                  )}

                  {/* 若该 Boon 拥有限定次数且已解锁，在名称前显示紧凑复选框 */}
                  {hasLimit && isUnlocked && b.id && (
                    <CheckGroupInput
                      value={boonChecks}
                      overrideMax={b.maxChecks}
                      compact={true}
                      allowEditMax={false}
                      onChange={(newEncoded) => {
                        const { checks } = decodeCheckGroup(newEncoded);
                        const nextBoonChecks = { ...(factionBoonChecks || {}), [b.id!]: checks };
                        onBoonChecksChange(nextBoonChecks);
                      }}
                    />
                  )}

                  <span className="font-bold text-sm text-stone-800">
                    {getLocalizedFactionText(b.name, i18n.language)}
                  </span>
                </div>

                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-500 text-white'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {isUnlocked
                    ? t('editor.pfs.unlocked')
                    : t('editor.pfs.locked', { count: b.requiredGoals })}
                </span>
              </div>

              {/* 福利效果描述（独立一行） */}
              <div className="text-sm leading-relaxed text-stone-600 pl-5">
                {getLocalizedFactionText(b.desc, i18n.language)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PfsTierBoons;
