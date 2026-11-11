// Shared by the browser (src/pages/portal/portal.js) and the Vercel function (api/portal-login.js)
// so both sides apply exactly the same rules.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const ACTIONS = ['signin', 'reset', 'google'];

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * @param {Record<string, unknown>} input  { action, email, password, remember }
 * @returns {{ values: object, errors: Record<string, string> }}
 */
export function validatePortal(input = {}) {
  const action = ACTIONS.includes(input.action) ? input.action : 'signin';
  const values = {
    action,
    email: str(input.email, 150).toLowerCase(),
    // passwords are never trimmed (spaces can be part of a password)
    password: typeof input.password === 'string' ? input.password.slice(0, 200) : '',
    remember: input.remember === true || input.remember === 'on' || input.remember === 'true',
  };
  const errors = {};
  if (action !== 'google') {
    if (!values.email) errors.email = 'Enter the email you use for the portal.';
    else if (!EMAIL_RE.test(values.email)) errors.email = 'Enter a valid email address, like name@company.com.';
  }
  if (action === 'signin' && !values.password) errors.password = 'Enter your password.';
  return { values, errors };
}
