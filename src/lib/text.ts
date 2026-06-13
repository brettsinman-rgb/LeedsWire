const htmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  nbsp: " ",
  quot: "\"",
};

function codePointToText(value: number, fallback: string) {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : fallback;
}

export function decodeHtmlEntities(text = "") {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi,
    (entity, code: string) => {
      const normalizedCode = code.toLowerCase();

      if (normalizedCode.startsWith("#x")) {
        const value = Number.parseInt(normalizedCode.slice(2), 16);
        return codePointToText(value, entity);
      }

      if (normalizedCode.startsWith("#")) {
        const value = Number.parseInt(normalizedCode.slice(1), 10);
        return codePointToText(value, entity);
      }

      return htmlEntityMap[normalizedCode] ?? entity;
    },
  );
}

export function normalizeDecodedText(text = "") {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}
