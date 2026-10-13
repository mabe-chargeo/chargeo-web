import { NextResponse } from 'next/server';
import { getQualificationListId } from '@/lib/listesClickUp';
import { normaliserIdentifiant } from '@/lib/identiteClient';
import { relierContacts, telNormal, type PersonneSaisie } from '@/lib/contactsClickUp';

// Liste Qualification choisie selon l'environnement (src/lib/listesClickUp.ts) :
// production = vraie liste, preview = liste TEST uniquement, sinon refus.
// Lot 3.5 (13/10/2026) : pour une entreprise ou une copropriété, SIRET / N° RNIC facultatif
// (champ 🏛️ SIRET / N° RNIC). Pour une copropriété, gestionnaire du syndic et président du conseil
// syndical facultatifs : notés dans la description, puis en production retrouvés ou créés dans
// Contacts 👥 et reliés à l'affaire (👔 Gestionnaire, 📍 Contact sur place). Particulier : rien ne change.
const CHAMP_SIRET = 'f840aa7d-0a85-4618-9e13-620c156355ed';

const court = (v: unknown, max = 160) => String(v ?? '').trim().slice(0, max);
const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function lirePersonne(brut: any, role: PersonneSaisie['role']): PersonneSaisie | null {
  if (!brut || typeof brut !== 'object') return null;
  const nom = court(brut.nom, 120);
  const email = court(brut.email, 160).toLowerCase();
  const telephone = court(brut.telephone, 30);
  const societe = court(brut.societe, 120);
  // Un nom et au moins un moyen de contact, sinon on ne crée pas de fiche Contacts
  if (!nom || (!email && !telephone)) return null;
  return {
    role,
    nom,
    email: email && emailValide(email) ? email : undefined,
    telephone: telephone ? telNormal(telephone) : undefined,
    societe: societe || undefined,
  };
}

const lignePersonne = (titre: string, p: PersonneSaisie) =>
  `${titre} : ${[p.nom, p.societe, p.email, p.telephone].filter(Boolean).join(', ')}`;

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY as string; 
    const LIST_ID = getQualificationListId();

    if (!CLICKUP_API_KEY || !LIST_ID) {
      console.error("Configuration manquante : CLICKUP_API_KEY ou liste Qualification (TEST en preview)");
      return NextResponse.json({ success: false, error: "Configuration serveur incomplète" }, { status: 500 });
    }

    // SÉCURITÉ ANTI-VIDE : On bloque le robot si un champ obligatoire manque
    if (!data.nom || !data.email || !data.telephone) {
      return NextResponse.json({ success: false, error: "Champs manquants" }, { status: 400 });
    }

    // --- LA MAGIE : Formatage du téléphone pour ClickUp ---
    // 1. On enlève les espaces potentiels tapés par le client
    let telFormate = data.telephone.replace(/\s+/g, '');
    // 2. Si le numéro commence par 0, on le remplace par +33
    if (telFormate.startsWith('0')) {
      telFormate = '+33' + telFormate.substring(1);
    }

    // Traduction du type de client pour le menu déroulant ClickUp (0=Particulier, 1=Pro, 2=Syndic)
    let typeClientIndex = null; 
        if (data.typeClient === "Particulier") typeClientIndex = 0;
        if (data.typeClient === "Entreprise") typeClientIndex = 1; 
        if (data.typeClient === "Copropriété") typeClientIndex = 2;

    // Lot 3.5 : identifiant et contacts, seulement pour une entreprise ou une copropriété
    const estSociete = data.typeClient === "Entreprise" || data.typeClient === "Copropriété";
    const identifiantSaisi = estSociete ? court(data.siret, 40) : '';
    const identifiant = normaliserIdentifiant(identifiantSaisi);
    const personnes: PersonneSaisie[] = [];
    if (data.typeClient === "Copropriété") {
      const gestionnaire = lirePersonne(data.gestionnaire, 'Gestionnaire syndic');
      const president = lirePersonne(data.presidentCS, 'Président CS');
      if (gestionnaire) personnes.push(gestionnaire);
      if (president) personnes.push(president);
    }
    const lignesSociete: string[] = [];
    if (identifiantSaisi) lignesSociete.push(`SIRET / N° d'immatriculation : ${identifiantSaisi}${identifiant ? '' : ' (format non reconnu, à vérifier)'}`);
    for (const p of personnes) {
      lignesSociete.push(lignePersonne(p.role === 'Gestionnaire syndic' ? 'Gestionnaire du syndic' : 'Président du conseil syndical', p));
    }

    const champs: { id: string; value: any }[] = [
      {
        id: "66aee5d1-7159-46a7-b986-3dd6c314fd80", 
        value: data.email
      },
      {
        id: "6a120794-23be-4c50-8d25-75993f0aece4", 
        value: telFormate
      },
      {
        id: "f6b45107-9ba0-406b-8fd7-d678e6ad11dc", 
        value: typeClientIndex
      }
    ];
    // Identifiant écrit tel que reconnu (AE0812248, 14 chiffres), sinon tel que saisi
    if (identifiantSaisi) champs.push({ id: CHAMP_SIRET, value: identifiant ? identifiant.valeur : identifiantSaisi });

    // Envoi des données vers ClickUp
    const response = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Lead Site Web : ${data.nom}`, 
        description: `Résultat du simulateur : ${data.simulation || "Aucune simulation"}\n\nMessage envoyé par le client :\n\n"${data.message}"`
          + (lignesSociete.length > 0 ? `\n\n${lignesSociete.join('\n')}` : ''),
        custom_fields: champs
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Erreur renvoyée par ClickUp:", errorData);
      return NextResponse.json({ success: false, error: "Erreur ClickUp" }, { status: 500 });
    }

    // Contacts reliés : production seulement (les relations visent la vraie liste Qualification).
    // Un échec ici ne fait pas échouer la demande du client : un commentaire dit quoi relier à la main.
    if (personnes.length > 0 && process.env.VERCEL_ENV === 'production') {
      try {
        const tache = await response.json().catch(() => ({}));
        const taskId = String(tache?.id || '');
        if (taskId) {
          const resultats = await relierContacts(taskId, personnes, CLICKUP_API_KEY);
          const rates = resultats.filter((r) => !r.relie);
          if (rates.length > 0) {
            await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
              method: 'POST',
              headers: { Authorization: CLICKUP_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                comment_text: `⚠️ Contacts : à relier à la main (👔 Gestionnaire ou 📍 Contact sur place) : ${rates.map((r) => `${r.nom} (${r.role})`).join(', ')}. Les coordonnées sont dans la description.`,
                notify_all: true,
              }),
            }).catch(() => undefined);
          }
        }
      } catch (e) {
        console.error("Contacts non reliés :", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}
