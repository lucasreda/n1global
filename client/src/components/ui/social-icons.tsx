import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  size?: number;
  className?: string;
}

export const FacebookIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("text-blue-600", className)}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const GoogleAdsIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={cn("text-red-500", className)}
  >
    <path d="M12.02 0C5.38 0 0 5.38 0 12.02s5.38 12.02 12.02 12.02 12.02-5.38 12.02-12.02S18.66 0 12.02 0zm0 22.44c-5.76 0-10.42-4.66-10.42-10.42S6.26 1.6 12.02 1.6s10.42 4.66 10.42 10.42-4.66 10.42-10.42 10.42z"/>
    <path d="M12.02 5.58c-3.56 0-6.44 2.88-6.44 6.44 0 3.56 2.88 6.44 6.44 6.44 3.56 0 6.44-2.88 6.44-6.44 0-3.56-2.88-6.44-6.44-6.44zm0 11.29c-2.68 0-4.85-2.17-4.85-4.85 0-2.68 2.17-4.85 4.85-4.85 2.68 0 4.85 2.17 4.85 4.85 0 2.68-2.17 4.85-4.85 4.85z"/>
    <circle cx="12.02" cy="12.02" r="2.23"/>
  </svg>
);

interface NetworkIconProps extends IconProps {
  network: 'facebook' | 'google';
}

export const NetworkIcon: React.FC<NetworkIconProps> = ({ network, size = 24, className }) => {
  if (network === 'facebook') {
    return <FacebookIcon size={size} className={className} />;
  }
  
  return <GoogleAdsIcon size={size} className={className} />;
};