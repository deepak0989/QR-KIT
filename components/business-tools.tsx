"use client";

import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Copy,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  Globe,
  ImagePlus,
  LayoutTemplate,
  LockKeyhole,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import JSZip from "jszip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import BusinessQr, { PrintFormat } from "@/components/business-qr";
import {
  BusinessCardEditor,
  BusinessCardPreview,
  BusinessPageEditor,
  BusinessPagePreview,
  CatalogEditor,
  CatalogPreview,
  ReviewEditor,
  UpiEditor,
  createUpiQrData,
  printFormatFromReview
} from "@/components/business-tool-editors";
import ProModal from "@/components/pro-modal";
import {
  BusinessCardData,
  BusinessPageData,
  CatalogData,
  ReviewQrData,
  TEMPLATE_OPTIONS,
  ToolDesign,
  ToolDesignData,
  ToolDesignKind,
  UpiQrData,
  businessCardHtml,
  businessPageFiles,
  catalogHtml,
  createBusinessCard,
  createBusinessPage,
  createCatalog,
  createId,
  createReviewQr,
  createUpiQr,
  makeVcard,
  safeHttpUrl
} from "@/lib/business-tools";

type Props = { tool?: string };

const STORAGE_KEY = "qrcraft-business-tools";
const tools: { slug: string; kind: ToolDesignKind; title: string; description: string; icon: typeof QrCode; button: string }[] = [
  { slug: "business-page", kind: "business-page", title: "Business Page", description: "Build a polished, mobile-friendly mini website and export it.", icon: Globe, button: "Create Business Page" },
  { slug: "catalog", kind: "catalog", title: "WhatsApp Catalog", description: "Showcase products and let customers order directly in WhatsApp.", icon: ShoppingBag, button: "Build a catalog" },
  { slug: "google-review", kind: "google-review", title: "Google Review QR", description: "Help customers find your review page with a scan.", icon: Star, button: "Create review QR" },
  { slug: "upi-payment", kind: "upi-payment", title: "UPI Payment QR", description: "Create a scan-to-pay UPI link with amount and note options.", icon: Wallet, button: "Create payment QR" },
  { slug: "business-card", kind: "business-card", title: "Digital Business Card", description: "Share your contact details and social profiles in one place.", icon: BriefcaseBusiness, button: "Create a card" }
];

const fixedTools = [
  { slug: "templates", title: "Templates", description: "Start from a business or QR template.", icon: LayoutTemplate },
  { slug: "designs", title: "My Designs", description: "Restore, rename, duplicate, or remove local designs.", icon: FolderOpen }
];

const isKind = (value: unknown): value is ToolDesignKind =>
  value === "business-page" || value === "catalog" || value === "business-card" || value === "google-review" || value === "upi-payment";

function isRecord(value: unknown): value is ToolDesign {
  if (!value || typeof value !== "object") return false;
  const design = value as Partial<ToolDesign>;
  return typeof design.id === "string" && isKind(design.kind) && typeof design.name === "string" &&
    typeof design.updatedAt === "number" && Boolean(design.data) && typeof design.data === "object";
}

function createDesign(kind: ToolDesignKind, template: BusinessPageData["template"] = "restaurant"): ToolDesign {
  const data = kind === "business-page" ? createBusinessPage(template)
    : kind === "catalog" ? createCatalog()
    : kind === "business-card" ? createBusinessCard()
    : kind === "google-review" ? createReviewQr()
    : createUpiQr();
  const labels: Record<ToolDesignKind, string> = {
    "business-page": kind === "business-page" ? (data as BusinessPageData).businessName : "Business Page",
    catalog: "WhatsApp Catalog",
    "business-card": "Digital Business Card",
    "google-review": "Google Review QR",
    "upi-payment": "UPI Payment QR"
  };
  return { id: createId(), kind, name: labels[kind], updatedAt: Date.now(), data };
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function fileSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "business";
}

