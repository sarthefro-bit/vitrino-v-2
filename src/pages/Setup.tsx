import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveNailTech, addDesign, deleteDesign, ensureUniqueSlug } from '../lib/db';
import { uploadImage } from '../lib/storage';
import { hasSupabaseCredentials } from '../lib/supabaseClient';
import type { NailTech, Design } from '../lib/db';
import { 
  Search, 
  Trash2, 
  X, 
  ChevronDown, 
  Check, 
  Info,
  ChevronRight,
  Instagram
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

function getColorBulletClass(colorName: string): string {
  switch (colorName) {
    case 'بنفش': return 'bg-purple-500';
    case 'سبز': return 'bg-emerald-500';
    case 'آبی': return 'bg-blue-500';
    case 'صورتی': return 'bg-pink-500';
    case 'قرمز': return 'bg-red-500';
    case 'نود': return 'bg-amber-200';
    case 'سفید': return 'bg-white border border-neutral-300';
    case 'مشکی': return 'bg-neutral-900';
    default: return 'bg-pink-400';
  }
}

interface IgMockProfile {
  username: string;
  fullName: string;
  followers: string;
  posts: string;
  avatarUrl: string;
}

function getMockInstagramSuggestions(query: string): IgMockProfile[] {
  const q = query.trim().toLowerCase().replace('@', '');
  if (!q) return [];
  
  const sampleProfiles: IgMockProfile[] = [
    {
      username: 'nikoo_dehpanah',
      fullName: 'نیکو دهپناه | خدمات تخصصی ناخن',
      followers: '۱۳K',
      posts: '۶۴',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'
    },
    {
      username: 'sara_nailart',
      fullName: 'سارا ناخن | آموزش و خدمات',
      followers: '۲۴K',
      posts: '۱۴۲',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop'
    },
    {
      username: 'elnaz_beauty',
      fullName: 'الناز بیوتی | سالن تخصصی کاشت',
      followers: '۸K',
      posts: '۹۵',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'
    },
    {
      username: 'pariya_nails',
      fullName: 'پریا نیلز | طراح تخصصی ژلیش',
      followers: '۵K',
      posts: '۵۱',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop'
    },
    {
      username: 'maryam_shakeri',
      fullName: 'مریم شاکری | سالن زیبایی کرج',
      followers: '۴۳K',
      posts: '۳۱۰',
      avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop'
    }
  ];
  
  const filtered = sampleProfiles.filter(p => p.username.includes(q) || p.fullName.includes(q));
  
  const hasExact = filtered.some(p => p.username === q);
  if (!hasExact && q.length >= 2) {
    const avatarIndex = (q.length % 4);
    const avatars = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop'
    ];
    filtered.unshift({
      username: q,
      fullName: `${q} | ناخن‌کار مستقل`,
      followers: `${((q.length * 17) % 45 + 5).toFixed(0)}K`,
      posts: `${(q.length * 13) % 150 + 20}`,
      avatarUrl: avatars[avatarIndex]
    });
  }
  
  return filtered;
}

