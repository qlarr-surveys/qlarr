import { Request } from 'express';

/**
 * Best-effort client IP, walking a proxy-header cascade before falling back to
 * the socket address. Used only for signup attribution, so an imperfect result
 * is harmless.
 */
export function getClientIp(req: Request): string {
  const headerOrder = [
    'x-forwarded-for',
    'proxy-client-ip',
    'wl-proxy-client-ip',
    'http_client_ip',
    'http_x_forwarded_for',
  ];
  for (const name of headerOrder) {
    const raw = req.headers[name];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && value.trim() && value.toLowerCase() !== 'unknown') {
      // X-Forwarded-For may be a comma-separated chain; take the first hop.
      return normalizeIp(value.split(',')[0]);
    }
  }
  return normalizeIp(req.socket?.remoteAddress ?? '');
}

// Strip the IPv4-mapped IPv6 prefix so `::ffff:10.1.101.70` reads as `10.1.101.70`.
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '');
}
