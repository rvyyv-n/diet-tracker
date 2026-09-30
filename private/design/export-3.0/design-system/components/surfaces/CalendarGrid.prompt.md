Month grid for the calendar sheet: 48px day cells with an intake dot beneath the number, today ringed, plus the On track / Partial / Low legend. Put inside Sheet.

```jsx
<CalendarGrid month="September" leadingBlanks={1} days={[{n:1,status:'on-track'}, …, {n:30,status:'today'}]} note="Days before 17 Aug have no plan." />
```
