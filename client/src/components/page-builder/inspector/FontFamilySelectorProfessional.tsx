import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Type, Search, Check } from 'lucide-react';

interface FontFamilySelectorProfessionalProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  'data-testid'?: string;
}

// Web-safe fonts that are available on most systems
const WEB_SAFE_FONTS = [
  { name: 'System Default', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', category: 'system' },
  { name: 'Arial', value: 'Arial, sans-serif', category: 'sans-serif' },
  { name: 'Helvetica', value: 'Helvetica, Arial, sans-serif', category: 'sans-serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif', category: 'sans-serif' },
  { name: 'Tahoma', value: 'Tahoma, sans-serif', category: 'sans-serif' },
  { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif', category: 'sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif', category: 'serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif', category: 'serif' },
  { name: 'Garamond', value: 'Garamond, serif', category: 'serif' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace', category: 'monospace' },
  { name: 'Monaco', value: 'Monaco, monospace', category: 'monospace' },
  { name: 'Consolas', value: 'Consolas, monospace', category: 'monospace' },
];

// Popular Google Fonts (these need to be loaded separately, but we can provide the values)
const GOOGLE_FONTS = [
  { name: 'Inter', value: '"Inter", sans-serif', category: 'sans-serif' },
  { name: 'Roboto', value: '"Roboto", sans-serif', category: 'sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif', category: 'sans-serif' },
  { name: 'Lato', value: '"Lato", sans-serif', category: 'sans-serif' },
  { name: 'Montserrat', value: '"Montserrat", sans-serif', category: 'sans-serif' },
  { name: 'Poppins', value: '"Poppins", sans-serif', category: 'sans-serif' },
  { name: 'Raleway', value: '"Raleway", sans-serif', category: 'sans-serif' },
  { name: 'Nunito', value: '"Nunito", sans-serif', category: 'sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif', category: 'serif' },
  { name: 'Merriweather', value: '"Merriweather", serif', category: 'serif' },
  { name: 'Libre Baskerville', value: '"Libre Baskerville", serif', category: 'serif' },
  { name: 'Fira Code', value: '"Fira Code", monospace', category: 'monospace' },
  { name: 'Source Code Pro', value: '"Source Code Pro", monospace', category: 'monospace' },
];

const ALL_FONTS = [...WEB_SAFE_FONTS, ...GOOGLE_FONTS];

export function FontFamilySelectorProfessional({
  label = 'Font Family',
  value = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  onChange,
  'data-testid': testId = 'font-family-selector-professional'
}: FontFamilySelectorProfessionalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get display name for current font
  const currentFont = useMemo(() => {
    const font = ALL_FONTS.find(f => f.value === value);
    return font?.name || 'Custom Font';
  }, [value]);

  // Filter fonts based on search
  const filteredFonts = useMemo(() => {
    if (!searchQuery.trim()) return ALL_FONTS;
    
    const query = searchQuery.toLowerCase();
    return ALL_FONTS.filter(font => 
      font.name.toLowerCase().includes(query) ||
      font.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group fonts by category for display
  const groupedFonts = useMemo(() => {
    const groups: Record<string, typeof filteredFonts> = {
      system: [],
      'sans-serif': [],
      serif: [],
      monospace: []
    };

    filteredFonts.forEach(font => {
      if (groups[font.category]) {
        groups[font.category].push(font);
      }
    });

    return groups;
  }, [filteredFonts]);

  const handleSelect = (fontValue: string) => {
    onChange(fontValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'system': return 'System Fonts';
      case 'sans-serif': return 'Sans Serif';
      case 'serif': return 'Serif';
      case 'monospace': return 'Monospace';
      default: return category;
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-2"
            data-testid={`${testId}-trigger`}
          >
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm" style={{ fontFamily: value }}>
                {currentFont}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="flex flex-col">
            {/* Search Header */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search fonts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  data-testid={`${testId}-search`}
                />
              </div>
            </div>

            {/* Font List */}
            <ScrollArea className="h-[400px]">
              <div className="p-2">
                {Object.entries(groupedFonts).map(([category, fonts]) => {
                  if (fonts.length === 0) return null;

                  return (
                    <div key={category} className="mb-4">
                      <div className="px-2 py-1">
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(category)}
                        </Badge>
                      </div>
                      <div className="space-y-1 mt-2">
                        {fonts.map((font) => (
                          <button
                            key={font.value}
                            onClick={() => handleSelect(font.value)}
                            className={`
                              w-full px-3 py-2.5 rounded hover:bg-accent transition-colors
                              flex items-center justify-between group
                              ${value === font.value ? 'bg-accent' : ''}
                            `}
                            data-testid={`${testId}-option-${font.name.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span
                                className="text-sm font-medium text-foreground"
                                style={{ fontFamily: font.value }}
                              >
                                {font.name}
                              </span>
                              <span
                                className="text-xs text-muted-foreground mt-0.5"
                                style={{ fontFamily: font.value }}
                              >
                                The quick brown fox jumps over the lazy dog
                              </span>
                            </div>
                            {value === font.value && (
                              <Check className="w-4 h-4 text-primary ml-2 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {filteredFonts.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No fonts found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Footer */}
            <div className="p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{WEB_SAFE_FONTS.length}</span> web-safe fonts · 
                <span className="font-medium ml-1">{GOOGLE_FONTS.length}</span> Google Fonts
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Google Fonts require loading via link tag or @import
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
