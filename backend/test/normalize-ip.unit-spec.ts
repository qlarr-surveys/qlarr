import { normalizeIp } from '../src/common/http';

describe('normalizeIp', () => {
  it('strips the IPv4-mapped IPv6 prefix from an IPv4 address', () => {
    expect(normalizeIp('::ffff:10.1.101.70')).toBe('10.1.101.70');
    expect(normalizeIp('::ffff:203.0.113.5')).toBe('203.0.113.5');
  });

  it('is case-insensitive on the prefix', () => {
    expect(normalizeIp('::FFFF:10.1.101.70')).toBe('10.1.101.70');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeIp('  ::ffff:10.1.101.70  ')).toBe('10.1.101.70');
  });

  it('leaves a plain IPv4 address untouched', () => {
    expect(normalizeIp('10.1.101.70')).toBe('10.1.101.70');
  });

  it('leaves a genuine IPv6 address untouched', () => {
    expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    expect(normalizeIp('::1')).toBe('::1');
  });

  it('does not strip the prefix when it is not followed by a bare IPv4 address', () => {
    // IPv4-mapped form with an extra IPv6 segment is not a plain IPv4 tail.
    expect(normalizeIp('::ffff:10.1.101.70:1234')).toBe('::ffff:10.1.101.70:1234');
    expect(normalizeIp('::ffff:cafe')).toBe('::ffff:cafe');
  });

  it('handles an empty string', () => {
    expect(normalizeIp('')).toBe('');
  });
});
