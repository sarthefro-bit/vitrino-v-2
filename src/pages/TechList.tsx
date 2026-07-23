import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllNailTechs, getDesigns, getCurrentUserSession } from '../lib/db';
import type { NailTech, Design } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import {
  Search,
  MapPin,
  Instagram,
  ChevronLeft,
  Sparkles,
  PlusCircle,
  Smartphone,
  Wifi,
  BatteryMedium,
  Store,
  CircleUserRound
} from 'lucide-react';

export default function TechList() {
  const navigate = useNavigate();
  const currentUser = getCurrentUserSession();
  const [techs, setTechs] = useState<NailTech[]>([]);
  const [techDesigns, setTechDesigns] = useState<Record<string, Design[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('همه');

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

        // Fetch sample work designs for each tech to display preview thumbnails
        const map: Record<string, Design[]> = {};
        for (const tech of list) {
          const designs = await getDesigns(tech.id);
          map[tech.id] = designs;
        }
        setTechDesigns(map);
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
      t.instagram?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = selectedCity === 'همه' || t.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">
      
      <div className="phone-mockup-wrapper md:max-w-[750px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">
        
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
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-[#F5F5F7]">
          
          {/* Header Bar */}
          <div className="bg-white px-5 py-4 border-b border-neutral-100 shadow-xs sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-base font-extrabold text-neutral-900 tracking-tight">لیست ناخن‌کاران برتر</h1>
                <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">مشاهده نمونه‌کارها و رزرو مستقیم نوبت</p>
              </div>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => navigate(`/vitrin/${currentUser.slug}`)}
                  className="bg-pink-50 hover:bg-pink-100 text-[#EC4899] px-3.5 py-2 rounded-xl text-xs font-bold border border-pink-100/50 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CircleUserRound className="w-4 h-4" />
                  <span>پروفایل من</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/auth')}
                  className="bg-[#EC4899] hover:bg-[#DB2777] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Store className="w-4 h-4" />
                  <span>ثبت سالن</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2 focus-within:border-[#EC4899] transition-all">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="جستجوی نام ناخن‌کار، شهر یا آیدی..."
                className="w-full bg-transparent text-xs font-semibold text-neutral-800 outline-none text-right placeholder:text-neutral-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3">
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCity === city
                      ? 'bg-[#EC4899] text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* List of Nail Techs */}
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-center py-16 flex flex-col items-center gap-2">
                <span className="loading loading-spinner text-[#EC4899]" />
                <span className="text-xs text-neutral-400 font-bold">در حال بارگذاری لیست ناخن‌کاران...</span>
              </div>
            ) : filteredTechs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-neutral-200 text-center flex flex-col items-center gap-3">
                <Sparkles className="w-8 h-8 text-neutral-300" />
                <h3 className="text-xs font-bold text-neutral-700">ناخن‌کاری یافت نشد</h3>
                <p className="text-[11px] text-neutral-400 font-medium">با فیلترهای جستجو موردی پیدا نشد.</p>
              </div>
            ) : (
              filteredTechs.map((tech) => {
                const designs = techDesigns[tech.id] || [];

                return (
                  <div
                    key={tech.id}
                    className="bg-white border border-neutral-100 rounded-[24px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer flex flex-col gap-3.5 group"
                    onClick={() => navigate(`/vitrin/${tech.slug}`)}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#FFF0F6] to-[#EC4899]/30 shrink-0">
                          <img
                            src={tech.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop'}
                            alt={tech.name}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop';
                            }}
                          />
                        </div>

                        <div className="min-w-0 text-right">
                          <h3 className="text-xs font-extrabold text-neutral-900 group-hover:text-[#EC4899] transition-colors truncate">
                            {tech.name}
                          </h3>
                          
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400 font-bold">
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-[#EC4899]" fill="currentColor" />
                              {tech.city}
                            </span>
                            
                            {tech.instagram && (
                              <span className="flex items-center gap-0.5 text-neutral-500 font-mono">
                                <Instagram className="w-3 h-3 text-[#EC4899]" />
                                @{tech.instagram.replace('@', '')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-[#EC4899] bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-full border border-pink-100/40 shrink-0">
                        <span>مشاهده ویترین</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Tiny Preview Thumbnails of Work Samples (Grid of 3-4 photos) */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {designs.slice(0, 4).map((item, idx) => (
                        <div key={item.id || idx} className="aspect-square rounded-[14px] overflow-hidden bg-neutral-100 border border-neutral-100 relative">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop';
                            }}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                            {item.duration ? `${item.duration / 60}h` : '۲h'}
                          </div>
                        </div>
                      ))}

                      {/* Fill empty placeholders if less than 4 items */}
                      {Array.from({ length: Math.max(0, 4 - designs.length) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="aspect-square rounded-[14px] bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center text-neutral-300">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="absolute md:sticky bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-neutral-100 z-20 shrink-0 flex items-center justify-between">
          {currentUser ? (
            <button
              type="button"
              className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[16px] text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              onClick={() => navigate(`/vitrin/${currentUser.slug}`)}
            >
              <CircleUserRound className="w-4 h-4" />
              <span>مشاهده ویترین من</span>
            </button>
          ) : (
            <button
              type="button"
              className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[16px] text-center transition-all cursor-pointer flex items-center justify-center gap-2"
              onClick={() => navigate('/auth')}
            >
              <PlusCircle className="w-4 h-4" />
              <span>ثبت سالن و ساخت ویترین</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
