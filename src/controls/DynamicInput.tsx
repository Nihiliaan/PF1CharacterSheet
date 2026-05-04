import React from 'react';
import { getHandlerByPath } from '../schema/fieldRegistry';
import { useCharacterStore } from '../store/characterStore';
import { get } from 'lodash-es';
import { 
  TextControl, 
  NumericControl, 
  SelectControl, 
  CheckboxControl,
  TemplateProps
} from './uiTemplates';

// 模板映射表
const TEMPLATE_MAP: Record<string, React.FC<TemplateProps>> = {
  text: TextControl,
  number: NumericControl,
  select: SelectControl,
  bool: CheckboxControl
};

export interface DynamicInputProps {
  path?: string;
  value?: string;
  originalValue?: string;
  onChange?: (v: string) => void;
  className?: string; 
  wrapperClassName?: string;
  readOnly?: boolean;
  placeholder?: string;
  label?: string;
  singleLine?: boolean;
  [key: string]: any;
}

// 默认处理器，防止 handler 为空时崩溃
const DefaultHandler = {
  ui: 'text',
  validate: () => true,
  formatDisplay: (v: any) => v || '—',
  formatInteractive: (v: any) => v || '',
};

/**
 * 统一输入分发组件
 * 核心职责：根据 path 或 handler 自动选择合适的 UI 模板进行渲染
 */
const DynamicInput: React.FC<DynamicInputProps> = (props) => {
  const {
    path,
    value: overrideValue,
    originalValue: overrideOriginal,
    onChange: overrideOnChange,
    className,
    wrapperClassName,
    readOnly,
    placeholder,
    label,
    singleLine,
    ...rest
  } = props;

  const data = useCharacterStore(s => s.data);
  const updateField = useCharacterStore(s => s.updateField);

  // 1. 获取处理逻辑 (Handler)
  const handler = (path ? getHandlerByPath(path) : null) || DefaultHandler;
  
  // 2. 确定当前值
  const value = overrideValue !== undefined ? overrideValue : (path ? get(data, path) : '');
  const originalValue = overrideOriginal; // 暂时不支持从 store 获取原始值进行对比

  // 3. 处理变更回调
  const handleChange = (v: string) => {
    if (overrideOnChange) {
      overrideOnChange(v);
    } else if (path) {
      updateField(path, v);
    }
  };

  // 4. 选择渲染模板
  const templateName = handler.ui || 'text';
  const Template = TEMPLATE_MAP[templateName] || TextControl;

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName || ''}`}>
      {label && <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</label>}
      <Template
        handler={handler}
        value={value}
        originalValue={originalValue}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className={className}
        {...handler?.uiConfig}
        {...rest}
      />
    </div>
  );
};

export default DynamicInput;
