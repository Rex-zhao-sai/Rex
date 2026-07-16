import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";

// POST /api/seed - Seed equipment data (admin only, one-time)
export async function POST() {
  const client = getSupabaseClient();

  // Check if already seeded
  const { count } = await client
    .from("equipment")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json({ message: "Already seeded", count });
  }

  const { data, error } = await client
    .from("equipment")
    .insert(
      EQUIPMENT_LIST.map((e) => ({
        id: e.id,
        name: e.name,
      }))
    )
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Seeded successfully", count: data?.length });
}
