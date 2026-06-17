import PTWorkoutsPage from './PTWorkoutsPage';

// =====================================================
// PT APP TEMPLATES PAGE - Schede/Template (Mobile/PWA)
// Riusa la pagina web. Per ora /pt/app/workouts copre già
// la creazione/lista; questo wrapper espone gli stessi
// template sotto il path /pt/app/templates per coerenza.
// =====================================================
export function PTAppTemplatesPage() {
  return (
    <div className="pb-4 px-2 pt-2">
      <PTWorkoutsPage />
    </div>
  );
}

export default PTAppTemplatesPage;
