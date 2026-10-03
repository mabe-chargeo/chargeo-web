import { NextResponse } from 'next/server';

// Liste ClickUp "Recrutement Installateurs (v2)" (BACK OFFICE > RESSOURCES HUMAINES).
// Surcharge possible par la variable Vercel CLICKUP_LIST_RECRUTEMENT_ID.
const LIST_ID = process.env.CLICKUP_LIST_RECRUTEMENT_ID || "1200630000003865";

// Matthieu BELENGRI : chaque candidature lui est assignee (notification ClickUp).
const ASSIGNEE_ID = 206557737;

// Champs de la liste Recrutement, crees le 03/10/2026.
// ATTENTION : les listes deroulantes sont ecrites PAR INDEX (ordre des options dans
// ClickUp). Ne jamais reordonner ni inserer une option au milieu dans ClickUp sans
// corriger les index ci-dessous.
const CF = {
  telephone: "f3d8c4c0-9628-4b38-9b27-11a58d54f8de",   // Telephone (phone)
  email: "66aee5d1-7159-46a7-b986-3dd6c314fd80",       // Email (champ partage avec Qualification)
  disponibilite: "3cc0e052-8b3d-4265-9372-b01da831776d", // Disponibilite (date)
  poste: "764a4908-93a9-425e-985c-e32029b5e375",       // Poste : Electricien=0, Poseur=1, Chef d'equipe=2
  diplome: "c8331498-8638-41de-8c3a-67290fc1dad6",     // Diplome : CAP=0, Bac pro=1, BTS=2, Autre=3
  permis: "9f2afed1-03d9-4cff-aa8b-a8649cc9fda9",      // Permis B (checkbox)
  habilitation: "0cb446e3-55f1-44a3-85c4-d9efa0ada758", // Formation habilitation : Aucune=0, Faite en formation=1, Titre deja delivre=2
};

const POSTE_POSEUR = 1;
const DIPLOMES: Record<string, number> = { "CAP": 0, "Bac pro": 1, "BTS": 2, "Autre": 3 };
const HABILITATIONS: Record<string, number> = { "Aucune": 0, "Faite en formation": 1, "Titre déjà délivré": 2 };

const CV_MAX_OCTETS = 4 * 1024 * 1024; // limite des requetes Vercel : 4,5 Mo
const CV_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function texte(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  try {
    const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY as string;
    const form = await request.formData();

    // Pot de miel anti-robot : champ invisible, rempli seulement par les robots.
    if (texte(form.get("site_web"))) {
      return NextResponse.json({ success: true });
    }

    const nom = texte(form.get("nom"));
    const telephone = texte(form.get("telephone"));
    const email = texte(form.get("email"));
    const disponibilite = texte(form.get("disponibilite"));
    const diplome = texte(form.get("diplome"));
    const permis = texte(form.get("permis"));
    const habilitation = texte(form.get("habilitation"));
    const message = texte(form.get("message"));
    const rgpd = texte(form.get("rgpd"));

    // SECURITE ANTI-VIDE : champs obligatoires
    if (!nom || !telephone || !(diplome in DIPLOMES) || !permis || !(habilitation in HABILITATIONS) || rgpd !== "oui") {
      return NextResponse.json({ success: false, error: "Champs manquants" }, { status: 400 });
    }

    // Telephone au format +33 (comme /api/contact)
    let telFormate = telephone.replace(/[\s.\-]/g, '');
    if (telFormate.startsWith('0')) telFormate = '+33' + telFormate.substring(1);
    const telValide = /^\+\d{8,15}$/.test(telFormate);
    const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const custom_fields: { id: string; value: unknown }[] = [
      { id: CF.poste, value: POSTE_POSEUR },
      { id: CF.diplome, value: DIPLOMES[diplome] },
      { id: CF.habilitation, value: HABILITATIONS[habilitation] },
      { id: CF.permis, value: permis === "oui" },
    ];
    if (telValide) custom_fields.push({ id: CF.telephone, value: telFormate });
    if (emailValide) custom_fields.push({ id: CF.email, value: email });
    if (disponibilite) {
      const t = new Date(disponibilite + "T08:00:00").getTime();
      if (!Number.isNaN(t)) custom_fields.push({ id: CF.disponibilite, value: t });
    }

    const recu = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
    const description = [
      `Candidature reçue depuis chargeo.fr/recrutement le ${recu}.`,
      ``,
      `Téléphone : ${telephone}`,
      `Email : ${email || "non renseigné"}`,
      `Disponible à partir du : ${disponibilite || "non renseigné"}`,
      `Diplôme : ${diplome}`,
      `Permis B : ${permis === "oui" ? "oui" : "non"}`,
      `Habilitation électrique : ${habilitation}`,
      ``,
      `Mot du candidat :`,
      message ? `"${message}"` : "(aucun)",
      ``,
      `Consentement RGPD : conservation de la candidature 2 ans accepté le ${recu}.`,
    ].join("\n");

    const response = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      method: 'POST',
      headers: { 'Authorization': CLICKUP_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nom, description, assignees: [ASSIGNEE_ID], custom_fields }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Erreur renvoyée par ClickUp (recrutement):", errorData);
      return NextResponse.json({ success: false, error: "Erreur ClickUp" }, { status: 500 });
    }

    const tache = await response.json();

    // CV facultatif : envoye en piece jointe de la tache
    const cv = form.get("cv");
    if (cv && typeof cv !== "string" && cv.size > 0) {
      if (cv.size <= CV_MAX_OCTETS && CV_TYPES.includes(cv.type)) {
        const pj = new FormData();
        pj.append("attachment", cv, cv.name);
        const up = await fetch(`https://api.clickup.com/api/v2/task/${tache.id}/attachment`, {
          method: 'POST',
          headers: { 'Authorization': CLICKUP_API_KEY },
          body: pj,
        });
        if (!up.ok) console.error("CV non joint (recrutement):", await up.text().catch(() => ""));
      } else {
        console.error("CV ignore : taille ou format non accepte", cv.type, cv.size);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur serveur (recrutement):", error);
    return NextResponse.json({ success: false, error: "Erreur Serveur" }, { status: 500 });
  }
}
