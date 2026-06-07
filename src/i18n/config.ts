import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import * as OpenCC from 'opencc-js';

import zh from './locales/zh.json';
import en from './locales/en.json';
import zhDb from './locales/zh/database.json';

// 初始化 OpenCC 转换器 (简体 -> 繁体)
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 核心查表逻辑
 * 尝试从 database.json 中查找对应的翻译
 */
const lookupInDatabase = (key: string) => {
  // 提取原始名称 (如 editor.basic.deity_options.Abadar -> Abadar)
  const rawName = key.includes('.') ? key.split('.').pop()! : key;
  
  // 尝试匹配不同的分类
  return zhDb.deities?.[rawName] || 
         zhDb.pantheons?.[rawName] || 
         zhDb.deities?.[key] || 
         zhDb.pantheons?.[key];
};

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
    // 自定义缺失键处理器：这是实现“透明查表”的核心
    parseMissingKeyHandler: (key) => {
      const lng = i18n.language || 'zh';
      
      // 仅在中文环境下尝试查表
      if (lng.startsWith('zh')) {
        const found = lookupInDatabase(key);
        if (found) {
          // 如果是繁体环境，还需要手动跑一次转换，因为 missingKeyHandler 绕过了 postProcessor
          if (lng === 'zh-TW' || lng === 'zh-HK') {
            return converter(found);
          }
          return found;
        }
      }
      
      // 如果查表也没找到，剥离前缀显示原名，而不是显示完整的路径
      return key.includes('.') ? key.split('.').pop()! : key;
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
