import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, CheckCircle, Loader2, TrendingUp } from 'lucide-react';
import { CustomerRequest, RequestStatus } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface CostingPanelProps {
  request: CustomerRequest;
  onUpdateStatus: (status: RequestStatus, notes?: string) => void | Promise<void>;
  onUpdateCostingData: (data: { 
    costingNotes?: string; 
    sellingPrice?: number; 
    calculatedMargin?: number;
  }) => void | Promise<void>;
  isUpdating: boolean;
}

const CostingPanel: React.FC<CostingPanelProps> = ({
  request,
  onUpdateStatus,
  onUpdateCostingData,
  isUpdating,
}) => {
  const [costingNotes, setCostingNotes] = useState(request.costingNotes || '');
  const [sellingPrice, setSellingPrice] = useState<string>(
    request.sellingPrice?.toString() || ''
  );
  const [calculatedMargin, setCalculatedMargin] = useState<string>(
    request.calculatedMargin?.toString() || ''
  );
  const { t } = useLanguage();

  const handleSetInCosting = () => {
    onUpdateStatus('in_costing');
  };

  const handleSubmitCosting = () => {
    const priceValue = parseFloat(sellingPrice);
    const marginValue = parseFloat(calculatedMargin);

    if (isNaN(priceValue) || priceValue <= 0) {
      return;
    }
    if (isNaN(marginValue)) {
      return;
    }

    onUpdateCostingData({
      costingNotes,
      sellingPrice: priceValue,
      calculatedMargin: marginValue,
    });
    onUpdateStatus('costing_complete', `${t.panels.sellingPrice}: €${priceValue.toFixed(2)}, ${t.panels.margin}: ${marginValue.toFixed(1)}%`);
  };

  const handleSaveNotes = () => {
    onUpdateCostingData({ costingNotes });
  };

  const canSetInCosting = request.status === 'feasibility_confirmed';
  const canComplete = request.status === 'in_costing';
  const isValidSubmission = 
    sellingPrice && 
    parseFloat(sellingPrice) > 0 && 
    calculatedMargin && 
    !isNaN(parseFloat(calculatedMargin));

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center">
          <DollarSign size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t.panels.costingActions}</h3>
          <p className="text-sm text-muted-foreground">{t.panels.manageCostingProcess}</p>
        </div>
      </div>

      {canSetInCosting && (
        <Button
          variant="outline"
          onClick={handleSetInCosting}
          disabled={isUpdating}
          className="w-full justify-start"
        >
          <DollarSign size={16} className="mr-2 text-info" />
          {t.panels.setInCosting}
        </Button>
      )}

      {canComplete && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellingPrice" className="text-sm font-medium flex items-center gap-2">
                <DollarSign size={14} className="text-success" />
                {t.panels.sellingPrice} (€) *
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder={`${t.common.add} ${t.panels.sellingPrice.toLowerCase()}...`}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calculatedMargin" className="text-sm font-medium flex items-center gap-2">
                <TrendingUp size={14} className="text-info" />
                {t.panels.margin} (%) *
              </Label>
              <Input
                id="calculatedMargin"
                type="number"
                step="0.1"
                value={calculatedMargin}
                onChange={(e) => setCalculatedMargin(e.target.value)}
                placeholder={`${t.common.add} ${t.panels.margin.toLowerCase()}...`}
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.panels.costingNotesInternal}</Label>
            <Textarea
              value={costingNotes}
              onChange={(e) => setCostingNotes(e.target.value)}
              placeholder={t.panels.addCostingNotes}
              rows={4}
            />
            <Button
              variant="outline"
              onClick={handleSaveNotes}
              disabled={isUpdating}
              size="sm"
            >
              {isUpdating && <Loader2 size={14} className="mr-2 animate-spin" />}
              {t.panels.saveNotes}
            </Button>
          </div>

          <Button
            onClick={handleSubmitCosting}
            disabled={!isValidSubmission || isUpdating}
            className="w-full bg-success hover:bg-success/90 text-success-foreground"
          >
            {isUpdating && <Loader2 size={16} className="mr-2 animate-spin" />}
            <CheckCircle size={16} className="mr-2" />
            {t.panels.submitCostingComplete}
          </Button>
        </>
      )}

      {request.status === 'costing_complete' && (
        <div className="p-4 bg-success/10 rounded-lg border border-success/20 space-y-2">
          <p className="text-sm font-medium text-success">{t.panels.costingCompleted}</p>
          {request.sellingPrice && (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">{t.panels.sellingPrice}:</span> €{request.sellingPrice.toFixed(2)}
            </p>
          )}
          {request.calculatedMargin !== undefined && (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">{t.panels.margin}:</span> {request.calculatedMargin.toFixed(1)}%
            </p>
          )}
          {request.costingNotes && (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">{t.panels.costingNotes}:</span> {request.costingNotes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CostingPanel;
