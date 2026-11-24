"use client";

import { Check, LockKeyhole, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Payment = {
  reference: string;
  name: string;
  email: string;
  utr: string;
  submittedAt: number;
  status: "pending" | "approved" | "rejected";
};

export default function AdminPayments() {
  const [token, setToken] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");

  const loadPayments = async () => {
    if (!token.trim()) {
      setError("Enter the admin token configured in Vercel.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/upi-payments", {
        headers: { Authorization: `Bearer ${token.trim()}` },
        cache: "no-store"
      });
      const body = await response.json() as { payments?: Payment[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Payment requests could not be loaded.");
      setPayments(body.payments ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const review = async (payment: Payment, status: "approved" | "rejected") => {
    setWorking(payment.reference);
    setError("");
    try {
      const response = await fetch("/api/admin/upi-payments", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reference: payment.reference, status })
      });
      const body = await response.json() as { status?: Payment["status"]; error?: string };
      if (!response.ok) throw new Error(body.error || "This payment request could not be reviewed.");
      setPayments((current) => current.map((item) => item.reference === payment.reference
        ? { ...item, status: body.status ?? status }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This payment request could not be reviewed.");
    } finally {
      setWorking("");
    }
  };

  return (
    <main className="admin-payments">
      <Link className="brand" href="/"><span className="brand-mark">QR</span>QRcraft</Link>
      <header className="admin-heading">
        <span className="eyebrow"><LockKeyhole size={13} /> PRIVATE ADMIN</span>
        <h1>UPI payment reviews</h1>
        <p>Match each UTR against your bank app before approving. Approval creates a signed Pro code the customer can retrieve from their order status.</p>
      </header>
      <section className="panel admin-panel">
        <label className="field-label" htmlFor="admin-token">Admin token</label>
        <div className="admin-token-row">
          <input id="admin-token" type="password" autoComplete="current-password" className="field" value={token} onChange={(event) => setToken(event.target.value)} />
          <button type="button" className="btn btn-primary" disabled={loading} onClick={() => void loadPayments()}><RefreshCw size={14} />{loading ? "Loading…" : "Load requests"}</button>
        </div>
        <p className="helper">The token is sent only to this app&apos;s admin API and is not saved in browser storage.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
      </section>
      <section className="admin-list" aria-live="polite">
        {payments.length === 0
          ? <div className="recent-empty">Load requests to review submitted payments.</div>
          : payments.map((payment) => (
            <article className="panel admin-payment" key={payment.reference}>
              <div className="admin-payment-title">
                <div><h2>{payment.name}</h2><p>{payment.email}</p></div>
                <span className={`payment-status status-${payment.status}`}>{payment.status}</span>
              </div>
              <dl className="payment-details">
                <div><dt>Order reference</dt><dd>{payment.reference}</dd></div>
                <div><dt>UPI transaction reference</dt><dd>{payment.utr}</dd></div>
                <div><dt>Submitted</dt><dd>{new Date(payment.submittedAt).toLocaleString()}</dd></div>
                <div><dt>Amount</dt><dd>₹9.00</dd></div>
              </dl>
              {payment.status === "pending" && <div className="admin-review-actions">
                <button type="button" className="btn btn-primary" disabled={Boolean(working)} onClick={() => void review(payment, "approved")}><Check size={14} />{working === payment.reference ? "Saving…" : "Verify & approve"}</button>
                <button type="button" className="btn btn-outline" disabled={Boolean(working)} onClick={() => void review(payment, "rejected")}><X size={14} />Reject</button>
              </div>}
            </article>
          ))}
      </section>
    </main>
  );
}
