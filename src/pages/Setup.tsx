import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  saveNailTech, 
  addDesign, 
  getNailTechByPhoneOrUsername, 
  setCurrentUserSession 
} from '../lib/db';
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
  UserPlus,
  Lock,
  Phone,
  MapPin,
  MessageCircle,
  Send,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  ArrowRight
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

export default function Setup() {
  const navigate = useNavigate();
  
  // Navigation Steps:
  // 'splash': Initial Choice (Login/Register or View Nail Techs)
  // 'auth': Phone, Username, Password (Login vs Signup detection)
  // 'socials': Instagram, WhatsApp, Telegram
  // 'works': Uploading sample works
  // 'avatar': Profile Photo & Salon Name
  // 'ready': Your Vitrin is ready + Share Link!
  const [step, setStep] = useState<'splash' | 'auth' | 'socials' | 'works' | 'avatar' | 'ready'>('splash');

  // Auth mode
  const [authInput, setAuthInput] = useState(''); // phone or username
  const [password, setPassword] = useState('');
  
  // Registration Form State
  const [techId, setTechId] = useState<string | null>(null);
  const [techInfo, setTechInfo] = useState<Partial<NailTech>>({
    name: '',
    city: 'تهران',
    instagram: '',
    whatsapp: '',
    telegram: '',
    avatar_url: '',
    slug: '',
    mobile: ''
  });

  // Sample Works / Designs State
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
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live clock
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

    // Keyboard shortcut handler for secret demo data fill (Spacebar press)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret demo fill trigger: Spacebar when on registration steps
      if (e.code === 'Space' && (step === 'auth' || step === 'socials' || step === 'works' || step === 'avatar')) {
        // Avoid filling if typing inside text input that is actively focused
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' && (document.activeElement as HTMLInputElement).value.trim().length > 0) {
          return;
        }

        e.preventDefault();
        // Secret fill realistic demo data
        const demoSlug = 'sara_nails_' + Math.floor(Math.random() * 1000);
        const demoTech: Partial<NailTech> = {
          name: 'سالن تخصصی سارا نیلز',
          city: 'تهران',
          instagram: 'sara_nailart',
          whatsapp: '09127579476',
          telegram: 'sara_nailart',
          mobile: '09127579476',
          slug: demoSlug,
          avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop'
        };

        setTechInfo(demoTech);
        setAuthInput('09127579476');
        setPassword('password123');

        // Add 3 sample works
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
        setError('داده‌های آزمایشی میانبر با موفقیت جایگذاری شدند.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [step]);

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

  const handleAuthSubmit = async () => {
    setError('');
    const input = authInput.trim();
    if (!input) {
      setError('لطفاً شماره موبایل یا آیدی کاربری را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      // Check if tech exists
      const existing = await getNailTechByPhoneOrUsername(input);

      if (existing) {
        if (!password) {
          setError('حساب شما یافت شد. لطفاً رمز عبور خود را وارد کنید.');
          setLoading(false);
          return;
        }

        // Verify password
        if (existing.password_hash && existing.password_hash !== password) {
          setError('رمز عبور وارد شده نادرست است.');
          setLoading(false);
          return;
        }

        // Login success!
        setCurrentUserSession(existing);
        setTechId(existing.id);
        setTechInfo(existing);
        navigate(`/vitrin/${existing.slug}`);
      } else {
        // New user creation path
        if (!password) {
          setError('لطفاً یک رمز عبور برای حساب خود تعیین کنید.');
          setLoading(false);
          return;
        }

        // Prepare new tech state
        const slug = input.includes('09') ? `tech_${crypto.randomUUID().slice(0, 6)}` : input.replace('@', '');
        setTechInfo(prev => ({
          ...prev,
          mobile: input.includes('09') ? input : '09120000000',
          username: slug,
          slug: slug
        }));

        setStep('socials');
      }
    } catch (err) {
      console.error(err);
      setError('خطا در احراز هویت');
    } finally {
      setLoading(false);
    }
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

  const handleDesignImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingDesign(true);
    setError('');
    try {
      const url = await uploadImage(file, 'designs', techId || 'temp');
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
      tech_id: techId || 'temp',
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
    if (!techInfo.name?.trim()) {
      setError('نام سالن یا ناخن‌کار الزامی است.');
      return;
    }

    setLoading(true);
    try {
      const finalSlug = techInfo.slug || techInfo.username || `tech_${crypto.randomUUID().slice(0, 6)}`;

      const savedTech = await saveNailTech({
        id: techId || undefined,
        slug: finalSlug,
        username: techInfo.username || finalSlug,
        password_hash: password || '123456',
        name: techInfo.name,
        city: techInfo.city || 'تهران',
        instagram: techInfo.instagram || '',
        whatsapp: techInfo.whatsapp || techInfo.mobile,
        telegram: techInfo.telegram || '',
        avatar_url: techInfo.avatar_url || '',
        mobile: techInfo.mobile || '09120000000',
      });

      if (savedTech) {
        setCurrentUserSession(savedTech);
        setTechId(savedTech.id);

        // Save designs
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
    const slug = techInfo.slug || techInfo.username || 'profile';
    const baseUrl = window.location.origin;
    return `${baseUrl}/vitrin/${slug}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredCities = POPULAR_CITIES.filter(c => c.includes(citySearchQuery.trim()));

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
            STEP 0: SPLASH LANDING CHOICE
            ============================================ */}
        {step === 'splash' && (
          <div className="flex-1 flex flex-col justify-between p-8 bg-white text-center">
            <div className="pt-8">
              <span className="text-[11px] font-bold text-[#EC4899] bg-pink-50 px-3 py-1 rounded-full border border-pink-100/50">
                ویتِرینو • ساخت ویترین اختصاصی ناخن
              </span>
              <h1 className="text-2xl font-black text-neutral-900 mt-4 tracking-tight">
                پلتفرم تخصصی معرفی و رزرو ناخن‌کاران
              </h1>
              <p className="text-xs text-neutral-500 mt-2 font-medium leading-relaxed px-2">
                ویترین آنلاین کارهای خود را بسازید، لینک اختصاصی بیو اینستاگرام دریافت کنید و نوبت‌دهی خود را ساده کنید.
              </p>
            </div>

            <div className="my-8 flex justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-pink-100 via-pink-50 to-purple-100 p-2 flex items-center justify-center shadow-inner">
                <div className="w-full h-full rounded-full bg-white border border-pink-200/60 flex flex-col items-center justify-center p-4">
                  <Sparkles className="w-10 h-10 text-[#EC4899] animate-pulse" />
                  <span className="text-xs font-black text-neutral-800 mt-2">ویتِرینو</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-0.5">Vitrino Portfolio</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-4">
              <button
                type="button"
                onClick={() => setStep('auth')}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-sm font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>ثبت‌نام یا ورود ناخن‌کار</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/techs')}
                className="w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-[18px] text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 text-neutral-500" />
                <span>مشاهده ناخن‌کاران</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 1: AUTHENTICATION (PHONE & PASSWORD)
            ============================================ */}
        {step === 'auth' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('splash')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-neutral-800">ورود و ثبت‌نام</span>
                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">شماره موبایل یا نام‌کاربری</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  در صورت وجود حساب وارد می‌شوید، در غیر این صورت حساب جدید ساخته می‌شود.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>شماره موبایل یا نام‌کاربری</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ۰۹۱۲۷۵۷۹۴۷۶ یا sara_nails"
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={authInput}
                    onChange={(e) => {
                      setAuthInput(e.target.value);
                      setError('');
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#EC4899]" />
                    <span>رمز عبور</span>
                  </label>
                  <input
                    type="password"
                    placeholder="رمز عبور خود را وارد کنید"
                    className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold border border-red-100 text-right">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="pb-4">
              <button
                type="button"
                onClick={handleAuthSubmit}
                disabled={loading}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                {loading ? 'در حال بررسی...' : 'ادامه'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 2: SOCIAL LINKS
            ============================================ */}
        {step === 'socials' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white overflow-y-auto no-scrollbar">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('auth')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Progress bar pill */}
                <div className="bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100/40">
                  مرحله ۱ از ۳: اطلاعات ارتباطی
                </div>

                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">شهر و شبکه‌های اجتماعی</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  مشتریان از طریق این آیدی‌ها با سالن شما ارتباط می‌گیرند.
                </p>
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

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold border border-red-100 text-right">
                  {error}
                </div>
              )}
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
            STEP 3: UPLOADING WORKS
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
                  مرحله ۲ از ۳: افزودن نمونه‌کارها
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

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold border border-red-100 text-right">
                  {error}
                </div>
              )}
            </div>

            <div className="pb-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  if (designs.length === 0) {
                    setError('لطفاً حداقل یک نمونه‌کار وارد کنید.');
                    return;
                  }
                  setError('');
                  setStep('avatar');
                }}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                مرحله بعد: عکس پروفایل و نام سالن
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 4: AVATAR & NAME
            ============================================ */}
        {step === 'avatar' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-white">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('works')}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-bold border border-pink-100/40">
                  مرحله ۳ از ۳: عکس و نام
                </div>

                <div className="w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-neutral-900">عکس پروفایل و نام سالن</h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  تصویر زیبا یا لوگوی سالن خود را بارگذاری کنید.
                </p>
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

              {/* Avatar Selector */}
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative">
                  {techInfo.avatar_url ? (
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#EC4899] p-0.5">
                      <img src={techInfo.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                    </div>
                  ) : (
                    <label className="w-32 h-32 border-2 border-dashed border-[#EC4899] bg-pink-50/20 hover:bg-pink-50/50 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Plus className="w-8 h-8 text-[#EC4899]" />
                      <span className="text-[10px] font-bold text-[#EC4899] mt-1">انتخاب عکس</span>
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
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold border border-red-100 text-right">
                  {error}
                </div>
              )}
            </div>

            <div className="pb-4">
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading || uploadingAvatar}
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center transition-all cursor-pointer shadow-md"
              >
                {loading ? 'در حال ثبت نهایی ویترین...' : 'تکمیل و ساخت ویترین'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 5: READY CONGRATS & SHARE LINK
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
                onClick={() => {
                  const slug = techInfo.slug || techInfo.username || 'profile';
                  navigate(`/vitrin/${slug}`);
                }}
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
