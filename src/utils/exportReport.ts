import type { MatchDetail, OverallStanding } from './competitionReport';
import { formatAverageRank } from './formatUtils';

const BOM = '\uFEFF';

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

const escapeCsvField = (value: string | number): string => {
  const str = String(value);
  // Guard against CSV formula injection (OWASP)
  if (FORMULA_PREFIX.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsvRow = (fields: (string | number)[]): string => fields.map(escapeCsvField).join(',');

export const generateCsvBlob = (
  standings: OverallStanding[],
  details: MatchDetail[],
  useChip: boolean,
): Blob => {
  const lines: string[] = [];

  // Overall standings section
  lines.push('--- 総合成績 ---');
  const standingHeader = ['順位', '参加者名', '対局数', '合計ポイント', '平均順位'];
  if (useChip) standingHeader.push('チップ収支');
  lines.push(toCsvRow(standingHeader));

  for (const s of standings) {
    const row: (string | number)[] = [
      s.rank,
      s.name,
      s.gameCount,
      s.totalPoint,
      formatAverageRank(s.averageRank),
    ];
    if (useChip) row.push(s.totalChip);
    lines.push(toCsvRow(row));
  }

  lines.push('');

  // Match details section
  lines.push('--- 対局別詳細 ---');
  const detailHeader = ['卓名', '対局番号', '参加者名', '順位', '素点', 'ポイント'];
  if (useChip) detailHeader.push('チップ収支');
  lines.push(toCsvRow(detailHeader));

  for (const d of details) {
    const row: (string | number)[] = [
      d.tableName,
      d.gameIndex,
      d.name,
      d.rank,
      d.rawScore,
      d.point,
    ];
    if (useChip) row.push(d.chipDiff);
    lines.push(toCsvRow(row));
  }

  return new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const generateReportFilename = (competitionName: string, ext: string): string => {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = competitionName.replace(/[/\\?%*:|"<>]/g, '_');
  return `${safeName}_report_${date}.${ext}`;
};

export const generatePdfReport = (): void => {
  window.print();
};
