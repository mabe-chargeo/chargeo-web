import { NextResponse } from 'next/server';

// TEST TEMPORAIRE (Preview seulement, validé par Matthieu le 11/10) : l'API Costructor accepte-t-elle
// 1. de créer une personne de type « contact » (interlocuteur), absente de la doc ?
// 2. de la rattacher comme interlocuteur au client TEST · SDC Le Relax ?
// Rien d'autre n'est touché. À supprimer après le test.

const COSTRUCTOR = 'https://api.costructor.co/external/v1';
const CLIENT_TEST = 'cnt_01m4mzy5992x6qw8bqv1r0b860'; // TEST · SDC Le Relax

async function appel(token: string, methode: string, chemin: string, corps?: any) {
  const res = await fetch(`${COSTRUCTOR}${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  });
  const texte = await res.text();
  let json: any = null;
  try { json = JSON.parse(texte); } catch { /* texte brut */ }
  return { status: res.status, ok: res.ok, json: json?.data ?? json, brut: json ? undefined : texte.slice(0, 300) };
}

const idsInterlocuteurs = (c: any): string[] =>
  [...(c?.contactPeople || []), ...(c?.people || [])].map((p: any) => p?.person?.id || p?.personId || p?.id).filter(Boolean);

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponible' }, { status: 404 });
  }
  const token = process.env.COSTRUCTOR_API_KEY;
  if (!token) return NextResponse.json({ error: 'Clé Costructor absente' }, { status: 500 });

  const rapport: any = {};

  // 1. Création d'une personne de type « contact »
  const creation = await appel(token, 'POST', '/contacts', {
    type: 'contact',
    legalStatus: 'individual',
    firstName: 'Test',
    lastName: 'INTERLOCUTEUR',
    emails: [{ email: 'test.interlocuteur@chargeo.fr', primary: true }],
    phones: [{ phone: '+33600000000', primary: true }],
  });
  const personneId = String(creation.json?.id || '');
  rapport.creation = { status: creation.status, ok: creation.ok, id: personneId || null, erreur: creation.ok ? undefined : (creation.json || creation.brut) };
  if (personneId) {
    const relue = await appel(token, 'GET', `/contacts/${personneId}`);
    rapport.creation.typeEnregistre = relue.json?.type ?? null;
    rapport.creation.url = `https://app.costructor.co/contacts/${personneId}`;
  }
  if (!personneId) return NextResponse.json(rapport);

  // 2. Rattachement au client TEST : on essaie plusieurs formats, on s'arrête au premier qui marche
  const client = await appel(token, 'GET', `/contacts/${CLIENT_TEST}`);
  if (!client.ok) {
    rapport.rattachement = { erreur: 'Client TEST introuvable', status: client.status };
    return NextResponse.json(rapport);
  }
  const c = client.json;
  // On renvoie les données existantes du client pour ne rien effacer
  const base = {
    type: 'client',
    legalStatus: 'company',
    companyName: c?.companyName,
    emails: c?.emails,
    phones: c?.phones,
    addresses: c?.addresses,
    notes: c?.notes,
  };
  const formats: { nom: string; corps: any }[] = [
    { nom: 'contactPeople person.id', corps: { contactPeople: [{ person: { id: personneId }, primary: false }] } },
    { nom: 'people person.id', corps: { people: [{ person: { id: personneId }, primary: false }] } },
    { nom: 'contactPeople personId', corps: { contactPeople: [{ personId: personneId, primary: false }] } },
    { nom: 'people ids', corps: { people: [personneId] } },
    { nom: 'contactPeople ids', corps: { contactPeople: [personneId] } },
  ];
  const essais: any[] = [];
  for (const f of formats) {
    for (const methode of ['PUT', 'PATCH']) {
      const r = await appel(token, methode, `/contacts/${CLIENT_TEST}`, { ...base, ...f.corps });
      if (r.status === 405 || r.status === 404) { essais.push({ format: f.nom, methode, status: r.status }); continue; }
      const relu = await appel(token, 'GET', `/contacts/${CLIENT_TEST}`);
      const rattache = idsInterlocuteurs(relu.json).includes(personneId);
      essais.push({ format: f.nom, methode, status: r.status, rattache, erreur: r.ok ? undefined : (r.json || r.brut) });
      if (rattache) { rapport.rattachement = { reussi: true, format: f.nom, methode, essais }; return NextResponse.json(rapport); }
      break;
    }
  }
  rapport.rattachement = { reussi: false, essais };
  return NextResponse.json(rapport);
}
