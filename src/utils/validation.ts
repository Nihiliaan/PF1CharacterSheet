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
 * CodeMirror transaction filter based on InputType
 */
export const getTransactionFilter = (type: string) => {
  return (tr: Transaction): boolean => {
    if (!tr.docChanged) return true;
    const nextDoc = tr.newDoc.toString();
    return validateInput(nextDoc, type);
  };
};
