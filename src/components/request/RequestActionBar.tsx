import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Save, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { FormMode } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface RequestActionBarProps {
  mode: FormMode;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSaving: boolean;
}

const RequestActionBar = forwardRef<HTMLDivElement, RequestActionBarProps>(({
  mode,
  onSaveDraft,
  onSubmit,
  isSubmitting,
  isSaving,
}, ref) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isReadOnly = mode === 'read_only';
  const isEditable = mode === 'create' || mode === 'draft_edit' || mode === 'clarification_edit';

  return (
    <div ref={ref} className="fixed md:sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border py-3 md:py-4 px-3 md:px-6 z-50 md:-mx-6 md:mt-8">
      <div className="flex items-center justify-between max-w-7xl mx-auto gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="md:hidden"
        >
          <ArrowLeft size={16} />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="hidden md:inline-flex"
        >
          <ArrowLeft size={16} className="mr-2" />
          {t.request.backToDashboard}
        </Button>

        {isEditable && (
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveDraft}
              disabled={isSaving || isSubmitting}
              className="md:hidden"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSaving || isSubmitting}
              className="hidden md:inline-flex"
            >
              {isSaving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              {isSaving ? t.request.saving : t.request.saveDraft}
            </Button>
            
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={isSubmitting || isSaving}
              className="md:hidden bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting || isSaving}
              className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              {isSubmitting ? t.request.submitting : (mode === 'clarification_edit' ? t.panels.resubmitToDesign : t.request.submitRequest)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

RequestActionBar.displayName = 'RequestActionBar';

export default RequestActionBar;
