"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  phone: string;
  created: number;
  last_payment_error: {
    message: string;
    decline_code: string;
  } | null;
};

const PAGE_SIZE = 10;

function statusLabel(tx: Transaction) {
  if (tx.status === "succeeded") {
    return { text: "Paid", cls: "bg-emerald-50 text-emerald-600" };
  }
  if (tx.last_payment_error) {
    return { text: "Failed", cls: "bg-red-50 text-red-500" };
  }
  if (tx.status === "canceled") {
    return { text: "Canceled", cls: "bg-gray-100 text-gray-500" };
  }
  return { text: tx.status, cls: "bg-gray-100 text-gray-500" };
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async (cursor?: string | null) => {
    const isInitial = !cursor;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) params.set("starting_after", cursor);

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setTransactions((prev) =>
        isInitial ? data.transactions : [...prev, ...data.transactions]
      );
      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);
    } catch {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            All Stripe payments
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: "var(--accent)" }}
        >
          &larr; Back
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--text-muted)" }}>
          No transactions found.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => {
              const badge = statusLabel(tx);
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTx(tx)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white border text-left transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <p className="font-medium">
                      ${tx.amount.toFixed(2)}{" "}
                      <span className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                        {tx.currency}
                      </span>
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {tx.phone} &middot; {formatDate(tx.created)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </button>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => fetchTransactions(nextCursor)}
              disabled={loadingMore}
              className="w-full mt-4 py-3 rounded-xl border font-medium text-sm transition-colors hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: "var(--border)" }}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </>
      )}

      {/* transaction detail modal */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTx(null);
          }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedTx(null)}
          />
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
                  className={`text-sm font-medium px-3 py-1 rounded-full ${statusLabel(selectedTx).cls}`}
                >
                  {statusLabel(selectedTx).text}
                </span>
                <p className="text-2xl font-semibold">
                  ${selectedTx.amount.toFixed(2)}
                </p>
              </div>

              <div
                className="border-t pt-4 space-y-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Phone
                  </span>
                  <span className="text-sm font-medium">{selectedTx.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Date
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(selectedTx.created)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Currency
                  </span>
                  <span className="text-sm font-medium uppercase">
                    {selectedTx.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Status
                  </span>
                  <span className="text-sm font-medium">{statusLabel(selectedTx).text}</span>
                </div>
                {selectedTx.last_payment_error && (
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Decline reason
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      {selectedTx.last_payment_error.decline_code || selectedTx.last_payment_error.message}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Transaction ID
                  </span>
                  <span className="text-sm font-medium font-mono break-all ml-4 text-right">
                    {selectedTx.id}
                  </span>
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
