export function normalizeTopicLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

function getTokenSignature(label: string): string {
  return normalizeTopicLabel(label)
    .split(" ")
    .filter(Boolean)
    .map(normalizeToken)
    .sort()
    .join(" ");
}

function getBigrams(label: string): string[] {
  const compact = normalizeTopicLabel(label).replace(/\s+/g, "");

  if (compact.length < 2) {
    return compact ? [compact] : [];
  }

  const bigrams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    bigrams.push(compact.slice(index, index + 2));
  }

  return bigrams;
}

function getDiceCoefficient(a: string, b: string): number {
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  if (aBigrams.length === 0 || bBigrams.length === 0) {
    return 0;
  }

  const remaining = [...bBigrams];
  let matches = 0;

  for (const bigram of aBigrams) {
    const matchIndex = remaining.indexOf(bigram);

    if (matchIndex >= 0) {
      matches += 1;
      remaining.splice(matchIndex, 1);
    }
  }

  return (2 * matches) / (aBigrams.length + bBigrams.length);
}

export function areTopicsSimilar(a: string, b: string): boolean {
  const normalizedA = normalizeTopicLabel(a);
  const normalizedB = normalizeTopicLabel(b);

  if (!normalizedA || !normalizedB) {
    return false;
  }

  if (normalizedA === normalizedB) {
    return true;
  }

  if (getTokenSignature(normalizedA) === getTokenSignature(normalizedB)) {
    return true;
  }

  const [shorter, longer] =
    normalizedA.length <= normalizedB.length
      ? [normalizedA, normalizedB]
      : [normalizedB, normalizedA];

  if (shorter.length >= 10 && longer.includes(shorter)) {
    return true;
  }

  return (
    shorter.length >= 8 && getDiceCoefficient(normalizedA, normalizedB) >= 0.9
  );
}

export function dedupeTopics(
  labels: string[],
  existingLabels: string[] = [],
): string[] {
  const accepted: string[] = [];

  for (const rawLabel of labels) {
    const label = rawLabel.trim();
    if (!label) continue;

    const isDuplicate = [...existingLabels, ...accepted].some((existing) =>
      areTopicsSimilar(existing, label),
    );

    if (!isDuplicate) {
      accepted.push(label);
    }
  }

  return accepted;
}
