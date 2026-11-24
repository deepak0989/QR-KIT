"use client";

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { ChangeEvent, useId } from "react";
import Image from "next/image";
import {
  BusinessCardData,
  BusinessItem,
  BusinessPageData,
  BusinessSection,
  CatalogData,
  CatalogProduct,
  ReviewQrData,
  SectionKind,
  UpiQrData,
  businessCardHtml,
  businessPageFiles,
  catalogHtml,
  TEMPLATE_OPTIONS,
  createId,
  createSection,
  makeUpiUri,
  safeHttpUrl
} from "@/lib/business-tools";
import type { PrintFormat } from "@/components/business-qr";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  maxLength?: number;
}) {
  const id = useId();
  return <div className="business-control"><label className="field-label" htmlFor={id}>{label}{hint && <span className="hint">{hint}</span>}</label><input id={id} className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} /></div>;
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return <div className="business-control"><label className="field-label" htmlFor={id}>{label}</label><textarea id={id} className="field" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} /></div>;
}

function ImagePicker({ label, value, onChange, onUpgrade, isPro }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpgrade: () => void;
  isPro: boolean;
}) {
  const id = useId();
  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isPro) {
      onUpgrade();
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      window.alert("Choose a PNG, JPEG, or WebP image smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => window.alert("That image could not be read in this browser.");
    reader.readAsDataURL(file);
  };
  return <div className="business-control">
    <span className="field-label">{label}{!isPro && <span className="hint">Pro</span>}</span>
    <div className="business-image-row">
      {value && <Image src={value} alt="" width={42} height={42} unoptimized className="business-image-thumb" />}
      <label className="btn btn-outline business-image-button" htmlFor={id}><ImagePlus size={14} />{value ? "Change image" : "Choose image"}</label>
      <input id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={readImage} hidden />
      {value && <button type="button" className="btn btn-ghost" onClick={() => onChange("")}>Remove</button>}
    </div>
    <p className="helper">{isPro ? "Image stays on this device." : "Image upload is included with Pro."}</p>
  </div>;
}

function SectionItems({ section, updateSection }: {
  section: BusinessSection;
  updateSection: (patch: Partial<BusinessSection>) => void;
}) {
  const updateItem = (id: string, patch: Partial<BusinessItem>) => updateSection({
    items: section.items.map((item) => item.id === id ? { ...item, ...patch } : item)
  });
  const addItem = () => updateSection({
    items: [...section.items, { id: createId(), name: "", detail: "", price: "" }]
  });
  const showPrice = section.kind === "services";
  const showDetail = section.kind !== "hours";
  return <div className="business-section-items">
    {section.items.map((item, index) => <div className="business-item-editor" key={item.id}>
      <div className="business-item-head"><b>{section.kind === "testimonials" ? `Testimonial ${index + 1}` : section.kind === "hours" ? `Day or note ${index + 1}` : `Item ${index + 1}`}</b><button type="button" className="btn btn-ghost" aria-label="Remove item" onClick={() => updateSection({ items: section.items.filter((entry) => entry.id !== item.id) })}><Trash2 size={14} /></button></div>
      <TextField label={section.kind === "testimonials" ? "Customer name" : section.kind === "hours" ? "Day" : "Name"} value={item.name} onChange={(name) => updateItem(item.id, { name })} placeholder={section.kind === "hours" ? "Monday – Friday" : section.kind === "testimonials" ? "Happy customer" : "Service or item"} />
      {showDetail && <TextArea label={section.kind === "testimonials" ? "Review" : "Description"} value={item.detail} onChange={(detail) => updateItem(item.id, { detail })} placeholder={section.kind === "testimonials" ? "What did your customer say?" : "A short description"} rows={2} />}
      {showPrice && <TextField label="Price" value={item.price} onChange={(price) => updateItem(item.id, { price })} placeholder="From ₹500" />}
      {section.kind === "hours" && <TextField label="Hours" value={item.detail} onChange={(detail) => updateItem(item.id, { detail })} placeholder="9:00 AM – 6:00 PM" />}
    </div>)}
    <button type="button" className="btn btn-outline" onClick={addItem}><Plus size={14} />Add {section.kind === "hours" ? "hours" : section.kind === "testimonials" ? "testimonial" : "item"}</button>
  </div>;
}

