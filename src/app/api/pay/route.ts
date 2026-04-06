import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: Request) {
  const body = await req.json();
  const { amount, phone } = body;

  if (!amount || !phone) {
    return NextResponse.json(
      { error: "Amount and phone number are required." },
      { status: 400 }
    );
  }

  if (amount <= 0 || amount > 10000) {
    return NextResponse.json(
      { error: "Amount must be between $0.01 and $10,000." },
      { status: 400 }
    );
  }

  try {
    // amount in cents for Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: { phone },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json(
      { error: "Failed to create payment. Try again." },
      { status: 500 }
    );
  }
}
