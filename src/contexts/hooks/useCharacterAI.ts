import { useState, useEffect, useRef, useCallback } from 'react';
import { extractCharacterFromText, transformAIData, listAvailableModels } from '../../services/aiService';
import { useUI } from '../UIContext';
import { CharacterData } from '../../schema/types';
import { dataMigration } from '../../utils/dataMigration';

export const useCharacterAI = (setData: (data: CharacterData) => void, setCurrentDocumentId: (id: string | null) => void) => {
  const { setToast, setView } = useUI();

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('user_gemini_api_key'));
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('user_gemini_model') || 'models/gemini-1.5-flash');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  
  const [aiInputText, setAiInputText] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiStatusMsg, setAiStatusMsg] = useState('');

  const showAIModalRef = useRef(showAIModal);
  useEffect(() => {
    showAIModalRef.current = showAIModal;
  }, [showAIModal]);

  useEffect(() => {
    localStorage.setItem('user_gemini_api_key', userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    localStorage.setItem('user_gemini_model', aiModel);
  }, [aiModel]);

  const fetchAvailableModels = useCallback(async (apiKey?: string) => {
    const key = apiKey || userApiKey;
    if (!key) return;

    setIsFetchingModels(true);
    try {
      const models = await listAvailableModels(key);
      if (models.length === 0) {
        setToast({ message: "未发现可用的 Gemini 模型，请检查 API Key 权限", type: 'info' });
      }
      setAvailableModels(models);
      
      // 如果当前选中的模型不在列表中，且列表不为空，则默认选中第一个
      if (models.length > 0 && !models.find(m => m.name === aiModel)) {
        setAiModel(models[0].name);
      }
    } catch (e: any) {
      console.error("Failed to fetch models:", e);
      setToast({ message: "获取模型列表失败: " + (e.message || "未知错误"), type: 'error' });
    } finally {
      setIsFetchingModels(false);
    }
  }, [userApiKey, aiModel]);

  // 当用户第一次打开 AI 弹窗或 API Key 变化时尝试获取模型列表
  useEffect(() => {
    if (showAIModal && userApiKey && availableModels.length === 0) {
      fetchAvailableModels();
    }
  }, [showAIModal, userApiKey, fetchAvailableModels, availableModels.length]);

  const handleAIExtract = async (inputText?: string, apiKey?: string) => {
    const textToProcess = (typeof inputText === 'string' ? inputText : aiInputText) || '';
    const keyToUse = (typeof apiKey === 'string' ? apiKey : userApiKey) || '';

    if (!textToProcess.trim()) {
      setToast({ message: "请输入待处理的文本", type: 'info' });
      return;
    }
    if (!keyToUse.trim()) {
      setToast({ message: "请在设置中输入 Gemini API Key", type: 'error' });
      setShowApiKeyInput(true);
      return;
    }

    setIsAILoading(true);
    setAiStatusMsg('正在启动神识扫描...');
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI 响应超时，请检查网络连接或 API Key 是否正确。")), 90000)
      );

      setAiStatusMsg(`正在调用 ${aiModel.split('/').pop()} ...`);
      const extractionPromise = extractCharacterFromText(textToProcess, keyToUse, aiModel);

      const extracted = await Promise.race([extractionPromise, timeoutPromise]) as any;

      if (!showAIModalRef.current) return;

      setAiStatusMsg('正在同步至跑团卡系统...');
      const transformed = transformAIData(extracted);
      const mergedData = dataMigration.mergeWithDefault(transformed);

      setData(mergedData);
      setToast({ message: "AI 识别并填写成功！已自动完成表单校验与合规化。" });
      setView('editor');
      setCurrentDocumentId(null);
      setShowAIModal(false);
      setAiInputText('');
    } catch (e: any) {
      console.error("AI Extraction Error:", e);
      if (showAIModalRef.current) {
        setToast({ message: "AI 识别失败: " + (e.message || "未能提取有效数据"), type: 'error' });
      }
    } finally {
      setIsAILoading(false);
      setAiStatusMsg('');
    }
  };

  return {
    userApiKey, setUserApiKey,
    showApiKeyInput, setShowApiKeyInput,
    aiModel, setAiModel,
    availableModels, isFetchingModels, fetchAvailableModels,
    aiInputText, setAiInputText,
    showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg,
    handleAIExtract
  };
};
