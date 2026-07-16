import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

type Role = "admin" | "operator";

function getRole(request: NextRequest): Role {
  const role = request.headers.get("x-role") || request.nextUrl.searchParams.get("role");
  if (role === "admin") return "admin";
  return "operator";
}

// GET /api/records/[id] - Get a specific record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from("maintenance_records")
    .select("*, equipment(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// PUT /api/records/[id] - Update a record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const role = getRole(request);
  const body = await request.json();

  const client = getSupabaseClient();

  // First, get the existing record
  const { data: existingRecord, error: fetchError } = await client
    .from("maintenance_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existingRecord) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Permission check: operator cannot modify existing records
  if (role === "operator" && existingRecord.role === "admin") {
    return NextResponse.json({ error: "Operator cannot modify admin records" }, { status: 403 });
  }

  // Operator can only append photo pairs, not modify other fields
  let updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (role === "admin") {
    // Admin can update all fields
    if (body.technician !== undefined) updateData.technician = body.technician;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.photo_pairs !== undefined) updateData.photo_pairs = body.photo_pairs;
  } else {
    // Operator can only append photo pairs
    if (body.photo_pairs !== undefined) {
      // Merge with existing photo pairs
      const existingPairs = (existingRecord.photo_pairs as unknown[]) || [];
      updateData.photo_pairs = [...existingPairs, ...body.photo_pairs];
    } else {
      return NextResponse.json({ error: "Operator can only add photo pairs" }, { status: 400 });
    }
  }

  const { data, error } = await client
    .from("maintenance_records")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/records/[id] - Delete a record (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const role = getRole(request);

  if (role !== "admin") {
    return NextResponse.json({ error: "Only admin can delete records" }, { status: 403 });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from("maintenance_records")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
