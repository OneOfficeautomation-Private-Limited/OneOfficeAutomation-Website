# Sign in with Google and GitHub

Customers can sign in or sign up with **Google** or **GitHub**, and approved partners can sign in to the partner portal with either.
Both providers are free. The buttons appear on `/signin`, `/signup` and `/partner/login` only after you add a provider's id and secret
to the server's settings; with nothing set, the site looks and works exactly as before.

## What it does

| Who | Behaviour |
|---|---|
| **Customer, new** | Creates a free account (or the plan chosen on the sign-up page) from the provider's name and verified email. Company and country start empty; the customer can fill them in under My account. The team gets the usual "new sign-up" notice. |
| **Customer, existing** | Signs in to the account with the same verified email. If that account's email was never confirmed, its password is cleared and any old sessions are signed out first (this stops someone who registered with another person's address from keeping access). |
| **Partner** | Signs in only if the team has already approved a partner user with that email. There is no self-sign-up for partners: unknown emails are told to apply first, and inactive partner organisations are refused. |

Only an email address the provider says is verified is accepted. Suspended or closed customers are refused.

## 1. Google

1. Go to <https://console.cloud.google.com/> → create or choose a project → **APIs & Services → OAuth consent screen**.
   User type **External**, app name "OneOfficeAutomation", your support email, and your domain under authorised domains. Add the scopes
   `openid`, `email` and `profile` (these are not sensitive, so no review is needed). Publish the app (move it out of "Testing"),
   otherwise only listed test users can sign in.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
3. **Authorised redirect URIs:** `https://oneofficeautomation.com/api/oauth/google/callback`
   (for local testing also `http://localhost:3000/api/oauth/google/callback`).
4. Copy the **Client ID** and **Client secret**.

## 2. GitHub

1. GitHub → your organisation (or your account) → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Homepage URL:** `https://oneofficeautomation.com`
   **Authorization callback URL:** `https://oneofficeautomation.com/api/oauth/github/callback`
   (GitHub allows one callback per app; make a second app for local testing with `http://localhost:3000/api/oauth/github/callback`.)
3. **Generate a new client secret**, then copy the **Client ID** and the secret.

## 3. Add the keys: in the admin (easiest) or in the server settings

**In the admin (full admins only):** sign in at `/admin` → **Team and settings → Settings → Sign in with Google and GitHub**. For each provider paste
the Client ID and the Client secret, tick "Show Continue with …", and Save. The page shows the exact callback address to give Google or GitHub.
The secret is stored encrypted in the database and is never shown again (leave it empty to keep it, or paste a new one to replace it). Every change
is recorded in the Activity log without the secret. Changes apply at once. Set `SITE_URL` on the server first (below), because the callback address is
built from it.

If you later change `JWT_SECRET`, the saved secrets can no longer be read; paste them again.

**Or in the server settings** (keys here take priority over the admin ones, and the admin then shows them as "set on the server"):

On the VPS, edit `/srv/ooa/shared/.env` (on Hostinger web apps: the app's Environment variables) and add the ones you set up:

```
SITE_URL=https://oneofficeautomation.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

`SITE_URL` must be the exact public address, because the callback address is built from it. Then reload: `pm2 reload ooa --update-env`.
Open `/signin`: the "Continue with Google / GitHub" buttons should be there. You can set up one provider only; the other button stays hidden.

## Notes

- **Cost:** neither provider charges for sign-in. Google asks for verification only if you request sensitive scopes, which this does not.
- **Privacy:** the site stores the provider's account id and the email, and nothing else. Mention Google and GitHub sign-in in the privacy policy.
- **Customers who signed up with a password** can also use the buttons later (same email), and **OAuth customers** can set a password any time
  with "Forgot your password?".
- **Troubleshooting:** a `redirect_uri_mismatch` error from Google or a "redirect_uri is not associated" error from GitHub means the callback
  address in the provider's settings differs from `SITE_URL` plus `/api/oauth/<provider>/callback`. The page shows a short message for other
  problems (expired sign-in, denied, no verified email), and the server log has the detail.
