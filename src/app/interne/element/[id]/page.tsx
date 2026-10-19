"use client";

// Fiche générique (lot « écrans qui manquent », 17/10/2026, 14 h 28).
// Une commande, un ticket SAV, une visite, une facture, un achat, un dossier ADVENIR, une demande RH, une réunion CODIR,
// un OKR, une idée Kaizen ou une tâche To-Do : statut, échéance, assignés, tous les champs remplis (téléphone, email
// et liens cliquables, tâches reliées ouvertes dans l'application), description, sous-tâches, pièces jointes et
// derniers commentaires. Une fiche affaire (Prospection à Parc) bascule sur /interne/fiches/<id>.
// 17/10, 14 h 50 : une visite de maintenance a le bouton « Faire la visite » (/interne/maintenance/<id>, protocole
// Sefram MW9665 avec l'adaptateur A1532-XA).
// 17/10, 20 h 01 (choix de Matthieu : checklist d'onboarding dans la fiche salarié) : les checklists de la tâche,
// avec leur avancement, se cochent ici (/api/interne/checklist).
// 18/10, 9 h 33 : visite de maintenance (à planifier ou rdv confirmé) et ticket SAV ouvert : bouton « Caler » ou
// « Décaler » (/interne/rdv/<visite|depannage>/<id>), pour le chef de chantier et la direction (rôle affiché).
// 18/10, 18 h 19 (maquette validée par Matthieu) : une facture client a son propre écran (src/components/appli/
// FicheFacture.tsx) avec « Marquer comme émise » ; les commentaires et la note de création passent dans Historique.
// Fil d'Ariane : chaque fiche remonte au menu de sa liste (Matthieu, 18 h 12 : « pourquoi dans le fil d'Ariane il y a
// à traiter chantier » sur une facture), au lieu de Chantiers pour toutes.
// 18/10, 19 h 31 : bouton « Faire la visite » sans le nom de l'appareil ; « Ouvrir dans ClickUp » pour direction et
// back-office seulement.
// 18/10, 19 h 50 (maquette MAQUETTE_GABARIT-FICHES_2026-10-18.png validée par Matthieu : « la page des factures est plus
// travaillée… j'aimerais bien qu'il y ait ce genre de lien un peu sur toutes les pages ») : même gabarit que la facture
// pour toutes les fiches. Carte du haut (statut, 3 infos clés, parcours par statuts), contact,
// prochaine étape (Caler, Faire la visite), détails, liens (src/lib/ficheGabarit.ts), historique replié.
// 18/10, 20 h 00 (Matthieu : « ton bouton… FaceTime, on avait travaillé là-dessus ») : plus de raccourcis tel: bruts.
// Le contact passe par le bloc 📇 Contact validé : celui de l'affaire reliée (Parc, chantier, vente), et les mêmes
// boutons (BoutonsContact : Appeler, Google Voice, SMS, Gmail ; Waze et Google Maps) sur les coordonnées de la fiche.
// 18/10, 22 h 20 (maquette MAQUETTE_RAPPORT-SAV_2026-10-18.png validée par Matthieu) : un ticket SAV ouvert a le bouton
// « 🛠️ Rapport d'intervention » (/interne/rapport-sav/<id>) pour le chef de chantier, la direction et l'installateur ;
// « Problème résolu » dans le rapport ferme le ticket.
// 19/10, 8 h 35 (maquette MAQUETTE_COHERENCE-SAV_2026-10-19.png validée par Matthieu, après sa remarque du 18/10, 22 h 44 :
// « faut que ce soit cohérent dans la présentation, utilise des blocs communs au lieu de recoder toutes les pages ») :
// - le rapport d'intervention a sa carte « Documents », avec la ligne document de la réception (src/components/appli/
//   LigneDocument.tsx : compteur, vignette, bouton « Faire le rapport d'intervention » tant que le ticket est ouvert) ;
//   son PDF ne passe plus dans Liens ni dans Détails ;
// - les liens ClickUp écrits dans la description (« Dossier : https://app.clickup.com/t/… ») ouvrent la fiche dans
//   l'application, avec son nom ;
// - Waze et Google Maps viennent du bloc Contact (BoutonsAdresse) au lieu d'une copie ;
// - le bouton Retour est celui de l'en-tête commun (retour), qui garde l'écran de la liste en repli.
// 19/10, 11 h 03 (maquette MAQUETTE_SUIVI-COMMANDE-ADVENIR_2026-10-19_v2.png validée par Matthieu, après sa remarque de
// 10 h 46 : « l'appli CHARGéO ne me permet pas de mettre à jour quoi que ce soit ») : une commande de matériel et un
// dossier ADVENIR ont leurs deux cartes de suivi sous le contact (src/components/ui/Suivi.tsx, mêmes cartes que la
// vente) ; leurs champs n'apparaissent plus en double dans Détails.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlignLeft, CalendarPlus, Check, ChevronDown, ChevronRight, ExternalLink, FileText, Link2, ListChecks, Mail, MapPin, Navigation, Paperclip, PenLine, Phone, RefreshCw, Users } from 'lucide-react';
import { PageAppli, EnTeteAppli, ContenuAppli, Carte, Alerte, TitreCarte } from '@/components/charte/Appli';
import { CYAN } from '@/components/charte/couleurs';
import { BlocContact, BoutonsAdresse, BoutonsContact } from '@/components/ui/BlocContact';
import { ActionDocument, LigneDocument } from '@/components/appli/LigneDocument';
import { useRoleAppli } from '@/components/charte/roleAppli';
import FicheFacture from '@/components/appli/FicheFacture';
import { Suivi } from '@/components/ui/Suivi';
import { CHAMPS_SUIVI, rolesSuivi } from '@/lib/suivi';
import type { Facture } from '@/lib/factureFiche';
import type { Gabarit } from '@/lib/ficheGabarit';

