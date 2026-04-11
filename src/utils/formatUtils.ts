/**
 * Format a point value with sign prefix and 1 decimal place.
 * Positive values get a '+' prefix, negative keep '-', zero has no prefix.
 */
export const formatPoint = (pt: number): string => {
  const prefix = pt > 0 ? '+' : '';
  return `${prefix}${pt.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
};

/**
 * Format an average rank value with exactly 1 decimal place.
 */
export const formatAverageRank = (rank: number): string => rank.toFixed(1);
