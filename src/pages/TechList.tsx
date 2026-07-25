import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllNailTechs, getCurrentUserSession } from '../lib/db';
import type { NailTech } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import { AVATAR_PLACEHOLDER } from '../lib/avatar';
import {
  Search,
  MapPin,
  Instagram,
  Smartphone,
  Wifi,
  BatteryMedium,
  Store,
  CircleUserRound,
  SlidersHorizontal,
  Star,
  X,
  Check
} from 'lucide-react';

export default function TechList() {
  const navigate = useNavigate();
  const currentUser = getCurrentUserSession();
  const [techs, setTechs] = useState<NailTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('همه');
  const [showFilterPills, setShowFilterPills] = useState(false);

  // Booking Modal State
  const [bookingTech, setBookingTech] = useState<NailTech | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

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

    (async () => {
      try {
        const list = await getAllNailTechs();
        setTechs(list);
      } catch (err) {
        console.error('Error fetching techs:', err);
      } finally {
        setLoading(false);
      }
    })();

    return () => clearInterval(clockInterval);
  }, []);

  const cities = ['همه', ...Array.from(new Set(techs.map(t => t.city).filter(Boolean)))];

  const filteredTechs = techs.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.address && t.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.instagram && t.instagram.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCity = selectedCity === 'همه' || t.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  const handleSendInstagramMessage = () => {
    if (!bookingTech) return;

    // Default booking message
    const message = 'سلام، از طرف ویترینو پیام می‌دهم و قصد رزرو وقت دارم.';
    
    // Copy to clipboard
    navigator.clipboard.writeText(message);
    setCopiedNotice(true);

    const handle = bookingTech.instagram ? bookingTech.instagram.replace('@', '').trim() : '';
    const instagramUrl = handle ? `https://instagram.com/${handle}` : 'https://instagram.com';

    setTimeout(() => {
      window.open(instagramUrl, '_blank');
      setCopiedNotice(false);
      setBookingTech(null);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">
      
      <div className="phone-mockup-wrapper md:max-w-[500px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-neutral-50 flex flex-col relative overflow-hidden text-[#1F2937] font-sans">
        
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

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 bg-[#F8F9FA]">
          
          {/* Header Bar */}
          <div className="bg-white px-5 py-4 border-b border-neutral-100/80 shadow-2xs sticky top-0 z-20 space-y-3">
            {/* Header Title & Action Button (No back icon) */}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">لیست آرایشگران</h1>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => navigate(`/vitrin/${currentUser.slug}`)}
                  className="bg-pink-50 hover:bg-pink-100 text-[#DB2777] px-3.5 py-2 rounded-xl text-xs font-bold border border-pink-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CircleUserRound className="w-4 h-4" />
                  <span>پروفایل من</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="bg-[#DB2777] hover:bg-[#BE185D] text-white px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Store className="w-4 h-4" />
                  <span>ثبت سالن</span>
                </button>
              )}
            </div>

            {/* Search Input & Filter Button (Exact match for image) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilterPills(prev => !prev)}
                className={`w-11 h-11 bg-white border border-neutral-200/90 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all shadow-2xs ${
                  showFilterPills ? 'border-[#DB2777] text-[#DB2777] bg-pink-50/30' : 'text-neutral-500 hover:bg-neutral-50'
                }`}
                title="فیلترها"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>

              <div className="bg-white border border-neutral-200/90 rounded-xl px-3.5 py-2.5 flex items-center gap-2 focus-within:border-[#DB2777] transition-all flex-1 shadow-2xs">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="جستجو..."
                  className="w-full bg-transparent text-xs font-medium text-neutral-800 outline-none text-right placeholder:text-neutral-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* City Filter Pills (Collapsible / Toggleable) */}
            {showFilterPills && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1 touch-pan-x scroll-smooth w-full">
                {cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setSelectedCity(city)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCity === city
                        ? 'bg-[#DB2777] text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of Salons / Techs (Exact design matching Image 1) */}
          <div className="p-4 space-y-3.5">
            {loading ? (
              <div className="text-center py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[24px] border border-neutral-200/80">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce" />
                </div>
                <span className="text-xs text-neutral-400 font-bold">در حال بارگذاری لیست آرایشگران...</span>
              </div>
            ) : filteredTechs.length === 0 ? (
              <div className="bg-white rounded-[24px] p-8 border border-neutral-200/80 text-center flex flex-col items-center gap-3">
                <h3 className="text-xs font-bold text-neutral-700">آرایشگری یافت نشد</h3>
                <p className="text-[11px] text-neutral-400 font-normal">با فیلترهای جستجو موردی پیدا نشد.</p>
              </div>
            ) : (
              filteredTechs.map((tech) => {
                return (
                  <div
                    key={tech.id}
                    className="bg-white border border-neutral-200/80 rounded-[28px] p-4 sm:p-5 shadow-2xs flex flex-col gap-4 font-sans"
                  >
                    {/* Top Row: Avatar + Title & Location on Right, Rating on Left */}
                    <div className="flex items-start justify-between">
                      {/* Right: Profile image + Title & Location */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-full bg-neutral-100 shrink-0 overflow-hidden border border-neutral-100 flex items-center justify-center">
                          <img
                            src={tech.avatar_url || AVATAR_PLACEHOLDER}
                            alt={tech.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = AVATAR_PLACEHOLDER;
                            }}
                          />
                        </div>

                        <div className="min-w-0 text-right space-y-1">
                          <h3 className="text-sm font-bold text-neutral-800 truncate">
                            {tech.name}
                          </h3>
                          
                          <div className="flex items-center gap-1 text-xs text-neutral-500 font-normal">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="truncate">آدرس: {tech.address || `${tech.city || 'تهران'}`}</span>
                          </div>
                        </div>
                      </div>

                      {/* Left: Rating */}
                      <div className="flex items-center gap-1 text-xs text-neutral-500 font-normal shrink-0 pt-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        <span>امتیاز: ۴.۵ از ۵</span>
                      </div>
                    </div>

                    {/* Bottom Row Buttons: Reserve Time & View Profile */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setBookingTech(tech)}
                        className="flex-1 py-3 px-4 bg-[#DB2777] hover:bg-[#BE185D] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-2xs text-center"
                      >
                        رزرو وقت
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/vitrin/${tech.slug}`)}
                        className="flex-1 py-3 px-4 bg-white border border-[#DB2777] text-[#DB2777] hover:bg-pink-50/50 text-xs font-bold rounded-full transition-all cursor-pointer text-center"
                      >
                        مشاهده ویترین
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* ============================================
            RESERVE TIME POPUP MODAL (Exact match for Image 2)
            ============================================ */}
        {bookingTech && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans" dir="rtl">
            <div className="bg-white rounded-[32px] p-6 sm:p-7 w-full max-w-xs text-center relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Top Left Close Button */}
              <button
                type="button"
                onClick={() => setBookingTech(null)}
                className="w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-[#DB2777] flex items-center justify-center absolute top-4 left-4 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Center Graphic: Concentric Pink Circle with Instagram Icon & Rays */}
              <div className="pt-2 flex justify-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Outer Ring with 8 Pink Rays/Dots */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center">
                    <svg className="w-full h-full text-[#DB2777]" viewBox="0 0 100 100">
                      <circle cx="50" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="79.7" cy="20.3" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="92" cy="50" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="79.7" cy="79.7" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="50" cy="92" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="20.3" cy="79.7" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="8" cy="50" r="2.5" fill="currentColor" opacity="0.8" />
                      <circle cx="20.3" cy="20.3" r="2.5" fill="currentColor" opacity="0.8" />
                    </svg>
                  </div>

                  {/* Inner Double Circle with Pink Ring */}
                  <div className="w-20 h-20 rounded-full border-2 border-pink-200 bg-pink-50/60 p-2 flex items-center justify-center shadow-2xs">
                    {/* Center Pink Badge with White Instagram Logo */}
                    <div className="w-12 h-12 rounded-[16px] bg-[#DB2777] text-white flex items-center justify-center shadow-xs">
                      <Instagram className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Title & Subtitle */}
              <div className="space-y-1.5 px-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  ارسال پیام به ناخن‌کار!
                </h3>
                <p className="text-xs text-neutral-400 font-normal leading-relaxed max-w-[240px] mx-auto">
                  برای رزرو طرح مورد نظر به پیج اینستاگرام ناخن‌کار پیام دهید.
                </p>
              </div>

              {copiedNotice && (
                <div className="bg-emerald-50 text-emerald-600 text-xs font-bold py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 animate-bounce">
                  <Check className="w-4 h-4" />
                  <span>پیام کپی شد! در حال انتقال...</span>
                </div>
              )}

              {/* Bottom Actions: "ارسال پیام" and "انصراف" */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSendInstagramMessage}
                  className="flex-1 py-3.5 px-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.98] text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-2xs text-center"
                >
                  ارسال پیام
                </button>

                <button
                  type="button"
                  onClick={() => setBookingTech(null)}
                  className="flex-1 py-3.5 px-4 bg-white border border-[#DB2777] text-[#DB2777] hover:bg-pink-50/50 active:scale-[0.98] text-xs font-bold rounded-full transition-all cursor-pointer text-center"
                >
                  انصراف
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}

