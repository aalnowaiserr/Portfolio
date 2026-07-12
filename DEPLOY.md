# Deploying — GitHub Pages + custom domain + Cloudflare

Static site, no build step. Push to `main` and GitHub Pages redeploys.

---

## ⚠️ The one thing you must not skip

**GitHub Pages cannot serve custom response headers. At all.**

No `_headers`, no `.htaccess`, no config file, no setting. Every response uses
GitHub's fixed headers and there is no way to add to them. This is a harder limit
than most static hosts — it is not a matter of finding the right config file,
because there isn't one.

What that means concretely:

- The CSP in the `<meta>` tag in `index.html` **does** work. It covers `script-src`,
  `style-src`, `font-src`, `img-src`, `object-src`, `base-uri`, `form-action`.
- **`frame-ancestors`, `X-Frame-Options`, `Strict-Transport-Security`,
  `Permissions-Policy`, COOP/CORP and `X-Robots-Tag` are header-only.** A
  `<meta http-equiv>` cannot express any of them — browsers ignore the attempt.

So: **GitHub Pages serves the files, Cloudflare enforces the security headers.**
Until step 4 is done, the site is framable by any origin (clickjacking) and has
no HSTS.

> There is no `_headers` file in this repo, deliberately. That format is a
> Netlify / Cloudflare Pages convention which GitHub Pages ignores, so it would
> enforce nothing while looking like it did — the worst property a security
> control can have. **This document is the single source of truth for the header
> set.**

---

## 1. Enable Pages

**Settings → Pages**

- Source: **Deploy from a branch**
- Branch: **`main`**, folder **`/ (root)`**

The repo must be **public** (Pages from a private repo needs GitHub Pro).

### Do not delete `.nojekyll`

That empty file at the repo root is load-bearing. Without it, Pages runs the
content through Jekyll, which **silently drops every file and directory whose
name starts with `.` or `_`** — including `.well-known/security.txt`, which would
404 with no error anywhere. `.nojekyll` tells Pages to serve the tree verbatim.

## 2. Custom domain

**Settings → Pages → Custom domain** → enter the domain → Save.

GitHub writes a `CNAME` file to the repo root for you. Don't hand-write it; let
GitHub create it, then `git pull` so your local copy matches.

## 3. DNS + certificate  ← read the gotcha

In Cloudflare DNS, for an apex domain (`example.com`):

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `aalnowaiserr.github.io` | see below |

(Cloudflare's CNAME flattening makes an apex CNAME legal. For a `www` subdomain,
use `www` as the name instead.)

> ### The gotcha that wastes everyone an afternoon
>
> **Set the record to DNS-only (grey cloud) FIRST.**
>
> GitHub provisions the site's Let's Encrypt certificate over an HTTP-01
> challenge against your domain. If Cloudflare's proxy (orange cloud) is already
> in front, GitHub cannot complete that challenge, certificate issuance fails,
> and **"Enforce HTTPS" stays greyed out in Settings → Pages** with no useful
> explanation.
>
> Order of operations:
> 1. Grey cloud (DNS only).
> 2. Wait for Settings → Pages to report the certificate is provisioned
>    (minutes to ~an hour), then tick **Enforce HTTPS**.
> 3. **Only then** switch the record to orange cloud (Proxied).

Then under Cloudflare **SSL/TLS**:

- Encryption mode: **Full (strict)** — GitHub Pages presents a valid public cert
  once step 2 above has completed, so strict works. Do not use Flexible: it makes
  Cloudflare talk plain HTTP to the origin and can cause redirect loops.
- **Always Use HTTPS**: on
- **Minimum TLS Version**: 1.2

## 4. Add the security headers (Transform Rule)

This is the step that actually hardens the site.

**Rules → Transform Rules → Modify Response Header → Create rule.**

Name it `Security headers`, filter **All incoming requests**, and add each of the
following as a **Set static** header:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `0` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=(), interest-cohort=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

`X-XSS-Protection: 0` is correct, not a typo. The legacy XSS auditor it enables is
itself exploitable and has been removed from modern browsers; `1; mode=block` is
actively discouraged. The CSP is the real defence.

