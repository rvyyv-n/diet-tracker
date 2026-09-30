(function(){
const { Eyebrow, SectionHeading, Card, Segmented, Toggle, ListGroup, ListRow, Radio, ConfirmPanel } = window.DS;
function LookTile({ look, theme, name, note, selected, onPick }) {
  return (<button type="button" onClick={onPick} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ borderRadius: 18, padding: 3, boxShadow: selected ? 'inset 0 0 0 2px var(--ink)' : 'inset 0 0 0 1px var(--line)' }}>
      <div data-look={look} data-theme={theme} style={{ borderRadius: 15, overflow: 'hidden', backgroundColor: 'var(--bg-canvas)', backgroundImage: 'var(--texture)', color: 'var(--ink)', fontFamily: 'var(--font-body)', padding: '12px 10px 10px', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
        <div style={{ fontSize: 9, fontWeight: 'var(--eyebrow-weight)', letterSpacing: 'var(--eyebrow-tracking)', textTransform: 'var(--eyebrow-transform)', color: 'var(--eyebrow-ink)' }}>Phase 2 · Week 6</div>
        <div style={{ fontFamily: 'var(--font-numeric)', fontSize: 30, fontWeight: 'var(--numeric-weight)', letterSpacing: 'var(--numeric-tracking)', lineHeight: 1, marginTop: 2 }}>2,285</div>
        <div style={{ position: 'relative', height: 18 }}><div style={{ position: 'absolute', left: -10, right: -10, top: 10, height: 1, background: 'var(--horizon)' }} /><div style={{ position: 'absolute', left: 0, width: '70%', top: 9, height: 3, borderRadius: 2, background: 'var(--intake-partial)' }} /><div style={{ position: 'absolute', left: 'calc(70% - 6px)', top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--sun)', boxShadow: '0 0 8px 2px var(--sun-halo)' }} /></div>
        <div style={{ marginTop: 6, borderRadius: 10, background: 'var(--due-bg)', color: 'var(--due-ink)', boxShadow: 'var(--due-edge)', padding: '8px 9px' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--due-accent-text)' }}>Due now</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'var(--due-title-style)', fontSize: 17, lineHeight: 1.1 }}>Snack</div>
          <div style={{ marginTop: 6, height: 16, borderRadius: 8, background: 'var(--due-cta-bg)' }} /></div>
      </div></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}><Radio selected={selected} size={20} /><span style={{ fontSize: 16, fontWeight: 700 }}>{name}</span><span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{note}</span></div>
  </button>);
}
window.SettingsScreen = function SettingsScreen({ look, setLook, themePref, setThemePref, theme, prot, setProt, rem, setRem, reset, setReset, doReset }) {
  return (<div style={{ paddingBottom: 110 }}>
    <div style={{ padding: '0 20px', marginTop: 10 }}><Eyebrow>45 days logged · 7 weigh-ins · 3 recipes</Eyebrow></div>
    <div style={{ padding: '0 20px', marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-lg)', lineHeight: 1.1 }}>Settings</div>
    <div style={{ margin: '22px 20px 0', borderRadius: 'var(--radius-card)', background: 'var(--bg-raised)', boxShadow: 'var(--shadow-card)', padding: '14px 14px 14px 16px', display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 16px', gap: 14, alignItems: 'center' }}>
      <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700 }}>S</span>
      <span><span style={{ display: 'block', fontSize: 17, fontWeight: 700 }}>Sam</span><span style={{ display: 'block', fontSize: 14, color: 'var(--ink-muted)' }}>Target · 178 cm · +0.3 kg/wk</span></span>
      <span style={{ color: 'var(--ink-muted)' }}>›</span>
    </div>
    <div style={{ padding: '0 20px', marginTop: 28 }}><SectionHeading>Appearance</SectionHeading></div>
    <div style={{ margin: '10px 20px 0' }}><Card padding={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 17, fontWeight: 700 }}>Look</span><span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Type, texture and the sun</span></div>
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <LookTile look="paper" theme={theme} name="Paper" note="Default" selected={look === 'paper'} onPick={() => setLook('paper')} />
        <LookTile look="reel" theme={theme} name="Reel" note="Film" selected={look === 'reel'} onPick={() => setLook('reel')} />
      </div>
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 17, fontWeight: 700 }}>Theme</span><span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>System follows your device</span></div>
      <div style={{ marginTop: 10 }}><Segmented value={themePref} onChange={setThemePref} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} /></div>
    </Card></div>
    <div style={{ padding: '0 20px', marginTop: 28 }}><SectionHeading>Overview</SectionHeading></div>
    <div style={{ margin: '10px 20px 0' }}><ListGroup>
      <ListRow title="Protein line" hint="Protein against the daily target." trailing={<Toggle checked={prot} label="Protein line" onChange={setProt} />} />
      <ListRow title="Remaining line" hint="Kcal and blocks still to go." trailing={<Toggle checked={rem} label="Remaining line" onChange={setRem} />} />
    </ListGroup></div>
    <div style={{ padding: '0 20px', marginTop: 28 }}><SectionHeading>Data</SectionHeading></div>
    <div style={{ margin: '10px 20px 0' }}><ListGroup>
      <ListRow title="Export data" hint="Exported 3 days ago." trailing="chevron" onClick={() => {}} />
      <ListRow title="Import data" hint="From a backup file or pasted JSON." trailing="chevron" onClick={() => {}} />
      <ListRow title="Reset all data" hint="Erases this browser's copy." trailing="chevron" danger onClick={() => setReset(true)} />
    </ListGroup></div>
    {reset && <div style={{ margin: '12px 20px 0' }}><ConfirmPanel title="Erase everything?" body="This removes your profile, 45 days, 7 weigh-ins and 3 recipes from this browser, and starts the plan over at week 1. A copy is kept, and setup offers to restore it." confirmLabel="Erase everything" onConfirm={doReset} onCancel={() => setReset(false)} /></div>}
  </div>);
};
})();
