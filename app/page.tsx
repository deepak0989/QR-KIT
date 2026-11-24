"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Fingerprint,
  Moon,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  WandSparkles,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ProModal from "@/components/pro-modal";
import QrStudio from "@/components/qr-studio";
import { Design, initialDesign, QrType } from "@/lib/qr";

const templates: {
  title: string;
  description: string;
  type: QrType;
  values: Record<string, string>;
  colors: [string, string];
  background: string;
  cta: string;
}[] = [
  { title: "Restaurant menu", description: "Make the menu one scan away", type: "website", values: { url: "https://yourrestaurant.com/menu" }, colors: ["#6e3d2c", "#e7d6c5"], background: "#fffaf4", cta: "Scan for our menu" },
  { title: "Wi-Fi access", description: "Welcome guests without a password", type: "wifi", values: { ssid: "Your guest network", password: "Add your password", encryption: "WPA" }, colors: ["#395b70", "#8ac2cf"], background: "#f4fbfc", cta: "Scan to join Wi-Fi" },
  { title: "Instagram", description: "Grow your social community", type: "instagram", values: { username: "yourhandle" }, colors: ["#7d3fba", "#f17166"], background: "#fff8fc", cta: "Follow us on Instagram" },
  { title: "WhatsApp", description: "Start a conversation instantly", type: "whatsapp", values: { phone: "15551234567", message: "Hi! I’d love to know more." }, colors: ["#128c65", "#60c49a"], background: "#f4fcf8", cta: "Chat with us on WhatsApp" },
  { title: "Payment", description: "Make paying quick and simple", type: "payment", values: { url: "https://buy.stripe.com/your-payment-link" }, colors: ["#3849a5", "#8796f4"], background: "#f5f6ff", cta: "Scan to pay" },
  { title: "Event details", description: "Share the details and directions", type: "website", values: { url: "https://yourevent.com/details" }, colors: ["#9a5836", "#efbd70"], background: "#fffaf2", cta: "Scan for event details" },
  { title: "Business card", description: "Share contact info in a tap", type: "vcard", values: { name: "Your Name", company: "Your Company", title: "Your role", email: "hello@example.com", phone: "+1 555 123 4567" }, colors: ["#272b3f", "#7280a0"], background: "#f7f8fb", cta: "Save my contact" }
];

const features = [
  { icon: <ShieldCheck size={18} />, title: "Private by design", text: "Your QR content and logo stay in your browser. Only Pro order details and a UPI transaction reference are sent for manual payment review." },
  { icon: <WandSparkles size={18} />, title: "Designs that feel like you", text: "Choose colors, gradients, dot styles, a logo, and a call-to-action to fit your brand." },
  { icon: <Download size={18} />, title: "Ready to share", text: "Export a crisp PNG or a scalable Pro SVG, then use it online or in print." },
  { icon: <Smartphone size={18} />, title: "Made to scan", text: "Static QR codes work offline, and logo designs automatically use stronger correction." },
  { icon: <Zap size={18} />, title: "Fast by nature", text: "Create a QR code in seconds with no account, upload, or extra setup." },
  { icon: <Fingerprint size={18} />, title: "Yours to keep", text: "Save or restore a design locally with a portable JSON file whenever you like." }
];

const faqs = [
  ["Are these QR codes static?", "Yes. The QR code encodes your content directly. It does not depend on a QRcraft server or an account to keep working."],
  ["Is my information private?", "QR generation, logo processing, design files, and exports happen locally in your browser. If you buy Pro, your name, email, and UPI transaction reference are stored securely in Supabase for up to 90 days; QR content and uploaded logos are never sent."],
  ["Can I use a QR code for Wi-Fi?", "Yes. Choose Wi-Fi, enter the network name and password, and scan with a compatible phone camera to join."],
  ["Why does my logo increase error correction?", "A logo covers part of the code. We automatically use the strongest QR correction level to help phones recover the underlying data."],
  ["How do Pro unlocks work?", "Pay ₹9 using the UPI QR, submit your UTR, and wait for the QRcraft owner to match it in the bank app. After approval, your browser receives and validates a signed Pro license. UPI payment itself is reviewed manually."],
  ["Can I use the QR codes commercially?", "Free codes include a prominent QRcraft watermark. Pro is intended to include a commercial-use license; connect your live checkout and license terms before offering it."]
];

function Logo() {
  return <a className="brand" href="#" aria-label="QRcraft home"><span className="brand-mark"><QrCode size={18} /></span>QRcraft</a>;
}

