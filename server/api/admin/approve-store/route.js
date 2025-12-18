import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";  // 🔹 Prisma import (required)
import { NextResponse } from "next/server";

// 🟩 Approve / Reject Seller
export async function POST(request) {
  try {
    const { userId } = getAuth(request);

    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "not authorized" },
        { status: 401 }
      );
    }

    const { storeId, status } = await request.json();

    if (status === "approved") {
      await prisma.store.update({
        where: { id: storeId },
        data: {
          status: "approved",
          isActive: true, 
        },
      });
    }
    else if (status === "rejected") {
      await prisma.store.update({
        where: { id: storeId },
        data: {
          status: "rejected",
        },
      });
    }

    // 🟢 Success message return
    return NextResponse.json({ message: `${status} successfully` });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}



// 🟩 Get all stores whose status is PENDING or REJECTED
export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    // 🔹 Check if user is admin
    const isAdmin = await authAdmin(userId);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "not authorized" },
        { status: 401 }
      );
    }

    const stores = await prisma.store.findMany({
      where: {
        status: {
          in: ["pending", "rejected"], 
        },
      },
      include: {
        user: true, 
      },
    });

    // 🟢 Final response
    return NextResponse.json({ stores });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}