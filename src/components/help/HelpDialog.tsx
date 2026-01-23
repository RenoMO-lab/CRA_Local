import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/context/LanguageContext';

interface HelpDialogProps {
  trigger: React.ReactNode;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ trigger }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>{t.help.title}</DialogTitle>
          <DialogDescription>{t.help.description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpDialog;