type Champ = { id: string; nom: string; type: string; texte: string; lien?: string; taches?: { id: string; nom: string }[] };
type Checklist = { id: string; nom: string; points: { id: string; nom: string; fait: boolean }[] };
type Element = {
  id: string; nom: string; source: string; liste: string; emoji: string; retour: string; statut: string; couleurStatut: string;
  echeance: string; debut: string; assignes: string[]; tags: string[]; description: string; champs: Champ[]; parent: string;
  sousTaches: { id: string; nom: string; statut: string; couleurStatut: string }[];
  checklists?: Checklist[];
  piecesJointes: { nom: string; url: string }[];
  commentaires: { id: string; auteur: string; date: string; texte: string }[];
  url: string;
  facture?: Facture;
  gabarit?: Gabarit;
};

// Menu parent de la fiche dans le fil d'Ariane, par liste (clés de src/lib/menusAppli.ts)
const PARENT_SOURCE: Record<string, string> = {
  factures: 'facturation',
  commandes: 'materielAchats',
  achats: 'materielAchats',
  sav: 'sav',
  maintenance: 'sav',
  advenir: 'advenir',
  parc: 'parc',
  rh: 'rh',
  salaries: 'rh',
  recrutement: 'rh',
  codir: 'pilotage',
  okr: 'pilotage',
  kaizen: 'pilotage',
  todo: 'pilotage',
};
function parentDe(source: string | undefined, role: string | null): string {
  if (!source) return '';
  // L'installateur retrouve ses tickets et ses visites dans Mes interventions
  if (role === 'poseur' && (source === 'sav' || source === 'maintenance')) return 'interventions';
  return PARENT_SOURCE[source] || '';
}

const sansEmoji = (s: string) => s.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/, '').trim();
const normal = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function Pastille({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white" style={{ backgroundColor: couleur }}>{children}</span>;
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[14px]">
      <span className="shrink-0 text-slate-500">{libelle}</span>
      <span className="text-right font-bold">{valeur}</span>
    </div>
  );
}

// Parcours par les statuts de la liste (étapes faites en vert, en cours en cyan)
function Parcours({ etapes, courante }: { etapes: string[]; courante: number }) {
  return (
    <div className="mt-4 flex items-start">
      {etapes.map((e, i) => {
        const fait = i < courante;
        const ici = i === courante;
        const fond = fait ? '#16a34a' : ici ? CYAN : '#e2e8f0';
        return (
          <div key={`${e}-${i}`} className="relative flex min-w-0 flex-1 flex-col items-center">
            {i > 0 && <span className="absolute right-1/2 top-[11px] h-[2px] w-full bg-[#e2e8f0]" />}
            <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: fond }}>
              {fait ? <Check size={14} /> : i + 1}
            </span>
            <span className={`mt-1 px-0.5 text-center text-[11px] font-bold leading-tight ${fait ? 'text-[#16a34a]' : ici ? '' : 'text-slate-400'}`}>{e}</span>
          </div>
        );
      })}
    </div>
  );
}

