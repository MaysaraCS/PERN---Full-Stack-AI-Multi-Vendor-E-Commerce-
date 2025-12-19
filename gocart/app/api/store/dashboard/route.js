import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// 🟩 Seller Dashboard Data → (total orders, total earnings, total products, ratings)
export async function GET(request) {
    try {
        const { userId } = getAuth(request);

        
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Not authorized" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { storeId }
        });

        const products = await prisma.product.findMany({
            where: { storeId },
        });

        const ratings = await prisma.rating.findMany({
            where: {
                productId: {
                    in: products.map((product) => product.id), // product IDs list
                },
            },
            include: {
                user: true,     
                product: true,  
            },
        });

        const dashboardData = {
            ratings,
            totalOrders: orders.length, // total orders count
            totalEarnings: Math.round(
                orders.reduce((acc, order) => acc + order.total, 0) // total revenue
            ),
            totalProducts: products.length, // total products count
        };

        return NextResponse.json({ dashboardData });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}