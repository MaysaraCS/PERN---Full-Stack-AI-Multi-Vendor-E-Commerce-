
import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";     // ✅ Correct import
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";


// ===================================================
// 🟩 ADD NEW ORDER (POST)
// ===================================================
export async function POST(request) {
    try {
        const { userId, has } = getAuth(request);

        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const { addressId, items, couponCode, paymentMethod } =
            await request.json();

        // ❌ Mandatory fields missing?
        if (
            !addressId ||
            !paymentMethod ||
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return NextResponse.json(
                { error: "missing order details." },
                { status: 401 }
            );
        }

        let coupon = null;

        // ===================================================
        // 🎫 COUPON VALIDATION
        // ===================================================
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: {
                    code: couponCode.toUpperCase(), // always uppercase
                },
            });


            if (!coupon) {
                return NextResponse.json(
                    { error: "Coupon not found" },
                    { status: 400 }
                );
            }
        }

        // ===================================================
        // 🟠 Only For New Users Coupon Check
        // ===================================================
        if (coupon?.forNewUser && couponCode) {
            const userOrders = await prisma.order.count({
                where: { userId },
            });

            if (userOrders > 0) {
                return NextResponse.json(
                    { error: "Coupon valid for new users only" },
                    { status: 404 }
                );
            }
        }

        // ===================================================
        // 🟣 Only For MEMBERS (Plus Plan) Coupon Check
        // ===================================================
        const isPlusMember = has?.({ plan: "plus" }); // Clerk membership check

        if (coupon?.forMember && couponCode) {
            if (!isPlusMember) {
                return NextResponse.json(
                    { error: "Coupon valid only for premium members" },
                    { status: 404 }
                );
            }
        }

        // ===================================================
        // 🟦 Group Items by storeId 
        // ===================================================
        const ordersByStore = new Map();

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.id },
            });

            const storeId = product.storeId;

            if (!ordersByStore.has(storeId)) {
                ordersByStore.set(storeId, []);
            }

            ordersByStore.get(storeId).push({
                ...item,
                price: product.price,
            });
        }

        let orderIds = [];
        let fullAmount = 0;

        let isShippingFeeAdded = false;

        // ===================================================
        // 🟩 Create Orders for Each Seller
        // ===================================================
        for (const [storeId, sellerItems] of ordersByStore.entries()) {
            let total = sellerItems.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );

            // 🎫 Apply coupon discount
            // 🎟️ Apply coupon discount if coupon exists
            if (coupon) {
                total -= (total * coupon.discount) / 100;
            }

            
            if (!isPlusMember && !isShippingFeeAdded) {
                total += 5;
                isShippingFeeAdded = true;
            }

            fullAmount += parseFloat(total.toFixed(2));

            // ============================
            // 🔥 CREATE ORDER IN DATABASE
            // ============================
            const order = await prisma.order.create({
                data: {
                    userId,
                    storeId,
                    addressId,
                    total: parseFloat(total.toFixed(2)),
                    paymentMethod,

                    // Coupon fields
                    isCouponUsed: coupon ? true : false,

                    coupon: coupon ? coupon : {},


                    // Order items
                    orderItems: {
                        create: sellerItems.map((item) => ({
                            productId: item.id,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
            });

            orderIds.push(order.id);
        }

        if (paymentMethod === 'STRIPE') {
            //console.log("Stripe Key:", process.env.STRIPE_SECRET_KEY);

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const origin = await request.headers.get('origin');

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Order',
                            },
                            unit_amount: Math.round(fullAmount * 100), // Convert dollars to cents
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // current time + 30 minutes
                success_url: `${origin}/loading?nextUrl=orders`,
                cancel_url: `${origin}/cart`,
                metadata : {
                    orderIds: orderIds.join(','),
                    userId,
                    appId: 'gocart'
                }
            });

            return NextResponse.json({session});

        }

        // ===================================================
        // 🗑️ Clear CART after placing order
        // ===================================================
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} },
        });

        return NextResponse.json({
            message: "Orders placed Successfully",
            orderIds,
            fullAmount,
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}



// ===================================================
// 🟩 GET ORDERS FOR LOGGED-IN USER (GET)
// ===================================================
export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        // ❌ Not logged in
        if (!userId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: {
                userId, OR: [
                    { paymentMethod: PaymentMethod.COD },
                    { AND: [{ paymentMethod: PaymentMethod.STRIPE }, { isPaid: true }] }
                ]
            },
            include: {
                orderItems: { include: { product: true } },
                address: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ orders });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}