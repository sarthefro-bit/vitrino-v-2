import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  saveNailTech,
  addDesign,
  getNailTechByEmail,
  getNailTechBySlug,
  setCurrentUserSession,
} from '../lib/db';
import {
  isValidEmail,
  sendEmailOtp,
  verifyEmailOtp,
  signInWithGoogle,
  getAuthedEmail,
} from '../lib/auth';
import { uploadImage } from '../lib/storage';
import type { NailTech, Design } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import {
  Search,
  Trash2,
  X,
  ChevronDown,
  Check,
  Smartphone,
  Wifi,
  BatteryMedium,
  Instagram,
  Mail,
  KeyRound,
  MapPin,
  MessageCircle,
  Send,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  ArrowRight,
  Home
} from 'lucide-react';

const POPULAR_CITIES = [
  'تهران',
  'کرج',
  'اصفهان',
  'شیراز',
  'مشهد',
  'تبریز',
  'یزد',
  'رشت'
];

const INITIAL_COLORS = [
  'بنفش',
  'سبز',
  'آبی',
  'صورتی',
  'قرمز',
  'نود',
  'سفید',
  'مشکی'
];

const INITIAL_STYLES = [
  'فانتزی',
  'آمبره',
  'عروسکی',
  'یلدا',
  'عروسی',
  'نامزدی',
  'ساده',
  'دیزاین'
];

// Handle validation: letters, digits, dots, underscores, 1-30 chars
function isValidInstagramHandle(handle: string): boolean {
  const cleaned = handle.replace('@', '').trim();
  return /^[a-zA-Z0-9._]{1,30}$/.test(cleaned);
}

// Build a URL-safe slug from the email's local part, e.g. sara.nails@x.com -> sara_nails
function slugFromEmail(email: string): string {
  const local = email.split('@')[0] || '';
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || `salon_${crypto.randomUUID().slice(0, 6)}`;
}