Do **not** add `Cross-Origin-Embedder-Policy: require-corp`. It buys nothing here
(no SharedArrayBuffer, no cross-origin subresources) and will break the first
third-party image or script you ever add.

### HSTS

Don't set `Strict-Transport-Security` by hand — Cloudflare has a dedicated toggle
that handles the edge cases:

**SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) → Enable**

- Max-Age: **12 months**
- Include subdomains: **on**
- Preload: leave **off** until you are certain *every* subdomain will be
  HTTPS-only forever. Preloading is compiled into browser binaries and is
  genuinely painful to reverse.

### PDF handling

Second Transform Rule, `PDF privacy`. Filter (Edit expression):

```
ends_with(http.request.uri.path, ".pdf")
```

Set static headers:

| Header | Value |
|---|---|
| `X-Robots-Tag` | `noindex, noimageindex, noarchive, nosnippet` |
| `Content-Disposition` | `attachment` |

`Content-Disposition: attachment` is what actually forces the résumé to download
instead of rendering in the browser's PDF viewer. The HTML `download` attribute on
the links is a hint only; this header is the enforcement.

`robots.txt` deliberately does **not** `Disallow` the PDFs. Blocking the crawl
would stop Google from ever *seeing* the `noindex` header, and it could still list
the bare URL. Letting it crawl and read `noindex` is what de-indexes the file.

### Font caching (optional, performance only)

Third rule, `Font caching`. Filter:

```
starts_with(http.request.uri.path, "/fonts/")
```

Set `Cache-Control` to `public, max-age=31536000, immutable`. Font filenames only
change when the font changes, so they can be cached hard. Nothing breaks if you
skip this.

## 5. Verify on the wire

Don't trust the dashboards — a misconfigured proxy fails silently. After DNS
propagates:

```sh
curl -sSI https://YOUR-DOMAIN/ | grep -iE 'content-security|x-frame|strict-transport|referrer|permissions|x-content|cross-origin'

# Should show: content-disposition: attachment  AND  x-robots-tag: noindex
curl -sSI https://YOUR-DOMAIN/AbdulrahmansCV.pdf | grep -iE 'content-disposition|x-robots'

# Should be 200, not 404 — proves .nojekyll did its job
curl -sS -o /dev/null -w '%{http_code}\n' https://YOUR-DOMAIN/.well-known/security.txt
```

Then run <https://securityheaders.com> against the domain — expect **A/A+**.

If the headers are missing, the DNS record is almost certainly still grey-cloud
(DNS-only) from step 3 and you never switched it back to orange.

---

## ⚠️ Known, unfixable exposure: the CV in a public repo

GitHub Pages serves directly from the repo, and Pages on the Free plan requires
that repo to be **public**. So `AbdulrahmansCV.pdf` necessarily lives in a public
git tree, and it is reachable at URLs that **are not your domain** and therefore
**do not pass through Cloudflare**:

- `https://github.com/aalnowaiserr/Portfolio/blob/main/AbdulrahmansCV.pdf`
- `https://raw.githubusercontent.com/aalnowaiserr/Portfolio/main/AbdulrahmansCV.pdf`

The Transform Rules in step 4 **do not apply to those URLs.** GitHub's `robots.txt`
blocks `/*/raw/` but not `/blob/`, and `raw.githubusercontent.com` serves no
`robots.txt` at all and sends no `X-Robots-Tag`. There is no header you can set to
close this — it is a direct consequence of a public repo.

It is also permanent: the PDF is in the commit history, so deleting the file later
does **not** remove it from a public repo's history.

If the CV contains a personal phone number or home address, you have three real
options:

1. **Redact it.** Strip the sensitive fields, re-export, and accept that the site
   version is public. Simplest and usually right.
2. **Keep the CV out of the repo.** Remove the PDF, and point the "Résumé" buttons
   at an external share link you can revoke. Nothing personal ever enters the
   public tree.
3. **GitHub Pro (~$4/mo).** Pages from a private repo, so `raw.githubusercontent`
   and the blob view both 404 and your domain becomes the only path to the file.

Doing nothing is a valid choice — but make it a choice, not an oversight.
