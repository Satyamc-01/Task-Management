export function parseProtected() {
  const emailSet = new Set(
    (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const idSet = new Set(
    (process.env.ADMIN_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
  return { emailSet, idSet };
}

export function isProtectedUser(user) {
  const { emailSet, idSet } = parseProtected();
  const email = (user.email || '').toLowerCase();
  const id = String(user._id || user.id || '');
  return (email && emailSet.has(email)) || (id && idSet.has(id));
}
