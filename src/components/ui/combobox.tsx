import * as React from "react"
import { Check, Plus, ChevronRight, ChevronDown, X } from "lucide-react"
import { toTraditional } from "../../i18n/config"

import { cn } from "../../lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export interface ComboboxOption {
  label: string;
  value: string | number;
  children?: ComboboxOption[];
  selectable?: boolean;
  keywords?: string[];
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string | number | (string | number)[]
  onSelect: (value: string | number | (string | number)[]) => void
  placeholder?: React.ReactNode
  emptyText?: string
  className?: string
  allowCustom?: boolean
  multiSelect?: boolean
  onOpenChange?: (open: boolean) => void
  singleLine?: boolean
  disablePadding?: boolean
}

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "Select...",
  emptyText = "No results found.",
  className,
  allowCustom = true,
  multiSelect = false,
  onOpenChange,
  singleLine = false,
  disablePadding = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }
  const [searchValue, setSearchValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  // 管理折叠状态，默认展开 'core'
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string | number>>(new Set(['core']))

  // 统一转为字符串进行比较，防止数字 ID 和字符串 ID 匹配失败
  const isSelected = (val: string | number) => {
    const strVal = String(val)
    if (Array.isArray(value)) {
      return value.map(String).includes(strVal)
    }
    return String(value) === strVal
  }

  const handleSelect = (val: string | number, stayOpen?: boolean) => {
    const valStr = String(val)
    if (multiSelect) {
      const currentValues = Array.isArray(value) ? [...value] : (value !== undefined && value !== null && value !== '' ? [value] : [])
      const strValues = currentValues.map(String)
      const index = strValues.indexOf(valStr)

      if (index > -1) {
        currentValues.splice(index, 1)
      } else {
        currentValues.push(val)
      }
      onSelect(currentValues)
      
      // 用户点击添加后，自动全选搜索框内容，方便直接键入下一个
      if (inputRef.current) {
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
      }
    } else {
      onSelect(val)
      if (!stayOpen) {
        setOpen(false)
        setSearchValue("")
      }
    }
  }

  const toggleGroup = (groupId: string | number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // 递归获取所有预设值，用于排除自定义项
  const flattenedPresetValues = React.useMemo(() => {
    const getValues = (opts: ComboboxOption[]): string[] => {
      return opts.reduce((acc: string[], opt) => {
        if (opt.children) {
          return [...acc, ...getValues(opt.children)]
        }
        return [...acc, String(opt.value)]
      }, [])
    }
    return getValues(options)
  }, [options])

  // 找出那些已被选中且是“真正自定义文本”的项
  const selectedCustomOptions = React.useMemo(() => {
    if (!allowCustom) return []
    const currentArr = Array.isArray(value) ? value : (value ? [value] : [])
    
    return currentArr.filter((v): v is string => {
        if (typeof v === 'number') return false;
        if (typeof v === 'string' && /^\d+$/.test(v)) return false;
        return !flattenedPresetValues.includes(String(v));
    })
  }, [value, flattenedPresetValues, allowCustom])

  // 收集所有具体可选项（用于跨语言匹配搜索词与批量解析）
  const selectableOptions = React.useMemo(() => {
    const list: ComboboxOption[] = [];
    const traverse = (opts: ComboboxOption[]) => {
      for (const opt of opts) {
        if (opt.selectable !== false && opt.value !== undefined && opt.value !== null) {
          list.push(opt);
        }
        if (opt.children) {
          traverse(opt.children);
        }
      }
    };
    traverse(options);
    return list;
  }, [options]);

  // 精确匹配选项（支持中/繁/英）
  const findExactMatchingOption = React.useCallback((token: string): ComboboxOption | undefined => {
    const raw = token.trim().toLowerCase();
    if (!raw) return undefined;
    const rawTrad = toTraditional(raw).toLowerCase();

    return selectableOptions.find(opt => {
      const l = opt.label.toLowerCase();
      const lTrad = toTraditional(opt.label).toLowerCase();
      if (l === raw || lTrad === raw || l === rawTrad || lTrad === rawTrad) return true;
      return opt.keywords?.some(kw => {
        const k = kw.toLowerCase();
        const kTrad = toTraditional(kw).toLowerCase();
        return k === raw || kTrad === raw || k === rawTrad || kTrad === rawTrad;
      });
    });
  }, [selectableOptions]);

  // 模糊/前缀/包含匹配选项
  const findMatchingOption = React.useCallback((token: string): ComboboxOption | undefined => {
    const raw = token.trim().toLowerCase();
    if (!raw) return undefined;
    const rawTrad = toTraditional(raw).toLowerCase();

    // 1. 优先精确匹配
    const exact = findExactMatchingOption(token);
    if (exact) return exact;

    // 2. 前缀或包含匹配
    return selectableOptions.find(opt => {
      const l = opt.label.toLowerCase();
      const lTrad = toTraditional(opt.label).toLowerCase();
      if (l.startsWith(raw) || lTrad.startsWith(raw) || l.startsWith(rawTrad) || l.includes(raw) || lTrad.includes(raw) || l.includes(rawTrad)) return true;
      return opt.keywords?.some(kw => {
        const k = kw.toLowerCase();
        const kTrad = toTraditional(kw).toLowerCase();
        return k.startsWith(raw) || kTrad.startsWith(raw) || k.startsWith(rawTrad) || k.includes(raw) || kTrad.includes(raw) || k.includes(rawTrad);
      });
    });
  }, [selectableOptions, findExactMatchingOption]);

  // 批量添加输入项（支持以中文逗号、顿号、英文逗号、分号切分）
  const handleBatchAdd = React.useCallback((text: string) => {
    const rawTokens = text.split(/[,，、;；\n]+/).map(t => t.trim()).filter(Boolean);
    if (rawTokens.length === 0) return;

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? [...value] : (value !== undefined && value !== null && value !== '' ? [value] : []);
      const currentValStrs = new Set(currentValues.map(String));

      for (const token of rawTokens) {
        const matched = findMatchingOption(token);
        const resolvedVal = matched ? matched.value : (allowCustom ? token : undefined);
        if (resolvedVal !== undefined && !currentValStrs.has(String(resolvedVal))) {
          currentValues.push(resolvedVal);
          currentValStrs.add(String(resolvedVal));
        }
      }

      onSelect(currentValues);
      setSearchValue("");
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    } else {
      const token = rawTokens[0];
      const matched = findMatchingOption(token);
      const resolvedVal = matched ? matched.value : (allowCustom ? token : undefined);
      if (resolvedVal !== undefined) {
        onSelect(resolvedVal);
        setOpen(false);
        setSearchValue("");
      }
    }
  }, [multiSelect, value, findMatchingOption, allowCustom, onSelect]);

  // 检查某个选项（或其子项）是否匹配搜索词（支持中英繁穿透，多词切分匹配）
  const hasMatchingChild = React.useCallback((option: ComboboxOption, search: string): boolean => {
    if (!search) return true;
    const parts = search.split(/[,，、;；\n]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return true;

    const matchPart = (text: string, part: string) => {
      const t = text.toLowerCase();
      const tTrad = toTraditional(text).toLowerCase();
      const pTrad = toTraditional(part).toLowerCase();
      return t.includes(part) || tTrad.includes(part) || t.includes(pTrad) || tTrad.includes(pTrad);
    };

    const isMatch = parts.some(part => {
      if (matchPart(option.label, part)) return true;
      if (option.keywords && option.keywords.some(kw => matchPart(kw, part))) return true;
      return false;
    });

    if (isMatch) return true;

    if (option.children) {
      return option.children.some(child => hasMatchingChild(child, search));
    }
    return false;
  }, []);

  // 递归渲染选项
  const renderOptions = (items: ComboboxOption[], level = 0) => {
    return items.map((option) => {
      // 如果处于搜索模式，且当前项及其子项都不匹配搜索词，则完全不渲染整个分支
      if (searchValue && !hasMatchingChild(option, searchValue)) {
        return null;
      }

      if (option.children && option.children.length > 0) {
        // 如果有搜索内容，则强制展开所有组
        const isExpanded = !!searchValue || expandedGroups.has(option.value)
        
        return (
          <CommandGroup 
            key={option.value} 
            heading={
              <div 
                className={cn(
                  "flex items-center gap-1 cursor-pointer hover:text-primary transition-colors py-1 -ml-1 w-full",
                  option.selectable && isSelected(option.value) && "text-primary font-bold"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const isExpanded = !!searchValue || expandedGroups.has(option.value);
                  
                  if (option.selectable) {
                    if (!isExpanded) {
                      // 未展开时：展开并选中
                      if (!expandedGroups.has(option.value)) toggleGroup(option.value);
                      handleSelect(option.value, true);
                    } else {
                      // 已展开时：仅切换折叠（保持选中）
                      toggleGroup(option.value);
                    }
                  } else {
                    // 不可选项：仅切换折叠
                    toggleGroup(option.value);
                  }
                }}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {option.label}
              </div>
            } 
            className={cn(level > 0 && "ml-2 border-l border-stone-100 pl-2")}
          >
            {isExpanded && renderOptions(option.children, level + 1)}
          </CommandGroup>
        )
      }

      const selected = isSelected(option.value)

      return (
        <CommandItem
          key={option.value}
          value={option.label}
          onSelect={() => handleSelect(option.value)}
          className={cn(
            "flex items-center justify-start gap-2",
            selected && "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
          )}
        >
          {option.label}
        </CommandItem>
      )
    })
  }

  const isCentered = className?.includes('text-center')

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex min-h-[32px] items-center cursor-pointer transition-colors",
            !singleLine ? "w-full h-auto" : "h-full w-max min-w-full whitespace-nowrap",
            !disablePadding && "px-2 py-1",
            !isCentered && "justify-between",
            isCentered && "justify-center",
            className
          )}
        >
          <div className={cn(
            "flex items-center",
            !singleLine ? "flex-wrap w-full" : "flex-nowrap",
            "gap-1",
            isCentered ? "justify-center" : "flex-1"
          )}>
            {placeholder}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 border-stone-200 bg-paper shadow-lg overflow-hidden" 
        style={{ width: 'max(var(--radix-popover-trigger-width), 240px)' }}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput 
            ref={inputRef}
            placeholder="Search..." 
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const raw = searchValue.trim();
                if (!raw) return;
                const hasSeparator = /[,，、;；\n]/.test(raw);
                const exactMatch = findExactMatchingOption(raw);
                if (hasSeparator || exactMatch || (!findMatchingOption(raw) && allowCustom)) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBatchAdd(raw);
                }
              }
            }}
          />
          <CommandList className="max-h-[350px] overflow-y-auto custom-scrollbar">
            
            {/* 1. 搜索提示：使用自定义内容或批量添加 */}
            {allowCustom && searchValue && !flattenedPresetValues.some(v => v === searchValue) && (
              <CommandGroup>
                <CommandItem
                  value={searchValue}
                  onSelect={() => handleBatchAdd(searchValue)}
                  className="justify-start italic text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {/[,，、;；\n]/.test(searchValue)
                    ? `批量添加: "${searchValue}"`
                    : `使用自定义: "${searchValue}"`}
                </CommandItem>
              </CommandGroup>
            )}

            {/* 2. 已选中的自定义项 (多选模式下显示，供删除) */}
            {multiSelect && selectedCustomOptions.length > 0 && (
              <CommandGroup heading="已选自定义">
                {selectedCustomOptions.map((v) => (
                  <CommandItem
                    key={`custom-${v}`}
                    value={String(v)}
                    onSelect={() => handleSelect(v)}
                    className="bg-primary/5 text-primary font-semibold hover:bg-primary/15"
                  >
                    {v}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* 3. 递归渲染所有分组选项 */}
            {renderOptions(options)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
