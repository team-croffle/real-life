const grouping = new Intl.NumberFormat('en-US');

/** 골드·가격·경험치 표시. 1240 → 1,240 */
export function formatAmount(value: number): string {
  return grouping.format(value);
}
