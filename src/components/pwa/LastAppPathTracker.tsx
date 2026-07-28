import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { rememberAppPath } from '@/lib/lastAppPath';

/**
 * Tracks the current PWA path so Index can restore it after a cold start at `/`.
 * Must render inside BrowserRouter + AuthProvider.
 */
export function LastAppPathTracker() {
  const location = useLocation();
  const { role } = useAuth();

  useEffect(() => {
    rememberAppPath(location.pathname, location.search, role);
  }, [location.pathname, location.search, role]);

  return null;
}

export default LastAppPathTracker;
