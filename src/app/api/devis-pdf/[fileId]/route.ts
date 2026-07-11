import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const token = process.env.COSTRUCTOR_API_KEY;

  const res = await fetch(`https://api.costructor.co/api/files/${fileId}/content`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!res.ok) return NextResponse.json({ error: "PDF introuvable" }, { status: 404 });

  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' }
  });
}
