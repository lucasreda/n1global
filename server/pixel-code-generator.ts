import type { AffiliateProductPixel } from '@shared/schema';

interface PixelEventData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  [key: string]: any;
}

export class PixelCodeGenerator {
  private static generateMetaPixel(pixel: AffiliateProductPixel): string {
    const { pixelId, events, accessToken } = pixel;
    const eventsConfig = events as {
      pageView?: boolean;
      purchase?: boolean;
      lead?: boolean;
      addToCart?: boolean;
      initiateCheckout?: boolean;
      custom?: string[];
    };

    let code = `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '${pixelId}');
`;

    if (eventsConfig.pageView !== false) {
      code += `fbq('track', 'PageView');\n`;
    }

    code += `
// Helper function to track custom events
window.trackPixelEvent = function(eventName, eventData) {
  fbq('track', eventName, eventData || {});
};

// Track purchase events
window.trackPurchase = function(value, currency, contentIds) {
  fbq('track', 'Purchase', {
    value: value,
    currency: currency || 'USD',
    content_ids: contentIds || [],
    content_type: 'product'
  });
};

// Track lead events
window.trackLead = function(contentName) {
  fbq('track', 'Lead', {
    content_name: contentName
  });
};

// Track add to cart events
window.trackAddToCart = function(value, currency, contentIds) {
  fbq('track', 'AddToCart', {
    value: value,
    currency: currency || 'USD',
    content_ids: contentIds || [],
    content_type: 'product'
  });
};

// Track initiate checkout events
window.trackInitiateCheckout = function(value, currency, contentIds) {
  fbq('track', 'InitiateCheckout', {
    value: value,
    currency: currency || 'USD',
    content_ids: contentIds || [],
    content_type: 'product',
    num_items: contentIds?.length || 1
  });
};
</script>
<noscript>
  <img height="1" width="1" style="display:none" 
       src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
`;

    return code;
  }

  private static generateGoogleAdsPixel(pixel: AffiliateProductPixel): string {
    const { pixelId } = pixel;

    return `
<!-- Google Ads Conversion Tracking -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${pixelId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${pixelId}');

  // Helper functions for conversion tracking
  window.trackGoogleConversion = function(sendTo, value, currency, transactionId) {
    gtag('event', 'conversion', {
      'send_to': sendTo,
      'value': value,
      'currency': currency || 'USD',
      'transaction_id': transactionId || ''
    });
  };

  window.trackGooglePurchase = function(value, currency, transactionId, items) {
    gtag('event', 'purchase', {
      'send_to': '${pixelId}',
      'value': value,
      'currency': currency || 'USD',
      'transaction_id': transactionId || '',
      'items': items || []
    });
  };
</script>
<!-- End Google Ads Conversion Tracking -->
`;
  }

  private static generateTikTokPixel(pixel: AffiliateProductPixel): string {
    const { pixelId } = pixel;

    return `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  
  ttq.load('${pixelId}');
  ttq.page();

  // Helper functions for TikTok events
  window.trackTikTokEvent = function(eventName, eventData) {
    ttq.track(eventName, eventData || {});
  };

  window.trackTikTokPurchase = function(value, currency, contentId) {
    ttq.track('CompletePayment', {
      value: value,
      currency: currency || 'USD',
      content_id: contentId || ''
    });
  };
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->
`;
  }

  private static generateCustomPixel(pixel: AffiliateProductPixel): string {
    const { customCode } = pixel;
    
    if (!customCode || customCode.trim() === '') {
      return '<!-- No custom pixel code provided -->';
    }

    return `
<!-- Custom Pixel Code -->
${customCode}
<!-- End Custom Pixel Code -->
`;
  }

  public static generatePixelCode(pixel: AffiliateProductPixel): string {
    if (!pixel.isActive) {
      return '<!-- Pixel is inactive -->';
    }

    switch (pixel.pixelType) {
      case 'meta':
        return this.generateMetaPixel(pixel);
      case 'google_ads':
        return this.generateGoogleAdsPixel(pixel);
      case 'tiktok':
        return this.generateTikTokPixel(pixel);
      case 'custom':
        return this.generateCustomPixel(pixel);
      default:
        return `<!-- Unknown pixel type: ${pixel.pixelType} -->`;
    }
  }

  public static generateAllPixelCodes(pixels: AffiliateProductPixel[]): string {
    if (!pixels || pixels.length === 0) {
      return '';
    }

    const activePixels = pixels.filter(p => p.isActive);
    if (activePixels.length === 0) {
      return '';
    }

    return activePixels
      .map(pixel => this.generatePixelCode(pixel))
      .join('\n\n');
  }
}
