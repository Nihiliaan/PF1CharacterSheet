import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import * as OpenCC from 'opencc-js';

import zh from './locales/zh.json';
import en from './locales/en.json';

// 初始化 OpenCC 转换器 (简体 -> 繁体)
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

const openCCProcessor = {
  name: 'openCC',
  type: 'postProcessor',
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
      // zh-TW 不单独提供 JSON，而是回退到 zh 并通过 postProcessor 转换
      'zh-TW': { translation: {} },
      'zh-HK': { translation: {} }
    },
    fallbackLng: {
      'zh-TW': ['zh'],
      'zh-HK': ['zh'],
      'default': ['zh']
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
