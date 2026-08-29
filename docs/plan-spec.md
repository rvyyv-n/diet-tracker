# Plan Spec — reference data

Read this when you need the actual numbers. Not needed at session start.

---

## Blocks

```yaml
blocks:
  - {id: B1, name: Breakfast,   kcal: 705, protein_g: 35, core: true,
     desc: "Eggs (3) + flatbreads (2) + milk (250 ml) + butter (1 tsp)", rotation: breakfast}
  - {id: B2, name: Shake,       kcal: 580, protein_g: 22, core: true,
     desc: "Milk (300 ml) + peanut butter (2 tbsp) + banana + oats (25 g)",
     note: "HIGHEST SKIP RISK — surface prominently in the UI"}
  - {id: B3, name: Lunch,       kcal: 580, protein_g: 33, core: true, rotation: lunch}
  - {id: B4, name: Dinner,      kcal: 700, protein_g: 37, core: true, rotation: dinner}
  - {id: A1, name: Snack,       kcal: 290, protein_g: 11, core: false, rotation: snack}
  - {id: A2, name: "Pre-bed",   kcal: 255, protein_g: 12, core: false,
     desc: "Milk (250 ml) + peanut butter (1 tbsp)"}
  - {id: A3, name: "2nd shake", kcal: 580, protein_g: 22, core: false,
     desc: "heavy shake — optional, or post-training"}
```

## Phases

```yaml
phases:
  phase_1: {when: "weeks 1-2 (ramp-up)", blocks: [B1,B2,B3,B4],
            kcal: 2565, protein_g: 127}
  phase_2: {when: "week 3 onward — the working target",
            blocks: [B1,B2,B3,B4,A1,A2], kcal: 3110, protein_g: 150}
  phase_3: {when: "stalled 2 weeks, or training begins",
            blocks: [B1,B2,B3,B4,A1,A2,A3], kcal: 3690, protein_g: 172}
```

The ramp-up is deliberate. Jumping straight to the full target is the most common
reason a bulk collapses in week one, from sheer fullness.

## Rotations

```yaml
breakfast_rotation:
  - {id: BR1, desc: "Eggs (3) + flatbreads (2) + milk (250 ml) + butter (1 tsp)", kcal: 705, protein_g: 34}
  - {id: BR2, desc: "Eggs (3) + flaky flatbread + milk (250 ml) + butter (1 tsp)", kcal: 705, protein_g: 32}
  - {id: BR3, desc: "Eggs (2) + bread (2 slices) + peanut butter (2 tbsp) + milk (250 ml) + butter (1 tsp)",
     kcal: 700, protein_g: 33}

lunch_rotation:
  - {id: L1, desc: "Chicken curry (150 g) + rice (1 cup)",            kcal: 580, protein_g: 33}
  - {id: L2, desc: "Minced beef (150 g) + flatbreads (2) + salad",    kcal: 630, protein_g: 33}
  - {id: L3, desc: "Chickpeas (1 cup) + flatbread + yogurt (100 g)",  kcal: 565, protein_g: 24}

dinner_rotation:
  - {id: D1, desc: "Egg curry (2 eggs) + lentil stew + flatbreads (2)",     kcal: 700, protein_g: 37}
  - {id: D2, desc: "Chicken or beef (100 g) + lentil stew + flatbreads (2)", kcal: 700, protein_g: 37}
  - {id: D3, desc: "Chicken pilaf (1.5 cups) + yogurt (150 g)",             kcal: 720, protein_g: 35}

snack_rotation:
  - {id: SN1, desc: "Yogurt (200 g) + dates (3) + almonds (15 g)",     kcal: 290, protein_g: 11}
  - {id: SN2, desc: "Banana + peanut butter (2 tbsp)",                 kcal: 295, protein_g: 9}
  - {id: SN3, desc: "Yogurt (200 g) + oats (25 g) + honey (1 tbsp)",   kcal: 290, protein_g: 11}
  - {id: SN4, desc: "Boiled eggs (2) + flatbread (1)",                 kcal: 290, protein_g: 16}
  - {id: SN5, desc: "Milk (250 ml) + oats (40 g) + honey (1 tbsp)",    kcal: 315, protein_g: 12}
```

IDs are L/D rather than A/B **on purpose** — an earlier version collided with the
block IDs and caused confusion. Don't renumber.

## Shakes

```yaml
shakes:
  standard:   {milk_ml: 300, pb_tbsp: 2, banana: 1, oats_g: 25,           kcal: 580, protein_g: 22}
  no_blender: {milk_ml: 300, pb_tbsp: 2, banana: 1, honey_tbsp: 1,        kcal: 545, protein_g: 20}
  heavy:      {milk_ml: 400, pb_tbsp: 2, banana: 1, oats_g: 40, dates: 3, kcal: 790, protein_g: 27}
```

