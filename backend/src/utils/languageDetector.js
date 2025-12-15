export function detectLanguage(text = "") {
  const t = text.toLowerCase();

  // Manual user command overrides
  if (t.includes("speak hindi") || t.includes("hindi mein"))
    return "hi";
  if (t.includes("speak kannada") || t.includes("kannada") || t.includes("maathu"))
    return "kn";

  // Natural text detection
  const hindiChars = /[\u0900-\u097F]/;
  const kannadaChars = /[\u0C80-\u0CFF]/;

  if (hindiChars.test(text)) return "hi";
  if (kannadaChars.test(text)) return "kn";

  return "en"; // Default English
}
