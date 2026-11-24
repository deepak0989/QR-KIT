export type BusinessTemplateId =
  | "restaurant"
  | "cafe"
  | "salon"
  | "freelancer"
  | "local-shop"
  | "event"
  | "real-estate"
  | "home-services"
  | "tuition";

export type SectionKind = "about" | "services" | "gallery" | "testimonials" | "hours" | "contact" | "custom";

export type BusinessItem = {
  id: string;
  name: string;
  detail: string;
  price: string;
};

export type BusinessSection = {
  id: string;
  kind: SectionKind;
  title: string;
  body: string;
  items: BusinessItem[];
  images: string[];
};

export type BusinessPageData = {
  template: BusinessTemplateId;
  businessName: string;
  tagline: string;
  logo: string;
  cover: string;
  title: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  maps: string;
  ctaLabel: string;
  hostedUrl: string;
  primary: string;
  secondary: string;
  background: string;
  font: string;
  buttonStyle: "rounded" | "pill" | "square";
  theme: "light" | "dark";
  sections: BusinessSection[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  orderLink: string;
};

export type CatalogData = {
  businessName: string;
  logo: string;
  whatsapp: string;
  hostedUrl: string;
  primary: string;
  background: string;
  layout: "grid" | "list";
  products: CatalogProduct[];
};

export type BusinessCardData = {
  name: string;
  role: string;
  company: string;
  photo: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  hostedUrl: string;
  primary: string;
  background: string;
};

export type ReviewQrData = {
  url: string;
  cta: string;
  primary: string;
  background: string;
  logo: string;
  template: "table" | "poster";
};

export type UpiQrData = {
  upiId: string;
  payee: string;
  amount: string;
  note: string;
  cta: string;
  primary: string;
  background: string;
  logo: string;
  size: number;
};

export type ToolDesignKind = "business-page" | "catalog" | "business-card" | "google-review" | "upi-payment";
export type ToolDesignData = BusinessPageData | CatalogData | BusinessCardData | ReviewQrData | UpiQrData;

export type ToolDesign = {
  id: string;
  kind: ToolDesignKind;
  name: string;
  updatedAt: number;
  data: ToolDesignData;
};

export const TEMPLATE_OPTIONS: {
  id: BusinessTemplateId;
  title: string;
  description: string;
  businessName: string;
  tagline: string;
  primary: string;
  secondary: string;
  ctaLabel: string;
}[] = [
  { id: "restaurant", title: "Restaurant", description: "Menus, opening hours, and reservations.", businessName: "Your Restaurant", tagline: "Good food. Good company.", primary: "#a44d35", secondary: "#e5aa65", ctaLabel: "View our menu" },
  { id: "cafe", title: "Café", description: "Share your café, menu, and coffee.", businessName: "Your Café", tagline: "Your new favorite corner.", primary: "#75533e", secondary: "#c69263", ctaLabel: "Explore the menu" },
  { id: "salon", title: "Salon", description: "Show services, pricing, and booking details.", businessName: "Your Salon", tagline: "Feel like your best self.", primary: "#9b5875", secondary: "#e6a8b7", ctaLabel: "Book an appointment" },
  { id: "freelancer", title: "Freelancer", description: "Introduce your work and how to reach you.", businessName: "Your Name", tagline: "Independent creative partner.", primary: "#594fc7", secondary: "#a49df4", ctaLabel: "Let's work together" },
  { id: "local-shop", title: "Local Shop", description: "Bring products and store information together.", businessName: "Your Local Shop", tagline: "Find something you'll love.", primary: "#347b68", secondary: "#89c0a3", ctaLabel: "Explore the shop" },
  { id: "event", title: "Event", description: "Share the schedule, venue, and event details.", businessName: "Your Event", tagline: "A day worth remembering.", primary: "#4b5eb3", secondary: "#9baaf0", ctaLabel: "See event details" },
  { id: "real-estate", title: "Real Estate", description: "Feature properties and arrange a viewing.", businessName: "Your Property Studio", tagline: "Find a place to call home.", primary: "#3d617b", secondary: "#9abac9", ctaLabel: "View properties" },
  { id: "home-services", title: "Home Services", description: "List services and make it easy to request a quote.", businessName: "Your Home Services", tagline: "Local help you can rely on.", primary: "#39725f", secondary: "#8fc6a2", ctaLabel: "Request a quote" },
  { id: "tuition", title: "Tuition Class", description: "Share classes, schedule, and enrollment details.", businessName: "Your Learning Centre", tagline: "Learn with confidence.", primary: "#4c59a8", secondary: "#94a7e5", ctaLabel: "Enquire about classes" }
];

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSection(kind: SectionKind, title?: string): BusinessSection {
  const defaults: Record<SectionKind, { title: string; body: string }> = {
    about: { title: "About us", body: "Tell visitors what makes your business special." },
    services: { title: "Services & menu", body: "Add your services, menu items, and prices." },
    gallery: { title: "Our work", body: "A few moments and details from our business." },
    testimonials: { title: "Kind words", body: "What customers say about working with us." },
    hours: { title: "Opening hours", body: "Plan your visit with our current hours." },
    contact: { title: "Get in touch", body: "We would love to hear from you." },
    custom: { title: "New section", body: "Add a little more information for your visitors." }
  };
  return {
    id: createId(),
    kind,
    title: title ?? defaults[kind].title,
    body: defaults[kind].body,
    items: [],
    images: []
  };
}

export function createBusinessPage(templateId: BusinessTemplateId = "restaurant"): BusinessPageData {
  const template = TEMPLATE_OPTIONS.find((option) => option.id === templateId) ?? TEMPLATE_OPTIONS[0];
  return {
    template: template.id,
    businessName: template.businessName,
    tagline: template.tagline,
    logo: "",
    cover: "",
    title: `${template.businessName} | Welcome`,
    description: template.description,
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    maps: "",
    ctaLabel: template.ctaLabel,
    hostedUrl: "",
    primary: template.primary,
    secondary: template.secondary,
    background: "#ffffff",
    font: "Inter",
    buttonStyle: "rounded",
    theme: "light",
    sections: [
      createSection("about"),
      createSection("services"),
      createSection("gallery"),
      createSection("testimonials"),
      createSection("hours"),
      createSection("contact")
    ]
  };
}

export function createCatalog(): CatalogData {
  return {
    businessName: "Your Store",
    logo: "",
    whatsapp: "",
    hostedUrl: "",
    primary: "#5b4bd7",
    background: "#ffffff",
    layout: "grid",
    products: [{ id: createId(), name: "Your first product", price: "", description: "Add a short, helpful description.", image: "", orderLink: "" }]
  };
}

export function createBusinessCard(): BusinessCardData {
  return {
    name: "Your Name",
    role: "Your role",
    company: "Your Company",
    photo: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    hostedUrl: "",
    primary: "#5145c5",
    background: "#f7f6fc"
  };
}

export function createReviewQr(): ReviewQrData {
  return { url: "", cta: "Scan to leave a review", primary: "#5145c5", background: "#ffffff", logo: "", template: "table" };
}

export function createUpiQr(): UpiQrData {
  return { upiId: "", payee: "", amount: "", note: "", cta: "Scan to pay", primary: "#5145c5", background: "#ffffff", logo: "", size: 1024 };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}

export function safeHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function safeImageUrl(value: string) {
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return value;
  return safeHttpUrl(value);
}

export function makeUpiUri(data: UpiQrData) {
  const upiId = data.upiId.trim();
  const payee = data.payee.trim();
  if (!/^[\w.-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/.test(upiId))
    return { uri: "", error: "Enter a valid UPI ID, for example name@bank." };
  if (!payee) return { uri: "", error: "Enter the payee name shown to customers." };
  const amount = data.amount.trim();
  if (amount && (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0))
    return { uri: "", error: "Enter a positive amount with up to two decimal places." };
  if (data.note.length > 80) return { uri: "", error: "Keep the payment note under 80 characters." };
  const params = new URLSearchParams({ pa: upiId, pn: payee, cu: "INR" });
  if (amount) params.set("am", Number(amount).toFixed(2));
  if (data.note.trim()) params.set("tn", data.note.trim());
  return { uri: `upi://pay?${params.toString()}`, error: "" };
}

export function businessPageFiles(page: BusinessPageData, standalone: boolean) {
  const images: { path: string; base64: string }[] = [];
  const imagePath = (source: string, label: string) => {
    const safeSource = safeImageUrl(source);
    if (!safeSource) return "";
    if (!standalone && safeSource.startsWith("data:image/")) {
      const match = safeSource.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/i);
      if (!match) return "";
      const extension = match[1].toLowerCase().replace("jpeg", "jpg");
      const path = `images/${label}-${images.length + 1}.${extension}`;
      images.push({ path, base64: match[2] });
      return path;
    }
    return safeSource;
  };
  const logo = imagePath(page.logo, "logo");
  const cover = imagePath(page.cover, "cover");
  const buttonRadius = page.buttonStyle === "pill" ? "999px" : page.buttonStyle === "square" ? "5px" : "14px";
  const background = /^#[\da-f]{6}$/i.test(page.background) ? page.background : "#ffffff";
  const primary = /^#[\da-f]{6}$/i.test(page.primary) ? page.primary : "#5145c5";
  const secondary = /^#[\da-f]{6}$/i.test(page.secondary) ? page.secondary : "#9b92ef";
  const foreground = page.theme === "dark" ? "#f5f3ff" : "#252338";
  const sectionHtml = page.sections.map((section) => {
    const title = escapeHtml(section.title);
    const body = escapeHtml(section.body).replace(/\n/g, "<br>");
    const items = section.items.map((item) => `<article class="item"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.detail)}</p></div>${item.price ? `<strong>${escapeHtml(item.price)}</strong>` : ""}</article>`).join("");
    const photos = section.images.map((image, index) => {
      const src = imagePath(image, `gallery-${section.id}-${index + 1}`);
      return src ? `<img loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(title)} photo ${index + 1}">` : "";
    }).join("");
    const content = section.kind === "services" || section.kind === "hours" || section.kind === "testimonials"
      ? `<p>${body}</p>${items ? `<div class="items">${items}</div>` : ""}`
      : section.kind === "gallery"
        ? `<p>${body}</p>${photos ? `<div class="gallery">${photos}</div>` : ""}`
        : `<p>${body}</p>${items ? `<div class="items">${items}</div>` : ""}`;
    return `<section id="${escapeHtml(section.id)}"><h2>${title}</h2>${content}</section>`;
  }).join("");
  const links = [
    page.phone ? `<a href="tel:${encodeURIComponent(page.phone)}">Call</a>` : "",
    page.whatsapp ? `<a href="https://wa.me/${encodeURIComponent(page.whatsapp.replace(/\D/g, ""))}">WhatsApp</a>` : "",
    page.email ? `<a href="mailto:${encodeURIComponent(page.email)}">Email</a>` : "",
    ...[[page.website, "Website"], [page.instagram, "Instagram"], [page.facebook, "Facebook"], [page.maps, "Directions"]].map(([value, label]) => {
      const url = safeHttpUrl(value);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>` : "";
    })
  ].filter(Boolean).join("");
  const coverHtml = cover ? `<img class="cover" src="${escapeHtml(cover)}" alt="">` : "";
  const logoHtml = logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="${escapeHtml(page.businessName)} logo">` : "";
  const ctaUrl = safeHttpUrl(page.hostedUrl) || (page.whatsapp ? `https://wa.me/${page.whatsapp.replace(/\D/g, "")}` : "#contact");
  const css = `:root{color-scheme:${page.theme};--primary:${primary};--secondary:${secondary};--paper:${background};--ink:${foreground};--radius:${buttonRadius};font-family:${/^(Inter|Arial|Georgia|system-ui|Trebuchet MS)$/.test(page.font) ? page.font : "Inter"},Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink)}.hero{min-height:320px;display:grid;align-content:center;justify-items:center;text-align:center;padding:40px 20px;background:linear-gradient(140deg,var(--primary),var(--secondary));color:#fff}.cover{width:min(100%,1000px);max-height:300px;object-fit:cover;border-radius:20px;margin-bottom:20px}.logo{width:82px;height:82px;border-radius:22px;object-fit:cover;background:#fff;margin-bottom:12px}.hero h1{font-size:clamp(34px,7vw,62px);margin:0 0 8px}.hero p{margin:0;max-width:620px;line-height:1.6}.button{display:inline-flex;margin-top:22px;padding:13px 20px;background:#fff;color:var(--primary);font-weight:700;text-decoration:none;border-radius:var(--radius)}main{width:min(100% - 32px,880px);margin:0 auto;padding:24px 0 60px}section{padding:24px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}h2{font-size:24px;margin:0 0 10px}section>p{line-height:1.7;opacity:.78}.items{display:grid;gap:10px;margin-top:12px}.item{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:15px;border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);border-radius:14px}.item h3,.item p{margin:0}.item p{opacity:.72;margin-top:5px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.gallery img{width:100%;height:180px;object-fit:cover;border-radius:14px}.links{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.links a{padding:11px 15px;border:1px solid color-mix(in srgb,var(--ink) 18%,transparent);border-radius:var(--radius);color:var(--ink);text-decoration:none}footer{text-align:center;padding:22px;font-size:12px;opacity:.7}.watermark{position:fixed;right:12px;bottom:10px;font-size:10px;opacity:.42}@media print{.watermark{position:fixed}}`;
  const title = escapeHtml(page.title || page.businessName);
  const description = escapeHtml(page.description.slice(0, 320));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}">${standalone ? `<style>${css}</style>` : '<link rel="stylesheet" href="styles.css">'}</head><body><header class="hero">${coverHtml}${logoHtml}<h1>${escapeHtml(page.businessName || "Your business")}</h1><p>${escapeHtml(page.tagline)}</p><a class="button" href="${escapeHtml(ctaUrl)}">${escapeHtml(page.ctaLabel || "Get in touch")}</a></header><main>${sectionHtml}<section id="contact"><h2>Find us & say hello</h2><div class="links">${links}</div></section></main><footer>${escapeHtml(page.businessName)} · Made with QRcraft</footer><span class="watermark">Made with QRcraft</span></body></html>`;
  return { html, css, images };
}

export function catalogHtml(catalog: CatalogData, isPro: boolean) {
  const primary = /^#[\da-f]{6}$/i.test(catalog.primary) ? catalog.primary : "#5145c5";
  const background = /^#[\da-f]{6}$/i.test(catalog.background) ? catalog.background : "#ffffff";
  const logo = safeImageUrl(catalog.logo);
  const products = catalog.products.map((product) => {
    const image = safeImageUrl(product.image);
    const orderLink = safeHttpUrl(product.orderLink) ||
      (catalog.whatsapp.replace(/\D/g, "").length >= 7
        ? `https://wa.me/${catalog.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'd like to order ${product.name}`)}`
        : "");
    return `<article class="product">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}">` : '<div class="placeholder">Product photo</div>'}<div class="product-copy"><h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p><strong>${escapeHtml(product.price)}</strong>${orderLink ? `<a href="${escapeHtml(orderLink)}" target="_blank" rel="noopener">Order on WhatsApp</a>` : ""}</div></article>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(catalog.businessName || "WhatsApp Catalog")}</title><meta name="description" content="Browse the ${escapeHtml(catalog.businessName)} catalog and order on WhatsApp."><style>*{box-sizing:border-box}body{margin:0;background:${background};color:#242238;font-family:Inter,Arial,sans-serif}.head{padding:30px 18px;text-align:center;background:linear-gradient(135deg,${primary},${primary}cc);color:#fff}.head img{width:72px;height:72px;border-radius:20px;object-fit:cover;background:#fff}.head h1{margin:12px 0 0;font-size:30px}.products{width:min(100% - 28px,920px);margin:24px auto 55px;display:grid;grid-template-columns:${catalog.layout === "list" ? "1fr" : "repeat(auto-fit,minmax(230px,1fr))"};gap:14px}.product{overflow:hidden;border:1px solid #e8e6ef;border-radius:17px;background:#fff}.product>img,.placeholder{display:grid;width:100%;height:220px;object-fit:cover;place-items:center;background:#f2f0f8;color:#9692a6}.product-copy{padding:16px}.product-copy h2{margin:0;font-size:17px}.product-copy p{min-height:36px;color:#77768a;font-size:13px;line-height:1.55}.product-copy strong{display:block;color:${primary};font-size:16px}.product-copy a{display:flex;justify-content:center;margin-top:12px;padding:12px;border-radius:12px;background:${primary};color:white;font-weight:700;text-decoration:none}.watermark{position:fixed;right:10px;bottom:8px;color:#77768a;font-size:10px;opacity:.65}</style></head><body><header class="head">${logo ? `<img src="${escapeHtml(logo)}" alt="">` : ""}<h1>${escapeHtml(catalog.businessName || "Our catalog")}</h1></header><main class="products">${products || "<p>Add products to your catalog.</p>"}</main>${isPro ? "" : '<small class="watermark">Made with QRcraft</small>'}</body></html>`;
}

export function businessCardHtml(card: BusinessCardData) {
  const primary = /^#[\da-f]{6}$/i.test(card.primary) ? card.primary : "#5145c5";
  const background = /^#[\da-f]{6}$/i.test(card.background) ? card.background : "#f7f6fc";
  const photo = safeImageUrl(card.photo);
  const links: [string, string][] = [
    [card.phone ? `tel:${card.phone.replace(/[^\d+]/g, "")}` : "", "Call"],
    [card.whatsapp ? `https://wa.me/${card.whatsapp.replace(/\D/g, "")}` : "", "WhatsApp"],
    [card.email ? `mailto:${card.email}` : "", "Email"],
    [safeHttpUrl(card.website), "Website"],
    [safeHttpUrl(card.instagram), "Instagram"],
    [safeHttpUrl(card.facebook), "Facebook"],
    [safeHttpUrl(card.linkedin), "LinkedIn"]
  ].filter((entry): entry is [string, string] => Boolean(entry[0]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(card.name || "Digital business card")}</title><meta name="description" content="${escapeHtml(`${card.name} · ${card.role} ${card.company}`)}"><style>*{box-sizing:border-box}body{min-height:100vh;display:grid;place-items:center;margin:0;padding:20px;background:${background};font-family:Inter,Arial,sans-serif;color:#252338}.card{width:min(100%,440px);padding:30px 24px;text-align:center;border-radius:26px;background:#fff;box-shadow:0 20px 60px #2520431c}.photo{width:112px;height:112px;margin:0 auto 15px;border-radius:50%;object-fit:cover;background:${primary}22}.initials{display:grid;place-items:center;color:${primary};font-size:32px;font-weight:800}.name{font-size:28px;margin:8px 0}.role{color:#77768a;margin:0}.company{color:${primary};font-weight:700}.links{display:grid;gap:9px;margin-top:22px}.links a{padding:13px 15px;border-radius:14px;border:1px solid #e9e7f0;color:${primary};font-weight:700;text-decoration:none}.save{background:${primary}!important;color:#fff!important}</style></head><body><main class="card">${photo ? `<img class="photo" src="${escapeHtml(photo)}" alt="${escapeHtml(card.name)}">` : `<div class="photo initials">${escapeHtml((card.name || "QR").split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase())}</div>`}<h1 class="name">${escapeHtml(card.name || "Your Name")}</h1><p class="role">${escapeHtml(card.role)}</p><p class="company">${escapeHtml(card.company)}</p><nav class="links" aria-label="Contact links">${links.map(([href, label]) => `<a href="${escapeHtml(href)}" rel="noopener">${label}</a>`).join("")}</nav></main></body></html>`;
}

export function makeVcard(card: BusinessCardData) {
  const clean = (value: string) => value.replace(/[\r\n]/g, " ").replace(/([,;\\])/g, "\\$1");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${clean(card.name)}`,
    ...(card.company ? [`ORG:${clean(card.company)}`] : []),
    ...(card.role ? [`TITLE:${clean(card.role)}`] : []),
    ...(card.phone ? [`TEL;TYPE=WORK,VOICE:${clean(card.phone)}`] : []),
    ...(card.email ? [`EMAIL:${clean(card.email)}`] : []),
    ...(safeHttpUrl(card.website) ? [`URL:${safeHttpUrl(card.website)}`] : []),
    ...(card.whatsapp ? [`X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/${card.whatsapp.replace(/\D/g, "")}`] : []),
    ...(safeHttpUrl(card.instagram) ? [`X-SOCIALPROFILE;TYPE=instagram:${safeHttpUrl(card.instagram)}`] : []),
    ...(safeHttpUrl(card.facebook) ? [`X-SOCIALPROFILE;TYPE=facebook:${safeHttpUrl(card.facebook)}`] : []),
    ...(safeHttpUrl(card.linkedin) ? [`X-SOCIALPROFILE;TYPE=linkedin:${safeHttpUrl(card.linkedin)}`] : []),
    "END:VCARD"
  ].join("\r\n");
}