const GABARIT_VIDE: Gabarit = { cles: [], parcours: null, affaire: '', contact: { tel: '', email: '', adresse: '', lat: null, lng: null, autres: [] }, moi: '', liens: [], documents: [], ailleurs: [] };

// Lien ClickUp écrit dans un texte (« Dossier : https://app.clickup.com/t/… ») : ouvert dans l'application, avec le nom
// de la fiche quand on le connaît
const LIEN_CLICKUP = /https?:\/\/app\.clickup\.com\/t\/(?:\d+\/)?([a-z0-9]+)[^\s]*/gi;
function TexteAvecFiches({ texte, noms }: { texte: string; noms: Record<string, string> }) {
  const morceaux: React.ReactNode[] = [];
  const re = new RegExp(LIEN_CLICKUP.source, 'gi');
  let dernier = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texte))) {
    morceaux.push(texte.slice(dernier, m.index));
    morceaux.push(
      <a key={`${m[1]}-${m.index}`} href={`/interne/element/${m[1]}`} className="font-semibold" style={{ color: CYAN }}>
        {noms[m[1]] || 'Ouvrir la fiche'} ›
      </a>,
    );
    dernier = m.index + m[0].length;
  }
  morceaux.push(texte.slice(dernier));
  return <>{morceaux}</>;
}

// Bouton Caler / Décaler d'une visite ou d'un dépannage (ou rien)
function actionCaler(e: Element): { href: string; libelle: string } | null {
  const s = normal(e.statut);
  if (e.source === 'maintenance' && (s.includes('a planifier') || s.includes('rdv confirme'))) {
    return { href: `/interne/rdv/visite/${e.id}`, libelle: s.includes('rdv confirme') ? '📅 Décaler la visite' : '📅 Caler la visite' };
  }
  if (e.source === 'sav' && !s.includes('resolu') && !s.includes('archive')) {
    return { href: `/interne/rdv/depannage/${e.id}`, libelle: s.includes('intervention planifiee') ? '📅 Décaler le dépannage' : '📅 Caler le dépannage' };
  }
  return null;
}

