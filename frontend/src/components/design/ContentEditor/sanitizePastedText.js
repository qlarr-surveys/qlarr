/**
 * Sanitizes pasted text by removing common bullet points, dashes, and list markers
 * @param {string} text - The text to sanitize
 * @returns {string[]} - Array of sanitized lines
 */
export function sanitizePastedText(text) {
  // Split text around newlines
  const lines = text.split(/\r?\n/);

  // Process each line to remove bullet points and dashes
  const sanitizedLines = lines.map((line) => {
    // Remove common bullet point patterns
    const cleanLine = line
      // Remove spaces/tabs at the beginning, so indented items lose their marker too
      .replace(/^\s+/, "")
      // Remove bullet points: •, ◦, ▪, ▫, ‣
      .replace(/^[•◦▪▫‣]\s*/, "")
      // Markers below need a space after them, so "-5", "+18", "1.5" and
      // "e.g." keep their first character.
      // Remove dashes: -, –, —
      .replace(/^[-–—]\s+/, "")
      // Remove asterisks: *
      .replace(/^\*\s+/, "")
      // Remove plus signs: +
      .replace(/^\+\s+/, "")
      // Remove numbered lists: 1., 2), a), (1), etc.
      .replace(/^(\d+|[a-zA-Z])[.)]\s+/, "")
      .replace(/^\(\d+\)\s*/, "")
      .replace(/^\([a-zA-Z]\)\s*/, "");

    return cleanLine;
  });
  return sanitizedLines;
}


