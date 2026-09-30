(function(){
const { SideNav, DayTotal, Eyebrow, StatusDot, Button, Chip, Sheet, Icon, Segmented, Toast, Card, SectionHeading } = window.DS;
const D = window.RiseData;
function Row({ i, done, receded, onToggle }) {
  const ink = receded ? 'var(--ink-muted)' : 'var(--ink)';
  return (<div style={{ display: 'grid', gridTemplateColumns: '58px 28px minmax(0,1fr) 130px', alignItems: 'center', columnGap: 14, minHeight: 54, fontVariantNumeric: 'tabular-nums' }}>
    <span style={{ textAlign: 'right', fontSize: 14, color: receded ? 'var(--ink-soft)' : 'var(--ink-muted)' }}>{i.t}</span>
    <button onClick={onToggle} aria-label={i.n} style={{ width: 28, height: 28, borderRadius: '50%', border: 0, padding: 0, cursor: 'pointer', color: 'var(--bg-canvas)', background: done ? 'var(--ink)' : 'var(--bg-canvas)', boxShadow: done ? 'none' : 'inset 0 0 0 1.5px ' + (receded ? 'var(--line-strong)' : 'var(--ink-soft)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{done && <Icon name="check" size={14} />}</button>
    <span style={{ minWidth: 0 }}><span style={{ fontSize: receded ? 16 : 18, color: ink }}>{i.n}</span>{i.add && <span style={{ marginLeft: 8, fontSize: 14, color: 'var(--ink-muted)' }}>add-on</span>}<span style={{ display: 'block', fontSize: 14, color: 'var(--ink-muted)' }}>{i.d}</span></span>
    <span style={{ textAlign: 'right', fontSize: 16, fontWeight: receded ? 400 : 700, color: ink }}>{i.k}<span style={{ fontWeight: 400, color: 'var(--ink-muted)', fontSize: 14 }}> · {i.p} g</span></span>
  </div>);
}
function Today({ ticked, toggle, appetite, setAppetite, open }) {
  const items = D.BLOCKS, isT = i => ticked.includes(i.id) || i.id === 'wrap';
  let kcal = 420, prot = 24, left = 0; items.forEach(i => { if (ticked.includes(i.id)) { kcal += i.k; prot += i.p; } else left++; });
  const due = [...items].reverse().find(i => !ticked.includes(i.id) && i.t <= D.CLOCK), gap = D.TARGET - kcal;
  const status = kcal >= D.TARGET ? 'on-track' : kcal / D.TARGET >= 0.55 ? 'partial' : 'low';
  const days = [['M','on-track'],['T','on-track'],['W','partial'],['T','low'],['F','on-track'],['S','on-track'],['W','today']];
  return (<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 40, maxWidth: 1080 }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ margin: '0 -20px' }}><DayTotal eyebrow="Wednesday 30 September · Phase 2 · Week 6" kcal={kcal} target={D.TARGET} status={status} protein={prot} proteinTarget={D.PROTEIN} remaining={<><b>{D.fmt(Math.max(0, gap))}</b> to go · {left} blocks</>} /></div>
      <div style={{ position: 'relative', isolation: 'isolate', marginTop: 26 }}>
        <div style={{ position: 'absolute', zIndex: -1, left: 83, top: 8, bottom: 8, width: 2, background: 'var(--line)' }} />
        {items.map(i => {
          if (due && i.id === due.id) return (<React.Fragment key={i.id}>
            <div style={{ position: 'relative', height: 28, margin: '4px 0' }}><div style={{ position: 'absolute', left: 0, right: -24, top: 14, height: 1.5, background: 'linear-gradient(90deg,transparent,var(--now-line) 10%,var(--now-line) 85%,transparent)' }} /><span style={{ position: 'absolute', left: 76, top: 6, width: 16, height: 16, borderRadius: '50%', background: 'var(--sun)', boxShadow: '0 0 12px 4px var(--sun-halo)' }} /><span style={{ position: 'absolute', left: 6, top: 5, fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', background: 'var(--bg-canvas)', padding: '0 4px' }}>{D.CLOCK}</span></div>
            <div style={{ margin: '6px 0 10px 72px', borderRadius: 22, background: 'var(--due-bg)', color: 'var(--due-ink)', boxShadow: 'var(--due-edge),var(--due-glow)', padding: '18px 20px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 20, alignItems: 'center' }}>
              <div><div style={{ fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--due-accent-text)' }}>Due now · {i.t}{i.add ? ' · Add-on' : ''}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'var(--due-title-style)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-lg)', lineHeight: 1.05, marginTop: 2 }}>{i.n}</div>
                <div style={{ fontSize: 14, color: 'var(--due-ink-muted)', marginTop: 4 }}>{i.d} · <b style={{ color: 'var(--due-ink)' }}>{i.k} kcal</b> · {i.p} g</div></div>
              <div style={{ display: 'flex', gap: 10 }}><Button variant="dueSecondary" onClick={() => open('swap')}>Swap</Button><Button variant="dueCta" icon="check" onClick={() => toggle(i.id)}>Tick {i.n}</Button></div>
            </div></React.Fragment>);
          return <Row key={i.id} i={i} done={isT(i)} receded={!isT(i) && i.t < D.CLOCK} onToggle={() => toggle(i.id)} />;
        })}
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 6 }}>
      <Card padding={18}>
        <SectionHeading>7 days</SectionHeading>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center', fontSize: 13, color: 'var(--ink-muted)' }}>
          {days.map(([d, s], n) => <span key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>{d}<span style={{ width: s === 'today' ? 20 : 14, height: s === 'today' ? 20 : 14, borderRadius: '50%', background: s === 'today' ? 'transparent' : 'var(--intake-' + s + ')', boxShadow: s === 'today' ? 'inset 0 0 0 2px var(--ink)' : 'none' }} /><span style={{ color: 'var(--ink)', fontWeight: s === 'today' ? 700 : 400 }}>{24 + n}</span></span>)}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Button variant="secondary" onClick={() => open('log')}>+ Log food</Button><Button variant="secondary" onClick={() => open('log')}>+ Add a block</Button></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontFamily: 'var(--section-font)', fontSize: 'var(--section-size)', fontWeight: 'var(--section-weight)', letterSpacing: 'var(--section-tracking)', textTransform: 'var(--section-transform)', color: 'var(--section-ink)', marginRight: 4 }}>Appetite</span>{['Stuffed', 'Fine', 'Hungry'].map(l => <Chip key={l} selected={appetite === l} onClick={() => setAppetite(appetite === l ? '' : l)}>{l}</Chip>)}</div>
    </div>
  </div>);
}
function DesktopApp() {
  const [look, setLook] = React.useState('paper'), [theme, setTheme] = React.useState('light');
  const [nav, setNav] = React.useState('today'), [ticked, setTicked] = React.useState(['b1', 'b2', 'b3']);
  const [appetite, setAppetite] = React.useState(''), [sheet, setSheet] = React.useState(null), [toast, setToast] = React.useState(null);
  const toggle = id => { const on = ticked.includes(id); const b = D.BLOCKS.find(x => x.id === id); setTicked(on ? ticked.filter(x => x !== id) : ticked.concat(id)); if (!on) { setToast(b.n + ' ticked · ' + b.k + ' kcal'); setTimeout(() => setToast(null), 3000); } };
  let kcal = 420; D.BLOCKS.forEach(b => { if (ticked.includes(b.id)) kcal += b.k; });
  const st = kcal >= D.TARGET ? 'on-track' : kcal / D.TARGET >= 0.55 ? 'partial' : 'low';
  const ctl = on => ({ height: 32, padding: '0 14px', borderRadius: 16, border: 0, cursor: 'pointer', background: on ? '#1c1916' : '#e4d9ca', color: on ? '#f7f1e8' : '#4a423a', font: '600 12px system-ui' });
  return (<div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
    <div style={{ display: 'flex', gap: 8 }}>{['paper', 'reel'].map(v => <button key={v} style={ctl(look === v)} onClick={() => setLook(v)}>{v === 'paper' ? 'Paper' : 'Reel'}</button>)}<span style={{ width: 8 }} />{['light', 'dark'].map(v => <button key={v} style={ctl(theme === v)} onClick={() => setTheme(v)}>{v === 'light' ? 'Light' : 'Dark'}</button>)}</div>
    <div data-look={look} data-theme={theme} style={{ position: 'relative', width: 1440, height: 900, overflow: 'hidden', borderRadius: 14, display: 'grid', gridTemplateColumns: '256px 1fr', backgroundColor: 'var(--bg-canvas)', backgroundImage: 'var(--texture)', color: 'var(--ink)', fontFamily: 'var(--font-body)', boxShadow: '0 30px 60px -30px rgba(60,40,20,.45),0 0 0 1px rgba(0,0,0,.06)' }}>
      <SideNav active={nav} onSelect={setNav} glance={{ kcal: D.fmt(kcal), target: '3,110', status: st, latest: '63.0 kg' }} />
      <main style={{ padding: '36px 48px 48px', overflow: 'hidden' }}>
        {nav === 'today' ? <Today ticked={ticked} toggle={toggle} appetite={appetite} setAppetite={setAppetite} open={setSheet} /> :
          <div style={{ maxWidth: 560 }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-lg)' }}>{nav[0].toUpperCase() + nav.slice(1)}</div><p style={{ color: 'var(--ink-muted)', lineHeight: 1.5 }}>This kit only rebuilds the desktop Today screen. The desktop layouts for Weight, Plan, Recipes and Settings are in <b>Rise Desktop.dc.html</b> (1440 column, 340px support column).</p></div>}
      </main>
      {toast && <div style={{ position: 'absolute', bottom: 28, left: 'calc(256px + (100% - 256px) / 2)', transform: 'translateX(-50%)', zIndex: 30 }}><Toast placement="static" message={toast} onUndo={() => setToast(null)} /></div>}
      {sheet && <Sheet variant="dialog" navInset={256} title={sheet === 'swap' ? 'Swap Snack' : 'Log food'} meta="Wed 30 Sep" onClose={() => setSheet(null)}>
        {sheet === 'log' ? <><Segmented value="recipes" options={[{ value: 'recipes', label: 'Recipes' }, { value: 'foods', label: 'Foods' }, { value: 'custom', label: 'Custom' }]} />{D.RECIPES.map(q => <div key={q.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 14, alignItems: 'center', minHeight: 60, borderBottom: '1px solid var(--line)' }}><span style={{ fontSize: 17 }}>{q.name}</span><span style={{ fontWeight: 700 }}>{q.kcal} kcal</span><Button size="sm" onClick={() => setSheet(null)}>Log</Button></div>)}</> :
          <><div>{D.SWAPS.map((o, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', minHeight: 56, alignItems: 'center', borderBottom: '1px solid var(--line)', fontSize: 17 }}><span>{o.name}{i === 0 && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--ink-muted)' }}>Current</span>}</span><b>{o.kcal}</b></div>)}</div><Button fullWidth onClick={() => setSheet(null)}>Done</Button></>}
      </Sheet>}
    </div>
  </div>);
}
ReactDOM.createRoot(document.getElementById('root')).render(<DesktopApp />);
})();
