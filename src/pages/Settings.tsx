import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasSupabaseCredentials } from '../lib/supabaseClient';
import { 
  Trash2, 
  Check, 
  ChevronRight, 
  Copy, 
  Database, 
  Sparkles, 
  FileText, 
  Smartphone,
  Wifi,
  BatteryMedium,
  Info
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Status Bar live clock
  const [currentTime, setCurrentTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 60000);
    return () => clearInterval(clockInterval);
  }, []);

  const handleResetData = () => {
    localStorage.removeItem('vitrino_nail_techs');
    localStorage.removeItem('vitrino_designs');
    setShowConfirm(false);
    navigate('/setup');
  };

  // SQL Script for easy Supabase setup
  const SUPABASE_SQL_SCRIPT = `-- ============================================
-- 1. Create Table for Nail Techs (Profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.nail_techs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    instagram TEXT,
    avatar_url TEXT,
    mobile TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 2. Create Table for Designs (Portfolio Samples)
-- ============================================
CREATE TABLE IF NOT EXISTS public.designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tech_id UUID REFERENCES public.nail_techs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    price NUMERIC DEFAULT 0,
    duration NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE public.nail_techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create Security Policies for Public Access
-- ============================================
CREATE POLICY "Allow public read access to nail_techs" 
ON public.nail_techs FOR SELECT USING (true);

CREATE POLICY "Allow public read access to designs" 
ON public.designs FOR SELECT USING (true);

CREATE POLICY "Allow all write access to nail_techs" 
ON public.nail_techs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all write access to designs" 
ON public.designs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. Storage Buckets Setup (Avatars & Designs)
-- ============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('designs', 'designs', true) 
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. Storage Security Policies for Objects
-- ============================================
CREATE POLICY "Allow public access to avatars" 
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Allow all uploads to avatars" 
ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public access to designs" 
ON storage.objects FOR SELECT USING (bucket_id = 'designs');

CREATE POLICY "Allow all uploads to designs" 
ON storage.objects FOR ALL USING (bucket_id = 'designs') WITH CHECK (bucket_id = 'designs');
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">
      
      <div className="phone-mockup-wrapper md:max-w-[700px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] md:overflow-visible bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">
        
        {/* Status Bar (Hidden on Desktop) */}
        <div className="bg-white/85 backdrop-blur-md text-neutral-900 px-6 py-2.5 flex justify-between items-center text-xs font-semibold select-none z-40 shrink-0 border-b border-neutral-100 md:hidden" dir="ltr">
          <div>{currentTime}</div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 opacity-80" />
            <Wifi className="w-3.5 h-3.5 opacity-80" />
            <BatteryMedium className="w-4 h-4 opacity-80" />
          </div>
        </div>

        {/* Header bar */}
        <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-neutral-100 shrink-0 z-10 shadow-sm">
          <button 
            type="button" 
            className="flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-[#EC4899] transition-all bg-neutral-50 hover:bg-pink-50 py-2 px-3.5 rounded-full border border-neutral-150"
            onClick={() => navigate(-1)}
          >
            <ChevronRight className="w-4 h-4" />
            بازگشت
          </button>
          
          <h2 className="text-sm font-extrabold tracking-wider text-neutral-800 select-none">تنظیمات سیستم</h2>

          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Scroller Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-20 bg-neutral-50">
          
          {/* 1. Connection Status card */}
          <div className="bg-white rounded-[16px] p-5 border border-neutral-150 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 left-0 h-1 ${hasSupabaseCredentials ? 'bg-green-500' : 'bg-[#EC4899]'}`} />
            
            <div className="flex items-center gap-2.5">
              <Database className={`w-5 h-5 ${hasSupabaseCredentials ? 'text-green-500' : 'text-[#EC4899]'}`} />
              <h3 className="text-xs font-black text-neutral-800">وضعیت اتصال پایگاه‌داده</h3>
            </div>

            <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed font-medium">
              {hasSupabaseCredentials 
                ? '✓ اپلیکیشن به حساب اختصاصی Supabase شما متصل است و تمامی اطلاعات در سرور ابری همگام‌سازی می‌شوند.'
                : 'ⓘ اپلیکیشن در حالت دمو محلی (آفلاین) اجرا می‌شود. داده‌های شما در مرورگر ذخیره شده و کاملاً امن هستند.'
              }
            </p>
          </div>

          {/* 2. SQL Schema Integration Helper Card */}
          <div className="bg-white rounded-[16px] p-5 border border-neutral-150 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#EC4899]" />
              <h3 className="text-xs font-black text-neutral-800">ایجاد خودکار جداول Supabase</h3>
            </div>

            <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
              برای راه‌اندازی سریع پروژه در حساب اختصاصی خود، کافیست قطعه کد زیر را کپی کرده و در بخش <strong className="text-[#EC4899]">SQL Editor</strong> پنل کاربری Supabase خود اجرا (Run) کنید تا جداول و دسترسی‌های امنیتی به صورت خودکار ساخته شوند:
            </p>

            {/* Micro SQL editor preview with copy action */}
            <div className="relative">
              <div className="bg-neutral-900 rounded-[12px] p-3 text-[10px] font-mono text-pink-300 overflow-x-auto max-h-36 no-scrollbar dir-ltr text-left border border-neutral-800 select-none">
                <pre>{SUPABASE_SQL_SCRIPT}</pre>
              </div>

              {/* Copy floating trigger */}
              <button
                type="button"
                className="absolute top-2 right-2 bg-[#EC4899] hover:bg-[#DB2777] text-white py-1.5 px-3.5 rounded-full text-[10px] font-bold shadow-md transition-all flex items-center gap-1 cursor-pointer select-none"
                onClick={handleCopySql}
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی اسکریپت SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-pink-50/50 p-3 rounded-[12px] border border-pink-100 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#EC4899] shrink-0 mt-0.5" />
              <div className="text-[9px] text-[#EC4899] leading-relaxed font-medium text-right">
                این اسکریپت علاوه بر ساختن جداول <strong>nail_techs</strong> و <strong>designs</strong>، دسترسی‌های Row Level Security (RLS) و پوشه‌های مربوط به آپلود تصاویر را تنظیم می‌کند.
              </div>
            </div>
          </div>

          {/* 3. Reset local data danger zone */}
          <div className="bg-white rounded-[16px] p-5 border border-neutral-150 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5 text-red-500">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-xs font-black">عملیات بازنشانی داده‌ها</h3>
            </div>

            <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
              با کلیک روی دکمه زیر، تمامی اطلاعات ذخیره شده و نمونه‌کارهای ثبت شده شما از این مرورگر حذف خواهند شد و به صفحه راه‌اندازی اولیه هدایت می‌شوید.
            </p>

            {!showConfirm ? (
              <button
                type="button"
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-full text-center transition-all border border-red-200 cursor-pointer"
                onClick={() => setShowConfirm(true)}
              >
                🗑️ پاک کردن اطلاعات و شروع مجدد
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-[12px] p-3.5 text-center space-y-3.5">
                <p className="text-[10px] text-red-600 font-bold">آیا مطمئن هستید؟ این عمل غیرقابل بازگشت است!</p>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-full transition-all cursor-pointer"
                    onClick={handleResetData}
                  >
                    بله، حذف کن
                  </button>
                  <button
                    type="button"
                    className="w-1/2 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-[10px] font-bold rounded-full transition-all cursor-pointer"
                    onClick={() => setShowConfirm(false)}
                  >
                    لغو
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* About credits / footer */}
          <div className="text-center pt-2">
            <p className="text-[10px] text-neutral-400 font-semibold flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" />
              ویتِرینو - پلتفرم اختصاصی ویترین ناخن‌کاران
            </p>
            <p className="text-[9px] text-neutral-300 font-medium mt-1">توسعه یافته با عشق در React & Tailwind</p>
          </div>

        </div>

      </div>

    </div>
  );
}
