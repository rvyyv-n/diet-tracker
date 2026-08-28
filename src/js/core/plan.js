/**
 * plan.js — the weight-gain plan as data.
 *
 * Everything here is static reference content transcribed from docs/plan-spec.md:
 * the meal blocks, the three phases, the meal rotations, shake recipes, the food
 * table and the weekly grocery list. No storage, no DOM, no per-user state — that
 * lives in day.js and profile.js. Keeping this file a pure description of the
 * plan means a changed plan is a changed file, nothing more.
 */

/**
 * Meal blocks. `core` blocks run every day; add-ons switch on by phase.
 * A block with a `rotation` draws its calories from the selected rotation option
 * (see day.js), not from the nominal figure here.
 *
 * `order` is time of day, spaced by tens so a block can be slotted between two
 * others without renumbering. The daily checklist renders in this order, not in
 * ID order — at Phase 2 the snack and pre-bed sit around dinner, not after it.
 */
export const BLOCKS = [
  {
    id: "B1", order: 10, name: "Breakfast", kcal: 705, proteinG: 35, core: true, rotation: "breakfast",
    desc: "Eggs (3) + flatbreads (2) + milk (250 ml) + butter (1 tsp)",
  },
  {
    id: "B2", order: 20, name: "Shake", kcal: 580, proteinG: 22, core: true, rotation: "shake",
    desc: "Milk (300 ml) + peanut butter (2 tbsp) + banana + oats (25 g)",
    note: "Highest skip risk — keep it prominent in the UI.",
  },
  {
    id: "B3", order: 30, name: "Lunch", kcal: 580, proteinG: 33, core: true, rotation: "lunch",
    desc: "Choose from the lunch rotation.",
  },
  {
    id: "A1", order: 40, name: "Snack", kcal: 290, proteinG: 11, core: false,
    desc: "Yogurt (200 g) + dates (3) + almonds (15 g)",
  },
  {
    // A3 keeps a fixed value for now: it shares the shake recipes but is a
    // separate serving from B2, so it does not follow the B2 rotation choice.
    id: "A3", order: 50, name: "2nd shake", kcal: 580, proteinG: 22, core: false,
    desc: "Heavy shake — optional, or post-training.",
  },
  {
    id: "B4", order: 60, name: "Dinner", kcal: 700, proteinG: 37, core: true, rotation: "dinner",
    desc: "Choose from the dinner rotation.",
  },
  {
    id: "A2", order: 70, name: "Pre-bed", kcal: 255, proteinG: 12, core: false,
    desc: "Milk (250 ml) + peanut butter (1 tbsp)",
  },
];

/**
 * Phases. Phase 1 is a deliberate two-week ramp; jumping straight to the full
 * target is the documented cause of a week-one collapse. Phase 3 is
 * condition-driven (a stall, or training starting) and is never entered
 * automatically.
 */
export const PHASES = [
  {
    id: 1, name: "Ramp-up", label: "Phase 1 — ramp-up", when: "Weeks 1–2",
    blocks: ["B1", "B2", "B3", "B4"], kcal: 2565, proteinG: 127,
  },
  {
    id: 2, name: "Working target", label: "Phase 2 — working target", when: "Week 3 onward",
    blocks: ["B1", "B2", "B3", "B4", "A1", "A2"], kcal: 3110, proteinG: 150,
  },
  {
    id: 3, name: "Pushed", label: "Phase 3 — pushed", when: "Stalled 2 weeks, or training begins",
    blocks: ["B1", "B2", "B3", "B4", "A1", "A2", "A3"], kcal: 3690, proteinG: 172,
  },
];

/**
 * Meal rotations, keyed by slot. Options carry their own calorie figure — L2 at
 * 630 and L3 at 565 do not share a total — so the day's total must sum the
 * selected option, never the parent block. Rotation IDs are BR/L/D on purpose,
 * to avoid colliding with the A1–A3 / B1–B4 block IDs.
 */
