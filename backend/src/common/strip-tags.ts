/** Remove HTML tags, newlines and &nbsp; from a string. */
export function stripTags(s: string): string {
  return s.replace(/<[^>]*>?/g, '').replace(/\n/g, '').replace(/&nbsp;/g, '');
}
