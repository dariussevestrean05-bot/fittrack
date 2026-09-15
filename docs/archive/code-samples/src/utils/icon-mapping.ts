// FitTrack Phase 5 – Icon-Mapping (Lucide statt Emoji)
// Ersetzt: exerciseEmoji() (fitX.js Z.52-55), EXERCISES/PLAN_TEMPLATES/SKILL_TREE/FOOD_DB emoji-Felder.
// Regel: 0 Emoji im UI. Fallback immer Dumbbell (Foods: Apple). Nur var()-Farben, kein Hex.
//
// Verwendung:
//   import { exerciseIcon } from "../utils/icon-mapping";
//   const Icon = exerciseIcon(workout.name);
//   <Icon size={16} aria-hidden="true" />
// Statt bisher: <span>{exerciseEmoji(w.name)}</span> / <span>{s.emoji}</span> / <span>{f.emoji}</span>

import {
  Activity,
  Anchor,
  Apple,
  ArrowDown,
  ArrowUp,
  Beef,
  Bike,
  Candy,
  Carrot,
  CircleDot,
  Coffee,
  Cookie,
  CupSoda,
  Dumbbell,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  Flame,
  Footprints,
  HeartPulse,
  Medal,
  Milk,
  Mountain,
  Move,
  PersonStanding,
  Salad,
  Sandwich,
  Soup,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Wheat,
  Zap,
  type LucideIcon,
} from "lucide-react";

function norm(s: string): string {
  return (s || "").trim().toLowerCase();
}

// ---------- 1) EXERCISES (fitX.js Z.41-51, 18 Eintraege) ----------

export const EXERCISE_ICON: Record<string, LucideIcon> = {
  "bankdrücken": Dumbbell,
  "schrägbankdrücken": Dumbbell,
  kniebeugen: Footprints,
  beinpresse: ArrowDown,
  ausfallschritte: Footprints,
  kreuzheben: Anchor,
  klimmzüge: ArrowUp,
  latzug: ArrowDown,
  rudern: Move,
  schulterdrücken: ArrowUp,
  seitheben: Move,
  bizepscurls: Dumbbell,
  trizepsdrücken: Dumbbell,
  plank: Timer,
  bauchpresse: Activity,
  laufband: Activity,
  rudergerät: Move,
  radfahren: Bike,
};

/** Ersatz fuer exerciseEmoji(name). Gibt immer eine Lucide-Komponente zurueck. */
export function exerciseIcon(name: string): LucideIcon {
  return EXERCISE_ICON[norm(name)] ?? Dumbbell;
}

// ---------- 2) PLAN_TEMPLATES (fitX.js Z.57-62, 4 Eintraege) ----------

export const PLAN_TEMPLATE_ICON: Record<string, LucideIcon> = {
  "push day": Dumbbell,
  "pull day": Anchor,
  "leg day": Footprints,
  "ganzkörper": Flame,
};

export function planTemplateIcon(name: string): LucideIcon {
  return PLAN_TEMPLATE_ICON[norm(name)] ?? Dumbbell;
}

// ---------- 3) SKILL_TREE (fitX.js Z.65-106: 4 Branches x 5 Skills) ----------

export const SKILL_BRANCH_ICON: Record<string, LucideIcon> = {
  zug: ArrowUp,
  druck: Flame,
  core: HeartPulse,
  beine: Footprints,
};

export const SKILL_ICON: Record<string, LucideIcon> = {
  // Zug
  "dead-hang": Anchor,
  "scapula-pulls": ArrowDown,
  "negative-pullups": TrendingUp,
  pullups: ArrowUp,
  "muscle-up": Zap,
  // Druck
  "wand-liegestuetz": Mountain,
  "knie-liegestuetz": ArrowDown,
  liegestuetz: Flame,
  dips: ArrowDown,
  hspu: PersonStanding,
  // Core
  plank: Timer,
  "hollow-hold": Activity,
  "side-plank": Move,
  "knee-raises": ArrowUp,
  "l-sit": Trophy,
  // Beine / Skills
  kniebeuge: Footprints,
  wandsitzen: Timer,
  ausfallschritte: Footprints,
  "pistol-assist": Target,
  "pistol-handstand": PersonStanding,
};

export function skillIcon(skillId: string): LucideIcon {
  return SKILL_ICON[norm(skillId)] ?? Dumbbell;
}

export function skillBranchIcon(branchId: string): LucideIcon {
  return SKILL_BRANCH_ICON[norm(branchId)] ?? Dumbbell;
}

// ---------- 4) FOOD_DB (fitX.js Z.779-805, 26 Eintraege) ----------

export const FOOD_ICON: Record<string, LucideIcon> = {
  haferflocken: Wheat,
  vollkornbrot: Sandwich,
  "hähnchenbrust": Drumstick,
  lachs: Fish,
  "thunfisch (dose)": Fish,
  "rindersteak (mager)": Beef,
  eier: Egg,
  magerquark: CupSoda,
  "griechischer joghurt": CupSoda,
  "milch 1,5%": Milk,
  gouda: Sandwich,
  "reis (gekocht)": Soup,
  "nudeln (gekocht)": Soup,
  "kartoffeln (gekocht)": Carrot,
  brokkoli: Salad,
  tofu: Sandwich,
  "linsen (gekocht)": Soup,
  banane: Apple,
  apfel: Apple,
  mandeln: Cookie,
  erdnussbutter: Cookie,
  "olivenöl": Droplet,
  butter: Cookie,
  honig: Candy,
  "whey-protein (pulver)": Zap,
  hafermilch: Coffee,
};

export function foodIcon(name: string): LucideIcon {
  return FOOD_ICON[norm(name)] ?? Apple;
}

// ---------- 5) Tier-/Status-Icons (Skill-Timeline, Proposal-Badges) ----------

export const SKILL_TIER_ICON: Record<string, LucideIcon> = {
  basic: Star,
  intermediate: Medal,
  advanced: Trophy,
  elite: Zap,
};

export function skillTierIcon(tier: string): LucideIcon {
  return SKILL_TIER_ICON[norm(tier)] ?? CircleDot;
}

// ---------- 6) Generischer Fallback-Resolver ----------

/** Nimmt einen beliebigen Anzeigenamen (Workout, Plan, Skill, Food) und liefert ein Icon. */
export function anyIcon(name: string): LucideIcon {
  const key = norm(name);
  return EXERCISE_ICON[key] ?? PLAN_TEMPLATE_ICON[key] ?? SKILL_ICON[key] ?? FOOD_ICON[key] ?? Dumbbell;
}
