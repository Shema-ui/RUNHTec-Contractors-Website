"""
RUNHTec website builder.

Turns the templates in _source/templates and the data in _source/data
into finished HTML pages at the root of the repository.

How to run (from the repository folder):
    python3 _source/build.py

You only need this if you change files inside _source/.
Requires Python 3 and Jinja2 (pip install jinja2).
"""
import json
import pathlib
import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent

site = json.loads((SRC / "data/site.json").read_text(encoding="utf-8"))
svc = json.loads((SRC / "data/services.json").read_text(encoding="utf-8"))
services = svc["services"]
categories = svc["categories"]
for c in categories:
    c["items"] = [s for s in services if s["category"] == c["id"]]
for s in services:
    s.setdefault("page", f"services/{s['slug']}/")
    s["category_name"] = next(c["name"] for c in categories if c["id"] == s["category"])

env = Environment(
    loader=FileSystemLoader(SRC / "templates"),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

# Every page on the site: (output path, template, title, description, nav section)
pages = [
    ("", "home.html", "Engineering & Technical Services in Rwanda and Uganda",
     "RUNHTec Contractors Ltd delivers electrical, HVAC, generator, solar, cold room and maintenance services for homes, businesses and institutions in Rwanda and Uganda.", "home"),
    ("about/", "about.html", "About Us",
     "RUNHTec Contractors Ltd is an engineering and technical services company working across Rwanda and Uganda.", "about"),
    ("services/", "services.html", "Our Services",
     "Electrical, standby power, solar, HVAC, chillers, cold rooms, CCTV, networking, construction, borehole drilling and maintenance contracts.", "services"),
    ("maintenance-contracts/", "maintenance.html", "Maintenance Contracts",
     "Preventive and corrective maintenance contracts for electrical, HVAC, generator, solar and refrigeration systems.", "maintenance"),
    ("industries/", "industries.html", "Industries We Serve",
     "Technical services for residential properties, commercial buildings, hospitals, hotels, offices, manufacturing and retail.", "industries"),
    ("projects/", "projects.html", "Projects",
     "Selected field works by RUNHTec Contractors: solar, electrical, HVAC, CCTV, construction and borehole projects.", "projects"),
    ("request-a-quote/", "quote.html", "Request a Quote",
     "Request a quotation or book a site visit with RUNHTec Contractors in Rwanda or Uganda.", "quote"),
    ("contact/", "contact.html", "Contact Us",
     "Contact RUNHTec Contractors: Kigali head office and Kampala branch. Call, WhatsApp or email us.", "contact"),
    ("privacy-policy/", "privacy.html", "Privacy Policy",
     "How RUNHTec Contractors Ltd handles information submitted through this website.", "privacy"),
]
for s in services:
    if s["slug"] == "maintenance-contracts":
        continue
    pages.append((s["page"], "service.html", s["name"], s["short"], "services", s))


def rel_root(path):
    depth = path.count("/")
    return "../" * depth if depth else "./"


def render(path, template, title, description, section, service=None):
    root = rel_root(path)
    html = env.get_template(template).render(
        site=site, services=services, categories=categories, service=service,
        title=title, description=description, section=section, root=root,
        path=path, canonical=f"{site['base_url']}/{path}",
        year=datetime.date.today().year,
    )
    target = OUT / path / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding="utf-8")
    return path


built = [render(*p) for p in pages]

# 404 page (GitHub Pages serves /404.html for missing pages; links use absolute site root)
html = env.get_template("404.html").render(
    site=site, services=services, categories=categories, title="Page not found",
    description="The page you are looking for could not be found.", section="",
    root=site.get("pages_root", "/"), path="404", canonical=site["base_url"] + "/404.html",
    year=datetime.date.today().year, service=None,
)
(OUT / "404.html").write_text(html, encoding="utf-8")

# sitemap.xml and robots.txt
today = datetime.date.today().isoformat()
urls = "\n".join(
    f"  <url><loc>{site['base_url']}/{p}</loc><lastmod>{today}</lastmod></url>" for p in built
)
(OUT / "sitemap.xml").write_text(
    f'<?xml version="1.0" encoding="UTF-8"?>\n'
    f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
    encoding="utf-8",
)
(OUT / "robots.txt").write_text(
    f"User-agent: *\nAllow: /\n\nSitemap: {site['base_url']}/sitemap.xml\n", encoding="utf-8"
)

print(f"Built {len(built)} pages + 404, sitemap.xml, robots.txt")
