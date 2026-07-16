import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET /api/equipment - List all equipment
export async function GET() {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("equipment")
    .select("id, name, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/equipment - Add a new equipment
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "设备名称不能为空" }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Generate a simple id from the name
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Check if already exists
  const { data: existing } = await client
    .from("equipment")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "该设备已存在" }, { status: 409 });
  }

  const { data, error } = await client
    .from("equipment")
    .insert({ id, name: name.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
