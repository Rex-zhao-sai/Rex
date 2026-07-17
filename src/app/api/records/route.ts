import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { EQUIPMENT_LIST } from "@/lib/equipment-data";

type Role = "admin" | "operator";

function getRole(request: NextRequest): Role {
  const role = request.headers.get("x-role") || request.nextUrl.searchParams.get("role");
  if (role === "admin") return "admin";
  return "operator";
}

// GET /api/records - List records
export async function GET(request: NextRequest) {
  const role = getRole(request);
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get("month");
  const equipmentId = searchParams.get("equipmentId");

  const client = getSupabaseClient();
  // GET /api/records

  let query = client.from("maintenance_records").select("*, equipment(name)");

  if (month) {
    query = query.eq("month", month);
  }
  if (equipmentId) {
    query = query.eq("equipment_id", equipmentId);
  }

  // Only admin can see all records; operator can only see their own (by role)
  if (role !== "admin") {
    query = query.eq("role", "operator");
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(1000);

  // Query result

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/records - Create a new record
export async function POST(request: NextRequest) {
  const role = getRole(request);
  const body = await request.json();

  const { equipment_id, month, technician, notes, photo_pairs } = body;

  if (!equipment_id || !month) {
    return NextResponse.json({ error: "equipment_id and month are required" }, { status: 400 });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from("maintenance_records")
    .insert({
      equipment_id,
      month,
      technician: technician || "",
      notes: notes || "",
      photo_pairs: photo_pairs || [],
      role,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
