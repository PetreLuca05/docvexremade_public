// A country's name in Romanian ("RO" -> "România").
export function countryName(code) {
  try {
    return new Intl.DisplayNames(['ro'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
