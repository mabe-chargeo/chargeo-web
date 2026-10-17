// Icônes des écrans de l'application équipe (clés définies dans src/lib/menusAppli.ts).
import type { ElementType } from 'react';
import {
  BookOpen, Briefcase, Calculator, CalendarDays, CalendarRange, Camera, ClipboardCheck, ClipboardList, FolderOpen, Gauge,
  HardHat, Landmark, ListChecks, Map as IconeCarte, Package, Receipt, ShoppingCart, Sun, Target, TrafficCone, UserPlus, Users,
  Wrench, Zap,
} from 'lucide-react';
import type { CleIcone } from '@/lib/menusAppli';

export const ICONES: Record<CleIcone, ElementType> = {
  journee: Sun,
  pipeline: FolderOpen,
  agenda: CalendarDays,
  contacts: Users,
  lead: UserPlus,
  ressources: BookOpen,
  planning: CalendarRange,
  releves: ClipboardList,
  chantiers: HardHat,
  materiel: Package,
  feuVert: TrafficCone,
  reception: Camera,
  validation: ClipboardCheck,
  sav: Wrench,
  interventions: ListChecks,
  carte: IconeCarte,
  maintenance: Gauge,
  facturation: Receipt,
  achats: ShoppingCart,
  parc: Zap,
  advenir: Landmark,
  decomptes: Calculator,
  rh: Briefcase,
  pilotage: Target,
};
