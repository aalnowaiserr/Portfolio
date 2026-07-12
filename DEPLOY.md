# Deploying — GitHub Pages (user site, no custom domain)

Static site, no build step. Push to `main`; Pages redeploys in ~1 minute.

Live at **https://aalnowaiserr.github.io/**

---

## Setup

**Settings → Pages**

- Source: **Deploy from a branch**
- Branch: **`main`**, folder **`/ (root)`**
- Repo must be **public** (Pages from a private repo requires GitHub Pro).

### The repo name is load-bearing

The repo must be named exactly **`aalnowaiserr.github.io`**. A repo with that
name is published as a *user site* at the **origin root**. Any other name makes
it a *project site* served from a subdirectory (`/Portfolio/`), and two things
silently break there:

- **`robots.txt` is ignored.** Crawlers only ever read it from the origin root.
  At `/Portfolio/robots.txt` it returns 200 and is read by nobody — which is
  exactly why the breakage is easy to miss.
- **`.well-known/security.txt` is not at its RFC location**, which is also the
  origin root.

Both files are only real at the root. Don't rename the repo back.

### Don't delete `.nojekyll`

That empty file at the repo root is load-bearing too. Without it, Pages runs the
tree through Jekyll, which **silently drops every file and directory whose name
starts with `.` or `_`** — including `.well-known/security.txt`, which would 404
with no error surfaced anywhere. `.nojekyll` makes Pages serve the tree verbatim.

---

## ⚠️ The security ceiling — read this

**GitHub Pages cannot serve custom response headers. At all.** No `_headers`, no
`.htaccess`, no config file, no setting. There is no workaround, and no
`_headers` file in this repo, deliberately — on a host that ignores it, such a
file enforces nothing while looking like it does, which is the worst property a
security control can have.

With no custom domain there is also no Cloudflare (or any other proxy) in front,
so **there is nowhere left to inject headers.** This is the ceiling. What you get:

### What IS protected

| Control | How | Status |
|---|---|---|
| `Content-Security-Policy` | `<meta>` tag in `index.html` | ✅ Active — `default-src 'none'`, everything `'self'` |
| Script / style / font / img sources | via that CSP | ✅ No third-party origin is trusted at all |
| `Referrer-Policy` | `<meta name="referrer">` | ✅ Active |
| HTTPS + HSTS | `github.io` is on the browser HSTS **preload list** | ✅ Free, and enforced by the browser itself |
| Mixed content | `upgrade-insecure-requests` in the CSP | ✅ |
| Framing (partial) | frame-busting script in `theme.js` | ⚠️ Weak — see below |
| PDFs out of search | `Disallow` in `robots.txt` | ⚠️ Weak — see below |
| PDF downloads | `download` attribute on the links | ✅ Works (same-origin) |

### What CANNOT be protected, and why

| Missing | Why it's impossible here |
|---|---|
| `frame-ancestors` | Ignored in `<meta>`; header-only. |
| `X-Frame-Options` | Header-only. |
| `X-Content-Type-Options: nosniff` | Header-only. **MIME sniffing is possible.** |
| `Permissions-Policy` | Header-only — has no valid `<meta http-equiv>` form at all. |
| `Cross-Origin-Opener-Policy` / `CORP` | Header-only. |
| `X-Robots-Tag: noindex` on the PDFs | Header-only. |
| `Content-Disposition: attachment` | Header-only. |

Every one of these needs a host or proxy that can send headers. **If you ever
want them, the fix is a custom domain proxied through Cloudflare** — that single
change unlocks the entire list. Nothing else will.

### On the frame-busting script

`theme.js` busts out of iframes as a stand-in for `frame-ancestors`. It is
genuinely weaker than the header: an attacker can use a `sandbox`ed iframe to
block the bust-out, and it does nothing with JS disabled. It hides the document
as a fallback.

That's an acceptable trade here specifically because this is a static portfolio:
there is no login and no state-changing action, so there is no click worth
hijacking. The realistic risk is someone framing the site to pass it off as
theirs, and this raises the cost of that. It is not equivalent to the header.

### On `robots.txt` vs the PDFs

`robots.txt` now `Disallow`s the PDFs. This is a **deliberate downgrade**: the
stronger control is `X-Robots-Tag: noindex` (which lets a crawler fetch the file,
read the header, and drop it from the index), but that is a header and therefore
impossible here. `Disallow` only blocks the fetch, so Google may still list the
bare URL if someone links to it.

If this site ever moves behind a proxy: remove the `Disallow` lines and serve
`X-Robots-Tag: noindex` instead. **Never do both** — a `Disallow` prevents the
crawler from ever seeing the `noindex`.

---

## ⚠️ The CV is public and permanent

Pages requires a public repo, so `AbdulrahmansCV.pdf` lives in a public git tree
and is served from URLs you cannot put any policy in front of:

- `https://github.com/aalnowaiserr/<repo>/blob/main/AbdulrahmansCV.pdf`
- `https://raw.githubusercontent.com/aalnowaiserr/<repo>/main/AbdulrahmansCV.pdf`

`robots.txt` on your Pages site does not govern those hosts. GitHub's own
`robots.txt` blocks `/*/raw/` but **not** `/blob/`, and `raw.githubusercontent.com`
serves **no robots.txt at all** and sends no `X-Robots-Tag`.

It is also **permanent**: the PDF is in the commit history, so deleting the file
later does not remove it from a public repo's history.

If the CV carries a personal phone number or home address, the only real fixes:

1. **Redact and re-export it**, and rewrite history (`git filter-repo`) to purge
   the old copy. Simplest and usually right.
2. **Remove the PDF from the repo** and point the Résumé buttons at an external
   share link you can revoke.

Doing nothing is a legitimate choice — but make it a choice, not an oversight.

---

## Verify

```sh
# Should be 200 — proves the repo name gives you a root-served user site
curl -sS -o /dev/null -w '%{http_code}\n' https://aalnowaiserr.github.io/robots.txt

# Should be 200 — proves .nojekyll did its job
curl -sS -o /dev/null -w '%{http_code}\n' https://aalnowaiserr.github.io/.well-known/security.txt

# HSTS should be present (from the github.io preload); the rest will be absent,
# and that is expected and unavoidable without a proxy.
curl -sSI https://aalnowaiserr.github.io/ | grep -iE 'strict-transport|content-security|x-frame'
```

Running this through <https://securityheaders.com> will **not** score well, and
that is not a misconfiguration — it is the documented ceiling of GitHub Pages
without a proxy. The `<meta>` CSP it cannot see is doing the substantive work.
