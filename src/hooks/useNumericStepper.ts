import { useEffect, useRef } from 'react';

interface UseNumericStepperProps {
  value: string;
  onChange: (v: string) => void;
  type: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
}

const STEP_CONFIG: Record<string, { step?: number; min?: number; max?: number }> = {
  level: { min: 1, max: 20 },
  distance: { step: 5, min: 0 },
  bonus: {},
  int: {},
  posInt: { min: 0 },
  quantity: { min: 1 },
};

/**
 * Hook to add mouse wheel stepper functionality to a component.
 * Supports various numeric types with specific ranges and steps.
 */
export function useNumericStepper({
  value,
  onChange,
  type,
  readOnly = false,
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
    const config = STEP_CONFIG[type] || {}; // Default to empty object if type is unhandled
    if (!container || readOnly) return;

    // Determine defaults
    const step = config.step ?? 1;
    const min = config.min ?? -Infinity;
    const max = config.max ?? Infinity;

    const handleWheelNative = (e: WheelEvent) => {
      if (!container.contains(document.activeElement)) return;

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -step : step;
      const currentVal = parseInt(valueRef.current, 10) || 0;
      let newVal = currentVal + delta;

      if (newVal > max) newVal = max;
      if (newVal < min) newVal = min;

      onChangeRef.current(newVal.toString());
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [type, readOnly]);

  return containerRef;
}
