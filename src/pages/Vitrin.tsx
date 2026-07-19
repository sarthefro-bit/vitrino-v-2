import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getNailTechBySlug, getDesigns } from '../lib/db';
import type { NailTech, Design } from '../lib/db';
import { 
  Instagram, 
  MapPin, 
  Phone, 
  ChevronRight, 
  Settings, 
  MessageCircle, 
  Copy, 
  Check, 
  X, 
  Calendar,
  Sparkles,
  Search,
  ArrowUpDown
} from 'lucide-react';

const FILTER_COLORS = [
  'بنفش',
  'سبز',
  'آبی',
  'صورتی',
  'قرمز',
  'نود',
  'سفید',
  'مشکی'
];

function getColorDotClass(colorName: string): string {
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

export default function Vitrin() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [tech, setTech] = useState<NailTech | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  // Interaction & Filter Drawer Overlays
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [showBookingDrawer, setShowBookingDrawer] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Filter Drawer States
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showSortDrawer, setShowSortDrawer] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  const [showPriceDrawer, setShowPriceDrawer] = useState(false);
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');

  const [showColorDrawer, setShowColorDrawer] = useState(false);
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [colorSearchQuery, setColorSearchQuery] = useState('');

  // Instagram direct reservation states
  const [instagramBookingDesign, setInstagramBookingDesign] = useState<Design | null>(null);
  const [copiedInstagramMessage, setCopiedInstagramMessage] = useState(false);

  useEffect(() => {
    // Fetch Nail Tech profile & Designs
    (async () => {
      try {
        const profile = await getNailTechBySlug(slug || 'profile');
        if (profile) {
          setTech(profile);
          const designsList = await getDesigns(profile.id);
          setDesigns(designsList);
        }
      } catch (err) {
        console.error('Error fetching vitrin data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Collect all non-color tags for general category selector
  const allTags = Array.from(new Set(designs.flatMap((d) => d.tags))).filter(
    (tag) => !FILTER_COLORS.includes(tag)
  );

  const handleCopyPhone = () => {
    if (tech?.mobile) {
      navigator.clipboard.writeText(tech.mobile);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const formatPricePersian = (priceNum: number) => {
    if (!priceNum) return 'توافقی';
    return `${priceNum.toLocaleString('fa-IR')} تومان`;
  };

  const formatDurationPersian = (durationMins: number) => {
    if (!durationMins) return '۱ ساعت';
    if (durationMins === 30) return '۳۰ دقیقه';
    if (durationMins === 60) return '۱ ساعت';
    if (durationMins === 90) return '۱.۵ ساعت';
    if (durationMins === 120) return '۲ ساعت';
    if (durationMins === 150) return '۲.۵ ساعت';
    if (durationMins === 180) return '۳ ساعت';
    return `${(durationMins / 60).toLocaleString('fa-IR')} ساعت`;
  };

  // Filter & Sort Logic
  let filteredDesigns = [...designs];

  // 1. Tag category filter
  if (activeTag) {
    filteredDesigns = filteredDesigns.filter((d) => d.tags.includes(activeTag));
  }

  // 2. Search query filter
  if (searchQuery.trim()) {
    filteredDesigns = filteredDesigns.filter((d) => 
      d.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }

  // 3. Price range filter
  if (minPriceFilter) {
    const minNum = parseInt(minPriceFilter) || 0;
    filteredDesigns = filteredDesigns.filter((d) => d.price >= minNum);
  }
  if (maxPriceFilter) {
    const maxNum = parseInt(maxPriceFilter) || Number.MAX_SAFE_INTEGER;
    filteredDesigns = filteredDesigns.filter((d) => d.price <= maxNum);
  }

  // 4. Color filter
  if (selectedColorFilter) {
    filteredDesigns = filteredDesigns.filter((d) => d.tags.includes(selectedColorFilter));
  }

  // 5. Sort application
  if (sortOrder === 'asc') {
    filteredDesigns.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'desc') {
    filteredDesigns.sort((a, b) => b.price - a.price);
  }

  const filteredColorsForSearch = FILTER_COLORS.filter(col => 
    col.includes(colorSearchQuery.trim())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 sm:p-6" dir="rtl">
        <div className="phone-mockup-wrapper bg-white flex flex-col items-center justify-center relative">
          <span className="loading loading-spinner loading-lg text-[#EC4899]" />
          <span className="text-xs text-neutral-400 mt-3 font-bold">در حال بارگذاری ویترین...</span>
        </div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 sm:p-6" dir="rtl">
        <div className="phone-mockup-wrapper bg-neutral-50 flex flex-col justify-between p-6 relative text-center">
          <div className="pt-8 shrink-0">
            <h1 className="text-3xl font-extrabold tracking-widest text-[#EC4899]">BEAUTY</h1>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-[#EC4899] mb-2 border border-pink-100/40">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-neutral-800">ویترین یافت نشد</h2>
            <p className="text-xs text-neutral-400 font-medium px-4">
              هنوز اطلاعاتی برای این آدرس ثبت نشده است. همین حالا اولین ویترین خود را بسازید!
            </p>
          </div>

          <button 
            className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white rounded-[16px] text-sm font-bold transition-all shrink-0 cursor-pointer"
            onClick={() => navigate('/setup')}
          >
            🚀 ایجاد ویترین جدید
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-0 sm:p-6" dir="rtl">
      
      <div className="phone-mockup-wrapper bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">

        {/* ============================================
            HEADER CONTROLS
            ============================================ */}
        <div className="bg-white px-4 py-3.5 flex justify-between items-center border-b border-neutral-100 shrink-0 z-10">
          <button 
            type="button" 
            className="flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-[#EC4899] transition-all bg-neutral-50 hover:bg-pink-50 py-2 px-3.5 rounded-full border border-neutral-200"
            onClick={() => navigate('/setup')}
          >
            <ChevronRight className="w-4 h-4" />
            ویرایش
          </button>
          
          <h2 className="text-sm font-extrabold tracking-wider text-[#EC4899] select-none">VITRIN</h2>

          <button 
            type="button" 
            className="p-2.5 text-neutral-500 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-full border border-neutral-200 transition-all cursor-pointer"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================
            MAIN CONTENT SCROLLER
            ============================================ */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          
          {/* Profile Header Block */}
          <div className="bg-white p-5 text-center flex flex-col items-center border-b border-neutral-100">
            
            {/* Avatar image with pink thin ring */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full border border-[#EC4899] p-0.5 bg-white">
                <img 
                  src={tech.avatar_url || 'https://placehold.co/120?text=نام'} 
                  alt={tech.name} 
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/120?text=نام';
                  }}
                />
              </div>
              <span className="absolute bottom-0 right-0 bg-[#EC4899] text-white p-1 rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                ✓
              </span>
            </div>

            {/* Salon Name */}
            <h1 className="text-lg font-extrabold text-neutral-900 tracking-tight">{tech.name}</h1>
            
            {/* Sub-profile 3 Horizontal Pills */}
            <div className="flex flex-wrap justify-center gap-2 mt-4.5 w-full">
              {/* 1. Location */}
              <div className="bg-pink-50 text-[#EC4899] border border-pink-100/40 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 {tech.city}</span>
              </div>

              {/* 2. Instagram link */}
              {tech.instagram && (
                <a 
                  href={`https://instagram.com/${tech.instagram.replace('@', '').replace('instagram.com/', '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-pink-50 text-[#EC4899] border border-pink-100/40 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span>پیج اینستاگرام</span>
                </a>
              )}

              {/* 3. Contact Phone */}
              <button 
                type="button"
                className="bg-pink-50 text-[#EC4899] border border-pink-100/40 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                onClick={() => setShowBookingDrawer(true)}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>تماس</span>
              </button>
            </div>
          </div>

          {/* "نمونه کارها" Header title */}
          <div className="px-5 pt-5 pb-2 flex justify-between items-center bg-neutral-50">
            <span className="text-sm font-extrabold text-neutral-900">نمونه کارها</span>
            <span className="text-[10px] text-neutral-400 font-bold">تعداد: {filteredDesigns.length}</span>
          </div>

          {/* Horizontal category scroll row */}
          <div className="bg-neutral-50 py-2 select-none">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 py-1">
              <button
                type="button"
                className={`px-4.5 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                  activeTag === null 
                    ? 'bg-[#EC4899] border-[#EC4899] text-white' 
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-pink-300'
                }`}
                onClick={() => setActiveTag(null)}
              >
                همه
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`px-4.5 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                    activeTag === tag 
                      ? 'bg-[#EC4899] border-[#EC4899] text-white' 
                      : 'bg-white border-neutral-200 text-neutral-600 hover:border-pink-300'
                  }`}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Filters Row */}
          <div className="bg-neutral-50 px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-neutral-100 select-none">
            {/* Search Icon Trigger */}
            <button
              type="button"
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                showSearchInput || searchQuery 
                  ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                  : 'border-neutral-200 bg-white text-neutral-500 hover:border-pink-200'
              }`}
              onClick={() => setShowSearchInput(!showSearchInput)}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Sort Icon Trigger */}
            <button
              type="button"
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                sortOrder !== null 
                  ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                  : 'border-neutral-200 bg-white text-neutral-500 hover:border-pink-200'
              }`}
              onClick={() => setShowSortDrawer(true)}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            {/* Price Range Capsule Filter Trigger */}
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                minPriceFilter || maxPriceFilter 
                  ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-pink-200'
              }`}
              onClick={() => setShowPriceDrawer(true)}
            >
              <span>بازه قیمت</span>
              {(minPriceFilter || maxPriceFilter) && <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />}
            </button>

            {/* Color Capsule Filter Trigger */}
            <button
              type="button"
              className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                selectedColorFilter !== null 
                  ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-pink-200'
              }`}
              onClick={() => setShowColorDrawer(true)}
            >
              <span>رنگ</span>
              {selectedColorFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" />}
            </button>
          </div>

          {/* Inline search bar if search toggle is on */}
          {showSearchInput && (
            <div className="bg-neutral-50 px-5 py-2">
              <div className="bg-white border border-neutral-200 rounded-[16px] px-3.5 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="جستجو در نمونه‌کارها..."
                  className="w-full bg-transparent text-xs font-semibold text-neutral-800 outline-none text-right"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-neutral-100 rounded-full"
                  >
                    <X className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Grid list of work samples (2 Columns) */}
          <div className="mt-4 px-5 bg-neutral-50">
            {filteredDesigns.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-[16px] border border-neutral-200 p-6 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-neutral-300" />
                <h3 className="text-xs font-bold text-neutral-500">طرحی یافت نشد</h3>
                <p className="text-[10px] text-neutral-400 font-medium">با فیلترهای انتخاب شده نمونه‌کاری وجود ندارد.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredDesigns.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white rounded-[16px] border border-neutral-200 overflow-hidden flex flex-col cursor-pointer transition-all hover:border-pink-300"
                    onClick={() => setSelectedDesign(item)}
                  >
                    {/* Square Image Block */}
                    <div className="aspect-square bg-neutral-100 overflow-hidden relative">
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/200?text=طرح+ناخن';
                        }}
                      />
                      
                      {/* White border circular pink plus at bottom-left */}
                      <button
                        type="button"
                        className="absolute bottom-2.5 left-2.5 w-7 h-7 rounded-full bg-[#EC4899] border-2 border-white flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstagramBookingDesign(item);
                        }}
                      >
                        +
                      </button>

                      {/* Translucent duration pill at bottom-right */}
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white rounded-full px-2.5 py-1 text-[9px] font-bold">
                        {formatDurationPersian(item.duration)}
                      </div>
                    </div>

                    {/* Meta info below image */}
                    <div className="p-3 flex flex-col gap-1 text-right flex-1 justify-between">
                      <h3 className="text-xs font-bold text-neutral-800 line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="text-xs font-extrabold text-[#EC4899] mt-1">
                        {formatPricePersian(item.price)}
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Booking Action Floating Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100 z-20 shrink-0">
          <button
            type="button"
            className="w-full py-4 bg-[#EC4899] hover:bg-[#DB2777] text-white text-sm font-bold rounded-[16px] text-center transition-all cursor-pointer flex items-center justify-center gap-2"
            onClick={() => {
              if (designs.length > 0) {
                setInstagramBookingDesign(designs[0]);
              } else {
                setInstagramBookingDesign({
                  id: 'general',
                  tech_id: tech?.id || '',
                  title: 'خدمات تخصصی ناخن',
                  price: 0,
                  duration: 90,
                  image_url: '',
                  tags: [],
                  created_at: '',
                  updated_at: ''
                });
              }
            }}
          >
            <Calendar className="w-4 h-4" />
            رزرو وقت
          </button>
        </div>

        {/* ============================================
            WORK SAMPLE DETAIL BOTTOM SHEET
            ============================================ */}
        {selectedDesign && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            
            <div className="bg-white rounded-t-[24px] max-h-[85%] overflow-y-auto no-scrollbar p-6 flex flex-col gap-4 relative">
              
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto shrink-0 mb-1" />

              {/* Header */}
              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-neutral-900">جزئیات نمونه‌کار</h3>
                <button 
                  type="button" 
                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-full transition-all"
                  onClick={() => setSelectedDesign(null)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image */}
              <div className="aspect-square rounded-[16px] overflow-hidden border border-neutral-200 relative bg-neutral-50 shrink-0">
                <img 
                  src={selectedDesign.image_url} 
                  alt={selectedDesign.title} 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Info text */}
              <div className="space-y-3 flex-1">
                <div>
                  <h4 className="text-sm font-extrabold text-neutral-900 text-right">{selectedDesign.title}</h4>
                  
                  {selectedDesign.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
                      {selectedDesign.tags.map((tag) => (
                        <span key={tag} className="bg-pink-50 text-[#EC4899] px-2.5 py-1 rounded-full text-[10px] font-semibold border border-pink-100/30">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-neutral-50 rounded-[16px] p-4 space-y-2.5 border border-neutral-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-bold">قیمت خدمات</span>
                    <span className="font-extrabold text-[#EC4899]">{formatPricePersian(selectedDesign.price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2.5 border-t border-neutral-200">
                    <span className="text-neutral-400 font-bold">مدت زمان تقریبی کار</span>
                    <span className="font-extrabold text-neutral-700">⏱️ {formatDurationPersian(selectedDesign.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Booking Trigger */}
              <div className="flex gap-3 pt-2 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-[16px] text-center transition-all cursor-pointer"
                  onClick={() => {
                    setInstagramBookingDesign(selectedDesign);
                    setSelectedDesign(null);
                  }}
                >
                  انتخاب و رزرو این نمونه‌کار
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ============================================
            CONTACT & BOOKING MAIN DRAWER
            ============================================ */}
        {showBookingDrawer && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            
            <div className="bg-white rounded-t-[24px] p-6 flex flex-col gap-4 relative animate-slide-up">
              
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto shrink-0 mb-1" />

              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-neutral-900">نوبت‌دهی و ارتباط با سالن</h3>
                <button 
                  type="button" 
                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-full transition-all"
                  onClick={() => setShowBookingDrawer(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center py-2 shrink-0">
                <h4 className="text-sm font-extrabold text-neutral-850">{tech.name}</h4>
                <p className="text-[11px] text-neutral-400 font-bold mt-1">📍 فعال در شهر {tech.city}</p>
              </div>

              {/* Options Grid */}
              <div className="space-y-3 flex-1 pb-4">
                
                {/* Direct Call */}
                <a 
                  href={`tel:${tech.mobile}`} 
                  className="w-full bg-neutral-50 hover:bg-pink-50/30 p-4 rounded-[16px] border border-neutral-200 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-pink-50 text-[#EC4899] border border-pink-100/30 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-800">تماس تلفنی مستقیم</p>
                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5 font-mono">{tech.mobile}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 rotate-180" />
                </a>

                {/* WhatsApp Message */}
                <a 
                  href={`https://wa.me/${tech.mobile?.replace(/^0/, '98')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full bg-neutral-50 hover:bg-pink-50/30 p-4 rounded-[16px] border border-neutral-200 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 border border-green-100/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-800">ارسال پیام در واتس‌اپ</p>
                      <p className="text-[10px] text-neutral-400 font-bold mt-0.5">پشتیبانی و مشاوره آنلاین</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 rotate-180" />
                </a>

                {/* Instagram Direct */}
                {tech.instagram && (
                  <a 
                    href={`https://instagram.com/${tech.instagram.replace('@', '').replace('instagram.com/', '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-neutral-50 hover:bg-pink-50/30 p-4 rounded-[16px] border border-neutral-200 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-pink-50 text-[#EC4899] border border-pink-100/30 flex items-center justify-center shrink-0">
                        <Instagram className="w-4 h-4" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-800">اینستاگرام دایرکت</p>
                        <p className="text-[10px] text-neutral-400 font-bold mt-0.5">مشاهده استوری‌ها و ارسال پیام</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 rotate-180" />
                  </a>
                )}

                {/* Copy Number */}
                <button
                  type="button"
                  className="w-full py-3.5 border border-dashed border-neutral-200 hover:border-[#EC4899] rounded-[16px] text-xs font-bold text-neutral-600 hover:text-[#EC4899] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  onClick={handleCopyPhone}
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span>شماره تماس کپی شد!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>کپی شماره تلفن سالن</span>
                    </>
                  )}
                </button>

              </div>

              {/* Close footer */}
              <div className="pt-2 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-full py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-[16px] text-center transition-all cursor-pointer"
                  onClick={() => setShowBookingDrawer(false)}
                >
                  بستن
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ============================================
            SORT DRAWER BOTTOM SHEET
            ============================================ */}
        {showSortDrawer && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[24px] p-6 flex flex-col gap-4 relative animate-slide-up">
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto shrink-0 mb-1" />
              
              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-neutral-900">مرتب‌سازی براساس</h3>
                <button 
                  type="button" 
                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-full transition-all"
                  onClick={() => setShowSortDrawer(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 py-2">
                <button
                  type="button"
                  className={`w-full py-3.5 px-4 rounded-[16px] border text-xs font-bold text-right transition-all flex items-center justify-between ${
                    sortOrder === 'desc' 
                      ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                      : 'border-neutral-200 bg-white text-neutral-700'
                  }`}
                  onClick={() => {
                    setSortOrder('desc');
                    setShowSortDrawer(false);
                  }}
                >
                  <span>گران‌ترین به ارزان‌ترین</span>
                  {sortOrder === 'desc' && <Check className="w-4 h-4 text-[#EC4899]" />}
                </button>

                <button
                  type="button"
                  className={`w-full py-3.5 px-4 rounded-[16px] border text-xs font-bold text-right transition-all flex items-center justify-between ${
                    sortOrder === 'asc' 
                      ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                      : 'border-neutral-200 bg-white text-neutral-700'
                  }`}
                  onClick={() => {
                    setSortOrder('asc');
                    setShowSortDrawer(false);
                  }}
                >
                  <span>ارزان‌ترین به گران‌ترین</span>
                  {sortOrder === 'asc' && <Check className="w-4 h-4 text-[#EC4899]" />}
                </button>
              </div>

              <div className="flex gap-3 pt-2 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-full py-3.5 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-[16px] text-center"
                  onClick={() => {
                    setSortOrder(null);
                    setShowSortDrawer(false);
                  }}
                >
                  حذف مرتب‌سازی
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            PRICE FILTER DRAWER BOTTOM SHEET
            ============================================ */}
        {showPriceDrawer && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[24px] p-6 flex flex-col gap-4 relative animate-slide-up">
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto shrink-0 mb-1" />
              
              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-neutral-900">فیلتر بازه قیمت</h3>
                <button 
                  type="button" 
                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-full transition-all"
                  onClick={() => setShowPriceDrawer(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="space-y-1.5">
                  <label className="text-neutral-700 text-xs font-bold text-right block">از (تومان)</label>
                  <input
                    type="text"
                    placeholder="مثال: ۲۰۰,۰۰۰"
                    className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={minPriceFilter}
                    onChange={(e) => setMinPriceFilter(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-neutral-700 text-xs font-bold text-right block">تا (تومان)</label>
                  <input
                    type="text"
                    placeholder="مثال: ۱,۵۰۰,۰۰۰"
                    className="w-full px-4 py-3.5 bg-white border border-neutral-200 rounded-[16px] text-xs font-semibold focus:outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              {(minPriceFilter || maxPriceFilter) && (
                <div className="bg-pink-50/50 text-[#EC4899] py-2 px-4 rounded-[12px] text-[11px] font-bold text-center border border-pink-100/20">
                  پیش‌نمایش فیلتر: از {parseInt(minPriceFilter || '0').toLocaleString('fa-IR')} تا {parseInt(maxPriceFilter || '9999999').toLocaleString('fa-IR')} تومان
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-1/2 py-3.5 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-[16px] text-center"
                  onClick={() => {
                    setMinPriceFilter('');
                    setMaxPriceFilter('');
                    setShowPriceDrawer(false);
                  }}
                >
                  حذف فیلتر
                </button>
                <button
                  type="button"
                  className="w-1/2 py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-[16px] text-center"
                  onClick={() => setShowPriceDrawer(false)}
                >
                  اعمال فیلتر
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            COLOR FILTER DRAWER BOTTOM SHEET
            ============================================ */}
        {showColorDrawer && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[24px] p-6 flex flex-col gap-4 relative animate-slide-up max-h-[80%] overflow-y-auto no-scrollbar">
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto shrink-0 mb-1" />
              
              <div className="flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-neutral-900">انتخاب رنگ</h3>
                <button 
                  type="button" 
                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded-full transition-all"
                  onClick={() => setShowColorDrawer(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search color input */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-[16px] px-3.5 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  placeholder="جستجو رنگ..."
                  className="w-full bg-transparent text-xs font-bold text-neutral-800 outline-none text-right"
                  value={colorSearchQuery}
                  onChange={(e) => setColorSearchQuery(e.target.value)}
                />
              </div>

              {/* Color list options */}
              <div className="space-y-2 py-2 overflow-y-auto max-h-[220px] no-scrollbar">
                {filteredColorsForSearch.map((color) => {
                  const isActive = selectedColorFilter === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      className={`w-full py-3.5 px-4 rounded-[16px] border text-xs font-bold text-right transition-all flex items-center justify-between ${
                        isActive 
                          ? 'border-[#EC4899] bg-pink-50 text-[#EC4899]' 
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-pink-200'
                      }`}
                      onClick={() => {
                        setSelectedColorFilter(color);
                        setShowColorDrawer(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-full ${getColorDotClass(color)}`} />
                        <span>{color}</span>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-[#EC4899]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="w-full py-3.5 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-[16px] text-center"
                  onClick={() => {
                    setSelectedColorFilter(null);
                    setShowColorDrawer(false);
                  }}
                >
                  حذف فیلتر رنگ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            INSTAGRAM RESERVATION POPUP MODAL
            ============================================ */}
        {instagramBookingDesign && tech && (
          <div className="absolute inset-0 bg-black/60 z-55 flex items-center justify-center p-5">
            <div className="bg-white rounded-[24px] w-full max-w-[325px] p-5.5 flex flex-col gap-4.5 relative animate-scale-up text-right border border-neutral-100">
              
              {/* Header illustration */}
              <div className="flex flex-col items-center text-center mt-1">
                <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center text-[#EC4899] mb-3 border border-pink-100/40 shrink-0">
                  <Instagram className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-extrabold text-neutral-850">ارسال پیام به ناخن‌کار!</h3>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed px-1 font-semibold">
                  برای رزرو طرح مورد نظر به پیج اینستاگرام ناخن‌کار پیام دهید.
                </p>
              </div>

              {/* Design Thumbnail Card (if exists) */}
              {instagramBookingDesign.image_url && (
                <div className="bg-neutral-50 rounded-[16px] p-3 flex gap-3 items-center border border-neutral-200">
                  <img 
                    src={instagramBookingDesign.image_url} 
                    alt={instagramBookingDesign.title} 
                    className="w-13 h-13 rounded-[12px] object-cover shrink-0 border border-neutral-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=طرح';
                    }}
                  />
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className="text-xs font-bold text-neutral-800 truncate">{instagramBookingDesign.title}</h4>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">⏱️ {formatDurationPersian(instagramBookingDesign.duration)}</p>
                    {instagramBookingDesign.price > 0 && (
                      <p className="text-xs font-extrabold text-[#EC4899] mt-1">{formatPricePersian(instagramBookingDesign.price)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Template Message Box */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-neutral-400">متن آماده برای ارسال (جهت کپی):</p>
                <div className="bg-pink-50/30 rounded-[16px] p-3 text-xs text-neutral-800 border border-pink-100/30 leading-relaxed font-bold text-center text-right select-all">
                  {instagramBookingDesign.id === 'general' 
                    ? `سلام، می‌خوام برای خدمات کاشت و طراحی ناخن نوبت بگیرم`
                    : `سلام، برای طرح [${instagramBookingDesign.title}]${instagramBookingDesign.price > 0 ? ` با قیمت [${formatPricePersian(instagramBookingDesign.price)}]` : ''} می‌خوام نوبت بگیرم`
                  }
                </div>
                <p className="text-center text-[9px] text-neutral-400 font-bold mt-1">
                  ✓ با کلیک روی «ارسال پیام» این متن خودکار کپی می‌شود.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="flex-1 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-[16px] text-center transition-all cursor-pointer"
                  onClick={() => setInstagramBookingDesign(null)}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  className="flex-1 py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-[16px] text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  onClick={() => {
                    const isGeneral = instagramBookingDesign.id === 'general';
                    const priceStr = instagramBookingDesign.price ? formatPricePersian(instagramBookingDesign.price) : '';
                    const messageText = isGeneral 
                      ? `سلام، می‌خوام برای خدمات کاشت و طراحی ناخن نوبت بگیرم`
                      : `سلام، برای طرح [${instagramBookingDesign.title}]${priceStr ? ` با قیمت [${priceStr}]` : ''} می‌خوام نوبت بگیرم`;
                      
                    navigator.clipboard.writeText(messageText).then(() => {
                      setCopiedInstagramMessage(true);
                      
                      // Auto redirect to profile after 1.2s delay
                      setTimeout(() => {
                        setCopiedInstagramMessage(false);
                        const username = tech.instagram?.replace('@', '').replace('instagram.com/', '') || '';
                        const igUrl = `https://instagram.com/${username}`;
                        window.open(igUrl, '_blank', 'noopener,noreferrer');
                        setInstagramBookingDesign(null);
                      }, 1200);
                    }).catch((err) => {
                      console.error("Clipboard write failed:", err);
                      const username = tech.instagram?.replace('@', '').replace('instagram.com/', '') || '';
                      window.open(`https://instagram.com/${username}`, '_blank');
                      setInstagramBookingDesign(null);
                    });
                  }}
                >
                  <Instagram className="w-4 h-4 shrink-0" />
                  ارسال پیام
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ============================================
            TOAST NOTIFICATION FOR COPY MESSAGE
            ============================================ */}
        {copiedInstagramMessage && (
          <div className="absolute top-16 left-4 right-4 z-55 bg-[#EC4899] text-white py-3 px-4 rounded-[16px] shadow-lg text-[11px] font-bold text-center flex items-center justify-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>✓ متن پیام کپی شد! در حال انتقال به دایرکت اینستاگرام...</span>
          </div>
        )}

      </div>

    </div>
  );
}
