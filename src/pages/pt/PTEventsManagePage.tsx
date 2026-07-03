import { Navigate } from 'react-router-dom';

/** @deprecated Usare /pt/events (pagina unificata calendario + elenco). */
export default function PTEventsManagePage() {
  return <Navigate to="/pt/events" replace />;
}