function createCardPng(card: BusinessCardData) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1400;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Your browser could not prepare the business card image."));
      return;
    }
    const primary = /^#[\da-f]{6}$/i.test(card.primary) ? card.primary : "#5145c5";
    const background = /^#[\da-f]{6}$/i.test(card.background) ? card.background : "#f7f6fc";
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = primary;
    context.fillRect(0, 0, canvas.width, 420);
    const drawText = () => {
      context.textAlign = "center";
      context.fillStyle = "#252338";
      context.font = "700 58px Arial";
      context.fillText(card.name || "Your Name", 600, 670, 1000);
      context.fillStyle = "#6e6c7f";
      context.font = "34px Arial";
      context.fillText([card.role, card.company].filter(Boolean).join(" · "), 600, 735, 1000);
      const contacts = [card.phone, card.email, card.website, card.instagram].filter(Boolean);
      context.fillStyle = primary;
      context.font = "600 30px Arial";
      contacts.slice(0, 4).forEach((value, index) => context.fillText(value, 600, 850 + index * 64, 1050));
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The card image could not be exported.")), "image/png");
    };
    if (!card.photo) {
      context.beginPath();
      context.fillStyle = "#fff";
      context.arc(600, 420, 140, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = primary;
      context.font = "700 92px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText((card.name || "QR").split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase(), 600, 420);
      drawText();
      return;
    }
    const image = new Image();
    image.onload = () => {
      context.save();
      context.beginPath();
      context.arc(600, 420, 145, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, 455, 275, 290, 290);
      context.restore();
      drawText();
    };
    image.onerror = () => reject(new Error("The uploaded profile photo could not be drawn."));
    image.src = card.photo;
  });
}

function isValidImportedDesign(value: unknown): value is ToolDesign {
  if (!isRecord(value)) return false;
  if (value.kind === "business-page") {
    const data = value.data as Partial<BusinessPageData>;
    return typeof data.businessName === "string" && Array.isArray(data.sections) && typeof data.primary === "string";
  }
  if (value.kind === "catalog") {
    const data = value.data as Partial<CatalogData>;
    return typeof data.businessName === "string" && Array.isArray(data.products);
  }
  if (value.kind === "business-card") return typeof (value.data as Partial<BusinessCardData>).name === "string";
  if (value.kind === "google-review") return typeof (value.data as Partial<ReviewQrData>).url === "string";
  return typeof (value.data as Partial<UpiQrData>).upiId === "string";
}