export default function Home() {
  const [design, setDesign] = useState<Design>(initialDesign);
  const [isPro, setIsPro] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      let proUnlocked = false;
      const savedLicense = localStorage.getItem("qrcraft-license");
      localStorage.removeItem("qrcraft-pro");
      if (savedLicense) {
        const developmentUnlock = process.env.NODE_ENV !== "production" &&
          ["QRC-DEV-2026", "QRC-TEST-9-INR"].includes(savedLicense.toUpperCase());
        if (developmentUnlock) {
          proUnlocked = true;
        } else {
          try {
            const response = await fetch("/api/pro/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: savedLicense }),
              cache: "no-store"
            });
            proUnlocked = response.ok;
            if (!response.ok && response.status === 403) localStorage.removeItem("qrcraft-license");
          } catch {
            notify("Pro status could not be verified while offline. Reconnect and reload to restore Pro tools.");
          }
        }
      }
      if (!active) return;
      // Validate an issued license with the server before restoring paid features.
      setIsPro(proUnlocked);
      const saved = localStorage.getItem("qrcraft-design");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Design>;
        const validType = ["website", "text", "wifi", "email", "phone", "sms", "vcard", "payment", "instagram", "whatsapp"].includes(parsed?.type ?? "");
        if (parsed && typeof parsed === "object" && validType && parsed.values && typeof parsed.values === "object" && !Array.isArray(parsed.values)) {
          const restored = { ...initialDesign, ...parsed, values: { ...initialDesign.values, ...parsed.values } } as Design;
          if (!proUnlocked && restored.logo) {
            restored.logo = "";
            restored.logoName = "";
            restored.logoBackground = "none";
            notify("Logo upload is a Pro feature. Unlock Pro to keep using this saved logo.");
          }
          setDesign(restored);
        } else {
          notify("Saved design was invalid. Starting with a fresh design.");
        }
      }
    };
    void hydrate().catch(() => {
      if (active) notify("Local storage is unavailable or your saved design could not be read.");
    }).finally(() => {
      if (active) setReady(true);
    });
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        notify("Offline caching couldn't be enabled. QR generation still works in this open tab.");
      });
    }
    return () => {
      active = false;
      window.clearTimeout(toastTimer.current);
    };
  }, [notify]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("qrcraft-design", JSON.stringify(design));
    } catch {
      window.setTimeout(() => notify("This design is too large to save in browser storage. Export a JSON copy to keep it."), 0);
    }
  }, [design, ready, notify]);

  const unlock = useCallback(async (submitted: string, closeModal = true) => {
    const developmentCodes = ["QRC-DEV-2026", "QRC-TEST-9-INR"];
    const normalized = submitted.toUpperCase();
    const developmentUnlock = process.env.NODE_ENV !== "production" && developmentCodes.includes(normalized);
    if (!developmentUnlock) {
      let response: Response;
      try {
        response = await fetch("/api/pro/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: submitted }),
          cache: "no-store"
        });
      } catch {
        throw new Error("License validation is unavailable. Check your connection and try again.");
      }
      if (!response.ok) {
        if (response.status === 403 || response.status === 400) return false;
        let message = "License validation is temporarily unavailable.";
        try {
          const result = await response.json() as { error?: string };
          if (result.error) message = result.error;
        } catch {
          // Keep the actionable fallback when the API response isn't JSON.
        }
        throw new Error(message);
      }
    }
    try {
      localStorage.setItem("qrcraft-license", developmentUnlock ? normalized : submitted.trim());
      setIsPro(true);
      if (closeModal) setProOpen(false);
      notify(developmentUnlock ? "Development Pro mode is enabled on this device." : "QRcraft Pro is unlocked on this device.");
      return true;
    } catch {
      throw new Error("Browser storage is unavailable, so Pro could not be saved on this device.");
    }
  }, [notify]);

  const applyTemplate = (template: (typeof templates)[number]) => {
    setDesign((previous) => ({
      ...previous,
      type: template.type,
      values: { ...template.values },
      foreground: template.colors[0],
      gradientEnd: template.colors[1],
      background: template.background,
      gradient: true,
      cta: template.cta
    }));
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
    notify(`${template.title} template added to your studio.`);
  };

  return (
    <main className={`app-shell ${darkMode ? "dark-mode" : ""}`}>
      <header className="topbar">
        <Logo />
        <nav className="nav-actions" aria-label="Main navigation">
          <a className="nav-link" href="#studio">QR Studio</a>
          <a className="nav-link" href="#templates">Templates</a>
          <a className="nav-link" href="#pricing">Pricing</a>
          <button className="btn btn-ghost theme-toggle" aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`} onClick={() => setDarkMode((value) => !value)}>{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button>
          {isPro ? <span className="top-pro-badge"><Check size={13} /> PRO UNLOCKED</span> : <button className="btn btn-primary" onClick={() => setProOpen(true)}><Sparkles size={14} /> Go Pro · ₹9</button>}
        </nav>
      </header>

      <section className="hero">
        <span className="eyebrow"><Sparkles size={13} /> THE QR CODE DESIGN STUDIO</span>
        <h1>Create beautiful QR codes in seconds</h1>
        <p>Design custom, scannable QR codes for menus, Wi-Fi, links, payments, and events. No account required.</p>
        <div className="hero-cta">
          <a className="btn btn-primary" href="#studio">Create your QR code <ArrowRight size={15} /></a>
          <a className="btn btn-outline" href="#templates">Explore templates <ChevronRight size={15} /></a>
        </div>
        <div className="hero-foot"><span><Check size={13} /> Free to create</span><span><ShieldCheck size={13} /> Private by design</span><span><Zap size={13} /> Works in your browser</span></div>
      </section>

      <section className="studio-wrap" id="studio">
        <div className="studio-heading"><span className="eyebrow"><WandSparkles size={13} /> YOUR CREATIVE SPACE</span><h2>Make something worth scanning</h2><p>Choose what to share, style your code, and watch it come together.</p></div>
        <QrStudio design={design} setDesign={setDesign} isPro={isPro} onOpenPro={() => setProOpen(true)} onNotify={notify} />
      </section>

      <section className="section-wrap" id="templates">
        <div className="section-heading"><span className="eyebrow">A HEAD START FOR YOUR NEXT IDEA</span><h2>Start with a template</h2><p>Pick a starting point. Make the colors, content, and details your own.</p></div>
        <div className="template-grid">
          {templates.map((template, index) => (
            <button key={template.title} type="button" className="template-card" onClick={() => index === 6 && !isPro ? setProOpen(true) : applyTemplate(template)}>
              <div className="template-art" style={{ background: `linear-gradient(135deg, ${template.background}, ${template.colors[1]}20)` }}>
                <span style={{ color: template.colors[0] }}><QrCode size={35} strokeWidth={1.6} /></span>
              </div>
              <b>{template.title}</b><small>{template.description}</small>
              {index === 6 && <span className="template-badge"><Sparkles size={10} /> Pro</span>}
            </button>
          ))}
        </div>
        <div className="template-foot"><ArrowDown size={14} /> Choose a template to open it in your studio</div>
      </section>

      <section className="section-wrap feature-section">
        <div className="section-heading"><span className="eyebrow">SIMPLE TO MAKE. EASY TO TRUST.</span><h2>Everything you need, nothing you don’t</h2><p>A thoughtful QR code workflow built for people who care about the details.</p></div>
        <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.title}><div className="feature-icon">{feature.icon}</div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
      </section>

      <section className="pricing-wrap" id="pricing">
        <div className="section-wrap">
          <div className="section-heading"><span className="eyebrow">CLEAR, SIMPLE PRICING</span><h2>Start free. Go Pro when you’re ready.</h2><p>Make your first QR code for free. Upgrade for more ways to make it yours.</p></div>
          <div className="pricing-grid">
            <article className="price-card"><h3>Free</h3><p className="price">₹0 <small>forever</small></p><p className="price-desc">Everything you need to create and share.</p><ul className="price-list">{["Unlimited QR designs", "All QR content types", "Custom colors and styles", "Watermarked PNG downloads", "Local design save & restore"].map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul><a href="#studio" className="btn btn-outline full-width">Start creating <ArrowRight size={14} /></a></article>
            <article className="price-card pro"><span className="popular">ONE-TIME UNLOCK</span><h3>QRcraft Pro</h3><p className="price">₹9 <small>one-time</small></p><p className="price-desc">All Pro tools unlocked on this device.</p><ul className="price-list">{["Watermark-free PNG + SVG", "High-resolution PNG up to 2048px", "Logo uploads & premium templates", "Commercial-use license", "Browser-based CSV batch generation"].map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>{isPro ? <div className="pricing-unlocked"><Check size={15} /> Pro unlocked in this browser</div> : <button className="btn btn-primary full-width" onClick={() => setProOpen(true)}><Sparkles size={14} /> Unlock Pro · ₹9</button>}</article>
          </div>
          <p className="pricing-disclaimer">₹9 one-time via UPI. Payment is manually verified before a signed Pro code is issued. QR designs stay in your browser.</p>
        </div>
      </section>

      <section className="section-wrap faq-section" id="faq">
        <div className="section-heading"><span className="eyebrow">GOOD QUESTIONS</span><h2>Frequently asked</h2><p>A few helpful details before you get started.</p></div>
        <div className="faq-grid">{faqs.map(([question, answer]) => <article className="faq-item" key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div><Logo /><p>Thoughtful QR codes, made simple.</p></div>
          <div className="footer-note"><ShieldCheck size={15} /> QR content and images stay local; Pro UTRs are sent for manual payment review.</div>
          <span className="footer-copy">© 2026 QRcraft</span>
        </div>
      </footer>
      {proOpen && <ProModal onClose={() => setProOpen(false)} onUnlock={unlock} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
