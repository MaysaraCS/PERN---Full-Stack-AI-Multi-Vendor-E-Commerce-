import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 🟩 GET Route → Saare active stores ke products fetch karta hai
export async function GET(request) {
    try {

        let products = await prisma.product.findMany({
            where: { inStock: true },
            include: {
                rating: {
                    select: {
                        createdAt: true,
                        rating: true,
                        review: true,
                        user: { select: { name: true, image: true } }
                    }
                },
                store: true, 
            },
            orderBy: { createdAt: 'desc' } 
        });

        
        products = products.filter(product => product.store.isActive);

        // 🟢 Final response
        return NextResponse.json({ products });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}