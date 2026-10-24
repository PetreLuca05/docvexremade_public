// A country's name in the dashboard's language ("RO" -> "România").
export function countryName(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
