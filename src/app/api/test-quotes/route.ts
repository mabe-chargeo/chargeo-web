import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.COSTRUCTOR_API_KEY;

  // On teste si on peut filtrer par client (customer)
  const contactId = 'cnt_01jym7dzfw2kfmv7r3hkqe4f7k'; // ton contact de test
  const res = await fetch(`https://api.costructor.co/external/v1/quotes?customer=${contactId}&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();

  // On renvoie une version simplifiée pour voir clair
  const simple = (data.data || []).map((q: any) => ({
    numero: q.number,
    nom: q.name,
    statut: q.status,
    total_euros: q.total / 100,
    client_id: q.customer?.id ?? null,
    a_un_pdf: !!q.pdf
  }));

  return NextResponse.json({ nb: simple.length, devis: simple });
}
