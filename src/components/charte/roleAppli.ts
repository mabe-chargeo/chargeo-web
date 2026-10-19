"use client";

// Rôle affiché dans l'application équipe (barre du bas par rôle, validée par Matthieu le 17/10/2026).
// Les rôles viennent de /api/interne/moi et sont gardés sur le téléphone pour fonctionner hors ligne.
// La direction peut afficher l'appli de n'importe quel rôle (choix gardé sur le téléphone). L'affichage ne donne aucun
// droit : chaque route contrôle les rôles elle-même.
// 17/10, 20 h 26 : le nom de la personne connectée est gardé aussi (menu de la pastille du rôle, « Connecté : … »).
import { useCallback, useEffect, useState } from 'react';
import { ORDRE_ROLES, type RoleAppli } from '@/lib/menusAppli';

const CLE_ROLES = 'chargeo_roles';
const CLE_ROLE_AFFICHE = 'chargeo_role_affiche';
const CLE_NOM = 'chargeo_nom';
const EVENEMENT = 'chargeo-role-change';

function estRole(x: unknown): x is RoleAppli {
  return typeof x === 'string' && (ORDRE_ROLES as string[]).includes(x);
}

function lireRoles(): RoleAppli[] | null {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_ROLES) || 'null');
    if (Array.isArray(brut)) {
      const roles = brut.filter(estRole);
      return roles.length ? roles : null;
    }
  } catch {}
  return null;
}

function lireChoix(): RoleAppli | null {
  try {
    const v = localStorage.getItem(CLE_ROLE_AFFICHE);
    return estRole(v) ? v : null;
  } catch {}
  return null;
}

function lireNom(): string {
  try { return localStorage.getItem(CLE_NOM) || ''; } catch {}
  return '';
}

export function rolesPossibles(roles: RoleAppli[] | null): RoleAppli[] {
  if (!roles || !roles.length) return [];
  if (roles.includes('direction')) return [...ORDRE_ROLES];
  return ORDRE_ROLES.filter((r) => roles.includes(r));
}

export function useRoleAppli() {
  const [roles, setRoles] = useState<RoleAppli[] | null>(null);
  const [choix, setChoix] = useState<RoleAppli | null>(null);
  const [nom, setNom] = useState('');

  useEffect(() => {
    setRoles(lireRoles());
    setChoix(lireChoix());
    setNom(lireNom());
    const surChangement = () => setChoix(lireChoix());
    window.addEventListener(EVENEMENT, surChangement);
    fetch('/api/interne/moi', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (Array.isArray(j?.roles)) {
          const lus = (j.roles as unknown[]).filter(estRole);
          if (lus.length) {
            setRoles(lus);
            try { localStorage.setItem(CLE_ROLES, JSON.stringify(lus)); } catch {}
          }
        }
        if (typeof j?.nom === 'string' && j.nom.trim()) {
          setNom(j.nom.trim());
          try { localStorage.setItem(CLE_NOM, j.nom.trim()); } catch {}
        }
      })
      .catch(() => {});
    return () => window.removeEventListener(EVENEMENT, surChangement);
  }, []);

  const possibles = rolesPossibles(roles);
  const role: RoleAppli | null = choix && possibles.includes(choix) ? choix : possibles[0] ?? null;

  const choisir = useCallback((r: RoleAppli) => {
    try { localStorage.setItem(CLE_ROLE_AFFICHE, r); } catch {}
    setChoix(r);
    window.dispatchEvent(new Event(EVENEMENT));
  }, []);

  return { roles, possibles, role, choisir, nom };
}
