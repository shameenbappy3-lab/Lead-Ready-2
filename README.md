# LeadReady landing page

Static site for an $800 one-time lead follow-up setup (email → text/email → phone call → booked visit). Built for any local business that lives or dies by fast lead response — landscaping, real estate, water restoration, HVAC, home care, plumbing, and beyond.

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 4173
```

## Form

The contact form posts to [FormSubmit](https://formsubmit.co/) at `shameenbappy25@gmail.com`. The first submission sends a confirmation email — click that once so later leads arrive in the inbox.

The thank-you URL is set in the browser from the live domain, so it works on Vercel without a hardcoded address.

## GitHub + Vercel

```bash
gh repo create automation-for-small-business --public --source=. --remote=origin --push
```

Then import the repo in [Vercel](https://vercel.com/new). Framework preset: Other. Output: the repo root (no build command).
