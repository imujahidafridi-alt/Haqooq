export const CANONICAL_PRACTICE_AREAS = [
  'Property / Real Estate Law',
  'Family Law',
  'Corporate Law',
  'Criminal Law',
  'Civil Litigation',
  'Labor & Employment',
] as const;

export type PracticeArea = typeof CANONICAL_PRACTICE_AREAS[number];

/**
 * Normalizes legacy specialization strings stored in older user profiles
 * so advocates remain discoverable in search queries.
 */
export const normalizeSpecialization = (raw: string): PracticeArea => {
  const lower = (raw || '').toLowerCase().trim();
  if (lower.includes('property') || lower.includes('real estate') || lower.includes('land')) {
    return 'Property / Real Estate Law';
  }
  if (lower.includes('family') || lower.includes('divorce') || lower.includes('custody') || lower.includes('child')) {
    return 'Family Law';
  }
  if (lower.includes('corporate') || lower.includes('business') || lower.includes('company') || lower.includes('tax')) {
    return 'Corporate Law';
  }
  if (lower.includes('criminal') || lower.includes('bail') || lower.includes('fir') || lower.includes('police')) {
    return 'Criminal Law';
  }
  if (lower.includes('labor') || lower.includes('employment') || lower.includes('workplace')) {
    return 'Labor & Employment';
  }
  return 'Civil Litigation';
};

export const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Peshawar',
  'Multan',
  'Faisalabad',
  'Quetta',
  'Other'
] as const;

export type CityName = typeof CITIES[number];
