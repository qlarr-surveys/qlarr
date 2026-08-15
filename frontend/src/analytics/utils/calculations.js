// Statistical calculations for survey data (client-side only)
// Most calculations have been moved to the backend.
// Only functions needed for raw-response types (TEXT, EMAIL, BARCODE) remain here.

// Calculate frequency distribution
export const calculateFrequency = (values) => {
  const freq = {};
  values.forEach((val) => {
    freq[val] = (freq[val] || 0) + 1;
  });
  return Object.entries(freq)
    .map(([value, count]) => ({ value, count, percentage: Math.round((count / values.length) * 100) }))
    .sort((a, b) => b.count - a.count);
};

// Calculate email domain distribution
export const calculateEmailDomains = (emails) => {
  const domains = {};

  emails.forEach((email) => {
    if (!email || !email.includes('@')) {
      return;
    }
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      domains[domain] = (domains[domain] || 0) + 1;
    }
  });

  return {
    domains: Object.entries(domains)
      .map(([domain, count]) => ({ domain, count, percentage: Math.round((count / emails.length) * 100) }))
      .sort((a, b) => b.count - a.count),
    uniqueDomains: Object.keys(domains).length,
  };
};
