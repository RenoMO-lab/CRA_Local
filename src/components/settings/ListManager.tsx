import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Pencil, GripVertical } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onReorderItems: (orderedIds: string[]) => Promise<void>;
  onToast: (title: string, description: string) => void;
}

const SortableRow: React.FC<{
  item: ListItem;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}> = ({ item, onEdit, onDelete, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border',
        isDragging ? 'opacity-80 shadow-md' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="p-1 -ml-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="min-w-0">{children}</div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-1 hover:bg-primary/20 rounded text-primary" type="button">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-destructive/20 rounded text-destructive" type="button">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const ListManager: React.FC<ListManagerProps> = ({
  title,
  icon: Icon,
  list,
  listName,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onReorderItems,
  onToast,
}) => {
  const [newItemValue, setNewItemValue] = useState('');
  const { t, translateOption } = useLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = list.findIndex((i) => i.id === String(active.id));
    const newIndex = list.findIndex((i) => i.id === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(list, oldIndex, newIndex);
    try {
      await onReorderItems(next.map((i) => i.id));
    } catch (error) {
      onToast(t.request.error, 'Failed to save ordering. Please try again.');
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {list.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                onEdit={() => onEditItem(listName, item)}
                onDelete={() => handleDeleteItem(item.id)}
              >
                <span className="text-sm text-foreground truncate">{translateOption(item.value)}</span>
              </SortableRow>
            ))}
          </SortableContext>
        </DndContext>
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
