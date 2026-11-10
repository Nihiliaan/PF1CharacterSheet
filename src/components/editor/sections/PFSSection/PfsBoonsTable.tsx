// 文件职责：PFS 模块——特惠卡 (Boons) 动态表格（支持行拖拽/删除模式切换）
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award } from 'lucide-react';
import DynamicTable from '../../../common/DynamicTable';

interface PfsBoonsTableProps {
  data: Record<string, any>;
  originalData?: Record<string, any>;
  rowActionMode: 'drag' | 'delete';
  onRowActionModeToggle: () => void;
  onRowDragStart: (index: number, e: any) => void;
  onRowDragOver: (index: number, e: any) => void;
  onRowDrop: (index: number, e: any) => void;
  onChange: (data: Record<string, any>) => void;
}

const PfsBoonsTable: React.FC<PfsBoonsTableProps> = ({
  data,
  originalData,
  rowActionMode,
  onRowActionModeToggle,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  onChange
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
        <Award size={16} className="text-amber-700" />
        <span>{t('editor.pfs.boons_title')}</span>
      </h4>
      <DynamicTable
        path="pfs.boons"
        data={data}
        originalData={originalData}
        onChange={onChange}
        rowDraggable={true}
        rowActionMode={rowActionMode}
        onRowActionModeToggle={onRowActionModeToggle}
        onRowDragStart={onRowDragStart}
        onRowDragOver={onRowDragOver}
        onRowDrop={onRowDrop}
      />
    </div>
  );
};

export default PfsBoonsTable;
