import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { translations, Language, TranslationKeys } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  translateOption: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'monroc_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored === 'en' || stored === 'zh' || stored === 'fr') ? stored : 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  const t = useMemo(() => translations[language], [language]);

  // Helper function to translate dropdown option values
  const translateOption = useCallback((value: string): string => {
    const options = translations[language].options as Record<string, string>;
    return options[value] || value;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateOption }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
