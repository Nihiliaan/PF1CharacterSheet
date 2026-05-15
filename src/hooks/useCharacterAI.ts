import { useState, useEffect, useRef } from 'react';
import { extractCharacterFromText, transformAIData } from '../services/aiService';
import { useUI } from '../contexts/UIContext';
import { CharacterData } from '../types';

export const useCharacterAI = (setData: (data: CharacterData) => void, setCurrentDocumentId: (id: string | null) => void) => {
  const { setToast, setView } = useUI();

  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('user_gemini_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!localStorage.getItem('user_gemini_api_key'));
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

      setAiStatusMsg('正在传输数据至 Gemini...');
      const extractionPromise = extractCharacterFromText(textToProcess, keyToUse);

      const extracted = await Promise.race([extractionPromise, timeoutPromise]) as any;

      if (!showAIModalRef.current) return;

      setAiStatusMsg('正在同步至跑团卡系统...');
      const mergedData = transformAIData(extracted);

      setData(mergedData);
      setToast({ message: "AI 识别并填写成功！" });
      setView('editor');
      setCurrentId(null);
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
    aiInputText, setAiInputText,
    showAIModal, setShowAIModal,
    isAILoading, aiStatusMsg,
    handleAIExtract
  };
};
