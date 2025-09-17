// Lightweight fallback for formatDistanceToNow to avoid date-fns dependency in strict envs
export function formatDistanceToNow(date: Date, opts?: { addSuffix?: boolean }): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let value = '';
  if (days > 0) value = `${days} day${days === 1 ? '' : 's'}`;
  else if (hours > 0) value = `${hours} hour${hours === 1 ? '' : 's'}`;
  else if (minutes > 0) value = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  else value = `${seconds} second${seconds === 1 ? '' : 's'}`;

  return opts?.addSuffix ? `${value} ago` : value;
}

