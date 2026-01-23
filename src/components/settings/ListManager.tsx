import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ListItem {
  id: string;
  value: string;
}

interface ListManagerProps {
  title: string;
  icon: React.ElementType;
  list: ListItem[];
  listName: string;
  onAddItem: (value: string) => Promise<ListItem>;
  onDeleteItem: (id: string) => Promise<void>;
  onEditItem: (listName: string, item: ListItem) => void;
  onToast: (title: string, description: string) => void;
}

const ListManager: React.FC<ListManagerProps> = ({
  title,
  icon: Icon,
  list,
  listName,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onToast,
}) => {
  const [newItemValue, setNewItemValue] = useState('');
  const { t, translateOption } = useLanguage();

  const handleAddItem = async () => {
    if (!newItemValue.trim()) return;
    
    try {
      const newItem = await onAddItem(newItemValue.trim());
      setNewItemValue('');
      const displayValue = translateOption(newItem.value);
      onToast(t.request.itemAdded, `"${displayValue}" ${t.request.itemAddedTo} ${listName}.`);
    } catch (error) {
      console.error('Failed to add item:', error);
      onToast(t.request.error, t.request.failedSubmit);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const item = list.find(i => i.id === id);
    try {
      await onDeleteItem(id);
      const displayValue = item?.value ? translateOption(item.value) : '';
      onToast(t.request.itemDeleted, `"${displayValue}" ${t.request.itemRemovedFrom} ${listName}.`);
    } catch (error) {
      console.error('Failed to delete item:', error);
      onToast(t.request.error, t.request.failedSubmit);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon size={20} />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={newItemValue}
          onChange={(e) => setNewItemValue(e.target.value)}
          placeholder={`${t.settings.addItem}...`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
        />
        <Button onClick={handleAddItem}>
          <Plus size={16} />
        </Button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
        {list.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
          >
            <span className="text-sm text-foreground">{translateOption(item.value)}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEditItem(listName, item)}
                className="p-1 hover:bg-primary/20 rounded text-primary"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1 hover:bg-destructive/20 rounded text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t.request.noItemsYet}
          </p>
        )}
      </div>
    </div>
  );
};

export default ListManager;
