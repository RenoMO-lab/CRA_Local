import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

const Test: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t.nav.test}</h1>
        <p className="text-muted-foreground mt-1">Test page.</p>
      </div>
    </div>
  );
};

export default Test;
