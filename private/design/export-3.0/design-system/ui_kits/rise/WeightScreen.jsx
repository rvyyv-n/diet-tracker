(function(){
const { Eyebrow, StatusDot, WeightChart, SuggestionCard, StatRow, Button } = window.DS;
window.WeightScreen = function WeightScreen({ weights, suggestion, apply, dismiss, open }) {
  const latest = weights[weights.length - 1];
  return (<div style={{ paddingBottom: 110 }}>
    <div style={{ padding: '0 20px', marginTop: 10 }}><Eyebrow>Week 6 · Wed 30 Sep</Eyebrow></div>
    <div style={{ padding: '0 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--type-hero)', fontWeight: 'var(--numeric-weight)', lineHeight: 1, letterSpacing: 'var(--numeric-tracking)', fontVariantNumeric: 'tabular-nums' }}>{latest.toFixed(1)}</span>
      <span style={{ fontSize: 22, color: 'var(--ink-muted)' }}>kg</span>
    </div>
    <div style={{ padding: '0 20px', marginTop: 8, fontSize: 17, fontVariantNumeric: 'tabular-nums' }}><StatusDot status="on-track" label="" size={10} /> <b>+0.28 kg</b>/week, on pace</div>
    <div style={{ margin: '16px 20px 0' }}><WeightChart weights={weights} labels={['4 Aug', '8 Sep', '30 Sep']} /></div>
    {suggestion && <div style={{ margin: '18px 20px 0' }}><SuggestionCard title="Move to Phase 3" body="The 4-week average has been under 0.20 kg/week for two weeks. Phase 3 adds Shake 2 at 17:00: 3,690 kcal and 172 g protein a day." onApply={apply} onDismiss={dismiss} /></div>}
    <div style={{ padding: '0 20px', marginTop: 16 }}><StatRow stats={[{ value: '86%', label: 'blocks eaten' }, { value: '2,960', label: 'kcal / day avg' }]} /></div>
    <div style={{ margin: '18px 20px 0', borderRadius: 22, background: 'var(--bg-raised)', boxShadow: 'inset 0 0 0 1px var(--line)', padding: '16px 14px 16px 18px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 12 }}>
      <div><div style={{ fontSize: 'var(--due-label-size)', fontWeight: 700, letterSpacing: 'var(--due-label-tracking)', textTransform: 'var(--caption-transform)', color: 'var(--accent-text)' }}>Next weigh-in</div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><span style={{ fontFamily: 'var(--weighin-date-font)', fontSize: 'var(--weighin-date-size)', fontWeight: 'var(--weighin-date-weight)', lineHeight: 1 }}>Wed 7 Oct</span><span style={{ fontSize: 15, color: 'var(--ink-muted)' }}>in 7 days</span></div></div>
      <Button variant="hero" onClick={() => open('weighin')}>Weigh in</Button>
    </div>
  </div>);
};
})();
