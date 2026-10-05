import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, ClipboardList, FileText, LifeBuoy, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SavForm } from '@/components/ui/SavForm';
import { HautPhoto } from '@/components/charte/HautPhoto';
import { ESPACE_CLIENT_COOKIE, getClickUpTask, getTaskEmail, tokenAllowsDossier } from '@/lib/espace-client';

// Suivi de dossier (derrière l'Espace client), charte 2026.
// Logique inchangée : accès par cookie, tâche ClickUp, frise selon le statut, champs installation, devis Costructor, SavForm.

const NAVY = '#032b60';
const CYAN = '#0097b2';
const ORANGE = '#FF6B00';
const LABEL = '#007f96';
const CARTE = { backgroundColor: '#eceef1', boxShadow: '0 8px 22px rgba(3,43,96,0.10)' };

// Devis jamais montrés au client : brouillons, anciennes versions révisées, supprimés, annulés
const STATUTS_MASQUES = ['draft', 'revised', 'deleted', 'cancelled'];

// Mots trop génériques pour reconnaître une copropriété par son nom
const MOTS_GENERIQUES = new Set([
  'synd', 'syndicat', 'copro', 'copr', 'copropriete', 'coproprietaires', 'residence', 'domaine',
  'sdc', 'les', 'des', 'chez', 'societe', 'mairie', 'commune',
]);

function normaliser(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function motsCles(s: string): string[] {
  return normaliser(s)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 4 && !MOTS_GENERIQUES.has(m));
}

// Lien sans ?f=share ni slash final, pour comparer deux liens de partage
function lienSansParametres(u: string): string {
  return (u || '').trim().split('?')[0].split('#')[0].replace(/\/+$/, '');
}

