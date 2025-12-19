import authAdmin from "@/middlewares/authAdmin";
import { getAuth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";  // 🔹 Prisma import (required)
import { NextResponse } from "next/server";

// 🟩 Get all approved stores 
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
        status: 'approved'},
      include: {
        user: true, 
      },
    });

    // 🟢 Final response
    return NextResponse.json({ stores });

  } catch (error) {
    console.error(error);

    // 🔻 Error case: return with 400 status
    return NextResponse.json(
      { error: error.code || error.message },
      { status: 400 }
    );
  }
}