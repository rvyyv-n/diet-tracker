(function(){
const { Eyebrow, SectionHeading, GroceryList, PhaseLadder, ListGroup, ListRow } = window.DS;
const D = window.RiseData;
window.PlanScreen = function PlanScreen({ groceries, toggleG, clearG }) {
  const total = groceries.reduce((n, a) => n + a.items.length, 0), done = groceries.reduce((n, a) => n + a.items.filter(i => i.done).length, 0);
  return (<div style={{ paddingBottom: 110 }}>
    <div style={{ padding: '0 20px', marginTop: 10 }}><Eyebrow>Phase 2 · Week 6</Eyebrow></div>
    <div style={{ padding: '0 20px', marginTop: 6, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-lg)', lineHeight: 1.1 }}>Plan</div>
    <div style={{ padding: '0 20px', marginTop: 6, fontSize: 16, color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>3,110 kcal · 150 g protein a day</div>
    <div style={{ padding: '0 20px', marginTop: 24 }}><SectionHeading meta={<><b style={{ color: 'var(--ink)' }}>{done} of {total}</b> ticked · new list Mon</>}>Groceries</SectionHeading></div>
    <div style={{ margin: '10px 20px 0' }}><GroceryList aisles={groceries} scaleNote="Quantities for Phase 2." onToggle={toggleG} onClear={clearG} /></div>
    <div style={{ padding: '0 20px', marginTop: 28 }}><SectionHeading>Targets</SectionHeading></div>
    <div style={{ margin: '10px 20px 0' }}><PhaseLadder rungs={D.LADDER} /></div>
    <div style={{ margin: '18px 20px 0' }}><ListGroup><ListRow title="Recipes" hint="Your book, the meals and the food table." trailing="chevron" onClick={() => {}} /></ListGroup></div>
  </div>);
};
})();
