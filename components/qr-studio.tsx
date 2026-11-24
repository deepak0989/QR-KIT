"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Contact,
  Copy,
  CreditCard,
  Download,
  FileJson,
  ImagePlus,
  Instagram,
  Link2,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquare,
  Paintbrush,
  Phone,
  QrCode,
  RotateCcw,
  Save,
  Sparkles,
  Type,
  Wifi,
  X
} from "lucide-react";
import QRCodeStyling, { type Options as QRCodeOptions } from "qr-code-styling";
import JSZip from "jszip";
import NextImage from "next/image";
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import { contrastRatio, Design, getQrData, getSafeQrInk, initialDesign, QrType } from "@/lib/qr";

type Props = {
  design: Design;
  setDesign: Dispatch<SetStateAction<Design>>;
  isPro: boolean;
  onOpenPro: () => void;
  onNotify: (message: string) => void;
};

const typeOptions: { value: QrType; label: string; icon: typeof Link2 }[] = [
  { value: "website", label: "Website", icon: Link2 },
  { value: "text", label: "Text", icon: Type },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "vcard", label: "vCard", icon: Contact },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle }
];

type RecentDesign = {
  id: string;
  title: string;
  savedAt: number;
  design: Design;
};

type MobileTab = "content" | "design" | "export";

const dotStyles = ["square", "rounded", "dots", "classy", "extra-rounded"];
const cornerStyles = ["square", "rounded", "dots", "extra-rounded"];
const cornerDotStyles = ["square", "rounded", "dots", "extra-rounded"];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="control">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="field" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function dataUrlImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The uploaded logo could not be read."));
    image.src = source;
  });
}

async function prepareLogo(design: Pick<Design, "logo" | "logoBackground">): Promise<string> {
  if (!design.logo || design.logoBackground === "none") return design.logo;
  const image = await dataUrlImage(design.logo);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the logo image.");
  if (design.logoBackground === "circle") {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(128, 128, 128, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.beginPath();
    context.arc(128, 128, 112, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, 10, 10, 236, 236);
    context.restore();
  } else {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(0, 0, 256, 256, 36);
    context.fill();
    context.drawImage(image, 15, 15, 226, 226);
  }
  return canvas.toDataURL("image/png");
}

function makeOptions(
  design: Design,
  data: string,
  width: number,
  image: string,
  type: "canvas" | "svg" = "canvas"
): QRCodeOptions {
  const ink = getSafeQrInk(design);
  const dotsOptions: QRCodeOptions["dotsOptions"] = ink.gradient
    ? {
        type: design.dotStyle as NonNullable<QRCodeOptions["dotsOptions"]>["type"],
        gradient: {
          type: "linear",
          rotation: (design.gradientAngle * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: ink.foreground },
            { offset: 1, color: ink.gradientEnd }
          ]
        }
      }
    : {
        type: design.dotStyle as NonNullable<QRCodeOptions["dotsOptions"]>["type"],
        color: ink.foreground
      };
  return {
    width,
    height: width,
    type,
    data,
    margin: Math.max(design.margin, Math.ceil((width * 4) / 177)),
    qrOptions: {
      errorCorrectionLevel: design.logo ? "H" : design.correction
    },
    image: image || undefined,
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: design.logo ? design.logoSize / 100 : 0.3,
      margin: 7,
      crossOrigin: "anonymous"
    },
    dotsOptions,
    cornersSquareOptions: {
      type: design.cornerStyle as NonNullable<QRCodeOptions["cornersSquareOptions"]>["type"],
      color: ink.foreground
    },
    cornersDotOptions: {
      type: design.cornerDotStyle as NonNullable<QRCodeOptions["cornersDotOptions"]>["type"],
      color: ink.foreground
    },
    backgroundOptions: { color: design.background }
  };
}

function toBlob(value: Blob | Buffer, mimeType: string): Blob {
  return value instanceof Blob ? value : new Blob([new Uint8Array(value)], { type: mimeType });
}

