import { Navigate } from 'react-router-dom';

// =====================================================
// LEGACY ROUTE — ridiretto al nuovo "Programma"
// Mantenuto per retrocompatibilità di link e tour.
// =====================================================
export function AtletaSchedaPage() {
  return <Navigate to="/app/programma" replace />;
}

export default AtletaSchedaPage;
