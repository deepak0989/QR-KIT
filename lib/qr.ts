export type QrType =
  | "website"
  | "text"
  | "wifi"
  | "email"
  | "phone"
  | "sms"
  | "vcard"
  | "payment"
  | "instagram"
  | "whatsapp";

export type Design = {
  type: QrType;
  values: Record<string, string>;
  hidden: boolean;
  foreground: string;
  background: string;
  gradient: boolean;
  gradientEnd: string;
  gradientAngle: number;
  dotStyle: string;
  cornerStyle: string;
  cornerDotStyle: string;
  size: number;
  margin: number;
  correction: "L" | "M" | "Q" | "H";
  logo: string;
  logoName: string;
  logoSize: number;
  logoBackground: "none" | "circle" | "rounded";
  cta: string;
  font: string;
  ctaColor: string;
  frame: "none" | "soft" | "violet";
};

export const initialDesign: Design = {
  type: "website",
  values: { url: "https://yourwebsite.com" },
  hidden: false,
  foreground: "#1d1b32",
  background: "#ffffff",
  gradient: false,
  gradientEnd: "#8b5cf6",
  gradientAngle: 45,
  dotStyle: "rounded",
  cornerStyle: "extra-rounded",
  cornerDotStyle: "dot",
  size: 1024,
  margin: 24,
  correction: "M",
  logo: "",
  logoName: "",
  logoSize: 24,
  logoBackground: "none",
  cta: "Scan to visit our website",
  font: "Inter",
  ctaColor: "#29263f",
  frame: "none"
};

const escapeWifi = (value: string) => value.replace(/([\\;,":])/g, "\\$1");

export function getQrData(design: Design): { data: string; error: string } {
  const value = (key: string) => (design.values[key] ?? "").trim();
  switch (design.type) {
    case "website":
    case "payment": {
      const url = value("url");
      if (!url) return { data: "", error: design.type === "payment" ? "Add a payment URL to make your QR code." : "Add a website URL to make your QR code." };
      try {
        const parsed = new URL(url);
        const allowed = design.type === "payment" ? ["http:", "https:", "upi:"] : ["http:", "https:"];
        if (!allowed.includes(parsed.protocol)) throw new Error();
        if (design.type === "website") {
          for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
            const trackingValue = value(key);
            if (trackingValue) parsed.searchParams.set(key, trackingValue);
          }
        }
        return { data: parsed.toString(), error: "" };
      } catch {
        return { data: "", error: design.type === "payment" ? "Enter a valid http, https, or UPI payment link." : "Enter a valid URL starting with https:// or http://." };
      }
    }
    case "instagram": {
      const username = value("username");
      if (!username) return { data: "", error: "Enter an Instagram username or profile URL." };
      try {
        const source = /^https?:\/\//i.test(username)
          ? username
          : /^(?:www\.)?instagram\.com\//i.test(username)
            ? `https://${username}`
            : `https://www.instagram.com/${username.replace(/^@/, "")}`;
        const parsed = new URL(source);
        const handle = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
        if (!["instagram.com", "www.instagram.com"].includes(parsed.hostname.toLowerCase()) || !/^[a-zA-Z0-9._]{1,30}$/.test(handle))
          throw new Error();
        return { data: `https://www.instagram.com/${handle}/`, error: "" };
      } catch {
        return { data: "", error: "Enter a valid Instagram username or instagram.com profile URL." };
      }
    }
    case "whatsapp": {
      const phone = value("phone").replace(/\D/g, "");
      if (phone.length < 7 || phone.length > 15)
        return { data: "", error: "Enter a WhatsApp number with country code (7–15 digits)." };
      const message = value("message");
      return {
        data: `https://wa.me/${phone}${message ? `?${new URLSearchParams({ text: message })}` : ""}`,
        error: ""
      };
    }
    case "text": {
      const text = value("text");
      return text
        ? { data: text, error: "" }
        : { data: "", error: "Add some text to make your QR code." };
    }
    case "wifi": {
      const ssid = value("ssid");
      const encryption = value("encryption") || "WPA";
      if (!ssid) return { data: "", error: "Enter your Wi-Fi network name (SSID)." };
      if (encryption !== "nopass" && !value("password"))
        return { data: "", error: "Enter a password or choose No encryption." };
      return {
        data: `WIFI:T:${encryption};S:${escapeWifi(ssid)};${encryption === "nopass" ? "" : `P:${escapeWifi(value("password"))};`}${design.hidden ? "H:true;" : ""};`,
        error: ""
      };
    }
    case "email": {
      const email = value("email");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return { data: "", error: "Enter a valid email address." };
      const subject = value("subject");
      const body = value("body");
      return {
        data: `mailto:${email}${subject || body ? `?${new URLSearchParams({ ...(subject ? { subject } : {}), ...(body ? { body } : {}) })}` : ""}`,
        error: ""
      };
    }
    case "phone": {
      const phone = value("phone");
      if (!/^\+?[0-9\s().-]{7,20}$/.test(phone))
        return { data: "", error: "Enter a valid phone number, including the country code if needed." };
      return { data: `tel:${phone.replace(/[\s().-]/g, "")}`, error: "" };
    }
    case "sms": {
      const phone = value("phone");
      if (!/^\+?[0-9\s().-]{7,20}$/.test(phone))
        return { data: "", error: "Enter a valid phone number, including the country code if needed." };
      const body = value("body");
      return { data: `SMSTO:${phone.replace(/[\s().-]/g, "")}:${body}`, error: "" };
    }
    case "vcard": {
      const name = value("name");
      if (!name) return { data: "", error: "Add a full name for this contact card." };
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${name}`,
        ...(value("company") ? [`ORG:${value("company")}`] : []),
        ...(value("title") ? [`TITLE:${value("title")}`] : []),
        ...(value("phone") ? [`TEL;TYPE=WORK,VOICE:${value("phone")}`] : []),
        ...(value("email") ? [`EMAIL:${value("email")}`] : []),
        ...(value("website") ? [`URL:${value("website")}`] : []),
        ...(value("address") ? [`ADR;TYPE=WORK:;;${value("address").replace(/\n/g, ";")}`] : []),
        "END:VCARD"
      ];
      return { data: lines.join("\n"), error: "" };
    }
    default:
      return { data: "", error: "Choose a QR type to continue." };
  }
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const value = hex.replace("#", "");
    if (!/^[\da-f]{6}$/i.test(value)) return 0;
    const channels = [0, 2, 4].map((index) => {
      const channel = parseInt(value.slice(index, index + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function getSafeQrInk(design: Pick<Design, "foreground" | "gradientEnd" | "gradient" | "background">) {
  const startContrast = contrastRatio(design.foreground, design.background);
  const endContrast = contrastRatio(design.gradientEnd, design.background);
  if (startContrast >= 4.5 && (!design.gradient || endContrast >= 4.5)) {
    return { foreground: design.foreground, gradientEnd: design.gradientEnd, gradient: design.gradient };
  }

  const foreground = contrastRatio("#000000", design.background) >= contrastRatio("#ffffff", design.background)
    ? "#000000"
    : "#ffffff";
  return { foreground, gradientEnd: foreground, gradient: false };
}
