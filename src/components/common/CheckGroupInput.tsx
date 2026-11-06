import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * 二进制高低位打包规则：
 * 高 8 位代表上限 max (0 ~ 255)
 * 低 8 位代表打勾数 checks (0 ~ 255)
 */
export function encodeCheckGroup(checks: number, max: number): number {
  const safeMax = Math.max(0, Math.min(255, Math.floor(max || 0)));
  const safeChecks = Math.max(0, Math.min(safeMax, Math.floor(checks || 0)));
  return ((safeMax & 0xff) << 8) | (safeChecks & 0xff);
}

export function decodeCheckGroup(val: any): { checks: number; max: number } {
  const num = typeof val === 'number' ? val : (parseInt(String(val || 0), 10) || 0);
  if (num <= 0) return { checks: 0, max: 0 };
  const checks = num & 0xff;
  const max = (num >> 8) & 0xff;
  return { checks, max };
}

export interface CheckGroupInputProps {
  /**
   * 编码后的单整型数值：高 8 位为 max，低 8 位为 checks
   */
  value: number | string;
  /**
   * 触发更新，回传编码后的单整型数值
   */
  onChange: (newEncoded: number) => void;
  readOnly?: boolean;
  className?: string;
  isGM?: boolean;
  /**
   * 可选的手动覆盖上限（用于非打包的特殊场景，如无则默认由二进制高位解码）
   */
  overrideMax?: number;
  /**
   * 紧凑排版模式（缩小内边距与方框尺寸）
   */
  compact?: boolean;
  /**
   * 是否允许点击空白处编辑上限最大值（默认为：未指定 overrideMax 时为 true，指定 overrideMax 时为 false）
   */
  allowEditMax?: boolean;
}

export const CheckGroupInput: React.FC<CheckGroupInputProps> = ({
  value,
  onChange,
  readOnly = false,
  className,
  isGM = false,
  overrideMax,
  compact = false,
  allowEditMax
}) => {
  const { t } = useTranslation();
  const [isEditingMax, setIsEditingMax] = useState(false);

  // 若未显式传入 allowEditMax，当存在外部强制 overrideMax 时禁止编辑，否则允许编辑
  const canEditMax = allowEditMax !== undefined ? allowEditMax : (overrideMax === undefined);

  // 从单整数中解码 checks 与 max
  const decoded = decodeCheckGroup(value);
  const max = overrideMax !== undefined ? overrideMax : decoded.max;
  const count = decoded.checks;

  const [tempMaxStr, setTempMaxStr] = useState(String(max || ''));

  const handleSaveMax = () => {
    if (!canEditMax) {
      setIsEditingMax(false);
      return;
    }
    const parsed = parseInt(tempMaxStr, 10);
    const newMax = isNaN(parsed) ? 0 : Math.max(0, Math.min(255, parsed));
    const safeCount = Math.min(count, newMax);
    onChange(encodeCheckGroup(safeCount, newMax));
    setIsEditingMax(false);
  };

  if (isEditingMax && canEditMax) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-white px-2",
          compact ? "min-h-[22px]" : "min-h-[32px]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={tempMaxStr}
          onChange={(e) => setTempMaxStr(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveMax();
            if (e.key === 'Escape') setIsEditingMax(false);
          }}
          onBlur={handleSaveMax}
          autoFocus
          className="w-full h-full bg-transparent outline-none border-none p-0 m-0 text-center font-inherit text-xs text-stone-800"
          placeholder="0"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center select-none transition-colors",
        compact ? "gap-1 py-0 px-0.5 min-h-0" : "gap-1.5 w-full min-h-[32px] px-2 py-1",
        !readOnly && canEditMax && "cursor-pointer",
        className
      )}
      onClick={() => {
        if (readOnly || !canEditMax) return;
        setTempMaxStr(String(max || ''));
        setIsEditingMax(true);
      }}
      title={
        readOnly
          ? undefined
          : canEditMax
          ? t('editor.pfs.check_group_tooltip', '点击方框切换使用次数，点击空白处编辑上限次数')
          : undefined
      }
    >
      {max > 0 ? (
        <div className={cn("flex items-center flex-wrap justify-center", compact ? "gap-1" : "gap-1.5")}>
          {Array.from({ length: max }).map((_, idx) => {
            const isChecked = idx < count;
            return (
              <React.Fragment key={idx}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (readOnly) return;
                    const nextChecks = idx === count - 1 ? idx : idx + 1;
                    onChange(encodeCheckGroup(nextChecks, max));
                  }}
                  className={cn(
                    "border flex items-center justify-center transition-all",
                    compact ? "w-3.5 h-3.5 rounded-xs" : "w-4 h-4 rounded",
                    !readOnly && "cursor-pointer",
                    isChecked
                      ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                      : "bg-white border-stone-300 hover:border-amber-500 text-transparent"
                  )}
                  title={
                    isChecked
                      ? `(${idx + 1}/${max}) - ${t('common.cancel', '取消')}`
                      : `(${idx + 1}/${max}) - ${t('common.check', '勾选')}`
                  }
                >
                  {isChecked && <Check size={compact ? 10 : 12} strokeWidth={3} className="text-white" />}
                </button>
                {isGM && idx === 2 && (
                  <span className="text-stone-400 font-bold px-0.5 select-none text-[10px]">/</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <span className="text-stone-300 text-xs select-none">—</span>
      )}
    </div>
  );
};

export default CheckGroupInput;
