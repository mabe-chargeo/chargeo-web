import { notFound } from 'next/navigation';
import { MetreForm } from '@/components/ui/MetreForm';
import { Scenarios } from '@/components/ui/Scenarios';
import { ElementsScenario, ScenariosArchives } from '@/components/ui/Elements';
import { BlocContact } from '@/components/ui/BlocContact';
import { InfraLiee } from '@/components/ui/InfraLiee';
import { PageAppli, EnTeteAppli, ContenuAppli, Repere, Alerte } from '@/components/charte/Appli';
import { lireTacheQualification } from '@/lib/listesClickUp';
import { trierScenarios, typeDesSousReleves, typeSousReleve, type ScenarioResume } from '@/lib/scenarios';
import { lireSiteRecu } from '@/lib/releveSite';

// Page de relevé (lots 3.2, 3.3 et point 21). La fiche doit appartenir à la liste autorisée
// (vraie Qualification en production, TEST en preview), sinon page introuvable.
// Cinq cas :
// - fiche sans sous-relevé : création d'un scénario proposée (plus d'ancien formulaire depuis le 16/10) ;
// - fiche avec scénarios : écran Scénarios, triés A, B, C ;
// - scénario : éléments du scénario seulement (plus d'ancien formulaire depuis le 18/10) ;
// - fiche avec emplacements (point 21, ancien modèle) : liste des emplacements + relevé commun du site ;
// - emplacement (ancien modèle) : relevé réduit à la borne.
// Étape 3 (15/10/2026, PR #51) : éléments du scénario, scénarios archivés à restaurer.
// Étape 4 (15/10/2026, PR #51) : bloc 📇 Contact en tête de chaque page (src/components/ui/BlocContact.tsx) ; bandeau
// « ancien modèle » sur les fiches à emplacements (chaque emplacement deviendra une branche).
// Seules les sous-tâches directes de la fiche sont des sous-relevés (les éléments sont des sous-tâches des scénarios).
// Étape 8 (16/10/2026, PR #51) : carte « Infra CHARGéO à cette adresse » sous le Contact de la fiche
// (src/components/ui/InfraLiee.tsx) : rattacher un résident en RIC et recopier le Tarif type de l'infra.
// 16/10, 15 h 44 (Matthieu) : sur une fiche sans scénario, l'ancien formulaire de relevé est retiré. Le relevé se fait
// dans le scénario, élément par élément. Les valeurs déjà saisies restent dans les champs ClickUp de la fiche.
// 17/10, 20 h 33 (Matthieu : « ce serait bien qu'il y ait la barre d'onglets là ») : la fiche sans scénario et la liste
// des scénarios affichent la barre du bas (repère data-barre-appli lu par NavAppli). Le scénario, l'emplacement et la
// fiche à emplacements (relevé commun du site) gardent leurs propres boutons en bas, sans la barre.
// 18/10, 11 h 38 (Matthieu : « il y a toujours l'ancien relevé dans la fiche de relevé, il faut le virer ») : l'ancien
// relevé n'apparaît plus sur un scénario, même sans éléments. Le relevé se fait élément par élément et le scénario
// passe en « devis à faire » par « Prêt à chiffrer » (src/components/ui/Elements.tsx). Il ne reste que sur les fiches
// à emplacements de l'ancien modèle, jusqu'à leur conversion.
const SEGMENT_OPTIONS: Record<number, string> = { 0: 'RES', 1: 'DAP', 2: 'COP', 3: 'PAR', 4: 'FLT', 5: 'TER', 6: 'RIC' };
const SEGMENT_ID = 'dbdacf18-1d26-4c58-9bbb-b4a9e443daa2';
const BANDEAU_ANCIEN = 'Ancien modèle (emplacements) : cette fiche sera convertie en scénario avec éléments. Chaque emplacement deviendra une branche du scénario.';

// Demande la barre d'onglets en bas de la page (src/components/charte/NavAppli.tsx)
const BarreAppli = () => <span data-barre-appli="oui" hidden />;

function segmentDe(tache: any): string {
  const champ = tache?.custom_fields?.find((f: any) => f.id === SEGMENT_ID);
  if (!champ || champ.value === undefined || champ.value === null) return '';
  const idx = typeof champ.value === 'number' ? champ.value : parseInt(champ.value);
  return SEGMENT_OPTIONS[idx] || '';
}

