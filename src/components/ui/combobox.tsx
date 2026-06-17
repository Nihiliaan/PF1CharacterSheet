import * as React from "react"
import { Check, Plus, ChevronRight, ChevronDown, X } from "lucide-react"

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

  // 检查某个选项（或其子项）是否匹配搜索词
  const hasMatchingChild = React.useCallback((option: ComboboxOption, search: string): boolean => {
    if (!search) return true;
    if (option.label.toLowerCase().includes(search.toLowerCase())) return true;
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
            "flex h-full min-h-[32px] items-center cursor-pointer transition-colors",
            !disablePadding && "px-2 py-1",
            !singleLine && "w-full",
            singleLine && "w-max min-w-full whitespace-nowrap",
            !isCentered && "justify-between",
            isCentered && "justify-center",
            !singleLine && "overflow-hidden",
            className
          )}
        >
          <div className={cn(
            "flex items-center",
            !singleLine && "flex-wrap overflow-hidden",
            singleLine && "flex-nowrap",
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
          />
          <CommandList className="max-h-[350px] overflow-y-auto custom-scrollbar">
            
            {/* 1. 搜索提示：使用自定义内容 */}
            {allowCustom && searchValue && !flattenedPresetValues.some(v => v === searchValue) && (
              <CommandGroup>
                <CommandItem
                  value={searchValue}
                  onSelect={() => handleSelect(searchValue)}
                  className="justify-start italic text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  使用自定义: "{searchValue}"
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