async function fetchQuotes(token: string, query: string): Promise<any[]> {
  try {
    const res = await fetch(`https://api.costructor.co/external/v1/quotes?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

// L'API Costructor attend "_limit" (et non "limit") et renvoie 10 devis par défaut, les plus récents d'abord.
// Elle ne filtre pas par client : on récupère tout et on filtre nous-mêmes.
async function fetchTousLesDevis(token: string): Promise<any[]> {
  for (const taille of [100, 50]) {
    const tous: any[] = [];
    const vus = new Set<string>();
    for (let page = 1; page <= 10; page++) {
      const lot = await fetchQuotes(token, `_limit=${taille}&limit=${taille}&_page=${page}&page=${page}`);
      const nouveaux = lot.filter((q) => q?.id && !vus.has(q.id));
      if (nouveaux.length === 0) break; // fin de liste (ou pagination non gérée par l'API)
      for (const q of nouveaux) {
        vus.add(q.id);
        tous.push(q);
      }
    }
    if (tous.length > 0) return tous; // sinon on retente avec une page plus petite
  }
  return [];
}

const estVisible = (q: any) => !STATUTS_MASQUES.includes(q?.status);
const lienPartage = (q: any): string => String(q?.hostedUrl || q?.hosted_url || '');

// Retrouve les devis du client, dans cet ordre :
// 1. contact Costructor indiqué dans "Lien Costructor" (cnt_...)
// 2. sinon, si ce champ contient un lien de partage de devis, le client de ce devis
// 3. sinon, le client Costructor qui a le même email que le dossier (si plusieurs, celui dont le nom ressemble au dossier)
// Un dossier ne voit JAMAIS que les devis d'un seul client Costructor.
async function getDevisClient(taskData: any) {
  const token = process.env.COSTRUCTOR_API_KEY;
  if (!token) return [];

  const fields: any[] = taskData.custom_fields || [];
  const lienField =
    fields.find((f) => f.id === 'd9f88e8f-4e20-4a98-aee8-3ded30fef5fc') ||
    fields.find((f) => normaliser(f.name).includes('costructor'));
  const lien = String(lienField?.value || '').trim();
  const contactMatch = lien.match(/cnt_[a-z0-9]+/i);
  const emailDossier = getTaskEmail(taskData);

  if (!lien && !emailDossier) return [];

  const tous = await fetchTousLesDevis(token);
  const devisDe = (clientId: string) => tous.filter((q) => q?.customer?.id === clientId && estVisible(q));

  let quotes: any[] = [];

  // 1. Contact indiqué dans le champ
  if (contactMatch) {
    quotes = devisDe(contactMatch[0]);
  }

  if (quotes.length === 0) {
    let clientId: string | null = null;
    let devisDuLien: any = null;

    // 2. Lien de partage d'un devis collé dans le champ
    if (lien && !contactMatch) {
      const cible = lienSansParametres(lien);
      devisDuLien = tous.find((q) => lienPartage(q) && lienSansParametres(lienPartage(q)) === cible) || null;
      clientId = devisDuLien?.customer?.id || null;
    }

    // 3. Même email que le dossier
    if (!clientId && emailDossier) {
      const clients = new Map<string, string>();
      for (const q of tous) {
        const email = String(q?.customer?.email || '').trim().toLowerCase();
        if (q?.customer?.id && email === emailDossier) {
          clients.set(q.customer.id, q.customer.fullName || q.customer.companyName || '');
        }
      }
      if (clients.size === 1) {
        clientId = [...clients.keys()][0];
      } else if (clients.size > 1) {
        // Un syndic gère souvent plusieurs copropriétés avec le même email : on prend celle dont le nom ressemble au dossier
        const motsDossier = new Set(motsCles(taskData.name || ''));
        let meilleur: string | null = null;
        let meilleurScore = 0;
        let egalite = false;
        for (const [id, nom] of clients) {
          const score = motsCles(nom).filter((m) => motsDossier.has(m)).length;
          if (score > meilleurScore) {
            meilleur = id;
            meilleurScore = score;
            egalite = false;
          } else if (score === meilleurScore && score > 0) {
            egalite = true;
          }
        }
        clientId = meilleurScore > 0 && !egalite ? meilleur : null;
      }
    }

    if (clientId) {
      quotes = devisDe(clientId);
    } else if (devisDuLien && estVisible(devisDuLien)) {
      quotes = [devisDuLien];
    }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);

  return quotes.map((q: any) => {
    const accepte = q.status === 'accepted';
    const expireLe = typeof q.expireAt === 'string' ? q.expireAt.slice(0, 10) : null;
    return {
      numero: q.number,
      nom: q.name || 'Devis',
      accepte,
      expire: !accepte && !!expireLe && expireLe < aujourdhui,
      expireLe: expireLe ? new Date(expireLe).toLocaleDateString('fr-FR') : null,
      total: (q.total / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
      pdfId: q.pdf?.id || null,
      lienEnLigne: lienPartage(q) || null,
    };
  });
}

function Entete({ icon: I, label, titre }: { icon: typeof ClipboardList; label: string; titre: string }) {
  return (
    <div className="mb-8 flex items-center gap-4">
      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]" style={{ backgroundColor: CYAN }}>
        <I size={24} color="#ffffff" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>{label}</p>
        <h2 className="text-[24px] font-bold leading-tight sm:text-[26px]">{titre}</h2>
      </div>
    </div>
  );
}

export default async function SuiviClientPage({ params }: { params: Promise<{ id: string }> }) {
  // Déballage de la promesse (Spécifique Next.js 15+)
  const resolvedParams = await params;

  // Accès réservé : il faut s'être identifié dans l'Espace client (n° de dossier + email)
  const cookieStore = await cookies();
  if (!tokenAllowsDossier(cookieStore.get(ESPACE_CLIENT_COOKIE)?.value, resolvedParams.id)) {
    redirect(`/espace-client?dossier=${encodeURIComponent(resolvedParams.id)}`);
  }

  const taskData = await getClickUpTask(resolvedParams.id);
  const devis = taskData ? await getDevisClient(taskData) : [];

  // Si on ne trouve pas le dossier, on affiche une page 404
  if (!taskData) {
    notFound();
  }

  const nomChantier = taskData.name;
  const statutActuel = taskData.status.status;

  // Étapes de la frise (même logique qu'avant)
  const s = statutActuel.toLowerCase();

  // Phase commerciale (liste Qualification) : visite, devis, négociation
  const phaseDevis = s.includes('visiter') || s.includes('devis') || s.includes('négociation') || s.includes('negociation');
  const devisEnAttente = s.includes('envoy') || s.includes('négociation') || s.includes('negociation');

  // Étape en cours selon les statuts ClickUp (Qualification + Chantiers + Parc)
  let currentStep = 1; // par défaut : devis signé, dossier en préparation (ex : "gagné")
  if (phaseDevis) currentStep = 0;
  if (s.includes('planifié')) currentStep = 2;
  if (s.includes('en cours')) currentStep = 3;
  if (s.includes('réalisé') || s.includes('terminé') || s.includes('service') || s.includes('surveillance') || s.includes('panne')) currentStep = 4;
  if (s.includes('annulé') || s.includes('hors service') || s.includes('perdu')) currentStep = -1; // Mode erreur

  const etapeDevis =
    currentStep > 0
      ? { title: 'Devis validé', desc: 'Merci pour votre confiance : votre projet est lancé.' }
      : devisEnAttente
        ? {
            title: 'En attente de votre validation',
            desc: devis.length > 0
              ? 'Votre devis vous attend ci-dessous : consultez-le et signez-le en ligne pour lancer votre projet.'
              : 'Votre devis vous a été envoyé : consultez-le et validez-le pour lancer votre projet.',
          }
        : { title: 'Étude de votre projet', desc: 'Nous étudions votre installation et préparons votre devis.' };

  const steps = [
    etapeDevis,
    { title: "Préparation du dossier", desc: "Vos informations sont en cours d'analyse et de préparation." },
    { title: "Intervention planifiée", desc: "Une date a été fixée avec notre équipe technique." },
    { title: "Chantier en cours", desc: "Nos techniciens sont mobilisés sur votre installation." },
    { title: "Mise en service", desc: "Votre installation est finalisée et opérationnelle." }
  ];

  // Fonction pour extraire intelligemment la valeur d'un champ par son nom
  const getCustomFieldValue = (fieldName: string) => {
    const field = taskData.custom_fields?.find((f: any) => f.name.includes(fieldName));
    if (!field || field.value == null) return null;

    // Si c'est un menu déroulant (dropdown)
    if (field.type === 'drop_down' && field.type_config?.options) {
      // ClickUp stocke parfois l'index, parfois l'ID
      const option = field.type_config.options.find(
        (opt: any) => opt.orderindex === field.value || opt.id === field.value
      );
      return option ? option.name : null;
    }

    // Si c'est une date
    if (field.type === 'date') {
      return new Date(parseInt(field.value)).toLocaleDateString('fr-FR');
    }

    // Pour le texte simple
    return field.value;
  };

  // On récupère les valeurs basées sur les noms des champs dans ClickUp
  const modeleBorne = getCustomFieldValue("Modèle de Borne");
  const typeContrat = getCustomFieldValue("Type de Contrat");
  const finGarantie = getCustomFieldValue("Fin de Garantie");
  const details = [
    { label: 'Matériel', valeur: modeleBorne },
    { label: 'Contrat actif', valeur: typeContrat },
    { label: 'Fin de garantie', valeur: finGarantie },
  ].filter((d) => d.valeur);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white font-sans antialiased" style={{ color: NAVY }}>
      <Navbar transparent showFloatingCta={false} />

      <main className="grow">
        <HautPhoto
          img="/tech-chargeo.webp"
          eyebrow="Votre espace client · Suivi de dossier"
          eyeIcon={ClipboardList}
          minH="460px"
          titreClass="sm:text-[48px] lg:text-[56px]"
          titre={nomChantier}
        >
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white" style={{ borderColor: 'rgba(0,151,178,0.75)' }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CYAN }} /> {statutActuel}
            </span>
          </div>
        </HautPhoto>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl space-y-8 px-6 py-16 lg:py-20">

            {/* Frise d'avancement */}
            <div className="rounded-[24px] p-7 sm:p-10" style={CARTE}>
              <Entete icon={ClipboardList} label="Avancement du dossier" titre="Où en est votre projet ?" />
              <ol className="relative ml-3 space-y-8 border-l-[3px] border-white">
                {steps.map((step, index) => {
                  const isActive = currentStep === index;
                  const isCompleted = currentStep > index;
                  const isUpcoming = currentStep < index;

                  // Gestion spéciale si la borne est en panne dans le Parc Installé
                  const showSavWarning = isActive && index === 4 && (s.includes('surveillance') || s.includes('panne'));
                  const couleurPoint = showSavWarning ? '#dc2626' : isActive ? ORANGE : isCompleted ? CYAN : '#c8d0d9';

                  return (
                    <li key={index} className="relative pl-9">
                      <span className="absolute -left-[13px] top-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border-4 border-[#eceef1]" style={{ backgroundColor: couleurPoint }}>
                        {(isActive || showSavWarning) && <span className="absolute h-full w-full animate-ping rounded-full opacity-50" style={{ backgroundColor: couleurPoint }} />}
                      </span>
                      <h3 className="text-[19px] font-bold" style={{ color: showSavWarning ? '#dc2626' : isActive ? ORANGE : isUpcoming ? '#8a97a8' : NAVY }}>
                        {step.title}
                      </h3>
                      <p className="mt-1 text-[16px] leading-relaxed" style={{ opacity: isUpcoming ? 0.55 : 1 }}>
                        {showSavWarning ? "Votre borne nécessite une assistance. Notre équipe technique est sur le coup." : step.desc}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Détails des champs personnalisés */}
            {details.length > 0 && (
              <div className="rounded-[24px] p-7 sm:p-10" style={CARTE}>
                <Entete icon={ShieldCheck} label="Votre installation" titre="Détails de votre installation" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {details.map((d) => (
                    <div key={d.label} className="rounded-[18px] bg-white p-5">
                      <p className="text-[13px] font-extrabold uppercase tracking-[0.12em]" style={{ color: LABEL }}>{d.label}</p>
                      <p className="mt-1 text-[18px] font-bold">{String(d.valeur)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Devis Costructor */}
            {devis.length > 0 && (
              <div className="rounded-[24px] p-7 sm:p-10" style={CARTE}>
                <Entete icon={FileText} label="Vos devis" titre="Consulter et signer" />
                <div className="space-y-4">
                  {devis.map((d: any) => {
                    // Lien de partage Costructor en priorité (consultation + signature en ligne), sinon le PDF
                    const href = d.lienEnLigne || (d.pdfId ? `/api/devis-pdf/${d.pdfId}` : undefined);
                    const libelle = d.lienEnLigne && !d.accepte && !d.expire ? 'Voir et signer' : 'Voir le devis';
                    return (
                      <a
                        key={d.numero + (d.pdfId || d.lienEnLigne || '')}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col gap-4 rounded-[18px] bg-white p-5 transition sm:flex-row sm:items-center sm:justify-between ${href ? 'cursor-pointer hover:shadow-[inset_0_0_0_2px_#0097b2]' : ''}`}
                      >
                        <div>
                          <p className="text-[17px] font-bold">{d.nom}</p>
                          <p className="text-[15px]">
                            N° {d.numero} · {d.total}
                            {d.accepte && <span className="ml-2 font-semibold" style={{ color: LABEL }}>✓ Accepté</span>}
                          </p>
                          {d.expire && (
                            <p className="mt-1 text-[13px] font-semibold" style={{ color: ORANGE }}>
                              Expiré le {d.expireLe} : contactez-nous pour un devis à jour.
                            </p>
                          )}
                        </div>
                        {href ? (
                          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-[15px] font-semibold text-white sm:self-auto" style={{ backgroundColor: CYAN }}>
                            {libelle} <ArrowRight size={16} />
                          </span>
                        ) : (
                          <span className="shrink-0 text-[13px]" style={{ color: LABEL }}>PDF bientôt dispo</span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formulaire SAV */}
            <div className="rounded-[24px] p-7 sm:p-10" style={CARTE}>
              <Entete icon={LifeBuoy} label="Assistance technique" titre="Un problème avec votre borne ?" />
              <p className="-mt-3 mb-8 text-[16px] leading-relaxed">
                Utilisez ce formulaire pour nous signaler tout dysfonctionnement. Votre demande sera traitée en priorité par nos techniciens locaux.
              </p>
              <SavForm clientId={resolvedParams.id} nomClient={nomChantier} />
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