export default function Auth() {
  const navigate = useNavigate();

  // Step-by-step flow (like Instagram onboarding):
  // 'email':   ask only for email
  // 'otp':     verify the code sent to that email
  // -- new users continue with profile completion: --
  // 'profile': salon name, city, address + avatar (required info)
  // 'socials': instagram / whatsapp / telegram (optional)
  // 'works':   upload نمونه‌کارها
  // 'ready':   share link, go to profile
  const [step, setStep] = useState<'checking' | 'email' | 'otp' | 'profile' | 'socials' | 'works' | 'ready'>('checking');

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile completion state
  const [techInfo, setTechInfo] = useState<Partial<NailTech>>({
    name: '',
    city: 'تهران',
    address: '',
    instagram: '',
    whatsapp: '',
    telegram: '',
    avatar_url: '',
    slug: ''
  });

  const [designs, setDesigns] = useState<Design[]>([]);

  // City dropdown state
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Add work sample modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesign, setNewDesign] = useState<{
    image_url: string;
    title: string;
    tags: string[];
    price: string;
    duration: string;
    colorTag: string;
    styleTag: string;
  }>({
    image_url: '',
    title: '',
    tags: [],
    price: '',
    duration: '۲ ساعت',
    colorTag: 'صورتی',
    styleTag: 'فانتزی'
  });

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live clock
  const [currentTime, setCurrentTime] = useState('09:41');

  // Route an authenticated email to the right destination:
  // existing profile -> their vitrin, new user -> profile completion
  const routeAuthedEmail = async (authedEmail: string) => {
    const existing = await getNailTechByEmail(authedEmail);
    if (existing) {
      setCurrentUserSession(existing);
      navigate(`/vitrin/${existing.slug}`, { replace: true });
      return;
    }
    setEmail(authedEmail);
    setTechInfo(prev => ({ ...prev, email: authedEmail, slug: prev.slug || slugFromEmail(authedEmail) }));
    setStep('profile');
  };

  // On mount: detect an already-authenticated session
  // (e.g. returning from the Google OAuth redirect)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authedEmail = await getAuthedEmail();
      if (cancelled) return;

      // Clean the leftover #access_token=... fragment from the OAuth/magic-link redirect
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (authedEmail) {
        await routeAuthedEmail(authedEmail);
      } else {
        setStep('email');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 60000);

    // Secret demo data fill (Spacebar) on profile completion steps
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (step === 'profile' || step === 'socials' || step === 'works')) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' && (document.activeElement as HTMLInputElement).value.trim().length > 0) {
          return;
        }
        if (activeTag === 'textarea') return;

        e.preventDefault();
        setTechInfo(prev => ({
          ...prev,
          name: 'سالن تخصصی سارا نیلز',
          city: 'تهران',
          address: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۱۲',
          instagram: 'sara_nailart',
          whatsapp: '09127579476',
          telegram: 'sara_nailart',
          avatar_url: ''
        }));

        const sampleDesigns: Design[] = [
          {
            id: crypto.randomUUID(),
            tech_id: 'temp',
            title: 'ژلیش صورتی کریستالی با دیزاین اکلیل',
            image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop',
            tags: ['صورتی', 'فانتزی'],
            price: 380000,
            duration: 120,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            tech_id: 'temp',
            title: 'کاشت آکریلیک فرانسوی مات',
            image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&h=500&fit=crop',
            tags: ['سفید', 'فرنچ'],
            price: 450000,
            duration: 150,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            tech_id: 'temp',
            title: 'دیزاین تابستانی آبرنگی بنفش',
            image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&h=500&fit=crop',
            tags: ['بنفش', 'آمبره'],
            price: 520000,
            duration: 180,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];

        setDesigns(sampleDesigns);
        setNotice('داده‌های آزمایشی میانبر با موفقیت جایگذاری شدند.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Handle clicking outside city dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // STEP HANDLERS
  // ============================================

  const handleSendOtp = async () => {
    setError('');
    setNotice('');
    const cleaned = email.trim().toLowerCase();

    if (!isValidEmail(cleaned)) {
      setError('لطفاً یک ایمیل معتبر وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const result = await sendEmailOtp(cleaned);
      if (!result.ok) {
        setError(result.error || 'ارسال کد با خطا مواجه شد.');
        return;
      }
      setEmail(cleaned);
      setOtpCode('');
      setDemoCode(result.demoCode || null);
      setResendCooldown(60);
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setNotice('');

    if (otpCode.trim().length < 6) {
      setError('کد ارسال شده را کامل وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailOtp(email, otpCode);
      if (!result.ok) {
        setError(result.error || 'کد وارد شده نادرست است.');
        return;
      }
      await routeAuthedEmail(email);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setError(result.error || 'ورود با گوگل با خطا مواجه شد.');
      setLoading(false);
    }
    // On success the browser redirects to Google; nothing else to do here.
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const url = await uploadImage(file, 'avatars', `avatars/${crypto.randomUUID().slice(0, 8)}`);
      if (url) {
        setTechInfo(prev => ({ ...prev, avatar_url: url }));
      } else {
        setError('خطا در آپلود تصویر پروفایل');
      }
    } catch {
      setError('خطا در آپلود تصویر پروفایل');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileNext = () => {
    setError('');
    if (!techInfo.name?.trim()) {
      setError('نام سالن یا ناخن‌کار الزامی است.');
      return;
    }
    if (!techInfo.city?.trim()) {
      setError('انتخاب شهر الزامی است.');
      return;
    }
    if (!techInfo.address?.trim()) {
      setError('آدرس سالن الزامی است.');
      return;
    }
    setStep('socials');
  };

  const handleDesignImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingDesign(true);
    setError('');
    try {
      const url = await uploadImage(file, 'designs', 'temp');
      if (url) {
        setNewDesign(prev => ({ ...prev, image_url: url }));
      } else {
        setError('خطا در آپلود تصویر نمونه‌کار');
      }
    } catch {
      setError('خطا در آپلود تصویر نمونه‌کار');
    } finally {
      setUploadingDesign(false);
    }
  };

  const handleAddWorkSample = () => {
    if (!newDesign.image_url) {
      setError('لطفاً تصویر نمونه‌کار را آپلود کنید.');
      return;
    }
    if (!newDesign.title.trim()) {
      setError('عنوان نمونه‌کار الزامی است.');
      return;
    }
    if (!newDesign.price) {
      setError('لطفاً قیمت را وارد کنید.');
      return;
    }

    const priceNum = parseInt(newDesign.price.replace(/,/g, '')) || 0;

    let durationMins = 120;
    if (newDesign.duration.includes('۳')) durationMins = 180;
    else if (newDesign.duration.includes('۲.۵')) durationMins = 150;
    else if (newDesign.duration.includes('۲')) durationMins = 120;
    else if (newDesign.duration.includes('۱.۵')) durationMins = 90;
    else if (newDesign.duration.includes('۱')) durationMins = 60;
    else if (newDesign.duration.includes('۳۰')) durationMins = 30;

    const sample: Design = {
      id: crypto.randomUUID(),
      tech_id: 'temp',
      title: newDesign.title,
      image_url: newDesign.image_url,
      tags: [newDesign.colorTag, newDesign.styleTag].filter(Boolean),
      price: priceNum,
      duration: durationMins,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDesigns(prev => [...prev, sample]);
    setNewDesign({
      image_url: '',
      title: '',
      tags: [],
      price: '',
      duration: '۲ ساعت',
      colorTag: 'صورتی',
      styleTag: 'فانتزی'
    });
    setShowAddModal(false);
    setError('');
  };

  const handleFinalSubmit = async () => {
    if (designs.length === 0) {
      setError('لطفاً حداقل یک نمونه‌کار وارد کنید.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Make sure the slug is unique before committing
      let finalSlug = techInfo.slug || slugFromEmail(email);
      const taken = await getNailTechBySlug(finalSlug);
      if (taken && taken.email?.toLowerCase() !== email) {
        finalSlug = `${finalSlug}_${crypto.randomUUID().slice(0, 4)}`;
      }

      const savedTech = await saveNailTech({
        slug: finalSlug,
        username: finalSlug,
        email,
        name: techInfo.name || '',
        city: techInfo.city || 'تهران',
        address: techInfo.address || '',
        instagram: techInfo.instagram || '',
        whatsapp: techInfo.whatsapp || '',
        telegram: techInfo.telegram || '',
        avatar_url: techInfo.avatar_url || '',
      });

      if (savedTech) {
        setCurrentUserSession(savedTech);
        setTechInfo(savedTech);

        for (const des of designs) {
          await addDesign({
            tech_id: savedTech.id,
            title: des.title,
            image_url: des.image_url,
            tags: des.tags,
            price: des.price,
            duration: des.duration,
          });
        }

        setStep('ready');
      } else {
        throw new Error('Save failed');
      }
    } catch (err) {
      console.error(err);
      setError('خطا در ذخیره‌سازی نهایی ویترین');
    } finally {
      setLoading(false);
    }
  };

  const getFullShareUrl = () => {
    const slug = techInfo.slug || 'profile';
    const baseUrl = window.location.origin;
    return `${baseUrl}/vitrin/${slug}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredCities = POPULAR_CITIES.filter(c => c.includes(citySearchQuery.trim()));

  const errorBox = error && (
    <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold border border-red-100 text-right">
      {error}
    </div>
  );

  const noticeBox = notice && (
    <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-[16px] text-xs font-semibold border border-emerald-100 text-right">
      {notice}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">

      <div className="phone-mockup-wrapper md:max-w-[700px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">

        <OfflineWarningBanner />

        {/* Status Bar (Hidden on Desktop) */}
        <div className="bg-white text-neutral-900 px-6 py-2.5 flex justify-between items-center text-xs font-semibold select-none z-40 shrink-0 border-b border-neutral-100 md:hidden" dir="ltr">
          <div>{currentTime}</div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 opacity-80" />
            <Wifi className="w-3.5 h-3.5 opacity-80" />
            <BatteryMedium className="w-4 h-4 opacity-80" />
          </div>
        </div>

        {/* ============================================
            STEP: CHECKING EXISTING SESSION
            ============================================ */}
        {step === 'checking' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center gap-3">
            <span className="loading loading-spinner text-[#EC4899]" />
            <p className="text-xs font-bold text-neutral-500">در حال بررسی وضعیت ورود...</p>
          </div>
        )}

        {/* ============================================
            STEP 1: EMAIL ONLY
            ============================================ */}
        {step === 'email' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                  title="بازگشت به لیست"
                >
                  <Home className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-neutral-800">ورود یا ثبت سالن</span>
                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">ایمیل خود را وارد کنید</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold leading-relaxed">
                  کد تأیید به ایمیل شما ارسال می‌شود. اگر قبلاً ثبت‌نام کرده باشید وارد پروفایل خود می‌شوید، در غیر این صورت حساب جدید ساخته می‌شود.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>آدرس ایمیل</span>
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="مثال: sara@gmail.com"
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendOtp();
                    }}
                  />
                </div>

                {errorBox}
              </div>
            </div>

            <div className="pb-4 space-y-3">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md disabled:opacity-60"
              >
                {loading ? 'در حال ارسال کد...' : 'ارسال کد تأیید'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-[10px] font-bold text-neutral-400">یا</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-[18px] text-center transition-all cursor-pointer border border-neutral-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>ورود با حساب گوگل</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 2: OTP CODE
            ============================================ */}
        {step === 'otp' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtpCode('');
                    setError('');
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-neutral-800">تأیید ایمیل</span>
                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">کد تأیید را وارد کنید</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold leading-relaxed">
                  کد تأیید به <span className="font-mono text-[#EC4899] dir-ltr inline-block">{email}</span> ارسال شد.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>کد تأیید</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={10}
                    placeholder="••••••••"
                    className="w-full px-4 py-4 bg-neutral-50 border border-neutral-200 rounded-[16px] text-lg font-black tracking-[0.3em] focus:outline-none focus:border-[#EC4899] text-center dir-ltr"
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/[^0-9۰-۹]/g, '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyOtp();
                    }}
                  />
                </div>

                {demoCode && (
                  <div className="bg-amber-50 text-amber-600 px-4 py-3 rounded-[16px] text-[11px] font-bold border border-amber-100 text-right leading-relaxed">
                    حالت دمو (بدون اتصال سرور): کد تأیید شما <span className="font-mono text-sm tracking-widest">{demoCode}</span> است.
                  </div>
                )}

                {errorBox}

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-[#EC4899] disabled:text-neutral-300 transition-all cursor-pointer disabled:cursor-default"
                  >
                    {resendCooldown > 0
                      ? `ارسال مجدد کد تا ${resendCooldown.toLocaleString('fa-IR')} ثانیه دیگر`
                      : 'ارسال مجدد کد'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setOtpCode('');
                      setError('');
                    }}
                    className="text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer"
                  >
                    تغییر ایمیل
                  </button>
                </div>
              </div>
            </div>

            <div className="pb-4">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md disabled:opacity-60"
              >
                {loading ? 'در حال بررسی کد...' : 'تأیید و ادامه'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 3: PROFILE BASICS (NAME, CITY, ADDRESS, AVATAR)
            ============================================ */}
        {step === 'profile' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto no-scrollbar">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="w-5" />
                <div className="bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100/40">
                  مرحله ۱ از ۳: اطلاعات سالن
                </div>
                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">تکمیل اطلاعات سالن</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  این اطلاعات در صفحه عمومی ویترین شما نمایش داده می‌شود.
                </p>
              </div>

              {/* Avatar Selector */}
              <div className="flex flex-col items-center justify-center py-2">
                {techInfo.avatar_url ? (
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#EC4899] p-0.5">
                      <img src={techInfo.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTechInfo(prev => ({ ...prev, avatar_url: '' }))}
                      className="absolute top-0 left-0 bg-white text-neutral-700 rounded-full p-1 shadow border border-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-28 h-28 border-2 border-dashed border-[#EC4899] bg-pink-50/20 hover:bg-pink-50/50 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Plus className="w-7 h-7 text-[#EC4899]" />
                    <span className="text-[10px] font-bold text-[#EC4899] mt-1">عکس پروفایل</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
                {uploadingAvatar && (
                  <div className="text-[10px] text-[#EC4899] font-bold text-center mt-2 animate-pulse">
                    در حال آپلود...
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                  <span>نام سالن یا ناخن‌کار</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: سالن زیبایی سارا نیلز"
                  className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-right"
                  value={techInfo.name || ''}
                  onChange={(e) => {
                    setTechInfo(prev => ({ ...prev, name: e.target.value }));
                    setError('');
                  }}
                />
              </div>

              {/* City Selection Input */}
              <div className="space-y-1.5 relative">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>شهر محل فعالیت</span>
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] transition-all flex justify-between items-center text-right cursor-pointer"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                >
                  <span className="text-neutral-900">{techInfo.city || 'انتخاب شهر'}</span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>

                {showCityDropdown && (
                  <div ref={cityDropdownRef} className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-[16px] border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[200px]">
                    <div className="p-2 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50">
                      <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="جستجوی شهر..."
                        className="w-full bg-transparent text-xs outline-none text-right font-semibold py-1"
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="overflow-y-auto no-scrollbar flex-1 py-1">
                      {filteredCities.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-full px-4 py-2.5 text-right text-xs hover:bg-pink-50/40 flex justify-between items-center font-semibold"
                          onClick={() => {
                            setTechInfo(prev => ({ ...prev, city: c }));
                            setShowCityDropdown(false);
                          }}
                        >
                          <span className={techInfo.city === c ? "text-[#EC4899] font-bold" : "text-neutral-700"}>{c}</span>
                          {techInfo.city === c && <Check className="w-3.5 h-3.5 text-[#EC4899]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>آدرس سالن</span>
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۱۲"
                  className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-right resize-none"
                  value={techInfo.address || ''}
                  onChange={(e) => {
                    setTechInfo(prev => ({ ...prev, address: e.target.value }));
                    setError('');
                  }}
                />
              </div>

              {noticeBox}
              {errorBox}
            </div>

            <div className="pb-4 pt-4">
              <button
                type="button"
                onClick={handleProfileNext}
                disabled={uploadingAvatar}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                مرحله بعد: شبکه‌های اجتماعی
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 4: SOCIAL LINKS (OPTIONAL)
            ============================================ */}
        {step === 'socials' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto no-scrollbar">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('profile')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100/40">
                  مرحله ۲ از ۳: اطلاعات ارتباطی
                </div>

                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">شبکه‌های اجتماعی</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  مشتریان از طریق این آیدی‌ها با سالن شما ارتباط می‌گیرند. (اختیاری)
                </p>
              </div>

              {/* Instagram Handle Input */}
              <div className="space-y-1.5">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>آیدی اینستاگرام</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="مثال: sara_nailart"
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr pl-24"
                    value={techInfo.instagram || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace('@', '').trim();
                      setTechInfo(prev => ({ ...prev, instagram: val }));
                    }}
                  />

                  {techInfo.instagram && isValidInstagramHandle(techInfo.instagram) && (
                    <a
                      href={`https://instagram.com/${techInfo.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute left-2.5 px-2.5 py-1.5 bg-pink-50 text-[#EC4899] rounded-lg text-[10px] font-bold border border-pink-100 flex items-center gap-1 hover:bg-pink-100 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>پیش‌نمایش</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Optional WhatsApp / Telegram */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-neutral-700 text-[11px] font-bold flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                    <span>شماره واتس‌اپ</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="۰۹۱۲..."
                    className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={techInfo.whatsapp || ''}
                    onChange={(e) => setTechInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-700 text-[11px] font-bold flex items-center gap-1">
                    <Send className="w-3.5 h-3.5 text-blue-500" />
                    <span>آیدی تلگرام</span>
                  </label>
                  <input
                    type="text"
                    placeholder="آیدی تلگرام"
                    className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-[14px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={techInfo.telegram || ''}
                    onChange={(e) => setTechInfo(prev => ({ ...prev, telegram: e.target.value }))}
                  />
                </div>
              </div>

              {noticeBox}
              {errorBox}
            </div>

            <div className="pb-4 pt-4">
              <button
                type="button"
                onClick={() => setStep('works')}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                مرحله بعد: افزودن نمونه‌کارها
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 5: UPLOADING WORKS
            ============================================ */}
        {step === 'works' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('socials')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100/40">
                  مرحله ۳ از ۳: افزودن نمونه‌کارها
                </div>

                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">ثبت کارهای شما</h2>
                <p className="text-xs text-neutral-400 mt-0.5 font-semibold">
                  حداقل ۱ الی ۳ نمونه‌کار عالی از کارهای خود ثبت کنید.
                </p>
              </div>

              {/* Design list */}
              {designs.length > 0 && (
                <div className="space-y-2.5">
                  {designs.map((item) => (
                    <div key={item.id} className="bg-neutral-50 border border-neutral-200 rounded-[16px] p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-12 h-12 rounded-[12px] object-cover shrink-0 border border-neutral-200"
                        />
                        <div className="min-w-0 text-right">
                          <h4 className="text-xs font-bold text-neutral-800 truncate">{item.title}</h4>
                          <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                            ⏱️ {item.duration} دقیقه • {item.price.toLocaleString('fa-IR')} تومان
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDesigns(prev => prev.filter(d => d.id !== item.id))}
                        className="p-2 text-neutral-400 hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="w-full py-4 bg-pink-50/50 hover:bg-pink-100/50 border border-dashed border-[#EC4899] rounded-[16px] flex items-center justify-center gap-2 text-[#EC4899] text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ افزودن نمونه‌کار جدید</span>
              </button>

              {noticeBox}
              {errorBox}
            </div>

            <div className="pb-4 pt-4">
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading || uploadingDesign}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md disabled:opacity-60"
              >
                {loading ? 'در حال ثبت نهایی ویترین...' : 'تکمیل و ساخت ویترین'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 6: READY CONGRATS & SHARE LINK
            ============================================ */}
        {step === 'ready' && (
          <div className="flex-1 flex flex-col justify-between p-8 bg-white text-center">
            <div className="pt-6">
              <div className="w-20 h-20 rounded-full bg-pink-50 text-[#EC4899] mx-auto flex items-center justify-center border border-pink-100 mb-4">
                <Sparkles className="w-10 h-10 animate-pulse" />
              </div>

              <h2 className="text-xl font-black text-neutral-900">ویترین شما آماده است!</h2>
              <p className="text-xs text-neutral-500 font-semibold mt-2 leading-relaxed">
                ویترین آنلاین شما با موفقیت ساخته شد. می‌توانید لینک اختصاصی زیر را کپی کرده و در بیو اینستاگرام خود قرار دهید.
              </p>
            </div>

            {/* Share Link Card */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-[20px] p-4 text-center space-y-3 my-4">
              <span className="text-[11px] font-bold text-neutral-400 block">لینک اختصاصی ویترین شما</span>

              <div className="bg-white border border-neutral-200 rounded-xl py-2.5 px-3 text-xs font-mono text-[#EC4899] dir-ltr text-center truncate">
                {getFullShareUrl()}
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3 bg-pink-50 hover:bg-pink-100 text-[#EC4899] text-xs font-bold rounded-xl border border-pink-100/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>لینک کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>کپی لینک اختصاصی</span>
                  </>
                )}
              </button>
            </div>

            <div className="pb-4">
              <button
                type="button"
                onClick={() => navigate(`/vitrin/${techInfo.slug || 'profile'}`)}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                مشاهده ویترین من
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            ADD WORK SAMPLE MODAL
            ============================================ */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[24px] p-6 max-h-[90%] overflow-y-auto no-scrollbar space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-extrabold text-neutral-900">افزودن نمونه‌کار جدید</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Work image selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">تصویر نمونه‌کار</label>
                {newDesign.image_url ? (
                  <div className="relative aspect-square max-w-[140px] mx-auto rounded-xl overflow-hidden border border-neutral-200">
                    <img src={newDesign.image_url} alt="Work" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewDesign(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-1.5 left-1.5 bg-white text-neutral-800 rounded-full p-1 shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full py-8 border-2 border-dashed border-neutral-300 hover:border-[#EC4899] bg-neutral-50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Plus className="w-6 h-6 text-neutral-400" />
                    <span className="text-[11px] font-bold text-neutral-500 mt-1">انتخاب یا آپلود عکس</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
                {uploadingDesign && (
                  <div className="text-[10px] text-[#EC4899] font-bold text-center">در حال آپلود...</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">عنوان طرح</label>
                <input
                  type="text"
                  placeholder="مثال: کاشت ژل با دیزاین فرنچ"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-right"
                  value={newDesign.title}
                  onChange={(e) => setNewDesign(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">قیمت (تومان)</label>
                  <input
                    type="text"
                    placeholder="۴۵۰,۰۰۰"
                    className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={newDesign.price}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">مدت زمان</label>
                  <select
                    className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-right cursor-pointer"
                    value={newDesign.duration}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, duration: e.target.value }))}
                  >
                    <option value="۱ ساعت">۱ ساعت</option>
                    <option value="۱.۵ ساعت">۱.۵ ساعت</option>
                    <option value="۲ ساعت">۲ ساعت</option>
                    <option value="۲.۵ ساعت">۲.۵ ساعت</option>
                    <option value="۳ ساعت">۳ ساعت</option>
                  </select>
                </div>
              </div>

              {/* Tags Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">تگ رنگ</label>
                  <select
                    className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-right cursor-pointer"
                    value={newDesign.colorTag}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, colorTag: e.target.value }))}
                  >
                    {INITIAL_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">تگ سبک هنری</label>
                  <select
                    className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-right cursor-pointer"
                    value={newDesign.styleTag}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, styleTag: e.target.value }))}
                  >
                    {INITIAL_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddWorkSample}
                  className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-xl text-center"
                >
                  ثبت این نمونه‌کار
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
