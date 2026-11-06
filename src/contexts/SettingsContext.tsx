import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSettings {
  editor: Record<string, any>;
  export: {
    showTotalForMultipleItems: boolean;
  };
  storage: {
    enableLocalAutoCache: boolean;
    autoSyncToForumOnSave: boolean;
  };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  editor: {},
  export: {
    showTotalForMultipleItems: false,
  },
  storage: {
    enableLocalAutoCache: false,
    autoSyncToForumOnSave: false,
  },
};

const STORAGE_KEY = 'pf1_user_settings';

interface SettingsContextType {
  settings: UserSettings;
  updateSetting: <S extends keyof UserSettings, K extends keyof UserSettings[S]>(
    section: S,
    key: K,
    value: UserSettings[S][K]
  ) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// 允许在非 React 组件（如 bbcodeExporter）中直接同步读取最新设置
export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        editor: { ...DEFAULT_USER_SETTINGS.editor, ...parsed.editor },
        export: { ...DEFAULT_USER_SETTINGS.export, ...parsed.export },
        storage: { ...DEFAULT_USER_SETTINGS.storage, ...parsed.storage },
      };
    }
  } catch (e) {
    console.error('Failed to parse stored user settings:', e);
  }
  return DEFAULT_USER_SETTINGS;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save user settings:', e);
    }
  }, [settings]);

  const updateSetting = <S extends keyof UserSettings, K extends keyof UserSettings[S]>(
    section: S,
    key: K,
    value: UserSettings[S][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_USER_SETTINGS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
