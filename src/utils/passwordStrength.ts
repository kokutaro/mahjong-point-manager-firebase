export const calculatePasswordStrength = (
  pass: string,
): { score: number; label: string; color: string } => {
  if (!pass) return { score: 0, label: '', color: '#e0e0e0' };

  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 10) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  // Normalize to 0-4 range for 4 bars display, but simplify logic for user feedback
  // Simple logic:
  // < 6 chars: Too short (0)
  // Weak: score 1-2
  // Medium: score 3-4
  // Strong: score 5

  if (pass.length < 6) return { score: 1, label: '短すぎます', color: '#ff4d4f' }; // Red
  if (score <= 2) return { score: 2, label: '弱い', color: '#ff4d4f' }; // Red
  if (score <= 4) return { score: 3, label: '普通', color: '#faad14' }; // Orange
  return { score: 4, label: '強い', color: '#52c41a' }; // Green
};
