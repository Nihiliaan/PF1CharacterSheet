import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import * as OpenCC from 'opencc-js';

import zh from './locales/zh.json';
import en from './locales/en.json';

// 初始化 OpenCC 转换器 (简体 -> 繁体)
export const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
export const toTraditional = (text: string) => converter(text);

/**
 * 统一的后处理器
 * 负责：1. 繁体转换
 */
const openCCProcessor = {
  name: 'openCC',
  type: 'postProcessor' as const,
  process(value: string, key: string | string[], options: any, translator: any) {
    const lng = translator.language;
    if (lng === 'zh-TW' || lng === 'zh-HK') {
      return converter(value);
    }
    return value;
  },
};

i18n
  .use(LanguageDetector)
  .use(openCCProcessor)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      'zh-TW': { translation: {} },
      'zh-HK': { translation: {} }
    },
    fallbackLng: {
      'zh-TW': ['zh'],
      'zh-HK': ['zh'],
      'default': ['zh']
    },
    // 缺失键处理器：最后一部分是数字索引则返回原 key，否则剥离前缀显示原名
    parseMissingKeyHandler: (key) => {
      const parts = key.split('.');
      const lastPart = parts[parts.length - 1];
      if (/^\d+$/.test(lastPart)) return key;
      return lastPart;
    },
    postProcess: ['openCC'],
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;
