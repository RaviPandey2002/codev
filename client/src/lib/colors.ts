const PEER_COLORS = [
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#eab308', // yellow
  '#a855f7', // purple
];

export function getPeerColor(idOrUsername: string): string {
  let hash = 0;
  for (let i = 0; i < idOrUsername.length; i++) {
    hash = (hash << 5) - hash + idOrUsername.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PEER_COLORS.length;
  return PEER_COLORS[index];
}