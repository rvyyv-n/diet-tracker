(function(){
const { PhoneNav, Sheet, Toast, OptionRow, Button, Segmented, CalendarGrid, TextField, Icon } = window.DS;
const D = window.RiseData;
const sysDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const ADDS = [['Shake 2', 'Standard shake, from the Phase 3 list', 580, 22], ['Extra snack', 'Banana and peanut butter', 295, 9], ['Extra pre-bed', 'Milk and peanut butter', 255, 12], ['Heavy shake', 'Adds oats and dates', 790, 27]];
function App() {
  const [tab, setTab] = React.useState('today');
  const [look, setLook] = React.useState('paper');
  const [themePref, setThemePref] = React.useState('light');
  const [ticked, setTicked] = React.useState(['b1', 'b2', 'b3']);
  const [offPlan, setOff] = React.useState([{ id: 'wrap', t: '14:20', n: 'Chicken wrap', k: 420, p: 24 }]);
  const [appetite, setAppetite] = React.useState('');
  const [sheet, setSheet] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [weights, setWeights] = React.useState([61.4, 61.7, 62.1, 62.2, 62.2, 62.6, 63.0]);
  const [suggestion, setSuggestion] = React.useState(true);
  const [groceries, setG] = React.useState(D.AISLES.map(a => ({ ...a, items: a.items.map(([name, qty], i) => ({ name, qty, done: a.name === 'Dairy & eggs' && i < 2 })) })));
  const [prot, setProt] = React.useState(true), [rem, setRem] = React.useState(true), [reset, setReset] = React.useState(false);
  const [swap, setSwap] = React.useState(0), [add, setAdd] = React.useState(0), [wv, setWv] = React.useState('63.4');
  const theme = themePref === 'system' ? (sysDark() ? 'dark' : 'light') : themePref;
  const say = (msg, undo) => { setToast({ msg, undo }); clearTimeout(window.__t); window.__t = setTimeout(() => setToast(null), 3500); };
  const toggle = id => { const on = ticked.includes(id); const b = D.BLOCKS.find(x => x.id === id); setTicked(on ? ticked.filter(x => x !== id) : ticked.concat(id)); if (!on) say(b.n + ' ticked · ' + b.k + ' kcal', () => setTicked(ticked)); };
  const open = s => setSheet(s), close = () => setSheet(null);
  const prev = groceries;
  const toggleG = (ai, ii) => setG(groceries.map((a, x) => x !== ai ? a : { ...a, items: a.items.map((it, y) => y !== ii ? it : { ...it, done: !it.done }) }));
  const clearG = () => { setG(groceries.map(a => ({ ...a, items: a.items.map(i => ({ ...i, done: false })) }))); say('Grocery ticks cleared', () => setG(prev)); };
  const days = Array.from({ length: 30 }, (_, i) => ({ n: i + 1, status: i === 29 ? 'today' : [5, 12].includes(i) ? 'low' : [8, 18, 25, 26].includes(i) ? 'partial' : 'on-track' }));
  const fieldBox = { marginTop: 12, height: 48, borderRadius: 'var(--radius-field)', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', color: 'var(--ink-muted)', fontSize: 16 };
  return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', font: '600 12px system-ui' }}>
      {[['paper', 'Paper'], ['reel', 'Reel']].map(([v, l]) => <button key={v} onClick={() => setLook(v)} style={ctl(look === v)}>{l}</button>)}
      <span style={{ width: 8 }} />
      {[['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => <button key={v} onClick={() => setThemePref(v)} style={ctl(themePref === v)}>{l}</button>)}
    </div>
    <div data-look={look} data-theme={theme} style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', borderRadius: 44, backgroundColor: 'var(--bg-canvas)', backgroundImage: 'var(--texture)', color: 'var(--ink)', fontFamily: 'var(--font-body)', boxShadow: '0 30px 60px -30px rgba(60,40,20,.45),0 0 0 1px rgba(0,0,0,.06)', transition: 'background-color var(--dur-base) var(--ease-in-out)' }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 28px', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{D.CLOCK}</div>
        {tab === 'today' && <TodayScreen ticked={ticked} offPlan={offPlan} toggle={toggle} appetite={appetite} setAppetite={setAppetite} open={open} removeOff={id => setOff(offPlan.filter(o => o.id !== id))} showProt={prot} showRem={rem} />}
        {tab === 'weight' && <WeightScreen weights={weights} suggestion={suggestion} open={open} apply={() => { setSuggestion(false); say('Plan moved to Phase 3'); }} dismiss={() => setSuggestion(false)} />}
        {tab === 'plan' && <PlanScreen groceries={groceries} toggleG={toggleG} clearG={clearG} />}
        {tab === 'settings' && <SettingsScreen look={look} setLook={setLook} themePref={themePref} setThemePref={setThemePref} theme={theme} prot={prot} setProt={setProt} rem={rem} setRem={setRem} reset={reset} setReset={setReset} doReset={() => { setReset(false); say('Everything erased', () => {}); }} />}
      </div>
      <PhoneNav active={tab} onSelect={setTab} />
      {toast && <Toast message={toast.msg} onUndo={() => { toast.undo && toast.undo(); setToast(null); }} />}
      {sheet === 'log' && <Sheet title="Log food" meta="Wed 30 Sep" onClose={close}>
        <div style={{ marginTop: 14 }}><Segmented value="recipes" options={[{ value: 'recipes', label: 'Recipes' }, { value: 'foods', label: 'Foods' }, { value: 'custom', label: 'Custom' }]} /></div>
        <div style={fieldBox}><Icon name="search" size={18} />Filter recipes</div>
        <div style={{ marginTop: 6 }}>{D.RECIPES.map(q => (
          <div key={q.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 14, alignItems: 'center', minHeight: 64, borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 17 }}>{q.name}</span>
            <span style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{q.kcal}<span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: 'var(--ink-muted)' }}>{q.prot} g</span></span>
            <Button size="sm" onClick={() => { const it = { id: 'o' + Date.now(), t: D.CLOCK, n: q.name, k: q.kcal, p: q.prot }; setOff(offPlan.concat(it)); close(); say(q.name + ' logged · ' + q.kcal + ' kcal', () => setOff(offPlan)); }}>Log</Button>
          </div>))}</div>
        <div style={{ marginTop: 12 }}><Button variant="secondary" fullWidth>+ New recipe</Button></div>
      </Sheet>}
      {sheet === 'swap' && <Sheet title="Swap Snack" meta="Today only" onClose={close}>
        <div style={{ marginTop: 10 }}>{D.SWAPS.map((o, i) => <OptionRow key={i} name={o.name} note={i === 0 ? 'Current' : undefined} kcal={o.kcal} protein={o.prot} selected={swap === i} onClick={() => setSwap(i)} />)}</div>
        <div style={{ marginTop: 14 }}><Button fullWidth onClick={close}>Done</Button></div>
      </Sheet>}
      {sheet === 'add' && <Sheet title="Add a block" meta="Today only" onClose={close}>
        <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.45, color: 'var(--ink-muted)' }}>A bonus block counts toward today's kcal but never against adherence.</div>
        <div style={{ marginTop: 12, borderRadius: 'var(--radius-card)', boxShadow: 'inset 0 0 0 1px var(--line)', overflow: 'hidden', padding: '0 14px' }}>{ADDS.map(([n, d, k, p], i) => <OptionRow key={n} name={n} note={d} kcal={k} protein={p} selected={add === i} last={i === ADDS.length - 1} onClick={() => setAdd(i)} />)}</div>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={() => { close(); say(ADDS[add][0] + ' added for today'); }}>Add {ADDS[add][0]}</Button></div>
      </Sheet>}
      {sheet === 'calendar' && <Sheet title="" onClose={close}><CalendarGrid month="September" leadingBlanks={1} days={days} nextDisabled note="Days before 17 Aug have no plan." onPick={close} /></Sheet>}
      {sheet === 'weighin' && <Sheet title="Weigh in" meta="Wed 30 Sep" onClose={close}>
        <div style={{ marginTop: 16 }}><TextField label="Weight" unit="kg" value={wv} onChange={setWv} inputMode="decimal" hint="Latest 63.0 kg" /></div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10 }}><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={() => { const v = parseFloat(wv); if (!isNaN(v)) { setWeights(weights.concat(v)); say('Weigh-in saved · ' + v.toFixed(1) + ' kg', () => setWeights(weights)); } close(); }}>Save</Button></div>
      </Sheet>}
    </div>
  </div>);
}
const ctl = on => ({ height: 32, padding: '0 14px', borderRadius: 16, border: 0, cursor: 'pointer', background: on ? '#1c1916' : '#e4d9ca', color: on ? '#f7f1e8' : '#4a423a', font: 'inherit' });
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