async function lireFiche(taskId: string) {
  const token = process.env.CLICKUP_API_KEY;
  if (!token) return null;
  try {
    const lecture = await lireTacheQualification(taskId, token, { sousTaches: true });
    if (!lecture.ok) return null;
    const data = lecture.tache;

    const sousReleves: ScenarioResume[] = trierScenarios((Array.isArray(data.subtasks) ? data.subtasks : [])
      .filter((s: any) => !s?.parent || String(s.parent) === String(taskId))
      .map((s: any) => ({
        id: String(s.id),
        nom: String(s.name || ''),
        statut: String(s.status?.status || ''),
      })));
    const type = typeDesSousReleves(sousReleves);
    const siteRecu = type === 'emplacement' ? await lireSiteRecu(taskId, token) : false;

    let parent: { id: string; nom: string; segment: string } | null = null;
    if (data.parent) {
      const lp = await lireTacheQualification(String(data.parent), token);
      parent = {
        id: String(data.parent),
        nom: lp.ok ? String(lp.tache?.name || 'Fiche') : 'Fiche',
        segment: lp.ok ? segmentDe(lp.tache) : '',
      };
    }

    return {
      name: data.name as string,
      statut: String(data.status?.status || ''),
      segment: segmentDe(data),
      sousReleves,
      type,
      siteRecu,
      parent,
    };
  } catch (error) {
    return null;
  }
}

export default async function MetrePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const taskId = resolvedParams.id;
  const fiche = await lireFiche(taskId);

  if (!fiche) {
    notFound();
  }

  // Sous-relevé : emplacement (ancien modèle, relevé réduit) ou scénario (éléments)
  if (fiche.parent) {
    const estEmplacement = typeSousReleve(fiche.name) === 'emplacement';
    const retourListe = {
      href: `/interne/metre/${fiche.parent.id}`,
      libelle: estEmplacement ? 'Retour aux emplacements' : 'Retour aux scénarios',
    };
    return (
      <PageAppli>
        <EnTeteAppli
          surtitre={`${estEmplacement ? 'Emplacement' : 'Scénario'} · ${fiche.parent.nom}`}
          titre={fiche.name}
          retour={{ href: retourListe.href, libelle: estEmplacement ? 'Emplacements' : 'Scénarios' }}
        />
        <ContenuAppli className="space-y-5">
          <BlocContact affaireId={fiche.parent.id} />
          {estEmplacement ? (
            <>
              <Alerte>{BANDEAU_ANCIEN}</Alerte>
              <MetreForm
                taskId={taskId}
                taskName={fiche.name}
                initialSegment={fiche.segment || fiche.parent.segment}
                retour={retourListe}
                mode="emplacement"
              />
            </>
          ) : (
            <ElementsScenario scenarioId={taskId} segmentInitial={fiche.segment || fiche.parent.segment} />
          )}
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche avec emplacements (ancien modèle) : liste des bornes + relevé commun du site
  if (fiche.type === 'emplacement') {
    return (
      <PageAppli>
        <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
        <ContenuAppli className="space-y-5">
          <BlocContact affaireId={taskId} />
          <Alerte>{BANDEAU_ANCIEN}</Alerte>
          <Scenarios affaireId={taskId} scenarios={fiche.sousReleves} mode="liste" type="emplacement" siteRecu={fiche.siteRecu} statutFiche={fiche.statut} />
          <div className="h-1" />
          <Repere>Relevé commun du site</Repere>
          <p className="px-1 text-[14px] leading-relaxed">
            {fiche.siteRecu
              ? 'Déjà reçu. Tu peux le renvoyer pour corriger une valeur.'
              : 'Tableau, puissance, terre, réseau et zone : une seule fois pour tout le site.'}
          </p>
          <MetreForm taskId={taskId} taskName={fiche.name} initialSegment={fiche.segment} mode="site" />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche avec scénarios : écran Scénarios, puis scénarios archivés à restaurer
  if (fiche.type === 'scenario') {
    return (
      <PageAppli>
        <BarreAppli />
        <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
        <ContenuAppli className="space-y-5">
          <BlocContact affaireId={taskId} />
          <InfraLiee affaireId={taskId} />
          <Scenarios affaireId={taskId} scenarios={fiche.sousReleves} mode="liste" type="scenario" statutFiche={fiche.statut} />
          <ScenariosArchives affaireId={taskId} />
        </ContenuAppli>
      </PageAppli>
    );
  }

  // Fiche sans sous-relevé : création d'un scénario proposée (le relevé se fait ensuite dans le scénario)
  return (
    <PageAppli>
      <BarreAppli />
      <EnTeteAppli surtitre="Visite technique" titre={fiche.name} retour={{ href: '/interne', libelle: 'Planning' }} />
      <ContenuAppli className="space-y-5">
        <BlocContact affaireId={taskId} />
        <InfraLiee affaireId={taskId} />
        <Scenarios affaireId={taskId} scenarios={[]} mode="proposition" statutFiche={fiche.statut} />
        <ScenariosArchives affaireId={taskId} />
      </ContenuAppli>
    </PageAppli>
  );
}
