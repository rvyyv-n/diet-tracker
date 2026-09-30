Modal surface: a bottom sheet with grabber on phone, a 520px centred dialog on desktop. Includes the scrim. Parent must be position:relative and clip overflow.

```jsx
<Sheet title="Log food" meta="Wed 30 Sep" onClose={...}>…</Sheet>
<Sheet variant="dialog" title="Weigh in" navInset={256}>…</Sheet>
```
