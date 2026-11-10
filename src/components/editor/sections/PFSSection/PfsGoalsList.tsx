// 文件职责：PFS 模块——势力任务卡面板内的“势力任务目标”勾选清单（含重置按钮与达成徽标）
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scroll, RotateCcw, CheckCircle2 } from 'lucide-react';
import CheckGroupInput, { decodeCheckGroup } from '../../../common/CheckGroupInput';
import { FactionDef, getLocalizedFactionText } from '../../../../database/pfsFactions';
import { PfsGoalItem } from '../../../../schema/types';

interface PfsGoalsListProps {
  goals: PfsGoalItem[];
  factionDef: FactionDef;
  onResetGoals: () => void;
  onGoalsChange: (goals: PfsGoalItem[]) => void;
}

const PfsGoalsList: React.FC<PfsGoalsListProps> = ({
  goals,
  factionDef,
  onResetGoals,
  onGoalsChange
}) => {
  const { t, i18n } = useTranslation();

  // 获取目标显示文本（语言自适应）
  const getGoalDisplayText = (goal: PfsGoalItem) => {
    const stdGoal = factionDef.goals.find(g => g.id === goal.id);
    if (stdGoal) {
      return getLocalizedFactionText(stdGoal.text, i18n.language);
    }
    return '';
  };

  // 检查目标达成状态：GM 满 5 格为 2，满 3 格为 1；普通达到 maxChecks
  const getGoalCompletionStatus = (goal: PfsGoalItem) => {
    const count = goal.checkedCount || 0;
    const isGM = goal.id?.endsWith('_gm');
    if (isGM) {
      if (count >= 5) return 'completed_x2';
      if (count >= 3) return 'completed';
      return 'none';
    }
    return count >= (goal.maxChecks || 1) ? 'completed' : 'none';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
          <Scroll size={14} className="text-stone-500" />
          <span>{t('editor.pfs.goals_checklist_title')}</span>
        </h5>
        <button
          type="button"
          onClick={onResetGoals}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-stone-500 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 rounded transition-colors cursor-pointer"
          title={t('editor.pfs.reset_goals')}
        >
          <RotateCcw size={11} />
          <span>{t('editor.pfs.reset_goals')}</span>
        </button>
      </div>

      {/* 统一紧凑段落容器 */}
      <div className="bg-white border border-stone-200 rounded-md overflow-hidden divide-y divide-stone-100 text-sm shadow-2xs">
        {goals.map((goal, goalIdx) => {
          const status = getGoalCompletionStatus(goal);
          const isCompleted = status !== 'none';
          const maxChecks = goal.maxChecks || 1;
          const checkedCount = goal.checkedCount || 0;
          const isGM = goal.id?.endsWith('_gm');

          return (
            <div
              key={goal.id || goalIdx}
              className={`px-2.5 py-1.5 flex items-start gap-2.5 transition-colors ${
                isCompleted
                  ? 'bg-amber-50/40 text-stone-900'
                  : 'hover:bg-stone-50/70 text-stone-700'
              }`}
            >
              {/* 紧凑打勾控件 */}
              <div className="shrink-0 pt-0.5">
                <CheckGroupInput
                  value={checkedCount}
                  overrideMax={maxChecks}
                  isGM={isGM}
                  compact={true}
                  allowEditMax={false}
                  onChange={(newEncoded) => {
                    const { checks } = decodeCheckGroup(newEncoded);
                    const nextGoals = [...goals];
                    nextGoals[goalIdx] = { ...nextGoals[goalIdx], checkedCount: checks };
                    onGoalsChange(nextGoals);
                  }}
                />
              </div>

              {/* 目标文本 */}
              <div className="flex-1 text-sm leading-relaxed pt-0.5">
                <span className={isCompleted ? 'font-medium text-stone-900' : 'text-stone-700'}>
                  {getGoalDisplayText(goal)}
                </span>
              </div>

              {/* 达成徽标 */}
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                {status === 'completed_x2' && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 size={12} className="text-white" />
                    <span>{t('editor.pfs.goal_completed_badge_x2', '达成×2')}</span>
                  </span>
                )}
                {status === 'completed' && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-amber-700" />
                    <span>{t('editor.pfs.goal_completed_badge')}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PfsGoalsList;
