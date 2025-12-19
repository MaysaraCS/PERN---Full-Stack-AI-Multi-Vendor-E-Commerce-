import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";  // 🔹 Prisma import (required)
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";


//Add new coupon
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: "Not Authorized" }, { status: 401 });
    }

    const { coupon } = await request.json();
    coupon.code = coupon.code.toUpperCase();

    // Check if coupon already exists
    const exists = await prisma.coupon.findUnique({
      where: { code: coupon.code },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Coupon code already exists" },
        { status: 400 }
      );
    }

    // Create coupon
    const savedCoupon = await prisma.coupon.create({ data: coupon });

    // Send Inngest event (needs valid INGEST_EVENT_KEY)
    await inngest.send({
      name: "app/coupon.expired",
      data: {
        code: savedCoupon.code,
        expires_at: savedCoupon.expiresAt,
      },
    });

    return NextResponse.json({
      message: "Coupon added successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}

//Delete Couipon /api/coupon?id=couponId
export async function DELETE(request)
{
    try {
        const {userId} = getAuth(request);
        const isAdmin = await authAdmin(userId);

         if(!isAdmin)
        {
            return NextResponse.json({error: "Not Authorized"}, {status: 401});
        }
        const code = request.nextUrl.searchParams.get("code");
        await prisma.coupon.delete({where: {code}});
        return NextResponse.json({message: "Coupon deleted successfully"});
    } catch (error) {
         console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}

//get all coupons
export async function GET(request)
{
    try {
        const {userId} = getAuth(request);
        const isAdmin = await authAdmin(userId);

         if(!isAdmin)
        {
            return NextResponse.json({error: "Not Authorized"}, {status: 401});
        }

        const coupons = await prisma.coupon.findMany({});
        return NextResponse.json({coupons});
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: error.code || error.message },
            { status: 400 }
        );
    }
}