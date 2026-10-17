"use client";

// Liens vers ClickUp masqués sur tous les écrans, sauf pour le back-office et la direction (17/10/2026, 18 h 34,
// Matthieu : « je ne veux plus qu'il y ait de lien vers ClickUp, ClickUp est inutilisable sur téléphone, à part pour le
// back-office, parce qu'ils auront un ordinateur, et la direction »). Suit le rôle choisi dans la pastille de l'en-tête :
// en vue Commercial, Chef de chantier ou Installateur, la direction voit l'écran sans lien ClickUp, comme eux.
// Une seule règle pour toute l'application : tout lien qui ouvre app.clickup.com est caché (y compris les lignes
// « Ouvrir dans ClickUp » des cartes). Les écrans qui menaient à une tâche ClickUp ouvrent la fiche de l'application.
import { useRoleAppli } from '@/components/charte/roleAppli';

const AVEC_CLICKUP = ['backOffice', 'direction'];

export default function MasqueClickUp() {
  const { role } = useRoleAppli();
  if (role && AVEC_CLICKUP.indexOf(role) >= 0) return null;
  return <style>{'a[href^="https://app.clickup.com"]{display:none !important}'}</style>;
}
