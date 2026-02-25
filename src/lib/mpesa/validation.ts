export function normalizeMsisdn(input: string) {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('258')) return digits;
  if (digits.startsWith('84') || digits.startsWith('85')) {
    return `258${digits}`;
  }
  return digits;
}

export function isValidVodacomMsisdn(msisdn: string) {
  return /^258(84|85)\d{7}$/.test(msisdn);
}
