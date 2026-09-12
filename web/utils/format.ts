export const formatCurrency = (value?: number | null) => {
  const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0
  }).format(numericValue);
};

export const formatDate = (timestamp?: number | string | null) => {
  if (!timestamp) return '—';
  const numericTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(numericTime)) return '—';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(numericTime);
};

export const formatRelative = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
