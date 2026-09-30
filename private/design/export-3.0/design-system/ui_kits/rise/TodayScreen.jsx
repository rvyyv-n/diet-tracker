(function(){
const { DotStrip, DayTotal, BlockList, BlockRow, NowMarker, DueCard, Button, Chip, Eyebrow } = window.DS;
const D = window.RiseData;
window.TodayScreen = function TodayScreen({ ticked, offPlan, toggle, appetite, setAppetite, open, removeOff, showProt = true, showRem = true }) {
  const items = D.BLOCKS.concat(offPlan.map(o => ({ ...o, off: 1 }))).sort((a, b) => a.t < b.t ? -1 : 1);
  const isT = i => i.off || ticked.includes(i.id);
  let kcal = 0, prot = 0, left = 0;
  items.forEach(i => { if (isT(i)) { kcal += i.k; prot += i.p; } else if (!i.off) left++; });
  const due = [...items].reverse().find(i => !isT(i) && i.t <= D.CLOCK);
  const frac = kcal / D.TARGET;
  const status = kcal === 0 ? 'none' : kcal >= D.TARGET ? 'on-track' : frac >= 0.55 ? 'partial' : 'low';
  const gap = D.TARGET - kcal;
  const days = [{ status: 'on-track' }, { status: 'on-track' }, { status: 'partial' }, { status: 'low' }, { status: 'on-track' }, { status: 'on-track' }, { status: 'today', selected: true }];
  const rows = []; let nowDone = false;
  items.forEach(i => {
    if (!nowDone && i.t > D.CLOCK) { rows.push(<NowMarker key="now" time={D.CLOCK} />); nowDone = true; }
    if (due && i.id === due.id) {
      if (!nowDone) { rows.push(<NowMarker key="now" time={D.CLOCK} />); nowDone = true; }
      rows.push(<DueCard key={i.id} label={'Due now · ' + i.t + (i.add ? ' · Add-on' : '') + (i.key ? ' · Most skipped' : '')} name={i.n} desc={i.d} kcal={i.k} protein={i.p} swappable={!!i.swap} onTick={() => toggle(i.id)} onSwap={() => open('swap')} />);
      return;
    }
    const done = isT(i), receded = !done && i.t < D.CLOCK;
    rows.push(<BlockRow key={i.id} time={i.t} name={i.n} kcal={i.k} state={i.off ? 'off' : done ? 'done' : receded ? 'receded' : 'idle'}
      link={i.off ? 'Remove' : (i.swap && !done && !receded ? 'Swap' : undefined)} onLink={() => i.off ? removeOff(i.id) : open('swap')}
      tag={i.add ? 'add-on' : (i.key && !done ? 'most skipped' : undefined)} tagEmphasis={!!i.key} onToggle={i.off ? undefined : () => toggle(i.id)} />);
  });
  if (!nowDone) rows.push(<NowMarker key="now" time={D.CLOCK} />);
  return (<div style={{ paddingBottom: 110 }}>
    <div style={{ padding: '0 20px', marginTop: 8 }}><DotStrip days={days} label="Wed 30" onCalendar={() => open('calendar')} /></div>
    <div style={{ marginTop: 22 }}>
      <DayTotal eyebrow="Phase 2 · Week 6" kcal={kcal} target={D.TARGET} status={status} protein={showProt ? prot : undefined} proteinTarget={D.PROTEIN}
        remaining={!showRem ? null : gap <= 0 ? <><b>{D.fmt(-gap)}</b> over target</> : <><b>{D.fmt(gap)}</b> to go · {left} block{left === 1 ? '' : 's'}</>} />
    </div>
    <div style={{ marginTop: 26 }}><BlockList>{rows}</BlockList></div>
    <div style={{ padding: '0 20px', marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Button variant="secondary" onClick={() => open('log')}>+ Log food</Button><Button variant="secondary" onClick={() => open('add')}>+ Add a block</Button>
    </div>
    <div style={{ padding: '0 20px', marginTop: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--section-font)', fontSize: 'var(--section-size)', fontWeight: 'var(--section-weight)', letterSpacing: 'var(--section-tracking)', textTransform: 'var(--section-transform)', color: 'var(--section-ink)', marginRight: 4 }}>Appetite</span>
      {['Stuffed', 'Fine', 'Hungry'].map(l => <Chip key={l} selected={appetite === l} onClick={() => setAppetite(appetite === l ? '' : l)}>{l}</Chip>)}
    </div>
  </div>);
};
})();
