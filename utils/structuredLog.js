/**
 * One-line JSON logs for grep-friendly server output. Never pass secrets or raw bodies.
 *
 * @param {"info" | "warn" | "error"} level
 * @param {Record<string, unknown>} fields
 */
export function logStructured(level, fields) {
  const line = JSON.stringify({ level, ...fields });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