export function BusinessPageEditor({ data, onChange, isPro, onUpgrade }: {
  data: BusinessPageData;
  onChange: (next: BusinessPageData) => void;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const patch = (updates: Partial<BusinessPageData>) => onChange({ ...data, ...updates });
  const updateSection = (id: string, updates: Partial<BusinessSection>) => patch({ sections: data.sections.map((section) => section.id === id ? { ...section, ...updates } : section) });
  const removeSection = (id: string) => patch({ sections: data.sections.filter((section) => section.id !== id) });
  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= data.sections.length) return;
    const sections = [...data.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    patch({ sections });
  };
  const addSection = (kind: SectionKind) => patch({ sections: [...data.sections, createSection(kind)] });
  const addGalleryImages = (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!isPro) {
      onUpgrade();
      return;
    }
    const accepted = files.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size <= 1_500_000).slice(0, 6);
    if (accepted.length !== files.length) window.alert("Gallery images must be PNG, JPEG, or WebP files under 1.5 MB each (up to 6 at a time).");
    accepted.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const section = data.sections.find((entry) => entry.id === id);
        if (section) updateSection(id, { images: [...section.images, reader.result].slice(0, 12) });
      };
      reader.readAsDataURL(file);
    });
  };

  return <div className="business-editor">
    <div className="business-form-section">
      <h3>Page basics</h3>
      <label className="field-label" htmlFor="business-template">Starting template</label>
      <select id="business-template" className="field" value={data.template} onChange={(event) => patch({ template: event.target.value as BusinessPageData["template"] })}>
        {TEMPLATE_OPTIONS.map((template) => <option value={template.id} key={template.id}>{template.title}</option>)}
      </select>
      <div className="two-col business-fields">
        <TextField label="Business name" value={data.businessName} onChange={(businessName) => patch({ businessName })} placeholder="Your business name" />
        <TextField label="Tagline" value={data.tagline} onChange={(tagline) => patch({ tagline })} placeholder="What makes you special?" />
      </div>
      <TextField label="Page title" value={data.title} onChange={(title) => patch({ title })} placeholder="Business name | Home" maxLength={80} />
      <TextArea label="Meta description" value={data.description} onChange={(description) => patch({ description })} placeholder="Describe your business in a sentence." rows={2} maxLength={320} />
      <TextField label="Hosted page URL for QR" value={data.hostedUrl} onChange={(hostedUrl) => patch({ hostedUrl })} placeholder="https://your-site.com (optional)" type="url" />
      <p className="helper">Export your page, host it yourself, then paste its public URL to create a shareable QR code.</p>
      <div className="two-col business-fields">
        <ImagePicker label="Business logo" value={data.logo} onChange={(logo) => patch({ logo })} isPro={isPro} onUpgrade={onUpgrade} />
        <ImagePicker label="Cover image" value={data.cover} onChange={(cover) => patch({ cover })} isPro={isPro} onUpgrade={onUpgrade} />
      </div>
    </div>

    <div className="business-form-section">
      <div className="business-section-title"><div><h3>Sections</h3><p>Reorder sections with the arrows. Add or remove them any time.</p></div></div>
      {data.sections.map((section, index) => <details className="business-section-card" key={section.id} open>
        <summary><span>{section.title || "Untitled section"}</span><span className="business-section-controls">
          <button type="button" aria-label="Move section up" disabled={index === 0} onClick={(event) => { event.preventDefault(); event.stopPropagation(); moveSection(index, -1); }}><ArrowUp size={14} /></button>
          <button type="button" aria-label="Move section down" disabled={index === data.sections.length - 1} onClick={(event) => { event.preventDefault(); event.stopPropagation(); moveSection(index, 1); }}><ArrowDown size={14} /></button>
          <button type="button" aria-label="Delete section" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeSection(section.id); }}><Trash2 size={14} /></button>
        </span></summary>
        <div className="business-section-body">
          <TextField label="Section heading" value={section.title} onChange={(title) => updateSection(section.id, { title })} />
          <TextArea label="Section text" value={section.body} onChange={(body) => updateSection(section.id, { body })} rows={3} />
          {["services", "hours", "testimonials"].includes(section.kind) && <SectionItems section={section} updateSection={(updates) => updateSection(section.id, updates)} />}
          {section.kind === "gallery" && <div className="business-gallery-editor">
            <label className="btn btn-outline" htmlFor={`gallery-${section.id}`}><ImagePlus size={14} />Add gallery photos {!isPro && "· Pro"}</label>
            <input id={`gallery-${section.id}`} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => addGalleryImages(section.id, event)} />
            <div className="business-gallery-thumbs">{section.images.map((image, imageIndex) => <div key={`${section.id}-${imageIndex}`}><Image src={image} alt={`Gallery image ${imageIndex + 1}`} width={120} height={80} unoptimized /><button type="button" className="btn btn-ghost" onClick={() => updateSection(section.id, { images: section.images.filter((_, itemIndex) => itemIndex !== imageIndex) })}>Remove</button></div>)}</div>
          </div>}
        </div>
      </details>)}
      <div className="business-add-section">
        <label className="field-label" htmlFor="new-business-section">Add a section</label>
        <select id="new-business-section" className="field" defaultValue="custom">
          {(["custom", "about", "services", "gallery", "testimonials", "hours", "contact"] as SectionKind[]).map((kind) => <option key={kind} value={kind}>{kind === "custom" ? "Custom section" : kind[0].toUpperCase() + kind.slice(1)}</option>)}
        </select>
        <button type="button" className="btn btn-outline" onClick={() => {
          const select = document.getElementById("new-business-section") as HTMLSelectElement | null;
          if (select) addSection(select.value as SectionKind);
        }}><Plus size={14} />Add section</button>
      </div>
    </div>

    <div className="business-form-section">
      <h3>Contact & social links</h3>
      <div className="two-col business-fields">
        <TextField label="Phone" type="tel" value={data.phone} onChange={(phone) => patch({ phone })} placeholder="+91 98765 43210" />
        <TextField label="WhatsApp number" type="tel" value={data.whatsapp} onChange={(whatsapp) => patch({ whatsapp })} placeholder="+91 98765 43210" />
        <TextField label="Email" type="email" value={data.email} onChange={(email) => patch({ email })} placeholder="hello@example.com" />
        <TextField label="Website" type="url" value={data.website} onChange={(website) => patch({ website })} placeholder="https://example.com" />
        <TextField label="Instagram link" type="url" value={data.instagram} onChange={(instagram) => patch({ instagram })} placeholder="https://instagram.com/yourhandle" />
        <TextField label="Facebook link" type="url" value={data.facebook} onChange={(facebook) => patch({ facebook })} placeholder="https://facebook.com/yourpage" />
        <TextField label="Google Maps link" type="url" value={data.maps} onChange={(maps) => patch({ maps })} placeholder="https://maps.google.com/..." />
        <TextField label="Call-to-action label" value={data.ctaLabel} onChange={(ctaLabel) => patch({ ctaLabel })} placeholder="Contact us" />
      </div>
      <p className="helper">Links are checked before being exported. The main action opens your hosted page, WhatsApp, or contact section.</p>
    </div>

    <div className="business-form-section">
      <h3>Brand & layout <span className="hint">{!isPro && "Advanced options · Pro"}</span></h3>
      <div className="business-color-grid">
        {[
          ["Primary color", data.primary, "primary"],
          ["Secondary color", data.secondary, "secondary"],
          ["Page background", data.background, "background"]
        ].map(([label, color, key]) => <label className="business-color-control" key={key}><span>{label}</span><input type="color" value={color} disabled={!isPro} onChange={(event) => patch({ [key]: event.target.value })} /></label>)}
      </div>
      {!isPro && <button type="button" className="btn btn-soft business-unlock-link" onClick={onUpgrade}>Unlock colors, fonts, and themes · Pro</button>}
      <div className="two-col business-fields">
        <label className="business-control"><span className="field-label">Font</span><select className="field" value={data.font} disabled={!isPro} onChange={(event) => patch({ font: event.target.value })}><option>Inter</option><option>Arial</option><option>Georgia</option><option>system-ui</option><option>Trebuchet MS</option></select></label>
        <label className="business-control"><span className="field-label">Button shape</span><select className="field" value={data.buttonStyle} disabled={!isPro} onChange={(event) => patch({ buttonStyle: event.target.value as BusinessPageData["buttonStyle"] })}><option value="rounded">Rounded</option><option value="pill">Pill</option><option value="square">Square</option></select></label>
      </div>
      <div className="two-col business-fields">
        <label className="business-control"><span className="field-label">Page theme</span><select className="field" value={data.theme} disabled={!isPro} onChange={(event) => patch({ theme: event.target.value as BusinessPageData["theme"] })}><option value="light">Light</option><option value="dark">Dark</option></select></label>
        <div className="business-control"><span className="field-label">Export access</span><p className="helper">{isPro ? "HTML and ZIP with separate CSS and images." : "HTML export is free; ZIP export is included with Pro."}</p></div>
      </div>
    </div>
  </div>;
}