---

## Adjustment engine — the core logic

This is the part that justifies software over paper. Get it right.

```yaml
weigh_in:
  frequency: weekly
  conditions: "same day, morning, after bathroom, before food or water"
  log: weight_kg only
  principle: "ignore day-to-day movement — water and digestion swing it ±1 kg
              with no relationship to real gain"

adjustment_rules:   # evaluated on a 4-week rolling average
  - if: "avg gain < 0.20 kg/wk for 2 consecutive weeks"
    then: "enable next add-on block, in order A1 -> A2 -> A3"
  - if: "avg gain 0.25-0.50 kg/wk"
    then: "no change — this is the target"
  - if: "avg gain > 0.70 kg/wk for 2 weeks"
    then: "disable one add-on block"
  - if: "flat 4 weeks at >=90% adherence"
    then: "surface a prompt suggesting a basic checkup"
```

**Never auto-apply an adjustment.** Suggest it; the user confirms. The system
should explain *why* it's suggesting something, not just assert it.

---

## Food database

```yaml
# name, portion, kcal, protein_g
- [full_fat_milk,             "250 ml",        160, 8]
- [egg_large,                 "1",              75, 6]
- [egg_fried_1tsp_oil,        "1",             115, 6]
- [peanut_butter,             "1 tbsp",         95, 4]
- [flatbread,                 "1 medium",      140, 4]
- [flaky_flatbread,           "1",             280, 6]
- [rice_cooked,               "1 cup",         250, 5]
- [lentil_stew,               "1 cup",         220, 14]
- [chicken_curry,             "150 g chicken", 330, 28]
- [minced_beef,               "150 g",         350, 25]
- [chickpeas_cooked,          "1 cup",         270, 15]
- [yogurt_full_fat,           "200 g",         130, 8]
- [banana,                    "1 medium",      105, 1]
- [dates,                     "3",              70, 0.5]
- [almonds,                   "15 g",           90, 3]
- [oats_dry,                  "25 g",           95, 3]
- [honey,                     "1 tbsp",         64, 0]
- [clarified_butter_or_oil,   "1 tsp",          40, 0]
- [bread,                     "2 slices",      160, 5]
- [potato_boiled,             "150 g",         130, 3]
```

## Weekly grocery list (Phase 2)

```yaml
dairy_eggs: ["7-8 L full-fat milk", "2 dozen eggs", "1.5 kg yogurt", "250 g clarified butter"]
pantry:     ["1 kg peanut butter", "500 g oats", "2 kg rice", "wholemeal flour", "1 L oil", "honey"]
protein:    ["1.5 kg chicken", "500 g minced beef", "1 kg dried lentils", "1 kg dried chickpeas"]
produce:    ["2 dozen bananas", "500 g dates", "250 g almonds", "potatoes, onions, tomatoes"]
```

---

## Appetite tactics (relevant to UX)

Appetite, not willpower, is the bottleneck. These shaped the plan and may shape
the app:

- No water with meals — it takes stomach volume needed for food
- Eat the calorie-dense item first, carbs last
- 1 tsp clarified butter on anything cooked = ~40 kcal at no cost in fullness
- Liquid calories bypass fullness — that's the entire reason B2 and A2 exist
- Missed a block? Add a shake later. Never try to make up 600 kcal in one sitting.

---

## Resolved behaviours (2026-08-27)

Decisions taken with the user. These are settled — implement them, don't reopen.

```yaml
breakfast_variety:
  decision: "B1 gains a rotation (BR1-BR3), same as lunch and dinner"
  why: "the same breakfast 91 times is the most likely point of adherence failure"

off_plan_meals:
  decision: "tick the block; it counts at its planned value"
  why: >
    Meals are partly family-cooked and will not always match the plan. Counting
    them at face value keeps the no-logging promise intact. The resulting drift
    is corrected by the scale, not by more precise input — the target is a
    hypothesis under revision, so accuracy at the meal level buys little.

missed_days:
  decision: "yesterday is backfillable for 24 h, then the day closes"
  why: >
    Catches a forgotten evening without letting history be rewritten into
    fiction. Adherence % feeds the adjustment engine, so it must stay honest.
  ui: "a quiet prompt, never a guilt message — see the never-nag principle"

starting_phase:
  decision: "start at phase 1, take the two-week ramp as designed"
  why: "jumping to the full target is the documented cause of week-one collapse"
```

**Implementation note.** Rotation options do not share a single cost — L2 is 630
kcal against L3's 565, and BR2 differs from BR3. The daily total must be summed
from the *selected* rotation option, never from the parent block's static value.
