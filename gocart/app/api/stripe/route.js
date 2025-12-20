import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// 🔹 Stripe object initialize using secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        // 🔹 Stripe webhook raw body text  (JSON nahi)
        const body = await request.text();

        // 🔹 Stripe signature header  to verify authenticity
        const sig = await request.headers.get('stripe-signature');

        const event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // 🧾 Helper function: PaymentIntent handle 
        const handlePaymentIntent = async (paymentIntentId, isPaid) => {

            
            const session = await stripe.checkout.sessions.list({
                payment_intent: paymentIntentId
            });

            const { orderIds, userId, appId } = session.data[0].metadata;

            // 🔒 Security check: appId verify 
            if (appId !== 'gocart') {
                return NextResponse.json({
                    received: true,
                    message: 'Invalid app ID',
                });
            }

            const orderIdsArray = orderIds.split(',');

            if (isPaid) {
                await Promise.all(
                    orderIdsArray.map(async (orderId) => {
                        await prisma.order.update({
                            where: { id: orderId },
                            data: { isPaid: true },
                        });
                    })
                );

                await prisma.user.update({
                    where: { id: userId },
                    data: { cart: {} }
                });
            } 
            else {
                await Promise.all(
                    orderIdsArray.map(async (orderId) => {
                        await prisma.order.delete({
                            where: { id: orderId }
                        });
                    })
                );
            }
        };

        switch (event.type) {
            case 'payment_intent.succeeded': {
                await handlePaymentIntent(event.data.object.id, true);
                break;
            }

            case 'payment_intent.canceled': {
                await handlePaymentIntent(event.data.object.id, false);
                break;
            }

            default: {
                console.log('Unhandled event type:', event.type);
                break;
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}

export const config = {
    api: { bodyParser: false }
};