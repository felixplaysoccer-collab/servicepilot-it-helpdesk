export function canManageTickets(role) {
  return role === 'admin' || role === 'technician';
}

export function canManageAssets(role) {
  return role === 'admin';
}
