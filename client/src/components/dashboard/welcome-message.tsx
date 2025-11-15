import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Sun, Moon, Sunrise } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export function WelcomeMessage() {
  const { user } = useAuth();
  const { t, currentLanguage } = useTranslation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [icon, setIcon] = useState<any>(Sun);

  useEffect(() => {
    if (!user) return;

    // Check if we've already shown the welcome message today
    const today = new Date().toDateString();
    const lastWelcomeDate = localStorage.getItem('lastWelcomeDate');
    
    if (lastWelcomeDate !== today) {
      // First login of the day
      setShowWelcome(true);
      localStorage.setItem('lastWelcomeDate', today);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    // Determine greeting based on current time
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting(t('dashboard.goodMorning'));
      setIcon(Sunrise);
    } else if (hour >= 12 && hour < 18) {
      setGreeting(t('dashboard.goodAfternoon'));
      setIcon(Sun);
    } else {
      setGreeting(t('dashboard.goodEvening'));
      setIcon(Moon);
    }
  }, [t, currentLanguage]);

  if (!showWelcome || !user) return null;

  const firstName = user.name?.split(' ')[0] || 'usuário';

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 border-blue-500/20 animate-in fade-in slide-in-from-top duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="relative p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full">
                {icon && React.createElement(icon, { className: "h-6 w-6 text-white" })}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              {greeting}, {firstName}!
              <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {getMotivationalMessage(t)}
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={t('dashboard.close')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}

function getMotivationalMessage(t: any): string {
  const messages = t('dashboard.motivationalMessages', { returnObjects: true }) as string[];
  
  // Pick a random message based on the day
  const dayIndex = new Date().getDay();
  return messages[dayIndex] || messages[0] || "";
}