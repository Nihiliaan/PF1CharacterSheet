import { Transaction } from "@codemirror/state";

export const REGEX_PATTERNS = {
  posInt: /^\d*$/,
  int: /^-?\d*$/,
  float: /^-?\d*\.?\d*$/,
};

export const validateInput = (value: string, type: string): boolean => {
  if (value === '') return true;
  
  switch (type) {
    case 'posInt':
    case 'quantity':
      return REGEX_PATTERNS.posInt.test(value);
    case 'int':
    case 'bonus':
      return REGEX_PATTERNS.int.test(value);
    case 'float':
      return REGEX_PATTERNS.float.test(value);
    default:
      return true;
  }
};

/**
 * Normalizes numeric input strings (removes leading zeros, handles empty strings)
 */
export const normalizeValue = (value: string, type: string): string => {
  if (value === '') return '';
  
  if (type === 'posInt' || type === 'int' || type === 'bonus' || type === 'quantity') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? '' : parsed.toString();
  }
  
  if (type === 'float') {
    // Avoid stripping trailing decimal points while typing (e.g., "1.")
    if (value.endsWith('.')) return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? '' : value; // Keep string as is to allow typing "0.0"
  }
  
  return value;
};

/**
 * CodeMirror transaction filter based on InputType
 */
export const getTransactionFilter = (type: string) => {
  return (tr: Transaction): boolean => {
    if (!tr.docChanged) return true;
    const nextDoc = tr.newDoc.toString();
    return validateInput(nextDoc, type);
  };
};
