import { useEffect, useRef } from 'react';

interface UseNumericStepperProps {
  value: string;
  onChange: (v: string) => void;
  type: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Hook to add mouse wheel stepper functionality to a component.
 * Supports various numeric types with specific ranges and steps.
 */
export function useNumericStepper({
  value,
  onChange,
  type,
  readOnly = false,
  min: propMin,
  max: propMax,
  step: propStep
}: UseNumericStepperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  useEffect(() => {
    const container = containerRef.current;

    // 只要提供了 step，我们就认为这是一个数值调整组件
    if (!container || readOnly || propStep === undefined) return;

    // Determine defaults
    const step = propStep;
    const min = propMin ?? -Infinity;
    const max = propMax ?? Infinity;

    const handleWheelNative = (e: WheelEvent) => {
      // 必须处于焦点状态且属于支持的类型
      if (!container.contains(document.activeElement)) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -step : step;
      const currentVal = parseFloat(valueRef.current) || 0;
      let newVal = currentVal + delta;

      if (newVal > max) newVal = max;
      if (newVal < min) newVal = min;

      // 如果结果是 NaN 或因为 delta 导致回到了 0 (且类型有最小值限制)，则处理
      if (isNaN(newVal)) newVal = (delta > 0 ? min : 0);

      onChangeRef.current(newVal.toString());
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [type, readOnly, propMin, propMax, propStep]);

  return containerRef;
}
