// Identité officielle du client payeur à partir du champ « 🏛️ SIRET / N° RNIC » (lot 3.5, 13/10/2026).
// - SIRET (14 chiffres) ou SIREN (9 chiffres) : annuaire des entreprises de l'État
//   (recherche-entreprises.api.gouv.fr, gratuit, sans clé) : raison sociale, adresse, SIRET du siège ;
//   TVA calculée depuis le SIREN, seulement si l'annuaire indique que l'entreprise en a une.
// - N° d'immatriculation de copropriété (RNIC, format AA1234567) : registre national des copropriétés
//   publié par l'Anah sur data.gouv.fr (API tabulaire, gratuite, sans clé) : nom, adresse, syndic, places.
// Rien trouvé, réponse lente ou service en panne : null, l'appelant garde son fonctionnement d'avant.

export type Identifiant = { type: 'siret' | 'siren' | 'rnic'; valeur: string };

export type IdentiteEntreprise = {
  raisonSociale: string;
  siret: string;
  siren: string;
  tva: string;
  adresse?: { street: string; postal_code: string; city: string; country: 'fr' };
  fermee: boolean;
};

export type IdentiteCopro = {
  rnic: string;
  nom: string;
  adresse?: { street: string; postal_code: string; city: string; country: 'fr' };
  syndic?: string;
  siretSyndic?: string;
  lotsStationnement?: number;
  lotsHabitation?: number;
};

// Ressource « nouveau format de colonnes » du registre (vérifiée le 13/10/2026 avec Bacchus AE0812248).
// Remplaçable sans code par la variable Vercel RNIC_RESOURCE_ID si l'Anah publie une nouvelle ressource.
const RNIC_RESOURCE_PAR_DEFAUT = 'cc062fa7-4a80-449c-ab73-d2856b455ec9';
const DELAI_MS = 6000;

// « AE 081 2248 » -> rnic AE0812248 ; « 420 287 060 00018 » -> siret ; 9 chiffres -> siren ; sinon null
export function normaliserIdentifiant(brut: unknown): Identifiant | null {
  const compact = String(brut ?? '').toUpperCase().replace(/[\s.\-_/]/g, '');
  if (/^[A-Z]{2}\d{7}$/.test(compact)) return { type: 'rnic', valeur: compact };
  if (/^\d{14}$/.test(compact)) return { type: 'siret', valeur: compact };
  if (/^\d{9}$/.test(compact)) return { type: 'siren', valeur: compact };
  return null;
}

// TVA intracommunautaire française : FR + clé + SIREN, clé = (12 + 3 × (SIREN mod 97)) mod 97
export function tvaDepuisSiren(siren: string): string {
  if (!/^\d{9}$/.test(siren)) return '';
  const cle = (12 + 3 * (Number(siren) % 97)) % 97;
  return `FR${String(cle).padStart(2, '0')}${siren}`;
}

const vide = (v: unknown) => {
  const t = String(v ?? '').trim();
  return t === '' || t.toLowerCase() === 'non connu' ? '' : t;
};

async function lireJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(DELAI_MS), headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// « 851 AVENUE DES RIVES DU LEMAN 74500 PUBLIER » -> rue « 851 AVENUE DES RIVES DU LEMAN »
function rueSansVille(adresse: string, cp: string): string {
  const a = String(adresse || '').trim();
  if (!cp) return a;
  const i = a.lastIndexOf(cp);
  return (i > 0 ? a.slice(0, i) : a).trim().replace(/,$/, '').trim();
}

export async function rechercherEntreprise(numero: string): Promise<IdentiteEntreprise | null> {
  if (!/^\d{9}(\d{5})?$/.test(numero)) return null;
  const siren = numero.slice(0, 9);
  const json = await lireJson(`https://recherche-entreprises.api.gouv.fr/search?q=${numero}&page=1&per_page=5`);
  const r = (Array.isArray(json?.results) ? json.results : []).find((x: any) => String(x?.siren) === siren);
  if (!r) return null;
  const etablissements: any[] = Array.isArray(r.matching_etablissements) ? r.matching_etablissements : [];
  const etab = (numero.length === 14 ? etablissements.find((e) => String(e?.siret) === numero) : null) || r.siege || {};
  const cp = vide(etab.code_postal);
  const ville = vide(etab.libelle_commune);
  const rue = rueSansVille(vide(etab.adresse), cp);
  return {
    raisonSociale: vide(r.nom_raison_sociale) || vide(r.nom_complet),
    siret: vide(etab.siret) || (numero.length === 14 ? numero : vide(r.siege?.siret)),
    siren,
    // TVA seulement si l'annuaire en connaît une (un syndicat de copropriété n'en a souvent pas : on n'en invente pas)
    tva: r.tva ? tvaDepuisSiren(siren) : '',
    adresse: rue && cp && ville ? { street: rue, postal_code: cp, city: ville, country: 'fr' } : undefined,
    fermee: String(r.etat_administratif || '') === 'C' || String(etab.etat_administratif || '') === 'F',
  };
}

export async function rechercherCopro(rnic: string): Promise<IdentiteCopro | null> {
  if (!/^[A-Z]{2}\d{7}$/.test(rnic)) return null;
  const ressource = process.env.RNIC_RESOURCE_ID?.trim() || RNIC_RESOURCE_PAR_DEFAUT;
  const json = await lireJson(`https://tabular-api.data.gouv.fr/api/resources/${ressource}/data/?numero_d_immatriculation__exact=${rnic}`);
  const c = (Array.isArray(json?.data) ? json.data : []).find((x: any) => String(x?.numero_d_immatriculation) === rnic);
  if (!c) return null;
  const rue = vide(c.numero_et_voie_adresse_de_reference);
  const cp = vide(c.code_postal_adresse_de_reference);
  const ville = vide(c.commune_adresse_de_reference);
  const nombre = (v: unknown) => (Number.isFinite(Number(v)) && String(v ?? '') !== '' ? Number(v) : undefined);
  return {
    rnic,
    nom: vide(c.nom_d_usage_de_la_copropriete),
    adresse: rue && cp && ville ? { street: rue, postal_code: cp, city: ville, country: 'fr' } : undefined,
    syndic: vide(c.raison_sociale_du_representant_legal) || undefined,
    siretSyndic: vide(c.siret_du_representant_legal) || undefined,
    lotsStationnement: nombre(c.nombre_de_lots_de_stationnement),
    lotsHabitation: nombre(c.nombre_de_lots_a_usage_d_habitation),
  };
}