export function CatalogEditor({ data, onChange, isPro, onUpgrade }: {
  data: CatalogData;
  onChange: (next: CatalogData) => void;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const patch = (updates: Partial<CatalogData>) => onChange({ ...data, ...updates });
  const updateProduct = (id: string, updates: Partial<CatalogProduct>) => patch({ products: data.products.map((product) => product.id === id ? { ...product, ...updates } : product) });
  return <div className="business-editor">
    <div className="business-form-section">
      <h3>Catalog details</h3>
      <TextField label="Business name" value={data.businessName} onChange={(businessName) => patch({ businessName })} placeholder="Your store" />
      <div className="two-col business-fields">
        <TextField label="WhatsApp number" value={data.whatsapp} onChange={(whatsapp) => patch({ whatsapp })} type="tel" placeholder="+91 98765 43210" />
        <TextField label="Hosted catalog URL for QR" value={data.hostedUrl} onChange={(hostedUrl) => patch({ hostedUrl })} type="url" placeholder="https://your-hosted-catalog.com" />
      </div>
      <p className="helper">Export this catalog as HTML and host it, then use its public URL for a shareable QR code.</p>
      <ImagePicker label="Store logo" value={data.logo} onChange={(logo) => patch({ logo })} isPro={isPro} onUpgrade={onUpgrade} />
      <div className="business-color-grid">
        <label className="business-color-control"><span>Accent color</span><input type="color" value={data.primary} disabled={!isPro} onChange={(event) => patch({ primary: event.target.value })} /></label>
        <label className="business-color-control"><span>Background</span><input type="color" value={data.background} disabled={!isPro} onChange={(event) => patch({ background: event.target.value })} /></label>
      </div>
      <label className="business-control"><span className="field-label">Product layout</span><select className="field" value={data.layout} disabled={!isPro} onChange={(event) => patch({ layout: event.target.value as CatalogData["layout"] })}><option value="grid">Product cards</option><option value="list">Compact list</option></select></label>
    </div>
    <div className="business-form-section">
      <div className="business-section-title"><div><h3>Products</h3><p>Add photos, descriptions, prices, and a direct WhatsApp order link.</p></div><button type="button" className="btn btn-outline" onClick={() => patch({ products: [...data.products, { id: createId(), name: "", price: "", description: "", image: "", orderLink: "" }] })}><Plus size={14} />Add product</button></div>
      {data.products.map((product, index) => <details className="business-section-card" key={product.id} open>
        <summary><span>{product.name || `Product ${index + 1}`}</span><button type="button" aria-label={`Delete ${product.name || `product ${index + 1}`}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); patch({ products: data.products.filter((entry) => entry.id !== product.id) }); }}><Trash2 size={14} /></button></summary>
        <div className="business-section-body">
          <TextField label="Product name" value={product.name} onChange={(name) => updateProduct(product.id, { name })} placeholder="Product name" />
          <TextField label="Price" value={product.price} onChange={(price) => updateProduct(product.id, { price })} placeholder="₹499" />
          <TextArea label="Description" value={product.description} onChange={(description) => updateProduct(product.id, { description })} rows={2} placeholder="What should customers know?" />
          <TextField label="WhatsApp order link" value={product.orderLink} onChange={(orderLink) => updateProduct(product.id, { orderLink })} type="url" placeholder="Optional; defaults to a WhatsApp order message" />
          <ImagePicker label="Product image" value={product.image} onChange={(image) => updateProduct(product.id, { image })} isPro={isPro} onUpgrade={onUpgrade} />
        </div>
      </details>)}
      {!data.products.length && <p className="business-empty-note">Add a product to preview your catalog.</p>}
    </div>
  </div>;
}

export function BusinessCardEditor({ data, onChange, isPro, onUpgrade }: {
  data: BusinessCardData;
  onChange: (next: BusinessCardData) => void;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const patch = (updates: Partial<BusinessCardData>) => onChange({ ...data, ...updates });
  return <div className="business-editor">
    <div className="business-form-section">
      <h3>Contact details</h3>
      <div className="two-col business-fields">
        <TextField label="Full name" value={data.name} onChange={(name) => patch({ name })} placeholder="Alex Morgan" />
        <TextField label="Role" value={data.role} onChange={(role) => patch({ role })} placeholder="Product designer" />
        <TextField label="Company" value={data.company} onChange={(company) => patch({ company })} placeholder="Studio name" />
        <TextField label="Phone" value={data.phone} onChange={(phone) => patch({ phone })} type="tel" placeholder="+91 98765 43210" />
        <TextField label="WhatsApp" value={data.whatsapp} onChange={(whatsapp) => patch({ whatsapp })} type="tel" placeholder="+91 98765 43210" />
        <TextField label="Email" value={data.email} onChange={(email) => patch({ email })} type="email" placeholder="hello@example.com" />
        <TextField label="Website" value={data.website} onChange={(website) => patch({ website })} type="url" placeholder="https://example.com" />
        <TextField label="Instagram" value={data.instagram} onChange={(instagram) => patch({ instagram })} type="url" placeholder="https://instagram.com/..." />
        <TextField label="Facebook" value={data.facebook} onChange={(facebook) => patch({ facebook })} type="url" placeholder="https://facebook.com/..." />
        <TextField label="LinkedIn" value={data.linkedin} onChange={(linkedin) => patch({ linkedin })} type="url" placeholder="https://linkedin.com/in/..." />
      </div>
      <TextField label="Hosted card URL for QR (optional)" value={data.hostedUrl} onChange={(hostedUrl) => patch({ hostedUrl })} type="url" placeholder="https://your-card-page.com" />
      <p className="helper">When a hosted URL is provided, the QR points to it; otherwise it encodes a vCard contact card.</p>
      <ImagePicker label="Profile photo" value={data.photo} onChange={(photo) => patch({ photo })} isPro={isPro} onUpgrade={onUpgrade} />
    </div>
    <div className="business-form-section">
      <h3>Card style <span className="hint">Pro</span></h3>
      <div className="business-color-grid">
        <label className="business-color-control"><span>Accent color</span><input type="color" value={data.primary} disabled={!isPro} onChange={(event) => patch({ primary: event.target.value })} /></label>
        <label className="business-color-control"><span>Card background</span><input type="color" value={data.background} disabled={!isPro} onChange={(event) => patch({ background: event.target.value })} /></label>
      </div>
      {!isPro && <button type="button" className="btn btn-soft business-unlock-link" onClick={onUpgrade}>Unlock premium card styling · Pro</button>}
    </div>
  </div>;
}

export function ReviewEditor({ data, onChange }: { data: ReviewQrData; onChange: (next: ReviewQrData) => void }) {
  const patch = (updates: Partial<ReviewQrData>) => onChange({ ...data, ...updates });
  const valid = safeHttpUrl(data.url);
  return <div className="business-editor">
    <div className="business-form-section">
      <h3>Google review link</h3>
      <TextField label="Paste your Google review URL" value={data.url} onChange={(url) => patch({ url })} placeholder="https://g.page/r/your-business/review" type="url" />
      {data.url && !valid && <p className="field-error" role="alert">Enter a valid http or https review link.</p>}
      <TextField label="Call to action" value={data.cta} onChange={(cta) => patch({ cta })} placeholder="Scan to leave a review" maxLength={80} />
      <div className="business-color-grid">
        <label className="business-color-control"><span>QR color</span><input type="color" value={data.primary} onChange={(event) => patch({ primary: event.target.value })} /></label>
        <label className="business-color-control"><span>Background</span><input type="color" value={data.background} onChange={(event) => patch({ background: event.target.value })} /></label>
      </div>
      <label className="business-control"><span className="field-label">Printable design</span><select className="field" value={data.template} onChange={(event) => patch({ template: event.target.value as ReviewQrData["template"] })}><option value="table">Table card</option><option value="poster">Poster</option></select></label>
      <p className="helper">{data.template === "table" ? "A compact, double-sided table card with a scan prompt." : "A high-visibility vertical poster for your counter or window."} Download the print template as HTML and print from your browser.</p>
    </div>
  </div>;
}

export function UpiEditor({ data, onChange, isPro, onUpgrade }: {
  data: UpiQrData;
  onChange: (next: UpiQrData) => void;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  const patch = (updates: Partial<UpiQrData>) => onChange({ ...data, ...updates });
  const { error } = makeUpiUri(data);
  return <div className="business-editor">
    <div className="business-form-section">
      <h3>UPI payment details</h3>
      <TextField label="UPI ID" value={data.upiId} onChange={(upiId) => patch({ upiId })} placeholder="name@bank" />
      <TextField label="Payee name" value={data.payee} onChange={(payee) => patch({ payee })} placeholder="Name shown in the UPI app" />
      <div className="two-col business-fields">
        <TextField label="Amount (optional)" value={data.amount} onChange={(amount) => patch({ amount })} placeholder="e.g. 250.00" />
        <TextField label="Payment note (optional)" value={data.note} onChange={(note) => patch({ note })} placeholder="Order or invoice reference" maxLength={80} />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <TextField label="Call to action" value={data.cta} onChange={(cta) => patch({ cta })} placeholder="Scan to pay" maxLength={80} />
      <div className="business-color-grid">
        <label className="business-color-control"><span>QR color</span><input type="color" value={data.primary} onChange={(event) => patch({ primary: event.target.value })} /></label>
        <label className="business-color-control"><span>Background</span><input type="color" value={data.background} onChange={(event) => patch({ background: event.target.value })} /></label>
      </div>
      <ImagePicker label="Center logo" value={data.logo} onChange={(logo) => patch({ logo })} isPro={isPro} onUpgrade={onUpgrade} />
      <label className="business-control"><span className="field-label">PNG resolution</span><select className="field" value={Math.min(data.size, isPro ? 2048 : 1024)} onChange={(event) => patch({ size: Number(event.target.value) })}><option value={512}>512 px</option><option value={1024}>1024 px</option>{isPro && <option value={2048}>2048 px · Pro</option>}</select></label>
      {!isPro && <button type="button" className="btn btn-soft business-unlock-link" onClick={onUpgrade}>Unlock logo, 2048px export, and print sheets · Pro</button>}
    </div>
  </div>;
}

export function BusinessPagePreview({ data }: { data: BusinessPageData }) {
  const { html } = businessPageFiles(data, true);
  return <iframe className="business-preview-iframe" title="Live business page preview" srcDoc={html} sandbox="" />;
}

export function CatalogPreview({ data, isPro }: { data: CatalogData; isPro: boolean }) {
  return <iframe className="business-preview-iframe" title="Live WhatsApp catalog preview" srcDoc={catalogHtml(data, isPro)} sandbox="" />;
}

export function BusinessCardPreview({ data }: { data: BusinessCardData }) {
  return <iframe className="business-preview-iframe business-card-preview-iframe" title="Live digital business card preview" srcDoc={businessCardHtml(data)} sandbox="" />;
}

export function printFormatFromReview(data: ReviewQrData): PrintFormat {
  return data.template === "poster" ? "a4-poster" : "menu-card";
}

export function printFormatLabel(format: PrintFormat) {
  return format;
}

export function reviewLinkIsValid(data: ReviewQrData) {
  return Boolean(safeHttpUrl(data.url));
}

export function createUpiQrData(data: UpiQrData) {
  return makeUpiUri(data);
}