async function makePngBlob(design: Design, data: string, isPro: boolean): Promise<Blob> {
  const image = await prepareLogo(design);
  const qr = new QRCodeStyling(makeOptions(design, data, design.size, image));
  const result = await qr.getRawData("png");
  if (!result) throw new Error("PNG export is not supported by this browser.");
  const qrImage = await createImageBitmap(toBlob(result, "image/png"));
  const labelHeight = design.cta ? Math.round(design.size * 0.08) : 0;
  const watermarkHeight = isPro ? 0 : Math.max(30, Math.round(design.size * 0.08));
  const framePadding = design.frame === "none" ? 0 : Math.round(design.size * 0.045);
  const outerHeight = design.size + labelHeight + watermarkHeight + framePadding * 2;
  const outerWidth = design.size + framePadding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = outerWidth;
  canvas.height = outerHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the PNG export.");
  const frameColor = design.frame === "violet" ? "#6558e8" : "#ffffff";
  context.fillStyle = frameColor;
  if (design.frame === "soft" || design.frame === "violet") {
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, Math.max(12, design.size * 0.025));
    context.fill();
  } else context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(qrImage, framePadding, framePadding, design.size, design.size);
  if (design.cta) {
    context.fillStyle = design.frame === "violet" ? "#ffffff" : design.ctaColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `600 ${Math.max(14, design.size * 0.023)}px ${design.font}, Arial, sans-serif`;
    context.fillText(design.cta, canvas.width / 2, framePadding + design.size + labelHeight / 2, design.size * 0.9);
  }
  if (!isPro) {
    context.fillStyle = "#73717b";
    context.globalAlpha = 0.76;
    context.textAlign = "right";
    context.font = `600 ${Math.max(14, design.size * 0.04)}px Arial, sans-serif`;
    context.textBaseline = "middle";
    context.fillText("Made with QRcraft", canvas.width - framePadding - Math.max(12, design.size * 0.025), framePadding + design.size + labelHeight + watermarkHeight / 2);
    context.globalAlpha = 1;
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export could not be created."))), "image/png")
  );
}

