/**
 * The component scratch page (pass 65). Renders every v3.0 component from
 * src/components/ once per Look and theme, each panel scoped by a nested
 * data-look / data-theme, so a change can be checked in all four at once:
 *
 *   npm run dev -- --port 5199, then http://127.0.0.1:5199/dev/components.html
 *   ?only=paper-dark (or any look-theme) shows a single panel.
 *
 * Dev only; the build never includes it. The controls are live, so press,
 * hover and focus can be tried by hand.
 */

import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  Icon,
  IconButton,
  Radio,
  SectionHeading,
  Segmented,
  TextField,
  Toggle,
} from "../src/components/core.jsx";
import {
  BlockList,
  BlockRow,
  DayTotal,
  DotStrip,
  DueCard,
  GroceryList,
  NowMarker,
  PhaseLadder,
  StatRow,
  StatusDot,
  SuggestionCard,
  WeightChart,
} from "../src/components/tracking.jsx";
import {
  Banner,
  CalendarGrid,
  ConfirmPanel,
  EmptyState,
  ListGroup,
  ListRow,
  OptionRow,
  Sheet,
  Toast,
} from "../src/components/surfaces.jsx";
import { Imperative } from "../src/components/shared.jsx";
import { listbox } from "../src/js/ui/listbox.js";
import { dateCalendar } from "../src/js/ui/date-calendar.js";

const PANELS = [
  ["paper", "light"],
  ["paper", "dark"],
  ["reel", "light"],
  ["reel", "dark"],
];

function Section({ name, children }) {
  return (
    <section className="dev-gallery__section">
      <h3 className="dev-gallery__name">{name}</h3>
      {children}
    </section>
  );
}

