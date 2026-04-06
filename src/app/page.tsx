"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import Link from "next/link";
import CheckoutForm from "@/components/CheckoutForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

type Transaction = {
  id: string;
  amount: number;
  phone: string;
  status: "success" | "failed";
  date: string;
};

type Errors = {
  amount?: string;
  phone?: string;
};

export default function Home() {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState({ amount: false, phone: false });
  const [result, setResult] = useState<{ status: string; msg: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // stripe checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ amount: number; phone: string } | null>(null);

  function validateAmount(val: string): string | undefined {
    if (!val) return "Enter an amount";
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return "Must be greater than zero";
    if (num > 10000) return "Max amount is $10,000";
    return undefined;
  }

  function validatePhone(val: string | undefined): string | undefined {
    if (!val) return "Enter a phone number";
    if (!isValidPhoneNumber(val)) return "Invalid phone number";
    return undefined;
  }

  function validate(): Errors {
    return {
      amount: validateAmount(amount),
      phone: validatePhone(phone),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ amount: true, phone: true });

    const errs = validate();
    setErrors(errs);
    if (errs.amount || errs.phone) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          phone: phone?.trim(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setResult({ status: "failed", msg: data.error });
        return;
      }

      // got client secret, show the card form
      setClientSecret(data.clientSecret);
      setPendingPayment({ amount: parseFloat(amount), phone: phone?.trim() || "" });
    } catch {
      setResult({ status: "failed", msg: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentSuccess(paymentId: string) {
    if (!pendingPayment) return;

    setResult({
      status: "success",
      msg: `Payment of $${pendingPayment.amount.toFixed(2)} to ${pendingPayment.phone} confirmed.`,
    });

    setTransactions((prev) => [
      {
        id: paymentId,
        amount: pendingPayment.amount,
        phone: pendingPayment.phone,
        status: "success",
        date: new Date().toLocaleString(),
      },
      ...prev,
    ]);

    // cleanup
    setClientSecret(null);
    setPendingPayment(null);
    setAmount("");
    setPhone("");
    setTouched({ amount: false, phone: false });
    setErrors({});
  }

  function handlePaymentError(msg: string) {
    if (!pendingPayment) return;

    setResult({ status: "failed", msg });
    setTransactions((prev) => [
      {
        id: crypto.randomUUID(),
        amount: pendingPayment.amount,
        phone: pendingPayment.phone,
        status: "failed",
        date: new Date().toLocaleString(),
      },
      ...prev,
    ]);

    setClientSecret(null);
    setPendingPayment(null);
  }

  function handleCancel() {
    setClientSecret(null);
    setPendingPayment(null);
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === "" || /^\d+\.?\d{0,2}$/.test(val)) {
      setAmount(val);
      if (touched.amount) {
        setErrors((prev) => ({ ...prev, amount: validateAmount(val) }));
      }
    }
  }

  function handlePhoneChange(val: string | undefined) {
    setPhone(val);
    if (touched.phone) {
      setErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
    }
  }

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const hasErrors = !!(errors.amount || errors.phone);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--accent-blue)" }}>
            Payment-Test
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Accept payments across Africa
          </p>
        </div>
        <Link
          href="/transactions"
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: "var(--accent)" }}
        >
          Transactions &rarr;
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1.5">
            Amount
          </label>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              $
            </span>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              onBlur={() => {
                setTouched((p) => ({ ...p, amount: true }));
                setErrors((p) => ({ ...p, amount: validateAmount(amount) }));
              }}
              className={`w-full pl-8 pr-4 py-3 text-lg rounded-xl border bg-white focus:outline-none focus:ring-2 transition-shadow ${
                touched.amount && errors.amount
                  ? "border-red-400 focus:ring-red-300/40 focus:border-red-400"
                  : "focus:ring-green-500/40 focus:border-green-500"
              }`}
              style={{
                borderColor: touched.amount && errors.amount ? undefined : "var(--border)",
              }}
              autoComplete="off"
            />
          </div>
          {touched.amount && errors.amount && (
            <p className="text-red-500 text-xs mt-1.5">{errors.amount}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
            Customer phone
          </label>
          <PhoneInput
            international
            defaultCountry="NG"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={() => {
              setTouched((p) => ({ ...p, phone: true }));
              setErrors((p) => ({ ...p, phone: validatePhone(phone) }));
            }}
            className={`phone-input-wrapper ${
              touched.phone && errors.phone ? "phone-input-error" : ""
            }`}
          />
          {touched.phone && errors.phone && (
            <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || (touched.amount && touched.phone && hasErrors)}
          className="w-full py-3.5 rounded-xl text-white font-medium text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: loading ? "var(--accent-hover)" : "var(--accent)",
          }}
        >
          {loading ? "Creating payment..." : "Request payment"}
        </button>
      </form>

      {/* payment modal */}
      {clientSecret && pendingPayment && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <CheckoutForm
            amount={pendingPayment.amount}
            phone={pendingPayment.phone}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handleCancel}
          />
        </Elements>
      )}

      {result && (
        <div
          className={`mt-4 p-4 rounded-xl text-sm font-medium ${
            result.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {result.msg}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Recent transactions</h2>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelectedTx(tx)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white border text-left transition-colors hover:bg-gray-50 cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <p className="font-medium">${tx.amount.toFixed(2)}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {tx.phone} &middot; {tx.date}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    tx.status === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {tx.status === "success" ? "Paid" : "Failed"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* transaction detail modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTx(null);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTx(null)} />
          <div className="relative w-full max-w-md sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Transaction details</h3>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-2xl leading-none px-1 hover:opacity-60 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    selectedTx.status === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {selectedTx.status === "success" ? "Paid" : "Failed"}
                </span>
                <p className="text-2xl font-semibold">${selectedTx.amount.toFixed(2)}</p>
              </div>

              <div className="border-t pt-4 space-y-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Phone</span>
                  <span className="text-sm font-medium">{selectedTx.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Date</span>
                  <span className="text-sm font-medium">{selectedTx.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Currency</span>
                  <span className="text-sm font-medium">USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Transaction ID</span>
                  <span className="text-sm font-medium font-mono break-all ml-4 text-right">{selectedTx.id}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full mt-5 py-3 rounded-xl border font-medium text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
