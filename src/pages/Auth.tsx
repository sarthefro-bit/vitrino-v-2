import {
  ArrowRight,
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  Home,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import OfflineWarningBanner from "../components/OfflineWarningBanner";
import {
  getAuthedEmail,
  isValidEmail,
  sendEmailOtp,
  signInWithGoogle,
  verifyEmailOtp,
} from "../lib/auth";
import { getPastedImageFile, readImageFromClipboard } from "../lib/clipboard";
import type { Design, NailTech } from "../lib/db";
import {
  addDesign,
  getNailTechByEmail,
  getNailTechBySlug,
  saveNailTech,
  setCurrentUserSession,
} from "../lib/db";
import { uploadImage } from "../lib/storage";

const POPULAR_CITIES = [
  "تهران",
  "کرج",
  "اصفهان",
  "شیراز",
  "مشهد",
  "تبریز",
  "یزد",
  "رشت",
];

const INITIAL_COLORS = [
  "بنفش",
  "سبز",
  "آبی",
  "صورتی",
  "قرمز",
  "نود",
  "سفید",
  "مشکی",
];

const INITIAL_STYLES = [
  "فانتزی",
  "آمبره",
  "عروسکی",
  "یلدا",
  "عروسی",
  "نامزدی",
  "ساده",
  "دیزاین",
];

function getColorDotClass(col: string): string {
  switch (col) {
    case "بنفش":
      return "bg-purple-500";
    case "سبز":
      return "bg-emerald-500";
    case "آبی":
      return "bg-blue-500";
    case "صورتی":
      return "bg-pink-400";
    case "قرمز":
      return "bg-red-500";
    case "نود":
      return "bg-amber-300";
    case "سفید":
      return "bg-neutral-100 border border-neutral-300";
    case "مشکی":
      return "bg-neutral-900";
    default:
      return "bg-[#DB2777]";
  }
}

// Build a URL-safe slug from the email's local part, e.g. sara.nails@x.com -> sara_nails
function slugFromEmail(email: string): string {
  const local = email.split("@")[0] || "";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || `salon_${crypto.randomUUID().slice(0, 6)}`;
}

export default function Auth() {
  const navigate = useNavigate();

  // Step-by-step flow (like Instagram onboarding):
  // 'email':   ask only for email
  // 'otp':     verify the code sent to that email
  // -- new users continue with profile completion: --
  // 'profile': salon name, mobile, city, instagram (required info)
  // 'socials': telegram, address (optional)
  // 'works':   upload نمونه‌کارها
  // 'avatar':  upload profile picture (optional/skip)
  // 'ready':   congrats, view vitrin, share link
  const [step, setStep] = useState<
    | "checking"
    | "email"
    | "otp"
    | "profile"
    | "socials"
    | "works"
    | "avatar"
    | "ready"
  >("checking");

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Profile completion state
  const [techInfo, setTechInfo] = useState<Partial<NailTech>>({
    name: "",
    city: "تهران",
    address: "",
    instagram: "",
    whatsapp: "",
    telegram: "",
    avatar_url: "",
    slug: "",
  });

  const [designs, setDesigns] = useState<Design[]>([]);

  const [hasWhatsapp, setHasWhatsapp] = useState(true);

  // Dynamic colors and styles lists
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Add work sample modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableColorOptions, setAvailableColorOptions] = useState(
    INITIAL_COLORS.map((c) => ({ name: c, dotClass: getColorDotClass(c) })),
  );
  const [availableStyleTags, setAvailableStyleTags] =
    useState<string[]>(INITIAL_STYLES);
  const [showAddColorInput, setShowAddColorInput] = useState(false);
  const [newColorInput, setNewColorInput] = useState("");
  const [showAddStyleInput, setShowAddStyleInput] = useState(false);
  const [newStyleInput, setNewStyleInput] = useState("");

  const [newDesign, setNewDesign] = useState<{
    image_url: string;
    title: string;
    tags: string[];
    price: string;
    duration: string;
    selectedColors: string[];
    selectedStyles: string[];
  }>({
    image_url: "",
    title: "",
    tags: [],
    price: "",
    duration: "۲ ساعت",
    selectedColors: ["صورتی"],
    selectedStyles: ["فانتزی"],
  });

  const handleAddNewColorTag = () => {
    if (!newColorInput.trim()) return;
    const name = newColorInput.trim();
    if (!availableColorOptions.some((c) => c.name === name)) {
      setAvailableColorOptions((prev) => [
        ...prev,
        { name, dotClass: "bg-pink-400" },
      ]);
    }
    setNewDesign((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.includes(name)
        ? prev.selectedColors
        : [...prev.selectedColors, name],
    }));
    setNewColorInput("");
    setShowAddColorInput(false);
  };

  const handleAddNewStyleTag = () => {
    if (!newStyleInput.trim()) return;
    const tag = newStyleInput.trim();
    if (!availableStyleTags.includes(tag)) {
      setAvailableStyleTags((prev) => [...prev, tag]);
    }
    setNewDesign((prev) => ({
      ...prev,
      selectedStyles: prev.selectedStyles.includes(tag)
        ? prev.selectedStyles
        : [...prev.selectedStyles, tag],
    }));
    setNewStyleInput("");
    setShowAddStyleInput(false);
  };

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live clock
  const [, setCurrentTime] = useState("09:41");

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
    setTechInfo((prev) => ({
      ...prev,
      email: authedEmail,
      slug: prev.slug || slugFromEmail(authedEmail),
    }));
    setStep("profile");
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
        window.history.replaceState(null, "", window.location.pathname);
      }

      if (authedEmail) {
        await routeAuthedEmail(authedEmail);
      } else {
        setStep("email");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 60000);

    // Secret demo data fill (Spacebar) on profile completion steps
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        (step === "profile" || step === "socials" || step === "works")
      ) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (
          activeTag === "input" &&
          (document.activeElement as HTMLInputElement).value.trim().length > 0
        ) {
          return;
        }
        if (activeTag === "textarea") return;

        e.preventDefault();
        setTechInfo((prev) => ({
          ...prev,
          name: "سالن تخصصی سارا نیلز",
          city: "تهران",
          address: "تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۱۲",
          instagram: "sara_nailart",
          whatsapp: "09127579476",
          telegram: "sara_nailart",
          avatar_url: "",
        }));

        const sampleDesigns: Design[] = [
          {
            id: crypto.randomUUID(),
            tech_id: "temp",
            title: "ژلیش صورتی کریستالی با دیزاین اکلیل",
            image_url:
              "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&h=500&fit=crop",
            tags: ["صورتی", "فانتزی"],
            price: 380000,
            duration: 120,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            tech_id: "temp",
            title: "کاشت آکریلیک فرانسوی مات",
            image_url:
              "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=500&h=500&fit=crop",
            tags: ["سفید", "فرنچ"],
            price: 450000,
            duration: 150,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            tech_id: "temp",
            title: "دیزاین تابستانی آبرنگی بنفش",
            image_url:
              "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&h=500&fit=crop",
            tags: ["بنفش", "آمبره"],
            price: 520000,
            duration: 180,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        setDesigns(sampleDesigns);
        setNotice("داده‌های آزمایشی میانبر با موفقیت جایگذاری شدند.");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [step]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Handle clicking outside city dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ============================================
  // STEP HANDLERS
  // ============================================

  const handleSendOtp = async () => {
    setError("");
    setNotice("");
    const cleaned = email.trim().toLowerCase();

    if (!isValidEmail(cleaned)) {
      setError("لطفاً یک ایمیل معتبر وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendEmailOtp(cleaned);
      if (!result.ok) {
        setError(result.error || "ارسال کد با خطا مواجه شد.");
        return;
      }
      setEmail(cleaned);
      setOtpCode("");
      setDemoCode(result.demoCode || null);
      setResendCooldown(60);
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setNotice("");

    if (otpCode.trim().length < 6) {
      setError("کد ارسال شده را کامل وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailOtp(email, otpCode);
      if (!result.ok) {
        setError(result.error || "کد وارد شده نادرست است.");
        return;
      }
      await routeAuthedEmail(email);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setError(result.error || "ورود با گوگل با خطا مواجه شد.");
      setLoading(false);
    }
    // On success the browser redirects to Google; nothing else to do here.
  };

  const handleProfileNext = () => {
    setError("");
    if (!techInfo.name?.trim()) {
      setError("نام آرایشگاه الزامی است.");
      return;
    }
    if (!techInfo.whatsapp?.trim()) {
      setError("شماره موبایل الزامی است.");
      return;
    }
    if (!techInfo.city?.trim()) {
      setError("انتخاب شهر الزامی است.");
      return;
    }
    if (!techInfo.instagram?.trim()) {
      setError("آیدی اینستاگرام الزامی است.");
      return;
    }
    if (!techInfo.address?.trim()) {
      setTechInfo((prev) => ({ ...prev, address: prev.city || "تهران" }));
    }
    setStep("socials");
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const url = await uploadImage(
        file,
        "avatars",
        `avatars/${crypto.randomUUID().slice(0, 8)}`,
      );
      if (url) {
        setTechInfo((prev) => ({ ...prev, avatar_url: url }));
      } else {
        setError("خطا در آپلود تصویر پروفایل");
      }
    } catch {
      setError("خطا در آپلود تصویر پروفایل");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleWorksNext = () => {
    if (designs.length === 0) {
      setError("لطفاً حداقل یک نمونه‌کار وارد کنید.");
      return;
    }
    setError("");
    setStep("avatar");
  };

  const handleDesignImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingDesign(true);
    setError("");
    try {
      const url = await uploadImage(file, "designs", "temp");
      if (url) {
        setNewDesign((prev) => ({ ...prev, image_url: url }));
      } else {
        setError("خطا در آپلود تصویر نمونه‌کار");
      }
    } catch {
      setError("خطا در آپلود تصویر نمونه‌کار");
    } finally {
      setUploadingDesign(false);
    }
  };

  // Global paste handler for Ctrl+V
  useEffect(() => {
    if (!showAddModal && step !== "avatar") return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const file = getPastedImageFile(e);
      if (file) {
        e.preventDefault();
        if (showAddModal) {
          handleDesignImageUpload(file);
        } else if (step === "avatar") {
          handleAvatarUpload(file);
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [showAddModal, step]);

  const handlePasteFromClipboardClick = async (target: "design" | "avatar") => {
    const file = await readImageFromClipboard();
    if (file) {
      if (target === "design") {
        handleDesignImageUpload(file);
      } else {
        handleAvatarUpload(file);
      }
    } else {
      alert(
        "تصویری در حافظه کپی (Clipboard) یافت نشد. عکسی را کپی کرده و Ctrl + V را فشار دهید.",
      );
    }
  };

  const handleAddWorkSample = () => {
    if (!newDesign.image_url) {
      setError("لطفاً تصویر نمونه‌کار را آپلود کنید.");
      return;
    }
    if (!newDesign.title.trim()) {
      setError("عنوان نمونه‌کار الزامی است.");
      return;
    }
    if (!newDesign.price) {
      setError("لطفاً قیمت را وارد کنید.");
      return;
    }

    const priceNum = parseInt(newDesign.price.replace(/,/g, "")) || 0;

    let durationMins = 120;
    if (newDesign.duration.includes("۳")) durationMins = 180;
    else if (newDesign.duration.includes("۲.۵")) durationMins = 150;
    else if (newDesign.duration.includes("۲")) durationMins = 120;
    else if (newDesign.duration.includes("۱.۵")) durationMins = 90;
    else if (newDesign.duration.includes("۱")) durationMins = 60;
    else if (newDesign.duration.includes("۳۰")) durationMins = 30;

    const allTags = Array.from(
      new Set([...newDesign.selectedColors, ...newDesign.selectedStyles]),
    );

    const sample: Design = {
      id: crypto.randomUUID(),
      tech_id: "temp",
      title: newDesign.title,
      image_url: newDesign.image_url,
      tags: allTags.length > 0 ? allTags : ["ساده"],
      price: priceNum,
      duration: durationMins,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDesigns((prev) => [...prev, sample]);
    setNewDesign({
      image_url: "",
      title: "",
      tags: [],
      price: "",
      duration: "۲ ساعت",
      selectedColors: ["صورتی"],
      selectedStyles: ["فانتزی"],
    });
    setShowAddModal(false);
    setError("");
  };

  const handleFinalSubmit = async () => {
    if (designs.length === 0) {
      setError("لطفاً حداقل یک نمونه‌کار وارد کنید.");
      return;
    }

    setLoading(true);
    setError("");
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
        name: techInfo.name || "",
        city: techInfo.city || "تهران",
        address: techInfo.address || "",
        instagram: techInfo.instagram || "",
        whatsapp: techInfo.whatsapp || "",
        telegram: techInfo.telegram || "",
        avatar_url: techInfo.avatar_url || "",
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

        setStep("ready");
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      console.error(err);
      setError("خطا در ذخیره‌سازی نهایی ویترین");
    } finally {
      setLoading(false);
    }
  };

  const getFullShareUrl = () => {
    const slug = techInfo.slug || "profile";
    const baseUrl = window.location.origin;
    return `${baseUrl}/vitrin/${slug}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getFullShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredCities = POPULAR_CITIES.filter((c) =>
    c.includes(citySearchQuery.trim()),
  );

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
    <div
      className="min-h-screen bg-[#E5E7EB] sm:bg-[#F3F4F6] flex items-center justify-center p-0 md:py-8"
      dir="rtl"
    >
      <div className="phone-mockup-wrapper md:max-w-[700px] md:h-auto md:min-h-[850px] md:border-none md:rounded-[32px] md:shadow-[0_12px_45px_rgba(0,0,0,0.06)] bg-neutral-50 flex flex-col relative text-[#1F2937] font-sans">
        <OfflineWarningBanner />

        {step === "checking" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center gap-4 min-h-[500px]">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 rounded-full bg-[#DB2777] animate-bounce" />
            </div>
            <p className="text-xs font-bold text-neutral-400">
              در حال بررسی وضعیت ورود...
            </p>
          </div>
        )}

        {/* ============================================
            STEP 1: EMAIL ONLY
            ============================================ */}
        {step === "email" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white min-h-[600px] text-right"
            dir="rtl"
          >
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-all rounded-full hover:bg-neutral-50"
                title="بازگشت به لیست"
              >
                <Home className="w-5 h-5" />
              </button>
              <div className="w-5" />
            </div>

            {/* Centered Email Form Input */}
            <div className="my-auto space-y-3 w-full max-w-sm mx-auto pt-8 pb-12">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-800 flex items-center justify-start gap-1 text-right">
                  <span>ایمیل</span>
                  <span className="text-[#DB2777] font-bold">*</span>
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ایمیل خود را وارد کنید."
                  className="w-full px-5 py-4 bg-white border border-neutral-200 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-right dir-rtl"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendOtp();
                  }}
                />
              </div>

              {errorBox}
            </div>

            {/* Bottom Actions & Terms Notice */}
            <div className="space-y-3.5 pb-2 w-full max-w-sm mx-auto">
              {/* Terms & Privacy Notice */}
              <p className="text-[11px] text-neutral-400 font-normal text-center leading-relaxed px-1">
                ورود یا ثبت نام به معنای پذیرش{" "}
                <span className="text-[#DB2777] font-bold cursor-pointer hover:underline">
                  قوانین و حریم خصوصی
                </span>{" "}
                این اپلیکیشن می‌باشد.
              </p>

              {/* Main Submit Button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                {loading ? "در حال ارسال کد..." : "ورود"}
              </button>

              {/* Google Sign In Option */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 text-xs font-semibold rounded-full text-center transition-all cursor-pointer border border-neutral-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>ورود با حساب گوگل</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 2: OTP CODE
            ============================================ */}
        {step === "otp" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white min-h-[600px] text-right"
            dir="rtl"
          >
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtpCode("");
                  setError("");
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-all rounded-full hover:bg-neutral-50"
                title="تغییر ایمیل"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="w-5" />
            </div>

            {/* Centered OTP Form Input */}
            <div className="my-auto space-y-3 w-full max-w-sm mx-auto pt-8 pb-12">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-800 flex items-center justify-start gap-1 text-right">
                  <span>کد تأیید</span>
                  <span className="text-[#DB2777] font-bold">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  placeholder="کد تأیید را وارد کنید."
                  className="w-full px-5 py-4 bg-white border border-neutral-200 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-center dir-ltr tracking-widest"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(
                      e.target.value
                        .replace(/[^0-9۰-۹]/g, "")
                        .replace(/[۰-۹]/g, (d) =>
                          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)),
                        ),
                    );
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyOtp();
                  }}
                />
              </div>

              {demoCode && (
                <div className="bg-amber-50 text-amber-600 px-4 py-3 rounded-[16px] text-[11px] font-bold border border-amber-100 text-right leading-relaxed">
                  حالت دمو (بدون اتصال سرور): کد تأیید شما{" "}
                  <span className="font-mono text-sm tracking-widest">
                    {demoCode}
                  </span>{" "}
                  است.
                </div>
              )}

              {errorBox}

              <div className="flex items-center justify-between text-[11px] font-bold pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleSendOtp}
                  className="text-[#DB2777] disabled:text-neutral-300 transition-all cursor-pointer disabled:cursor-default"
                >
                  {resendCooldown > 0
                    ? `ارسال مجدد کد تا ${resendCooldown.toLocaleString("fa-IR")} ثانیه دیگر`
                    : "ارسال مجدد کد"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtpCode("");
                    setError("");
                  }}
                  className="text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer"
                >
                  تغییر ایمیل
                </button>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="space-y-3.5 pb-2 w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                {loading ? "در حال بررسی کد..." : "تأیید و ادامه"}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 3: PROFILE BASICS (SALON NAME, MOBILE, CITY, INSTAGRAM)
            ============================================ */}
        {step === "profile" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white overflow-y-auto no-scrollbar text-right"
            dir="rtl"
          >
            <div className="space-y-4 w-full max-w-sm mx-auto">
              {/* Header Pill Box */}
              <div className="bg-white border border-neutral-200/80 rounded-[28px] py-4 px-6 text-center shadow-2xs">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  ثبت‌نام
                </h2>
                <p className="text-xs text-neutral-400 font-normal mt-1">
                  لطفا اطلاعات زیر را تکمیل نمایید
                </p>
              </div>

              {/* Main Card Container */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 space-y-4">
                {/* Salon / Tech Name */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center justify-start gap-1">
                    <span>نام آرایشگاه</span>
                    <span className="text-[#DB2777] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="نام آرایشگاه را وارد کنید."
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-right dir-rtl"
                    value={techInfo.name || ""}
                    onChange={(e) => {
                      setTechInfo((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }));
                      setError("");
                    }}
                  />
                </div>

                {/* Mobile / Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center justify-start gap-1">
                    <span>شماره موبایل</span>
                    <span className="text-[#DB2777] font-bold">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="مثال: ۰۹۲۲۶۰۷۹۴۷۶"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-right dir-ltr"
                    value={techInfo.whatsapp || ""}
                    onChange={(e) => {
                      setTechInfo((prev) => ({
                        ...prev,
                        whatsapp: e.target.value,
                      }));
                      setError("");
                    }}
                  />
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasWhatsapp}
                      onChange={(e) => setHasWhatsapp(e.target.checked)}
                      className="w-4 h-4 accent-[#DB2777] rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-neutral-600 font-medium">
                      این شماره دارای واتس‌اپ می‌باشد و می‌خواهم متصل شود
                    </span>
                  </label>
                </div>

                {/* City Dropdown */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center justify-start gap-1">
                    <span>شهر</span>
                    <span className="text-[#DB2777] font-bold">*</span>
                  </label>
                  <button
                    type="button"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 flex justify-between items-center text-right cursor-pointer focus:outline-none focus:border-[#DB2777]"
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                  >
                    <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />
                    <span
                      className={
                        techInfo.city ? "text-neutral-800" : "text-neutral-300"
                      }
                    >
                      {techInfo.city ||
                        "شهری که در آن فعالیت می‌کنید را وارد کنید."}
                    </span>
                  </button>

                  {showCityDropdown && (
                    <div
                      ref={cityDropdownRef}
                      className="absolute z-30 left-0 right-0 mt-2 bg-white rounded-[20px] border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[220px]"
                    >
                      <div className="p-3 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50">
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
                            className="w-full px-5 py-3 text-right text-xs hover:bg-pink-50/40 flex justify-between items-center font-semibold"
                            onClick={() => {
                              setTechInfo((prev) => ({ ...prev, city: c }));
                              setShowCityDropdown(false);
                            }}
                          >
                            <span
                              className={
                                techInfo.city === c
                                  ? "text-[#DB2777] font-bold"
                                  : "text-neutral-700"
                              }
                            >
                              {c}
                            </span>
                            {techInfo.city === c && (
                              <Check className="w-4 h-4 text-[#DB2777]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Instagram Handle */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center justify-start gap-1">
                    <span>آیدی اینستاگرام</span>
                    <span className="text-[#DB2777] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: salon_esmet"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-left dir-ltr"
                    value={techInfo.instagram || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace("@", "").trim();
                      setTechInfo((prev) => ({ ...prev, instagram: val }));
                      setError("");
                    }}
                  />
                </div>

                {/* Custom Username / URL Slug */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span>نام کاربری / آدرس اختصاصی (URL)</span>
                      <span className="text-[#DB2777] font-bold">*</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      انگلیسی
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: maral_nails"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] focus:ring-1 focus:ring-[#DB2777] transition-all text-left dir-ltr"
                    value={techInfo.slug || ""}
                    onChange={(e) => {
                      const val = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, "")
                        .trim();
                      setTechInfo((prev) => ({
                        ...prev,
                        slug: val,
                        username: val,
                      }));
                      setError("");
                    }}
                  />
                  <p className="text-[11px] font-medium text-neutral-500 text-right">
                    آدرس لینک اختصاصی ویترین شما:{" "}
                    <span className="text-[#DB2777] font-bold dir-ltr inline-block">
                      vitrin.ir/vitrin/
                      {techInfo.slug || slugFromEmail(email) || "username"}
                    </span>
                  </p>
                </div>
              </div>

              {noticeBox}
              {errorBox}
            </div>

            {/* Bottom Submit Button */}
            <div className="pb-2 pt-4 w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleProfileNext}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm"
              >
                مرحله بعد
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 4: SOCIAL LINKS (OPTIONAL)
            ============================================ */}
        {step === "socials" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white overflow-y-auto no-scrollbar text-right"
            dir="rtl"
          >
            <div className="space-y-4 w-full max-w-sm mx-auto">
              {/* Header Pill Box */}
              <div className="bg-white border border-neutral-200/80 rounded-[28px] py-4 px-6 text-center shadow-2xs">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  اطلاعات تکمیلی
                </h2>
                <p className="text-xs text-neutral-400 font-normal mt-1">
                  افزودن شبکه‌های اجتماعی و آدرس (اختیاری)
                </p>
              </div>

              {/* Main Card Container */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 space-y-4">
                {/* Telegram ID */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 block">
                    آیدی تلگرام
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: salon_id"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] text-left dir-ltr"
                    value={techInfo.telegram || ""}
                    onChange={(e) =>
                      setTechInfo((prev) => ({
                        ...prev,
                        telegram: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-neutral-800 block">
                    آدرس سالن
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مثال: تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۱۲"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] text-right resize-none"
                    value={techInfo.address || ""}
                    onChange={(e) =>
                      setTechInfo((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {noticeBox}
              {errorBox}
            </div>

            {/* Bottom Button */}
            <div className="pb-2 pt-4 w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setStep("works")}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm"
              >
                مرحله بعد: افزودن نمونه‌کارها
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 5: UPLOADING WORKS
            ============================================ */}
        {step === "works" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white overflow-y-auto no-scrollbar text-right"
            dir="rtl"
          >
            <div className="space-y-4 w-full max-w-sm mx-auto">
              {/* Card container for sample works */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 space-y-4">
                <label className="text-sm font-bold text-neutral-800 block text-right">
                  نمونه‌کار <span className="text-[#DB2777]">*</span>
                </label>

                {/* List of added works */}
                {designs.length > 0 && (
                  <div className="space-y-3">
                    {designs.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-neutral-200/80 rounded-[20px] p-3.5 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-16 h-16 rounded-[16px] object-cover bg-neutral-100 border border-neutral-200/60 shrink-0"
                        />
                        <div className="min-w-0 text-right flex-1 space-y-1">
                          <h4 className="text-xs font-bold text-neutral-800 truncate">
                            {item.title}
                          </h4>
                          <span className="inline-block bg-neutral-100 text-neutral-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium">
                            {item.duration} دقیقه
                          </span>
                          <p className="text-xs font-bold text-[#DB2777]">
                            {item.price.toLocaleString("fa-IR")} تومان
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setDesigns((prev) =>
                              prev.filter((d) => d.id !== item.id),
                            )
                          }
                          className="p-2 text-neutral-400 hover:text-red-500 shrink-0 cursor-pointer"
                          title="حذف نمونه‌کار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Big Dashed Pink Button for Adding Work Sample */}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="w-full border-2 border-dashed border-[#DB2777] bg-white rounded-[24px] py-8 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-pink-50/20 transition-all text-[#DB2777]"
                >
                  <Plus className="w-8 h-8 text-[#DB2777]" />
                  <span className="text-xs font-bold">افزودن نمونه‌کار</span>
                </button>

                <p className="text-xs text-neutral-400 font-normal text-center pt-1">
                  حداقل باید سه نمونه‌کار وارد کنید.
                </p>
              </div>

              {noticeBox}
              {errorBox}
            </div>

            {/* Bottom Action Button */}
            <div className="pb-2 pt-4 w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleWorksNext}
                disabled={loading || uploadingDesign}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                مرحله بعد: عکس پروفایل
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 6: PROFILE PICTURE (AVATAR)
            ============================================ */}
        {step === "avatar" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white overflow-y-auto no-scrollbar text-right"
            dir="rtl"
          >
            <div className="my-auto space-y-6 w-full max-w-sm mx-auto text-center">
              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  عکس پروفایل
                </h2>
                <p className="text-xs text-neutral-400 font-normal">
                  لطفاً عکس پروفایل خود را وارد کنید.
                </p>
              </div>

              {/* Dashed Circular Image Uploader */}
              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                {techInfo.avatar_url ? (
                  <div className="relative">
                    <div className="w-44 h-44 rounded-full overflow-hidden border-2 border-[#DB2777] p-1 bg-white shadow-sm">
                      <img
                        src={techInfo.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTechInfo((prev) => ({ ...prev, avatar_url: "" }))
                      }
                      className="absolute top-2 left-2 bg-white text-neutral-700 rounded-full p-2 shadow border border-neutral-200 cursor-pointer hover:bg-neutral-50"
                      title="حذف عکس"
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
                        handleAvatarUpload(file);
                      }
                    }}
                    className="w-44 h-44 border-2 border-dashed border-[#DB2777] bg-pink-50/20 hover:bg-pink-50/40 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all space-y-1"
                  >
                    <Plus className="w-8 h-8 text-[#DB2777]" />
                    <span className="text-[11px] font-bold text-[#DB2777]">
                      انتخاب یا آپلود عکس
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleAvatarUpload(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                )}

                <button
                  type="button"
                  onClick={() => handlePasteFromClipboardClick("avatar")}
                  className="text-xs font-bold text-[#DB2777] bg-pink-50/80 hover:bg-pink-100/80 px-3.5 py-1.5 rounded-full border border-pink-200/80 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[#DB2777]" />
                  <span>چسباندن عکس با Ctrl + V</span>
                </button>
              </div>

              {uploadingAvatar && (
                <p className="text-xs text-[#DB2777] font-bold text-center animate-pulse">
                  در حال آپلود عکس...
                </p>
              )}

              {noticeBox}
              {errorBox}
            </div>

            {/* Bottom Action Button in exact same place & style */}
            <div className="pb-2 pt-4 w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading || uploadingAvatar}
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                {loading
                  ? "در حال راه‌اندازی ویترین..."
                  : techInfo.avatar_url
                    ? "ثبت و راه‌اندازی ویترین"
                    : "رد شدن و راه‌اندازی ویترین"}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            STEP 7: READY CONGRATS & SHARE LINK
            ============================================ */}
        {step === "ready" && (
          <div
            className="flex-1 flex flex-col justify-between px-6 py-6 bg-white overflow-y-auto no-scrollbar text-right"
            dir="rtl"
          >
            <div className="space-y-4 w-full max-w-sm mx-auto my-auto">
              {/* Header Pill Box / Congrats */}
              <div className="bg-white border border-neutral-200/80 rounded-[28px] py-8 px-6 text-center shadow-2xs space-y-3">
                <div className="w-16 h-16 rounded-full bg-pink-50 text-[#DB2777] mx-auto flex items-center justify-center border border-pink-100/80">
                  <Check className="w-8 h-8 text-[#DB2777]" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                  ویترین شما آماده است!
                </h2>
                <p className="text-xs text-neutral-400 font-normal leading-relaxed">
                  ویترین آنلاین شما با موفقیت ساخته شد. می‌توانید لینک اختصاصی
                  زیر را در بیو اینستاگرام خود قرار دهید.
                </p>
              </div>

              {/* Share Link Card */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] p-4 text-center space-y-2.5">
                <span className="text-xs font-bold text-neutral-500 block">
                  لینک اختصاصی ویترین شما
                </span>

                <div className="bg-white border border-neutral-200 rounded-full py-3 px-4 text-xs font-mono text-[#DB2777] dir-ltr text-center truncate shadow-2xs">
                  {getFullShareUrl()}
                </div>
              </div>
            </div>

            {/* Bottom Actions: View Vitrin button first in exact button placement, then Copy Link */}
            <div className="pb-2 pt-4 w-full max-w-sm mx-auto space-y-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/vitrin/${techInfo.slug || "profile"}`)
                }
                className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] active:scale-[0.99] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-sm"
              >
                مشاهده ویترین من
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-full border border-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 font-bold">
                      لینک کپی شد!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-500" />
                    <span>کپی لینک اختصاصی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ============================================
            ADD WORK SAMPLE MODAL
            ============================================ */}
        {showAddModal && (
          <div
            className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end p-0 sm:p-4 text-right"
            dir="rtl"
          >
            <div className="bg-white rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 max-h-[92vh] overflow-y-auto no-scrollbar space-y-4 w-full max-w-md mx-auto shadow-2xl">
              {/* Modal Oval Header Bar */}
              <div className="bg-white border border-neutral-200/80 rounded-full py-3 px-5 flex items-center justify-between shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 transition-all rounded-full"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-neutral-900">
                  افزودن نمونه‌کار
                </h3>
                <div className="w-5" />
              </div>

              {/* Section 1: Image Upload Card */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] p-5 text-right space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-neutral-800 block">
                    عکس نمونه‌کار <span className="text-[#DB2777]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePasteFromClipboardClick("design")}
                    className="text-[11px] font-bold text-[#DB2777] hover:bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-200/60 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Clipboard className="w-3.5 h-3.5 text-[#DB2777]" />
                    <span>چسباندن عکس (Ctrl + V)</span>
                  </button>
                </div>
                <div className="flex justify-center py-2">
                  {newDesign.image_url ? (
                    <div className="relative w-28 h-28 rounded-[20px] overflow-hidden border border-neutral-200">
                      <img
                        src={newDesign.image_url}
                        alt="Work"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewDesign((prev) => ({ ...prev, image_url: "" }))
                        }
                        className="absolute top-1.5 left-1.5 bg-white text-neutral-700 rounded-full p-1 shadow border border-neutral-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
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
                      className="w-full py-6 border-2 border-dashed border-[#DB2777] bg-white rounded-[20px] flex flex-col items-center justify-center cursor-pointer hover:bg-pink-50/30 transition-all text-[#DB2777] space-y-1"
                    >
                      <Plus className="w-8 h-8 text-[#DB2777]" />
                      <span className="text-xs font-bold">
                        انتخاب یا آپلود عکس
                      </span>
                      <span className="text-[10px] font-bold bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100/80">
                        یا عکس را کپی کرده و Ctrl + V بزنید
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleDesignImageUpload(e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  )}
                </div>
                {uploadingDesign && (
                  <div className="text-[11px] text-[#DB2777] font-bold text-center">
                    در حال آپلود عکس...
                  </div>
                )}
              </div>

              {/* Section 2: Details Card (Title, Price, Duration) */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] p-5 space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    عنوان <span className="text-[#DB2777]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ناخن آمبره قرمز رنگ"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] text-right"
                    value={newDesign.title}
                    onChange={(e) =>
                      setNewDesign((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    قیمت <span className="text-[#DB2777]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: ۵۰۰,۰۰۰"
                    className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-[#DB2777] text-right dir-ltr"
                    value={newDesign.price}
                    onChange={(e) =>
                      setNewDesign((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 block">
                    مدت‌زمان <span className="text-[#DB2777]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full px-5 py-4 bg-white border border-neutral-200/80 rounded-[18px] text-xs sm:text-sm font-medium text-neutral-800 focus:outline-none focus:border-[#DB2777] text-right appearance-none cursor-pointer"
                      value={newDesign.duration}
                      onChange={(e) =>
                        setNewDesign((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                    >
                      <option value="مدت زمان طراحی را وارد کنید.">
                        مدت زمان طراحی را وارد کنید.
                      </option>
                      <option value="۱ ساعت">۱ ساعت</option>
                      <option value="۱.۵ ساعت">۱.۵ ساعت</option>
                      <option value="۲ ساعت">۲ ساعت</option>
                      <option value="۲.۵ ساعت">۲.۵ ساعت</option>
                      <option value="۳ ساعت">۳ ساعت</option>
                    </select>
                    <ChevronDown className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Section 3: Color & Style Tags */}
              <div className="bg-[#F9F9F9] border border-neutral-200/70 rounded-[28px] p-5 space-y-4 text-right">
                {/* Color Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-neutral-800 block">
                      رنگ‌های به کار رفته{" "}
                      <span className="text-[#DB2777]">*</span>
                    </label>
                    {!showAddColorInput && (
                      <button
                        type="button"
                        onClick={() => setShowAddColorInput(true)}
                        className="text-[11px] font-bold text-[#DB2777] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن رنگ جدید</span>
                      </button>
                    )}
                  </div>

                  {showAddColorInput && (
                    <div className="flex items-center gap-1.5 py-1">
                      <input
                        type="text"
                        placeholder="نام رنگ (مثال: شبرنگ، دیسکو)"
                        className="flex-1 px-3.5 py-2 bg-white border border-pink-200 rounded-xl text-xs font-bold outline-none focus:border-[#DB2777]"
                        value={newColorInput}
                        onChange={(e) => setNewColorInput(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewColorTag}
                        className="px-3.5 py-2 bg-[#DB2777] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#BE185D]"
                      >
                        ثبت
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddColorInput(false)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {availableColorOptions.map((c) => {
                      const active = newDesign.selectedColors.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            setNewDesign((prev) => ({
                              ...prev,
                              selectedColors: active
                                ? prev.selectedColors.filter(
                                    (item) => item !== c.name,
                                  )
                                : [...prev.selectedColors, c.name],
                            }));
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? "bg-[#DB2777] text-white border-[#DB2777] shadow-2xs font-bold"
                              : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`}
                          />
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Style Selection */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-neutral-800 block">
                      سبک‌های طرح <span className="text-[#DB2777]">*</span>
                    </label>
                    {!showAddStyleInput && (
                      <button
                        type="button"
                        onClick={() => setShowAddStyleInput(true)}
                        className="text-[11px] font-bold text-[#DB2777] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن سبک جدید</span>
                      </button>
                    )}
                  </div>

                  {showAddStyleInput && (
                    <div className="flex items-center gap-1.5 py-1">
                      <input
                        type="text"
                        placeholder="نام سبک (مثال: هلویی، کروم، ژلیش)"
                        className="flex-1 px-3.5 py-2 bg-white border border-pink-200 rounded-xl text-xs font-bold outline-none focus:border-[#DB2777]"
                        value={newStyleInput}
                        onChange={(e) => setNewStyleInput(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewStyleTag}
                        className="px-3.5 py-2 bg-[#DB2777] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#BE185D]"
                      >
                        ثبت
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddStyleInput(false)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {availableStyleTags.map((st) => {
                      const active = newDesign.selectedStyles.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setNewDesign((prev) => ({
                              ...prev,
                              selectedStyles: active
                                ? prev.selectedStyles.filter(
                                    (item) => item !== st,
                                  )
                                : [...prev.selectedStyles, st],
                            }));
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            active
                              ? "bg-[#DB2777] text-white border-[#DB2777] shadow-2xs font-bold"
                              : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span>{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddWorkSample}
                  className="w-full py-4 bg-[#DB2777] hover:bg-[#BE185D] text-white text-sm font-bold rounded-full text-center transition-all cursor-pointer shadow-2xs"
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
