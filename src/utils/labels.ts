/** Spreadsheet-style letter label: 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, ... */
export function markerLabel(index: number): string {
  let n = index + 1
  let label = ''
  while (n > 0) {
    n--
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26)
  }
  return label
}