export const ROTATIONS = {
  breakfast: [
    { id: "BR1", desc: "Eggs (3) + flatbreads (2) + milk (250 ml) + butter (1 tsp)", kcal: 705, proteinG: 34 },
    { id: "BR2", desc: "Eggs (3) + flaky flatbread + milk (250 ml) + butter (1 tsp)", kcal: 705, proteinG: 32 },
    { id: "BR3", desc: "Eggs (2) + bread (2 slices) + peanut butter (2 tbsp) + milk (250 ml) + butter (1 tsp)", kcal: 700, proteinG: 33 },
  ],
  lunch: [
    { id: "L1", desc: "Chicken curry (150 g) + rice (1 cup)", kcal: 580, proteinG: 33 },
    { id: "L2", desc: "Minced beef (150 g) + flatbreads (2) + salad", kcal: 630, proteinG: 33 },
    { id: "L3", desc: "Chickpeas (1 cup) + flatbread + yogurt (100 g)", kcal: 565, proteinG: 24 },
  ],
  dinner: [
    { id: "D1", desc: "Egg curry (2 eggs) + lentil stew + flatbreads (2)", kcal: 700, proteinG: 37 },
    { id: "D2", desc: "Chicken or beef (100 g) + lentil stew + flatbreads (2)", kcal: 700, proteinG: 37 },
    { id: "D3", desc: "Chicken pilaf (1.5 cups) + yogurt (150 g)", kcal: 720, proteinG: 35 },
  ],
  shake: [
    { id: "standard", desc: "Milk (300 ml) + peanut butter (2 tbsp) + banana + oats (25 g)", kcal: 580, proteinG: 22 },
    { id: "no_blender", desc: "Milk (300 ml) + peanut butter (2 tbsp) + banana + honey (1 tbsp)", kcal: 545, proteinG: 20 },
    { id: "heavy", desc: "Milk (400 ml) + peanut butter (2 tbsp) + banana + oats (40 g) + dates (3)", kcal: 790, proteinG: 27 },
  ],
};

/** Shake recipes, exposed under their own name; they are the B2 rotation. */
export const SHAKES = ROTATIONS.shake;

/**
 * Food table for off-plan single entries (name, portion, kcal, protein). Names
 * are plain English so the data reads to any audience.
 */
export const FOOD_DB = [
  { id: "full_fat_milk", name: "Full-fat milk", portion: "250 ml", kcal: 160, proteinG: 8 },
  { id: "egg_large", name: "Large egg", portion: "1", kcal: 75, proteinG: 6 },
  { id: "egg_fried_1tsp_oil", name: "Fried egg (1 tsp oil)", portion: "1", kcal: 115, proteinG: 6 },
  { id: "peanut_butter", name: "Peanut butter", portion: "1 tbsp", kcal: 95, proteinG: 4 },
  { id: "flatbread", name: "Flatbread", portion: "1 medium", kcal: 140, proteinG: 4 },
  { id: "flaky_flatbread", name: "Flaky flatbread", portion: "1", kcal: 280, proteinG: 6 },
  { id: "rice_cooked", name: "Cooked rice", portion: "1 cup", kcal: 250, proteinG: 5 },
  { id: "lentil_stew", name: "Lentil stew", portion: "1 cup", kcal: 220, proteinG: 14 },
  { id: "chicken_curry", name: "Chicken curry", portion: "150 g chicken", kcal: 330, proteinG: 28 },
  { id: "minced_beef", name: "Minced beef", portion: "150 g", kcal: 350, proteinG: 25 },
  { id: "chickpeas_cooked", name: "Cooked chickpeas", portion: "1 cup", kcal: 270, proteinG: 15 },
  { id: "yogurt_full_fat", name: "Full-fat yogurt", portion: "200 g", kcal: 130, proteinG: 8 },
  { id: "banana", name: "Banana", portion: "1 medium", kcal: 105, proteinG: 1 },
  { id: "dates", name: "Dates", portion: "3", kcal: 70, proteinG: 0.5 },
  { id: "almonds", name: "Almonds", portion: "15 g", kcal: 90, proteinG: 3 },
  { id: "oats_dry", name: "Dry oats", portion: "25 g", kcal: 95, proteinG: 3 },
  { id: "honey", name: "Honey", portion: "1 tbsp", kcal: 64, proteinG: 0 },
  { id: "clarified_butter_or_oil", name: "Clarified butter or oil", portion: "1 tsp", kcal: 40, proteinG: 0 },
  { id: "bread", name: "Bread", portion: "2 slices", kcal: 160, proteinG: 5 },
  { id: "potato_boiled", name: "Boiled potato", portion: "150 g", kcal: 130, proteinG: 3 },
];

