import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);

    const { code } = await request.json();

    // ================================
    // 🟧 Step 1: Check if coupon exists
    // ================================
    const coupon = await prisma.coupon.findUnique({
      where: {
        code: code.toUpperCase(), // coupon codes always uppercase
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Coupon not found" },
        { status: 404 }
      );
    }

    if (coupon.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Coupon expired" },
        { status: 404 }
      );
    }

    // ==========================================
    // 🟧 Step 2: Check "Only for new users" logic
    // ==========================================
    if (coupon.forNewUser) {
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

    // ==========================================
    // 🟧 Step 3: Check "Members only" coupons
    // ==========================================
    if (coupon.forMember) {
      const isMember = has?.({ plan: "plus" }); 

      if (!isMember) {
        return NextResponse.json(
          { error: "Coupon valid only for premium members" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ coupon });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}