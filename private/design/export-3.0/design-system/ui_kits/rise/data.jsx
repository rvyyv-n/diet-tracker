(function(){
const BLOCKS = [
  { id: 'b1', t: '08:00', n: 'Breakfast', d: 'Eggs, flatbreads, milk, butter', k: 705, p: 34, swap: 1 },
  { id: 'b2', t: '11:00', n: 'Shake', d: 'Milk, banana, PB, oats', k: 580, p: 22, key: 1 },
  { id: 'b3', t: '13:30', n: 'Lunch', d: 'Chicken curry and rice', k: 580, p: 33, swap: 1 },
  { id: 'a1', t: '16:00', n: 'Snack', d: 'Yogurt, dates and almonds', k: 290, p: 11, swap: 1, add: 1 },
  { id: 'b4', t: '19:30', n: 'Dinner', d: 'Egg curry, lentil stew, flatbreads', k: 700, p: 37, swap: 1 },
  { id: 'a2', t: '22:00', n: 'Pre-bed', d: 'Milk and peanut butter', k: 255, p: 12, add: 1 }
];
const RECIPES = [{ name: 'Overnight oats', kcal: 620, prot: 23 }, { name: 'Chicken wrap', kcal: 420, prot: 24 }, { name: 'Peanut butter banana toast', kcal: 480, prot: 15 }];
const SWAPS = [{ name: 'Yogurt, dates and almonds', kcal: 290, prot: 11 }, { name: 'Banana and peanut butter', kcal: 295, prot: 9 }, { name: 'Yogurt, oats and honey', kcal: 290, prot: 11 }];
const AISLES = [
  { name: 'Dairy & eggs', icon: 'dairy', items: [['Full-fat milk', '7.5 L'], ['Eggs', '24'], ['Yogurt', '2 kg']] },
  { name: 'Protein', icon: 'protein', items: [['Chicken', '1 kg']] },
  { name: 'Produce', icon: 'produce', items: [['Bananas', '7']] },
  { name: 'Pantry', icon: 'pantry', items: [['Peanut butter', '1 jar'], ['Oats', '500 g'], ['Basmati rice', '1 kg'], ['Wholemeal flour', '1 kg'], ['Dates', '250 g'], ['Almonds', '150 g']] }
];
const LADDER = [
  { name: 'Ramp-up', status: 'Done', when: 'Weeks 1–2', kcal: '2,565 kcal', protein: '128 g protein', state: 'past' },
  { name: 'Target', status: 'Now', when: 'Week 3 on', kcal: '3,110 kcal', protein: '150 g protein', state: 'now' },
  { name: 'Pushed', status: 'If stalled', when: 'Adds Shake 2 at 17:00', kcal: '3,690 kcal', protein: '172 g protein', state: 'next' }
];
const fmt = n => n.toLocaleString('en-US');
window.RiseData = { BLOCKS, RECIPES, SWAPS, AISLES, LADDER, fmt, TARGET: 3110, PROTEIN: 150, CLOCK: '16:10' };
})();
