Settings/Data row: bold title, muted hint, and a chevron or a Toggle. Put inside ListGroup.

```jsx
<ListRow title="Export data" hint="Exported 3 days ago." trailing="chevron" />
<ListRow title="Protein line" hint="…" trailing={<Toggle checked label="Protein line" />} />
```
