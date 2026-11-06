import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  CloudUpload, 
  Image as ImageIcon, 
  FileCode, 
  ExternalLink,
  Loader2,
  Sparkles,
  Link2,
  Code,
} from 'lucide-react';
import { useCharacter } from '../../contexts/CharacterContext';
import { useUI } from '../../contexts/UIContext';
import { getAllTemplates, getTemplateById } from '../../templates/templateRegistry';
import { renderTemplate } from '../../templates/templateEngine';
import { uploadRenderedCard, getRenderUrl } from '../../services/cardUploadService';
import { TemplateDefinition, TemplateType } from '../../templates/types';

interface CardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: TemplateType;
}

const CardExportModal: React.FC<CardExportModalProps> = ({
  isOpen,
  onClose,
  initialType = 'svg'
}) => {
  const { t } = useTranslation();
  const { data, computed } = useCharacter();
  const { setView } = useUI();

  const [activeType, setActiveType] = useState<TemplateType>(initialType);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('svg-badge');
  const [urlFormat, setUrlFormat] = useState<'query' | 'path'>('query');
  const [hideAvatar, setHideAvatar] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  // 上传与复制状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // 筛选可用模板
  const allTemplates = useMemo(() => getAllTemplates(), []);
  const filteredTemplates = useMemo(
    () => allTemplates.filter(tpl => tpl.type === activeType),
    [allTemplates, activeType]
  );

  // 默认选中该类型的首个模板
  useEffect(() => {
    if (!filteredTemplates.some(t => t.id === selectedTemplateId)) {
      if (filteredTemplates.length > 0) {
        setSelectedTemplateId(filteredTemplates[0].id);
      }
    }
  }, [activeType, filteredTemplates, selectedTemplateId]);

  const currentTemplate: TemplateDefinition = useMemo(() => {
    return getTemplateById(selectedTemplateId) || filteredTemplates[0] || allTemplates[0];
  }, [selectedTemplateId, filteredTemplates, allTemplates]);

  // 动态编译渲染输出
  const renderResult = useMemo(() => {
    try {
      return renderTemplate(data, currentTemplate, {
        t,
        characterContext: { computed },
        hideAvatar,
        customTitle: customTitle.trim() || undefined
      });
    } catch (err: any) {
      console.error('[CardExportModal] Render error', err);
      return {
        content: `<!-- 渲染失败: ${err.message} -->`,
        mimeType: currentTemplate.mimeType,
        extension: currentTemplate.extension,
        template: currentTemplate
      };
    }
  }, [data, currentTemplate, computed, t, hideAvatar, customTitle]);

  // 计算标准的外链 URL
  const charId = data.id || 'default';
  const dynamicRenderUrl = useMemo(() => {
    return getRenderUrl(charId, currentTemplate.id, currentTemplate.extension, urlFormat);
  }, [charId, currentTemplate, urlFormat]);

  // 最终提供给论坛的代码 (如果有上传直链则优先展示直链，否则展示动态 URL)
  const activeImageUrl = uploadedUrl || dynamicRenderUrl;
  const forumBBCode = useMemo(() => {
    if (currentTemplate.type === 'svg') {
      return `[img]${activeImageUrl}[/img]`;
    }
    return renderResult.content;
  }, [currentTemplate.type, activeImageUrl, renderResult.content]);

  // 复制论坛代码
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(forumBBCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // 复制纯 URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeImageUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      console.error('Failed to copy url', e);
    }
  };

  // 下载文件到本地
  const handleDownload = () => {
    const filename = `${data.name || 'character'}_${currentTemplate.id}.${currentTemplate.extension}`;
    const blob = new Blob([renderResult.content], { type: renderResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 上传至 Google Cloud Storage (Firebase Storage)
  const handleUpload = async () => {
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const res = await uploadRenderedCard(
        charId,
        currentTemplate.id,
        renderResult.content,
        renderResult.mimeType,
        currentTemplate.extension
      );
      setUploadedUrl(res.downloadUrl);
      setStatusMessage('上传成功！已生成永久 CDN 直链并同步至论坛外链。');
    } catch (err: any) {
      console.error('Upload failed', err);
      setStatusMessage(`上传遇到问题: ${err.message || '请检查网络或登录状态'}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-stone-800">
                论坛卡片与外链中心
              </h2>
              <p className="text-xs text-stone-500">
                支持 .svgt 矢量图鉴卡与 .bbc 论坛排版导出，外链自动携带角色 ID 与模板 ID
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-5 p-5 flex flex-col gap-5 overflow-y-auto bg-stone-50/30">
            {/* Format Type Tabs */}
            <div>
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block mb-2">
                导出类型
              </label>
              <div className="grid grid-cols-2 gap-2 bg-stone-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveType('svg')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeType === 'svg'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ImageIcon size={15} className="text-amber-600" />
                  <span>SVG 矢量卡片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType('bbcode')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeType === 'bbcode'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FileCode size={15} className="text-blue-600" />
                  <span>BBCode 论坛代码</span>
                </button>
              </div>
            </div>

            {/* Template Selector List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                  选择排版模板 (Template ID)
                </label>
                <span className="text-[10px] text-stone-400 font-mono">
                  {filteredTemplates.length} 个可用
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {filteredTemplates.map(tpl => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setUploadedUrl(null);
                        setStatusMessage(null);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                          {tpl.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                          {tpl.id}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 line-clamp-2">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (activeType === 'svg') {
                    setView('svg-template');
                  } else {
                    setView('bbcode-template');
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-200 transition-colors mt-2"
              >
                <Code size={14} className="text-amber-700" />
                <span>在 {activeType === 'svg' ? 'SVG 模板工坊' : 'BBCode 编辑器'} 中编辑与自定义</span>
              </button>
            </div>

            {/* Customization Options */}
            <div className="border-t border-stone-200 pt-4 flex flex-col gap-3">
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                排版微调参数
              </label>

              <div>
                <label className="text-xs text-stone-600 block mb-1">自定义标题 / 别名 (可选)</label>
                <input
                  type="text"
                  placeholder={data.name || '默认使用人物卡姓名'}
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-stone-300 outline-none focus:border-stone-500 bg-white"
                />
              </div>

              {activeType === 'svg' && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-stone-700">隐藏卡片头像</span>
                  <input
                    type="checkbox"
                    checked={hideAvatar}
                    onChange={e => setHideAvatar(e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                  />
                </div>
              )}

              {/* URL 格式偏好 */}
              <div>
                <label className="text-xs text-stone-600 block mb-1">外链 URL 传参形式</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setUrlFormat('query')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      urlFormat === 'query'
                        ? 'border-stone-800 bg-stone-900 text-white font-medium'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    ?charId=...&amp;templateId=...
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrlFormat('path')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                      urlFormat === 'path'
                        ? 'border-stone-800 bg-stone-900 text-white font-medium'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    /render/:charId/:tplId
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="lg:col-span-7 p-5 flex flex-col gap-4 overflow-hidden bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  实时效果预览
                </span>
                <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-mono">
                  {currentTemplate.extension.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <span>模板代码自适应</span>
              </div>
            </div>

            {/* Preview Viewport */}
            <div className="flex-1 min-h-[300px] border border-stone-200 rounded-xl overflow-auto p-4 bg-stone-100/50 flex items-center justify-center relative">
              {currentTemplate.type === 'svg' ? (
                <div
                  className="max-w-full max-h-full flex items-center justify-center transition-transform"
                  dangerouslySetInnerHTML={{ __html: renderResult.content }}
                />
              ) : (
                <pre className="text-xs font-mono text-stone-800 whitespace-pre-wrap break-all w-full h-full max-h-[420px] overflow-y-auto bg-white p-3 rounded-lg border border-stone-200 shadow-inner">
                  {renderResult.content}
                </pre>
              )}
            </div>

            {/* Outer Link URL & Forum BBCode Code */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1 font-medium text-stone-700">
                  <Link2 size={13} />
                  <span>论坛嵌入代码 (BBCode)</span>
                </span>
                {uploadedUrl && (
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ✓ 已挂载至云端 Storage
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  value={forumBBCode}
                  className="w-full text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg pl-3 pr-24 py-2 text-stone-700 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute right-1.5 px-3 py-1 bg-stone-800 hover:bg-stone-900 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? '已复制' : '复制代码'}</span>
                </button>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`text-xs px-3 py-1.5 rounded-lg ${statusMessage.includes('成功') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-stone-50 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
              title="将渲染后的文件直接上传至谷歌云端存储（GCS），获得稳定 CDN 直链"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              <span>{isUploading ? '正在上传云端...' : '上传至 Google 存储并获取永久直链'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 hover:border-stone-400 rounded-xl transition-colors"
              title="仅复制纯图片/文件 URL 地址"
            >
              {copiedUrl ? <Check size={13} className="text-emerald-600" /> : <ExternalLink size={13} />}
              <span>{copiedUrl ? '已复制直链' : '复制直链 URL'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:border-stone-400 rounded-xl transition-colors"
            >
              <Download size={14} />
              <span>下载本文件 (.{currentTemplate.extension})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-500 hover:text-stone-800 rounded-xl transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardExportModal;
