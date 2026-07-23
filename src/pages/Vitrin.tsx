import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getNailTechBySlug, 
  getDesigns, 
  addDesign, 
  getCurrentUserSession, 
  logoutUserSession 
} from '../lib/db';
import { uploadImage } from '../lib/storage';
import type { NailTech, Design } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import { 
  Instagram, 
  Phone, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Plus, 
  X, 
  Check, 
  Copy, 
  LogOut, 
  Smartphone, 
  Wifi, 
  BatteryMedium,
  Share2,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

export default function Vitrin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [tech, setTech] = useState<NailTech | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string>('همه');
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  
  // Owner session check
  const currentUser = getCurrentUserSession();
  const isOwner = Boolean(
    currentUser && tech && (currentUser.id === tech.id || currentUser.slug === tech.slug)
  );

  // Add Design Modal state (for owner)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesign, setNewDesign] = useState({
    image_url: '',
    title: '',
    tags: ['جدید'],
    price: '',
    duration: '۲ ساعت',
  });

  const [copiedMessage, setCopiedMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState('09:41');

  // Scroll header collapse state
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        const found = await getNailTechBySlug(slug || 'profile');
        if (found) {
          setTech(found);
          const list = await getDesigns(found.id);
          setDesigns(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    return () => clearInterval(clockInterval);
  }, [slug]);

  // Handle scroll detection for shrinking header
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      if (scrollContainerRef.current.scrollTop > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }
  };

  // Collect unique tags
  const allTags = ['همه', ...Array.from(new Set(designs.flatMap(d => d.tags || [])))];

  const filteredDesigns = activeTag === 'همه' 
    ? designs 
    : designs.filter(d => d.tags?.includes(activeTag));

  // Ready-typed Persian booking message
  const getPreTypedMessage = (design: Design) => {
    if (!tech) return '';
    return `سلام، وقت بخیر! درباره طرح "${design.title}" با قیمت ${design.price.toLocaleString('fa-IR')} تومان در ویترین شما سوال داشتم. امکان رزرو نوبت وجود دارد؟`;
  };

  const handleCopyMessageAndOpenInstagram = (design: Design) => {
    const msg = getPreTypedMessage(design);
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);

    if (tech?.instagram) {
      const handle = tech.instagram.replace('@', '');
      window.open(`https://instagram.com/${handle}`, '_blank');
    }
  };

  const handleOpenWhatsApp = (design: Design) => {
    if (!tech) return;
    const msg = encodeURIComponent(getPreTypedMessage(design));
    const num = (tech.whatsapp || tech.mobile || '').replace(/^0/, '98');
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const handleAddDesignSubmit = async () => {
    if (!tech || !newDesign.image_url || !newDesign.title || !newDesign.price) return;

    const priceNum = parseInt(newDesign.price.replace(/,/g, '')) || 0;
    
    let durationMins = 120;
    if (newDesign.duration.includes('۳')) durationMins = 180;
    else if (newDesign.duration.includes('۲.۵')) durationMins = 150;
    else if (newDesign.duration.includes('۲')) durationMins = 120;
    else if (newDesign.duration.includes('۱.۵')) durationMins = 90;

    const created = await addDesign({
      tech_id: tech.id,
      title: newDesign.title,
      image_url: newDesign.image_url,
      tags: newDesign.tags,
      price: priceNum,
      duration: durationMins,
    });

    if (created) {
      setDesigns(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewDesign({
        image_url: '',
        title: '',
        tags: ['جدید'],
        price: '',
        duration: '۲ ساعت',
      });
    }
  };

  const handleDesignImageUpload = async (file: File | null) => {
    if (!file || !tech) return;
    try {
      const url = await uploadImage(file, 'designs', tech.id);
      if (url) setNewDesign(prev => ({ ...prev, image_url: url }));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-2">
          <span className="loading loading-spinner text-[#EC4899]" />
          <p className="text-xs font-bold text-neutral-600">در حال بارگذاری ویترین...</p>
        </div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center space-y-4">
          <Sparkles className="w-10 h-10 text-neutral-300 mx-auto" />
          <h2 className="text-sm font-bold text-neutral-800">ویترین یافت نشد</h2>
          <p className="text-xs text-neutral-400">امکان یافتن این ویترین وجود ندارد.</p>
          <button
            type="button"
            onClick={() => navigate('/techs')}
            className="w-full py-3 bg-[#EC4899] text-white text-xs font-bold rounded-xl"
          >
            مشاهده لیست ناخن‌کاران
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">
      
      <div className="phone-mockup-wrapper md:max-w-[700px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">
        
        <OfflineWarningBanner />

        {/* Status Bar */}
        <div className="bg-white text-neutral-900 px-6 py-2.5 flex justify-between items-center text-xs font-semibold select-none z-40 shrink-0 border-b border-neutral-100 md:hidden" dir="ltr">
          <div>{currentTime}</div>
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 opacity-80" />
            <Wifi className="w-3.5 h-3.5 opacity-80" />
            <BatteryMedium className="w-4 h-4 opacity-80" />
          </div>
        </div>

        {/* Top Sticky Navigation Action Bar */}
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 border-b border-neutral-100 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/techs')}
            className="flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            <span>لیست ناخن‌کاران</span>
          </button>

          <span className="text-xs font-extrabold text-neutral-900 truncate max-w-[150px]">
            {tech.name}
          </span>

          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  logoutUserSession();
                  navigate('/setup');
                }}
                className="p-1.5 bg-neutral-100 text-neutral-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('لینک ویترین کپی شد!');
              }}
              className="p-1.5 bg-pink-50 text-[#EC4899] hover:bg-pink-100 rounded-lg text-xs font-bold transition-all"
              title="اشتراک‌گذاری"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Vitrin Body */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-[#F5F5F7]"
        >
          
          {/* HEADER SECTION (Shrinks on scroll) */}
          <div className={`bg-white border-b border-neutral-100 transition-all duration-300 ${isScrolled ? 'p-3' : 'p-6'}`}>
            <div className="flex flex-col items-center text-center">
              
              {/* Profile Avatar */}
              <div className={`rounded-full p-1 bg-gradient-to-tr from-[#FFF0F6] to-[#EC4899]/30 transition-all duration-300 ${isScrolled ? 'w-14 h-14 mb-2' : 'w-24 h-24 mb-3'}`}>
                <img
                  src={tech.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop'}
                  alt={tech.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop';
                  }}
                />
              </div>

              <h1 className={`font-black text-neutral-900 tracking-tight transition-all ${isScrolled ? 'text-sm' : 'text-lg'}`}>
                {tech.name}
              </h1>

              <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400 font-bold">
                <MapPin className="w-3.5 h-3.5 text-[#EC4899]" fill="currentColor" />
                <span>{tech.city}</span>
              </div>

              {/* Social Contact Navbar Bar */}
              <div className="flex items-center justify-center gap-2 mt-4 w-full max-w-xs">
                {tech.instagram && (
                  <a
                    href={`https://instagram.com/${tech.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-pink-50 hover:bg-pink-100 text-[#EC4899] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-pink-100/50"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>اینستاگرام</span>
                  </a>
                )}

                {tech.whatsapp && (
                  <a
                    href={`https://wa.me/${tech.whatsapp.replace(/^0/, '98')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-emerald-100/50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>واتس‌اپ</span>
                  </a>
                )}

                {tech.mobile && (
                  <a
                    href={`tel:${tech.mobile}`}
                    className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>تماس</span>
                  </a>
                )}
              </div>

            </div>
          </div>

          {/* Filter Pills */}
          <div className="bg-white/80 backdrop-blur-xs px-4 py-3 border-b border-neutral-100 sticky top-12 z-20 flex gap-2 overflow-x-auto no-scrollbar">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTag === tag
                    ? 'bg-[#EC4899] text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Designs Showcase Grid */}
          <div className="p-4 grid grid-cols-2 gap-3.5">
            {filteredDesigns.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl p-8 text-center space-y-2 border border-neutral-200">
                <Sparkles className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-600">طرحی در این دسته‌بندی یافت نشد</p>
              </div>
            ) : (
              filteredDesigns.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDesign(item)}
                  className="bg-white border border-neutral-100 rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-md transition-all cursor-pointer flex flex-col group"
                >
                  {/* Photo container */}
                  <div className="aspect-square bg-neutral-100 relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop';
                      }}
                    />

                    {/* Time Badge on image */}
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-pink-300" />
                      <span>{item.duration ? `${item.duration / 60} ساعت` : '۲ ساعت'}</span>
                    </div>
                  </div>

                  {/* Title & Price Footer */}
                  <div className="p-3 space-y-1">
                    <h3 className="text-xs font-bold text-neutral-900 truncate">{item.title}</h3>
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#EC4899]">
                      <span>{item.price.toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Floating Owner Button: Add New Design */}
        {isOwner && (
          <div className="absolute bottom-4 left-4 right-4 z-30">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-extrabold rounded-[18px] text-center shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ افزودن نمونه‌کار جدید به ویترین</span>
            </button>
          </div>
        )}

        {/* ============================================
            DESIGN CLICK DETAIL & BOOKING MODAL
            ============================================ */}
        {selectedDesign && (
          <div className="absolute inset-0 bg-black/70 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[28px] p-6 space-y-4 max-h-[90%] overflow-y-auto no-scrollbar">
              
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-extrabold text-neutral-900 truncate max-w-[220px]">
                  {selectedDesign.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDesign(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Large Image Preview */}
              <div className="aspect-square max-h-[280px] w-full rounded-[20px] overflow-hidden bg-neutral-100 border border-neutral-100 relative">
                <img
                  src={selectedDesign.image_url}
                  alt={selectedDesign.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Price & Time Details */}
              <div className="bg-neutral-50 p-3.5 rounded-[16px] flex items-center justify-between text-xs font-bold border border-neutral-200">
                <div className="flex items-center gap-1 text-[#EC4899]">
                  <span>قیمت:</span>
                  <span className="font-extrabold text-sm">{selectedDesign.price.toLocaleString('fa-IR')} تومان</span>
                </div>

                <div className="flex items-center gap-1 text-neutral-600">
                  <Clock className="w-4 h-4 text-pink-500" />
                  <span>زمان لازم: {selectedDesign.duration ? `${selectedDesign.duration / 60} ساعت` : '۲ ساعت'}</span>
                </div>
              </div>

              {/* Ready Typed Message Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 block">متن آماده رزرو نوبت</span>
                <div className="bg-neutral-100 border border-neutral-200 rounded-[14px] p-3 text-[11px] font-semibold text-neutral-700 leading-relaxed text-right">
                  {getPreTypedMessage(selectedDesign)}
                </div>
              </div>

              {/* Contact Action Buttons */}
              <div className="space-y-2 pt-1">
                {tech.whatsapp && (
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(selectedDesign)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-[16px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>ارسال پیام مستقیم در واتس‌اپ</span>
                  </button>
                )}

                {tech.instagram && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessageAndOpenInstagram(selectedDesign)}
                    className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-[16px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    {copiedMessage ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedMessage ? 'متن کپی شد! در حال باز کردن اینستاگرام...' : 'کپی متن پیام و باز کردن اینستاگرام'}</span>
                  </button>
                )}

                {tech.mobile && (
                  <a
                    href={`tel:${tech.mobile}`}
                    className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-[16px] flex items-center justify-center gap-2 transition-all block text-center"
                  >
                    <Phone className="w-4 h-4" />
                    <span>تماس تلفنی مستقیم ({tech.mobile})</span>
                  </a>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ============================================
            ADD NEW DESIGN MODAL FOR OWNER
            ============================================ */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
            <div className="bg-white rounded-t-[24px] p-6 max-h-[90%] overflow-y-auto no-scrollbar space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="text-xs font-extrabold text-neutral-900">افزودن نمونه‌کار جدید به ویترین</h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">عکس نمونه‌کار</label>
                {newDesign.image_url ? (
                  <div className="relative aspect-square max-w-[120px] mx-auto rounded-xl overflow-hidden border border-neutral-200">
                    <img src={newDesign.image_url} alt="New" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label className="w-full py-6 border-2 border-dashed border-neutral-300 hover:border-[#EC4899] bg-neutral-50 rounded-xl flex flex-col items-center justify-center cursor-pointer">
                    <Plus className="w-6 h-6 text-neutral-400" />
                    <span className="text-[11px] font-bold text-neutral-500 mt-1">آپلود عکس جدید</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">عنوان طرح</label>
                <input
                  type="text"
                  placeholder="عنوان طرح"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899]"
                  value={newDesign.title}
                  onChange={(e) => setNewDesign(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">قیمت (تومان)</label>
                  <input
                    type="text"
                    placeholder="۴۵0,۰۰۰"
                    className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-left dir-ltr"
                    value={newDesign.price}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">مدت زمان</label>
                  <select
                    className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EC4899] text-right"
                    value={newDesign.duration}
                    onChange={(e) => setNewDesign(prev => ({ ...prev, duration: e.target.value }))}
                  >
                    <option value="۱.۵ ساعت">۱.۵ ساعت</option>
                    <option value="۲ ساعت">۲ ساعت</option>
                    <option value="۲.۵ ساعت">۲.۵ ساعت</option>
                    <option value="۳ ساعت">۳ ساعت</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddDesignSubmit}
                  className="w-full py-3.5 bg-[#EC4899] hover:bg-[#DB2777] text-white text-xs font-bold rounded-xl"
                >
                  ثبت در ویترین
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
