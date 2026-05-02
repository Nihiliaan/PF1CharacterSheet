export const getDisplayValue = (
  value: any,
  type: string,
  t: any,
  options: {
    isFocused?: boolean;
    displayFormatter?: (v: any, ...args: any[]) => string;
    formatterArgs?: any[];
  } = {}
): string => {
  const { isFocused, displayFormatter, formatterArgs = [] } = options;

  if (displayFormatter) return displayFormatter(value, isFocused || false, ...formatterArgs);

  if (type === 'bool') {
    return (value === true || value === 'true') ? `✓` : '';
  }

  if (type === 'quantity' && !isFocused) {
    if (!value || value === '1') return '';
    return `×${value}`;
  }

  if (type === 'bonus' && !isFocused && value !== '') {
    const num = parseInt(value);
    if (!isNaN(num)) return num >= 0 ? `+${num}` : num.toString();
  }

  if (type === 'level' && !isFocused && value !== '') {
    return t('editor.lists.level_format', { n: value });
  }

  if (type === 'distance' && !isFocused && value !== '') {
    return t('editor.lists.distance_format', { v: value });
  }

  if (type === 'cost' && !isFocused) {
    if (!value) return '—';
    return `${value}${t('editor.items.units.gp') || 'gp'}`;
  }

  if (type === 'weight' && !isFocused) {
    if (!value) return '—';
    return `${value}${t('editor.items.units.lbs') || 'lbs'}`;
  }

  if (value === '' || value === undefined || value === null) return '';
  return String(value);
};
