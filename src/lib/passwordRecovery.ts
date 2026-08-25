export const PASSWORD_RECOVERY_FLAG = 'livellapp:password-recovery'

export function markPasswordRecovery(): void {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_FLAG, '1')
  } catch {
    /* ignore */
  }
}

export function clearPasswordRecovery(): void {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG)
  } catch {
    /* ignore */
  }
}

export function hasPasswordRecoveryFlag(): boolean {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_FLAG) === '1'
  } catch {
    return false
  }
}

function hashType(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  return new URLSearchParams(raw).get('type')
}

/** Link email / sessione recovery: non reindirizzare a home o ultima pagina PWA. */
export function isPasswordRecoveryLocation(
  pathname: string,
  search = '',
  hash = '',
): boolean {
  if (pathname === '/auth/reset-password' || pathname.startsWith('/auth/reset-password/')) {
    return true
  }
  if (pathname === '/auth' || pathname.startsWith('/auth/')) {
    const queryType = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('type')
    if (queryType === 'recovery') return true
    if (hashType(hash) === 'recovery') return true
    if (hasPasswordRecoveryFlag()) return true
  }
  return false
}

/** Solo `/` e login `/auth` (senza recovery) possono ripristinare l’ultima schermata PWA. */
export function isAuthColdStartEntry(pathname: string, search = '', hash = ''): boolean {
  if (isPasswordRecoveryLocation(pathname, search, hash)) return false
  return pathname === '/' || pathname === '/auth'
}
