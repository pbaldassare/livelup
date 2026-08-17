import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { peekPostUpdatePath, consumePostUpdatePath, isSafePostUpdatePath } from '@/lib/lastAppPath';

/**
 * If we somehow landed on `/` or `/auth` while a post-update path is saved
 * (and main.tsx sync redirect did not run), restore via client navigate.
 * Does not force reload — only SPA navigation.
 */
export function PostUpdatePathRestorer() {
  const navigate = useNavigate();
  const location = useLocation();
  const didRestoreRef = useRef(false);

  useEffect(() => {
    if (didRestoreRef.current) return;

    const path = peekPostUpdatePath();
    if (!path || !isSafePostUpdatePath(path)) return;

    const current = `${location.pathname}${location.search}${location.hash}`;
    if (current === path) {
      consumePostUpdatePath();
      didRestoreRef.current = true;
      return;
    }

    const onEntry =
      location.pathname === '/' || location.pathname.startsWith('/auth');
    if (!onEntry) return;

    didRestoreRef.current = true;
    consumePostUpdatePath();
    navigate(path, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}

export default PostUpdatePathRestorer;
