import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRequests } from '@/context/RequestContext';
import { useAdminSettings } from '@/context/AdminSettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { CustomerRequest, FormMode, RequestStatus, RequestProduct } from '@/types';
import SectionGeneralInfo from '@/components/request/SectionGeneralInfo';
import SectionExpectedDelivery from '@/components/request/SectionExpectedDelivery';
import SectionClientApplication from '@/components/request/SectionClientApplication';
import SectionTechnicalInfo from '@/components/request/SectionTechnicalInfo';
import SectionAdditionalInfo from '@/components/request/SectionAdditionalInfo';
import RequestActionBar from '@/components/request/RequestActionBar';
import DesignReviewPanel from '@/components/request/DesignReviewPanel';
import CostingPanel from '@/components/request/CostingPanel';
import ClarificationPanel from '@/components/request/ClarificationPanel';
import StatusTimeline from '@/components/request/StatusTimeline';
import StatusBadge from '@/components/ui/StatusBadge';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const getInitialProduct = (): RequestProduct => ({
  axleLocation: '',
  axleLocationOther: '',
  articulationType: '',
  articulationTypeOther: '',
  configurationType: '',
  configurationTypeOther: '',
  loadsKg: null,
  speedsKmh: null,
  tyreSize: '',
  trackMm: null,
  studsPcdMode: 'standard',
  studsPcdStandardSelections: [],
  studsPcdSpecialText: '',
  wheelBase: '',
  finish: 'Black Primer default',
  brakeType: null,
  brakeSize: '',
  suspension: '',
  productComments: '',
  attachments: [],
});

const buildLegacyProduct = (request: Partial<CustomerRequest>): RequestProduct => ({
  axleLocation: request.axleLocation ?? '',
  axleLocationOther: request.axleLocationOther ?? '',
  articulationType: request.articulationType ?? '',
  articulationTypeOther: request.articulationTypeOther ?? '',
  configurationType: request.configurationType ?? '',
  configurationTypeOther: request.configurationTypeOther ?? '',
  loadsKg: request.loadsKg ?? null,
  speedsKmh: request.speedsKmh ?? null,
  tyreSize: request.tyreSize ?? '',
  trackMm: request.trackMm ?? null,
  studsPcdMode: request.studsPcdMode ?? 'standard',
  studsPcdStandardSelections: Array.isArray(request.studsPcdStandardSelections) ? request.studsPcdStandardSelections : [],
  studsPcdSpecialText: request.studsPcdSpecialText ?? '',
  wheelBase: request.wheelBase ?? '',
  finish: request.finish ?? 'Black Primer default',
  brakeType: request.brakeType ?? null,
  brakeSize: request.brakeSize ?? '',
  suspension: request.suspension ?? '',
  productComments: typeof (request as any).productComments === 'string'
    ? (request as any).productComments
    : request.otherRequirements ?? '',
  attachments: Array.isArray(request.attachments) ? request.attachments : [],
});

const normalizeProducts = (request?: Partial<CustomerRequest>): RequestProduct[] => {
  if (!request) return [getInitialProduct()];
  const products = Array.isArray(request.products) ? request.products : [];
  if (products.length) {
    return products.map((product) => ({
      ...getInitialProduct(),
      ...product,
      studsPcdMode: product.studsPcdMode ?? 'standard',
      studsPcdStandardSelections: Array.isArray(product.studsPcdStandardSelections) ? product.studsPcdStandardSelections : [],
      studsPcdSpecialText: product.studsPcdSpecialText ?? '',
      productComments: typeof (product as any).productComments === 'string'
        ? (product as any).productComments
        : (product as any).otherRequirements ?? '',
      attachments: Array.isArray(product.attachments) ? product.attachments : [],
    }));
  }
  return [buildLegacyProduct(request)];
};

const getInitialFormData = (): Partial<CustomerRequest> => ({
  clientName: '',
  clientContact: '',
  applicationVehicle: '',
  applicationVehicleOther: '',
  country: '',
  expectedQty: null,
  repeatability: '',
  expectedDeliverySelections: [],
  workingCondition: '',
  workingConditionOther: '',
  usageType: '',
  usageTypeOther: '',
  environment: '',
  environmentOther: '',
  products: [getInitialProduct()],
  status: 'draft',
});

