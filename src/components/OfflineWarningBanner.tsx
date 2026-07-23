import { useState, useEffect } from 'react';
import { hasSupabaseCredentials } from '../lib/supabaseClient';
import { lastCloudError, isCloudFallbackActive } from '../lib/db';
import { WifiOff, AlertTriangle, X } from 'lucide-react';

export default function OfflineWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [bannerState, setBannerState] = useState<{
    show: boolean;
    type: 'no-creds' | 'fallback-error';
    message: string;
  }>({
    show: false,
    type: 'no-creds',
    message: '',
  });

  useEffect(() => {
    const checkState = () => {
      if (!hasSupabaseCredentials) {
        setBannerState({
          show: true,
          type: 'no-creds',
          message: 'اپلیکیشن در حالت آفلاین (ذخیره‌سازی محلی) قرار دارد. تغییرات روی این مرورگر ذخیره می‌شوند.',
        });
      } else if (isCloudFallbackActive || lastCloudError) {
        setBannerState({
          show: true,
          type: 'fallback-error',
          message: lastCloudError 
            ? `خطای ابری Supabase: ${lastCloudError}. داده‌ها به صورت محلی ذخیره گردیدند.`
            : 'ارتباط ابری قطع شد. سیستم از حافظه محلی استفاده می‌کند.',
        });
      }
    };

    checkState();
    const interval = setInterval(checkState, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!bannerState.show || dismissed) {
    return null;
  }

  return (
    <div 
      className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 px-4 py-2 text-[11px] font-semibold flex items-center justify-between gap-2 z-50 shrink-0"
      dir="rtl"
    >
      <div className="flex items-center gap-2 min-w-0">
        {bannerState.type === 'no-creds' ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        )}
        <span className="truncate">{bannerState.message}</span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-700 hover:text-amber-900 p-0.5 rounded-md hover:bg-amber-500/20 shrink-0"
        title="بستن هشدار"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
