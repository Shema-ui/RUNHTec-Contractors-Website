# RUNHTec Contractors Ltd: Website

Corporate website for **RUNHTec Contractors Ltd**, engineering and technical services in Rwanda and Uganda.
Static HTML/CSS/JS, hosted on **GitHub Pages**.

## How the site is organised

| Folder / file | What it is |
|---|---|
| `_source/data/site.json` | Company details: offices, phones, WhatsApp, email, industries, process steps, project photos |
| `_source/data/services.json` | All services, grouped into categories |
| `_source/templates/` | Page layouts (header, footer and each page type) |
| `_source/build.py` | Builds the finished pages from the data and templates |
| `css/style.css` | Design system: colours, fonts, spacing, components |
| `js/main.js` | Mobile menu, project filter, form validation and sending |
| `images/` | Logo and project photos |
| Everything else (`index.html`, `about/`, `services/`, …) | **Generated pages.** Don't edit these by hand; they're rebuilt from `_source`. |

## Changing content

1. Edit the text in `_source/data/site.json` or `_source/data/services.json`.
2. Rebuild:
   ```
   pip install jinja2
   python3 _source/build.py
   ```
3. Commit all changed files. GitHub Pages updates in 1–2 minutes.

## Forms

Leave `form_endpoint` in `site.json` empty, and the quote and contact forms open **WhatsApp** with the request filled in, addressed to the office in the country the visitor selects.
To receive forms **by email**, put a form-service URL (e.g. `https://formsubmit.co/ajax/you@example.com`) in `form_endpoint` and rebuild.

## Connecting runhteccontractors.com

When the domain is ready, set `pages_root` to `"/"` in `site.json`, rebuild, then add the domain under **Settings → Pages → Custom domain**.