function Panel({ look, theme }) {
  const [chip, setChip] = useState("Fine");
  const [seg, setSeg] = useState("system");
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [weight, setWeight] = useState("63.0");
  const [ticked, setTicked] = useState(false);
  const [pick, setPick] = useState(0);
  const [aisles, setAisles] = useState([
    {
      name: "Dairy & eggs",
      icon: "dairy",
      items: [
        { name: "Full-fat milk", qty: "7.5 L", done: true },
        { name: "Greek yogurt", qty: "1.4 kg", changed: true },
      ],
    },
    { name: "Pantry", icon: "pantry", items: [{ name: "Oats", qty: "900 g" }] },
  ]);
  const widgets = useMemo(
    () => ({
      lb: listbox({
        options: ["January", "February", "March"].map((m, i) => ({ value: i, label: m })),
        value: 1,
        ariaLabel: "Month",
      }).node,
      cal: dateCalendar({ value: "2026-09-30", max: "2026-09-30" }).node,
    }),
    [],
  );

  const toggleItem = (ai, ii) =>
    setAisles((all) =>
      all.map((a, i) =>
        i !== ai
          ? a
          : { ...a, items: a.items.map((it, j) => (j === ii ? { ...it, done: !it.done } : it)) },
      ),
    );

  return (
    <div className="dev-gallery__panel" data-look={look} data-theme={theme}>
      <Eyebrow trailing={<StatusDot status="partial" />}>
        {look} · {theme}
      </Eyebrow>

      <Section name="Button">
        <div className="dev-gallery__row">
          <Button icon="check">Tick Snack</Button>
          <Button variant="secondary">Not now</Button>
          <Button variant="text">Swap</Button>
        </div>
        <div className="dev-gallery__row">
          <Button variant="hero">Weigh in</Button>
          <Button variant="danger">Erase</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" size="sm" disabled>
            Clear
          </Button>
        </div>
        <div className="dev-gallery__row">
          <IconButton icon="chevronLeft" label="Previous month" />
          <IconButton icon="chevronRight" label="Next month" disabled />
          <Chip selected={chip === "Stuffed"} onClick={() => setChip("Stuffed")}>
            Stuffed
          </Chip>
          <Chip selected={chip === "Fine"} onClick={() => setChip("Fine")}>
            Fine
          </Chip>
        </div>
      </Section>

      <Section name="Segmented, Toggle, Radio">
        <Segmented
          label="Theme"
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={seg}
          onChange={setSeg}
        />
        <div className="dev-gallery__row">
          <Toggle checked={on} label="On" onChange={setOn} />
          <Toggle checked={off} label="Off" onChange={setOff} />
          <Radio selected />
          <Radio />
        </div>
      </Section>

      <Section name="TextField">
        <TextField
          label="Weight"
          unit="kg"
          value={weight}
          onChange={setWeight}
          inputMode="decimal"
          hint="Latest 63.0 kg"
        />
        <TextField label="Recipe name" value="" placeholder="Name" error="A name is needed." />
      </Section>

      <Section name="Card, SectionHeading">
        <SectionHeading meta="9 of 23 ticked">Groceries</SectionHeading>
        <div className="dev-gallery__row">
          <Card>Raised</Card>
          <Card variant="outlined">Outlined</Card>
          <Card variant="sunken">Sunken</Card>
        </div>
      </Section>

      <Section name="DotStrip, DayTotal">
        <DotStrip
          days={[
            { status: "on-track" },
            { status: "partial" },
            { status: "low" },
            { status: "on-track", selected: true },
            { status: "partial" },
            { status: "none" },
            { status: "today" },
          ]}
          label="Sat 26"
        />
        <div className="dev-gallery__bleed">
          <DayTotal
            eyebrow="Phase 2 · Week 6"
            kcal={2285}
            target={3110}
            status="partial"
            remaining={
              <>
                <b>825</b> to go · 3 blocks
              </>
            }
            protein={113}
            proteinTarget={150}
          />
        </div>
      </Section>

      <Section name="BlockList">
        <div className="dev-gallery__bleed-left">
          <BlockList>
            <BlockRow time="08:00" name="Breakfast" kcal={705} state="done" />
            <BlockRow
              time="11:00"
              name="Shake"
              kcal={580}
              state="receded"
              tag="most skipped"
              tagEmphasis
            />
            <BlockRow time="12:30" name="Crisps" kcal={160} state="off" />
            <NowMarker time="16:10" />
            <DueCard
              label="Due now · 16:00 · Add-on"
              name="Snack"
              desc="Yogurt, dates and almonds"
              kcal={290}
              protein={11}
              swappable
            />
            <BlockRow
              time="19:00"
              name="Dinner"
              kcal={820}
              state={ticked ? "done" : "idle"}
              link="Swap"
              onToggle={() => setTicked((t) => !t)}
            />
            <BlockRow time="22:00" name="Pre-bed" kcal={255} state="closed" />
            <BlockRow time="22:30" name="Milk" kcal={300} state="closedDone" />
          </BlockList>
        </div>
      </Section>

      <Section name="SuggestionCard, StatRow">
        <SuggestionCard
          title="Move to Phase 3"
          body="The 4-week average has been under 0.20 kg/week for two weeks."
        />
        <StatRow
          stats={[
            { value: "86%", label: "blocks eaten" },
            { value: "2,960", label: "kcal / day avg" },
            { value: "+0.28", label: "kg / week" },
          ]}
        />
      </Section>

      <Section name="PhaseLadder">
        <PhaseLadder
          rungs={[
            {
              name: "Ramp-up",
              status: "Done",
              when: "Weeks 1–2",
              kcal: "2,565 kcal",
              protein: "128 g protein",
              state: "past",
            },
            {
              name: "Target",
              status: "Now",
              when: "Week 3 on",
              kcal: "3,110 kcal",
              protein: "150 g protein",
              state: "now",
            },
            {
              name: "Pushed",
              status: "If stalled",
              when: "After two flat weeks",
              kcal: "3,410 kcal",
              protein: "160 g protein",
            },
          ]}
        />
      </Section>

      <Section name="GroceryList">
        <GroceryList
          aisles={aisles}
          scaleNote="Quantities for Phase 2."
          onToggle={toggleItem}
          onClear={() =>
            setAisles((all) =>
              all.map((a) => ({ ...a, items: a.items.map((it) => ({ ...it, done: false })) })),
            )
          }
        />
      </Section>

      <Section name="WeightChart">
        <WeightChart
          weights={[61.4, 61.7, 62.1, 62.2, 62.2, 62.6, 63.0]}
          bandLow={[61.3, 61.5, 61.7, 61.9, 62.1, 62.3, 62.5]}
          bandHigh={[61.6, 61.9, 62.2, 62.5, 62.8, 63.1, 63.4]}
          labels={["4 Aug", "8 Sep", "30 Sep"]}
        />
        <WeightChart weights={[61.4, 61.7]} labels={["23 Sep", "", "30 Sep"]} />
      </Section>

      <Section name="Banner, Toast">
        <Banner kind="closed" title="This day is closed." sub="Saturday 26 September · view only" />
        <Banner kind="backfill" title="Yesterday isn't finished" action="Open" />
        <Banner kind="storage" title="Storage is full" sub="The last change was not saved." />
        <Toast message="Pre-bed ticked · 255 kcal" placement="pane" onUndo={() => {}} />
      </Section>

      <Section name="ConfirmPanel, EmptyState">
        <ConfirmPanel
          title="Erase everything?"
          body="This removes your profile, 45 days, 7 weigh-ins and 3 recipes."
          confirmLabel="Erase everything"
        />
        <EmptyState icon="recipes">
          No recipes yet. Save what you eat off-plan and it appears here.
        </EmptyState>
      </Section>

      <Section name="ListGroup, OptionRow">
        <ListGroup>
          <ListRow
            title="Export data"
            hint="Exported 3 days ago."
            trailing="chevron"
            onClick={() => {}}
          />
          <ListRow
            title="Protein line"
            hint="Shown under the day total."
            trailing={<Toggle checked={on} label="Protein line" onChange={setOn} />}
          />
          <ListRow title="Erase everything" danger trailing="chevron" onClick={() => {}} />
        </ListGroup>
        <div>
          {["Yogurt, dates and almonds", "Peanut butter toast"].map((name, i) => (
            <OptionRow
              key={name}
              name={name}
              note={i === 0 ? "Current" : undefined}
              kcal={290 + i * 40}
              protein={11 + i}
              selected={pick === i}
              last={i === 1}
              onClick={() => setPick(i)}
            />
          ))}
        </div>
      </Section>

      <Section name="Sheet with CalendarGrid, dialog">
        <div className="dev-gallery__stage">
          <Sheet title="Calendar" meta="Wed 30 Sep" contained>
            <CalendarGrid
              month="September"
              leadingBlanks={1}
              nextDisabled
              days={Array.from({ length: 30 }, (_, i) => ({
                n: i + 1,
                status:
                  i === 29 ? "today" : i < 16 ? undefined : ["on-track", "partial", "low"][i % 3],
                disabled: i < 16,
                selected: i === 25,
              }))}
              note="Days before 17 Sep have no plan."
            />
          </Sheet>
        </div>
        <div className="dev-gallery__stage dev-gallery__stage--short">
          <Sheet variant="dialog" title="Weigh in" contained>
            <TextField label="Weight" unit="kg" value="63.0" />
            <Button fullWidth>Save</Button>
          </Sheet>
        </div>
      </Section>

      <Section name="Date controls (ui/)">
        <Imperative node={widgets.lb} />
        <Imperative node={widgets.cal} />
      </Section>

      <Section name="Icons">
        <div className="dev-gallery__row">
          {["today", "plan", "recipes", "weight", "settings", "lock", "warn", "info", "search"].map(
            (n) => (
              <Icon key={n} name={n} />
            ),
          )}
          {["dairy", "pantry", "protein", "produce"].map((n) => (
            <Icon key={n} name={n} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Gallery() {
  const only = new URLSearchParams(location.search).get("only");
  const panels = only ? PANELS.filter(([l, t]) => `${l}-${t}` === only) : PANELS;
  return (
    <main className="dev-gallery">
      {panels.map(([look, theme]) => (
        <Panel key={`${look}-${theme}`} look={look} theme={theme} />
      ))}
    </main>
  );
}

createRoot(document.getElementById("app")).render(<Gallery />);
