import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";    // ⭐ getAuth() ki jagah auth() use karna is safe for all routes
import { NextResponse } from "next/server";


// ===============================
// 🟩 1) Seller → Update Order Status
// ===============================

export async function POST(request) {
    try {
        const { userId } =  getAuth(request);

        
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json(
                { error: "Not Authorized" },
                { status: 401 }
            );
        }

        const { orderId, status } = await request.json();

        await prisma.order.update({
            where: { id: orderId, storeId },    
            data: { status }
        });

        // 🟢 Success response
        return NextResponse.json({ message: "Order status updated" });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}



// ===============================
// 🟩 2) Seller → Get All Orders
// ===============================

export async function GET(request) {
    try {
        // 🔹 Clerk user verification
        const { userId } =  getAuth(request);

        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json(
                { error: "Not Authorized" },
                { status: 401 }
            );
        }

        const orders = await prisma.order.findMany({
            where: { storeId }, 
            include: {
                user: true,                     
                address: true,                  
                orderItems: {
                    include: { product: true }  
                }
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