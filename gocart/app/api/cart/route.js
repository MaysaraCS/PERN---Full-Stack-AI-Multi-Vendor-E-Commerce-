// 🟩 User Cart Update / Fetch API

import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ===============================
// POST → User ke CART ko update karo
// ===============================
export async function POST(request) {
    try {
        const { userId } = getAuth(request);

        const { cart } = await request.json();

        await prisma.user.update({
            where: { id: userId },
            data: { cart: cart },
        });

        // 🟢 Success response
        return NextResponse.json({ message: "Cart updated" });

    } catch (error) {
        console.error(error);

        // 🔻 Error response
        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}


// ===============================
// GET → User ka CART fetch karo
// ===============================
export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        return NextResponse.json({ cart: user.cart });

    } catch (error) {
        console.error(error);

        // 🔻 Error response
        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}