export default function Setup() {
  const navigate = useNavigate();
  
  // App-level state for Splash Screen
  const [showSplash, setShowSplash] = useState(true);
  
  // Step-by-step Registration State
  const [step, setStep] = useState<'info' | 'avatar' | 'welcome'>('info');

  // Available selectable values
  const [availableColors, setAvailableColors] = useState<string[]>(INITIAL_COLORS);
  const [availableStyles, setAvailableStyles] = useState<string[]>(INITIAL_STYLES);
  
  // Registration Form State
  const [techId, setTechId] = useState<string | null>(null);
  const [techInfo, setTechInfo] = useState<Partial<NailTech>>({
    name: '',
    city: '',
    instagram: '',
    avatar_url: '',
    slug: '',
    mobile: ''
  });

  // Instagram Account Search States
  const [instagramSearchQuery, setInstagramSearchQuery] = useState('');
  const [showInstagramSuggestions, setShowInstagramSuggestions] = useState(false);
  const [selectedInstagramProfile, setSelectedInstagramProfile] = useState<IgMockProfile | null>(null);

  // Designs / Work Samples State
  const [designs, setDesigns] = useState<Design[]>([]);
  
  // City search & selector dropdown state
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Add work sample modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesign, setNewDesign] = useState<{
    image_url: string;
    title: string;
    tags: string[];
    min_price: string;
    max_price: string;
    duration: string; // duration text
  }>({
    image_url: '',
    title: '',
    tags: [],
    min_price: '',
    max_price: '',
    duration: '۲ ساعت'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState(false);

  useEffect(() => {
    // 2.2-second Splash Screen delay
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    // Load any existing profile from local storage if available
    const loadStoredDataTimer = setTimeout(() => {
      try {
        const storedTechs = localStorage.getItem('vitrino_nail_techs');
        if (storedTechs) {
          const parsed = JSON.parse(storedTechs);
          if (parsed && parsed.length > 0) {
            const mainTech = parsed[0];
            setTechId(mainTech.id);
            setTechInfo(mainTech);

            if (mainTech.instagram) {
              const username = mainTech.instagram.replace('@', '').replace('instagram.com/', '');
              setSelectedInstagramProfile({
                username: username,
                fullName: mainTech.name || username,
                followers: '۱۳K',
                posts: '۶۴',
                avatarUrl: mainTech.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop'
              });
            }
            
            const storedDesigns = localStorage.getItem('vitrino_designs');
            if (storedDesigns) {
              const parsedDesigns = JSON.parse(storedDesigns);
              const filtered = parsedDesigns.filter((d: Design) => d.tech_id === mainTech.id);
              setDesigns(filtered);
            }
          }
        }
      } catch (e) {
        console.warn('Could not restore cached profile:', e);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      clearTimeout(loadStoredDataTimer);
    };
  }, []);

  // Handle clicking outside of city dropdown to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTechInfoChange = (field: keyof NailTech, value: string) => {
    setTechInfo((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const folder = `avatars/${crypto.randomUUID().slice(0, 8)}`;
      const url = await uploadImage(file, 'avatars', folder);
      if (url) {
        handleTechInfoChange('avatar_url', url);
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
      const folder = techId || `temp/${crypto.randomUUID().slice(0, 8)}`;
      const url = await uploadImage(file, 'designs', folder);
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

  const handleAddWorkSample = async () => {
    if (!newDesign.image_url) {
      setError('لطفاً یک تصویر برای نمونه‌کار آپلود کنید');
      return;
    }
    if (!newDesign.title.trim()) {
      setError('لطفاً عنوان نمونه‌کار را وارد کنید');
      return;
    }
    if (!newDesign.min_price) {
      setError('لطفاً قیمت نمونه‌کار را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      let currentTechId = techId;
      if (!currentTechId) {
        const defaultName = techInfo.name || 'آرایشگاه زیبایی';
        const defaultCity = techInfo.city || 'تهران';
        const tempTech = await saveNailTech({
          slug: techInfo.slug || 'profile-' + crypto.randomUUID().slice(0, 5),
          name: defaultName,
          city: defaultCity,
          instagram: techInfo.instagram || '',
          avatar_url: techInfo.avatar_url || '',
          mobile: techInfo.mobile || ''
        });
        if (tempTech) {
          currentTechId = tempTech.id;
          setTechId(tempTech.id);
          setTechInfo(tempTech);
        } else {
          throw new Error('Could not create profile');
        }
      }

      const minVal = parseInt(newDesign.min_price.replace(/,/g, '')) || 0;
      
      // Order matters here: '۳۰ دقیقه' contains the character '۳', so it must
      // be checked BEFORE the plain '۳' (hours) check, or every 30-minute
      // design silently gets saved as 180 minutes (3 hours) instead of 30.
      let durationMins = 120; // default 2 hours
      if (newDesign.duration.includes('۳۰')) durationMins = 30;
      else if (newDesign.duration.includes('۲.۵')) durationMins = 150;
      else if (newDesign.duration.includes('۱.۵')) durationMins = 90;
      else if (newDesign.duration.includes('۳')) durationMins = 180;
      else if (newDesign.duration.includes('۲')) durationMins = 120;
      else if (newDesign.duration.includes('۱')) durationMins = 60;

      const savedDesign = await addDesign({
        tech_id: currentTechId,
        title: newDesign.title,
        image_url: newDesign.image_url,
        tags: newDesign.tags.length > 0 ? newDesign.tags : ['ساده'],
        price: minVal, 
        duration: durationMins
      });

      if (savedDesign) {
        setDesigns(prev => [...prev, savedDesign]);
        
        // Reset design form
        setNewDesign({
          image_url: '',
          title: '',
          tags: [],
          min_price: '',
          max_price: '',
          duration: '۲ ساعت'
        });
        setShowAddModal(false);
        setError('');
      } else {
        // addDesign() returns null when both Supabase AND the local
        // storage fallback failed — most commonly because offline mode
        // ran out of localStorage space (photos are stored as Base64).
        setError('فضای ذخیره‌سازی مرورگر پر شده است. لطفاً یک تصویر با حجم کمتر امتحان کنید یا Supabase را متصل کنید.');
      }
    } catch (err) {
      console.error(err);
      setError('خطا در افزودن نمونه‌کار');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesign = async (designId: string) => {
    try {
      // deleteDesign() handles both the Supabase row AND the local
      // storage fallback internally — calling localStorage directly here
      // used to leave the design alive in Supabase, so it kept showing
      // up on the public vitrin page after being "deleted".
      const success = await deleteDesign(designId);
      if (success) {
        setDesigns(prev => prev.filter(d => d.id !== designId));
      } else {
        setError('خطا در حذف نمونه‌کار');
      }
    } catch (e) {
      console.error(e);
      setError('خطا در حذف نمونه‌کار');
    }
  };

  const handleNextToAvatar = async () => {
    if (!techInfo.name || !techInfo.name.trim()) {
      setError('نام آرایشگاه الزامی است');
      return;
    }
    if (!techInfo.mobile || !techInfo.mobile.trim()) {
      setError('شماره موبایل الزامی است');
      return;
    }
    if (!/^09\d{9}$/.test(techInfo.mobile.trim())) {
      setError('شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)');
      return;
    }
    if (!techInfo.city || !techInfo.city.trim()) {
      setError('انتخاب شهر الزامی است');
      return;
    }
    if (!techInfo.instagram || !techInfo.instagram.trim()) {
      setError('لینک اینستاگرام الزامی است');
      return;
    }
    if (designs.length < 3) {
      setError('حداقل باید سه نمونه‌کار وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      const finalSlug = await ensureUniqueSlug(techInfo.slug || techInfo.name, techId || undefined);

      const tech = await saveNailTech({
        id: techId || undefined,
        slug: finalSlug,
        name: techInfo.name,
        city: techInfo.city,
        instagram: techInfo.instagram,
        avatar_url: techInfo.avatar_url || '',
        mobile: techInfo.mobile
      });

      if (tech) {
        setTechId(tech.id);
        setTechInfo(tech);
        setError('');
        setStep('avatar');
      }
    } catch {
      setError('خطا در ذخیره اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    try {
      const finalSlug = await ensureUniqueSlug(techInfo.slug || techInfo.name || 'profile', techId || undefined);

      const tech = await saveNailTech({
        id: techId || undefined,
        slug: finalSlug,
        name: techInfo.name || 'آرایشگاه',
        city: techInfo.city || 'تهران',
        instagram: techInfo.instagram || '',
        avatar_url: techInfo.avatar_url || '',
        mobile: techInfo.mobile || ''
      });

      if (tech) {
        setTechId(tech.id);
        setTechInfo(tech);
        setError('');
        setStep('welcome');
      }
    } catch {
      setError('خطا در تکمیل نهایی ثبت‌نام');
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = POPULAR_CITIES.filter(city => 
    city.includes(citySearchQuery.trim())
  );

  const formatPricePersian = (priceNum: number) => {
    if (!priceNum) return 'توافقی';
    return priceNum.toLocaleString('fa-IR') + ' تومان';
  };

  const isFormValid = !!(
    techInfo.name?.trim() && 
    techInfo.mobile?.trim() && 
    techInfo.city?.trim() && 
    techInfo.instagram?.trim() && 
    designs.length >= 3
  );

  const isDesignFormValid = !!(
    newDesign.image_url && 
    newDesign.title.trim() && 
    newDesign.min_price
  );

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 sm:p-6" dir="rtl">
      
      <div className="phone-mockup-wrapper bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">
        
        {/* ============================================
            SPLASH SCREEN COMPONENT
            ============================================ */}
        {showSplash && (
          <div className="absolute inset-0 bg-[#EC4899] text-white flex flex-col justify-between p-12 z-50 transition-all duration-700 ease-in-out">
            <div className="h-10" />
            <div className="flex flex-col items-center justify-center gap-4 flex-1">
              <h1 className="text-4xl font-extrabold tracking-[0.25em] text-white select-none text-center font-sans pr-[-0.25em]">
                BEAUTY
              </h1>
              
              <div className="mt-8 relative flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-white/20 rounded-full absolute" />
                <div className="w-10 h-10 border-t-2 border-white rounded-full animate-spin" />
              </div>
            </div>
            
            <div className="text-center text-white/75 text-sm font-medium tracking-wide">
              نسخه ۲.۳.۰
            </div>
          </div>
        )}

        {/* ============================================
            STEP 1: MAIN REGISTRATION INFO SCREEN
            ============================================ */}
        {!showSplash && step === 'info' && (
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-neutral-50">
            
            {/* Header Title (Without Card, Flat & Elegant) */}
            <div className="p-6 text-center shrink-0 border-b border-neutral-100 bg-white">
              <h2 className="text-xl font-bold text-neutral-900">ثبت‌نام</h2>
              <p className="text-neutral-500 text-xs mt-1.5 font-medium">لطفا اطلاعات زیر را تکمیل نمایید</p>
              
              {!hasSupabaseCredentials && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-pink-50 text-[#EC4899] px-3 py-1 rounded-full text-[10px] font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  ذخیره‌سازی آفلاین و محلی فعال است
                </div>
              )}
            </div>

            {/* Form Fields Section */}
            <div className="px-6 py-6 pb-28 space-y-5">
              
              {/* 1. Salon Name */}
              <div className="space-y-1.5">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  نام آرایشگاه <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="نام آرایشگاه را وارد کنید." 
                  className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] transition-all text-right"
                  value={techInfo.name || ''}
                  onChange={(e) => handleTechInfoChange('name', e.target.value)}
                />
              </div>

              {/* 2. Mobile Phone Number */}
              <div className="space-y-1.5">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  شماره موبایل <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  placeholder="مثال: ۰۹۱۲۷۵۷۹۴۷۶" 
                  className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] transition-all text-left dir-ltr font-mono"
                  value={techInfo.mobile || ''}
                  onChange={(e) => handleTechInfoChange('mobile', e.target.value)}
                />
              </div>

              {/* 3. City Selection Input */}
              <div className="space-y-1.5 relative">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  شهر <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] border-dashed hover:border-[#EC4899] transition-all flex justify-between items-center text-right"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                >
                  <span className={techInfo.city ? "text-neutral-900" : "text-neutral-400"}>
                    {techInfo.city || 'شهری که در آن فعالیت می‌کنید را انتخاب کنید.'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                </button>

                {/* City Dropdown List */}
                {showCityDropdown && (
                  <div 
                    ref={cityDropdownRef} 
                    className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-[16px] border border-neutral-200 overflow-hidden flex flex-col max-h-[220px]"
                  >
                    <div className="p-2 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50">
                      <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="جستجو" 
                        className="w-full bg-transparent text-xs outline-none text-right font-semibold py-1"
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto no-scrollbar flex-1 py-1">
                      {filteredCities.length > 0 ? (
                        filteredCities.map((cityName) => (
                          <button
                            key={cityName}
                            type="button"
                            className="w-full px-4 py-2.5 text-right text-xs hover:bg-neutral-50 flex justify-between items-center font-semibold"
                            onClick={() => {
                              handleTechInfoChange('city', cityName);
                              setShowCityDropdown(false);
                            }}
                          >
                            <span className={techInfo.city === cityName ? "text-[#EC4899] font-bold" : "text-neutral-700"}>
                              {cityName}
                            </span>
                            {techInfo.city === cityName && (
                              <Check className="w-3.5 h-3.5 text-[#EC4899]" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-xs text-neutral-400">
                          شهری یافت نشد
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Instagram Address */}
              <div className="space-y-1.5 relative">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  آیدی اینستاگرام <span className="text-red-500">*</span>
                </label>
                
                {selectedInstagramProfile ? (
                  /* Connected Instagram Profile Card */
                  <div className="bg-white border border-neutral-200 rounded-[16px] p-4 flex items-center justify-between shadow-sm transition-all animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-pink-500 p-0.5 bg-white">
                          <img 
                            src={selectedInstagramProfile.avatarUrl} 
                            alt={selectedInstagramProfile.username} 
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-yellow-400 via-[#EC4899] to-purple-600 text-white rounded-full p-1 border border-white flex items-center justify-center">
                          <Instagram className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-neutral-850 dir-ltr">@{selectedInstagramProfile.username}</h4>
                          <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">متصل شد</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-1 font-bold">
                          {selectedInstagramProfile.followers} فالوور • {selectedInstagramProfile.fullName}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      className="text-[11px] font-bold text-neutral-500 hover:text-[#EC4899] bg-neutral-50 hover:bg-pink-50 px-3.5 py-1.5 rounded-full border border-neutral-200 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedInstagramProfile(null);
                        handleTechInfoChange('instagram', '');
                        setInstagramSearchQuery(selectedInstagramProfile.username);
                        setShowInstagramSuggestions(true);
                      }}
                    >
                      تغییر پیج
                    </button>
                  </div>
                ) : (
                  /* Interactive Instagram Search Box */
                  <div className="relative">
                    <div className="bg-white border border-neutral-200 rounded-[16px] px-3.5 py-3 flex items-center gap-2 focus-within:border-[#EC4899] transition-all">
                      <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="آیدی اینستاگرام خود را تایپ کنید (مثال: nikoo_dehpanah)" 
                        className="w-full bg-transparent text-xs font-semibold text-neutral-850 outline-none text-right placeholder:text-right"
                        value={instagramSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s+/g, '');
                          setInstagramSearchQuery(val);
                          setShowInstagramSuggestions(true);
                          handleTechInfoChange('instagram', val);
                        }}
                        onFocus={() => {
                          if (instagramSearchQuery) setShowInstagramSuggestions(true);
                        }}
                      />
                    </div>

                    {/* Suggestion Dropdown */}
                    {showInstagramSuggestions && instagramSearchQuery && (
                      <div className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-[16px] border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[220px]">
                        <div className="p-2 border-b border-neutral-100 bg-neutral-50 text-[10px] text-neutral-400 font-bold text-right px-4">
                          حساب‌های منطبق در اینستاگرام:
                        </div>
                        <div className="overflow-y-auto no-scrollbar flex-1 py-1">
                          {getMockInstagramSuggestions(instagramSearchQuery).length > 0 ? (
                            getMockInstagramSuggestions(instagramSearchQuery).map((prof) => (
                              <button
                                key={prof.username}
                                type="button"
                                className="w-full px-4 py-2.5 text-right hover:bg-pink-50/20 flex justify-between items-center transition-all border-b border-neutral-50 last:border-0"
                                onClick={() => {
                                  setSelectedInstagramProfile(prof);
                                  handleTechInfoChange('instagram', prof.username);
                                  // Auto set avatar url as well for seamless magical UX!
                                  if (!techInfo.avatar_url) {
                                    handleTechInfoChange('avatar_url', prof.avatarUrl);
                                  }
                                  setShowInstagramSuggestions(false);
                                }}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img 
                                    src={prof.avatarUrl} 
                                    alt={prof.username} 
                                    className="w-8 h-8 rounded-full object-cover border border-neutral-100 shrink-0"
                                  />
                                  <div className="text-right min-w-0">
                                    <p className="text-xs font-bold text-neutral-850 dir-ltr text-left">@{prof.username}</p>
                                    <p className="text-[9px] text-neutral-400 truncate mt-0.5">{prof.fullName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-neutral-400 font-bold font-mono">{prof.followers} follower</span>
                                  <div className="w-5 h-5 rounded-full bg-pink-50 flex items-center justify-center text-[#EC4899] text-xs font-bold border border-pink-100/30">
                                    +
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3.5 text-center text-xs text-neutral-400 font-medium">
                              نتیجه‌ای یافت نشد. به تایپ ادامه دهید...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Custom URL Slug */}
              <div className="space-y-1.5">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  شناسه آدرس اختصاصی (slug)
                </label>
                <input 
                  type="text" 
                  placeholder="مثال: sara-nails" 
                  className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] transition-all text-left dir-ltr"
                  value={techInfo.slug || ''}
                  onChange={(e) => handleTechInfoChange('slug', e.target.value)}
                />
              </div>

              {/* 6. Work Samples Section */}
              <div className="pt-2 space-y-3">
                <label className="text-neutral-700 text-xs font-bold flex items-center gap-1">
                  نمونه‌کارها <span className="text-red-500">*</span>
                </label>

                {/* List of currently added work samples */}
                {designs.length > 0 && (
                  <div className="space-y-3">
                    {designs.map((item) => (
                      <div 
                        key={item.id} 
                        className="bg-white border border-neutral-200 rounded-[16px] p-3.5 flex gap-3.5 items-center justify-between"
                      >
                        <div className="flex gap-3 items-center min-w-0 flex-1">
                          <img 
                            src={item.image_url} 
                            alt={item.title} 
                            className="w-16 h-16 rounded-[12px] object-cover shrink-0 border border-neutral-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=طرح';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-neutral-850 truncate text-right">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-neutral-400 mt-1 text-right font-medium">
                              ⏱️ {item.duration === 30 ? '۳۰ دقیقه' : `${item.duration / 60} ساعت`}
                            </p>
                            <p className="text-xs font-extrabold text-[#EC4899] mt-1 text-right">
                              {formatPricePersian(item.price)}
                            </p>
                          </div>
                        </div>

                        <button 
                          type="button" 
                          className="text-neutral-400 hover:text-red-500 p-2 shrink-0 self-center transition-all"
                          onClick={() => handleDeleteDesign(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pink dashed trigger button */}
                <button
                  type="button"
                  className="w-full py-4 bg-pink-50/20 border border-dashed border-[#EC4899] hover:bg-pink-50/50 rounded-[16px] flex flex-col items-center justify-center gap-1.5 transition-all text-center"
                  onClick={() => { setError(''); setShowAddModal(true); }}
                >
                  <span className="text-[#EC4899] text-xs font-extrabold">+ افزودن نمونه‌کار</span>
                </button>
                
                <p className="text-center text-[10px] text-neutral-400 font-medium pt-1">
                  {designs.length < 3 
                    ? `حداقل باید سه نمونه‌کار وارد کنید. (${designs.length} از ۳)`
                    : 'حداقل ۳ نمونه‌کار با موفقیت ثبت شد.'
                  }
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold text-right border border-red-100">
                  ⚠️ {error}
                </div>
              )}

            </div>

            {/* Bottom floating register button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100 z-20 shrink-0">
              <button
                type="button"
                className={`w-full py-4 text-sm font-bold text-white rounded-[16px] text-center transition-all ${
                  isFormValid 
                    ? 'bg-[#EC4899] hover:bg-[#DB2777] cursor-pointer' 
                    : 'bg-pink-100 text-pink-300 cursor-not-allowed'
                }`}
                disabled={loading}
                onClick={handleNextToAvatar}
              >
                {loading ? 'در حال ذخیره‌سازی...' : 'ثبت‌نام'}
              </button>
            </div>

          </div>
        )}

        {/* ============================================
            STEP 2: PROFILE PICTURE UPLOADER SCREEN
            ============================================ */}
        {!showSplash && step === 'avatar' && (
          <div className="flex-1 flex flex-col bg-white p-6 justify-between">
            <div className="pt-8 text-center">
              <h2 className="text-2xl font-bold text-neutral-900">عکس پروفایل</h2>
              <p className="text-neutral-500 text-xs mt-2 font-semibold">لطفا عکس پروفایل خود را وارد کنید.</p>
            </div>

            {/* Circular Dash/Avatar selector */}
            <div className="flex flex-col items-center justify-center flex-1 py-10">
              <div className="relative">
                {techInfo.avatar_url ? (
                  <div className="w-40 h-40 rounded-full overflow-hidden border border-neutral-200">
                    <img 
                      src={techInfo.avatar_url} 
                      alt="پروفایل آرایشگاه" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <label className="w-40 h-40 border-2 border-dashed border-[#EC4899] bg-pink-50/5 hover:bg-pink-50/15 rounded-full flex items-center justify-center cursor-pointer transition-all relative">
                    <span className="text-[#EC4899] text-5xl font-light select-none">+</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)} 
                    />
                  </label>
                )}

                {/* Sub Uploading Label */}
                {uploadingAvatar && (
                  <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-[#EC4899] font-bold animate-pulse">
                    در حال آپلود تصویر...
                  </div>
                )}
              </div>
            </div>

            {/* Step Actions Footer */}
            <div className="space-y-3 pb-4">
              <button
                type="button"
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-sm font-bold rounded-[16px] text-center transition-all cursor-pointer"
                disabled={loading || uploadingAvatar}
                onClick={handleCompleteRegistration}
              >
                {techInfo.avatar_url ? 'تایید و راه‌اندازی ویترین' : 'رد شدن و راه‌اندازی ویترین'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 3: WELCOME CONGRATS SCREEN
            ============================================ */}
        {!showSplash && step === 'welcome' && (
          <div className="flex-1 flex flex-col bg-white p-8 justify-between">
            <div className="h-1" />
            
            {/* Visual celebration */}
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-6 select-none animate-bounce">
                🥳 🌟 🥳
              </div>
              <h2 className="text-2xl font-black text-neutral-900">تبریک!</h2>
              <p className="text-neutral-500 text-sm mt-3 font-semibold">
                ویترین شما با موفقیت راه‌اندازی شد.
              </p>
            </div>

            {/* Action launcher */}
            <div className="pb-4">
              <button
                type="button"
                className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-sm font-bold rounded-[16px] text-center transition-all cursor-pointer"
                onClick={() => {
                  // techInfo.slug is already the finalized, unique slug
                  // saved by handleCompleteRegistration — don't recompute
                  // a raw (possibly colliding) one here.
                  navigate(`/vitrin/${techInfo.slug || 'profile'}`);
                }}
              >
                بزن بریم!
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            ADD WORK SAMPLE - HIGH FIDELITY MODAL FORM
            ============================================ */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            
            <div className="bg-white rounded-t-[24px] max-h-[90%] overflow-y-auto no-scrollbar p-6 flex flex-col gap-4 relative">
              
              {/* Header: Circular white bar pill layout */}
              <div className="flex items-center justify-between bg-white rounded-full border border-neutral-200 py-3.5 px-5 mb-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-all rounded-full hover:bg-neutral-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="font-extrabold text-sm text-neutral-800">افزودن نمونه‌کار</span>
                <div className="w-8" />
              </div>

              {/* Form Content */}
              <div className="space-y-4 flex-1 pb-6">
                
                {/* 1. Work Sample Image ("عکس نمونه‌کار *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    عکس نمونه‌کار <span className="text-red-500">*</span>
                  </label>
                  
                  {newDesign.image_url ? (
                    <div className="relative w-full aspect-square rounded-[16px] overflow-hidden border border-neutral-200 bg-neutral-50">
                      <img 
                        src={newDesign.image_url} 
                        alt="نمونه‌کار" 
                        className="w-full h-full object-cover" 
                      />
                      <button 
                        type="button"
                        className="absolute top-3 left-3 bg-white text-neutral-800 border border-neutral-100 rounded-full w-7 h-7 flex items-center justify-center hover:bg-neutral-50 cursor-pointer z-10"
                        onClick={() => setNewDesign(prev => ({ ...prev, image_url: '' }))}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full aspect-square border-2 border-dashed border-[#EC4899] bg-pink-50/5 hover:bg-pink-50/15 rounded-[16px] flex flex-col items-center justify-center cursor-pointer transition-all gap-1.5 relative">
                      <span className="text-[#EC4899] text-5xl font-light select-none">+</span>
                      {uploadingDesign && (
                        <span className="text-xs text-[#EC4899] font-bold animate-pulse">در حال آپلود...</span>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)} 
                      />
                    </label>
                  )}
                </div>

                {/* 2. Title ("عنوان *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    عنوان <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="مثال: ناخن آمبره قرمز رنگ" 
                    className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899]"
                    value={newDesign.title}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* 3. Price ("قیمت *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    قیمت <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="مثال: ۵۰۰,۰۰۰" 
                    className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={newDesign.min_price}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setNewDesign(prev => ({ 
                        ...prev, 
                        min_price: numericValue,
                        max_price: numericValue 
                      }));
                    }}
                  />
                </div>

                {/* 4. Duration ("مدت‌زمان *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    مدت‌زمان <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['۳۰ دقیقه', '۱ ساعت', '۱.۵ ساعت', '۲ ساعت', '۲.۵ ساعت', '۳ ساعت'].map((dur) => {
                      const isSelected = newDesign.duration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          className={`py-2.5 px-3 rounded-[16px] text-xs font-bold text-center border transition-all ${
                            isSelected 
                              ? 'bg-pink-100/40 border-[#EC4899] text-[#EC4899]' 
                              : 'bg-white border-neutral-200 text-neutral-600 hover:border-pink-200'
                          }`}
                          onClick={() => setNewDesign(prev => ({ ...prev, duration: dur }))}
                        >
                          {dur}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Color ("رنگ *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    رنگ <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {availableColors.map((color) => {
                      const isSelected = newDesign.tags.includes(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isSelected 
                              ? 'border-[#EC4899] text-[#EC4899] bg-pink-50/10' 
                              : 'border-neutral-200 text-neutral-600 bg-white'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setNewDesign(prev => ({ ...prev, tags: prev.tags.filter(t => t !== color) }));
                            } else {
                              setNewDesign(prev => ({ ...prev, tags: [...prev.tags, color] }));
                            }
                          }}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${getColorBulletClass(color)}`} />
                          {color}
                        </button>
                      );
                    })}
                    
                    {/* Color custom plus button */}
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-[#EC4899] text-white flex items-center justify-center font-bold text-sm hover:bg-[#DB2777] transition-all cursor-pointer shrink-0"
                      onClick={() => {
                        const customColor = prompt('نام رنگ جدید را وارد کنید:');
                        if (customColor && customColor.trim()) {
                          const trimmed = customColor.trim();
                          if (!availableColors.includes(trimmed)) {
                            setAvailableColors(prev => [...prev, trimmed]);
                          }
                          setNewDesign(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 6. Style ("استایل *") */}
                <div className="space-y-1.5">
                  <label className="text-neutral-900 text-xs font-bold flex items-center gap-1">
                    استایل <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {availableStyles.map((style) => {
                      const isSelected = newDesign.tags.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          className={`px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                            isSelected 
                              ? 'border-[#EC4899] text-[#EC4899] bg-pink-50/10' 
                              : 'border-neutral-200 text-neutral-500 bg-white'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setNewDesign(prev => ({ ...prev, tags: prev.tags.filter(t => t !== style) }));
                            } else {
                              setNewDesign(prev => ({ ...prev, tags: [...prev.tags, style] }));
                            }
                          }}
                        >
                          {style}
                        </button>
                      );
                    })}
                    
                    {/* Style custom plus button */}
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-[#EC4899] text-white flex items-center justify-center font-bold text-sm hover:bg-[#DB2777] transition-all cursor-pointer shrink-0"
                      onClick={() => {
                        const customStyle = prompt('نام استایل جدید را وارد کنید:');
                        if (customStyle && customStyle.trim()) {
                          const trimmed = customStyle.trim();
                          if (!availableStyles.includes(trimmed)) {
                            setAvailableStyles(prev => [...prev, trimmed]);
                          }
                          setNewDesign(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
                        }
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {error && (
                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-[16px] text-xs font-semibold text-right border border-red-100 shrink-0">
                  ⚠️ {error}
                </div>
              )}

              {/* Action Buttons (Strictly flat, 16px rounded) */}
              <div className="flex gap-3 pt-3 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-1/2 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-[16px] text-center transition-all"
                  onClick={() => setShowAddModal(false)}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  className={`w-1/2 py-3.5 text-xs font-bold rounded-[16px] text-center transition-all ${
                    isDesignFormValid 
                      ? 'bg-[#EC4899] text-white hover:bg-[#DB2777]' 
                      : 'bg-pink-100 text-pink-300 cursor-not-allowed'
                  }`}
                  disabled={!isDesignFormValid}
                  onClick={handleAddWorkSample}
                >
                  افزودن نمونه‌کار
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
