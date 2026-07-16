import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// POST /api/cleanup - Delete records older than 6 months (admin only)
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-role");
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const client = getSupabaseClient();

  // Calculate 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const cutoffDate = sixMonthsAgo.toISOString();

  const { data, error } = await client
    .from("maintenance_records")
    .delete()
    .lt("created_at", cutoffDate)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Cleanup complete",
    deletedCount: data?.length || 0,
  });
}
