import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, GripVertical, Trash2, ChevronDown, FileText, Table as TableIcon, Image as ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';
import Section from '../../common/Section';
import DynamicTable from '../../common/DynamicTable';
import MultilineInput from '../../common/MultilineInput';
import { useCharacter } from '../../../contexts/CharacterContext';
import { useUI } from '../../../contexts/UIContext';
import { AdditionalBlock } from '../../../schema/types';

interface ImageBlockPreviewProps {
  url: string;
  caption?: string;
  onUrlChange: (url: string) => void;
  onCaptionChange: (caption: string) => void;
}

const ImageBlockPreview: React.FC<ImageBlockPreviewProps> = ({
  url,
  caption,
  onUrlChange,
  onCaptionChange
}) => {
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
            图片链接 (URL)
          </label>
          <input
            className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none bg-white border-stone-200 hover:border-stone-300 focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition-colors"
            value={url || ''}
            onChange={(e) => {
              setLoadError(false);
              onUrlChange(e.target.value);
            }}
            placeholder="https://example.com/image.png"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
            图注 / 说明 (可选)
          </label>
          <input
            className="w-full border rounded-lg px-3 py-1.5 text-sm outline-none bg-white border-stone-200 hover:border-stone-300 focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition-colors"
            value={caption || ''}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="例如：阵营徽标、随从立绘、地图示意..."
          />
        </div>
      </div>

      {url ? (
        <div className="relative group border border-stone-200 rounded-lg p-3 bg-stone-100/40 flex flex-col items-center justify-center min-h-[140px]">
          {loadError ? (
            <div className="flex flex-col items-center justify-center text-stone-400 gap-1.5 py-6">
              <AlertCircle size={28} className="text-amber-500" />
              <span className="text-xs text-stone-500">图片无法加载，请检查图片链接是否正确或是否存在跨域防盗链限制</span>
            </div>
          ) : (
            <div className="relative max-w-full flex flex-col items-center">
              <img
                src={url}
                alt={caption || '附加图片'}
                onError={() => setLoadError(true)}
                className="max-h-80 max-w-full object-contain rounded border border-stone-200 shadow-sm bg-white"
                loading="lazy"
              />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 bg-stone-900/70 hover:bg-stone-900 text-white rounded px-2 py-1 text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="新窗口打开原图"
              >
                <ExternalLink size={12} />
                <span>原图</span>
              </a>
              {caption && (
                <div className="text-xs text-stone-600 font-medium italic mt-2 text-center max-w-lg break-words">
                  {caption}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-stone-300 rounded-lg p-6 text-center text-xs text-stone-400 bg-stone-50/50">
          输入上方图片链接即可在此实时预览
        </div>
      )}
    </div>
  );
};

const AdditionalDataSection: React.FC = () => {
  const { t } = useTranslation();
  const { setConfirmModal } = useUI();
  const {
    data,
    lastSavedData,
    update,
    dragEnabledFor,
    setDragEnabledFor,
    tableActionMode,
    toggleTableActionMode,
    handleDragStart,
    handleDragOver,
    handleDrop,
    removeAdditionalBlock,
    addAdditionalBlock,
    handleTableItemDragStart,
    handleTableItemDragOver,
    handleTableItemDrop
  } = useCharacter();

  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedBlocks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const additionalList: AdditionalBlock[] = Array.isArray(data.additionalData) ? data.additionalData : [];

  return (
    <Section id="additional-data" title={t('editor.sections.additional')}>
      <div className="flex flex-col gap-6">
        {additionalList.map((block, i) => {
          const isCollapsed = Boolean(collapsedBlocks[block.id]);

          return (
            <div
              key={block.id}
              className="border border-stone-200 rounded-xl p-4 bg-white shadow-sm transition-all hover:border-stone-300"
              draggable={dragEnabledFor === block.id}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id, 'additionalData')}
              onDrop={(e) => handleDrop(e, block.id, 'additionalData')}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  onMouseEnter={() => setDragEnabledFor(block.id)}
                  onMouseLeave={() => setDragEnabledFor(null)}
                  className="cursor-move text-stone-400 hover:text-stone-600 px-0.5 transition-colors"
                  title="按住拖拽排序"
                >
                  <GripVertical size={18} />
                </div>

                <button
                  type="button"
                  onClick={() => toggleCollapse(block.id)}
                  className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition-colors"
                  title={isCollapsed ? "展开模块" : "折叠模块"}
                >
                  <ChevronDown size={18} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>

                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {block.type === 'text' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                      <FileText size={12} />
                      <span>文本</span>
                    </span>
                  )}
                  {block.type === 'table' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                      <TableIcon size={12} />
                      <span>表格</span>
                    </span>
                  )}
                  {block.type === 'image' && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                      <ImageIcon size={12} />
                      <span>图片</span>
                    </span>
                  )}
                </div>

                <input
                  className="text-base font-bold font-serif bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-500 outline-none px-1 py-0.5 flex-1 text-stone-800 transition-colors"
                  value={block.title || ''}
                  onChange={e => update(`additionalData[${i}].title`, e.target.value)}
                  placeholder="模块标题..."
                />

                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      title: t('common.confirm_delete_container'),
                      onConfirm: () => removeAdditionalBlock(block.id)
                    });
                  }}
                  className="text-stone-400 hover:text-red-500 text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors"
                  title={t('common.delete_container')}
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">{t('common.delete_container')}</span>
                </button>
              </div>

              {!isCollapsed && (
                <div className="mt-2">
                  {block.type === 'text' ? (
                    <MultilineInput
                      label={t('editor.lists.content')}
                      path={`additionalData[${i}].content`}
                      value={block.content || ''}
                      originalValue={lastSavedData.additionalData?.[i]?.content}
                      onChange={v => update(`additionalData[${i}].content`, v)}
                      placeholder="支持 Markdown 格式文本内容..."
                      height="auto"
                      isAutoHeight={true}
                      className="min-h-[96px]"
                    />
                  ) : block.type === 'image' ? (
                    <ImageBlockPreview
                      url={block.url || ''}
                      caption={block.caption || ''}
                      onUrlChange={v => update(`additionalData[${i}].url`, v)}
                      onCaptionChange={v => update(`additionalData[${i}].caption`, v)}
                    />
                  ) : (
                    <DynamicTable
                      path={`additionalData[${i}].tableData`}
                      columns={block.columns && block.columns.length > 0 ? block.columns : [
                        { key: 'col0', label: '列1' },
                        { key: 'col1', label: '列2' },
                        { key: 'col2', label: '列3' }
                      ]}
                      data={(block.tableData && typeof block.tableData === 'object' && !Array.isArray(block.tableData)) ? block.tableData : {}}
                      originalData={lastSavedData.additionalData?.[i]?.tableData}
                      onColumnsChange={newCols => update(`additionalData[${i}].columns`, newCols)}
                      onChange={v => update(`additionalData[${i}].tableData`, v as any)}
                      rowDraggable={true}
                      rowActionMode={tableActionMode}
                      onRowActionModeToggle={toggleTableActionMode}
                      onRowDragStart={(idx, e) => handleTableItemDragStart(`additionalData[${i}].tableData`, idx, e)}
                      onRowDragOver={(idx, e) => handleTableItemDragOver(`additionalData[${i}].tableData`, idx, e)}
                      onRowDrop={(idx, e) => handleTableItemDrop(`additionalData[${i}].tableData`, idx, e)}
                      minWidth="100%"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => addAdditionalBlock('text')}
            className="flex items-center gap-1.5 text-xs font-medium bg-white text-stone-700 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-lg px-4 py-2 transition-all shadow-sm hover:shadow"
          >
            <FileText size={15} className="text-blue-500" />
            <Plus size={14} className="-ml-1" />
            <span>{t('common.add_text')}</span>
          </button>
          <button
            type="button"
            onClick={() => addAdditionalBlock('table')}
            className="flex items-center gap-1.5 text-xs font-medium bg-white text-stone-700 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-lg px-4 py-2 transition-all shadow-sm hover:shadow"
          >
            <TableIcon size={15} className="text-emerald-500" />
            <Plus size={14} className="-ml-1" />
            <span>{t('common.add_table')}</span>
          </button>
          <button
            type="button"
            onClick={() => addAdditionalBlock('image')}
            className="flex items-center gap-1.5 text-xs font-medium bg-white text-stone-700 hover:text-stone-900 border border-stone-300 hover:border-stone-400 rounded-lg px-4 py-2 transition-all shadow-sm hover:shadow"
          >
            <ImageIcon size={15} className="text-purple-500" />
            <Plus size={14} className="-ml-1" />
            <span>{t('common.add_image')}</span>
          </button>
        </div>
      </div>
    </Section>
  );
};

export default AdditionalDataSection;
