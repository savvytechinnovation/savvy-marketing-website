// Vercel Function: POST /api/portal-login  (client portal sign-in on /portal/sign-in/)
//
// ⚠️  THERE IS NO AUTHENTICATION BACKEND YET.
// This endpoint only validates the request shape and then answers 503 { error: 'not_configured' }, so the sign-in
// page can tell clients honestly that portal sign-in isn't available. It never checks, stores or logs passwords.
//
// Before launch it must be connected to a real identity provider (e.g. Auth0, Clerk, Supabase Auth, Firebase Auth,
// or the CRM's own SSO), following the Figma flows "Portal Sign In 🟢" (invite-only accounts, Google sign-in only for
// invited emails, password reset, expired invitations). Recommended: let the provider host the credential exchange
// (OAuth / OIDC redirect) instead of POSTing passwords to this function, and issue an HttpOnly, Secure, SameSite
// session cookie on success. Add rate limiting before accepting real credentials.
//
// Request:  { action: 'signin' | 'reset' | 'google', email, password?, remember?, botField? }
// Responses:
//   400 { ok:false, error:'validation', fields:{ email?, password? } }   invalid input (same rules as the browser)
//   405 { ok:false, error:'method_not_allowed' }
//   503 { ok:false, error:'not_configured' }                               always, until an identity provider is wired up
import { validatePortal } from '../src/pages/portal/portal-validation.js';
import { readJsonBody } from './_lib/deliver.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const { body, error, status } = readJsonBody(req);
  if (error) return res.status(status).json({ ok: false, error });

  const { values, errors } = validatePortal(body);
  // A filled honeypot is treated like any other request: nothing is processed either way.
  if (Object.keys(errors).length && !(typeof body.botField === 'string' && body.botField.trim()))
    return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  void values; // TODO(identity provider): authenticate / start reset / start Google OAuth here.
  return res.status(503).json({
    ok: false,
    error: 'not_configured',
    message: 'Client portal sign-in is not connected to an identity provider yet.',
  });
}
