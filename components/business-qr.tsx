"use client";

import { AlertTriangle, Download, LockKeyhole, Printer } from "lucide-react";
import QRCodeStyling, { type Options as QRCodeOptions } from "qr-code-styling";
import { useEffect, useRef, useState } from "react";
import { contrastRatio, getSafeQrInk } from "@/lib/qr";
import { escapeHtml } from "@/lib/business-tools";

export type PrintFormat = "business-card" | "a4-poster" | "instagram-post" | "instagram-story" | "menu-card" | "product-label";

const printFormats: { value: PrintFormat; label: string; width: number; height: number; cssSize: string }[] = [
  { value: "business-card", label: "Business card · 3.5 × 2 in", width: 1050, height: 600, cssSize: "3.5in 2in" },
  { value: "a4-poster", label: "A4 poster", width: 2480, height: 3508, cssSize: "210mm 297mm" },
  { value: "instagram-post", label: "Instagram post", width: 1080, height: 1080, cssSize: "1080px 1080px" },
  { value: "instagram-story", label: "Instagram story", width: 1080, height: 1920, cssSize: "1080px 1920px" },
  { value: "menu-card", label: "Menu card", width: 900, height: 1400, cssSize: "3in 4.67in" },
  { value: "product-label", label: "Product label · 2 × 2 in", width: 600, height: 600, cssSize: "2in 2in" }
];