export default function ElementPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');
  const { role } = useRoleAppli();
  const [element, setElement] = useState<Element | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<{ texte: string; url?: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurCoche, setErreurCoche] = useState<string | null>(null);
  const [historique, setHistorique] = useState(false);

  const charger = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/interne/fiche-generique?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data?.fiche) { window.location.replace(String(data.fiche)); return; }
      if (!res.ok || data?.error) setErreur({ texte: data?.error || `Lecture impossible (${res.status})`, url: data?.url });
      else setElement(data.element as Element);
    } catch {
      setErreur({ texte: 'Impossible de joindre le serveur.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) charger(); }, [id]);

  // Coche ou décoche un point ; l'affichage change dès que ClickUp a accepté
  const cocher = async (checklistId: string, pointId: string, fait: boolean) => {
    if (!element || enCours) return;
    setEnCours(pointId);
    setErreurCoche(null);
    try {
      const res = await fetch('/api/interne/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tacheId: element.id, checklistId, pointId, fait }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) { setErreurCoche(data?.error || `Enregistrement impossible (${res.status})`); return; }
      setElement({
        ...element,
        checklists: (element.checklists || []).map((c) => (c.id !== checklistId ? c : { ...c, points: c.points.map((p) => (p.id === pointId ? { ...p, fait } : p)) })),
      });
    } catch {
      setErreurCoche('Impossible de joindre le serveur. Rien n’a changé.');
    } finally {
      setEnCours(null);
    }
  };

  const valeur = (c: Champ) => {
    if (c.taches?.length) {
      return (
        <span className="flex flex-col gap-1">
          {c.taches.map((t) => (
            <a key={t.id} href={`/interne/element/${t.id}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: CYAN }}>
              {t.nom || 'Tâche reliée'} <ChevronRight size={14} />
            </a>
          ))}
        </span>
      );
    }
    if (c.lien) {
      const externe = c.lien.startsWith('http');
      return <a href={c.lien} target={externe ? '_blank' : undefined} rel={externe ? 'noopener noreferrer' : undefined} className="break-all font-semibold underline">{c.texte}</a>;
    }
    return <span className="whitespace-pre-line font-semibold">{c.texte}</span>;
  };

  // Lien ClickUp réservé à la direction et au back-office (consigne de Matthieu)
  const voitClickUp = role === 'direction' || role === 'backOffice';
  const caler = element && (role === 'direction' || role === 'chargeOperation') ? actionCaler(element) : null;
  const facture = element?.facture;
  // Commande de matériel ou dossier ADVENIR : cartes de suivi pour les rôles qui les font avancer
  const suivi = !!element && !facture && !!role && rolesSuivi(element.source).includes(role);

  // Gabarit commun : infos clés, détails, raccourcis, étapes
  const g: Gabarit = element?.gabarit || {
    ...GABARIT_VIDE,
    liens: [
      ...(element?.piecesJointes || []).map((p) => ({ nom: p.nom, sous: 'Pièce jointe', href: p.url, genre: 'fichier' as const })),
      ...(element?.parent ? [{ nom: 'Tâche parente', sous: 'Fiche principale', href: `/interne/element/${element.parent}`, genre: 'fiche' as const }] : []),
    ],
  };
  const champsFiche = element?.champs || [];
  const cles = g.cles.map((id) => champsFiche.find((c) => c.id === id)).filter((c): c is Champ => !!c);
  const details = champsFiche.filter((c) => !g.cles.includes(c.id) && !g.ailleurs.includes(c.id) && !(suivi && CHAMPS_SUIVI.includes(c.id)));
  const montrerEcheance = !!element?.echeance && !cles.some((c) => normal(c.nom).includes('echeance'));
  const ct = g.contact;
  const contactPropre = !!(ct.tel || ct.email || ct.adresse || ct.autres.length);
  const etapes: { texte: string; libelle: string; href: string; couleur: string }[] = [];
  if (element && caler) {
    etapes.push({
      texte: element.source === 'maintenance'
        ? 'Caler le rendez-vous avec le client : l’événement part dans le Google Agenda du technicien.'
        : 'Pas réglé par téléphone ? Caler un dépannage : l’événement part dans le Google Agenda du technicien.',
      libelle: caler.libelle.replace(/^📅 /, ''),
      href: caler.href,
      couleur: CYAN,
    });
  }
  // Faire la visite : jusqu'à la visite réalisée (le rapport se valide ensuite)
  if (element?.source === 'maintenance' && !normal(element.statut).includes('rapport') && !normal(element.statut).includes('complete')) {
    etapes.push({ texte: 'Le jour J, dérouler le protocole de contrôle jusqu’au rapport.', libelle: '🔧 Faire la visite', href: `/interne/maintenance/${element.id}`, couleur: '#FF6B00' });
  }
  // Rapport d'intervention SAV : sur place, après le dépannage, jusqu'au ticket résolu (bouton dans la carte Documents)
  const savOuvert = element?.source === 'sav' && !normal(element.statut).includes('resolu') && !normal(element.statut).includes('archive');
  const faitLeRapport = role === 'direction' || role === 'chargeOperation' || role === 'poseur';
  const documents = (g.documents || []).filter((d) => d.fichiers.length > 0 || (d.cible === 'rapportSav' && savOuvert));
  // Noms des fiches reliées, pour les liens ClickUp de la description
  const noms: Record<string, string> = {};
  for (const c of champsFiche) for (const t of c.taches || []) if (t.nom) noms[t.id] = t.nom;
  for (const l of g.liens) {
    const m = l.genre === 'fiche' ? /\/interne\/element\/([a-z0-9]+)/i.exec(l.href) : null;
    if (m && !noms[m[1]] && l.nom !== 'Tâche parente') noms[m[1]] = l.nom;
  }

  const commentaires = element && element.commentaires.length > 0 && (
    <div className="space-y-3">
      {element.commentaires.map((c) => (
        <div key={c.id} className="rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
          <p className="text-[12px] font-bold text-slate-500">{[c.auteur, c.date].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 whitespace-pre-line text-[14px]">{c.texte}</p>
        </div>
      ))}
    </div>
  );

  return (
    <PageAppli>
      <EnTeteAppli
        surtitre={element ? `${element.emoji} ${element.liste}` : 'Fiche'}
        titre={facture?.titre || element?.nom || 'Fiche'}
        sousTitre={facture?.sousTitre}
        retour={{ href: element?.retour || '/interne/espace', libelle: 'Retour' }}
        parent={parentDe(element?.source, role)}
      />
      <ContenuAppli className="space-y-4">
        {erreur && (
          <Alerte>
            {erreur.texte}
            {erreur.url && voitClickUp && <> · <a href={erreur.url} target="_blank" rel="noopener noreferrer" className="underline">Ouvrir dans ClickUp</a></>}
          </Alerte>
        )}
        {loading && !element && (
          <Carte className="p-8 text-center">
            <RefreshCw className="mx-auto animate-spin" size={28} color={CYAN} />
            <p className="mt-3 text-[15px] font-semibold">Chargement...</p>
          </Carte>
        )}

        {element && facture && (
          <FicheFacture id={element.id} facture={facture} peutEcrire={role === 'direction' || role === 'backOffice'} onEmise={charger} />
        )}

        {element && !facture && (
          <>
            {/* En haut : statut, infos clés, parcours */}
            <div className="rounded-[20px] bg-white p-5 ring-[1.5px] ring-[#dfe3e8]">
              <div className="flex flex-wrap items-center gap-2">
                <Pastille couleur={element.couleurStatut || '#87909e'}>{element.statut}</Pastille>
                {element.tags.map((t) => <Pastille key={t} couleur="#64748b">{t}</Pastille>)}
              </div>
              {(cles.length > 0 || montrerEcheance || element.debut || element.assignes.length > 0) && (
                <div className="mt-3 space-y-1.5">
                  {cles.map((c) => <Ligne key={c.id} libelle={sansEmoji(c.nom) || c.nom} valeur={c.texte} />)}
                  {element.debut && <Ligne libelle="Début" valeur={element.debut} />}
                  {montrerEcheance && <Ligne libelle="Échéance" valeur={element.echeance} />}
                  {element.assignes.length > 0 && <Ligne libelle="Assigné à" valeur={element.assignes.join(', ')} />}
                </div>
              )}
              {g.parcours && <Parcours etapes={g.parcours.etapes} courante={g.parcours.courante} />}
            </div>

            {/* Contact : bloc de l'affaire reliée, sinon les mêmes boutons sur les coordonnées de la fiche */}
            {g.affaire && <BlocContact affaireId={g.affaire} ouvertParDefaut />}
            {contactPropre && (
              <Carte className="space-y-3">
                <TitreCarte icon={Users}>{g.affaire ? '📇 Contact de cette fiche' : '📇 Contact'}</TitreCarte>
                <div className="space-y-4">
                  {(ct.tel || ct.email) && <BoutonsContact tel={ct.tel} email={ct.email} moi={g.moi} />}
                  {ct.autres.map((x, i) => (
                    <div key={`${x.libelle}-${i}`} className="space-y-2">
                      <p className="text-[14px]"><strong>{x.libelle} :</strong> {x.tel || x.email}</p>
                      <BoutonsContact tel={x.tel} email={x.email} moi={g.moi} />
                    </div>
                  ))}
                  {ct.adresse && (
                    <div className="space-y-2">
                      <p className="flex items-start gap-2 text-[14px]"><MapPin size={16} className="mt-0.5 shrink-0" /> {ct.adresse}</p>
                      <BoutonsAdresse texte={ct.adresse} lat={ct.lat} lng={ct.lng} />
                    </div>
                  )}
                </div>
              </Carte>
            )}

            {/* Suivi d'une commande ou d'un dossier ADVENIR : mêmes cartes que la vente */}
            {suivi && <Suivi ficheId={element.id} onChange={charger} />}

            {/* Prochaine étape : caler, faire la visite */}
            {etapes.length > 0 && (
              <Carte className="space-y-3">
                <TitreCarte icon={CalendarPlus}>Prochaine étape</TitreCarte>
                {etapes.map((e, i) => (
                  <div key={e.libelle} className="space-y-3">
                    <p className="flex gap-3 text-[15px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ color: CYAN, boxShadow: `inset 0 0 0 1.5px ${CYAN}` }}>{i + 1}</span>{e.texte}</p>
                    <a href={e.href} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white transition-transform active:scale-95" style={{ backgroundColor: e.couleur }}>
                      {e.libelle}
                    </a>
                  </div>
                ))}
              </Carte>
            )}

            {/* Documents créés par l'appli : même ligne que le PV de la réception */}
            {documents.length > 0 && (
              <Carte className="space-y-3">
                <TitreCarte icon={FileText}>Documents</TitreCarte>
                {documents.map((d) => {
                  const aFaire = d.cible === 'rapportSav' && savOuvert;
                  return (
                    <LigneDocument
                      key={d.cible}
                      titre={d.titre}
                      fichiers={d.fichiers}
                      taskId={element.id}
                      cible={d.cible}
                      vide={aFaire ? 'à faire sur place' : 'aucun fichier'}
                      aide={aFaire && !d.fichiers.length ? 'Sur place, après le dépannage : le client signe au doigt sur le téléphone, l’appli crée le rapport. « Problème résolu » ferme le ticket.' : undefined}
                    >
                      {aFaire && faitLeRapport && (
                        <ActionDocument href={`/interne/rapport-sav/${element.id}`}>
                          <PenLine size={16} /> {d.fichiers.length ? 'Faire un nouveau rapport d’intervention' : 'Faire le rapport d’intervention'}
                        </ActionDocument>
                      )}
                    </LigneDocument>
                  );
                })}
              </Carte>
            )}

            {(element.checklists || []).map((c) => {
              const faits = c.points.filter((p) => p.fait).length;
              const pct = c.points.length ? Math.round((faits / c.points.length) * 100) : 0;
              return (
                <Carte key={c.id} accent className="space-y-3">
                  <TitreCarte icon={ListChecks} extra={<span className="text-[14px] font-bold">{faits}/{c.points.length}</span>}>{c.nom}</TitreCarte>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#eceef1]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CYAN }} />
                  </div>
                  {erreurCoche && <p className="text-[13px] font-bold text-red-600">{erreurCoche}</p>}
                  <div className="space-y-1.5">
                    {c.points.map((p) => (
                      <button
                        key={p.id}
                        disabled={!!enCours}
                        onClick={() => cocher(c.id, p.id, !p.fait)}
                        className="flex w-full items-center gap-3 rounded-[14px] bg-white p-3 text-left ring-[1.5px] ring-[#dfe3e8] transition-transform active:scale-[0.98]"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-2" style={p.fait ? { backgroundColor: CYAN, boxShadow: 'none' } : { boxShadow: 'inset 0 0 0 2px #c5ccd4' }}>
                          {enCours === p.id ? <RefreshCw size={14} className="animate-spin" color={p.fait ? '#fff' : CYAN} /> : p.fait ? <Check size={16} color="#fff" /> : null}
                        </span>
                        <span className={`text-[15px] ${p.fait ? 'text-slate-400 line-through' : 'font-semibold'}`}>{p.nom}</span>
                      </button>
                    ))}
                  </div>
                </Carte>
              );
            })}

            {/* Détails : les autres champs, puis la description */}
            {(details.length > 0 || element.description) && (
              <Carte className="space-y-1">
                <TitreCarte icon={AlignLeft}>Détails</TitreCarte>
                <div className="pt-1">
                  {details.map((c) => {
                    const long = c.texte.length > 38 || c.texte.includes('\n');
                    return (
                      <div key={c.id} className={`border-b border-[#dfe3e8] py-2 text-[14px] last:border-b-0 ${long ? '' : 'flex items-baseline justify-between gap-3'}`}>
                        <span className="text-slate-500">{sansEmoji(c.nom) || c.nom}</span>
                        <div className={long ? 'mt-0.5' : 'text-right'}>{valeur(c)}</div>
                      </div>
                    );
                  })}
                </div>
                {element.description && <p className="whitespace-pre-line pt-2 text-[14px] leading-relaxed"><TexteAvecFiches texte={element.description} noms={noms} /></p>}
              </Carte>
            )}

            {element.sousTaches.length > 0 && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={ChevronRight} extra={<span className="text-[14px] font-bold">{element.sousTaches.length}</span>}>Sous-tâches</TitreCarte>
                {element.sousTaches.map((s) => (
                  <a key={s.id} href={`/interne/element/${s.id}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold">{s.nom}</span>
                      <span className="text-[12px] font-bold uppercase" style={{ color: s.couleurStatut || '#9aa3ad' }}>{s.statut}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0" color={CYAN} />
                  </a>
                ))}
              </Carte>
            )}

            {/* Liens : fiches reliées, liens web, autres contacts, pièces jointes, tâche parente */}
            {g.liens.length > 0 && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={Link2}>Liens</TitreCarte>
                {g.liens.map((l, i) => {
                  const dehors = l.genre === 'web' || l.genre === 'fichier' || l.genre === 'carte';
                  const Icone = l.genre === 'fiche' ? ChevronRight : l.genre === 'tel' ? Phone : l.genre === 'mail' ? Mail : l.genre === 'carte' ? Navigation : l.genre === 'fichier' ? Paperclip : ExternalLink;
                  return (
                    <a key={`${l.href}-${i}`} href={l.href} target={dehors ? '_blank' : undefined} rel={dehors ? 'noopener noreferrer' : undefined} className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                      <span className="min-w-0"><span className="block truncate text-[15px] font-bold">{l.nom.replace(/^\s*test\s*·\s*/i, '')}</span><span className="text-[12px] text-slate-500">{l.sous}</span></span>
                      <Icone size={17} className="shrink-0" color={CYAN} />
                    </a>
                  );
                })}
              </Carte>
            )}

            {/* Historique replié */}
            {element.commentaires.length > 0 && (
              <div>
                <button onClick={() => setHistorique(!historique)} className="mx-auto flex items-center gap-1.5 py-2 text-[13px] font-semibold text-slate-500">
                  Historique ({element.commentaires.length} commentaire{element.commentaires.length > 1 ? 's' : ''})
                  <ChevronDown size={14} className={historique ? 'rotate-180' : ''} />
                </button>
                {historique && commentaires}
              </div>
            )}
          </>
        )}

        {element && facture && (
          <>
            {element.parent && (
              <a href={`/interne/element/${element.parent}`} className="flex items-center justify-between rounded-[20px] bg-white p-4 ring-[1.5px] ring-[#dfe3e8]">
                <span className="text-[15px] font-semibold">Tâche parente</span>
                <ChevronRight size={20} color={CYAN} />
              </a>
            )}

            {element.piecesJointes.length > 0 && (
              <Carte className="space-y-2.5">
                <TitreCarte icon={Paperclip} extra={<span className="text-[14px] font-bold">{element.piecesJointes.length}</span>}>Pièces jointes</TitreCarte>
                {element.piecesJointes.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate text-[15px] font-semibold underline">
                    <Paperclip size={14} className="shrink-0" color={CYAN} /> {p.nom}
                  </a>
                ))}
              </Carte>
            )}

            {/* Facture : commentaires et note de création repliés dans Historique */}
            {(element.commentaires.length > 0 || element.description) && (
              <div>
                <button onClick={() => setHistorique(!historique)} className="mx-auto flex items-center gap-1.5 py-2 text-[13px] font-semibold text-slate-500">
                  Historique ({element.commentaires.length} commentaire{element.commentaires.length > 1 ? 's' : ''})
                  <ChevronDown size={14} className={historique ? 'rotate-180' : ''} />
                </button>
                {historique && (
                  <div className="space-y-3">
                    {commentaires}
                    {element.description && (
                      <div className="rounded-[14px] bg-white p-3 ring-[1.5px] ring-[#dfe3e8]">
                        <p className="text-[12px] font-bold text-slate-500">Note de création</p>
                        <p className="mt-1 whitespace-pre-line text-[14px]">{element.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {element && voitClickUp && (
          <div className="pt-2 text-center">
            <a href={element.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: CYAN }}>
              <ExternalLink size={13} /> Ouvrir dans ClickUp
            </a>
          </div>
        )}
      </ContenuAppli>
    </PageAppli>
  );
}
