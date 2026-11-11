// Shared by the browser (src/pages/resources/newsletter.js) and the Vercel function (api/subscribe.js)
// so both sides apply exactly the same rules.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { email: 150, source: 200 };

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * @param {Record<string, unknown>} input raw form data ({ email, consent, source })
 * @returns {{ values: { email: string, consent: boolean, source: string }, errors: Record<string, string> }}
 */
export function validateNewsletter(input = {}) {
  const values = {
    email: str(input.email, LIMITS.email).toLowerCase(),
    consent: input.consent === true || input.consent === 'on' || input.consent === 'true',
    // page the visitor subscribed from, e.g. "/resources/" (path only, never a full URL)
    source: /^\/[\w\-/]*$/.test(str(input.source, LIMITS.source)) ? str(input.source, LIMITS.source) : '/resources/',
  };

  const errors = {};
  if (!values.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address, e.g. name@company.com.';
  if (!values.consent) errors.consent = 'Please confirm you would like to receive our emails.';

  return { values, errors };
}