const RequestForm: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getRequestById, createRequest, updateRequest, updateStatus, isLoading } = useRequests();
  const { t } = useLanguage();
  const {
    applicationVehicles,
    countries,
    axleLocations,
    articulationTypes,
    configurationTypes,
    brakeTypes,
    brakeSizes,
    suspensions,
    repeatabilityTypes,
    expectedDeliveryOptions,
    workingConditions,
    usageTypes,
    environments,
  } = useAdminSettings();
  const { toast } = useToast();

  const isEditMode = location.pathname.includes('/edit');
  const isViewMode = id && !isEditMode;
  const isCreateMode = !id;

  const existingRequest = id ? getRequestById(id) : undefined;

  // If we have an ID but no request found, redirect to dashboard
  if (id && isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (id && !existingRequest) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t.request.requestNotFound}</h1>
          <p className="text-muted-foreground mb-6">{t.request.requestNotFoundDesc}</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} className="mr-2" />
            {t.request.backToDashboard}
          </Button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<Partial<CustomerRequest>>(
    existingRequest ? { ...existingRequest, products: normalizeProducts(existingRequest) } : getInitialFormData()
  );
  const [loadedRequestId, setLoadedRequestId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!existingRequest) {
      if (loadedRequestId !== null) {
        setFormData(getInitialFormData());
        setLoadedRequestId(null);
      }
      return;
    }

    if (existingRequest.id !== loadedRequestId) {
      setFormData({ ...existingRequest, products: normalizeProducts(existingRequest) });
      setLoadedRequestId(existingRequest.id);
    }
  }, [existingRequest, loadedRequestId]);

  // Determine form mode
  const mode: FormMode = useMemo(() => {
    if (isCreateMode) return 'create';
    if (!existingRequest) return 'read_only';
    
    // Admin can always edit (when in edit route)
    if (user?.role === 'admin' && isEditMode) {
      return 'draft_edit';
    }
    
    const canEdit = user?.role === 'sales' && 
      (existingRequest.status === 'draft' || existingRequest.status === 'clarification_needed');
    
    if (!canEdit || isViewMode) return 'read_only';
    
    if (existingRequest.status === 'draft') return 'draft_edit';
    if (existingRequest.status === 'clarification_needed') return 'clarification_edit';
    
    return 'read_only';
  }, [isCreateMode, existingRequest, user, isViewMode, isEditMode]);

  const isReadOnly = mode === 'read_only';

  const handleChange = (field: keyof CustomerRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is changed
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleProductChange = (index: number, field: keyof RequestProduct, value: any) => {
    setFormData(prev => {
      const products = [...(prev.products ?? [])];
      while (products.length <= index) {
        products.push(getInitialProduct());
      }
      products[index] = { ...products[index], [field]: value };
      return { ...prev, products };
    });

    const errorKey = `product_${index}_${String(field)}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleAddProduct = () => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      products: [...(prev.products ?? []), getInitialProduct()],
    }));
  };

  const handleRemoveProduct = (index: number) => {
    if (isReadOnly) return;
    setFormData(prev => {
      const products = [...(prev.products ?? [])];
      products.splice(index, 1);
      return { ...prev, products: products.length ? products : [getInitialProduct()] };
    });
    setErrors(prev => {
      const newErrors: Record<string, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const match = key.match(/^product_(\d+)_(.+)$/);
        if (!match) {
          newErrors[key] = value;
          return;
        }
        const keyIndex = Number(match[1]);
        if (Number.isNaN(keyIndex) || keyIndex === index) {
          return;
        }
        const newIndex = keyIndex > index ? keyIndex - 1 : keyIndex;
        newErrors[`product_${newIndex}_${match[2]}`] = value;
      });
      return newErrors;
    });
  };

  const getProductErrors = (index: number) => {
    const prefix = `product_${index}_`;
    return Object.keys(errors).reduce<Record<string, string>>((acc, key) => {
      if (key.startsWith(prefix)) {
        acc[key.slice(prefix.length)] = errors[key];
      }
      return acc;
    }, {});
  };

  const validateForSubmit = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName?.trim()) {
      newErrors.clientName = t.request.clientName + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.clientContact?.trim()) {
      newErrors.clientContact = t.request.clientContact + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.applicationVehicle?.trim() && formData.applicationVehicle !== 'other') {
      newErrors.applicationVehicle = t.request.applicationVehicle + ' ' + t.common.required.toLowerCase();
    }
    if (formData.applicationVehicle === 'other' && !formData.applicationVehicleOther?.trim()) {
      newErrors.applicationVehicleOther = t.request.specifyVehicle + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.country?.trim()) {
      newErrors.country = t.request.country + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.expectedQty) {
      newErrors.expectedQty = t.request.expectedQty + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.repeatability) {
      newErrors.repeatability = t.request.repeatability + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.expectedDeliverySelections?.length) {
      newErrors.expectedDeliverySelections = t.request.expectedDelivery + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.workingCondition) {
      newErrors.workingCondition = t.request.workingCondition + ' ' + t.common.required.toLowerCase();
    }
    if (formData.workingCondition === 'other' && !formData.workingConditionOther?.trim()) {
      newErrors.workingConditionOther = t.request.specifyWorkingCondition + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.usageType) {
      newErrors.usageType = t.request.usageType + ' ' + t.common.required.toLowerCase();
    }
    if (formData.usageType === 'other' && !formData.usageTypeOther?.trim()) {
      newErrors.usageTypeOther = t.request.specifyUsageType + ' ' + t.common.required.toLowerCase();
    }
    if (!formData.environment) {
      newErrors.environment = t.request.environment + ' ' + t.common.required.toLowerCase();
    }
    if (formData.environment === 'other' && !formData.environmentOther?.trim()) {
      newErrors.environmentOther = t.request.specifyEnvironment + ' ' + t.common.required.toLowerCase();
    }
    const products = formData.products ?? [];
    products.forEach((product, index) => {
      const prefix = `product_${index}_`;

      if (!product.axleLocation) {
        newErrors[`${prefix}axleLocation`] = t.request.axleLocation + ' ' + t.common.required.toLowerCase();
      }
      if (product.axleLocation === 'other' && !product.axleLocationOther?.trim()) {
        newErrors[`${prefix}axleLocationOther`] = t.request.specifyAxleLocation + ' ' + t.common.required.toLowerCase();
      }
      if (!product.articulationType) {
        newErrors[`${prefix}articulationType`] = t.request.articulationType + ' ' + t.common.required.toLowerCase();
      }
      if (product.articulationType === 'other' && !product.articulationTypeOther?.trim()) {
        newErrors[`${prefix}articulationTypeOther`] = t.request.specifyArticulationType + ' ' + t.common.required.toLowerCase();
      }
      if (!product.configurationType) {
        newErrors[`${prefix}configurationType`] = t.request.configurationType + ' ' + t.common.required.toLowerCase();
      }
      if (product.configurationType === 'other' && !product.configurationTypeOther?.trim()) {
        newErrors[`${prefix}configurationTypeOther`] = t.request.specifyConfigurationType + ' ' + t.common.required.toLowerCase();
      }
      if (!product.loadsKg) {
        newErrors[`${prefix}loadsKg`] = t.request.loads + ' ' + t.common.required.toLowerCase();
      }
      if (!product.speedsKmh) {
        newErrors[`${prefix}speedsKmh`] = t.request.speeds + ' ' + t.common.required.toLowerCase();
      }
      if (!product.tyreSize?.trim()) {
        newErrors[`${prefix}tyreSize`] = t.request.tyreSize + ' ' + t.common.required.toLowerCase();
      }
      if (!product.trackMm) {
        newErrors[`${prefix}trackMm`] = t.request.track + ' ' + t.common.required.toLowerCase();
      }
      if (!product.brakeType) {
        newErrors[`${prefix}brakeType`] = t.request.brakeType + ' ' + t.common.required.toLowerCase();
      }
      if (!product.brakeSize) {
        newErrors[`${prefix}brakeSize`] = t.request.brakeSize + ' ' + t.common.required.toLowerCase();
      }
      if (!product.suspension?.trim()) {
        newErrors[`${prefix}suspension`] = t.request.suspension + ' ' + t.common.required.toLowerCase();
      }

      if (product.studsPcdMode === 'standard') {
        if (!product.studsPcdStandardSelections?.length) {
          newErrors[`${prefix}studsPcdStandardSelections`] = t.request.standardOptions + ' ' + t.common.required.toLowerCase();
        }
      } else {
        if (!product.studsPcdSpecialText?.trim()) {
          newErrors[`${prefix}studsPcdSpecialText`] = t.request.specialPcd + ' ' + t.common.required.toLowerCase();
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const prepareRequestPayload = (data: Partial<CustomerRequest>): Partial<CustomerRequest> => {
    const products = data.products ?? [];
    if (!products.length) return data;
    const primary = products[0];
    return {
      ...data,
      products,
      axleLocation: primary.axleLocation,
      axleLocationOther: primary.axleLocationOther,
      articulationType: primary.articulationType,
      articulationTypeOther: primary.articulationTypeOther,
      configurationType: primary.configurationType,
      configurationTypeOther: primary.configurationTypeOther,
      loadsKg: primary.loadsKg,
      speedsKmh: primary.speedsKmh,
      tyreSize: primary.tyreSize,
      trackMm: primary.trackMm,
      studsPcdMode: primary.studsPcdMode,
      studsPcdStandardSelections: primary.studsPcdStandardSelections,
      studsPcdSpecialText: primary.studsPcdSpecialText,
      wheelBase: primary.wheelBase,
      finish: primary.finish,
      brakeType: primary.brakeType,
      brakeSize: primary.brakeSize,
      suspension: primary.suspension,
      otherRequirements: primary.productComments,
      attachments: primary.attachments,
    };
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isCreateMode) {
        const newRequest = await createRequest(
          prepareRequestPayload({
            ...formData as any,
            status: 'draft',
          }) as any
        );
        toast({
          title: t.request.draftSaved,
          description: `${t.dashboard.requests} ${newRequest.id} ${t.request.draftSavedDesc}`,
        });
        navigate(`/requests/${newRequest.id}/edit`);
      } else if (existingRequest) {
        await updateRequest(existingRequest.id, prepareRequestPayload(formData));
        toast({
          title: t.request.draftSaved,
          description: t.request.draftSavedDesc,
        });
      }
    } catch (error) {
      toast({
        title: t.request.error,
        description: t.request.failedSaveDraft,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForSubmit()) {
      toast({
        title: t.request.validationError,
        description: t.request.fillRequiredFields,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isCreateMode) {
        const newRequest = await createRequest(
          prepareRequestPayload({
            ...formData as any,
            status: 'submitted',
          }) as any
        );
        toast({
          title: t.request.requestSubmitted,
          description: `${t.dashboard.requests} ${newRequest.id} ${t.request.requestSubmittedDesc}`,
        });
        navigate('/dashboard');
      } else if (existingRequest) {
        await updateRequest(existingRequest.id, prepareRequestPayload({ ...formData, status: 'submitted' }));
        await updateStatus(existingRequest.id, 'submitted');
        toast({
          title: t.request.requestSubmitted,
          description: t.request.requestSubmittedDesc,
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: t.request.error,
        description: t.request.failedSubmit,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDesignStatusUpdate = async (status: RequestStatus, data?: { comment?: string; message?: string; date?: Date }) => {
    if (!existingRequest) return;
    
    setIsUpdating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updates: Partial<CustomerRequest> = {};
      
      if (status === 'clarification_needed' && data?.comment) {
        updates.clarificationComment = data.comment;
      }
      if (status === 'feasibility_confirmed') {
        updates.acceptanceMessage = data?.message;
        updates.expectedDesignReplyDate = data?.date;
      }
      
      await updateRequest(existingRequest.id, updates);
      await updateStatus(existingRequest.id, status, data?.comment || data?.message);
      
      toast({
        title: t.request.statusUpdated,
        description: `${t.common.status}: ${t.statuses[status as keyof typeof t.statuses] || status}`,
      });
    } catch (error) {
      toast({
        title: t.request.error,
        description: t.request.failedSubmit,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCostingStatusUpdate = async (status: RequestStatus, notes?: string) => {
    if (!existingRequest) return;
    
    setIsUpdating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (notes !== undefined) {
        await updateRequest(existingRequest.id, { costingNotes: notes });
      }
      await updateStatus(existingRequest.id, status);
      
      toast({
        title: t.request.statusUpdated,
        description: `${t.common.status}: ${t.statuses[status as keyof typeof t.statuses] || status}`,
      });
    } catch (error) {
      toast({
        title: t.request.error,
        description: t.request.failedSubmit,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClarificationResubmit = async (response: string) => {
    if (!existingRequest) return;
    
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await updateRequest(existingRequest.id, {
        ...prepareRequestPayload(formData),
        clarificationResponse: response,
        status: 'submitted',
      });
      await updateStatus(existingRequest.id, 'submitted', `${t.panels.clarificationResponse}: ${response}`);
      
      toast({
        title: t.request.requestSubmitted,
        description: t.request.requestSubmittedDesc,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: t.request.error,
        description: t.request.failedSubmit,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDesignPanel = user?.role === 'design' && existingRequest && 
    ['submitted', 'under_review'].includes(existingRequest.status);
  
  const showCostingPanel = user?.role === 'costing' && existingRequest && 
    ['feasibility_confirmed', 'in_costing'].includes(existingRequest.status);
  
  const showClarificationPanel = (user?.role === 'sales' || user?.role === 'admin') && 
    existingRequest?.status === 'clarification_needed';

  const products = formData.products && formData.products.length
    ? formData.products
    : [getInitialProduct()];

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="shrink-0 hidden md:flex"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">
                {isCreateMode ? t.request.newRequest : existingRequest?.id}
              </h1>
              {existingRequest && (
                <StatusBadge status={existingRequest.status} size="lg" />
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-1">
              {isCreateMode 
                ? t.request.fillDetails
                : isReadOnly 
                  ? t.request.viewDetails 
                  : t.request.editDetails}
            </p>
          </div>
        </div>
      </div>

      <div className={existingRequest ? "grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8" : "w-full"}>
        {/* Main Form */}
        <div className={existingRequest ? "lg:col-span-2 space-y-4 md:space-y-8" : "space-y-4 md:space-y-8"}>
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-6 md:space-y-8">
            <SectionGeneralInfo
              formData={formData}
              onChange={handleChange}
              isReadOnly={isReadOnly}
              errors={errors}
              countryOptions={countries.map(c => c.value)}
              repeatabilityOptions={repeatabilityTypes.map((r) => r.value)}
            />

            <SectionExpectedDelivery
              formData={formData}
              onChange={handleChange}
              isReadOnly={isReadOnly}
              errors={errors}
              expectedDeliveryOptions={expectedDeliveryOptions.map((o) => o.value)}
            />
            
            <SectionClientApplication
              formData={formData}
              onChange={handleChange}
              isReadOnly={isReadOnly}
              errors={errors}
              applicationVehicleOptions={applicationVehicles.map(v => v.value)}
              workingConditionOptions={workingConditions.map((c) => c.value)}
              usageTypeOptions={usageTypes.map((u) => u.value)}
              environmentOptions={environments.map((e) => e.value)}
            />

            {products.map((product, index) => {
              const productLabel = `${t.request.productLabel} ${index + 1}`;
              const productErrors = getProductErrors(index);

              return (
                <div key={`product-${index}`} className="space-y-4 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{productLabel}</p>
                    {!isReadOnly && products.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        {t.request.removeProduct}
                      </Button>
                    )}
                  </div>

                  <SectionTechnicalInfo
                    formData={product}
                    onChange={(field, value) => handleProductChange(index, field, value)}
                    isReadOnly={isReadOnly}
                    errors={productErrors}
                    configurationTypeOptions={configurationTypes.map((c) => c.value)}
                    axleLocationOptions={axleLocations.map((a) => a.value)}
                    articulationTypeOptions={articulationTypes.map((a) => a.value)}
                    brakeTypeOptions={brakeTypes.map((b) => b.value)}
                    brakeSizeOptions={brakeSizes.map((b) => b.value)}
                    suspensionOptions={suspensions.map((s) => s.value)}
                    title={`${t.request.technicalInfo} - ${productLabel}`}
                    badgeLabel={`P${index + 1}`}
                    idPrefix={`product-${index}`}
                  />

                  <SectionAdditionalInfo
                    formData={product}
                    onChange={(field, value) => handleProductChange(index, field, value)}
                    isReadOnly={isReadOnly}
                    errors={productErrors}
                    title={`${t.request.additionalInfo} - ${productLabel}`}
                    badgeLabel={`P${index + 1}`}
                    idPrefix={`product-${index}`}
                  />
                </div>
              );
            })}

            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddProduct}
                className="w-full border-dashed"
              >
                {t.request.addProduct}
              </Button>
            )}
          </div>

          {/* Role-specific panels */}
          {showClarificationPanel && existingRequest && (
            <ClarificationPanel
              request={existingRequest}
              onResubmit={handleClarificationResubmit}
              isSubmitting={isSubmitting}
            />
          )}

          {showDesignPanel && existingRequest && (
            <DesignReviewPanel
              request={existingRequest}
              onUpdateStatus={handleDesignStatusUpdate}
              isUpdating={isUpdating}
            />
          )}

          {showCostingPanel && existingRequest && (
            <CostingPanel
              request={existingRequest}
              onUpdateStatus={handleCostingStatusUpdate}
              onUpdateCostingData={async (data) => {
                await updateRequest(existingRequest.id, data);
              }}
              isUpdating={isUpdating}
            />
          )}
        </div>

        {/* Sidebar - only show for existing requests */}
        {existingRequest && (
          <div className="space-y-4 md:space-y-6">
            <StatusTimeline history={existingRequest.history} />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <RequestActionBar
        mode={mode}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
      />
    </div>
  );
};

export default RequestForm;