async function makeSvgBlob(design: Design, data: string): Promise<Blob> {
  const image = await prepareLogo(design);
  const qr = new QRCodeStyling(makeOptions(design, data, design.size, image, "svg"));
  const result = await qr.getRawData("svg");
  if (!result) throw new Error("SVG export is not supported by this browser.");
  const resultBlob = toBlob(result, "image/svg+xml");
  const markup = await resultBlob.text();
  const parser = new DOMParser();
  const svg = parser.parseFromString(markup, "image/svg+xml").documentElement;
  const padding = design.frame === "none" ? 0 : Math.round(design.size * 0.045);
  const labelHeight = design.cta ? Math.round(design.size * 0.08) : 0;
  const width = design.size + padding * 2;
  const height = design.size + padding * 2 + labelHeight;
  const children = Array.from(svg.childNodes);
  const frameColor = design.frame === "violet" ? "#6558e8" : "#ffffff";
  const frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  frame.setAttribute("width", String(width));
  frame.setAttribute("height", String(height));
  frame.setAttribute("fill", frameColor);
  if (design.frame !== "none") frame.setAttribute("rx", String(Math.max(12, design.size * 0.025)));
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  if (padding) group.setAttribute("transform", `translate(${padding} ${padding})`);
  children.forEach((child) => group.appendChild(child));
  svg.replaceChildren(frame, group);
  if (design.cta) {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(width / 2));
    label.setAttribute("y", String(padding + design.size + labelHeight * 0.65));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-family", `${design.font}, Arial, sans-serif`);
    label.setAttribute("font-size", String(Math.max(14, design.size * 0.023)));
    label.setAttribute("font-weight", "600");
    label.setAttribute("fill", design.frame === "violet" ? "#ffffff" : design.ctaColor);
    label.textContent = design.cta;
    svg.appendChild(label);
  }
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QrStudio({ design, setDesign, isPro, onOpenPro, onNotify }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [batchEntries, setBatchEntries] = useState<{ name: string; data: string }[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batching, setBatching] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("content");
  const [recent, setRecent] = useState<{ items: RecentDesign[]; ready: boolean }>({ items: [], ready: false });
  const { data, error } = useMemo(() => getQrData(design), [design]);
  const contrast = Math.min(
    contrastRatio(design.foreground, design.background),
    design.gradient ? contrastRatio(design.gradientEnd, design.background) : Infinity
  );
  const exportSize = isPro ? design.size : Math.min(design.size, 1024);

  const update = useCallback(
    (changes: Partial<Design>) => {
      const importingLogo = Boolean(changes.logo && !isPro);
      const safeChanges = importingLogo
        ? { ...changes, logo: "", logoName: "", logoBackground: "none" as const }
        : changes;
      if (importingLogo) onOpenPro();
      if (Object.prototype.hasOwnProperty.call(safeChanges, "logo") && !safeChanges.logo) setLogoPreview("");
      setDesign((previous) => ({ ...previous, ...safeChanges }));
    },
    [isPro, onOpenPro, setDesign]
  );
  const updateValue = (key: string, value: string) =>
    setDesign((previous) => ({ ...previous, values: { ...previous.values, [key]: value } }));

  useEffect(() => {
    let items: RecentDesign[] = [];
    try {
      const saved = localStorage.getItem("qrcraft-recents");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Recent design history has an invalid format.");
        items = parsed.filter((entry): entry is RecentDesign =>
          entry && typeof entry.id === "string" && typeof entry.title === "string" &&
          typeof entry.savedAt === "number" && entry.design && typeof entry.design === "object" &&
          typeOptions.some((option) => option.value === entry.design.type) &&
          Boolean(entry.design.values) && typeof entry.design.values === "object" && !Array.isArray(entry.design.values)
        ).slice(0, 3);
      }
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Recent designs could not be loaded from this browser.");
    }
    // Load local-only history after the server-rendered editor has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecent({ items, ready: true });
  }, [onNotify]);

  const { logo, logoBackground } = design;
  useEffect(() => {
    let active = true;
    if (!logo) return;
    prepareLogo({ logo, logoBackground })
      .then((image) => {
        if (active) setLogoPreview(image);
      })
      .catch((cause: unknown) => {
        if (active) setPreviewError(cause instanceof Error ? cause.message : "The logo could not be prepared.");
      });
    return () => {
      active = false;
    };
  }, [logo, logoBackground]);

  useEffect(() => {
    let active = true;
    import("qr-code-styling").then(({ default: Styling }) => {
      if (!active || !hostRef.current || !data) return;
      const instance = new Styling(makeOptions(design, data, 320, logoPreview));
      hostRef.current.replaceChildren();
      instance.append(hostRef.current);
      qrRef.current = instance;
      setPreviewError("");
    }).catch((cause: unknown) => {
      if (active) setPreviewError(cause instanceof Error ? cause.message : "QR preview could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, [data, design, logoPreview]);

  const processImage = async (extension: "png" | "svg" | "copy") => {
    if (error || !data) {
      onNotify(error || "Add QR content before exporting.");
      return;
    }
    if (extension === "svg" && !isPro) {
      onOpenPro();
      return;
    }
    setExporting(true);
    try {
      if (extension === "svg") {
        downloadBlob(await makeSvgBlob(design, data), "qrcraft-design.svg");
        onNotify("Your SVG is ready to use.");
      } else {
        const exportDesign = isPro ? design : { ...design, size: exportSize, frame: "none" as const };
        const blob = await makePngBlob(exportDesign, data, isPro);
        if (extension === "copy") {
          if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
            throw new Error("Image clipboard is not supported in this browser.");
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          onNotify("QR image copied to your clipboard.");
        } else {
          downloadBlob(blob, `qrcraft-${exportSize}px.png`);
          onNotify(isPro ? "High-quality PNG downloaded." : "PNG downloaded with a large QRcraft watermark.");
        }
      }
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const uploadLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isPro) {
      onOpenPro();
      return;
    }
    if (!file.type.startsWith("image/")) {
      onNotify("Choose a PNG, JPEG, or SVG image for your logo.");
      return;
    }
    if (file.size > 512 * 1024) {
      onNotify("Please choose a logo smaller than 512 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        update({ logo: reader.result, logoName: file.name, correction: "H" });
      else onNotify("The logo could not be loaded.");
    };
    reader.onerror = () => onNotify("The logo could not be loaded.");
    reader.readAsDataURL(file);
  };

  const exportJson = () => {
    downloadBlob(new Blob([JSON.stringify(design, null, 2)], { type: "application/json" }), "qrcraft-design.json");
    onNotify("Design JSON downloaded. Import it later to restore this design.");
  };

  const saveRecent = () => {
    if (error || !data) {
      onNotify(error || "Add QR content before saving a recent design.");
      return;
    }
    const now = Date.now();
    const title = `${typeOptions.find((option) => option.value === design.type)?.label ?? "QR code"} · ${new Date(now).toLocaleString()}`;
    const item: RecentDesign = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      savedAt: now,
      design
    };
    const items = [item, ...recent.items].slice(0, 3);
    try {
      localStorage.setItem("qrcraft-recents", JSON.stringify(items));
      setRecent({ items, ready: true });
      onNotify("Design saved to recent designs on this device.");
    } catch {
      onNotify("Recent design storage is full. Remove a large logo or clear old designs and try again.");
    }
  };

  const loadRecent = (item: RecentDesign) => {
    update({ ...item.design });
    setMobileTab("content");
    onNotify("Recent design restored.");
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem("qrcraft-recents");
      setRecent({ items: [], ready: true });
      onNotify("Recent designs cleared from this device.");
    } catch {
      onNotify("Recent designs could not be cleared from browser storage.");
    }
  };

  const resetDesign = () => {
    update({ ...initialDesign, values: { ...initialDesign.values } });
    setMobileTab("content");
    onNotify("Studio reset to the default design.");
  };

  const loadBatchCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const source = String(reader.result ?? "");
        const rows: string[][] = [];
        let row: string[] = [];
        let cell = "";
        let quoted = false;
        for (let index = 0; index < source.length; index += 1) {
          const character = source[index];
          if (character === '"') {
            if (quoted && source[index + 1] === '"') {
              cell += '"';
              index += 1;
            } else quoted = !quoted;
          } else if (character === "," && !quoted) {
            row.push(cell);
            cell = "";
          } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && source[index + 1] === "\n") index += 1;
            row.push(cell);
            if (row.some((value) => value.trim())) rows.push(row);
            row = [];
            cell = "";
          } else cell += character;
        }
        if (quoted) throw new Error("This CSV has an unclosed quoted field.");
        if (cell || row.length) {
          row.push(cell);
          if (row.some((value) => value.trim())) rows.push(row);
        }
        if (!rows.length) throw new Error("Add a CSV with a header row and a URL column.");
        const headers = rows[0].map((header) => header.trim().toLowerCase());
        const urlColumn = headers.findIndex((header) => ["url", "link", "data", "website"].includes(header));
        if (urlColumn < 0) throw new Error("Add a `url` column to your CSV header.");
        const nameColumn = headers.findIndex((header) => ["name", "label", "title"].includes(header));
        const entries = rows.slice(1).map((cells, index) => {
          const data = (cells[urlColumn] ?? "").trim();
          if (!data) return null;
          try {
            const parsed = new URL(data);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
          } catch {
            return null;
          }
          return { name: (nameColumn >= 0 ? cells[nameColumn]?.trim() : "") || `qr-${index + 1}`, data };
        }).filter((entry): entry is { name: string; data: string } => entry !== null);
        if (!entries.length) throw new Error("No valid http or https URLs were found in the CSV.");
        if (entries.length > 100) throw new Error("For reliable browser performance, batch a maximum of 100 URLs at a time.");
        setBatchEntries(entries);
        onNotify(`${entries.length} valid URLs ready to generate.`);
      } catch (cause) {
        setBatchEntries([]);
        onNotify(cause instanceof Error ? cause.message : "The CSV file could not be read.");
      }
    };
    reader.onerror = () => onNotify("The CSV file could not be read.");
    reader.readAsText(file);
  };

  const generateBatch = async () => {
    if (!batchEntries.length || batching) return;
    setBatching(true);
    try {
      const archive = new JSZip();
      for (let index = 0; index < batchEntries.length; index += 1) {
        const entry = batchEntries[index];
        const filename = entry.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").trim().slice(0, 64) || `qr-${index + 1}`;
        archive.file(`${String(index + 1).padStart(3, "0")}-${filename}.png`, await makePngBlob(design, entry.data, true));
      }
      downloadBlob(await archive.generateAsync({ type: "blob" }), "qrcraft-batch.zip");
      onNotify(`${batchEntries.length} QR codes are ready in your ZIP.`);
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Batch generation failed. Please try again.");
    } finally {
      setBatching(false);
    }
  };

  return (
    <div className="studio-grid">
      <section className="panel editor-card" aria-label="QR code editor">
        <div className="card-title">
          <h3>Build your QR code</h3>
          <div className="card-title-actions">
            {isPro && <span className="step-chip pro-badge">PRO UNLOCKED</span>}
            <button type="button" className="btn btn-ghost reset-button" onClick={resetDesign}><RotateCcw size={13} /> Reset</button>
          </div>
        </div>
        <div className="editor-tabbar" role="tablist" aria-label="QR editor sections">
          {(["content", "design", "export"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={mobileTab === tab}
              aria-controls={`editor-${tab}`}
              className={`editor-tab ${mobileTab === tab ? "active" : ""}`}
              onClick={() => setMobileTab(tab)}
            >
              {tab === "content" ? "Content" : tab === "design" ? "Design" : "Export"}
            </button>
          ))}
        </div>
        <div id="editor-content" role="tabpanel" className={`editor-tab-panel ${mobileTab === "content" ? "mobile-active" : ""}`}>
        <div className="control">
          <label className="field-label">What are you sharing?</label>
          <div className="type-grid">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                aria-pressed={design.type === value}
                className={`type-button ${design.type === value ? "active" : ""}`}
                onClick={() => update({ type: value })}
              >
                <Icon size={16} strokeWidth={1.8} />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="control">
          {design.type === "website" && (
            <Field label="Website URL" value={design.values.url ?? ""} onChange={(value) => updateValue("url", value)} placeholder="https://yourwebsite.com" />
          )}
          {design.type === "payment" && (
            <>
              <div className="control">
                <label className="field-label">Payment provider <span className="hint">optional</span></label>
                <div className="select-wrap">
                  <select className="field" defaultValue="custom" onChange={(event) => {
                    const urls: Record<string, string> = {
                      paypal: "https://paypal.me/yourname",
                      stripe: "https://buy.stripe.com/your-payment-link",
                      upi: "upi://pay?pa=yourname@upi&pn=Your%20Name"
                    };
                    if (urls[event.target.value]) updateValue("url", urls[event.target.value]);
                  }}>
                    <option value="custom">Custom payment link</option>
                    <option value="paypal">PayPal.me</option>
                    <option value="stripe">Stripe payment link</option>
                    <option value="upi">UPI payment link</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <Field label="Payment URL" value={design.values.url ?? ""} onChange={(value) => updateValue("url", value)} placeholder="https://your-payment-link.com" />
            </>
          )}
          {design.type === "instagram" && (
            <Field label="Instagram username or profile URL" value={design.values.username ?? ""} onChange={(value) => updateValue("username", value)} placeholder="@yourhandle or instagram.com/yourhandle" />
          )}
          {design.type === "whatsapp" && (
            <>
              <Field label="WhatsApp number" value={design.values.phone ?? ""} onChange={(value) => updateValue("phone", value)} placeholder="+91 98765 43210" type="tel" />
              <div className="control"><label className="field-label" htmlFor="whatsapp-message">Prefilled message <span className="hint">optional</span></label><textarea id="whatsapp-message" className="field" value={design.values.message ?? ""} onChange={(event) => updateValue("message", event.target.value)} placeholder="Hi! I’d love to know more." /></div>
            </>
          )}
          {design.type === "text" && (
            <div className="control">
              <label className="field-label">Your message <span className="hint">{(design.values.text ?? "").length}/1,000</span></label>
              <textarea className="field" maxLength={1000} value={design.values.text ?? ""} onChange={(event) => updateValue("text", event.target.value)} placeholder="Write a note, directions, or any message..." />
            </div>
          )}
          {design.type === "wifi" && (
            <>
              <Field label="Network name (SSID)" value={design.values.ssid ?? ""} onChange={(value) => updateValue("ssid", value)} placeholder="e.g. Studio Guest" />
              <Field label="Password" value={design.values.password ?? ""} onChange={(value) => updateValue("password", value)} placeholder="Your Wi-Fi password" type="password" />
              <div className="control">
                <label className="field-label">Encryption</label>
                <div className="select-wrap">
                  <select className="field" value={design.values.encryption ?? "WPA"} onChange={(event) => updateValue("encryption", event.target.value)}>
                    <option value="WPA">WPA / WPA2</option><option value="WEP">WEP</option><option value="nopass">None</option>
                  </select><ChevronDown size={14} />
                </div>
              </div>
              <label className="toggle-row field-label">Hidden network <input className="switch" type="checkbox" checked={design.hidden} onChange={(event) => update({ hidden: event.target.checked })} /></label>
            </>
          )}
          {design.type === "email" && (
            <>
              <Field label="Email address" value={design.values.email ?? ""} onChange={(value) => updateValue("email", value)} placeholder="hello@example.com" type="email" />
              <Field label="Subject" value={design.values.subject ?? ""} onChange={(value) => updateValue("subject", value)} placeholder="A little hello" />
              <div className="control"><label className="field-label">Message <span className="hint">optional</span></label><textarea className="field" value={design.values.body ?? ""} onChange={(event) => updateValue("body", event.target.value)} placeholder="Add a pre-filled message..." /></div>
            </>
          )}
          {design.type === "phone" && (
            <Field label="Phone number" value={design.values.phone ?? ""} onChange={(value) => updateValue("phone", value)} placeholder="+1 555 123 4567" type="tel" />
          )}
          {design.type === "sms" && (
            <>
              <Field label="Phone number" value={design.values.phone ?? ""} onChange={(value) => updateValue("phone", value)} placeholder="+1 555 123 4567" type="tel" />
              <div className="control"><label className="field-label">Message <span className="hint">optional</span></label><textarea className="field" value={design.values.body ?? ""} onChange={(event) => updateValue("body", event.target.value)} placeholder="Add a pre-filled text message..." /></div>
            </>
          )}
          {design.type === "vcard" && (
            <>
              <Field label="Full name" value={design.values.name ?? ""} onChange={(value) => updateValue("name", value)} placeholder="Alex Morgan" />
              <div className="two-col">
                <Field label="Company" value={design.values.company ?? ""} onChange={(value) => updateValue("company", value)} placeholder="Company" />
                <Field label="Job title" value={design.values.title ?? ""} onChange={(value) => updateValue("title", value)} placeholder="Designer" />
                <Field label="Phone" value={design.values.phone ?? ""} onChange={(value) => updateValue("phone", value)} placeholder="+1 555 123 4567" />
                <Field label="Email" value={design.values.email ?? ""} onChange={(value) => updateValue("email", value)} placeholder="alex@example.com" />
                <Field label="Website" value={design.values.website ?? ""} onChange={(value) => updateValue("website", value)} placeholder="https://..." />
                <Field label="Address" value={design.values.address ?? ""} onChange={(value) => updateValue("address", value)} placeholder="Street, city, country" />
              </div>
            </>
          )}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
        </div>

        <div id="editor-design" role="tabpanel" className={`editor-tab-panel ${mobileTab === "design" ? "mobile-active" : ""}`}>
        <hr className="divider" />
        <h4 className="section-label"><Paintbrush size={14} /> Make it yours</h4>
        <div className="color-row">
          <div className="control">
            <label className="field-label">Foreground</label>
            <div className="color-field"><input aria-label="Foreground color" type="color" value={design.foreground} onChange={(event) => update({ foreground: event.target.value })} /><span>{design.foreground.toUpperCase()}</span></div>
          </div>
          <div className="control">
            <label className="field-label">Background</label>
            <div className="color-field"><input aria-label="Background color" type="color" value={design.background} onChange={(event) => update({ background: event.target.value })} /><span>{design.background.toUpperCase()}</span></div>
          </div>
        </div>
        <div className="control">
          <label className="toggle-row field-label">Use a color gradient <input className="switch" type="checkbox" checked={design.gradient} onChange={(event) => update({ gradient: event.target.checked })} /></label>
          {design.gradient && <div className="color-row gradient-colors">
            <div className="color-field"><input aria-label="Gradient start color" type="color" value={design.foreground} onChange={(event) => update({ foreground: event.target.value })} /><span>Start color</span></div>
            <div className="color-field"><input aria-label="Gradient end color" type="color" value={design.gradientEnd} onChange={(event) => update({ gradientEnd: event.target.value })} /><span>End color</span></div>
            <div className="range-row"><input aria-label="Gradient angle" type="range" min="0" max="360" value={design.gradientAngle} onChange={(event) => update({ gradientAngle: Number(event.target.value) })} /><span className="range-value">{design.gradientAngle}°</span></div>
          </div>}
        </div>
        <div className="three-col control">
          <div><label className="field-label">Dot style</label><div className="select-wrap"><select aria-label="Dot style" className="field" value={design.dotStyle} onChange={(event) => update({ dotStyle: event.target.value })}>{dotStyles.map((style) => <option key={style}>{style}</option>)}</select><ChevronDown size={13} /></div></div>
          <div><label className="field-label">Corner shape</label><div className="select-wrap"><select aria-label="Corner square style" className="field" value={design.cornerStyle} onChange={(event) => update({ cornerStyle: event.target.value })}>{cornerStyles.map((style) => <option key={style}>{style}</option>)}</select><ChevronDown size={13} /></div></div>
          <div><label className="field-label">Corner dot</label><div className="select-wrap"><select aria-label="Corner dot style" className="field" value={design.cornerDotStyle} onChange={(event) => update({ cornerDotStyle: event.target.value })}>{cornerDotStyles.map((style) => <option key={style}>{style}</option>)}</select><ChevronDown size={13} /></div></div>
        </div>
        <div className="two-col control">
          <div><label className="field-label">QR size <span className="hint">{isPro ? "up to 2048px" : "Pro: 2048px"}</span></label><div className="range-row"><input aria-label="QR export size" type="range" min="256" max={isPro ? 2048 : 1024} step="64" value={Math.min(design.size, isPro ? 2048 : 1024)} onChange={(event) => update({ size: Number(event.target.value) })} /><span className="range-value">{exportSize}px</span></div></div>
          <div><label className="field-label">Quiet zone <span className="hint">margin</span></label><div className="range-row"><input aria-label="Quiet zone margin" type="range" min="0" max="40" value={design.margin} onChange={(event) => update({ margin: Number(event.target.value) })} /><span className="range-value">{design.margin}px</span></div><p className="helper">A scan-safe minimum is always kept around the code.</p></div>
        </div>
        <div className="two-col control">
          <div><label className="field-label">QR frame <span className="hint">Pro</span></label><div className="select-wrap"><select className="field" value={isPro ? design.frame : "none"} disabled={!isPro} onChange={(event) => update({ frame: event.target.value as Design["frame"] })}><option value="none">No frame</option><option value="soft">Soft white</option><option value="violet">QRcraft violet</option></select><ChevronDown size={13} /></div></div>
          {!isPro && <div className="frame-unlock"><button className="btn btn-soft" onClick={onOpenPro}><LockKeyhole size={12} /> Unlock frames</button></div>}
        </div>
        <div className="two-col control">
          <div><label className="field-label">Error correction</label><div className="select-wrap"><select className="field" value={design.logo ? "H" : design.correction} disabled={Boolean(design.logo)} onChange={(event) => update({ correction: event.target.value as Design["correction"] })}><option value="L">L · 7%</option><option value="M">M · 15%</option><option value="Q">Q · 25%</option><option value="H">H · 30%</option></select><ChevronDown size={13} /></div>{design.logo && <p className="helper">Set to H automatically for logo reliability.</p>}</div>
          <div><label className="field-label">Logo size <span className="hint">{design.logoSize}%</span></label><div className="range-row"><input aria-label="Logo size" type="range" min="15" max="32" value={design.logoSize} disabled={!design.logo} onChange={(event) => update({ logoSize: Number(event.target.value) })} /><span className="range-value">{design.logoSize}%</span></div></div>
        </div>
        <div className="two-col control">
          <div><label className="field-label">Logo image <span className="hint">Pro</span></label><div className="upload-box">{design.logo ? <><div className="uploaded-logo">{logoPreview && <NextImage src={logoPreview} alt="" width={25} height={25} unoptimized />}<span title={design.logoName}>{design.logoName}</span><button type="button" aria-label="Remove logo" className="btn btn-ghost" onClick={() => update({ logo: "", logoName: "" })}><X size={14} /></button></div></> : <><button type="button" className="upload-action" onClick={() => isPro ? logoInputRef.current?.click() : onOpenPro()}><ImagePlus size={14} /> Upload logo {!isPro && <LockKeyhole size={12} />}</button><input ref={logoInputRef} type="file" accept="image/*" disabled={!isPro} onChange={uploadLogo} /></>}<p className="helper">PNG, JPG, or SVG · up to 512 KB{!isPro ? " · Pro" : " · processed locally"}</p></div></div>
          <div><label className="field-label">Logo background</label><div className="select-wrap"><select className="field" value={design.logoBackground} disabled={!design.logo} onChange={(event) => update({ logoBackground: event.target.value as Design["logoBackground"] })}><option value="none">None</option><option value="circle">White circle</option><option value="rounded">Rounded square</option></select><ChevronDown size={13} /></div></div>
        </div>
        <hr className="divider" />
        <h4 className="section-label"><Type size={14} /> A little prompt</h4>
        <Field label="Call-to-action label" value={design.cta} onChange={(value) => update({ cta: value })} placeholder="e.g. Scan to view our menu" />
        <div className="two-col control">
          <div><label className="field-label">Font</label><div className="select-wrap"><select className="field" value={design.font} onChange={(event) => update({ font: event.target.value })}><option>Inter</option><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option></select><ChevronDown size={13} /></div></div>
          <div><label className="field-label">Label color</label><div className="color-field"><input aria-label="CTA text color" type="color" value={design.ctaColor} onChange={(event) => update({ ctaColor: event.target.value })} /><span>{design.ctaColor.toUpperCase()}</span></div></div>
        </div>
        <button className="btn btn-outline import-json" onClick={() => document.getElementById("design-json")?.click()}><FileJson size={14} /> Import design JSON</button>
        <input id="design-json" type="file" accept="application/json,.json" hidden onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const imported = JSON.parse(String(reader.result)) as Partial<Design>;
              if (!imported || !typeOptions.some((option) => option.value === imported.type) || !imported.values || typeof imported.values !== "object" || typeof imported.foreground !== "string" || typeof imported.background !== "string") throw new Error("This file is not a valid QRcraft design.");
              update({ ...initialDesign, ...imported, values: { ...initialDesign.values, ...imported.values } });
              onNotify("Your local design was imported.");
            } catch (cause) {
              onNotify(cause instanceof Error ? cause.message : "The JSON file could not be imported.");
            }
          };
          reader.onerror = () => onNotify("The JSON file could not be read.");
          reader.readAsText(file);
        }} />
        </div>

        <div id="editor-export" role="tabpanel" className={`editor-tab-panel editor-export-tab ${mobileTab === "export" ? "mobile-active" : ""}`}>
          <h4 className="section-label"><Download size={14} /> Export & save</h4>
          <p className="export-intro">{isPro ? "Your QR and design files are generated on this device. Pro exports are watermark-free." : "Your QR and design files are generated on this device. Free PNGs include a prominent QRcraft watermark."}</p>
          <div className="export-tab-actions">
            <button className="btn btn-primary" disabled={exporting || Boolean(error)} onClick={() => void processImage("png")}><Download size={15} />{exporting ? "Preparing…" : `Download PNG · ${exportSize}px`}</button>
            <button className={`btn ${isPro ? "btn-outline" : "btn-soft"}`} onClick={() => void processImage("svg")}>{isPro ? <Download size={15} /> : <LockKeyhole size={13} />} {isPro ? "Download SVG" : "Unlock SVG with Pro"}</button>
            <button className="btn btn-outline" disabled={exporting || Boolean(error)} onClick={() => void processImage("copy")}><Copy size={14} /> Copy QR image</button>
            <button className="btn btn-outline" onClick={exportJson}><FileJson size={14} /> Download design JSON</button>
            <button className="btn btn-outline" disabled={Boolean(error)} onClick={saveRecent}><Save size={14} /> Save to recent designs</button>
            <button className="btn btn-outline" onClick={() => document.getElementById("design-json")?.click()}><FileJson size={14} /> Import design JSON</button>
          </div>
          <div className="recent-header">
            <div><h4>Recent designs</h4><p>Saved only in this browser.</p></div>
            {recent.items.length > 0 && <button className="btn btn-ghost" onClick={clearRecent}>Clear</button>}
          </div>
          {!recent.ready ? <div className="recent-empty">Loading recent designs…</div> : recent.items.length > 0 ? <div className="recent-list">
            {recent.items.map((item) => <button key={item.id} type="button" className="recent-item" onClick={() => loadRecent(item)}>
              <span className="recent-icon"><QrCode size={16} /></span><span className="recent-copy"><b>{item.title.split(" · ")[0]}</b><small>{new Date(item.savedAt).toLocaleString()}</small></span><ChevronDown size={14} className="recent-arrow" />
            </button>)}
          </div> : <div className="recent-empty">Saved designs will appear here when you choose “Save to recent designs”.</div>}
          {isPro && <div className="batch-panel">
            <label className="toggle-row field-label">Batch QR codes · Pro <button className="btn btn-ghost" onClick={() => setBatchOpen((value) => !value)}>{batchOpen ? "Close" : "Open"}</button></label>
            {batchOpen && <>
              <p>Upload a CSV with a <b>url</b> column and an optional <b>name</b> column. Up to 100 PNGs are generated locally and bundled into a ZIP.</p>
              <input type="file" accept=".csv,text/csv" onChange={loadBatchCsv} />
              {batchEntries.length > 0 && <p>{batchEntries.length} URLs ready. Current design styling will be applied to each.</p>}
              <button className="btn btn-primary" disabled={!batchEntries.length || batching} onClick={() => void generateBatch()}><Download size={14} />{batching ? "Creating ZIP…" : "Generate batch ZIP"}</button>
            </>}
          </div>}
        </div>
      </section>

      <aside className="panel preview-card" aria-label="Live QR preview">
        <div className="preview-head"><h3>Your live preview</h3><span className="live-pill"><span className="live-dot" /> LIVE</span></div>
        <div className="qr-canvas-area">
          {data && !error ? <div key="qr-preview" className={`qr-frame frame-${isPro ? design.frame : "none"}`}>
            <div ref={hostRef} className="qr-host" />
            {design.cta && <div className="cta-preview" style={{ color: isPro && design.frame === "violet" ? "#ffffff" : design.ctaColor, fontFamily: design.font }}>{design.cta}</div>}
          </div> : <div key="qr-empty" className="empty-preview"><div className="empty-icon"><QrCode size={22} /></div><b>Your QR preview is waiting</b><br />Add your details on the left and your design will appear right here.</div>}
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        {previewError && <p className="field-error" role="alert">{previewError}</p>}
        {contrast < 4.5 && <div className="contrast-warning"><AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />Low contrast ({contrast.toFixed(1)}:1). QRcraft is using a high-contrast fallback; adjust the colors to restore your chosen palette.</div>}
        <p className="preview-meta">PNG export · {exportSize} × {exportSize}px{!isPro && design.size > exportSize ? " · Pro unlocks up to 2048px" : ""} · {design.logo ? "Error correction H" : `Correction ${design.correction}`}</p>
        <div className="preview-actions">
          <button className="btn btn-primary" disabled={exporting || Boolean(error)} onClick={() => void processImage("png")}><Download size={15} />{exporting ? "Preparing…" : "Download PNG"}</button>
          <button className={`btn ${isPro ? "btn-outline" : "btn-soft"}`} onClick={() => void processImage("svg")}><Download size={15} />{isPro ? "Download SVG" : <><LockKeyhole size={13} /> SVG · Pro</>}</button>
        </div>
        <div className="preview-actions secondary-actions">
          <button className="btn btn-outline" disabled={exporting || Boolean(error)} onClick={() => void processImage("copy")}><Copy size={14} /> Copy image</button>
          <button className="btn btn-outline" disabled={Boolean(error)} onClick={saveRecent}><Save size={14} /> Save recent</button>
        </div>
        {!isPro && <div className="upgrade-strip">
          <p><b>Made with QRcraft</b><br />Free PNGs include a prominent watermark.</p>
          <button className="btn btn-soft" onClick={onOpenPro}><Sparkles size={13} /> Go Pro</button>
        </div>}
        {isPro && <div className="upgrade-strip unlocked-strip"><p><b><Check size={12} /> Pro unlocked</b><br />Watermark-free, high-resolution exports enabled.</p><span className="step-chip">PRO</span></div>}
      </aside>
    </div>
  );
}