/** Weekly grocery list at Phase 2 volume. Resettable weekly in the UI. */
export const GROCERY_LIST = [
  { section: "Dairy & eggs", items: ["7–8 L full-fat milk", "2 dozen eggs", "1.5 kg yogurt", "250 g clarified butter"] },
  { section: "Pantry", items: ["1 kg peanut butter", "500 g oats", "2 kg rice", "wholemeal flour", "1 L oil", "honey"] },
  { section: "Protein", items: ["1.5 kg chicken", "500 g minced beef", "1 kg dried lentils", "1 kg dried chickpeas"] },
  { section: "Produce", items: ["2 dozen bananas", "500 g dates", "250 g almonds", "potatoes, onions, tomatoes"] },
];

/**
 * Adjustment rules, evaluated on a 4-week rolling average of weekly weight.
 * They are SUGGESTED to the user, never auto-applied, and the suggestion must
 * explain its reasoning. The engine that runs these lands in a later pass; this
 * is the rule table it will read.
 */
export const ADJUSTMENT_RULES = [
  {
    id: "under",
    test: "Average gain < 0.20 kg/week for 2 consecutive weeks",
    action: "Enable the next add-on block, in order A1 → A2 → A3.",
  },
  {
    id: "on-target",
    test: "Average gain 0.25–0.50 kg/week",
    action: "No change — this is the target.",
  },
  {
    id: "too-fast",
    test: "Average gain > 0.70 kg/week for 2 weeks",
    action: "Disable one add-on block.",
  },
  {
    id: "stalled",
    test: "Flat for 4 weeks at ≥ 90% adherence",
    action: "Surface a prompt suggesting a basic checkup.",
  },
];

/** The sustainable target band, in kg per week. Faster is mostly fat. */
export const TARGET_RATE_KG_PER_WEEK = { min: 0.25, max: 0.4 };

// --- selectors ---------------------------------------------------------------

export function blockById(id) {
  return BLOCKS.find((b) => b.id === id) ?? null;
}

export function phaseById(id) {
  return PHASES.find((p) => p.id === id) ?? null;
}

/** The blocks active in a phase, in time-of-day order (see BLOCKS `order`). */
export function activeBlocks(phaseId) {
  const phase = phaseById(phaseId);
  if (!phase) return [];
  return phase.blocks
    .map(blockById)
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

/** The kcal / protein a phase is aiming for. */
export function phaseTarget(phaseId) {
  const phase = phaseById(phaseId);
  return phase
    ? { kcal: phase.kcal, proteinG: phase.proteinG }
    : { kcal: 0, proteinG: 0 };
}

/** Rotation options for a slot: "breakfast" | "lunch" | "dinner" | "shake". */
export function rotationOptions(slot) {
  return ROTATIONS[slot] ?? [];
}

export function rotationOptionById(slot, optionId) {
  return rotationOptions(slot).find((o) => o.id === optionId) ?? null;
}

/**
 * The default phase for a plan week (1-indexed): weeks 1–2 are the ramp, week 3
 * onward is the working target. Phase 3 is condition-driven and never returned
 * here.
 */
export function defaultPhaseForWeek(weekNumber) {
  return weekNumber <= 2 ? 1 : 2;
}

/** The first rotation option for each slot — the starting picks for a new day. */
export function defaultRotations() {
  return { breakfast: "BR1", lunch: "L1", dinner: "D1", shake: "standard" };
}
