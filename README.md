# A Fortieth — a 40th birthday activities site

A quiet, editorial site that lists everything you'd love to do for your 40th,
lets friends sign up for what they'd like to help with, and lets **you**
mark things as claimed or done — without ever showing who signed up.

Built as three flat files so it runs on GitHub Pages with no build step.

---

## 1. Files

```
index.html      the page
styles.css      the design
script.js       the logic + config
data.json       your activities (edit this to update the list)
README.md       this file
```

---

## 2. Deploy on GitHub Pages

1. Create a new GitHub repo (e.g. `fortieth`).
2. Upload these files to the root of the `main` branch.
3. In the repo, go to **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**, select `main` / `/ (root)`, and Save.
5. In a minute or two your site is live at
   `https://YOUR-USERNAME.github.io/fortieth/`.

That's it. No build, no server.

---

## 3. Configure signups

Open **`script.js`** and edit the three values at the top:

```js
const FORMSPREE_ENDPOINT = "";          // recommended — see below
const OWNER_EMAIL        = "you@example.com";
const ADMIN_PASS         = "hello40";   // change this
```

### Option A — Formspree (recommended, seamless)
1. Sign up free at [formspree.io](https://formspree.io).
2. Create a new form. Copy the endpoint URL (e.g. `https://formspree.io/f/xpznvqll`).
3. Paste it into `FORMSPREE_ENDPOINT`.

Signups now go straight to your email. Friends never leave the site.

### Option B — mailto fallback (zero setup)
Leave `FORMSPREE_ENDPOINT` blank and set `OWNER_EMAIL` to your address.
Clicking **Send signup** opens the sender's mail client with a pre-filled message.
Simpler, but less polished on mobile.

---

## 4. How friends see it

Everyone visiting the site sees each activity with a status chip:

- **Open** — green · sign-up link visible
- **Claimed** — gold · no sign-up link, no names shown
- **Done** — neutral · item is softly struck through

They never see who signed up. Multiple people can sign up for the same
open item (first-come-first-served is up to you). You get a notification
for each signup via Formspree or email.

---

## 5. How you manage status (owner mode)

Visit your site with `?admin=YOUR_PASSPHRASE` appended, e.g.

```
https://YOUR-USERNAME.github.io/fortieth/?admin=hello40
```

You'll see an **Owner mode** bar at the bottom. Now:

- **Click any status chip** to cycle: Open → Claimed → Done → Open.
- When you're done editing, click **Export data.json**.
- Replace `data.json` in your GitHub repo with the downloaded file
  (drag-drop or use GitHub's web editor). Commit. Done.

> Note: the passphrase is client-side and not real security — it's a
> courtesy lock so a casual visitor can't toggle statuses. Don't put
> secrets in `ADMIN_PASS`. If someone guesses it, the worst they can
> do is see a download button; they can't change your real data.json
> without repo access.

---

## 6. Edit the activity list

Open **`data.json`** and edit. Each category looks like:

```json
{
  "id": "adventures",
  "title": "Adventures",
  "epigraph": "Bad Bunny — \"Monaco\"",
  "items": [
    { "id": "adv-1", "title": "Skydiving", "status": "open" },
    { "id": "adv-2", "title": "Dance classes", "notes": "Latin or ballroom.", "status": "open" }
  ]
}
```

Fields:
- `id` — any unique string. Keep it simple.
- `title` — short activity name.
- `notes` — optional longer description (suggestions, leads, venues).
- `status` — `"open"`, `"assigned"`, or `"completed"`.

Commit the file to GitHub and the site updates within a minute.

---

## 7. Tweaking the look

All design tokens live at the top of `styles.css`:

```css
--ivory:  #F6F1E8;   /* page background */
--ink:    #1A1613;   /* main text */
--wine:   #6B1A2F;   /* accent */
--gold:   #A88963;   /* ornament */
```

Change those four and the whole site shifts tastefully. Fonts are
**Fraunces** (display) and **Outfit** (body), loaded from Google Fonts.

---

## 8. Testing locally

Because `script.js` uses `fetch("data.json")`, you need to serve the
folder over http (not open the file directly). Easiest:

```bash
cd path/to/fortieth
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

---

Have a wonderful fortieth.
