import React from 'react';
import MetricsCharts from '@/components/dashboard/MetricsCharts';
import { useRequests } from '@/context/RequestContext';
import { useLanguage } from '@/context/LanguageContext';

const Performance: React.FC = () => {
  const { requests } = useRequests();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t.performance.title}</h1>
        <p className="text-muted-foreground mt-1">
          {t.performance.description}
        </p>
      </div>

      <MetricsCharts requests={requests} />
    </div>
  );
};

export default Performance;
