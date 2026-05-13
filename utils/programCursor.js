/**
 * @param {{ createdAt: Date; id: string }} row
 */
function encodeProgramListCursor(row) {
  const payload = JSON.stringify({
    t: row.createdAt.getTime(),
    i: row.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
}

/**
 * @param {string} cursor
 * @returns {{ createdAt: Date; id: string }}
 */
function decodeProgramListCursor(cursor) {
  const json = Buffer.from(cursor, "base64url").toString("utf8");
  const parsed = JSON.parse(json);
  if (typeof parsed.t !== "number" || typeof parsed.i !== "string") {
    throw new Error("Invalid cursor shape.");
  }
  return { createdAt: new Date(parsed.t), id: parsed.i };
}

module.exports = { encodeProgramListCursor, decodeProgramListCursor };
