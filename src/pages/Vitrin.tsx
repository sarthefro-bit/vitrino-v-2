import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getNailTechBySlug,
  getDesigns,
  addDesign,
  updateDesign,
  deleteDesign,
  saveNailTech,
  getCurrentUserSession,
  logoutUserSession,
  setCurrentUserSession
} from '../lib/db';
import { signOutAuth } from '../lib/auth';
import { uploadImage } from '../lib/storage';
import { AVATAR_PLACEHOLDER } from '../lib/avatar';
import { getPastedImageFile, readImageFromClipboard } from '../lib/clipboard';
import type { NailTech, Design } from '../lib/db';
import OfflineWarningBanner from '../components/OfflineWarningBanner';
import {
  Instagram,
  Phone,
  MapPin,
  MessageCircle,
  Plus,
  X,
  Check,
  LogOut,
  Sparkles,
  ChevronDown,
  Pencil,
  Trash2,
  Send,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Menu,
  MoreVertical,
  Clipboard
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

interface ColorOption {
  name: string;
  dotColor: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const COLOR_PILLS: ColorOption[] = [
  { name: 'سبز', dotColor: '#22C55E', bgClass: 'bg-emerald-50/80', borderClass: 'border-emerald-200', textClass: 'text-emerald-800' },
  { name: 'بنفش', dotColor: '#A855F7', bgClass: 'bg-purple-50/80', borderClass: 'border-purple-200', textClass: 'text-purple-800' },
  { name: 'آبی', dotColor: '#3B82F6', bgClass: 'bg-blue-50/80', borderClass: 'border-blue-200', textClass: 'text-blue-800' },
  { name: 'صورتی', dotColor: '#EC4899', bgClass: 'bg-pink-50/80', borderClass: 'border-pink-200', textClass: 'text-pink-800' },
  { name: 'قرمز', dotColor: '#EF4444', bgClass: 'bg-red-50/80', borderClass: 'border-red-200', textClass: 'text-red-800' },
  { name: 'نود', dotColor: '#D97706', bgClass: 'bg-amber-50/80', borderClass: 'border-amber-200', textClass: 'text-amber-800' },
  { name: 'سفید', dotColor: '#FFFFFF', bgClass: 'bg-neutral-50', borderClass: 'border-neutral-300', textClass: 'text-neutral-800' },
  { name: 'مشکی', dotColor: '#18181B', bgClass: 'bg-neutral-100', borderClass: 'border-neutral-400', textClass: 'text-neutral-900' },
];

const SORT_OPTIONS = [
  'گران‌ترین به ارزان‌ترین',
  'ارزان‌ترین به گران‌ترین',
  'جدیدترین'
];

const DEFAULT_STYLE_TAGS = ['همه', 'فانتزی', 'عروسکی', 'ژلیش', 'آمبره', 'فرنچ', 'یلدا', 'عروسی', 'نامزدی', 'ساده', 'دیزاین'];

function parseTags(rawTags: unknown): string[] {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) {
    return rawTags.flatMap((item) => parseTags(item));
  }
  if (typeof rawTags === 'string') {
    let trimmed = rawTags.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseTags(parsed);
      } catch {
        trimmed = trimmed.replace(/^\[|\]$/g, '');
      }
    }
    return trimmed
      .split(/[\n,\r"'\s]+/)
      .map((tag) => tag.replace(/["'\]\\]/g, '').trim())
      .filter((tag) => tag.length > 0 && tag !== '[' && tag !== ']');
  }
  return [];
}

export default function Vitrin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [tech, setTech] = useState<NailTech | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTag, setActiveTag] = useState<string>('همه');
  const [selectedColor, setSelectedColor] = useState<string>('همه');
  const [colorSearchQuery, setColorSearchQuery] = useState<string>('');
  
  // Price range filters
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('جدیدترین');

  // Filter Modals
  const [showColorModal, setShowColorModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDesign, setBookingDesign] = useState<Design | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Owner session check
  const currentUser = getCurrentUserSession();
  const isOwner = Boolean(
    currentUser && tech && (currentUser.id === tech.id || currentUser.slug === tech.slug)
  );

  // Add Design Modal state (for owner)
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [newDesign, setNewDesign] = useState({
    image_url: '',
    title: '',
    price: '',
    duration: '۲ ساعت',
    selectedColors: [] as string[],
    selectedStyles: [] as string[],
  });

  // Custom tags
  const [customColorPills, setCustomColorPills] = useState<ColorOption[]>(COLOR_PILLS);
  const [customStyleTags, setCustomStyleTags] = useState<string[]>(DEFAULT_STYLE_TAGS);
  const [showAddColorInput, setShowAddColorInput] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [showAddStyleInput, setShowAddStyleInput] = useState(false);
  const [newStyleInput, setNewStyleInput] = useState('');

  // Edit Design Modal state (for owner)
  const [editingDesign, setEditingDesign] = useState<Design | null>(null);
  const [editDesignForm, setEditDesignForm] = useState({
    title: '',
    price: '',
    duration: '۲ ساعت',
    image_url: '',
    selectedColors: [] as string[],
    selectedStyles: [] as string[],
  });

  // Edit Profile Modal state (for owner)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInfo, setEditInfo] = useState<Partial<NailTech>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete design confirmation
  const [designToDelete, setDesignToDelete] = useState<Design | null>(null);

  // Enlarged design detail modal
  const [selectedDetailDesign, setSelectedDetailDesign] = useState<Design | null>(null);

  // Scroll header collapse state
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tagScrollRef = useRef<HTMLDivElement>(null);

  // Convert vertical mouse wheel to horizontal scrolling for style tags bar
  const handleTagWheel = (e: React.WheelEvent) => {
    if (tagScrollRef.current && e.deltaY !== 0) {
      tagScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
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
  }, [slug]);

  // Handle scroll detection for collapsible header (collapses instantly upon scroll > 5)
  const handleScroll = () => {
    const containerTop = scrollContainerRef.current?.scrollTop || 0;
    const windowTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (containerTop > 5 || windowTop > 5) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Collect dynamic style tags including DEFAULT, custom style tags, and tags from all designs
  const availableStyleTags = Array.from(
    new Set([
      'همه',
      ...DEFAULT_STYLE_TAGS.filter(t => t !== 'همه'),
      ...customStyleTags.filter(t => t !== 'همه'),
      ...designs.flatMap(d => parseTags(d.tags)).filter(t => t !== 'همه')
    ])
  );

  // Collect dynamic color options combining custom color pills with any color tags on designs
  const availableColorOptions = Array.from(
    new Set([
      ...customColorPills.map(c => c.name),
      ...designs.flatMap(d => parseTags(d.tags))
    ])
  ).map(name => {
    const existing = customColorPills.find(c => c.name === name);
    if (existing) return existing;
    return {
      name,
      dotColor: '#DB2777',
      bgClass: 'bg-pink-50/80',
      borderClass: 'border-pink-200',
      textClass: 'text-[#DB2777]'
    };
  });

  // Parse price helper
  const parseFaPrice = (val: string): number => {
    if (!val) return 0;
    const englishDigits = val.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, '').replace(/ /g, '');
    return parseInt(englishDigits, 10) || 0;
  };

  // Filtering logic
  const filteredDesigns = designs.filter(d => {
    const itemTags = parseTags(d.tags);

    // Tag filter
    if (activeTag !== 'همه' && !itemTags.includes(activeTag)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchTag = itemTags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTag) return false;
    }

    // Color filter
    if (selectedColor !== 'همه' && !itemTags.includes(selectedColor)) return false;

    // Price range min/max
    const minP = parseFaPrice(minPriceInput);
    const maxP = parseFaPrice(maxPriceInput);
    if (minP > 0 && d.price < minP) return false;
    if (maxP > 0 && d.price > maxP) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === 'ارزان‌ترین به گران‌ترین' || sortBy === 'ارزان‌ترین') return a.price - b.price;
    if (sortBy === 'گران‌ترین به ارزان‌ترین' || sortBy === 'گران‌ترین') return b.price - a.price;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const handleSendInstagramMessage = () => {
    if (!tech) return;

    let msg = 'سلام، از طرف ویترینو پیام می‌دهم و قصد رزرو وقت دارم.';
    if (bookingDesign) {
      msg = `سلام، وقت بخیر! قصد رزرو طرح "${bookingDesign.title}" با قیمت ${bookingDesign.price.toLocaleString('fa-IR')} تومان در ویترین شما را دارم.`;
    }

    navigator.clipboard.writeText(msg);
    setCopiedNotice(true);

    const handle = tech.instagram ? tech.instagram.replace('@', '').trim() : '';
    const instagramUrl = handle ? `https://instagram.com/${handle}` : 'https://instagram.com';

    setTimeout(() => {
      window.open(instagramUrl, '_blank');
      setCopiedNotice(false);
      setShowBookingModal(false);
      setBookingDesign(null);
    }, 600);
  };

  const handleOpenBookingForDesign = (design: Design) => {
    setBookingDesign(design);
    setShowBookingModal(true);
  };

  const handleAddDesignSubmit = async () => {
    if (!tech || !newDesign.image_url || !newDesign.title || !newDesign.price) return;

    const priceNum = parseFaPrice(newDesign.price);

    let durationMins = 120;
    if (newDesign.duration.includes('۳')) durationMins = 180;
    else if (newDesign.duration.includes('۲.۵')) durationMins = 150;
    else if (newDesign.duration.includes('۲')) durationMins = 120;
    else if (newDesign.duration.includes('۱.۵')) durationMins = 90;

    const allTagsCombined = Array.from(new Set([...newDesign.selectedColors, ...newDesign.selectedStyles]));

    const created = await addDesign({
      tech_id: tech.id,
      title: newDesign.title,
      image_url: newDesign.image_url,
      tags: allTagsCombined.length > 0 ? allTagsCombined : ['جدید'],
      price: priceNum,
      duration: durationMins,
    });

    if (created) {
      setDesigns(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewDesign({
        image_url: '',
        title: '',
        price: '',
        duration: '۲ ساعت',
        selectedColors: [],
        selectedStyles: [],
      });
    }
  };

  const handleDesignImageUpload = useCallback(async (file: File | null) => {
    if (!file || !tech) return;
    setUploadingDesign(true);
    try {
      const url = await uploadImage(file, 'designs', tech.id);
      if (url) {
        setNewDesign(prev => ({ ...prev, image_url: url }));
        setEditDesignForm(prev => ({ ...prev, image_url: url }));
      }
    } catch {
      // ignore
    } finally {
      setUploadingDesign(false);
    }
  }, [tech]);

  const handleAddNewColorTag = () => {
    if (!newColorInput.trim()) return;
    const trimmed = newColorInput.trim();
    if (!customColorPills.some(c => c.name === trimmed)) {
      setCustomColorPills(prev => [
        ...prev,
        { name: trimmed, dotColor: '#DB2777', bgClass: 'bg-pink-50', borderClass: 'border-pink-200', textClass: 'text-[#DB2777]' }
      ]);
    }
    setNewDesign(prev => ({
      ...prev,
      selectedColors: prev.selectedColors.includes(trimmed) ? prev.selectedColors : [...prev.selectedColors, trimmed]
    }));
    setEditDesignForm(prev => ({
      ...prev,
      selectedColors: prev.selectedColors.includes(trimmed) ? prev.selectedColors : [...prev.selectedColors, trimmed]
    }));
    setNewColorInput('');
    setShowAddColorInput(false);
  };

  const handleAddNewStyleTag = () => {
    if (!newStyleInput.trim()) return;
    const trimmed = newStyleInput.trim();
    if (!customStyleTags.includes(trimmed)) {
      setCustomStyleTags(prev => [...prev, trimmed]);
    }
    setNewDesign(prev => ({
      ...prev,
      selectedStyles: prev.selectedStyles.includes(trimmed) ? prev.selectedStyles : [...prev.selectedStyles, trimmed]
    }));
    setEditDesignForm(prev => ({
      ...prev,
      selectedStyles: prev.selectedStyles.includes(trimmed) ? prev.selectedStyles : [...prev.selectedStyles, trimmed]
    }));
    setNewStyleInput('');
    setShowAddStyleInput(false);
  };

  const handleOpenEditDesignModal = (design: Design) => {
    setEditingDesign(design);
    const parsed = parseTags(design.tags);
    const colors = parsed.filter(t => customColorPills.some(c => c.name === t));
    const styles = parsed.filter(t => !customColorPills.some(c => c.name === t));
    setEditDesignForm({
      title: design.title,
      price: design.price ? design.price.toString() : '',
      duration: design.duration ? `${design.duration / 60} ساعت` : '۲ ساعت',
      image_url: design.image_url,
      selectedColors: colors.length ? colors : ['صورتی'],
      selectedStyles: styles.length ? styles : ['فانتزی'],
    });
  };

  const handleSaveEditDesign = async () => {
    if (!editingDesign) return;
    const priceNum = parseFaPrice(editDesignForm.price);
    let durationMins = 120;
    if (editDesignForm.duration.includes('۳')) durationMins = 180;
    else if (editDesignForm.duration.includes('۲.۵')) durationMins = 150;
    else if (editDesignForm.duration.includes('۲')) durationMins = 120;
    else if (editDesignForm.duration.includes('۱.۵')) durationMins = 90;

    const allTags = Array.from(new Set([...editDesignForm.selectedColors, ...editDesignForm.selectedStyles]));
    const updated: Design = {
      ...editingDesign,
      title: editDesignForm.title,
      price: priceNum,
      duration: durationMins,
      image_url: editDesignForm.image_url,
      tags: allTags
    };

    await updateDesign(updated);
    setDesigns(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditingDesign(null);
  };

  const handleOpenEditModal = () => {
    if (!tech) return;
    setEditInfo({
      name: tech.name,
      city: tech.city,
      address: tech.address || '',
      instagram: tech.instagram || '',
      whatsapp: tech.whatsapp || '',
      telegram: tech.telegram || '',
      avatar_url: tech.avatar_url || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditAvatarUpload = useCallback(async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, 'avatars', `avatars/${tech?.id || 'temp'}`);
      if (url) setEditInfo(prev => ({ ...prev, avatar_url: url }));
      else setEditError('خطا در آپلود تصویر پروفایل');
    } catch {
      setEditError('خطا در آپلود تصویر پروفایل');
    } finally {
      setUploadingAvatar(false);
    }
  }, [tech]);

  // Handle global paste (Ctrl + V / Cmd + V) when any upload modal is open
  useEffect(() => {
    if (!showAddModal && !editingDesign && !showEditModal) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const file = getPastedImageFile(e);
      if (file) {
        e.preventDefault();
        if (showAddModal || editingDesign) {
          handleDesignImageUpload(file);
        } else if (showEditModal) {
          handleEditAvatarUpload(file);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [showAddModal, editingDesign, showEditModal, handleDesignImageUpload, handleEditAvatarUpload]);

  const handlePasteFromClipboardClick = async (target: 'design' | 'avatar') => {
    const file = await readImageFromClipboard();
    if (file) {
      if (target === 'design') {
        handleDesignImageUpload(file);
      } else {
        handleEditAvatarUpload(file);
      }
    } else {
      alert('تصویری در حافظه کپی (Clipboard) یافت نشد. می‌توانید عکسی را کپی کرده و دکمه Ctrl + V را فشار دهید.');
    }
  };

  const handleSaveProfile = async () => {
    if (!tech) return;
    if (!editInfo.name?.trim()) {
      setEditError('نام سالن الزامی است.');
      return;
    }
    if (!editInfo.address?.trim()) {
      setEditError('آدرس سالن الزامی است.');
      return;
    }

    const targetSlug = (editInfo.slug || editInfo.username || tech.slug || 'tech').toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
    if (!targetSlug) {
      setEditError('نام کاربری / آدرس اختصاصی معتبر نیست.');
      return;
    }

    setSavingProfile(true);
    setEditError('');
    try {
      if (targetSlug !== tech.slug) {
        const existing = await getNailTechBySlug(targetSlug);
        if (existing && existing.id !== tech.id) {
          setEditError('این آدرس اختصاصی قبلاً توسط حساب دیگری ثبت شده است.');
          setSavingProfile(false);
          return;
        }
      }

      const updated = await saveNailTech({
        id: tech.id,
        slug: targetSlug,
        username: targetSlug,
        email: tech.email,
        name: editInfo.name,
        city: editInfo.city || tech.city,
        address: editInfo.address,
        instagram: editInfo.instagram || '',
        whatsapp: editInfo.whatsapp || '',
        telegram: editInfo.telegram || '',
        avatar_url: editInfo.avatar_url || '',
      });

      if (updated) {
        setTech(updated);
        setCurrentUserSession(updated);
        setShowEditModal(false);
        if (targetSlug !== tech.slug) {
          navigate(`/vitrin/${targetSlug}`, { replace: true });
        }
      } else {
        setEditError('خطا در ذخیره‌سازی تغییرات');
      }
    } catch {
      setEditError('خطا در ذخیره‌سازی تغییرات');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteDesign = async () => {
    if (!designToDelete) return;
    await deleteDesign(designToDelete.id);
    setDesigns(prev => prev.filter(d => d.id !== designToDelete.id));
    setDesignToDelete(null);
  };

  const handleLogout = async () => {
    logoutUserSession();
    await signOutAuth();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8" dir="rtl">
      
      <div className="phone-mockup-wrapper w-full max-w-full md:max-w-[500px] h-screen md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-[#F8F9FA] flex flex-col relative overflow-hidden text-[#1F2937] font-sans">
        
        <OfflineWarningBanner />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center gap-4 min-h-[600px]">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce" />
            </div>
            <p className="text-xs font-bold text-neutral-400">در حال بارگذاری ویترین...</p>
          </div>
        ) : !tech ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center space-y-4 min-h-[600px]">
            <Sparkles className="w-10 h-10 text-neutral-300 mx-auto" />
            <h2 className="text-sm font-bold text-neutral-800">ویترین یافت نشد</h2>
            <p className="text-xs text-neutral-400">امکان یافتن این ویترین وجود ندارد.</p>
            <button
              type="button"
              onClick={() => navigate('/techs')}
              className="w-full py-3 bg-[#DB2777] text-white text-xs font-bold rounded-xl max-w-xs mx-auto cursor-pointer"
            >
              مشاهده لیست ناخن‌کاران
            </button>
          </div>
        ) : (
          <>
            {/* Scrollable Vitrin Container */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto no-scrollbar pb-28 bg-[#F8F9FA]"
            >
          
          {/* ============================================
              HEADER SECTION (Non-bouncing Sticky Top Bar + Page Flow Profile Card)
              ============================================ */}
          <div className="sticky top-0 z-30 w-full px-4 py-2.5 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-2xs flex items-center justify-between h-14 transition-all">
            {/* Right (RTL): Back Arrow */}
            <button
              type="button"
              onClick={() => navigate('/techs')}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer rounded-full hover:bg-neutral-100"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Center: Title or Compact Pill */}
            <div className="flex items-center gap-2 transition-all">
              {isScrolled ? (
                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/80 rounded-full px-3 py-1 animate-in fade-in duration-200">
                  <img
                    src={tech.avatar_url || AVATAR_PLACEHOLDER}
                    alt={tech.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-pink-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = AVATAR_PLACEHOLDER;
                    }}
                  />
                  <span className="text-xs font-bold text-neutral-900 truncate max-w-[140px]">
                    {tech.name}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-extrabold text-neutral-900 tracking-tight">
                  ویترین سالن
                </span>
              )}
            </div>

            {/* Left (RTL): Actions */}
            <div className="flex items-center gap-1.5">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="p-1.5 text-neutral-600 hover:text-[#DB2777] transition-colors cursor-pointer rounded-full hover:bg-neutral-100"
                    title="ویرایش پروفایل"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-neutral-600 hover:text-red-600 transition-colors cursor-pointer rounded-full hover:bg-neutral-100"
                    title="خروج"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('لینک ویترین کپی شد!');
                  }}
                  className="p-1.5 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer rounded-full hover:bg-neutral-100"
                  title="کپی لینک"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* EXPANDED PROFILE CARD (In page scroll flow) */}
          <div className="px-4 pt-3 pb-1">
            <div className="bg-white border border-neutral-200/80 rounded-[28px] p-5 shadow-2xs flex flex-col items-center text-center relative space-y-3.5">
              
              {/* Profile Avatar */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border border-neutral-100 shadow-xs shrink-0">
                <img
                  src={tech.avatar_url || AVATAR_PLACEHOLDER}
                  alt={tech.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = AVATAR_PLACEHOLDER;
                  }}
                />
              </div>

              {/* Salon Title */}
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                {tech.name}
              </h1>

              {/* 3 Action Cards Box Row (Phone, Instagram, Location) */}
              <div className="grid grid-cols-3 gap-2 w-full pt-1">
                
                {/* Phone Box */}
                <a
                  href={tech.mobile ? `tel:${tech.mobile}` : '#'}
                  onClick={(e) => {
                    if (!tech.mobile) {
                      e.preventDefault();
                      setShowBookingModal(true);
                    }
                  }}
                  className="bg-pink-50/50 hover:bg-pink-100/60 border border-pink-100/80 rounded-[20px] p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-[#DB2777] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-[11px] font-bold text-[#DB2777] truncate w-full text-center">
                    تماس
                  </span>
                </a>

                {/* Instagram Box */}
                <a
                  href={`https://instagram.com/${tech.instagram ? tech.instagram.replace('@', '') : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-pink-50/50 hover:bg-pink-100/60 border border-pink-100/80 rounded-[20px] p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-[#DB2777] flex items-center justify-center shrink-0">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#DB2777] truncate w-full text-center">
                    پیج اینستاگرام
                  </span>
                </a>

                {/* Location Box */}
                <a
                  href={tech.address ? `https://maps.google.com/?q=${encodeURIComponent(tech.address)}` : '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-pink-50/50 hover:bg-pink-100/60 border border-pink-100/80 rounded-[20px] p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-100 text-[#DB2777] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 fill-current" />
                  </div>
                  <span className="text-[10px] font-bold text-[#DB2777] truncate w-full text-center">
                    {tech.address ? tech.address.split('،')[0] : `${tech.city}`}
                  </span>
                </a>

              </div>

            </div>
          </div>

          {/* ============================================
              "نمونه‌کارها" HEADER CARD
              ============================================ */}
          <div className="px-4 py-1.5">
            <div className="bg-white border border-neutral-200/80 rounded-full px-6 py-3 text-right shadow-2xs">
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                نمونه‌کارها
              </h2>
            </div>
          </div>

          {/* ============================================
              STYLE TAG PILLS (Horizontal Scroll)
              ============================================ */}
          <div className="px-4 py-2 relative">
            <div
              ref={tagScrollRef}
              onWheel={handleTagWheel}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x scroll-smooth w-full py-1"
            >
              {availableStyleTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? 'همه' : tag)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                    activeTag === tag
                      ? 'bg-[#DB2777] text-white shadow-xs'
                      : 'bg-white border border-neutral-200/90 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <span>{tag}</span>
                  {activeTag === tag && tag !== 'همه' && (
                    <X
                      className="w-3.5 h-3.5 text-white/90 hover:text-white shrink-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTag('همه');
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ============================================
              FILTER CONTROLS BAR
              ============================================ */}
          <div className="px-4 py-1">
            <div className="flex items-center justify-between gap-2.5 border-t border-b border-neutral-200/80 py-2.5">
              
              {/* Right Side (RTL): Dropdown buttons ("رنگ" and "بازه قیمت") */}
              <div className="flex items-center gap-2 flex-1">
                
                {/* Button 1: Color */}
                <button
                  type="button"
                  onClick={() => setShowColorModal(true)}
                  className={`flex-1 min-w-0 py-2 px-3 bg-white hover:bg-neutral-50 border rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                    selectedColor !== 'همه'
                      ? 'border-[#DB2777] text-[#DB2777] bg-pink-50/80'
                      : 'border-neutral-200 text-neutral-800'
                  }`}
                >
                  <span className="truncate">{selectedColor !== 'همه' ? `رنگ: ${selectedColor}` : 'رنگ'}</span>
                  {selectedColor !== 'همه' ? (
                    <X
                      className="w-3.5 h-3.5 text-[#DB2777] hover:text-pink-800 shrink-0 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedColor('همه');
                      }}
                    />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 mr-1" />
                  )}
                </button>

                {/* Button 2: Price Range */}
                <button
                  type="button"
                  onClick={() => setShowPriceModal(true)}
                  className={`flex-1 min-w-0 py-2 px-3 bg-white hover:bg-neutral-50 border rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                    (minPriceInput || maxPriceInput)
                      ? 'border-[#DB2777] text-[#DB2777] bg-pink-50/80'
                      : 'border-neutral-200 text-neutral-800'
                  }`}
                >
                  <span className="truncate">
                    {minPriceInput || maxPriceInput ? 'قیمت (فیلتر شده)' : 'بازه قیمت'}
                  </span>
                  {minPriceInput || maxPriceInput ? (
                    <X
                      className="w-3.5 h-3.5 text-[#DB2777] hover:text-pink-800 shrink-0 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMinPriceInput('');
                        setMaxPriceInput('');
                      }}
                    />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 mr-1" />
                  )}
                </button>
              </div>

              {/* Left Side (RTL): Sort & Search icon buttons */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Sort Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowSortModal(true)}
                  className={`w-9 h-9 rounded-xl bg-white hover:bg-neutral-50 border flex items-center justify-center cursor-pointer shadow-2xs transition-all ${
                    sortBy !== 'جدیدترین'
                      ? 'border-[#DB2777] text-[#DB2777] bg-pink-50/80'
                      : 'border-neutral-200 text-neutral-700'
                  }`}
                  title="مرتب‌سازی"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                {/* Search Icon Button */}
                <button
                  type="button"
                  onClick={() => setShowSearchBox(prev => !prev)}
                  className={`w-9 h-9 rounded-xl bg-white hover:bg-neutral-50 border flex items-center justify-center cursor-pointer shadow-2xs transition-all ${
                    showSearchBox || searchQuery
                      ? 'border-[#DB2777] text-[#DB2777] bg-pink-50/80'
                      : 'border-neutral-200 text-neutral-700'
                  }`}
                  title="جستجو"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Collapsible Search Input Box */}
            {showSearchBox && (
              <div className="pt-2 animate-in fade-in duration-200">
                <div className="bg-white border border-neutral-200 rounded-full px-3.5 py-2 flex items-center gap-2 shadow-2xs">
                  <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="جستجو در نمونه‌کارها..."
                    className="w-full bg-transparent text-xs font-medium text-neutral-800 outline-none text-right"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-neutral-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ============================================
              PHOTO CARDS GRID (2 Columns)
              ============================================ */}
          <div className="p-4 grid grid-cols-2 gap-3 sm:gap-4">
            {filteredDesigns.length === 0 ? (
              <div className="col-span-2 bg-white rounded-[24px] p-8 text-center space-y-2 border border-neutral-200/80 shadow-2xs">
                <Sparkles className="w-8 h-8 text-neutral-300 mx-auto" />
                <p className="text-xs font-bold text-neutral-600">طرحی با این مشخصات یافت نشد</p>
                <p className="text-[11px] text-neutral-400">می‌توانید فیلترهای بالا را تغییر دهید.</p>
              </div>
            ) : (
              filteredDesigns.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-neutral-200/80 rounded-[28px] p-2.5 sm:p-3 shadow-2xs flex flex-col gap-2 group cursor-pointer hover:border-pink-300 transition-all"
                  onClick={() => setSelectedDetailDesign(item)}
                >
                  {/* Photo Container */}
                  <div className="aspect-square bg-neutral-100 rounded-[22px] relative overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop';
                      }}
                    />

                    {/* Top-Right Edit Button for Owner or Menu icon */}
                    <div className="absolute top-2 right-2">
                      {isOwner ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDesignModal(item);
                          }}
                          className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-[#DB2777] transition-all cursor-pointer shadow-xs"
                          title="ویرایش این نمونه‌کار"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-xs text-white flex items-center justify-center">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Bottom-Right Glass Badge for Time */}
                    <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs border border-white/20">
                      <span>{item.duration ? `${item.duration / 60} ساعت` : '۲ ساعت'}</span>
                    </div>

                    {/* Bottom-Left Pink Circle Plus Button (For Clients Only) */}
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBookingForDesign(item);
                        }}
                        className="absolute bottom-2 left-2 w-9 h-9 rounded-full bg-[#DB2777] hover:bg-[#BE185D] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                        title="رزرو این طرح"
                      >
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>

                  {/* Price Label Below Card */}
                  <div className="px-1 pt-0.5 space-y-0.5">
                    <span className="text-[10px] font-medium text-neutral-400 block truncate">
                      {item.title}
                    </span>
                    <div className="text-xs font-bold text-[#DB2777] flex items-center gap-1">
                      <span>تومان</span>
                      <span className="font-extrabold text-sm">{item.price.toLocaleString('fa-IR')}</span>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>

        {/* ============================================
            BOTTOM FIXED ACTION BAR
            ============================================ */}
        <div className="absolute md:sticky bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-neutral-100 z-30 shrink-0">
          {isOwner ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>افزودن نمونه کار جدید</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBookingDesign(null);
                setShowBookingModal(true);
              }}
              className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-xs"
            >
              رزرو وقت
            </button>
          )}
        </div>

      {/* ============================================
          ENLARGED DESIGN DETAIL MODAL
          ============================================ */}
      {selectedDetailDesign && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="bg-white rounded-[32px] p-5 sm:p-6 w-full max-w-xs sm:max-w-sm relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDetailDesign(null)}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center absolute top-4 left-4 z-10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Enlarged Image */}
            <div className="aspect-square w-full bg-neutral-100 rounded-[24px] overflow-hidden relative shadow-inner">
              <img
                src={selectedDetailDesign.image_url}
                alt={selectedDetailDesign.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop';
                }}
              />
              {/* Time duration badge */}
              <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5">
                <span>{selectedDetailDesign.duration ? `${selectedDetailDesign.duration / 60} ساعت` : '۲ ساعت'}</span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">
                  {selectedDetailDesign.title}
                </h3>
                <div className="text-sm font-extrabold text-[#DB2777]">
                  {(selectedDetailDesign.price ?? 0).toLocaleString('fa-IR')} <span className="text-xs font-bold">تومان</span>
                </div>
              </div>

              {/* Tags */}
              {(() => {
                const tagsList = parseTags(selectedDetailDesign.tags);
                if (tagsList.length === 0) return null;

                return (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {tagsList.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="px-2.5 py-1 bg-pink-50 text-[#DB2777] border border-pink-100 text-[11px] font-bold rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const d = selectedDetailDesign;
                  setSelectedDetailDesign(null);
                  handleOpenBookingForDesign(d);
                }}
                className="w-full py-3.5 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-full transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>تماس با ناخن‌کار و رزرو این طرح</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          MULTI-CHANNEL CONTACT & RESERVE POPUP MODAL
          ============================================ */}
      {showBookingModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="bg-white rounded-[32px] p-5 sm:p-6 w-full max-w-sm text-right relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center absolute top-4 left-4 transition-all cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Text */}
            <div className="space-y-1 pr-1">
              <h3 className="text-base font-extrabold text-neutral-900">
                راه ارتباطی با ناخن‌کار
              </h3>
              <p className="text-xs text-neutral-400 font-normal leading-relaxed">
                {bookingDesign
                  ? `جهت رزرو طرح «${bookingDesign.title}» یکی از مسیرهای زیر را انتخاب نمایید:`
                  : `یکی از راه‌های ارتباطی زیر را جهت تماس یا پیام انتخاب کنید:`}
              </p>
            </div>

            {copiedNotice && (
              <div className="bg-emerald-50 text-emerald-600 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 animate-bounce text-center">
                <Check className="w-4 h-4 shrink-0" />
                <span>متن رزرو کپی شد! در حال باز کردن برنامه...</span>
              </div>
            )}

            {/* Contact Options List */}
            <div className="space-y-2.5 pt-1">
              {/* Instagram Option */}
              <button
                type="button"
                onClick={handleSendInstagramMessage}
                className="w-full p-3.5 bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border border-pink-200/80 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DB2777] text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">ارسال پیام در اینستاگرام</span>
                    <span className="text-[11px] font-semibold text-[#DB2777] dir-ltr inline-block">
                      @{tech.instagram ? tech.instagram.replace('@', '') : tech.username || 'instagram'}
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-white border border-pink-200 text-[#DB2777] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </button>

              {/* Phone Call Option */}
              {tech.mobile && (
                <a
                  href={`tel:${tech.mobile}`}
                  className="w-full p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 text-[#DB2777] flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <Phone className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">تماس مستقیم تلفنی</span>
                      <span className="text-[11px] font-semibold text-neutral-500 dir-ltr inline-block">
                        {tech.mobile}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-neutral-200 text-neutral-400 flex items-center justify-center">
                    <Phone className="w-3 h-3" />
                  </div>
                </a>
              )}

              {/* WhatsApp Option */}
              {(tech.whatsapp || tech.mobile) && (
                <a
                  href={`https://wa.me/98${(tech.whatsapp || tech.mobile || '').replace(/^0/, '').replace(/\+/g, '').replace(/ /g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3.5 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">ارسال پیام در واتس‌اپ</span>
                      <span className="text-[11px] font-semibold text-emerald-700 dir-ltr inline-block">
                        {tech.whatsapp || tech.mobile}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </a>
              )}

              {/* Telegram Option */}
              {(tech.telegram || tech.username) && (
                <a
                  href={`https://t.me/${(tech.telegram || tech.username || '').replace('@', '').trim()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3.5 bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200/80 rounded-2xl flex items-center justify-between transition-all cursor-pointer group text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">ارسال پیام در تلگرام</span>
                      <span className="text-[11px] font-semibold text-sky-700 dir-ltr inline-block">
                        @{tech.telegram ? tech.telegram.replace('@', '') : tech.username}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white border border-sky-200 text-sky-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </a>
              )}
            </div>

            {/* Bottom Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-full transition-all cursor-pointer text-center"
              >
                انصراف
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          COLOR FILTER BOTTOM SHEET MODAL (Matches Frame 1 in Screenshot)
          ============================================ */}
      {showColorModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end p-0 font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-5 pb-6 max-h-[80%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            
            {/* Top Handle Line */}
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto" />

            {/* Header Title */}
            <h3 className="text-sm font-bold text-neutral-900 text-right px-1">
              انتخاب رنگ
            </h3>

            {/* Search Box */}
            <div className="bg-white border border-neutral-200/90 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xs">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                type="text"
                placeholder="جستجو"
                className="w-full bg-transparent text-xs font-medium text-neutral-800 outline-none text-right"
                value={colorSearchQuery}
                onChange={(e) => setColorSearchQuery(e.target.value)}
              />
            </div>

            {/* Color Pills Grid (Scrollable) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto no-scrollbar py-2 px-1">
              {availableColorOptions.filter(c => c.name.toLowerCase().includes(colorSearchQuery.toLowerCase())).map((c) => {
                const isSelected = selectedColor === c.name;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c.name);
                    }}
                    className={`px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#DB2777] bg-pink-50 text-[#DB2777] shadow-2xs'
                        : `${c.borderClass} ${c.bgClass} ${c.textClass} hover:opacity-90`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.dotColor }}
                      />
                      <span>{c.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#DB2777] stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedColor('همه');
                  setShowColorModal(false);
                }}
                className="px-6 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                حذف
              </button>

              <button
                type="button"
                onClick={() => setShowColorModal(false)}
                className="px-6 py-2 bg-[#DB2777] hover:bg-[#BE185D] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تایید
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          PRICE FILTER BOTTOM SHEET MODAL (Matches Frame 2 in Screenshot)
          ============================================ */}
      {showPriceModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end p-0 font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-5 pb-6 max-h-[80%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            
            {/* Top Handle Line */}
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto" />

            {/* Header Title */}
            <h3 className="text-sm font-bold text-neutral-900 text-right px-1">
              بازه قیمت
            </h3>

            {/* Price Inputs Box */}
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-xs font-bold text-neutral-500">از</span>
              
              <div className="bg-pink-50/90 border border-pink-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-1 shadow-2xs">
                <input
                  type="text"
                  placeholder="۲۰۰,۰۰۰"
                  className="w-22 bg-transparent text-xs font-bold text-[#DB2777] outline-none text-center"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                />
                <span className="text-[11px] font-bold text-[#DB2777]">تومان</span>
              </div>

              <span className="text-xs font-bold text-neutral-500">تا</span>

              <div className="bg-pink-50/90 border border-pink-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-1 shadow-2xs">
                <input
                  type="text"
                  placeholder="۱,۵۰۰,۰۰۰"
                  className="w-22 bg-transparent text-xs font-bold text-[#DB2777] outline-none text-center"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                />
                <span className="text-[11px] font-bold text-[#DB2777]">تومان</span>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  setShowPriceModal(false);
                }}
                className="px-6 py-2 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                حذف
              </button>

              <button
                type="button"
                onClick={() => setShowPriceModal(false)}
                className="px-6 py-2 bg-[#DB2777] hover:bg-[#BE185D] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                تایید
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          SORT BOTTOM SHEET MODAL (Matches Frame 3 in Screenshot)
          ============================================ */}
      {showSortModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex flex-col justify-end p-0 font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-5 pb-6 max-h-[80%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            
            {/* Top Handle Line */}
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto" />

            {/* Header Title */}
            <h3 className="text-sm font-bold text-neutral-900 text-right px-1">
              مرتب‌سازی براساس
            </h3>

            {/* Options List */}
            <div className="space-y-1 divide-y divide-neutral-100 pt-1">
              {SORT_OPTIONS.map((s) => {
                const isSelected = sortBy === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSortBy(s);
                      setShowSortModal(false);
                    }}
                    className="w-full py-3.5 px-2 flex items-center justify-between text-right cursor-pointer group"
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-neutral-900' : 'text-neutral-600 group-hover:text-neutral-900'}`}>
                      {s}
                    </span>

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#DB2777] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-300 shrink-0 group-hover:border-neutral-400" />
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ============================================
          ADD NEW DESIGN MODAL FOR NAIL TECH OWNER
          ============================================ */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">افزودن نمونه‌کار جدید به ویترین</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Upload Box */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-700">عکس نمونه‌کار</label>
                <button
                  type="button"
                  onClick={() => handlePasteFromClipboardClick('design')}
                  className="text-[11px] font-bold text-[#DB2777] hover:bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200/60 flex items-center gap-1 cursor-pointer transition-all"
                  title="چسباندن عکس از کلپ‌بورد"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#DB2777]" />
                  <span>چسباندن عکس (Ctrl + V)</span>
                </button>
              </div>
              {uploadingDesign ? (
                <div className="w-full py-7 border-2 border-dashed border-[#DB2777] bg-pink-50/50 rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#DB2777] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-[#DB2777]">در حال آپلود عکس... شکیبا باشید</span>
                </div>
              ) : newDesign.image_url ? (
                <div className="relative aspect-square max-w-[140px] mx-auto rounded-2xl overflow-hidden border border-neutral-200">
                  <img src={newDesign.image_url} alt="New" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewDesign(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label 
                  onPaste={(e) => {
                    const file = getPastedImageFile(e);
                    if (file) {
                      e.preventDefault();
                      handleDesignImageUpload(file);
                    }
                  }}
                  className="w-full py-6 border-2 border-dashed border-neutral-300 hover:border-[#DB2777] bg-neutral-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all space-y-1.5"
                >
                  <Plus className="w-7 h-7 text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-700">انتخاب یا آپلود عکس نمونه‌کار</span>
                  <span className="text-[10px] font-bold text-[#DB2777] bg-pink-50/80 px-3 py-1 rounded-full border border-pink-200/60">
                    یا عکس را کپی کرده و اینجا Ctrl + V بزنید
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">عنوان طرح</label>
              <input
                type="text"
                placeholder="مثال: کاشت فرنچ با دیزاین یلدا"
                className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777]"
                value={newDesign.title}
                onChange={(e) => setNewDesign(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">قیمت (تومان)</label>
                <input
                  type="text"
                  placeholder="۷۰۰,۰۰۰"
                  className="w-full px-3.5 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                  value={newDesign.price}
                  onChange={(e) => setNewDesign(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">مدت زمان</label>
                <select
                  className="w-full px-3 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-right cursor-pointer"
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

            {/* Color Tag Selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-700">رنگ‌های به‌کار رفته</label>
                {!showAddColorInput && (
                  <button
                    type="button"
                    onClick={() => setShowAddColorInput(true)}
                    className="text-[11px] font-bold text-[#DB2777] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>افزودن رنگ جدید</span>
                  </button>
                )}
              </div>

              {showAddColorInput && (
                <div className="flex items-center gap-1.5 py-1">
                  <input
                    type="text"
                    placeholder="نام رنگ (مثال: شبرنگ، دیسکو)"
                    className="flex-1 px-3 py-2 bg-neutral-50 border border-pink-200 rounded-xl text-xs font-bold outline-none focus:border-[#DB2777]"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewColorTag}
                    className="px-3 py-2 bg-[#DB2777] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ثبت
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddColorInput(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {availableColorOptions.map(c => {
                  const selected = newDesign.selectedColors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setNewDesign(prev => ({
                          ...prev,
                          selectedColors: selected
                            ? prev.selectedColors.filter(item => item !== c.name)
                            : [...prev.selectedColors, c.name]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#DB2777] text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Tag Selection */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-700">سبک طرح</label>
                {!showAddStyleInput && (
                  <button
                    type="button"
                    onClick={() => setShowAddStyleInput(true)}
                    className="text-[11px] font-bold text-[#DB2777] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>افزودن سبک جدید</span>
                  </button>
                )}
              </div>

              {showAddStyleInput && (
                <div className="flex items-center gap-1.5 py-1">
                  <input
                    type="text"
                    placeholder="نام سبک (مثال: هلویی، ژورنالی)"
                    className="flex-1 px-3 py-2 bg-neutral-50 border border-pink-200 rounded-xl text-xs font-bold outline-none focus:border-[#DB2777]"
                    value={newStyleInput}
                    onChange={(e) => setNewStyleInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewStyleTag}
                    className="px-3 py-2 bg-[#DB2777] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ثبت
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStyleInput(false)}
                    className="p-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {availableStyleTags.filter(s => s !== 'همه').map(s => {
                  const selected = newDesign.selectedStyles.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setNewDesign(prev => ({
                          ...prev,
                          selectedStyles: selected
                            ? prev.selectedStyles.filter(item => item !== s)
                            : [...prev.selectedStyles, s]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#DB2777] text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddDesignSubmit}
                disabled={!newDesign.image_url || !newDesign.title || !newDesign.price || uploadingDesign}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold rounded-full transition-all cursor-pointer shadow-2xs"
              >
                ثبت در ویترین
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          EDIT EXISTING DESIGN MODAL FOR OWNER
          ============================================ */}
      {editingDesign && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">ویرایش نمونه‌کار</h3>
              <button
                type="button"
                onClick={() => setEditingDesign(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview / Upload */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-neutral-700">عکس نمونه‌کار</label>
                <button
                  type="button"
                  onClick={() => handlePasteFromClipboardClick('design')}
                  className="text-[11px] font-bold text-[#DB2777] hover:bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200/60 flex items-center gap-1 cursor-pointer transition-all"
                  title="چسباندن عکس از کلپ‌بورد"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#DB2777]" />
                  <span>چسباندن عکس (Ctrl + V)</span>
                </button>
              </div>
              {uploadingDesign ? (
                <div className="w-full py-7 border-2 border-dashed border-[#DB2777] bg-pink-50/50 rounded-2xl flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#DB2777] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-[#DB2777]">در حال آپلود عکس... شکیبا باشید</span>
                </div>
              ) : editDesignForm.image_url ? (
                <div 
                  onPaste={(e) => {
                    const file = getPastedImageFile(e);
                    if (file) {
                      e.preventDefault();
                      handleDesignImageUpload(file);
                    }
                  }}
                  className="relative aspect-square max-w-[140px] mx-auto rounded-2xl overflow-hidden border border-neutral-200 group"
                >
                  <img src={editDesignForm.image_url} alt="Edit" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-black/50 hover:bg-black/70 transition-all flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 space-y-1 p-2 text-center">
                    <Pencil className="w-5 h-5" />
                    <span className="text-[10px] font-bold">تغییر عکس یا Ctrl + V</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <label 
                  onPaste={(e) => {
                    const file = getPastedImageFile(e);
                    if (file) {
                      e.preventDefault();
                      handleDesignImageUpload(file);
                    }
                  }}
                  className="w-full py-6 border-2 border-dashed border-neutral-300 hover:border-[#DB2777] bg-neutral-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all space-y-1.5"
                >
                  <Plus className="w-7 h-7 text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-700">آپلود عکس نمونه‌کار</span>
                  <span className="text-[10px] font-bold text-[#DB2777] bg-pink-50/80 px-3 py-1 rounded-full border border-pink-200/60">
                    یا عکس را کپی کرده و اینجا Ctrl + V بزنید
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleDesignImageUpload(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">عنوان طرح</label>
              <input
                type="text"
                className="w-full px-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777]"
                value={editDesignForm.title}
                onChange={(e) => setEditDesignForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">قیمت (تومان)</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                  value={editDesignForm.price}
                  onChange={(e) => setEditDesignForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700">مدت زمان</label>
                <select
                  className="w-full px-3 py-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-right cursor-pointer"
                  value={editDesignForm.duration}
                  onChange={(e) => setEditDesignForm(prev => ({ ...prev, duration: e.target.value }))}
                >
                  <option value="۱.۵ ساعت">۱.۵ ساعت</option>
                  <option value="۲ ساعت">۲ ساعت</option>
                  <option value="۲.۵ ساعت">۲.۵ ساعت</option>
                  <option value="۳ ساعت">۳ ساعت</option>
                </select>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">رنگ‌ها</label>
              <div className="flex flex-wrap gap-1.5">
                {availableColorOptions.map(c => {
                  const selected = editDesignForm.selectedColors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setEditDesignForm(prev => ({
                          ...prev,
                          selectedColors: selected
                            ? prev.selectedColors.filter(item => item !== c.name)
                            : [...prev.selectedColors, c.name]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#DB2777] text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Styles */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">سبک‌ها</label>
              <div className="flex flex-wrap gap-1.5">
                {availableStyleTags.filter(s => s !== 'همه').map(s => {
                  const selected = editDesignForm.selectedStyles.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setEditDesignForm(prev => ({
                          ...prev,
                          selectedStyles: selected
                            ? prev.selectedStyles.filter(item => item !== s)
                            : [...prev.selectedStyles, s]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#DB2777] text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions: Save & Delete */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDesignToDelete(editingDesign);
                  setEditingDesign(null);
                }}
                className="px-4 py-3.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>

              <button
                type="button"
                onClick={handleSaveEditDesign}
                disabled={!editDesignForm.title || !editDesignForm.price || uploadingDesign}
                className="flex-1 py-3.5 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-2xs"
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          EDIT PROFILE MODAL FOR OWNER
          ============================================ */}
      {showEditModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end font-sans" dir="rtl">
          <div className="bg-white rounded-t-[32px] p-6 max-h-[92%] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-full duration-200">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">ویرایش اطلاعات سالن</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center justify-center py-1 space-y-2">
              <label 
                onPaste={(e) => {
                  const file = getPastedImageFile(e);
                  if (file) {
                    e.preventDefault();
                    handleEditAvatarUpload(file);
                  }
                }}
                className="relative cursor-pointer group"
              >
                <div className="w-22 h-22 rounded-full overflow-hidden border-2 border-[#DB2777] p-0.5">
                  <img
                    src={editInfo.avatar_url || AVATAR_PLACEHOLDER}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="absolute bottom-0 left-0 bg-[#DB2777] text-white rounded-full p-1.5 shadow group-hover:bg-[#BE185D] transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleEditAvatarUpload(e.target.files?.[0] || null)}
                />
              </label>

              <button
                type="button"
                onClick={() => handlePasteFromClipboardClick('avatar')}
                className="text-[11px] font-bold text-[#DB2777] hover:bg-pink-50 px-3 py-1 rounded-full border border-pink-200/60 flex items-center gap-1 cursor-pointer transition-all"
                title="چسباندن تصویر از کلپ‌بورد"
              >
                <Clipboard className="w-3.5 h-3.5 text-[#DB2777]" />
                <span>چسباندن عکس با Ctrl + V</span>
              </button>

              {uploadingAvatar && (
                <span className="text-[10px] text-[#DB2777] font-bold animate-pulse">در حال آپلود...</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">نام سالن یا ناخن‌کار <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-right"
                value={editInfo.name || ''}
                onChange={(e) => setEditInfo(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 flex items-center justify-between">
                <span>نام کاربری / آدرس اختصاصی (URL Slug)</span>
                <span className="text-[10px] text-neutral-400 font-normal">انگلیسی</span>
              </label>
              <input
                type="text"
                placeholder="مثال: sara_nails"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                value={editInfo.slug || ''}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
                  setEditInfo(prev => ({ ...prev, slug: val, username: val }));
                }}
              />
              <p className="text-[11px] font-medium text-neutral-500 text-right">
                آدرس اختصاصی ویترین: <span className="text-[#DB2777] font-bold dir-ltr inline-block">vitrin.ir/vitrin/{editInfo.slug || 'username'}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">شهر محل فعالیت</label>
              <select
                className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-right cursor-pointer"
                value={editInfo.city || ''}
                onChange={(e) => setEditInfo(prev => ({ ...prev, city: e.target.value }))}
              >
                {POPULAR_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                {editInfo.city && !POPULAR_CITIES.includes(editInfo.city) && (
                  <option value={editInfo.city}>{editInfo.city}</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">آدرس سالن <span className="text-red-500">*</span></label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-right resize-none"
                value={editInfo.address || ''}
                onChange={(e) => setEditInfo(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5 text-[#DB2777]" />
                <span>آیدی اینستاگرام</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                value={editInfo.instagram || ''}
                onChange={(e) => setEditInfo(prev => ({ ...prev, instagram: e.target.value.replace('@', '').trim() }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                  <span>شماره واتس‌اپ</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                  value={editInfo.whatsapp || ''}
                  onChange={(e) => setEditInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-blue-500" />
                  <span>آیدی تلگرام</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold outline-none focus:border-[#DB2777] text-left dir-ltr"
                  value={editInfo.telegram || ''}
                  onChange={(e) => setEditInfo(prev => ({ ...prev, telegram: e.target.value }))}
                />
              </div>
            </div>

            {editError && (
              <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100 text-right">
                {editError}
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile || uploadingAvatar}
                className="w-full py-3.5 bg-[#DB2777] hover:bg-[#BE185D] text-white text-xs font-bold rounded-full disabled:opacity-60 cursor-pointer shadow-2xs"
              >
                {savingProfile ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          DELETE DESIGN CONFIRMATION FOR OWNER
          ============================================ */}
      {designToDelete && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-[28px] p-5 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto" />
            <div>
              <h3 className="text-xs font-extrabold text-neutral-900">حذف نمونه‌کار</h3>
              <p className="text-[11px] text-neutral-500 font-semibold mt-1.5 leading-relaxed">
                آیا از حذف «{designToDelete.title}» مطمئن هستید؟ این عمل غیرقابل بازگشت است.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeleteDesign}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-full transition-all cursor-pointer"
              >
                بله، حذف کن
              </button>
              <button
                type="button"
                onClick={() => setDesignToDelete(null)}
                className="w-1/2 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold rounded-full transition-all cursor-pointer"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

          </>
        )}

      </div>

    </div>
  );
}
