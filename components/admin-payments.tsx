"use client";

import { Check, Clock3, LogOut, LockKeyhole, Mail, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type PaymentStatus = "pending" | "approved" | "rejected";

type Payment = {
  reference: string;
  name: string;
  email: string;
  utr: string;
  submittedAt: number;
  status: PaymentStatus;
  licenseEmailSentAt: number | null;
};

type Summary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revenueInr: number;
};

type DateFilter = "all" | "today" | "7d" | "30d";

export default function AdminPayments() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/admin/upi-payments", { cache: "no-store" });
      const body = await response.json() as { payments?: Payment[]; summary?: Summary | null; summaryError?: string; error?: string };
      if (response.status === 401) {
        setAuthenticated(false);
        setPayments([]);
        setSummary(null);
        return;
      }
      if (!response.ok) throw new Error(body.error || "Payment requests could not be loaded.");
      setPayments(body.payments ?? []);
      setSummary(body.summary ?? null);
      setSummaryError(body.summaryError ?? "");
      setLastUpdated(Date.now());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment requests could not be loaded.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/session", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { authenticated?: boolean; error?: string };
        if (!response.ok) throw new Error(body.error || "Admin login could not be checked.");
        if (active) setAuthenticated(Boolean(body.authenticated));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Admin login could not be checked.");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const initialRefresh = window.setTimeout(() => void loadPayments(true), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadPayments(true);
    }, 10_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(timer);
    };
  }, [authenticated, loadPayments]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const cutoff = dateFilter === "today" ? startOfToday
      : dateFilter === "7d" ? now.getTime() - 7 * 24 * 60 * 60 * 1000
      : dateFilter === "30d" ? now.getTime() - 30 * 24 * 60 * 60 * 1000
      : 0;
    return payments.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (dateFilter !== "all" && payment.submittedAt < cutoff) return false;
      if (!normalizedSearch) return true;
      return [payment.reference, payment.name, payment.email, payment.utr]
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [dateFilter, payments, search, statusFilter]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Admin sign-in failed.");
      setPassword("");
      setAuthenticated(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error("The admin session could not be closed.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The admin session could not be closed.");
    } finally {
      setAuthenticated(false);
      setPayments([]);
      setSummary(null);
      setLastUpdated(null);
      setLoading(false);
    }
  };

  const review = async (payment: Payment, status: "approved" | "rejected", resendEmail = false) => {
    setWorking(payment.reference);
    setError("");
    try {
      const response = await fetch("/api/admin/upi-payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: payment.reference, status, resendEmail })
      });
      const body = await response.json() as { status?: PaymentStatus; emailError?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "This payment request could not be reviewed.");
      await loadPayments(true);
      if (body.emailError) setError(body.emailError);
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
        <p>Verify each UTR in your bank app before approving. The signed Pro code is emailed after approval when SMTP delivery is configured.</p>
      </header>

      {authLoading ? <section className="panel admin-panel"><p>Checking admin session…</p></section>
        : !authenticated ? <form className="panel admin-panel admin-login" onSubmit={(event) => void signIn(event)}>
          <h2>Admin sign in</h2>
          <p>Use the private credentials configured in the server environment.</p>
          <label className="field-label" htmlFor="admin-username">Username</label>
          <input id="admin-username" className="field" autoComplete="username" required maxLength={120} value={username} onChange={(event) => setUsername(event.target.value)} />
          <label className="field-label" htmlFor="admin-password">Password</label>
          <input id="admin-password" className="field" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}><LockKeyhole size={14} />{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        : <>
          <div className="admin-toolbar">
            <p><span className="admin-live-dot" /> Auto-refreshing every 10 seconds{lastUpdated ? ` · Updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}</p>
            <div>
              <button type="button" className="btn btn-outline" disabled={loading} onClick={() => void loadPayments()}><RefreshCw size={14} />{loading ? "Refreshing…" : "Refresh now"}</button>
              <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void signOut()}><LogOut size={14} />Sign out</button>
            </div>
          </div>
          {error && <p className="field-error admin-error" role="alert">{error}</p>}
          {summaryError && <p className="field-error admin-error" role="status">{summaryError} Payment requests remain available below.</p>}
          {summary && <section className="admin-stats" aria-label="Payment summary">
            <article className="panel admin-stat"><span>Total requests</span><strong>{summary.total}</strong><small>All time</small></article>
            <article className="panel admin-stat"><span>Awaiting review</span><strong>{summary.pending}</strong><small>Pending UTR checks</small></article>
            <article className="panel admin-stat"><span>Approved</span><strong>{summary.approved}</strong><small>₹{summary.revenueInr.toLocaleString("en-IN")} received</small></article>
            <article className="panel admin-stat"><span>Declined</span><strong>{summary.rejected}</strong><small>Requests rejected</small></article>
          </section>}
          <section className="panel admin-panel admin-filters" aria-label="Filter payment requests">
            <label className="admin-search"><span className="sr-only">Search payment requests</span><Search size={16} /><input className="field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, UTR, or reference" /></label>
            <label><span className="sr-only">Filter by status</span><select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | "all")}><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
            <label><span className="sr-only">Filter by date</span><select className="field" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}><option value="all">Any date</option><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select></label>
          </section>
          <div className="admin-list-heading"><h2>Recent requests</h2><span>{filteredPayments.length} shown · latest {payments.length} loaded (up to 100)</span></div>
          <section className="admin-list" aria-live="polite">
            {filteredPayments.length === 0
              ? <div className="panel recent-empty">{payments.length === 0 ? "No payment requests yet." : "No requests match these filters."}</div>
              : filteredPayments.map((payment) => (
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
                    {payment.status === "approved" && <div><dt>License email</dt><dd>{payment.licenseEmailSentAt ? `Sent ${new Date(payment.licenseEmailSentAt).toLocaleString()}` : "Not sent"}</dd></div>}
                  </dl>
                  {payment.status === "pending" && <div className="admin-review-actions">
                    <button type="button" className="btn btn-primary" disabled={Boolean(working)} onClick={() => void review(payment, "approved")}><Check size={14} />{working === payment.reference ? "Saving…" : "Verify & email license"}</button>
                    <button type="button" className="btn btn-outline" disabled={Boolean(working)} onClick={() => void review(payment, "rejected")}><X size={14} />Reject</button>
                  </div>}
                  {payment.status === "approved" && <div className="admin-review-actions">
                    <button type="button" className="btn btn-outline" disabled={Boolean(working)} onClick={() => void review(payment, "approved", true)}><Mail size={14} />{working === payment.reference ? "Sending…" : "Resend license email"}</button>
                  </div>}
                </article>
              ))}
          </section>
          <p className="admin-retention"><Clock3 size={13} /> Customer payment details are removed after 90 days.</p>
        </>}
    </main>
  );
}
