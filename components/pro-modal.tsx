"use client";

import { Check, CheckCircle2, Clock3, Copy, LockKeyhole, RefreshCw, Sparkles, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  onClose: () => void;
  onUnlock: (code: string, closeModal?: boolean) => Promise<boolean>;
};

type PendingPayment = {
  reference: string;
  accessKey: string;
  status: "pending" | "approved" | "rejected";
};

const benefits = [
  "Remove the watermark",
  "SVG + high-res PNG exports",
  "Logo upload",
  "Commercial-use license",
  "Premium templates & frames",
  "Batch QR codes from CSV"
];

const upiId = process.env.NEXT_PUBLIC_UPI_ID?.trim() || "dc9958211@okicici";
const payeeName = process.env.NEXT_PUBLIC_UPI_PAYEE_NAME?.trim() || "NETEXTERIOR";
const supportEmail = process.env.NEXT_PUBLIC_PRO_SUPPORT_EMAIL?.trim() || "mc9958211@gmail.com";
const upiUri = `upi://pay?${new URLSearchParams({
  pa: upiId,
  pn: payeeName,
  am: "9.00",
  cu: "INR",
  tn: "QRcraft Pro one-time"
})}`;

export default function ProModal({ onClose, onUnlock }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [qrError, setQrError] = useState("");
  const [approvedCode, setApprovedCode] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  const devCodes = process.env.NODE_ENV !== "production";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qrcraft-upi-pending");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<PendingPayment>;
      if (typeof parsed.reference === "string" && typeof parsed.accessKey === "string" &&
          /^[A-F0-9]{12}$/.test(parsed.reference) && parsed.accessKey.length >= 32) {
        // Restore this browser's private status-check token so customers can resume their request.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPending({ reference: parsed.reference, accessKey: parsed.accessKey, status: "pending" });
      } else {
        localStorage.removeItem("qrcraft-upi-pending");
      }
    } catch {
      setPaymentMessage("Saved payment status could not be read. You can still submit a new payment reference.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (!active || !qrRef.current) return;
      const qr = new QRCodeStyling({
        width: 220,
        height: 220,
        type: "canvas",
        data: upiUri,
        margin: 12,
        qrOptions: { errorCorrectionLevel: "M" },
        dotsOptions: { color: "#17172a", type: "rounded" },
        cornersSquareOptions: { color: "#17172a", type: "extra-rounded" },
        cornersDotOptions: { color: "#17172a", type: "square" },
        backgroundOptions: { color: "#ffffff" }
      });
      qrRef.current.replaceChildren();
      qr.append(qrRef.current);
    }).catch(() => {
      if (active) setQrError("The UPI QR could not be generated. You can still use the UPI app link below.");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pending || pending.status !== "pending") return;
    let active = true;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/upi-payments/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: pending.reference, accessKey: pending.accessKey }),
          cache: "no-store"
        });
        const body = await response.json() as { status?: PendingPayment["status"]; licenseCode?: string; error?: string };
        if (!response.ok) throw new Error(body.error || "Order status could not be checked.");
        if (!active) return;
        if (body.status === "rejected") {
          setPending({ ...pending, status: "rejected" });
          setPaymentMessage("This payment request was declined. Contact us if you believe this is a mistake.");
        } else if (body.status === "approved" && body.licenseCode) {
          const unlocked = await onUnlock(body.licenseCode, false);
          if (!active) return;
          if (!unlocked) throw new Error("The approved Pro code could not be activated. Please contact support.");
          setApprovedCode(body.licenseCode);
          setPending({ ...pending, status: "approved" });
          setPaymentMessage("Pro is active. Save this signed code somewhere safe so you can restore Pro on another browser.");
        }
      } catch (cause) {
        if (active) setPaymentMessage(cause instanceof Error ? cause.message : "Order status is temporarily unavailable.");
      }
    };
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pending, onUnlock]);

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError("");
    try {
      if (!(await onUnlock(code.trim()))) setError("That Pro code is invalid or its payment has not been approved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The code could not be checked right now.");
    } finally {
      setChecking(false);
    }
  };

  const copyLicense = async () => {
    try {
      await navigator.clipboard.writeText(approvedCode);
      setPaymentMessage("Pro code copied. Keep it somewhere safe.");
    } catch {
      setPaymentMessage("Copy is unavailable in this browser. Select and copy the code above.");
    }
  };

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setPaymentMessage("");
    try {
      const response = await fetch("/api/upi-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, utr }),
        cache: "no-store"
      });
      const body = await response.json() as { reference?: string; accessKey?: string; error?: string };
      if (!response.ok || !body.reference || !body.accessKey)
        throw new Error(body.error || "Your payment reference could not be submitted.");
      const next = { reference: body.reference, accessKey: body.accessKey, status: "pending" as const };
      setPending(next);
      try {
        localStorage.setItem("qrcraft-upi-pending", JSON.stringify(next));
        setPaymentMessage("Payment reference submitted. We'll review the UTR and update this order status.");
      } catch {
        setPaymentMessage("Payment reference submitted, but this browser cannot save the order status. Keep this page open while we review it.");
      }
      setUtr("");
    } catch (cause) {
      setPaymentMessage(cause instanceof Error ? cause.message : "Payment reference could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const resumeStatus = async () => {
    if (!pending) return;
    setPaymentMessage("Checking payment status…");
    try {
      const response = await fetch("/api/upi-payments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: pending.reference, accessKey: pending.accessKey }),
        cache: "no-store"
      });
      const body = await response.json() as { status?: PendingPayment["status"]; licenseCode?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "Order status could not be checked.");
      if (body.status === "approved" && body.licenseCode) {
        if (!(await onUnlock(body.licenseCode, false))) throw new Error("Approved code could not be activated. Contact support.");
        setApprovedCode(body.licenseCode);
        setPending({ ...pending, status: "approved" });
        setPaymentMessage("Pro is active. Save this signed code somewhere safe so you can restore Pro on another browser.");
      } else if (body.status === "rejected") {
        setPending({ ...pending, status: "rejected" });
        setPaymentMessage("This payment request was declined. Contact support if needed.");
      } else {
        setPaymentMessage("Still awaiting manual payment review. You can close this window and return later on this browser.");
      }
    } catch (cause) {
      setPaymentMessage(cause instanceof Error ? cause.message : "Order status is temporarily unavailable.");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal pro-modal" role="dialog" aria-modal="true" aria-labelledby="pro-title">
        <div className="modal-top">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> QRCRAFT PRO</span>
            <h2 id="pro-title">Make every detail yours.</h2>
            <p>One-time payment of ₹9. Scan the UPI QR and submit your transaction reference for manual review.</p>
          </div>
          <button type="button" className="btn btn-ghost" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-feature-list">
          {benefits.map((benefit) => <span key={benefit}><Check size={14} />{benefit}</span>)}
        </div>

        {!pending || pending.status === "rejected" ? <>
          <div className="upi-payment-card">
            <div className="upi-payment-copy"><b>Pay ₹9.00 INR</b><span>Payee: {payeeName}</span><code>{upiId}</code></div>
            <div className="upi-qr" ref={qrRef} aria-label="QR code for ₹9 QRcraft Pro UPI payment" />
            {qrError && <p className="field-error" role="alert">{qrError}</p>}
            <a className="btn btn-outline full-width" href={upiUri}>Open UPI app</a>
            <p className="checkout-note">Confirm the payee and amount in your UPI app before approving payment. Never share your UPI PIN or OTP.</p>
          </div>
          <form className="upi-submit-form" onSubmit={(event) => void submitPayment(event)}>
            <h3>Already paid? Submit the UTR</h3>
            <div className="two-col">
              <div><label className="field-label" htmlFor="upi-buyer-name">Your name</label><input id="upi-buyer-name" className="field" autoComplete="name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div><label className="field-label" htmlFor="upi-buyer-email">Email for your Pro order</label><input id="upi-buyer-email" className="field" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            </div>
            <label className="field-label" htmlFor="upi-utr">UPI transaction reference / UTR</label>
            <input id="upi-utr" className="field" autoComplete="off" required minLength={6} maxLength={35} pattern="[A-Za-z0-9\x2f\-]{6,35}" value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Enter the reference from your UPI app" />
            <button type="submit" className="btn btn-primary full-width" disabled={submitting}>{submitting ? "Submitting…" : "Submit for manual review"}</button>
            <p className="checkout-note">Your name, email, and UTR are stored in the configured Upstash review store for up to 90 days. We never receive your UPI PIN or bank credentials.</p>
            {paymentMessage && <p className="payment-message" role="status">{paymentMessage}</p>}
          </form>
        </> : <div className="payment-pending">
          {pending.status === "pending" ? <Clock3 size={24} /> : pending.status === "approved" ? <CheckCircle2 size={24} /> : <X size={24} />}
          <h3>{pending.status === "pending" ? "Payment review in progress" : pending.status === "approved" ? "Payment approved — Pro is active" : "Payment request declined"}</h3>
          <p>Order reference <b>{pending.reference}</b></p>
          <p>{pending.status === "pending" ? "We verify each UTR manually against our bank transactions. This may take some time." : pending.status === "approved" ? "Save your signed Pro code to restore Pro on another browser." : "Contact support if you believe your UTR was matched incorrectly."}</p>
          {pending.status === "approved" && approvedCode && <div className="issued-license"><code>{approvedCode}</code><button type="button" className="btn btn-outline" onClick={() => void copyLicense()}><Copy size={14} /> Copy code</button></div>}
          {pending.status === "pending" && <button type="button" className="btn btn-outline full-width" onClick={() => void resumeStatus()}><RefreshCw size={14} /> Check order status</button>}
          {paymentMessage && <p className="payment-message" role="status">{paymentMessage}</p>}
        </div>}

        <p className="checkout-note">Need help? <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
        <hr className="modal-divider" />
        <form onSubmit={submitCode}>
          <label className="field-label" htmlFor="unlock-code"><LockKeyhole size={13} /> Already have a Pro code?</label>
          <div className="unlock-row">
            <input id="unlock-code" className="field" autoComplete="off" value={code} onChange={(event) => setCode(event.target.value)} placeholder="QRC1.…" />
            <button type="submit" className="btn btn-outline" disabled={!code.trim() || checking}>{checking ? "Checking…" : "Activate"}</button>
          </div>
          {error && <p className="field-error" role="alert">{error}</p>}
        </form>
        {devCodes && <div className="dev-code-help"><b>Development test codes</b><div><code>QRC-DEV-2026</code><button type="button" className="btn btn-ghost" onClick={() => setCode("QRC-DEV-2026")}>Use</button></div><div><code>QRC-TEST-9-INR</code><button type="button" className="btn btn-ghost" onClick={() => setCode("QRC-TEST-9-INR")}>Use</button></div></div>}
        <p className="local-license-note">Payment is verified manually by the QRcraft owner; the UPI QR does not send an automatic payment confirmation.</p>
      </section>
    </div>
  );
}
