import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  durationDays: number;
  badge?: string;
  color: string;
  accentColor: string;
  features: string[];
}

interface ShopSubscription {
  shopId: string;
  shopName: string;
  planId: string | null;
  planName: string | null;
  status: "active" | "expired" | "none";
  expiresAt: string | null;
  daysLeft: number | null;
}

interface PaymentFormData {
  transactionId: string;
  shopId: string;
  phoneNumber: string;
  agreedToTerms: boolean;
}

// ─── Plans Config ─────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    duration: "1 Month",
    durationDays: 30,
    color: "from-slate-800 to-slate-900",
    accentColor: "#6B7280",
    features: [
      "Up to 50 products",
      "Basic analytics",
      "Email support",
      "bKash / Nagad payments",
      "1 staff account",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 699,
    duration: "3 Months",
    durationDays: 90,
    badge: "Most Popular",
    color: "from-indigo-700 to-indigo-900",
    accentColor: "#818CF8",
    features: [
      "Up to 500 products",
      "Advanced analytics",
      "Priority support",
      "All payment gateways",
      "5 staff accounts",
      "Custom domain",
      "Discount & coupon tools",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1799,
    duration: "1 Year",
    durationDays: 365,
    badge: "Best Value",
    color: "from-amber-600 to-orange-800",
    accentColor: "#FCD34D",
    features: [
      "Unlimited products",
      "Full analytics suite",
      "Dedicated account manager",
      "All payment gateways",
      "Unlimited staff accounts",
      "Custom domain + SSL",
      "API access",
      "White-label option",
      "Priority queue activation",
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function deriveStatus(
  expiresAt: string | null,
  planId: string | null
): ShopSubscription["status"] {
  if (!planId) return "none";
  const days = calcDaysLeft(expiresAt);
  if (days === null) return "none";
  return days > 0 ? "active" : "expired";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6 animate-pulse">
      <div className="h-3 w-32 bg-slate-700 rounded mb-4" />
      <div className="h-7 w-48 bg-slate-700 rounded mb-3" />
      <div className="h-4 w-36 bg-slate-700/60 rounded mb-4" />
      <div className="h-5 w-24 bg-slate-700/40 rounded" />
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  daysLeft,
}: {
  status: ShopSubscription["status"];
  daysLeft: number | null;
}) {
  if (status === "active") {
    const urgent = (daysLeft ?? 99) <= 10;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide
          ${
            urgent
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            urgent ? "bg-amber-400" : "bg-emerald-400"
          }`}
        />
        {urgent ? `Expiring soon — ${daysLeft}d left` : "Active"}
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-red-500/20 text-red-300 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-slate-500/20 text-slate-400 border border-slate-500/30">
      No Active Plan
    </span>
  );
}

// ─── CurrentPlanCard ──────────────────────────────────────────────────────────

function CurrentPlanCard({ sub }: { sub: ShopSubscription }) {
  const activePlan = PLANS.find((p) => p.id === sub.planId);
  const progress =
    sub.daysLeft && activePlan
      ? Math.min((sub.daysLeft / activePlan.durationDays) * 100, 100)
      : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-800/60 border border-slate-700/50 p-6 backdrop-blur-sm">
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-1">
            Current Subscription
          </p>
          <h2 className="text-2xl font-bold text-white mb-1">{sub.shopName}</h2>
          <p className="text-slate-400 text-sm mb-3">
            Shop ID:{" "}
            <span className="font-mono text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded">
              {sub.shopId}
            </span>
          </p>
          <StatusBadge status={sub.status} daysLeft={sub.daysLeft} />
        </div>

        {sub.planId && activePlan && (
          <div className="sm:text-right shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Plan</p>
            <p className="text-xl font-bold text-white">{sub.planName}</p>
            <p className="text-slate-400 text-sm">
              ৳{activePlan.price} / {activePlan.duration}
            </p>
          </div>
        )}
      </div>

      {sub.status === "active" && sub.daysLeft !== null && activePlan && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Subscription period</span>
            <span>{sub.daysLeft} days remaining</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Expires on{" "}
            <span className="text-slate-300">
              {new Date(sub.expiresAt!).toLocaleDateString("en-BD", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </p>
        </div>
      )}

      {sub.status === "expired" && (
        <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-300">
            ⚠️ Your subscription has expired. Renew a plan below to continue using all
            features.
          </p>
        </div>
      )}

      {sub.status === "none" && (
        <div className="mt-5 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-sm text-indigo-300">
            🚀 You don't have an active plan. Choose a plan below to start selling on your
            shop.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  onSelect: (plan: Plan) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex flex-col rounded-2xl border transition-all duration-300 cursor-pointer
        ${
          isCurrent
            ? "border-indigo-500/60 bg-indigo-950/40"
            : hovered
            ? "border-slate-500/60 bg-slate-800/80 -translate-y-1 shadow-2xl shadow-black/40"
            : "border-slate-700/40 bg-slate-800/40"
        }`}
      style={{
        boxShadow: isCurrent
          ? `0 0 0 1px rgba(99,102,241,0.3), 0 20px 60px -10px rgba(99,102,241,0.2)`
          : undefined,
      }}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold tracking-wide text-white whitespace-nowrap"
            style={{
              background: `linear-gradient(135deg, ${plan.accentColor}cc, ${plan.accentColor}88)`,
              boxShadow: `0 0 20px ${plan.accentColor}44`,
            }}
          >
            {plan.badge}
          </span>
        </div>
      )}

      <div className={`h-1.5 rounded-t-2xl bg-gradient-to-r ${plan.color}`} />

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            {isCurrent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Current
              </span>
            )}
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-white">
              ৳{plan.price.toLocaleString()}
            </span>
            <span className="text-slate-400 text-sm mb-1"> / {plan.duration}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{plan.durationDays} days access</p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-6">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: plan.accentColor }}
              >
                <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.15" />
                <path
                  d="M5 8l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => onSelect(plan)}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200
            ${
              isCurrent
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50"
                : "text-white hover:opacity-90 active:scale-95"
            }`}
          style={
            !isCurrent
              ? {
                  background: `linear-gradient(135deg, ${plan.accentColor}dd, ${plan.accentColor}99)`,
                  boxShadow: `0 4px 20px -4px ${plan.accentColor}66`,
                }
              : undefined
          }
        >
          {isCurrent ? "🔄 Renew Plan" : "⬆ Upgrade to " + plan.name}
        </button>
      </div>
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

function PaymentModal({
  plan,
  shopId,
  isCurrent,
  onClose,
}: {
  plan: Plan;
  shopId: string;
  isCurrent: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PaymentFormData>({
    transactionId: "",
    shopId,
    phoneNumber: "",
    agreedToTerms: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const handleSubmit = async () => {
    if (!form.transactionId || !form.phoneNumber || !form.agreedToTerms) return;
    setLoading(true);
    // TODO: replace with real Supabase insert:
    // await supabase.from("subscription_requests").insert({
    //   shop_id: form.shopId,
    //   plan_id: plan.id,
    //   transaction_id: form.transactionId,
    //   phone_number: form.phoneNumber,
    //   amount: plan.price,
    //   status: "pending",
    // });
    await new Promise((r) => setTimeout(r, 1800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div className={`h-1 bg-gradient-to-r ${plan.color}`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
        >
          ✕
        </button>

        <div className="p-6">
          {submitted ? (
            // ── Success ──
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: "rgba(52,211,153,0.15)",
                  boxShadow: "0 0 40px rgba(52,211,153,0.2)",
                }}
              >
                <svg
                  className="w-8 h-8 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Submission Received!</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-1">
                Your <span className="text-white font-medium">{plan.name}</span> plan
                activation request has been submitted.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Our team will verify your bKash payment and activate your subscription within{" "}
                <span className="text-emerald-400 font-medium">2–4 business hours</span>.
              </p>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40 text-left mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">
                  Submission Details
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Plan</span>
                    <span className="text-white font-medium">
                      {plan.name} — ৳{plan.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transaction ID</span>
                    <span className="font-mono text-indigo-300">{form.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shop ID</span>
                    <span className="font-mono text-slate-300">{form.shopId}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                  {isCurrent ? "Renew Subscription" : "Upgrade Plan"}
                </p>
                <h2 className="text-xl font-bold text-white">
                  {isCurrent ? "Renew" : "Activate"}{" "}
                  <span style={{ color: plan.accentColor }}>{plan.name}</span> Plan
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  ৳{plan.price.toLocaleString()} for {plan.duration}
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300
                        ${step >= s ? "text-white" : "bg-slate-700 text-slate-500"}`}
                      style={
                        step >= s
                          ? {
                              background: `linear-gradient(135deg, ${plan.accentColor}dd, ${plan.accentColor}88)`,
                            }
                          : undefined
                      }
                    >
                      {s}
                    </div>
                    <span
                      className={`text-xs hidden sm:block ${
                        step >= s ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {s === 1 ? "Payment Instructions" : "Submit Transaction"}
                    </span>
                    {s < 2 && (
                      <div
                        className={`flex-1 h-px ${
                          step > s ? "bg-indigo-500/60" : "bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {step === 1 ? (
                // ── Step 1: Instructions ──
                <div>
                  <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-5 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-lg shrink-0">
                        💳
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">Pay via bKash</p>
                        <p className="text-slate-400 text-xs">Mobile financial service</p>
                      </div>
                    </div>
                    <ol className="space-y-3">
                      {(
                        [
                          <>
                            Open your{" "}
                            <span className="text-pink-400 font-medium">bKash app</span> and
                            go to <strong className="text-white">Send Money</strong>
                          </>,
                          <>
                            Send exactly{" "}
                            <span className="text-white font-bold">
                              ৳{plan.price.toLocaleString()}
                            </span>{" "}
                            to the number below
                          </>,
                          <>
                            Enter your Shop ID{" "}
                            <span className="font-mono text-indigo-300 bg-slate-700/50 px-1.5 py-0.5 rounded text-xs">
                              {shopId}
                            </span>{" "}
                            as the reference / note
                          </>,
                          <>
                            Copy the{" "}
                            <span className="text-amber-400 font-medium">Transaction ID</span>{" "}
                            from the confirmation screen
                          </>,
                          <>Come back here and fill in the form on the next step</>,
                        ] as React.ReactNode[]
                      ).map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                            style={{
                              background: `${plan.accentColor}33`,
                              color: plan.accentColor,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-xl bg-pink-950/30 border border-pink-500/20 p-4 mb-5">
                    <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                      bKash Merchant Number
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-2xl font-bold text-pink-300 tracking-widest">
                        01XXX-XXXXXX
                      </p>
                      <button
                        onClick={() => navigator.clipboard?.writeText("01XXXXXXXXX")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 transition-colors border border-pink-500/30"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Account type:{" "}
                      <span className="text-slate-300">Personal / Merchant</span>
                    </p>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-all hover:opacity-90 active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${plan.accentColor}ee, ${plan.accentColor}99)`,
                      boxShadow: `0 8px 24px -6px ${plan.accentColor}55`,
                    }}
                  >
                    I've Sent the Payment →
                  </button>
                </div>
              ) : (
                // ── Step 2: Form ──
                <div>
                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1.5">
                        bKash Transaction ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BKS-20250301-XXXXX"
                        value={form.transactionId}
                        onChange={(e) =>
                          setForm({ ...form, transactionId: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/60 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1.5">
                        Shop ID
                      </label>
                      <input
                        type="text"
                        value={form.shopId}
                        readOnly
                        className="w-full px-4 py-3 rounded-xl bg-slate-700/40 border border-slate-700/40 text-slate-300 text-sm font-mono cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-600 mt-1">
                        Auto-filled from your account
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1.5">
                        Your bKash Phone Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        value={form.phoneNumber}
                        onChange={(e) =>
                          setForm({ ...form, phoneNumber: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/60 text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      />
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Plan Total</span>
                        <span className="text-white font-bold">
                          ৳{plan.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-slate-400">Duration</span>
                        <span className="text-slate-300">{plan.duration}</span>
                      </div>
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div
                        onClick={() =>
                          setForm({ ...form, agreedToTerms: !form.agreedToTerms })
                        }
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-all
                          ${
                            form.agreedToTerms
                              ? "bg-indigo-600 border-indigo-500"
                              : "bg-slate-800 border-slate-600 group-hover:border-slate-500"
                          }`}
                      >
                        {form.agreedToTerms && (
                          <svg
                            className="w-3 h-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 leading-relaxed">
                        I confirm that I've sent the correct amount and the transaction ID
                        above is accurate. I understand activation may take up to 4 business
                        hours.
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={
                        !form.transactionId ||
                        !form.phoneNumber ||
                        !form.agreedToTerms ||
                        loading
                      }
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${plan.accentColor}ee, ${plan.accentColor}99)`,
                        boxShadow: `0 8px 24px -6px ${plan.accentColor}55`,
                      }}
                    >
                      {loading ? (
                        <>
                          <svg
                            className="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              strokeOpacity="0.3"
                            />
                            <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
                          </svg>
                          Submitting…
                        </>
                      ) : (
                        "Submit & Activate"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ShopSubscription | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadShop() {
      setFetchError(null);

      /**
       * Joins shops → shop_subscriptions to get the current plan + expiry.
       *
       * shops columns:
       *   shop_code     → displayed as "Shop ID"
       *   name          → displayed as shop name
       *   current_plan  → subscription_plan_enum e.g. "growth" | "starter" | "pro"
       *
       * shop_subscriptions columns:
       *   status              → subscription_status_enum
       *   current_period_end  → expiry timestamp
       *
       * NOTE: owner_id (not user_id) is the FK on shops that references auth.users.
       */
      const { data, error } = await supabase
        .from("shops")
        .select(`
          shop_code,
          name,
          current_plan,
          shop_subscriptions (
            status,
            current_period_end
          )
        `)
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (error || !data) {
        setFetchError("Could not load shop details. Please refresh or contact support.");
        return;
      }

      // Pick the subscription with the furthest-out period_end (most recent/active cycle)
      const subs = data.shop_subscriptions as
        | { status: string; current_period_end: string }[]
        | null;

      const latestSub =
        subs
          ?.slice()
          .sort(
            (a, b) =>
              new Date(b.current_period_end).getTime() -
              new Date(a.current_period_end).getTime()
          )[0] ?? null;

      const planId: string | null = data.current_plan ?? null;
      const expiresAt: string | null = latestSub?.current_period_end ?? null;
      const daysLeft = calcDaysLeft(expiresAt);
      const status = deriveStatus(expiresAt, planId);
      const matchedPlan = PLANS.find((p) => p.id === planId);

      setSubscription({
        shopId: data.shop_code,
        shopName: data.name,
        planId,
        planName: matchedPlan?.name ?? planId,
        status,
        expiresAt,
        daysLeft,
      });
    }

    loadShop();
  }, [user]);

  return (
    <div
      className="min-h-screen bg-[#0b0e1a] text-white"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Mesh background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 py-10">
        {/* Page header */}
        <div
          className="mb-8"
          style={{ animation: "fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400/80 mb-2">
            Shop Management
          </p>
          <h1
            className="text-3xl font-extrabold text-white mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            Subscription & Billing
          </h1>
          <p className="text-slate-400 text-sm">
            Manage your shop's subscription plan. Upgrade anytime to unlock more features.
          </p>
        </div>

        {/* Current plan card */}
        <div
          className="mb-10"
          style={{ animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) 60ms both" }}
        >
          {fetchError ? (
            <div className="rounded-2xl bg-red-950/40 border border-red-500/30 p-6 text-red-300 text-sm">
              ⚠️ {fetchError}
            </div>
          ) : subscription ? (
            <CurrentPlanCard sub={subscription} />
          ) : (
            <SkeletonCard />
          )}
        </div>

        {/* Plans grid */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-white mb-0.5">Available Plans</h2>
          <p className="text-slate-500 text-sm">
            All prices in BDT (Bangladeshi Taka). Inclusive of VAT.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-5">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              style={{
                animation: `fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${120 + i * 80}ms both`,
              }}
            >
              <PlanCard
                plan={plan}
                isCurrent={subscription?.planId === plan.id}
                onSelect={setSelectedPlan}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            Need a custom enterprise plan?{" "}
            <a
              href="#"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Contact our team
            </a>{" "}
            for a tailored quote.
          </p>
        </div>
      </div>

      {/* Payment modal */}
      {selectedPlan && subscription && (
        <PaymentModal
          plan={selectedPlan}
          shopId={subscription.shopId}
          isCurrent={subscription.planId === selectedPlan.id}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

