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

interface SectionClientApplicationProps {
  formData: Partial<CustomerRequest>;
  onChange: (field: keyof CustomerRequest, value: any) => void;
  isReadOnly: boolean;
  errors?: Record<string, string>;
  applicationVehicleOptions?: string[];
  workingConditionOptions?: string[];
  usageTypeOptions?: string[];
  environmentOptions?: string[];
}

const SectionClientApplication: React.FC<SectionClientApplicationProps> = ({
  formData,
  onChange,
  isReadOnly,
  errors = {},
  applicationVehicleOptions = [],
  workingConditionOptions = [],
  usageTypeOptions = [],
  environmentOptions = [],
}) => {
  const { t, translateOption } = useLanguage();
  const showApplicationVehicleOther = formData.applicationVehicle === 'other';
  const showWorkingConditionOther = formData.workingCondition === 'other';
  const showUsageTypeOther = formData.usageType === 'other';
  const showEnvironmentOther = formData.environment === 'other';
  const hasApplicationVehicleOptions = applicationVehicleOptions.length > 0;
  const hasWorkingConditionOptions = workingConditionOptions.length > 0;
  const hasUsageTypeOptions = usageTypeOptions.length > 0;
  const hasEnvironmentOptions = environmentOptions.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <h3 className="section-title flex items-center gap-2 text-base md:text-lg">
        <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs md:text-sm font-bold shrink-0">3</span>
        {t.request.clientApplication}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Working Condition */}
        <div className="space-y-2">
          <Label htmlFor="workingCondition" className="text-sm font-medium">
            {t.request.workingCondition} <span className="text-destructive">*</span>
          </Label>
          {hasWorkingConditionOptions ? (
            <Select
              value={formData.workingCondition || ''}
              onValueChange={(value) => {
                onChange('workingCondition', value);
                if (value !== 'other') {
                  onChange('workingConditionOther', '');
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.workingCondition ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectWorkingCondition} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {workingConditionOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t.common.other}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="workingCondition"
              value={formData.workingCondition || ''}
              onChange={(e) => onChange('workingCondition', e.target.value)}
              placeholder={t.request.selectWorkingCondition}
              disabled={isReadOnly}
              className={errors.workingCondition ? 'border-destructive' : ''}
            />
          )}
          {errors.workingCondition && (
            <p className="text-xs text-destructive">{errors.workingCondition}</p>
          )}
        </div>

        {/* Working Condition Other */}
        {showWorkingConditionOther && hasWorkingConditionOptions && (
          <div className="space-y-2">
            <Label htmlFor="workingConditionOther" className="text-sm font-medium">
              {t.request.specifyWorkingCondition} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="workingConditionOther"
              value={formData.workingConditionOther || ''}
              onChange={(e) => onChange('workingConditionOther', e.target.value)}
              placeholder={t.request.specifyWorkingCondition}
              disabled={isReadOnly}
              className={errors.workingConditionOther ? 'border-destructive' : ''}
            />
            {errors.workingConditionOther && (
              <p className="text-xs text-destructive">{errors.workingConditionOther}</p>
            )}
          </div>
        )}

        {/* Application Vehicle */}
        <div className="sm:col-span-2 lg:col-span-2 space-y-2">
          <Label htmlFor="applicationVehicle" className="text-sm font-medium">
            {t.request.applicationVehicle} <span className="text-destructive">*</span>
          </Label>
          {hasApplicationVehicleOptions ? (
            <Select
              value={formData.applicationVehicle || ''}
              onValueChange={(value) => {
                onChange('applicationVehicle', value);
                if (value !== 'other') {
                  onChange('applicationVehicleOther', '');
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.applicationVehicle ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectApplicationVehicle} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {applicationVehicleOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t.common.other}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="applicationVehicle"
              value={formData.applicationVehicle || ''}
              onChange={(e) => onChange('applicationVehicle', e.target.value)}
              placeholder={t.request.applicationVehicleExample}
              disabled={isReadOnly}
              className={errors.applicationVehicle ? 'border-destructive' : ''}
            />
          )}
          {errors.applicationVehicle && (
            <p className="text-xs text-destructive">{errors.applicationVehicle}</p>
          )}
        </div>

        {/* Application Vehicle Other - shown when "Other" is selected */}
        {showApplicationVehicleOther && hasApplicationVehicleOptions && (
          <div className="space-y-2">
            <Label htmlFor="applicationVehicleOther" className="text-sm font-medium">
              {t.request.specifyVehicle} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="applicationVehicleOther"
              value={formData.applicationVehicleOther || ''}
              onChange={(e) => onChange('applicationVehicleOther', e.target.value)}
              placeholder={t.request.enterVehicleType}
              disabled={isReadOnly}
              className={errors.applicationVehicleOther ? 'border-destructive' : ''}
            />
            {errors.applicationVehicleOther && (
              <p className="text-xs text-destructive">{errors.applicationVehicleOther}</p>
            )}
          </div>
        )}

        {/* Usage Type */}
        <div className="space-y-2">
          <Label htmlFor="usageType" className="text-sm font-medium">
            {t.request.usageType} <span className="text-destructive">*</span>
          </Label>
          {hasUsageTypeOptions ? (
            <Select
              value={formData.usageType || ''}
              onValueChange={(value) => {
                onChange('usageType', value);
                if (value !== 'other') {
                  onChange('usageTypeOther', '');
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.usageType ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectUsageType} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {usageTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t.common.other}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="usageType"
              value={formData.usageType || ''}
              onChange={(e) => onChange('usageType', e.target.value)}
              placeholder={t.request.selectUsageType}
              disabled={isReadOnly}
              className={errors.usageType ? 'border-destructive' : ''}
            />
          )}
          {errors.usageType && (
            <p className="text-xs text-destructive">{errors.usageType}</p>
          )}
        </div>

        {/* Usage Type Other */}
        {showUsageTypeOther && hasUsageTypeOptions && (
          <div className="space-y-2">
            <Label htmlFor="usageTypeOther" className="text-sm font-medium">
              {t.request.specifyUsageType} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="usageTypeOther"
              value={formData.usageTypeOther || ''}
              onChange={(e) => onChange('usageTypeOther', e.target.value)}
              placeholder={t.request.specifyUsageType}
              disabled={isReadOnly}
              className={errors.usageTypeOther ? 'border-destructive' : ''}
            />
            {errors.usageTypeOther && (
              <p className="text-xs text-destructive">{errors.usageTypeOther}</p>
            )}
          </div>
        )}

        {/* Environment */}
        <div className="space-y-2">
          <Label htmlFor="environment" className="text-sm font-medium">
            {t.request.environment} <span className="text-destructive">*</span>
          </Label>
          {hasEnvironmentOptions ? (
            <Select
              value={formData.environment || ''}
              onValueChange={(value) => {
                onChange('environment', value);
                if (value !== 'other') {
                  onChange('environmentOther', '');
                }
              }}
              disabled={isReadOnly}
            >
              <SelectTrigger className={errors.environment ? 'border-destructive' : ''}>
                <SelectValue placeholder={t.request.selectEnvironment} />
              </SelectTrigger>
              <SelectContent className="z-50 bg-card border border-border">
                {environmentOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {translateOption(option)}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t.common.other}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="environment"
              value={formData.environment || ''}
              onChange={(e) => onChange('environment', e.target.value)}
              placeholder={t.request.selectEnvironment}
              disabled={isReadOnly}
              className={errors.environment ? 'border-destructive' : ''}
            />
          )}
          {errors.environment && (
            <p className="text-xs text-destructive">{errors.environment}</p>
          )}
        </div>

        {/* Environment Other */}
        {showEnvironmentOther && hasEnvironmentOptions && (
          <div className="space-y-2">
            <Label htmlFor="environmentOther" className="text-sm font-medium">
              {t.request.specifyEnvironment} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="environmentOther"
              value={formData.environmentOther || ''}
              onChange={(e) => onChange('environmentOther', e.target.value)}
              placeholder={t.request.specifyEnvironment}
              disabled={isReadOnly}
              className={errors.environmentOther ? 'border-destructive' : ''}
            />
            {errors.environmentOther && (
              <p className="text-xs text-destructive">{errors.environmentOther}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionClientApplication;
