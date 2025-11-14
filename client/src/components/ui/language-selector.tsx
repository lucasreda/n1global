import { Globe, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { changeLanguage } from "@/lib/i18n";
import { useState } from "react";

const languages = [
  { code: 'pt-BR' as const, label: 'Português', flag: '🇧🇷' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
  { code: 'es' as const, label: 'Español', flag: '🇪🇸' },
];

export function LanguageSelector() {
  const { currentLanguage, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleLanguageChange = (lang: 'pt-BR' | 'en' | 'es') => {
    changeLanguage(lang);
    setOpen(false);
    // Reload page to apply language changes to all components
    // This ensures all text updates immediately
    window.location.reload();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white transition-all duration-200 backdrop-blur-md"
          aria-label="Select language"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-2 glassmorphism border-border/50 backdrop-blur-xl"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                currentLanguage === lang.code
                  ? 'bg-primary/20 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
              {currentLanguage === lang.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

