import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const pdfPath = path.join(process.cwd(), "public", "SCH_1606214.a_searchable.PDF");

  try {
    const pdfBuffer = await readFile(pdfPath);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="SCH_1606214.a_searchable.PDF"',
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
}
