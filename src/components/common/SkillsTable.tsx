import React, { memo, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { DynamicTableProps } from '../../schema/types';
import { getHandlerByPath } from '../../schema/fieldRegistry';
import DynamicInput from './DynamicInput';
import { SkillCategory, SKILL_REGISTRY, CATEGORY_IDS, getSkillsByCategory } from '../../constants/skills';

// --- 子组件：技能行 ---
const SkillsTableRow = memo(({ 
  index: i, columns, data, originalData, path, readOnly, readonlyColumns, rowDraggable, rowActionMode, onRowDragStart, onRowDragOver, onRowDrop, updateData, removeRow, isGhost = false, onActivate, registryEntry, isDescriptionCol 
}: any) => {
  const { t } = useTranslation();
  
  const getCellPath = (basePath: string, index: number, key: string) => {
    if (!basePath || index === -1) return undefined;
    return `${basePath}.${key}[${index}]`;
  };

  const isRowDirty = () => {
    if (!originalData || i === -1) return false;
    return columns.some((c: any) => {
      const val = data[c.key]?.[i];
      const origVal = originalData[c.key]?.[i];
      return val !== origVal && String(val ?? '') !== String(origVal ?? '');
    });
  };

  const row: Record<string, any> = {};
  if (isGhost && registryEntry) {
    row.name = registryEntry.id;
    row.ability = registryEntry.defaultAbility;
    row.category = registryEntry.category;
  } else {
    columns.forEach((c: any) => { row[c.key] = data[c.key]?.[i]; });
  }

  const dirty = isRowDirty();
  const rowClass = isGhost ? "opacity-40 grayscale bg-stone-50/50" : (dirty ? 'bg-amber-100/30' : 'hover:bg-stone-50');
  const isFixedSkill = typeof row.name === 'number';

  return (
    <tr className={`transition-colors group border-b border-stone-200 ${rowClass}`}
      draggable={!isGhost && rowDraggable && rowActionMode === 'drag'}
      onDragStart={(e) => !isGhost && onRowDragStart?.(i, e)}
      onDragOver={(e) => !isGhost && onRowDragOver?.(i, e)}
      onDrop={(e) => !isGhost && onRowDrop?.(i, e)}
    >
      {columns.filter((c: any) => c.key !== 'category').map((c: any) => {
        const cellPath = getCellPath(path || '', i, c.key);
        const effectivePath = cellPath || `skills.${c.key}[0]`;
        const cellHandler = getHandlerByPath(effectivePath);

        const isNameColumn = c.key === 'name';
        const catId = row.category;
        
        // 核心逻辑转移至 Handler：调用 handler.isFixed 和 handler.getOptions
        const isActuallyReadOnly = readOnly || readonlyColumns?.includes(c.key) || 
                                   (isNameColumn && cellHandler?.isFixed?.(catId)) || 
                                   (isGhost && c.key === 'total');

        const options = (isNameColumn && cellHandler?.getOptions) ? cellHandler.getOptions(catId) : (c.options || cellHandler?.options);

        return (
          <td key={c.key} className={`p-0 relative align-top ${c.hideRightBorder ? '' : 'border-r last:border-r-0 border-stone-300'}`}>
            <DynamicInput
              value={typeof row[c.key] === 'number' ? row[c.key] : String(row[c.key] ?? '')}
              originalValue={i !== -1 ? originalData?.[c.key]?.[i] : undefined}
              onChange={(val) => { if (isGhost) onActivate?.(c.key, val); else updateData(i, c.key, val); }}
              path={effectivePath}
              readOnly={isActuallyReadOnly}
              columnKey={c.key}
              options={options}
              displayFormatter={c.displayFormatter}
              align={c.align || (isDescriptionCol(c.key, cellHandler) ? 'left' : 'center')}
              row={row}
              className={`${isActuallyReadOnly ? "font-medium bg-stone-100/50 text-stone-700" : "hover:bg-stone-100 focus:bg-white"} ${c.className || ''}`}
            />
          </td>
        );
      })}
      
      <td className="p-0 text-center align-middle w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors pointer-events-auto">
        <div className="flex items-center justify-center w-full h-[32px] opacity-0 group-hover:opacity-100 transition-opacity">
          {isGhost ? (
             <button onClick={() => onActivate?.()} className="text-green-600 hover:text-green-700 p-1" title={t('common.add')}><Plus size={16} /></button>
          ) : (
            rowDraggable && rowActionMode === 'drag' ? (
              <GripVertical size={16} className="text-stone-300 cursor-grab hover:text-stone-500" />
            ) : (
              <button type="button" onClick={() => removeRow(i)} className={`p-1 rounded transition-colors ${isFixedSkill ? 'text-stone-400 hover:text-stone-600' : 'text-stone-300 hover:text-red-500'}`} title={isFixedSkill ? t('common.hide') : t('common.delete')}>
                {isFixedSkill ? <Minus size={16} /> : <Trash2 size={16} />}
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  );
});

export default function SkillsTable(props: DynamicTableProps & { minWidth?: string, showAll?: boolean }) {
  const { path, columns: propsColumns, data, originalData, onChange, readonlyColumns, rowDraggable, rowActionMode = 'drag', onRowActionModeToggle, onRowDragStart, onRowDragOver, onRowDrop, readOnly = false, minWidth = '600px', showAll = false } = props;
  const { t } = useTranslation();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set([2, 3, 4, 5]));
  const tableHandler = path ? getHandlerByPath(path) : null;
  const columns = propsColumns || tableHandler?.columns || [];
  const visibleColumns = columns.filter((c: any) => c.key !== 'category');
  const rowCount = useMemo(() => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return 0;
    const firstKey = columns[0]?.key;
    if (!firstKey) return 0;
    const colData = (data as any)[firstKey];
    return Array.isArray(colData) ? colData.length : 0;
  }, [data, columns]);

  const toggleCategory = (catId: number) => {
    if (catId === SkillCategory.General || catId === SkillCategory.Trained) return;
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(catId)) newCollapsed.delete(catId); else newCollapsed.add(catId);
    setCollapsedCategories(newCollapsed);
  };

  const updateData = useCallback((index: number, key: string, value: any) => {
    if (readOnly) return;
    const newData = { ...data };
    const cellPath = `${path || ''}.${key}[${index}]`;
    const cellHandler = getHandlerByPath(cellPath);
    const finalValue = cellHandler?.update ? cellHandler.update(value) : value;
    if (!newData[key]) newData[key] = new Array(rowCount).fill('');
    const newColArray = [...newData[key]];
    newColArray[index] = finalValue;
    newData[key] = newColArray;
    onChange(newData);
  }, [data, path, rowCount, readOnly, onChange]);

  const addRow = (initialValues: Record<string, any> = {}) => {
    if (readOnly) return;
    const newData = { ...data };
    columns.forEach((c: any) => {
       if (!Array.isArray(newData[c.key])) newData[c.key] = new Array(rowCount).fill('');
       const cellPath = `${path || ''}.${c.key}[0]`;
       const cellHandler = getHandlerByPath(cellPath);
       let finalVal = initialValues[c.key];
       if (finalVal === undefined) {
         if (c.key === 'name' && initialValues.category !== undefined) {
            const registry = getSkillsByCategory(initialValues.category);
            if (registry.length > 0) finalVal = registry[0].id;
         }
         if (finalVal === undefined) finalVal = cellHandler?.getDefaultValue ? cellHandler.getDefaultValue() : '';
       }
       if (cellHandler?.update) finalVal = cellHandler.update(finalVal);
       newData[c.key] = [...newData[c.key], finalVal];
    });
    onChange(newData);
  };

  const removeRow = useCallback((index: number) => {
    if (readOnly) return;
    const newData = { ...data };
    Object.keys(newData).forEach(key => { if (Array.isArray(newData[key])) newData[key] = newData[key].filter((_: any, i: number) => i !== index); });
    onChange(newData);
  }, [data, readOnly, onChange]);

  const isDescriptionCol = (key: string, handler: any) => (handler?.ui === 'text' || handler?.ui === 'markdown' || ['desc', 'notes', 'special', 'content'].some(word => key.toLowerCase().includes(word)));

  const isTableDirty = useMemo(() => (originalData ? JSON.stringify(data) !== JSON.stringify(originalData) : false), [data, originalData]);

  const renderSingleRow = (idx: number, isGhost = false, registryEntry?: any) => (
    <SkillsTableRow key={isGhost ? `ghost-${registryEntry?.id}` : `row-${idx}`} index={isGhost ? -1 : idx} columns={columns} data={data} originalData={originalData} path={path} readOnly={readOnly} readonlyColumns={readonlyColumns} rowDraggable={!showAll && rowDraggable} rowActionMode={rowActionMode} onRowDragStart={onRowDragStart} onRowDragOver={onRowDragOver} onRowDrop={onRowDrop} updateData={updateData} removeRow={removeRow} isGhost={isGhost} registryEntry={registryEntry} onActivate={(key?: string, val?: any) => { const init: any = { category: registryEntry.category, name: registryEntry.id, ability: registryEntry.defaultAbility }; if (key) init[key] = val; addRow(init); }} isDescriptionCol={isDescriptionCol} />
  );

  return (
    <div className={`w-full rounded border transition-all ${isTableDirty ? 'bg-amber-100/50 border-amber-500 shadow-sm' : 'border-stone-300 bg-white'} overflow-x-auto`}>
      <table className="w-full border-collapse text-sm table-auto" style={{ minWidth }}>
        <thead>
          <tr className="bg-stone-200 text-stone-700">
            {visibleColumns.map((c: any) => (<th key={c.key} style={{ width: c.width }} className={`border-stone-300 px-2 py-1.5 text-center font-semibold whitespace-nowrap min-w-[60px] ${c.hideRightBorder ? '' : 'border-r last:border-r-0'}`}>{t(c.label)}</th>))}
            <th className="w-8 border-stone-300 relative group-hover:bg-stone-100 transition-colors pointer-events-auto">{!showAll && rowDraggable && onRowActionModeToggle && (<button type="button" onClick={onRowActionModeToggle} className="p-1.5 w-full flex justify-center text-stone-400 hover:text-stone-900 transition-colors">{rowActionMode === 'drag' ? <GripVertical size={16} /> : <Trash2 size={16} className="text-red-400 hover:text-red-500" />}</button>)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {!showAll ? Array.from({ length: rowCount }).map((_, i) => renderSingleRow(i)) : CATEGORY_IDS.map(catId => {
            const isCollapsed = collapsedCategories.has(catId);
            const canCollapse = catId > 1;
            const presentIndices: number[] = []; ((data as any).category || []).forEach((c: number, i: number) => { if (c === catId) presentIndices.push(i); });
            const registrySkills = getSkillsByCategory(catId);
            return (
              <React.Fragment key={catId}>
                <tr className="bg-stone-100/80 border-y border-stone-300 select-none">
                  <td colSpan={visibleColumns.length + 1} className="py-1 px-2">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 font-bold text-stone-600 ${canCollapse ? 'cursor-pointer hover:text-stone-900' : ''}`} onClick={() => toggleCategory(catId)}>{canCollapse && (isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />)}<span>{t(`editor.skills.categories.${catId}`)}</span></div>
                      {catId >= 3 && <button onClick={() => addRow({ category: catId })} className="p-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-600 transition-colors"><Plus size={14} /></button>}
                    </div>
                  </td>
                </tr>
                {!isCollapsed && (catId >= 3 ? (presentIndices.length > 0 ? presentIndices.map(idx => renderSingleRow(idx)) : <tr><td colSpan={visibleColumns.length + 1} className="py-2 text-center text-xs text-stone-400 italic">{t('common.none')}</td></tr>) : registrySkills.map(reg => { const dataIdx = presentIndices.find(idx => (data as any).name[idx] === reg.id); return renderSingleRow(dataIdx ?? -1, dataIdx === undefined, reg); }))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
