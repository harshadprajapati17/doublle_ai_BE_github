/**
 * @param {string | null | undefined} ip
 * @returns {{ full: string; prefix24: string | null } | null}
 */
export function parseClientIp(ip) {
  if (ip == null || typeof ip !== "string") return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  const v4 = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1, 5).map((p) => Number(p));
    if (octets.some((n) => n > 255)) return null;
    return {
      full: trimmed,
      prefix24: `${octets[0]}.${octets[1]}.${octets[2]}.0/24`,
    };
  }

  return { full: trimmed, prefix24: null };
}

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 */
export function ipsOverlap(a, b) {
  const pa = parseClientIp(a);
  const pb = parseClientIp(b);
  if (!pa || !pb) return { overlap: false, exact: false, prefix24: false };
  if (pa.full === pb.full) {
    return { overlap: true, exact: true, prefix24: Boolean(pa.prefix24 && pa.prefix24 === pb.prefix24) };
  }
  if (pa.prefix24 && pb.prefix24 && pa.prefix24 === pb.prefix24) {
    return { overlap: true, exact: false, prefix24: true };
  }
  return { overlap: false, exact: false, prefix24: false };
}
