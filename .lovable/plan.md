

## Fix: Aggiungere la route mancante `/admin/settings`

Il componente `AdminSettingsPage` è importato in `App.tsx` (riga 50) ma non è mai registrato come route. Questo causa il 404.

### Modifica

**File: `src/App.tsx`**
- Aggiungere la route `/admin/settings` dopo la route `/admin/courses` (dopo riga 223), con lo stesso pattern delle altre route admin:

```tsx
<Route path="/admin/settings" element={
  <AdminRoute>
    <AdminLayout>
      <AdminSettingsPage />
    </AdminLayout>
  </AdminRoute>
} />
```

Nessun'altra modifica necessaria.

