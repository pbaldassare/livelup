import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Pencil, Plus } from 'lucide-react';

// =====================================================
// INLINE EDITABLE CELLS - Celle tabella modificabili
// =====================================================

interface InlineEditTextProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineEditText({ value, onSave, placeholder = 'Inserisci...', className }: InlineEditTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm"
          placeholder={placeholder}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
          <Check className="h-3 w-3 text-success" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2',
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn(!value && 'text-muted-foreground italic')}>
        {value || placeholder}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// =====================================================
// INLINE SELECT - Selezione inline
// =====================================================

interface InlineEditSelectProps {
  value: string | null;
  options: { value: string; label: string }[];
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineEditSelect({ value, options, onSave, placeholder = 'Seleziona...', className }: InlineEditSelectProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (newValue: string) => {
    onSave(newValue);
    setIsEditing(false);
  };

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Select value={value || ''} onValueChange={handleSave}>
          <SelectTrigger className="h-7 text-sm w-[120px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(false)}>
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2',
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn('capitalize', !value && 'text-muted-foreground italic')}>
        {selectedLabel || placeholder}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// =====================================================
// INLINE TAGS - Tags modificabili inline
// =====================================================

interface InlineEditTagsProps {
  value: string[];
  onSave: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxDisplay?: number;
  className?: string;
}

export function InlineEditTags({ 
  value = [], 
  onSave, 
  suggestions = [],
  placeholder = 'Aggiungi...',
  maxDisplay = 2,
  className 
}: InlineEditTagsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string[]>(value);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !editValue.includes(trimmedTag)) {
      setEditValue([...editValue, trimmedTag]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditValue(editValue.filter(t => t !== tag));
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
    if (e.key === 'Escape') handleCancel();
  };

  const filteredSuggestions = suggestions.filter(
    s => !editValue.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 5);

  if (isEditing) {
    return (
      <div className="space-y-2 min-w-[200px]">
        <div className="flex flex-wrap gap-1">
          {editValue.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            placeholder={placeholder}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
            <Check className="h-3 w-3 text-success" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
        {filteredSuggestions.length > 0 && inputValue && (
          <div className="flex flex-wrap gap-1">
            {filteredSuggestions.map((s) => (
              <Badge 
                key={s} 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-muted"
                onClick={() => handleAddTag(s)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {s}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  const displayTags = value.slice(0, maxDisplay);
  const remainingCount = value.length - maxDisplay;

  return (
    <div
      className={cn(
        'group flex items-center gap-1 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -mx-2',
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {displayTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-xs">
              +{remainingCount}
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground italic text-sm">{placeholder}</span>
      )}
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
    </div>
  );
}

export default InlineEditText;