type Props = {
  data: string;
  primary: string;
  background: string;
  logo: string;
  cta: string;
  isPro: boolean;
  size?: number;
  printHeading?: string;
  printFormat?: PrintFormat;
  onPrintFormatChange?: (format: PrintFormat) => void;
  onOpenPro: () => void;
  onNotify: (message: string) => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function makeOptions(data: string, width: number, primary: string, background: string, logo: string, type: "canvas" | "svg" = "canvas"): QRCodeOptions {
  const design = { foreground: primary, gradientEnd: primary, gradient: false, background };
  const ink = getSafeQrInk(design);
  return {
    width,
    height: width,
    type,
    data,
    margin: Math.max(12, Math.ceil(width * 4 / 177)),
    qrOptions: { errorCorrectionLevel: logo ? "H" : "Q" },
    image: logo || undefined,
    imageOptions: { hideBackgroundDots: true, imageSize: logo ? 0.2 : 0.3, margin: 8, crossOrigin: "anonymous" },
    dotsOptions: { type: "rounded", color: ink.foreground },
    cornersSquareOptions: { type: "extra-rounded", color: ink.foreground },
    cornersDotOptions: { type: "dot", color: ink.foreground },
    backgroundOptions: { color: background }
  };
}

function toBlob(value: Blob | Buffer, type: string) {
  return value instanceof Blob ? value : new Blob([new Uint8Array(value)], { type });
}

function makePrintHtml(svgData: string, heading: string, cta: string, format: PrintFormat, isPro: boolean) {
  const selected = printFormats.find((item) => item.value === format) ?? printFormats[0];
  const watermark = isPro ? "" : '<small class="watermark">Made with QRcraft</small>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)} · QRcraft</title><style>@page{size:${selected.cssSize};margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.sheet{width:${selected.width}px;height:${selected.height}px;display:grid;place-content:center;justify-items:center;gap:3%;padding:6%;text-align:center;background:#fff;color:#211f35}.sheet h1{font-size:clamp(34px,5vw,92px);margin:0}.sheet p{font-size:clamp(20px,2.4vw,48px);margin:0}.sheet img{width:min(68%,52vh);max-height:68%;object-fit:contain}.table .sheet{border:3px solid #292342}.poster .sheet{background:linear-gradient(160deg,#f6f3ff,#fff 60%)}.watermark{position:fixed;bottom:12px;right:18px;font-size:12px;opacity:.55}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body class="${format === "business-card" || format === "menu-card" ? "table" : "poster"}"><main class="sheet"><h1>${escapeHtml(heading)}</h1><img alt="QR code" src="${svgData}"><p>${escapeHtml(cta)}</p></main>${watermark}</body></html>`;
}

export default function BusinessQr({
  data,
  primary,
  background,
  logo,
  cta,
  isPro,
  size = 1024,
  printHeading = "Scan with your camera",
  printFormat: controlledPrintFormat,
  onPrintFormatChange,
  onOpenPro,
  onNotify
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [localPrintFormat, setLocalPrintFormat] = useState<PrintFormat>("business-card");
  const printFormat = controlledPrintFormat ?? localPrintFormat;
  const contrast = contrastRatio(primary, background);

  useEffect(() => {
    let active = true;
    if (!data) {
      hostRef.current?.replaceChildren();
      qrRef.current = null;
      return;
    }
    import("qr-code-styling").then(({ default: Styling }) => {
      if (!active || !hostRef.current) return;
      const instance = new Styling(makeOptions(data, 256, primary, background, logo));
      hostRef.current.replaceChildren();
      instance.append(hostRef.current);
      qrRef.current = instance;
      setPreviewError("");
    }).catch((cause: unknown) => {
      if (active) setPreviewError(cause instanceof Error ? cause.message : "The QR preview could not be loaded.");
    });
    return () => { active = false; };
  }, [data, primary, background, logo]);

  const exportPng = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const qr = new QRCodeStyling(makeOptions(data, Math.min(isPro ? size : 1024, 2048), primary, background, logo));
      const result = await qr.getRawData("png");
      if (!result) throw new Error("PNG export is not supported by this browser.");
      const image = await createImageBitmap(toBlob(result, "image/png"));
      const output = document.createElement("canvas");
      const labelHeight = cta ? Math.max(48, Math.round(image.width * 0.1)) : 0;
      const watermarkHeight = isPro ? 0 : Math.max(28, Math.round(image.width * 0.06));
      output.width = image.width;
      output.height = image.height + labelHeight + watermarkHeight;
      const context = output.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the PNG export.");
      context.fillStyle = background;
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(image, 0, 0);
      if (cta) {
        context.fillStyle = contrast >= 4.5 ? primary : "#111111";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = `600 ${Math.max(14, image.width * 0.025)}px Arial,sans-serif`;
        context.fillText(cta, output.width / 2, image.height + labelHeight / 2, output.width * 0.9);
      }
      if (!isPro) {
        context.fillStyle = "#696778";
        context.globalAlpha = 0.8;
        context.textAlign = "right";
        context.font = `600 ${Math.max(12, image.width * 0.022)}px Arial,sans-serif`;
        context.fillText("Made with QRcraft", output.width - 16, output.height - watermarkHeight / 2);
      }
      const blob = await new Promise<Blob>((resolve, reject) => {
        output.toBlob((value) => value ? resolve(value) : reject(new Error("PNG export could not be created.")), "image/png");
      });
      downloadBlob(blob, `qrcraft-${Math.min(isPro ? size : 1024, 2048)}px.png`);
      onNotify("QR PNG downloaded.");
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "PNG export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportSvg = async () => {
    if (!isPro) {
      onOpenPro();
      return;
    }
    if (!data) return;
    setExporting(true);
    try {
      const qr = new QRCodeStyling(makeOptions(data, Math.min(size, 2048), primary, background, logo, "svg"));
      const result = await qr.getRawData("svg");
      if (!result) throw new Error("SVG export is not supported by this browser.");
      downloadBlob(toBlob(result, "image/svg+xml"), "qrcraft-code.svg");
      onNotify("Scalable SVG downloaded.");
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "SVG export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportPrintHtml = async () => {
    if (!isPro) {
      onOpenPro();
      return;
    }
    if (!data) return;
    setExporting(true);
    try {
      const qr = new QRCodeStyling(makeOptions(data, 1024, primary, background, logo, "svg"));
      const result = await qr.getRawData("svg");
      if (!result) throw new Error("A print-ready QR could not be created.");
      const svg = await toBlob(result, "image/svg+xml").text();
      const encoded = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      const html = makePrintHtml(encoded, printHeading, cta, printFormat, isPro);
      downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `qrcraft-${printFormat}-print.html`);
      onNotify("Print-ready HTML template downloaded. Open it and choose Print.");
    } catch (cause) {
      onNotify(cause instanceof Error ? cause.message : "Print export failed.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="business-qr-preview" aria-label="QR preview and export">
      <div className="business-qr-shell">
        <div className="business-qr-art">
          {data
            ? <div ref={hostRef} className="business-qr-host" />
            : <div className="business-qr-empty"><AlertTriangle size={20} /><span>Add valid details to see your QR code.</span></div>}
        </div>
        {cta && <p className="business-qr-cta">{cta}</p>}
      </div>
      {data && previewError && <p className="field-error" role="alert">{previewError}</p>}
      {data && contrast < 4.5 && <p className="business-quality-warning"><AlertTriangle size={14} /> Low foreground/background contrast ({contrast.toFixed(1)}:1). Export uses a high-contrast fallback.</p>}
      <div className="business-qr-actions">
        <button type="button" className="btn btn-primary" disabled={!data || exporting} onClick={() => void exportPng()}><Download size={15} />{exporting ? "Preparing…" : "Download PNG"}</button>
        <button type="button" className="btn btn-outline" onClick={() => void exportSvg()}>{isPro ? <Download size={15} /> : <LockKeyhole size={14} />}{isPro ? "Download SVG" : "SVG · Pro"}</button>
      </div>
      <div className="business-print-export">
        <label className="field-label" htmlFor="business-print-format">Print template</label>
        <select id="business-print-format" className="field" value={printFormat} onChange={(event) => {
          const format = event.target.value as PrintFormat;
          setLocalPrintFormat(format);
          onPrintFormatChange?.(format);
        }}>
          {printFormats.map((format) => <option value={format.value} key={format.value}>{format.label}</option>)}
        </select>
        <button type="button" className="btn btn-outline full-width" disabled={!data || exporting} onClick={() => void exportPrintHtml()}><Printer size={15} />{isPro ? "Download print-ready template" : "Unlock print-ready exports · Pro"}</button>
      </div>
      {!isPro && <p className="business-qr-watermark">Free PNGs include the QRcraft watermark. SVG and print-ready exports are included with Pro.</p>}
    </section>
  );
}