export default function BusinessTools({ tool }: Props) {
  const router = useRouter();
  const route = tool ?? "";
  const routeTool = tools.find((entry) => entry.slug === route);
  const routeIsDashboard = !route || !routeTool && route !== "templates" && route !== "designs";
  const [designs, setDesigns] = useState<ToolDesign[]>([]);
  const [activeId, setActiveId] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isPro, setIsPro] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("a4-poster");
  const importRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => current === text ? "" : current), 3500);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Saved business designs have an invalid format.");
        // Defer client-only localStorage hydration until after server rendering.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDesigns(parsed.filter(isValidImportedDesign).slice(0, 100));
      }
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Local business designs could not be loaded.");
    }
    const savedCode = localStorage.getItem("qrcraft-license");
    if (savedCode) {
      const developmentUnlock = process.env.NODE_ENV !== "production" && ["QRC-DEV-2026", "QRC-TEST-9-INR"].includes(savedCode.toUpperCase());
      if (developmentUnlock) setIsPro(true);
      else void fetch("/api/pro/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: savedCode }),
        cache: "no-store"
      }).then((response) => setIsPro(response.ok)).catch(() => undefined);
    }
    setReady(true);
  }, [notify]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
    } catch {
      window.setTimeout(() => notify("Browser storage is full. Export a JSON backup or remove a large image and try again."), 0);
    }
  }, [designs, ready, notify]);

  useEffect(() => {
    if (!ready || !routeTool) return;
    const matching = designs.find((design) => design.kind === routeTool.kind);
    if (matching) {
      // Sync the selected local record when navigating between tool routes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId((current) => designs.some((design) => design.id === current && design.kind === routeTool.kind) ? current : matching.id);
      return;
    }
    const next = createDesign(routeTool.kind);
    setDesigns((current) => current.some((design) => design.kind === routeTool.kind) ? current : [next, ...current]);
    setActiveId(next.id);
  }, [ready, routeTool, designs]);

  const activeDesign = useMemo(
    () => designs.find((design) => design.id === activeId && design.kind === routeTool?.kind) ?? designs.find((design) => design.kind === routeTool?.kind),
    [activeId, designs, routeTool]
  );
  const pageCount = designs.filter((design) => design.kind === "business-page").length;
  const filteredDesigns = designs.filter((design) => !search.trim() || `${design.name} ${design.kind}`.toLowerCase().includes(search.trim().toLowerCase()));

  const updateData = (data: ToolDesignData, name?: string) => {
    if (!activeDesign) return;
    setDesigns((current) => current.map((design) => design.id === activeDesign.id
      ? { ...design, data, name: name ?? design.name, updatedAt: Date.now() }
      : design));
  };

  const createNewDesign = (kind: ToolDesignKind, template: BusinessPageData["template"] = "restaurant") => {
    if (kind === "business-page" && !isPro && pageCount >= 1) {
      setMessage("Free includes one business page. Upgrade to Pro for unlimited local pages.");
      setProOpen(true);
      return;
    }
    const next = createDesign(kind, template);
    setDesigns((current) => [next, ...current]);
    setActiveId(next.id);
    if (kind === "business-page") router.push("/tools/business-page");
    else if (kind === "catalog") router.push("/tools/catalog");
    else if (kind === "business-card") router.push("/tools/business-card");
    notify(`${next.name} created and saved on this device.`);
  };

  const goToRecord = (record: ToolDesign) => {
    setActiveId(record.id);
    router.push(`/tools/${record.kind === "catalog" ? "catalog" : record.kind}`);
  };

  const renameDesign = (record: ToolDesign) => {
    const title = window.prompt("Name this design", record.name)?.trim();
    if (!title) return;
    setDesigns((current) => current.map((design) => design.id === record.id ? { ...design, name: title.slice(0, 80), updatedAt: Date.now() } : design));
    notify("Design renamed.");
  };

  const duplicateDesign = (record: ToolDesign) => {
    if (record.kind === "business-page" && !isPro && pageCount >= 1) {
      setMessage("Duplicating a second business page is a Pro feature.");
      setProOpen(true);
      return;
    }
    const copy = { ...record, id: createId(), name: `${record.name} copy`, updatedAt: Date.now(), data: structuredClone(record.data) };
    setDesigns((current) => [copy, ...current]);
    notify("A local copy was created.");
  };

  const deleteDesign = (record: ToolDesign) => {
    if (!window.confirm(`Delete “${record.name}” from this browser?`)) return;
    setDesigns((current) => current.filter((design) => design.id !== record.id));
    if (activeId === record.id) setActiveId("");
    notify("Design deleted from this device.");
  };

  const exportActiveJson = () => {
    if (!activeDesign) {
      notify("Choose a design before exporting its JSON.");
      return;
    }
    saveBlob(new Blob([JSON.stringify(activeDesign, null, 2)], { type: "application/json" }), `${fileSlug(activeDesign.name)}.json`);
    notify("JSON backup downloaded.");
  };

  const exportAllJson = () => {
    saveBlob(new Blob([JSON.stringify({ version: 1, designs }, null, 2)], { type: "application/json" }), "qrcraft-business-designs.json");
    notify("Your local designs were exported as JSON.");
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ""));
        const candidates = Array.isArray(parsed) ? parsed
          : parsed && typeof parsed === "object" && "designs" in parsed && Array.isArray((parsed as { designs?: unknown }).designs)
            ? (parsed as { designs: unknown[] }).designs
            : [parsed];
        const valid = candidates.filter(isValidImportedDesign).map((design) => ({ ...design, id: createId(), updatedAt: Date.now() }));
        if (!valid.length) throw new Error("The JSON file does not contain a valid QRcraft business design.");
        const freePageCount = designs.filter((design) => design.kind === "business-page").length + valid.filter((design) => design.kind === "business-page").length;
        if (!isPro && freePageCount > 1) {
          setProOpen(true);
          throw new Error("Free includes one business page. Upgrade to import multiple pages.");
        }
        setDesigns((current) => [...valid, ...current].slice(0, 100));
        notify(`${valid.length} design${valid.length === 1 ? "" : "s"} imported locally.`);
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : "The JSON backup could not be imported.");
      } finally {
        setImporting(false);
      }
    };
    reader.onerror = () => {
      setImporting(false);
      notify("The JSON backup file could not be read.");
    };
    reader.readAsText(file);
  };

  const exportBusinessPage = async (archive: boolean) => {
    if (!activeDesign || activeDesign.kind !== "business-page") return;
    if (archive && !isPro) {
      setProOpen(true);
      return;
    }
    setWorking(true);
    try {
      const page = activeDesign.data as BusinessPageData;
      const files = businessPageFiles(page, !archive);
      if (!archive) {
        saveBlob(new Blob([files.html], { type: "text/html;charset=utf-8" }), `${fileSlug(page.businessName)}.html`);
      } else {
        const zip = new JSZip();
        zip.file("index.html", files.html);
        zip.file("styles.css", files.css);
        files.images.forEach((image) => zip.file(image.path, image.base64, { base64: true }));
        saveBlob(await zip.generateAsync({ type: "blob" }), `${fileSlug(page.businessName)}-website.zip`);
      }
      notify(archive ? "Website ZIP downloaded with styles and image assets." : "Standalone business webpage downloaded.");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "The business page export failed.");
    } finally {
      setWorking(false);
    }
  };

  const exportCatalog = () => {
    if (!activeDesign || activeDesign.kind !== "catalog") return;
    const catalog = activeDesign.data as CatalogData;
    saveBlob(new Blob([catalogHtml(catalog, isPro)], { type: "text/html;charset=utf-8" }), `${fileSlug(catalog.businessName)}-catalog.html`);
    notify("WhatsApp catalog HTML downloaded.");
  };

  const exportBusinessCard = async (format: "html" | "png") => {
    if (!activeDesign || activeDesign.kind !== "business-card") return;
    const card = activeDesign.data as BusinessCardData;
    try {
      if (format === "html") {
        saveBlob(new Blob([businessCardHtml(card)], { type: "text/html;charset=utf-8" }), `${fileSlug(card.name)}-card.html`);
        notify("Shareable digital card webpage downloaded.");
      } else {
        saveBlob(await createCardPng(card), `${fileSlug(card.name)}-card.png`);
        notify("Business card image downloaded.");
      }
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "The business card export failed.");
    }
  };

  const activatePro = async (code: string) => {
    const developmentUnlock = process.env.NODE_ENV !== "production" && ["QRC-DEV-2026", "QRC-TEST-9-INR"].includes(code.trim().toUpperCase());
    if (!developmentUnlock) {
      let response: Response;
      try {
        response = await fetch("/api/pro/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
          cache: "no-store"
        });
      } catch {
        throw new Error("License validation is unavailable. Check your connection and try again.");
      }
      if (!response.ok) {
        if (response.status === 403 || response.status === 400) return false;
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "License validation is temporarily unavailable.");
      }
    }
    localStorage.setItem("qrcraft-license", developmentUnlock ? code.trim().toUpperCase() : code.trim());
    setIsPro(true);
    return true;
  };

  const handleTemplateSelect = (template: BusinessPageData["template"]) => {
    if (routeTool?.kind === "business-page") createNewDesign("business-page", template);
    else if (routeTool?.kind === "catalog") createNewDesign("catalog");
    else createNewDesign("business-page", template);
  };

  const renderWorkspace = () => {
    if (!routeTool) return null;
    if (!activeDesign) return <div className="business-empty-note">Preparing a local design…</div>;
    const onDataChange = (next: ToolDesignData) => updateData(next,
      routeTool.kind === "business-page" ? (next as BusinessPageData).businessName
        : routeTool.kind === "catalog" ? (next as CatalogData).businessName
        : routeTool.kind === "business-card" ? (next as BusinessCardData).name
        : activeDesign.name);

    return <>
      <div className="business-workspace-toolbar">
        <label className="business-control"><span className="field-label">Editing local design</span><select className="field" value={activeDesign.id} onChange={(event) => setActiveId(event.target.value)}>{designs.filter((design) => design.kind === routeTool.kind).map((design) => <option value={design.id} key={design.id}>{design.name}</option>)}</select></label>
        <div className="business-workspace-actions">
          <button type="button" className="btn btn-outline" onClick={() => createNewDesign(routeTool.kind)}><Plus size={14} />New</button>
          <button type="button" className="btn btn-outline" onClick={exportActiveJson}><FileJson size={14} />Backup JSON</button>
        </div>
      </div>
      <div className="business-tool-tabs" role="tablist" aria-label="Business tool editor sections">
        <button type="button" role="tab" aria-selected={activeTab === "edit"} className={activeTab === "edit" ? "active" : ""} onClick={() => setActiveTab("edit")}>Edit</button>
        <button type="button" role="tab" aria-selected={activeTab === "preview"} className={activeTab === "preview" ? "active" : ""} onClick={() => setActiveTab("preview")}>Live preview</button>
      </div>
      <div className="business-workspace-grid">
        <section className={`panel business-edit-panel ${activeTab === "edit" ? "mobile-show" : ""}`}>
          {routeTool.kind === "business-page" && <BusinessPageEditor data={activeDesign.data as BusinessPageData} onChange={onDataChange} isPro={isPro} onUpgrade={() => setProOpen(true)} />}
          {routeTool.kind === "catalog" && <CatalogEditor data={activeDesign.data as CatalogData} onChange={onDataChange} isPro={isPro} onUpgrade={() => setProOpen(true)} />}
          {routeTool.kind === "business-card" && <BusinessCardEditor data={activeDesign.data as BusinessCardData} onChange={onDataChange} isPro={isPro} onUpgrade={() => setProOpen(true)} />}
          {routeTool.kind === "google-review" && <ReviewEditor data={activeDesign.data as ReviewQrData} onChange={onDataChange} />}
          {routeTool.kind === "upi-payment" && <UpiEditor data={activeDesign.data as UpiQrData} onChange={onDataChange} isPro={isPro} onUpgrade={() => setProOpen(true)} />}
        </section>
        <aside className={`panel business-live-panel ${activeTab === "preview" ? "mobile-show" : ""}`}>
          <div className="business-live-header"><div><span className="eyebrow"><Sparkles size={12} /> LIVE PREVIEW</span><h2>{routeTool.title}</h2></div><span className="live-pill"><span className="live-dot" />Local</span></div>
          {routeTool.kind === "business-page" && <>
            <div className="business-live-frame"><BusinessPagePreview data={activeDesign.data as BusinessPageData} /></div>
            <BusinessQr
              data={safeHttpUrl((activeDesign.data as BusinessPageData).hostedUrl)}
              primary={(activeDesign.data as BusinessPageData).primary}
              background={(activeDesign.data as BusinessPageData).background}
              logo={(activeDesign.data as BusinessPageData).logo}
              cta={(activeDesign.data as BusinessPageData).ctaLabel || "Scan to visit our page"}
              isPro={isPro}
              onOpenPro={() => setProOpen(true)}
              onNotify={notify}
              printHeading={(activeDesign.data as BusinessPageData).businessName}
            />
            <div className="business-export-actions">
              <button type="button" className="btn btn-primary" disabled={working} onClick={() => void exportBusinessPage(false)}><Download size={14} />{working ? "Exporting…" : "Download standalone HTML"}</button>
              <button type="button" className="btn btn-outline" disabled={working} onClick={() => void exportBusinessPage(true)}>{isPro ? <Download size={14} /> : <LockKeyhole size={14} />}{isPro ? "Download website ZIP" : "Website ZIP · Pro"}</button>
            </div>
            <p className="helper">This preview is local. Upload the exported HTML to your host before sharing its URL.</p>
          </>}
          {routeTool.kind === "catalog" && <>
            <div className="business-live-frame"><CatalogPreview data={activeDesign.data as CatalogData} isPro={isPro} /></div>
            <BusinessQr
              data={safeHttpUrl((activeDesign.data as CatalogData).hostedUrl)}
              primary={(activeDesign.data as CatalogData).primary}
              background={(activeDesign.data as CatalogData).background}
              logo={(activeDesign.data as CatalogData).logo}
              cta="Scan to browse products"
              isPro={isPro}
              onOpenPro={() => setProOpen(true)}
              onNotify={notify}
              printHeading={(activeDesign.data as CatalogData).businessName}
            />
            <button type="button" className="btn btn-primary full-width" onClick={exportCatalog}><Download size={14} />Download WhatsApp Catalog HTML</button>
          </>}
          {routeTool.kind === "business-card" && <>
            <div className="business-live-frame business-card-live-frame"><BusinessCardPreview data={activeDesign.data as BusinessCardData} /></div>
            <BusinessQr
              data={safeHttpUrl((activeDesign.data as BusinessCardData).hostedUrl) || makeVcard(activeDesign.data as BusinessCardData)}
              primary={(activeDesign.data as BusinessCardData).primary}
              background={(activeDesign.data as BusinessCardData).background}
              logo=""
              cta={`Save ${((activeDesign.data as BusinessCardData).name || "contact").trim()} to contacts`}
              isPro={isPro}
              onOpenPro={() => setProOpen(true)}
              onNotify={notify}
              printHeading={(activeDesign.data as BusinessCardData).name || "Digital business card"}
            />
            <div className="business-export-actions"><button type="button" className="btn btn-primary" onClick={() => void exportBusinessCard("html")}><Download size={14} />Download shareable webpage</button><button type="button" className="btn btn-outline" onClick={() => void exportBusinessCard("png")}><ImagePlus size={14} />Download card PNG</button></div>
          </>}
          {routeTool.kind === "google-review" && (() => {
            const review = activeDesign.data as ReviewQrData;
            const format = printFormatFromReview(review);
            return <>
              <div className={`review-print-preview review-${review.template}`}><span className="review-stars" aria-label="Five stars">★★★★★</span><h3>{review.template === "table" ? "Enjoying your visit?" : "We value your feedback"}</h3><p>{review.cta}</p><small>Open your camera and scan</small></div>
              <BusinessQr
                data={safeHttpUrl(review.url)}
                primary={review.primary}
                background={review.background}
                logo={review.logo}
                cta={review.cta}
                isPro={isPro}
                onOpenPro={() => setProOpen(true)}
                onNotify={notify}
                printHeading={review.template === "table" ? "Leave us a review" : "Your feedback helps"}
                printFormat={format}
                onPrintFormatChange={(next) => onDataChange({ ...review, template: next === "a4-poster" ? "poster" : "table" })}
              />
            </>;
          })()}
          {routeTool.kind === "upi-payment" && (() => {
            const upi = activeDesign.data as UpiQrData;
            const { uri } = createUpiQrData(upi);
            return <BusinessQr
              data={uri}
              primary={upi.primary}
              background={upi.background}
              logo={upi.logo}
              cta={upi.cta || (upi.amount ? `Pay ₹${upi.amount}` : "Scan to pay")}
              isPro={isPro}
              size={upi.size}
              onOpenPro={() => setProOpen(true)}
              onNotify={notify}
              printHeading={upi.payee || "UPI payment"}
              printFormat={printFormat}
              onPrintFormatChange={setPrintFormat}
            />;
          })()}
        </aside>
      </div>
    </>;
  };

  const renderTemplates = () => <div className="business-template-page">
    <div className="business-route-heading"><span className="eyebrow"><LayoutTemplate size={13} /> START WITH A TEMPLATE</span><h1>Templates for your next idea</h1><p>Choose a business page layout or jump into one of the ready-to-use QR tools.</p></div>
    <div className="business-template-grid">
      {TEMPLATE_OPTIONS.map((template) => <article className="business-template-card panel" key={template.id}>
        <div className="business-template-swatch" style={{ background: `linear-gradient(135deg, ${template.primary}, ${template.secondary})` }}><QrCode size={32} /></div>
        <div><h2>{template.title}</h2><p>{template.description}</p></div>
        <button type="button" className="btn btn-outline full-width" onClick={() => handleTemplateSelect(template.id)}>Use this template <ArrowRight size={14} /></button>
      </article>)}
    </div>
    <div className="business-template-tools">{tools.filter((entry) => entry.kind !== "business-page").map(({ slug, title, description, icon: Icon }) => <Link className="business-mini-link" href={`/tools/${slug}`} key={slug}><Icon size={16} /><span><b>{title}</b><small>{description}</small></span><ArrowRight size={15} /></Link>)}</div>
  </div>;

  const renderDesigns = () => <div className="business-designs-page">
    <div className="business-route-heading"><span className="eyebrow"><FolderOpen size={13} /> SAVED ON THIS DEVICE</span><h1>My designs</h1><p>Your business pages, catalogs, and QR tools are saved only in this browser.</p></div>
    <div className="business-designs-toolbar">
      <label className="business-search"><Search size={16} /><input className="field" aria-label="Search local designs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search designs" /></label>
      <div><button type="button" className="btn btn-outline" onClick={exportAllJson}><Download size={14} />Export JSON</button><button type="button" className="btn btn-outline" disabled={importing} onClick={() => importRef.current?.click()}><FileJson size={14} />{importing ? "Importing…" : "Import JSON"}</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={importJson} /></div>
    </div>
    {filteredDesigns.length ? <div className="business-design-list">{filteredDesigns.map((design) => {
      const entry = tools.find((item) => item.kind === design.kind);
      const Icon = entry?.icon ?? QrCode;
      return <article className="business-design-row panel" key={design.id}>
        <span className="business-design-icon"><Icon size={19} /></span>
        <div className="business-design-copy"><b>{design.name}</b><small>{entry?.title ?? design.kind} · Edited {new Date(design.updatedAt).toLocaleString()}</small></div>
        <div className="business-design-actions">
          <button type="button" className="btn btn-primary" onClick={() => goToRecord(design)}>Restore / edit</button>
          <button type="button" className="btn btn-outline" aria-label={`Rename ${design.name}`} onClick={() => renameDesign(design)}>Rename</button>
          <button type="button" className="btn btn-outline" aria-label={`Duplicate ${design.name}`} onClick={() => duplicateDesign(design)}><Copy size={14} />Duplicate</button>
          <button type="button" className="btn btn-ghost" aria-label={`Delete ${design.name}`} onClick={() => deleteDesign(design)}><Trash2 size={14} /></button>
        </div>
      </article>;
    })}</div> : <div className="business-empty panel"><FolderOpen size={26} /><h2>No saved designs yet</h2><p>Create a business page or QR tool to save your first design in this browser.</p><Link className="btn btn-primary" href="/tools">Explore Business Tools <ArrowRight size={14} /></Link></div>}
  </div>;

  const renderDashboard = () => <div className="business-dashboard">
    <div className="business-route-heading">
      <span className="eyebrow"><Sparkles size={13} /> YOUR BUSINESS WORKSPACE</span>
      <h1>Business tools, made simple.</h1>
      <p>Build your brand, share the essentials, and make it easy for customers to connect.</p>
      <div className="business-dashboard-cta"><Link className="btn btn-primary" href="/tools/business-page"><Plus size={15} />Create Business Page</Link><Link className="btn btn-outline" href="/#studio"><QrCode size={15} />Open QR Studio</Link></div>
    </div>
    <div className="business-tools-grid">
      <Link href="/#studio" className="business-tool-card panel business-tool-card-primary"><span className="business-tool-icon"><QrCode size={21} /></span><h2>QR Code Studio</h2><p>Design, preview, and export custom QR codes for all your content types.</p><span className="business-tool-link">Open QR Studio <ArrowRight size={15} /></span></Link>
      {tools.map(({ slug, title, description, icon: Icon, button }) => <Link href={`/tools/${slug}`} className="business-tool-card panel" key={slug}><span className="business-tool-icon"><Icon size={21} /></span><h2>{title}</h2><p>{description}</p><span className="business-tool-link">{button} <ArrowRight size={15} /></span></Link>)}
      {fixedTools.map(({ slug, title, description, icon: Icon }) => <Link href={`/tools/${slug}`} className="business-tool-card panel" key={slug}><span className="business-tool-icon"><Icon size={21} /></span><h2>{title}</h2><p>{description}</p><span className="business-tool-link">Explore <ArrowRight size={15} /></span></Link>)}
    </div>
    <section className="business-dashboard-recent"><div className="business-section-title"><div><h2>Recently edited</h2><p>Local drafts saved in this browser.</p></div><Link href="/tools/designs" className="business-text-link">View all <ArrowRight size={14} /></Link></div>
      {designs.length ? <div className="business-recent-grid">{designs.slice(0, 3).map((design) => <button type="button" className="business-recent-card" key={design.id} onClick={() => goToRecord(design)}><span><FileText size={16} /></span><b>{design.name}</b><small>{new Date(design.updatedAt).toLocaleDateString()}</small></button>)}</div> : <p className="business-empty-note">Your saved designs will show up here.</p>}
    </section>
    <section className="business-plan-card">
      <span className="business-plan-icon">{isPro ? <Check size={18} /> : <LockKeyhole size={18} />}</span>
      <div><b>{isPro ? "QRcraft Pro is active" : "Start free, upgrade when you need more"}</b><p>{isPro ? "Enjoy unlimited local pages, brand assets, SVG, hi-res PNG, print-ready exports, and ZIP tools." : `Free includes one business page and watermarked PNGs. ${pageCount} of 1 free page used.`}</p></div>
      {!isPro && <button type="button" className="btn btn-primary" onClick={() => setProOpen(true)}>Go Pro · ₹9</button>}
    </section>
  </div>;

  const title = routeTool?.title ?? (route === "templates" ? "Templates" : route === "designs" ? "My Designs" : "Business Tools");
  return <main className="business-tools-shell">
    <header className="topbar business-tools-topbar">
      <Link className="brand" href="/"><span className="brand-mark"><QrCode size={18} /></span>QRcraft</Link>
      <nav className="nav-actions" aria-label="Business tools navigation">
        <Link className="nav-link" href="/tools">Dashboard</Link>
        <Link className="nav-link" href="/tools/templates">Templates</Link>
        <Link className="nav-link" href="/tools/designs">My Designs</Link>
        <Link className="btn btn-outline" href="/#studio"><ArrowLeft size={14} />QR Studio</Link>
        {isPro ? <span className="top-pro-badge"><Check size={13} /> PRO</span> : <button type="button" className="btn btn-primary" onClick={() => setProOpen(true)}><Sparkles size={14} />Go Pro · ₹9</button>}
      </nav>
    </header>
    <div className="business-tools-main">
      <div className="business-breadcrumb"><Link href="/tools">Business Tools</Link>{!routeIsDashboard && <><span>/</span><span>{title}</span></>}</div>
      {!ready ? <div className="business-empty panel">Loading local designs…</div>
        : routeIsDashboard ? renderDashboard()
        : route === "templates" ? renderTemplates()
        : route === "designs" ? renderDesigns()
        : <section className="business-tool-workspace">
          <div className="business-route-heading business-workspace-title">
            <span className="eyebrow"><Sparkles size={13} /> LOCAL-FIRST EDITOR</span>
            <h1>{routeTool?.title}</h1>
            <p>{routeTool?.description} Your drafts stay in this browser.</p>
          </div>
          {renderWorkspace()}
        </section>}
    </div>
    <footer className="business-tools-footer"><span>QRcraft · Business Tools</span><span>Pages and images stay on this device until you export them.</span><Link href="/">Back to QR Studio</Link></footer>
    {message && <div className="toast" role="status">{message}</div>}
    {proOpen && <ProModal onClose={() => setProOpen(false)} onUnlock={activatePro} />}
  </main>;
}
