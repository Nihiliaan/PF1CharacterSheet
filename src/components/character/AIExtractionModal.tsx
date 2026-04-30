import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';

interface AIExtractionModalProps {
  showAIModal: boolean;
  setShowAIModal: (v: boolean) => void;
  isAILoading: boolean;
  handleAIExtract: () => void;
  userApiKey: string;
  setUserApiKey: (v: string) => void;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (v: boolean) => void;
  aiInputText: string;
  setAiInputText: (v: string) => void;
  aiStatusMsg: string;
}

const AIExtractionModal = ({ 
  showAIModal, 
  setShowAIModal, 
  isAILoading, 
  handleAIExtract, 
  userApiKey, 
  setUserApiKey, 
  showApiKeyInput, 
  setShowApiKeyInput, 
  aiInputText, 
  setAiInputText,
  aiStatusMsg
}: AIExtractionModalProps) => {
  return (
    <AnimatePresence>
      {showAIModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Gemini AI 角色卡识别</h3>
                  <p className="text-xs text-indigo-600 font-medium mt-0.5">粘贴一段描述文本，我们将自动为您填写角色卡</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAIModal(false)} 
                className="p-2 hover:bg-white rounded-full transition-colors text-stone-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
              {/* API Key Section */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    Gemini API Key
                  </label>
                  <button 
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {showApiKeyInput ? '隐藏设置' : '更换密钥'}
                  </button>
                </div>
                {showApiKeyInput ? (
                  <div className="space-y-2">
                    <input 
                      type="password"
                      value={userApiKey}
                      onChange={e => setUserApiKey(e.target.value)}
                      placeholder="在此输入您的 API Key (AI Studio 提供)"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                    />
                    <p className="text-[10px] text-stone-400">
                      您的密钥仅保存在本地浏览器缓存中，不会上传到服务器。
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-mono">已设置 (••••••••••••)</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>角色描述文本 (Character Description)</span>
                  <span className="text-stone-400">支持 BBCode 表格与自然语言</span>
                </label>
                <textarea 
                  autoFocus
                  value={aiInputText}
                  onChange={e => setAiInputText(e.target.value)}
                  placeholder="在此粘贴包含 BBCode 表格或自然语言的人物描述..."
                  className="flex-1 w-full p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-sm leading-relaxed custom-scrollbar"
                  disabled={isAILoading}
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                <ExternalLink size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-normal font-medium">
                  提示：识别完成后，数据将填充到编辑器中。请在保存前检查 AI 识别的准确性。某些复杂的特殊能力可能需要您进行手动调整。
                </p>
              </div>
            </div>

            <div className="p-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowAIModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-stone-500 hover:bg-stone-200 rounded-xl transition-all"
              >
                取消
              </button>
              <button 
                onClick={handleAIExtract}
                disabled={isAILoading || !aiInputText.trim()}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100 min-w-[140px] justify-center"
              >
                {isAILoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {aiStatusMsg || '正在识别...'}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    开始识别
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AIExtractionModal;
