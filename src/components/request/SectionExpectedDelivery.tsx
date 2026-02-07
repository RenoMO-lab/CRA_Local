import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomerRequest } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface SectionExpectedDeliveryProps {
  formData: Partial<CustomerRequest>;
  onChange: (field: keyof CustomerRequest, value: any) => void;
  isReadOnly: boolean;
  errors?: Record<string, string>;
  expectedDeliveryOptions?: string[];
}

const SectionExpectedDelivery: React.FC<SectionExpectedDeliveryProps> = ({
  formData,
  onChange,
  isReadOnly,
  errors = {},
  expectedDeliveryOptions = [],
}) => {
  const { t, translateOption } = useLanguage();
  const selections = formData.expectedDeliverySelections ?? [];
  const hasOptions = expectedDeliveryOptions.length > 0;

  const toggleSelection = (value: string) => {
    if (isReadOnly) return;
    const next = selections.includes(value)
      ? selections.filter((item) => item !== value)
      : [...selections, value];
    onChange('expectedDeliverySelections', next);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h3 className="section-title flex items-center gap-2 text-base md:text-lg">
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs md:text-sm font-bold shrink-0">2</span>
        {t.request.expectedDelivery}
      </h3>

      <div className="space-y-3">
        {hasOptions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expectedDeliveryOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={selections.includes(option)}
                  onCheckedChange={() => toggleSelection(option)}
                  disabled={isReadOnly}
                />
                <span className="text-foreground">{translateOption(option)}</span>
              </label>
            ))}
          </div>
        ) : (
          <Input
            id="expectedDeliverySelections"
            value={selections.join(', ')}
            onChange={(e) => {
              const next = e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              onChange('expectedDeliverySelections', next);
            }}
            placeholder={t.request.enterExpectedDelivery}
            disabled={isReadOnly}
            className={errors.expectedDeliverySelections ? 'border-destructive' : ''}
          />
        )}

        {errors.expectedDeliverySelections && (
          <p className="text-xs text-destructive">{errors.expectedDeliverySelections}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientExpectedDeliveryDate" className="text-sm font-medium">
          {t.request.clientExpectedDeliveryDate} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="clientExpectedDeliveryDate"
          type="date"
          value={formData.clientExpectedDeliveryDate ?? ''}
          onChange={(e) => onChange('clientExpectedDeliveryDate', e.target.value)}
          disabled={isReadOnly}
          className={errors.clientExpectedDeliveryDate ? 'border-destructive' : ''}
        />
        {errors.clientExpectedDeliveryDate && (
          <p className="text-xs text-destructive">{errors.clientExpectedDeliveryDate}</p>
        )}
      </div>
    </div>
  );
};

export default SectionExpectedDelivery;
