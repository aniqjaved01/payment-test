import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 100);
  const starting_after = searchParams.get("starting_after") || undefined;

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit,
      ...(starting_after && { starting_after }),
    });

    const filtered = paymentIntents.data.filter(
      (pi) => pi.status === "succeeded" || pi.last_payment_error
    );

    const transactions = filtered.map((pi) => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      phone: pi.metadata?.phone || "—",
      created: pi.created,
      last_payment_error: pi.last_payment_error
        ? {
            message: pi.last_payment_error.message,
            decline_code: pi.last_payment_error.decline_code,
          }
        : null,
    }));

    return NextResponse.json({
      transactions,
      has_more: paymentIntents.has_more,
      next_cursor: paymentIntents.has_more
        ? paymentIntents.data[paymentIntents.data.length - 1]?.id
        : null,
    });
  } catch (err) {
    console.error("Stripe list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions." },
      { status: 500 }
    );
  }
}
