import { useLocation } from 'react-router-dom';
import { ptRoutes, ptRoutesForPath, type PTRouteSet } from '@/lib/pt/routes';

export function usePTRoutes(forceApp = false): { isApp: boolean; routes: PTRouteSet } {
  const { pathname } = useLocation();
  const isApp = forceApp || pathname.startsWith('/pt/app');
  return {
    isApp,
    routes: isApp ? ptRoutes.app : ptRoutes.web,
  };
}

export { ptRoutes, ptRoutesForPath };
