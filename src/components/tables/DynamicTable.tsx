import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { get, set } from 'lodash-es';

import DynamicInput from '../../controls/DynamicInput';
import { useCharacterStore } from '../../store/characterStore';
import { getHandlerByPath } from '../../schema/fieldRegistry';

export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  hideRightBorder?: boolean;
}

export interface DynamicTableProps {
  path?: string;
  columns?: ColumnConfig[];
  data?: any;
  onChange?: (data: any) => void;
  readOnly?: boolean;
  rowDraggable?: boolean;
  minWidth?: string;
}

// 可排序行组件
function SortableRow({ 
  id, 
  index, 
  columns, 
  path, 
  rawData, 
  readOnly, 
  fixedRows, 
  rowDraggable, 
  onRemove,
  getCellHandlerType 
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`group hover:bg-stone-50/50 transition-colors ${isDragging ? 'bg-white shadow-xl opacity-80' : ''}`}
    >
      {columns.map((c: any) => (
        <td
          key={`${id}-${c.key}`}
          className={`p-0 relative ${c.hideRightBorder ? '' : 'border-r border-stone-100'} last:border-r-0 align-top`}
        >
          <DynamicInput
            path={path ? `${path}.${c.key}[${index}]` : undefined}
            value={path ? undefined : rawData[c.key]?.[index]}
            type={getCellHandlerType(c.key, index) as any}
            readOnly={readOnly}
            className="hover:bg-primary/5 focus:bg-white"
          />
        </td>
      ))}
      {!readOnly && !fixedRows && (
        <td className="w-10 px-2 py-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            {rowDraggable && (
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab text-stone-300 hover:text-stone-500 p-1 active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-stone-300 hover:text-red-500 rounded p-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}

export default function DynamicTable(props: DynamicTableProps) {
  const { t } = useTranslation();
  const {
    path,
    columns: overrideColumns,
    data: overrideData,
    onChange: overrideOnChange,
    readOnly,
    rowDraggable = true,
    minWidth
  } = props;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tableHandler = path ? getHandlerByPath(path) : null;
  const columns: ColumnConfig[] = overrideColumns || tableHandler?.columns || [];
  const fixedRows = tableHandler?.fixedRows || false;

  const rawData = useCharacterStore(s => (path ? get(s.data, path) : overrideData) || {});
  const updateField = useCharacterStore(s => s.updateField);

  const rowCount = React.useMemo(() => {
    const values = Object.values(rawData);
    const firstArray = values.find(v => Array.isArray(v)) as any[];
    return firstArray ? firstArray.length : 0;
  }, [rawData]);

  // 为可视化排序生成的 ID 数组，必须保持与行数一致
  const [rowIds, setRowIds] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    // 根据行数重新同步 ID
    setRowIds(prevIds => {
      if (prevIds.length === rowCount) return prevIds;
      return Array.from({ length: rowCount }, (_, i) => `row-${i}-${Date.now()}`);
    });
  }, [rowCount]);

  const handleChange = (newData: any) => {
    if (overrideOnChange) {
      overrideOnChange(newData);
    } else if (path) {
      updateField(path, newData);
    }
  };

  const addRow = () => {
    const newData = { ...rawData };
    columns.forEach(col => {
      if (!Array.isArray(newData[col.key])) newData[col.key] = [];
      newData[col.key] = [...newData[col.key], ""];
    });
    handleChange(newData);
  };

  const removeRow = (index: number) => {
    const newData = { ...rawData };
    columns.forEach(col => {
      if (Array.isArray(newData[col.key])) {
        const newCol = [...newData[col.key]];
        newCol.splice(index, 1);
        newData[col.key] = newCol;
      }
    });
    handleChange(newData);
  };

  // SoA 核心排序逻辑
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rowIds.indexOf(active.id as string);
      const newIndex = rowIds.indexOf(over.id as string);

      const newData = { ...rawData };
      Object.keys(newData).forEach(key => {
        if (Array.isArray(newData[key])) {
          newData[key] = arrayMove(newData[key], oldIndex, newIndex);
        }
      });
      
      setRowIds(prev => arrayMove(prev, oldIndex, newIndex));
      handleChange(newData);
    }
  };

  const getCellHandlerType = (columnKey: string, index: number) => {
    if (!path) return 'text';
    const cellPath = `${path}.${columnKey}[${index}]`;
    const handler = getHandlerByPath(cellPath);
    return handler?.ui || 'text';
  };

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <table className="w-full border-collapse text-sm" style={{ minWidth: minWidth || '600px' }}>
          <thead>
            <tr className="border-b-2 border-stone-300">
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width }}
                  className={`py-2 px-3 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider ${
                    c.hideRightBorder ? '' : 'border-r border-stone-200'
                  } last:border-r-0`}
                >
                  {c.label}
                </th>
              ))}
              {!readOnly && !fixedRows && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
              {rowIds.map((id, index) => (
                <SortableRow
                  key={id}
                  id={id}
                  index={index}
                  columns={columns}
                  path={path}
                  rawData={rawData}
                  readOnly={readOnly}
                  fixedRows={fixedRows}
                  rowDraggable={rowDraggable}
                  onRemove={removeRow}
                  getCellHandlerType={getCellHandlerType}
                />
              ))}
            </SortableContext>
            {!fixedRows && !readOnly && (
              <tr>
                <td colSpan={columns.length + 1} className="p-0 bg-stone-50/50 hover:bg-stone-100 transition-colors">
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-700 px-3 py-2 w-full justify-center font-bold uppercase tracking-widest transition-colors"
                  >
                    <Plus size={12} /> {t('common.add_row')}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </DndContext>
    </div>
  );
}
