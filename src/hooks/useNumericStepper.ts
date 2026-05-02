import { useEffect, useRef } from 'react';

interface UseNumericStepperProps {
  value: string;
  onChange: (v: string) => void;
  type: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
}

/**
 * Hook to add mouse wheel stepper functionality to a component.
 * Specifically handles the 'level' type with 0-20 range.
 */
export function useNumericStepper({
  value,
  onChange,
  type,
  readOnly = false,
  min = 0,
  max = 20,
}: UseNumericStepperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use refs for value and onChange to keep the event listener stable
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || type !== 'level' || readOnly) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Only allow adjustment if we are focused
      if (!container.contains(document.activeElement)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? 1 : -1;
      const currentVal = parseInt(valueRef.current, 10) || 0;
      let newVal = currentVal + delta;
      
      if (newVal > max) newVal = max;
      if (newVal < min) newVal = min;
      
      onChangeRef.current(newVal.toString());
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, [type, readOnly, min, max]);

  return containerRef;
}
