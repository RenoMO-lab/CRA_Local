import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerRequest } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface SectionGeneralInfoProps {
  formData: Partial<CustomerRequest>;
  onChange: (field: keyof CustomerRequest, value: any) => void;
  isReadOnly: boolean;
  errors?: Record<string, string>;
  countryOptions?: string[];
  repeatabilityOptions?: string[];
}

const SectionGeneralInfo: React.FC<SectionGeneralInfoProps> = ({
  formData,
  onChange,
  isReadOnly,
  errors = {},
  countryOptions = [],
  repeatabilityOptions = [],
}) => {
  const { t, translateOption } = useLanguage();
  const showCountryOther = formData.country === 'other';
  const hasCountryOptions = countryOptions.length > 0;
  const hasRepeatabilityOptions = repeatabilityOptions.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <h3 className="section-title flex items-center gap-2 text-base md:text-lg">
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs md:text-sm font-bold shrink-0">1</span>
        {t.request.generalInfo}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Client Name */}
        <div className="space-y-2">
          <Label htmlFor="clientName" className="text-sm font-medium">
            {t.request.clientName} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="clientName"
            value={formData.clientName || ''}
            onChange={(e) => onChange('clientName', e.target.value)}
            placeholder={t.request.enterClientName}
            disabled={isReadOnly}
            className={errors.clientName ? 'border-destructive' : ''}
          />
          {errors.clientName && (
            <p className="text-xs text-destructive">{errors.clientName}</p>
          )}
        </div>

        {/* Client Contact */}
        <div className="space-y-2">
          <Label htmlFor="clientContact" className="text-sm font-medium">
            {t.request.clientContact} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="clientContact"
            value={formData.clientContact || ''}
            onChange={(e) => onChange('clientContact', e.target.value)}
            placeholder={t.request.enterClientContact}
            disabled={isReadOnly}
            className={errors.clientContact ? 'border-destructive' : ''}
          />
          {errors.clientContact && (
            <p className="text-xs text-destructive">{errors.clientContact}</p>
          )}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">
            {t.request.country} <span className="text-destructive">*</span>
          </Label>
          {hasCountryOptions ? (
            <Select
              value={formData.country || ''}
              onValueChange={(value) => {
                onChange('country', value);
                if (value !== 'other') {
                  onChange('countryOther', '');
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectCountry} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {countryOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t.common.other}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="country"
              value={formData.country || ''}
              onChange={(e) => onChange('country', e.target.value)}
              placeholder={t.request.countryExample}
              disabled={isReadOnly}
              className={errors.country ? 'border-destructive' : ''}
            />
          )}
          {errors.country && (
            <p className="text-xs text-destructive">{errors.country}</p>
          )}
        </div>

        {/* Repeatability */}
        <div className="space-y-2">
          <Label htmlFor="repeatability" className="text-sm font-medium">
            {t.request.repeatability} <span className="text-destructive">*</span>
          </Label>
          {hasRepeatabilityOptions ? (
            <Select
              value={formData.repeatability || ''}
              onValueChange={(value) => onChange('repeatability', value)}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.repeatability ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectRepeatability} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {repeatabilityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="repeatability"
              value={formData.repeatability || ''}
              onChange={(e) => onChange('repeatability', e.target.value)}
              placeholder={t.request.selectRepeatability}
              disabled={isReadOnly}
              className={errors.repeatability ? 'border-destructive' : ''}
            />
          )}
          {errors.repeatability && (
            <p className="text-xs text-destructive">{errors.repeatability}</p>
          )}
        </div>

        {/* Expected Qty */}
        <div className="space-y-2">
          <Label htmlFor="expectedQty" className="text-sm font-medium">
            {t.request.expectedQty} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="expectedQty"
            type="number"
            value={formData.expectedQty || ''}
            onChange={(e) => onChange('expectedQty', e.target.value ? parseInt(e.target.value) : null)}
            placeholder={t.request.expectedQtyExample}
            disabled={isReadOnly}
            className={errors.expectedQty ? 'border-destructive' : ''}
          />
          {errors.expectedQty && (
            <p className="text-xs text-destructive">{errors.expectedQty}</p>
          )}
        </div>

        {/* Country Other - shown when "Other" is selected */}
        {showCountryOther && hasCountryOptions && (
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="countryOther" className="text-sm font-medium">
              {t.request.specifyCountry} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="countryOther"
              value={(formData as any).countryOther || ''}
              onChange={(e) => onChange('countryOther' as any, e.target.value)}
              placeholder={t.request.enterCountry}
              disabled={isReadOnly}
              className={(errors as any).countryOther ? 'border-destructive' : ''}
            />
            {(errors as any).countryOther && (
              <p className="text-xs text-destructive">{(errors as any).countryOther}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionGeneralInfo;
