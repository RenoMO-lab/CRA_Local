import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAdminSettings } from '@/context/AdminSettingsContext';
import { ReferenceProduct, STANDARD_STUDS_PCD_OPTIONS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil } from 'lucide-react';

type ReferenceProductDraft = Omit<ReferenceProduct, 'id' | 'createdAt' | 'updatedAt'>;

const emptyDraft = (): ReferenceProductDraft => ({
  configurationType: '',
  articulationType: '',
  brakeType: '',
  brakeSize: '',
  studsPcdStandards: [],
});

const PriceList: React.FC = () => {
  const { user } = useAuth();
  const { t, translateOption } = useLanguage();
  const {
    configurationTypes,
    articulationTypes,
    brakeTypes,
    brakeSizes,
  } = useAdminSettings();

  const [products, setProducts] = useState<ReferenceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReferenceProductDraft>(emptyDraft());
  const [keyword, setKeyword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ReferenceProduct | null>(null);
  const [draft, setDraft] = useState<ReferenceProductDraft>(emptyDraft());

  React.useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    fetch('/api/price-list')
      .then((res) => res.json())
      .then((data) => {
        if (!isActive) return;
        const mapped = Array.isArray(data)
          ? data.map((item: any) => ({
              ...item,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
              studsPcdStandards: Array.isArray(item.studsPcdStandards) ? item.studsPcdStandards : [],
            }))
          : [];
        setProducts(mapped);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  if (!user || (user.role !== 'sales' && user.role !== 'admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdmin = user.role === 'admin';

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return products.filter((product) => {
      if (filters.configurationType && product.configurationType !== filters.configurationType) return false;
      if (filters.articulationType && product.articulationType !== filters.articulationType) return false;
      if (filters.brakeType && product.brakeType !== filters.brakeType) return false;
      if (filters.brakeSize && product.brakeSize !== filters.brakeSize) return false;
      if (filters.studsPcdStandards.length > 0) {
        const matches = filters.studsPcdStandards.some((value) => product.studsPcdStandards.includes(value));
        if (!matches) return false;
      }
      if (normalizedKeyword) {
        const haystack = [
          product.configurationType,
          product.articulationType,
          product.brakeType,
          product.brakeSize,
          ...product.studsPcdStandards.map(getStudsLabel),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(normalizedKeyword)) return false;
      }
      return true;
    });
  }, [products, filters, keyword]);

  const clearFilters = () => {
    setFilters(emptyDraft());
    setKeyword('');
  };

  const getStudsLabel = (value: string) => {
    const match = STANDARD_STUDS_PCD_OPTIONS.find((opt) => opt.id === value);
    return translateOption(match?.label ?? value);
  };

  const buildCardTitle = (product: ReferenceProduct) => {
    const parts = [
      product.configurationType ? translateOption(product.configurationType) : t.priceList.notSet,
      product.articulationType ? translateOption(product.articulationType) : t.priceList.notSet,
      product.brakeType ? translateOption(product.brakeType) : t.priceList.notSet,
      product.brakeSize ? translateOption(product.brakeSize) : t.priceList.notSet,
    ];
    return parts.join(' / ');
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setDraft(emptyDraft());
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: ReferenceProduct) => {
    setEditingProduct(product);
    setDraft({
      configurationType: product.configurationType,
      articulationType: product.articulationType,
      brakeType: product.brakeType,
      brakeSize: product.brakeSize,
      studsPcdStandards: product.studsPcdStandards,
    });
    setIsDialogOpen(true);
  };

  const saveProduct = async () => {
    const payload = {
      configurationType: draft.configurationType,
      articulationType: draft.articulationType,
      brakeType: draft.brakeType,
      brakeSize: draft.brakeSize,
      studsPcdStandards: draft.studsPcdStandards,
    };

    if (editingProduct) {
      const res = await fetch(`/api/price-list/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((item) => (item.id === editingProduct.id ? { ...item, ...updated, updatedAt: new Date() } : item))
      );
    } else {
      const res = await fetch('/api/price-list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setProducts((prev) => [{ ...created, createdAt: new Date(created.createdAt), updatedAt: new Date(created.updatedAt) }, ...prev]);
    }

    setIsDialogOpen(false);
  };

  const deleteProduct = async (product: ReferenceProduct) => {
    await fetch(`/api/price-list/${product.id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    if (selectedId === product.id) {
      setSelectedId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.priceList.title}</h1>
          <p className="text-muted-foreground mt-1">{t.priceList.description}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog}>
            <Plus size={16} className="mr-2" />
            {t.priceList.addReference}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-2">
        <Label>{t.priceList.keywordFilter}</Label>
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t.priceList.keywordPlaceholder}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t.priceList.selectReference}</h2>
          <p className="text-sm text-muted-foreground">{t.priceList.selectReferenceDesc}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t.request.configurationType}</Label>
            <Select
              value={filters.configurationType || ''}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, configurationType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.priceList.allOptions} />
              </SelectTrigger>
              <SelectContent>
                {configurationTypes.map((item) => (
                  <SelectItem key={item.id} value={item.value}>
                    {translateOption(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.request.articulationType}</Label>
            <Select
              value={filters.articulationType || ''}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, articulationType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.priceList.allOptions} />
              </SelectTrigger>
              <SelectContent>
                {articulationTypes.map((item) => (
                  <SelectItem key={item.id} value={item.value}>
                    {translateOption(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.request.brakeType}</Label>
            <Select
              value={filters.brakeType || ''}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, brakeType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.priceList.allOptions} />
              </SelectTrigger>
              <SelectContent>
                {brakeTypes.map((item) => (
                  <SelectItem key={item.id} value={item.value}>
                    {translateOption(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t.request.brakeSize}</Label>
            <Select
              value={filters.brakeSize || ''}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, brakeSize: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.priceList.allOptions} />
              </SelectTrigger>
              <SelectContent>
                {brakeSizes.map((item) => (
                  <SelectItem key={item.id} value={item.value}>
                    {translateOption(item.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t.priceList.studsPcdStandards}</Label>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {STANDARD_STUDS_PCD_OPTIONS.map((option) => {
              const checked = filters.studsPcdStandards.includes(option.id);
              return (
                <label key={option.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      const isChecked = Boolean(value);
                      setFilters((prev) => ({
                        ...prev,
                        studsPcdStandards: isChecked
                          ? [...prev.studsPcdStandards, option.id]
                          : prev.studsPcdStandards.filter((id) => id !== option.id),
                      }));
                    }}
                  />
                  {translateOption(option.label)}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            {t.priceList.clearFilters}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
          {t.common.loading}
        </div>
      )}

      {!isLoading && filteredProducts.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
          {t.priceList.emptyState}
        </div>
      )}

      {!isLoading && filteredProducts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const isSelected = selectedId === product.id;
            return (
              <div
                key={product.id}
                className={`rounded-lg border p-4 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className="w-full text-left space-y-2"
                >
                  <div className="text-sm font-semibold text-foreground">{buildCardTitle(product)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.priceList.studsPcdStandards}: {product.studsPcdStandards.length > 0 ? product.studsPcdStandards.map(getStudsLabel).join(', ') : t.priceList.notSet}
                  </div>
                  {isSelected && (
                    <div className="text-xs font-medium text-primary">{t.priceList.selected}</div>
                  )}
                </button>
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-3">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                      <Pencil size={14} className="mr-1" />
                      {t.common.edit}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 size={14} className="mr-1" />
                          {t.common.delete}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.priceList.deleteConfirm}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteProduct(product)}>
                            {t.common.confirm}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? t.priceList.editReference : t.priceList.addReference}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.request.configurationType}</Label>
              <Select
                value={draft.configurationType}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, configurationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.priceList.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {configurationTypes.map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {translateOption(item.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.request.articulationType}</Label>
              <Select
                value={draft.articulationType}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, articulationType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.priceList.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {articulationTypes.map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {translateOption(item.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.request.brakeType}</Label>
              <Select
                value={draft.brakeType}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, brakeType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.priceList.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {brakeTypes.map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {translateOption(item.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.request.brakeSize}</Label>
              <Select
                value={draft.brakeSize}
                onValueChange={(value) => setDraft((prev) => ({ ...prev, brakeSize: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.priceList.selectOption} />
                </SelectTrigger>
                <SelectContent>
                  {brakeSizes.map((item) => (
                    <SelectItem key={item.id} value={item.value}>
                      {translateOption(item.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.priceList.studsPcdStandards}</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {STANDARD_STUDS_PCD_OPTIONS.map((option) => {
                const checked = draft.studsPcdStandards.includes(option.id);
                return (
                  <label key={option.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const isChecked = Boolean(value);
                        setDraft((prev) => ({
                          ...prev,
                          studsPcdStandards: isChecked
                            ? [...prev.studsPcdStandards, option.id]
                            : prev.studsPcdStandards.filter((id) => id !== option.id),
                        }));
                      }}
                    />
                    {translateOption(option.label)}
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={saveProduct}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PriceList;
