"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

type Props = {
  amount: number;
  phone: string;
  onSuccess: (paymentId: string) => void;
  onError: (msg: string) => void;
  onCancel: () => void;
};

export default function CheckoutForm({ amount, phone, onSuccess, onError, onCancel }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Payment failed.");
      setPaying(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
      setPaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !paying) onCancel();
      }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !paying && onCancel()} />

      {/* modal */}
      <div
        className="relative w-full max-w-md sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl animate-slide-up max-h-[90dvh] overflow-y-auto"
      >
        {/* payment summary */}
        <div className="mb-5 pb-5 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
            Payment details
          </p>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-semibold">${amount.toFixed(2)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>USD</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Customer</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{phone}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <PaymentElement />
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={paying}
              className="flex-1 py-3 rounded-xl border font-medium text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || paying}
              className="flex-1 py-3 rounded-xl text-white font-medium text-sm transition-colors disabled:opacity-40"
              style={{ backgroundColor: paying ? "var(--accent-hover)" : "var(--accent)" }}
            >
              {paying ? "Processing..." : `Pay $${amount.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
