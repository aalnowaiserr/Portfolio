# Deploying — GitHub → DigitalOcean → Cloudflare

Static site, no build step. Push to `main` and DigitalOcean redeploys.

---

## ⚠️ The one thing you must not skip

**DigitalOcean App Platform static sites cannot serve custom response headers.**

There is no `_headers` support, no config file, no setting in the control panel.

> This repo used to carry a `_headers` file. It was deleted on purpose. That format
> is a **Netlify / Cloudflare Pages** convention which DigitalOcean silently ignores,
> so it enforced nothing while looking like it did — the worst property a security
> control can have. **This document is now the single source of truth for the header
> set.** If you ever move the site to Cloudflare Pages or Netlify, re-create
> `_headers` from the tables below, where it *would* work natively.

That means:

- The CSP in the `<meta>` tag in `index.html` **does** work. It covers `script-src`,
  `style-src`, `font-src`, `img-src`, `object-src`, `base-uri`, `form-action`.
- **`frame-ancestors`, `X-Frame-Options`, `Strict-Transport-Security`,
  `Permissions-Policy`, `X-Content-Type-Options`, COOP/CORP and `X-Robots-Tag`
  are header-only.** A `<meta http-equiv>` cannot set any of them — browsers
  ignore the attempt. Without the Cloudflare step below, **this site is framable
  by any origin (clickjacking) and has no HSTS.**

So: DigitalOcean serves the files, **Cloudflare enforces the security headers.**
Until step 3 is done, the deployment is not hardened.

---

## 1. DigitalOcean

Create the app from the GitHub repo:

- **Resource type:** Static Site (not a Web Service)
- **Build command:** *(none)*
- **Output directory:** `/`
- **Autodeploy:** on push to `main`

## 2. Point the domain at Cloudflare

- Add the domain to Cloudflare (free plan is enough).
- In DigitalOcean, add the custom domain to the app; it gives you a target hostname.
- In Cloudflare DNS, create a `CNAME` to that hostname with the **proxy status set
  to Proxied (orange cloud)**.

> The orange cloud is what makes this work. If the record is DNS-only (grey cloud),
> traffic bypasses Cloudflare entirely and **no security headers are applied**.

Then under **SSL/TLS**:

- Encryption mode: **Full (strict)**
- **Always Use HTTPS**: on
- **Minimum TLS Version**: 1.2

## 3. Add the security headers (Transform Rule)

**Rules → Transform Rules → Modify Response Header → Create rule.**

Name it `Security headers`, set the filter to **All incoming requests**, and add
each of the following as a **Set static** header:

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

`X-XSS-Protection: 0` is correct and not a typo. The legacy XSS auditor it enables
is itself exploitable and has been removed from modern browsers; `1; mode=block` is
actively discouraged. The CSP is the real defence.

Do **not** add `Cross-Origin-Embedder-Policy: require-corp`. It buys nothing here
and will break the first third-party image or script you ever add.

### HSTS

Don't set `Strict-Transport-Security` by hand — Cloudflare has a dedicated toggle
that gets the edge cases right:

**SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS) → Enable**

- Max-Age: **12 months**
- Include subdomains: **on**
- Preload: leave **off** until you are certain *every* subdomain will be HTTPS-only
  forever. Preloading is baked into browser binaries and is painful to reverse.

### PDF handling

Second Transform Rule, name it `PDF privacy`.

Filter (Edit expression):

```
ends_with(http.request.uri.path, ".pdf")
```

Set static headers:

| Header | Value |
|---|---|
| `X-Robots-Tag` | `noindex, noimageindex, noarchive, nosnippet` |
| `Content-Disposition` | `attachment` |

`Content-Disposition: attachment` is what actually forces the résumé to download
rather than render in the browser's PDF viewer. The HTML `download` attribute on
the links is a hint only — this header is the enforcement.

`X-Robots-Tag: noindex` keeps the résumé out of search results. Note that
`robots.txt` deliberately does **not** `Disallow` the PDFs: blocking the crawl
would stop Google from ever *seeing* the noindex header, and it could still list
the bare URL. Letting it crawl and reading `noindex` is what de-indexes the file.

### Font caching (optional, performance only)

Third rule, `Font caching`. Filter:

```
starts_with(http.request.uri.path, "/fonts/")
```

Set static header `Cache-Control` to `public, max-age=31536000, immutable`. The
font filenames only change when the font itself changes, so they can be cached
for a year. Nothing breaks if you skip this.

---

## 4. Verify

Don't trust the config — check the wire. After DNS propagates:

```sh
curl -sSI https://YOUR-DOMAIN/ | grep -iE 'content-security|x-frame|strict-transport|referrer|permissions|x-content|cross-origin'

# Should say: content-disposition: attachment  +  x-robots-tag: noindex
curl -sSI https://YOUR-DOMAIN/AbdulrahmansCV.pdf | grep -iE 'content-disposition|x-robots'
```

Then run <https://securityheaders.com> against the domain — expect an **A/A+**.

If the headers are missing, the DNS record is almost certainly grey-cloud
(DNS-only) rather than orange-cloud (Proxied).

---

## Note on privacy

`AbdulrahmansCV.pdf` is publicly downloadable by design. `noindex` keeps it out of
search results, but **it does not make it private** — anyone with the URL can fetch
it, and it will be scraped. Make sure you are comfortable with every piece of
personal data in that PDF (phone number, home address) being permanently public.
If you are not, redact and re-export it; that is the only real fix.
