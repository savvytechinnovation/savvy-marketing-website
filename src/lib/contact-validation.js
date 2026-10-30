// Shared by the browser (src/home/form.js) and the Vercel function (api/contact.js)
// so both sides apply exactly the same rules.

export const SERVICES = ['Strategy & Growth', 'Content & Social', 'Performance Media', 'Branding', 'Web & Landing Pages'];
export const BUDGETS = ['< $5k', '$5k – $15k', '$15k – $50k', '$50k+'];

const LIMITS = { name: 100, email: 150, company: 120, website: 200, message: 3000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * @param {Record<string, unknown>} input raw form data
 * @returns {{ values: object, errors: Record<string, string> }}
 */
export function validateContact(input = {}) {
  const values = {
    name: str(input.name, LIMITS.name),
    email: str(input.email, LIMITS.email).toLowerCase(),
    company: str(input.company, LIMITS.company),
    website: str(input.website, LIMITS.website),
    services: (Array.isArray(input.services) ? input.services : [])
      .filter((s) => SERVICES.includes(s))
      .slice(0, SERVICES.length),
    budget: BUDGETS.includes(input.budget) ? input.budget : '',
    message: str(input.message, LIMITS.message),
    consent: input.consent === true || input.consent === 'on' || input.consent === 'true',
  };

  const errors = {};
  if (values.name.length < 2) errors.name = 'Please tell us your name.';
  if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.';
  if (values.website && !isHttpUrl(values.website)) errors.website = 'Use a full URL, e.g. https://yourbrand.com';
  if (values.message.length < 20) errors.message = 'A couple of sentences (20+ characters) helps us prepare.';
  if (!values.consent) errors.consent = 'Please confirm we can contact you.';

  return { values, errors };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
