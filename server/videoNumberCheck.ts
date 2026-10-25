export function normalizePhone(value: string): string {
  const cleaned = value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  let digits = cleaned.replace(/\D/g, '');

  if (digits.startsWith('0062')) digits = `62${digits.slice(4)}`;
  if (digits.startsWith('08')) digits = `62${digits.slice(1)}`;
  if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
    digits = `62${digits}`;
  }

  return digits;
}

export function isValidPhoneNumber(value: string): boolean {
  const digits = normalizePhone(value);
  return digits.length >= 7 && digits.length <= 15;
}

function phoneVariants(phoneNumber: string): Set<string> {
  const normalized = normalizePhone(phoneNumber);
  const variants = new Set([normalized]);

  if (normalized.startsWith('62') && normalized.length > 2) {
    variants.add(`0${normalized.slice(2)}`);
  } else if (normalized.startsWith('0') && normalized.length > 1) {
    variants.add(`62${normalized.slice(1)}`);
  }

  return variants;
}

export function phoneAppearsInOcr(recognizedText: string, phoneNumber: string): boolean {
  const expectedNumbers = phoneVariants(phoneNumber);
  if (![...expectedNumbers].some((number) => number.length >= 7 && number.length <= 15)) {
    return false;
  }

  const lines = recognizedText
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .split(/\r?\n/);
  const candidatePattern = /(?:^|[^\d])((?:\d[\s().-]*){6,14}\d)(?![\s().-]*\d)/g;

  return lines.some((line) => {
    candidatePattern.lastIndex = 0;
    for (const match of line.matchAll(candidatePattern)) {
      const candidate = match[1].replace(/\D/g, '');
      const normalizedCandidate = normalizePhone(candidate);
      if (expectedNumbers.has(candidate) || expectedNumbers.has(normalizedCandidate)) {
        return true;
      }
    }
    return false;
  });
}
