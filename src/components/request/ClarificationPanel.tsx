import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { CustomerRequest } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface ClarificationPanelProps {
  request: CustomerRequest;
  onResubmit: (response: string) => void;
  isSubmitting: boolean;
}

const ClarificationPanel: React.FC<ClarificationPanelProps> = ({
  request,
  onResubmit,
  isSubmitting,
}) => {
  const [response, setResponse] = useState('');
  const { t } = useLanguage();

  const handleResubmit = () => {
    if (!response.trim()) return;
    onResubmit(response);
    setResponse('');
  };

  return (
    <div className="bg-destructive/5 rounded-lg border border-destructive/20 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t.panels.clarificationRequested}</h3>
          <p className="text-sm text-muted-foreground">{t.panels.designTeamNeedsInfo}</p>
        </div>
      </div>

      {request.clarificationComment && (
        <div className="p-4 rounded-lg bg-card border border-border">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t.panels.designComment}</Label>
          <p className="mt-1 text-sm text-foreground">{request.clarificationComment}</p>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.panels.yourResponse}</Label>
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder={t.panels.provideClarification}
          rows={4}
        />
        <Button
          onClick={handleResubmit}
          disabled={!response.trim() || isSubmitting}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Send size={16} className="mr-2" />
          )}
          {t.panels.resubmitToDesign}
        </Button>
      </div>
    </div>
  );
};

export default ClarificationPanel;
