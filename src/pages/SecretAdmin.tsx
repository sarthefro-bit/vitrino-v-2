import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasSupabaseCredentials, supabase } from '../lib/supabaseClient';
import { getSystemLogs, clearSystemLogs, addLog } from '../lib/logger';
import { getLocalTechs, getLocalDesigns, saveLocalTechs, saveLocalDesigns } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import { 
  Database, 
  Terminal, 
  RefreshCw, 
  Trash2, 
  Check, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft,
  Server,
  Layers
} from 'lucide-react';

export default function SecretAdmin() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState(getSystemLogs());
  const [testingDb, setTestingDb] = useState(false);
  const [dbReport, setDbReport] = useState<{
    nailTechsTableOk: boolean;
    designsTableOk: boolean;
    storageAvatarsOk: boolean;
    storageDesignsOk: boolean;
    message: string;
    details: string[];
  } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(getSystemLogs());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const runDatabaseDiagnostics = async () => {
    setTestingDb(true);
    addLog('info', 'system', 'شروع تست ارزیابی دیتابیس Supabase...');
    const details: string[] = [];
    let nailTechsOk = false;
    let designsOk = false;
    let avatarsOk = false;
    let designsBucketOk = false;

    if (!hasSupabaseCredentials) {
      details.push('کلیدهای متغیر محیطی Supabase تنظیم نشده‌اند.');
      setDbReport({
        nailTechsTableOk: false,
        designsTableOk: false,
        storageAvatarsOk: false,
        storageDesignsOk: false,
        message: 'Supabase در وضعیت عدم تنظیم قرار دارد.',
        details,
      });
      setTestingDb(false);
      return;
    }

    try {
      // 1. Test nail_techs SELECT
      const { data: techsData, error: techsError } = await supabase.from('nail_techs').select('id, name, slug').limit(5);
      if (!techsError) {
        nailTechsOk = true;
        details.push(`جدول nail_techs فعال است. تعداد رکوردهای نمونه: ${techsData?.length || 0}`);
      } else {
        details.push(`خطا در جدول nail_techs: ${techsError.message} (کد: ${techsError.code})`);
      }

      // 2. Test designs SELECT
      const { data: designsData, error: designsError } = await supabase.from('designs').select('id, title').limit(5);
      if (!designsError) {
        designsOk = true;
        details.push(`جدول designs فعال است. تعداد رکوردهای نمونه: ${designsData?.length || 0}`);
      } else {
        details.push(`خطا در جدول designs: ${designsError.message} (کد: ${designsError.code})`);
      }

      // 3. Test avatars bucket
      const { data: avatarFiles, error: avatarErr } = await supabase.storage.from('avatars').list();
      if (!avatarErr) {
        avatarsOk = true;
        details.push(`باکت avatars دسترس‌پذیر است. فایل‌ها: ${avatarFiles?.length || 0}`);
      } else {
        details.push(`باکت avatars خطا دارد: ${avatarErr.message}`);
      }

      // 4. Test designs bucket
      const { data: designFiles, error: designErr } = await supabase.storage.from('designs').list();
      if (!designErr) {
        designsBucketOk = true;
        details.push(`باکت designs دسترس‌پذیر است. فایل‌ها: ${designFiles?.length || 0}`);
      } else {
        details.push(`باکت designs خطا دارد: ${designErr.message}`);
      }

      setDbReport({
        nailTechsTableOk: nailTechsOk,
        designsTableOk: designsOk,
        storageAvatarsOk: avatarsOk,
        storageDesignsOk: designsBucketOk,
        message: nailTechsOk && designsOk ? 'دیتابیس ابری Supabase آماده و بدون مشکل است.' : 'برخی جداول یا دسترسی‌های RLS نیازمند اصلاح هستند.',
        details,
      });
    } catch (err) {
      details.push(`استثنا در تست ارتباط: ${String(err)}`);
      setDbReport({
        nailTechsTableOk: false,
        designsTableOk: false,
        storageAvatarsOk: false,
        storageDesignsOk: false,
        message: 'خطا در برقراری ارتباط با Supabase.',
        details,
      });
    } finally {
      setTestingDb(false);
      setLogs(getSystemLogs());
    }
  };

  const SQL_SCHEMA_FIX = `-- ============================================
-- Vitrino Master Supabase Schema Fix & Setup
-- Execute this script in Supabase SQL Editor
-- ============================================

-- 1. Create nail_techs Table
CREATE TABLE IF NOT EXISTS public.nail_techs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    instagram TEXT,
    whatsapp TEXT,
    telegram TEXT,
    avatar_url TEXT,
    mobile TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1b. Migration for existing installations (adds new auth columns)
ALTER TABLE public.nail_techs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.nail_techs ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.nail_techs DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.nail_techs ALTER COLUMN mobile DROP NOT NULL;

-- 2. Create designs Table
CREATE TABLE IF NOT EXISTS public.designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tech_id UUID REFERENCES public.nail_techs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    price NUMERIC DEFAULT 0,
    duration NUMERIC DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2b. Migration for existing designs tables missing timestamp columns
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Enable RLS
ALTER TABLE public.nail_techs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies for Public Access
DROP POLICY IF EXISTS "Public Select Nail Techs" ON public.nail_techs;
CREATE POLICY "Public Select Nail Techs" ON public.nail_techs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upsert Nail Techs" ON public.nail_techs;
CREATE POLICY "Public Upsert Nail Techs" ON public.nail_techs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Select Designs" ON public.designs;
CREATE POLICY "Public Select Designs" ON public.designs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Designs" ON public.designs;
CREATE POLICY "Public Insert Designs" ON public.designs FOR ALL USING (true) WITH CHECK (true);

-- 5. Public Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('designs', 'designs', true) ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies
DROP POLICY IF EXISTS "Public Avatars Access" ON storage.objects;
CREATE POLICY "Public Avatars Access" ON storage.objects FOR ALL USING (bucket_id IN ('avatars', 'designs')) WITH CHECK (bucket_id IN ('avatars', 'designs'));
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_FIX);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const localTechsCount = getLocalTechs().length;
  const localDesignsCount = getLocalDesigns().length;

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans p-4 md:p-8" dir="rtl">
      <OfflineWarningBanner />

      <div className="max-w-5xl mx-auto space-y-6 pt-4">
        
        {/* Top Secret Header */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                پنل محرمانه عیب‌یابی و گزارش بک‌لوگ سیستم (Vitrino Diagnostic Backlog)
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                گزارش وضعیت دیتابیس، جدول ناخن‌کاران Supabase، گزارش خطاها و مدیریت لاگ‌های پس‌زمینه
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/techs')}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold rounded-xl text-white flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            بازگشت به اپلیکیشن
          </button>
        </div>

        {/* Database Health Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>وضعیت Supabase Cloud</span>
              <Database className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl font-bold">
              {hasSupabaseCredentials ? (
                <span className="text-emerald-400 flex items-center gap-1.5 text-base">
                  <CheckCircle2 className="w-5 h-5" /> متصل (Credentials Valid)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5 text-base">
                  <AlertCircle className="w-5 h-5" /> بدون متغیر محیطی (Local Mode)
                </span>
              )}
            </div>
          </div>

          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>تعداد ناخن‌کاران محلی</span>
              <Layers className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {localTechsCount} رکورد ثبت شده
            </div>
          </div>

          <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>تعداد نمونه‌کارها (Designs)</span>
              <Layers className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {localDesignsCount} طرح در حافظه
            </div>
          </div>
        </div>

        {/* Table Diagnostic Section */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-400" />
                تست و تست خودکار جداول Supabase (nail_techs & designs)
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                بررسی دلیل عدم ثبت داده در جدول nail_techs و بررسی دسترسی‌های RLS
              </p>
            </div>

            <button
              type="button"
              onClick={runDatabaseDiagnostics}
              disabled={testingDb}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${testingDb ? 'animate-spin' : ''}`} />
              {testingDb ? 'در حال تست...' : 'اجرای تست دیتابیس'}
            </button>
          </div>

          {dbReport && (
            <div className="space-y-3 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className={dbReport.nailTechsTableOk && dbReport.designsTableOk ? "text-emerald-400" : "text-amber-400"}>
                  {dbReport.message}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <div className={`p-2.5 rounded-lg border text-xs font-semibold text-center ${dbReport.nailTechsTableOk ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                  جدول nail_techs: {dbReport.nailTechsTableOk ? 'تایید شد' : 'خطا'}
                </div>
                <div className={`p-2.5 rounded-lg border text-xs font-semibold text-center ${dbReport.designsTableOk ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                  جدول designs: {dbReport.designsTableOk ? 'تایید شد' : 'خطا'}
                </div>
                <div className={`p-2.5 rounded-lg border text-xs font-semibold text-center ${dbReport.storageAvatarsOk ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                  باکت avatars: {dbReport.storageAvatarsOk ? 'تایید شد' : 'خطا'}
                </div>
                <div className={`p-2.5 rounded-lg border text-xs font-semibold text-center ${dbReport.storageDesignsOk ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-red-950/30 border-red-800 text-red-300'}`}>
                  باکت designs: {dbReport.storageDesignsOk ? 'تایید شد' : 'خطا'}
                </div>
              </div>

              <div className="space-y-1 text-xs text-neutral-300 pt-2 font-mono dir-ltr text-left">
                {dbReport.details.map((item, idx) => (
                  <div key={idx} className="bg-neutral-950 p-2 rounded border border-neutral-800">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solution & SQL Fix Code */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-pink-300">
              کد اسکریپت ساخت و اصلاح جداول Supabase (حل مشکل عدم ثبت در nail_techs):
            </h3>
            <div className="relative">
              <pre className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 dir-ltr text-left">
                {SQL_SCHEMA_FIX}
              </pre>

              <button
                type="button"
                onClick={copySqlToClipboard}
                className="absolute top-3 right-3 px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
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
          </div>
        </div>

        {/* Real-time Backlog Activity Logs */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-700 pb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-pink-400" />
              لاگ‌های زنده رویدادهای دیتابیس و سیستم (System Event Backlog)
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearSystemLogs();
                  setLogs([]);
                }}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-red-900/50 hover:text-red-200 text-neutral-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                پاکسازی لاگ‌ها
              </button>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-2 dir-ltr text-left">
            {logs.length === 0 ? (
              <div className="text-neutral-500 text-center py-8">
                هنوز هیچ رویدادی ثبت نشده است.
              </div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'bg-blue-900/40 text-blue-300 border-blue-700';
                if (log.level === 'error') badgeColor = 'bg-red-900/40 text-red-300 border-red-700';
                else if (log.level === 'warn') badgeColor = 'bg-amber-900/40 text-amber-300 border-amber-700';
                else if (log.level === 'success') badgeColor = 'bg-emerald-900/40 text-emerald-300 border-emerald-700';

                return (
                  <div key={log.id} className="border-b border-neutral-850/80 pb-2 last:border-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-neutral-500 text-[10px]">
                        [{new Date(log.timestamp).toLocaleTimeString('fa-IR')}]
                      </span>
                      <span className="text-pink-400 text-[10px] font-bold">
                        [{log.category}]
                      </span>
                      <span className="text-neutral-200 font-semibold">{log.message}</span>
                    </div>

                    {log.details ? (
                      <pre className="text-[10px] text-neutral-400 bg-neutral-900 p-2 rounded border border-neutral-800 overflow-x-auto">
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                      </pre>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Local Cache Purge */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-white">پاک‌سازی حافظه محلی (Local Cache)</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              حذف تمام داده‌های ذخیره‌شده در مرورگر؛ فقط داده‌های واقعی Supabase نمایش داده می‌شوند
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              saveLocalTechs([]);
              saveLocalDesigns([]);
              addLog('info', 'system', 'حافظه محلی به‌طور کامل پاک‌سازی شد.');
              setLogs(getSystemLogs());
            }}
            className="px-4 py-2 bg-red-900/60 hover:bg-red-800 text-xs font-bold rounded-xl text-white transition-all border border-red-800/60"
          >
            پاک‌سازی داده‌های محلی
          </button>
        </div>

      </div>
    </div>
  );
}
