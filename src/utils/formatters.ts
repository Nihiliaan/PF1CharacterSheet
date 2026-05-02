export const getDisplayValue = (
  value: string,
  type: string,
  t: any,
  options: {
    isFocused?: boolean;
    columnKey?: string;
    row?: any;
    displayFormatter?: (v: string, isFocused: boolean) => string;
  } = {}
): string => {
  const { isFocused, columnKey, row, displayFormatter } = options;

  if (displayFormatter) return displayFormatter(value, isFocused || false);

  if (type === 'checkbox') {
    if (columnKey === 'cs' && row && (parseInt(row.rank) || 0) <= 0) return '';
    return value === 'true' ? `+3` : '';
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
