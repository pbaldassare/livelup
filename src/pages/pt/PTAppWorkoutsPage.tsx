import { Navigate, useLocation } from 'react-router-dom';

/** @deprecated Usa /pt/app/templates — redirect di compatibilità */
export function PTAppWorkoutsPage() {
  const location = useLocation();
  return <Navigate to={`/pt/app/templates${location.search}`} replace />;
}

export default PTAppWorkoutsPage;
