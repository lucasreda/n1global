import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface GridTemplateEditorProps {
  values: {
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    gridAutoFlow?: string;
    gridAutoColumns?: string;
    gridAutoRows?: string;
    gap?: string;
    columnGap?: string;
    rowGap?: string;
  };
  onChange: (updates: Record<string, string>) => void;
}

const gridAutoFlowOptions = [
  { value: 'row', label: 'Row' },
  { value: 'column', label: 'Column' },
  { value: 'row dense', label: 'Row Dense' },
  { value: 'column dense', label: 'Column Dense' },
];

const trackPresets = [
  { value: '1fr', label: '1fr (Flex)' },
  { value: 'auto', label: 'auto' },
  { value: 'min-content', label: 'min-content' },
  { value: 'max-content', label: 'max-content' },
  { value: '100px', label: '100px' },
  { value: '200px', label: '200px' },
];

export function GridTemplateEditor({ values, onChange }: GridTemplateEditorProps) {
  const [columnsInput, setColumnsInput] = useState(values.gridTemplateColumns || '');
  const [rowsInput, setRowsInput] = useState(values.gridTemplateRows || '');

  // Sync local state when props change (node/breakpoint switch)
  useEffect(() => {
    setColumnsInput(values.gridTemplateColumns || '');
  }, [values.gridTemplateColumns]);

  useEffect(() => {
    setRowsInput(values.gridTemplateRows || '');
  }, [values.gridTemplateRows]);

  const handleColumnsChange = (value: string) => {
    setColumnsInput(value);
    onChange({ gridTemplateColumns: value });
  };

  const handleRowsChange = (value: string) => {
    setRowsInput(value);
    onChange({ gridTemplateRows: value });
  };

  const addColumn = (track: string) => {
    const current = columnsInput.trim();
    const newValue = current ? `${current} ${track}` : track;
    handleColumnsChange(newValue);
  };

  const addRow = (track: string) => {
    const current = rowsInput.trim();
    const newValue = current ? `${current} ${track}` : track;
    handleRowsChange(newValue);
  };

  const clearColumns = () => handleColumnsChange('');
  const clearRows = () => handleRowsChange('');

  return (
    <div className="space-y-4">
      {/* Grid Template Columns */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Grid Columns</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearColumns}
            className="h-6 px-2 text-xs"
            data-testid="button-clear-columns"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <Input
          value={columnsInput}
          onChange={(e) => handleColumnsChange(e.target.value)}
          placeholder="e.g. 1fr 1fr 1fr"
          className="text-xs h-8 font-mono"
          data-testid="input-grid-columns"
        />
        <div className="flex flex-wrap gap-1">
          {trackPresets.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              onClick={() => addColumn(preset.value)}
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="w-2 h-2 mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Template Rows */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Grid Rows</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRows}
            className="h-6 px-2 text-xs"
            data-testid="button-clear-rows"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
        <Input
          value={rowsInput}
          onChange={(e) => handleRowsChange(e.target.value)}
          placeholder="e.g. auto 1fr auto"
          className="text-xs h-8 font-mono"
          data-testid="input-grid-rows"
        />
        <div className="flex flex-wrap gap-1">
          {trackPresets.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              onClick={() => addRow(preset.value)}
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="w-2 h-2 mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid Auto Flow */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Auto Flow</Label>
        <Select
          value={values.gridAutoFlow || 'row'}
          onValueChange={(value) => onChange({ gridAutoFlow: value })}
        >
          <SelectTrigger className="text-xs h-8" data-testid="select-grid-auto-flow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {gridAutoFlowOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid Auto Columns/Rows */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Auto Columns</Label>
          <Input
            value={values.gridAutoColumns || ''}
            onChange={(e) => onChange({ gridAutoColumns: e.target.value })}
            placeholder="auto"
            className="text-xs h-7"
            data-testid="input-grid-auto-columns"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Auto Rows</Label>
          <Input
            value={values.gridAutoRows || ''}
            onChange={(e) => onChange({ gridAutoRows: e.target.value })}
            placeholder="auto"
            className="text-xs h-7"
            data-testid="input-grid-auto-rows"
          />
        </div>
      </div>

      {/* Gap Controls */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Gap</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={values.columnGap || values.gap || ''}
            onChange={(e) => onChange({ columnGap: e.target.value, gap: '' })}
            placeholder="Column gap"
            className="text-xs h-7"
            data-testid="input-column-gap"
          />
          <Input
            value={values.rowGap || values.gap || ''}
            onChange={(e) => onChange({ rowGap: e.target.value, gap: '' })}
            placeholder="Row gap"
            className="text-xs h-7"
            data-testid="input-row-gap"
          />
        </div>
      </div>
    </div>
  );
}
