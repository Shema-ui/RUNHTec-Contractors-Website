/* RUNHTec Contractors: site scripts */
(function () {
  "use strict";
  var cfg = window.RUNHTEC || { offices: [], email: "", formEndpoint: "" };

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var header = document.querySelector(".site-header");

  function setNavTop() {
    if (header) document.documentElement.style.setProperty("--nav-top", header.getBoundingClientRect().bottom + "px");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNavTop();
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        toggle.focus();
      }
    });
  }
  document.querySelectorAll(".submenu-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var li = btn.closest(".has-mega");
      var open = li.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Project filter ---------- */
  var filters = document.querySelectorAll(".filter");
  filters.forEach(function (f) {
    f.addEventListener("click", function () {
      filters.forEach(function (x) { x.classList.toggle("is-active", x === f); });
      var cat = f.getAttribute("data-filter");
      document.querySelectorAll(".project").forEach(function (p) {
        p.hidden = cat !== "all" && p.getAttribute("data-category") !== cat;
      });
    });
  });

  /* ---------- Forms ---------- */
  function officeFor(country) {
    for (var i = 0; i < cfg.offices.length; i++) if (cfg.offices[i].country === country) return cfg.offices[i];
    return cfg.offices[0];
  }

  function clearErrors(form) {
    form.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
    form.querySelectorAll(".field-error").forEach(function (e) { e.remove(); });
  }

  function messageFor(input) {
    var v = input.validity;
    if (v.valueMissing) return input.type === "checkbox" ? "Please tick this box to continue." : "This field is required.";
    if (v.typeMismatch && input.type === "email") return "Please enter a valid email address.";
    if (v.patternMismatch && input.type === "tel") return "Please enter a valid phone number, e.g. +250 7XX XXX XXX.";
    if (v.tooShort) return "Please add a little more detail (at least " + input.minLength + " characters).";
    return "Please check this field.";
  }

  function validate(form) {
    clearErrors(form);
    var first = null;
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (el.classList.contains("hp") || el.type === "radio") return;
      if (el.type !== "checkbox") el.value = el.value.trim();
      if (!el.checkValidity()) {
        var field = el.closest(".field");
        if (field) {
          field.classList.add("has-error");
          var msg = document.createElement("span");
          msg.className = "field-error";
          msg.id = el.id ? el.id + "-error" : "";
          msg.textContent = messageFor(el);
          field.appendChild(msg);
          if (el.id) el.setAttribute("aria-describedby", msg.id);
        }
        if (!first) first = el;
      } else {
        el.removeAttribute("aria-describedby");
      }
    });
    if (first) first.focus();
    return !first;
  }

  function showStatus(form, type, text) {
    var box = form.querySelector(".form-status");
    box.className = "form-status is-" + type;
    box.textContent = text;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  var LABELS = {
    request_type: "Request", name: "Name", company: "Company", phone: "Phone", email: "Email",
    service: "Service", property_type: "Property type", country: "Country", location: "Location",
    timeline: "Timeline", preferred_date: "Preferred site-visit date", message: "Details"
  };

  function summary(data, kind) {
    var lines = [kind === "quote" ? "Hello RUNHTec, I would like to request " + (data.request_type === "Site visit" ? "a site visit." : "a quotation.") : "Hello RUNHTec,", ""];
    Object.keys(LABELS).forEach(function (k) {
      if (k === "request_type" || !data[k]) return;
      lines.push(LABELS[k] + ": " + data[k]);
    });
    return lines.join("\n");
  }

  /* Save a website request into the RUNHTec ERP (Request for Quotations).
     Started on the click, with keepalive, so it still completes if the page
     navigates away to WhatsApp. Resolves true/false and never throws. */
  var URGENCY = { "Urgent: system down": "high", "Within a week": "high", "Within a month": "medium", "Planning / no fixed date": "low" };
  function sendToErp(data, kind) {
    if (!cfg.erpIntake || !window.fetch) return Promise.resolve(false);
    var details = [];
    if (kind === "quote") {
      details.push("Request: " + (data.request_type || "Quotation"));
      if (data.property_type) details.push("Property type: " + data.property_type);
      if (data.timeline) details.push("Timeline: " + data.timeline);
      if (data.preferred_date && data.request_type === "Site visit") details.push("Preferred site-visit date: " + data.preferred_date);
      details.push("Location: " + [data.location, data.country].filter(Boolean).join(", "));
      details.push("");
    }
    details.push(data.message || "");
    var payload = {
      source: "website",
      type: kind === "quote" ? (data.request_type === "Site visit" ? "service" : "quote") : "contact",
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      company: data.company || "",
      serviceType: kind === "quote" ? (data.service || "") : "General enquiry",
      urgency: kind === "quote" ? (URGENCY[data.timeline] || "medium") : "",
      address: [data.location, data.country].filter(Boolean).join(", "),
      city: data.location || "",
      country: data.country || "",
      message: details.join("\n").trim()
    };
    return fetch(cfg.erpIntake, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  document.querySelectorAll(".rt-form").forEach(function (form) {
    var kind = form.getAttribute("data-form");

    /* Quote form: pre-fill from link, e.g. ?service=solar-pv-hybrid-systems&type=site-visit */
    if (kind === "quote") {
      var params = new URLSearchParams(window.location.search);
      var slug = params.get("service");
      if (slug) {
        var opt = form.querySelector('option[data-slug="' + slug.replace(/[^a-z0-9-]/g, "") + '"]');
        if (opt) opt.selected = true;
      }
      if (params.get("type") === "site-visit") {
        var sv = form.querySelector('input[name="request_type"][value="Site visit"]');
        if (sv) sv.checked = true;
      }
      var syncVisit = function () {
        var checked = form.querySelector('input[name="request_type"]:checked');
        form.classList.toggle("is-site-visit", !!checked && checked.value === "Site visit");
      };
      form.querySelectorAll('input[name="request_type"]').forEach(function (r) { r.addEventListener("change", syncVisit); });
      syncVisit();
      var dateInput = form.querySelector('input[type="date"]');
      if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
    }

    /* Re-validate a field as soon as the user fixes it */
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field.has-error");
      if (field && e.target.checkValidity()) {
        field.classList.remove("has-error");
        var err = field.querySelector(".field-error");
        if (err) err.remove();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector(".hp").value) return; // spam bot
      if (!validate(form)) {
        showStatus(form, "error", "Please correct the highlighted fields and try again.");
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "_honey" && k !== "consent") data[k] = String(v); });
      var btn = form.querySelector('button[type="submit"]');

      var office = officeFor(data.country);
      var waUrl = "https://wa.me/" + office.whatsapp + "?text=" + encodeURIComponent(summary(data, kind));
      var first = (data.name || "").split(" ")[0];
      var what = kind === "quote" ? "request" : "message";

      if (cfg.erpIntake && !cfg.formEndpoint) {
        /* Save to the ERP and open WhatsApp on the same click (opening it later gets blocked). */
        var saving = sendToErp(data, kind);
        var wa = window.open(waUrl, "_blank");
        if (wa) wa.opener = null;
        btn.disabled = true;
        showStatus(form, "info", "Sending your " + what + "…");
        saving.then(function (ok) {
          btn.disabled = false;
          if (ok) {
            form.reset();
            if (kind === "quote") form.classList.remove("is-site-visit");
            showStatus(form, "success", "Thank you, " + first + ". Your " + what + " has been received by our team and we will contact you shortly." + (wa ? " WhatsApp has also opened if you would like to message our " + office.country + " office directly." : ""));
          } else if (wa) {
            showStatus(form, "success", "WhatsApp has opened with your " + what + " to our " + office.country + " office. Tap send in WhatsApp to deliver it.");
          } else {
            window.location.href = waUrl;
          }
        });
        if (!wa) {
          /* Pop-up blocked: give the save a moment, then go to WhatsApp in this tab. */
          setTimeout(function () { window.location.href = waUrl; }, 2500);
        }
        return;
      }

      if (cfg.formEndpoint) {
        /* Both: open WhatsApp now (must happen on the click, or browsers block it),
           and email the same request to RUNHTec through the form service. */
        var waWin = window.open(waUrl, "_blank");
        if (waWin) waWin.opener = null;
        btn.disabled = true;
        var payload = Object.assign({ _subject: (kind === "quote" ? "Website " + (data.request_type || "quote") + " request: " : "Website message: ") + (data.service || data.name), form: kind }, data);
        fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          form.reset();
          if (kind === "quote") form.classList.remove("is-site-visit");
          showStatus(form, "success", "Thank you, " + data.name.split(" ")[0] + ". Your " + (kind === "quote" ? "request" : "message") + " has been emailed to our team" + (waWin ? ", and WhatsApp has opened so you can send it there too." : ". Our team will contact you."));
        }).catch(function () {
          showStatus(form, "error", "Sorry, the email could not be sent. " + (waWin ? "Please send the WhatsApp message that opened, or " : "Please ") + "call us on " + office.phone_display + ".");
        }).finally(function () { btn.disabled = false; });
      } else {
        /* No form service set up: open WhatsApp with the message ready to send */
        var url = waUrl;
        var win = window.open(url, "_blank");
        if (win) { win.opener = null; } else { window.location.href = url; }
        showStatus(form, "success", "WhatsApp has opened with your " + (kind === "quote" ? "request" : "message") + " to our " + office.country + " office. Tap send in WhatsApp to deliver it.");
      }
    });
  });
})();

/* ===== v3: counters, reveal, before/after, service finder, planner ===== */
(function () {
  "use strict";
  var cfg = window.RUNHTEC || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var headless = navigator.webdriver === true;

  /* ---------- Count-up numbers (final number is already in the HTML) ---------- */
  var nums = document.querySelectorAll("[data-count]");
  if (nums.length && "IntersectionObserver" in window && !reduce && !headless) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countIO.unobserve(en.target);
        var el = en.target, end = +el.getAttribute("data-count"), t0 = null, dur = 1400;
        function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        el.textContent = "0";
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { countIO.observe(n); });
  }

  /* ---------- Gentle reveal for cards and sections below the fold ---------- */
  if ("IntersectionObserver" in window && !reduce && !headless) {
    var targets = document.querySelectorAll(".service-card, .story-card, .article-card, .industry-card, .feature-story, .stat");
    var vh = window.innerHeight;
    var below = [];
    targets.forEach(function (el) { if (el.getBoundingClientRect().top > vh) below.push(el); });
    if (below.length) {
      document.documentElement.classList.add("js-reveal");
      var revIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); revIO.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px" });
      below.forEach(function (el, i) {
        el.classList.add("reveal");
        el.style.transitionDelay = (i % 3) * 80 + "ms";
        revIO.observe(el);
      });
    }
  }

  /* ---------- Before / after slider ---------- */
  document.querySelectorAll(".compare").forEach(function (box) {
    var range = box.querySelector(".compare-range");
    function set(v) { box.style.setProperty("--pos", v + "%"); }
    range.addEventListener("input", function () { set(range.value); });
    set(range.value);
  });

  /* ---------- Quote form: pre-fill details passed from the planner or finder ---------- */
  var qMsg = document.getElementById("q-message");
  if (qMsg) {
    var det = new URLSearchParams(window.location.search).get("details");
    if (det && !qMsg.value) qMsg.value = det.slice(0, 2000);
  }

  function svc(slug) {
    var i = (cfg.services || []).indexOf(slug);
    return i < 0 ? null : { slug: slug, name: cfg.serviceNames[i], page: cfg.servicePages[i] };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Service Finder ---------- */
  var finder = document.getElementById("finder");
  if (finder) {
    var out = document.getElementById("finder-result");
    var MAP = {
      building: { home: ["construction-civil-works", "borehole-drilling-water"], office: ["construction-civil-works"], hospitality: ["construction-civil-works", "borehole-drilling-water"], industrial: ["construction-civil-works", "borehole-drilling-water"] },
      power: { home: ["electrical-installations"], office: ["electrical-installations"], hospitality: ["electrical-installations", "standby-generators-backup-power"], industrial: ["electrical-installations", "standby-generators-backup-power"] },
      backup: { home: ["solar-pv-hybrid-systems", "standby-generators-backup-power"], office: ["solar-pv-hybrid-systems", "standby-generators-backup-power"], hospitality: ["standby-generators-backup-power", "solar-pv-hybrid-systems"], industrial: ["standby-generators-backup-power", "solar-pv-hybrid-systems"] },
      cooling: { home: ["hvac-air-conditioning-chillers"], office: ["hvac-air-conditioning-chillers"], hospitality: ["hvac-air-conditioning-chillers", "cold-rooms-refrigeration"], industrial: ["cold-rooms-refrigeration", "hvac-air-conditioning-chillers"] },
      security: { home: ["cctv-security-systems", "networking-internet"], office: ["networking-internet", "cctv-security-systems"], hospitality: ["networking-internet", "cctv-security-systems"], industrial: ["cctv-security-systems", "networking-internet"] }
    };
    var TEXT = {
      "new": "Good timing. Planning early lets us design the system properly before work starts. Request a quote or book a site visit.",
      fault: "Let's get it working again. The fastest way to reach us about a fault is WhatsApp or a phone call.",
      maintain: "Regular maintenance prevents breakdowns. A maintenance contract covers scheduled servicing and repairs when something goes wrong."
    };
    finder.addEventListener("change", function () {
      var f = new FormData(finder), topic = f.get("topic"), prop = f.get("property"), stage = f.get("stage");
      finder.querySelectorAll(".finder-q").forEach(function (q) {
        q.classList.toggle("is-done", !!q.querySelector("input:checked"));
      });
      if (!topic || !prop || !stage) return;
      var list = MAP[topic][prop].slice();
      if (stage === "maintain") list.push("maintenance-contracts");
      var items = list.map(svc).filter(Boolean);
      var main = items[0];
      var office = (cfg.offices || [])[0] || {};
      var waText = "Hello RUNHTec, I need help with " + main.name.toLowerCase() + (stage === "fault" ? ". Something isn't working." : ".");
      var root = cfg.root || "./";
      var html = '<div class="finder-rec"><p class="kicker">We recommend</p><h3>' + esc(main.name) + "</h3><p>" + esc(TEXT[stage]) + '</p><div class="finder-services">' +
        items.map(function (s) { return '<a href="' + esc(root + s.page) + '">' + esc(s.name) + " →</a>"; }).join("") + '</div><div class="finder-actions">';
      var quote = '<a class="btn btn-primary" href="' + esc(root + "request-a-quote/?service=" + main.slug + (stage === "new" ? "&type=site-visit" : "")) + '">' + (stage === "new" ? "Book a site visit" : "Request a quote") + "</a>";
      var wa = '<a class="btn btn-secondary" target="_blank" rel="noopener" href="https://wa.me/' + esc(office.whatsapp) + "?text=" + encodeURIComponent(waText) + '">WhatsApp us</a>';
      html += stage === "fault" ? wa.replace("btn-secondary", "btn-primary") + quote.replace("btn-primary", "btn-secondary") : quote + wa;
      if (topic === "backup" || (topic === "power" && stage === "new")) html += '<a class="btn btn-secondary" href="' + esc(root + "power-planner/") + '">Estimate with the Power Planner</a>';
      html += "</div></div>";
      out.innerHTML = html;
    });
  }

  /* ---------- Backup Power & Solar Planner ---------- */
  var body = document.getElementById("loads-body");
  if (body) {
    var LIB = [
      ["LED bulb", 10, 0], ["Fluorescent tube", 36, 0], ["Outdoor security light", 30, 0], ["Ceiling fan", 70, 0],
      ["TV", 100, 0], ["Laptop", 60, 0], ["Desktop computer", 150, 0], ["Wi-Fi router", 15, 0],
      ["CCTV system (4 cameras + recorder)", 60, 0], ["Printer", 300, 0], ["Fridge", 150, 1], ["Chest freezer", 200, 1],
      ["Display fridge", 300, 1], ["Water pump 0.5 HP", 400, 1], ["Water pump 1 HP", 750, 1], ["Water pump 1.5 HP", 1100, 1],
      ["Split AC 9,000 BTU", 900, 1], ["Split AC 12,000 BTU", 1200, 1], ["Split AC 18,000 BTU", 1800, 1],
      ["Microwave", 1000, 0], ["Electric kettle", 2000, 0], ["Iron", 1000, 0], ["Medical / vaccine fridge", 150, 1], ["Lab equipment", 500, 0]
    ];
    var PRESETS = {
      home: [["LED bulb", 10, 10, 6, 0], ["TV", 100, 1, 5, 0], ["Fridge", 150, 1, 10, 1], ["Wi-Fi router", 15, 1, 24, 0], ["Laptop", 60, 2, 4, 0], ["Water pump 1 HP", 750, 1, 1, 1], ["Outdoor security light", 30, 2, 11, 0]],
      office: [["LED bulb", 10, 20, 9, 0], ["Desktop computer", 150, 5, 8, 0], ["Printer", 300, 1, 1, 0], ["Wi-Fi router", 15, 1, 24, 0], ["CCTV system (4 cameras + recorder)", 60, 1, 24, 0], ["Display fridge", 300, 1, 10, 1], ["Ceiling fan", 70, 4, 8, 0]],
      hotel: [["LED bulb", 10, 60, 6, 0], ["Chest freezer", 200, 3, 10, 1], ["Fridge", 150, 2, 10, 1], ["Water pump 1.5 HP", 1100, 2, 2, 1], ["Desktop computer", 150, 2, 24, 0], ["Wi-Fi router", 15, 3, 24, 0], ["CCTV system (4 cameras + recorder)", 60, 2, 24, 0], ["TV", 100, 10, 4, 0]],
      clinic: [["LED bulb", 10, 30, 10, 0], ["Medical / vaccine fridge", 150, 2, 10, 1], ["Desktop computer", 150, 4, 9, 0], ["Lab equipment", 500, 1, 4, 0], ["Water pump 1 HP", 750, 1, 2, 1], ["Wi-Fi router", 15, 1, 24, 0], ["CCTV system (4 cameras + recorder)", 60, 1, 24, 0]],
      empty: []
    };
    var INV = [1, 1.5, 2, 3, 3.6, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
    var GEN = [5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150, 200, 250, 300, 400, 500];
    var addSel = document.getElementById("add-item");
    addSel.innerHTML = '<option value="">Choose an appliance to add…</option>' + LIB.map(function (l, i) { return '<option value="' + i + '">' + esc(l[0]) + " (" + l[1] + " W)</option>"; }).join("") + '<option value="custom">Other appliance (enter your own)</option>';

    var rowId = 0;
    function addRow(name, w, q, h, motor) {
      rowId++;
      var tr = document.createElement("tr");
      tr.dataset.motor = motor ? "1" : "0";
      tr.innerHTML =
        '<td><input class="c-name" type="text" value="' + esc(name) + '" aria-label="Appliance name" id="ln' + rowId + '">' + (motor ? '<span class="motor-tag">Motor load</span>' : "") + "</td>" +
        '<td data-label="Watts each"><input class="c-num" type="number" min="0" step="1" value="' + w + '" aria-label="Watts each" inputmode="numeric" id="lw' + rowId + '"></td>' +
        '<td data-label="Qty"><input class="c-qty" type="number" min="0" step="1" value="' + q + '" aria-label="Quantity" inputmode="numeric" id="lq' + rowId + '"></td>' +
        '<td data-label="Hours / day"><input class="c-num" type="number" min="0" max="24" step="0.5" value="' + h + '" aria-label="Hours per day" inputmode="decimal" id="lh' + rowId + '"></td>' +
        '<td><button type="button" class="row-remove" aria-label="Remove ' + esc(name) + '">×</button></td>';
      body.appendChild(tr);
    }
    function loadPreset(key) {
      body.innerHTML = "";
      PRESETS[key].forEach(function (p) { addRow(p[0], p[1], p[2], p[3], p[4]); });
      calc();
    }
    document.querySelectorAll(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".preset").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        loadPreset(b.getAttribute("data-preset"));
      });
    });
    document.getElementById("add-btn").addEventListener("click", function () {
      var v = addSel.value;
      if (v === "") { addSel.focus(); return; }
      if (v === "custom") addRow("My appliance", 100, 1, 4, 0);
      else { var l = LIB[+v]; addRow(l[0], l[1], 1, l[2] ? 10 : 4, l[2]); }
      addSel.value = "";
      calc();
      var last = body.lastElementChild.querySelector("input"); if (last) last.focus();
    });
    body.addEventListener("click", function (e) {
      if (e.target.classList.contains("row-remove")) { e.target.closest("tr").remove(); calc(); }
    });
    ["input", "change"].forEach(function (ev) { document.querySelector(".planner-layout").addEventListener(ev, calc); });

    var country = document.getElementById("country"), diesel = document.getElementById("diesel");
    country.addEventListener("change", function () {
      document.getElementById("currency").textContent = country.value === "RW" ? "FRw" : "UGX";
      diesel.value = country.value === "RW" ? 2927 : "";
      diesel.placeholder = country.value === "RW" ? "" : "Enter today's price";
      calc();
    });

    function up(list, v) { for (var i = 0; i < list.length; i++) if (list[i] >= v) return list[i]; return Math.ceil(v); }
    function fmt(n, d) { return n.toLocaleString("en-GB", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
    function txt(id, s) { document.getElementById(id).textContent = s; }

    function calc() {
      var H = +document.getElementById("backup-hours").value;
      txt("backup-out", H);
      var peak = 0, daily = 0, backupWh = 0, maxMotor = 0, items = [];
      body.querySelectorAll("tr").forEach(function (tr) {
        var ins = tr.querySelectorAll("input");
        var name = ins[0].value.trim() || "Appliance", w = Math.max(0, +ins[1].value || 0), q = Math.max(0, +ins[2].value || 0), h = Math.min(24, Math.max(0, +ins[3].value || 0));
        if (!w || !q) return;
        peak += w * q; daily += w * q * h; backupWh += w * q * Math.min(h, H);
        if (tr.dataset.motor === "1") maxMotor = Math.max(maxMotor, w);
        items.push(q + " × " + name + " (" + w + " W, " + h + " h/day)");
      });
      var solarOn = document.getElementById("use-solar").checked;
      document.getElementById("solar-row").hidden = !solarOn;
      if (!peak) {
        ["r-peak", "r-daily", "r-inverter", "r-battery", "r-solar", "r-gen"].forEach(function (id) { txt(id, "–"); });
        ["r-inverter-note", "r-battery-note", "r-solar-note", "r-gen-note"].forEach(function (id) { txt(id, ""); });
        txt("r-inverter-note", "Add at least one appliance.");
        return;
      }
      var surge = peak + 2 * maxMotor;                 // largest motor starting at ~3× its running power
      var invKva = up(INV, Math.max(peak * 1.25, surge / 2) / 1000); // inverters typically handle ~2× rated for a few seconds
      var usable = backupWh / 0.92;                     // inverter efficiency
      var nominal = usable / 0.9;                       // LiFePO4 usable depth of discharge
      var modules = Math.max(1, Math.ceil(nominal / 5120));
      var psh = country.value === "RW" ? 4.5 : 5.0;
      var kwp = daily / (psh * 0.75) / 1000;
      var panels = Math.max(1, Math.ceil(kwp * 1000 / 550));
      var genKva = up(GEN, Math.max(peak * 1.25, surge / 1.5) / 1000 / 0.8);
      var avgKw = backupWh / H / 1000;
      var ratedKw = genKva * 0.8;
      var lph = 0.08 * ratedKw + 0.25 * avgKw;
      var price = +diesel.value || 0;

      txt("r-peak", fmt(peak / 1000, 2) + " kW");
      txt("r-daily", fmt(daily / 1000, 1) + " kWh");
      txt("r-inverter", invKva + " kVA");
      txt("r-inverter-note", maxMotor ? "Sized to start a " + fmt(maxMotor) + " W motor while everything else runs." : "With 25% headroom above peak load.");
      txt("r-battery", fmt(nominal / 1000, 1) + " kWh");
      txt("r-battery-note", "≈ " + modules + " × 5.12 kWh lithium module" + (modules > 1 ? "s" : "") + " for " + H + " h of backup");
      txt("r-solar", fmt(kwp, 1) + " kWp");
      txt("r-solar-note", "≈ " + panels + " × 550 W panels to cover " + fmt(daily / 1000, 1) + " kWh a day");
      txt("r-gen", genKva + " kVA");
      txt("r-gen-note", "Uses about " + fmt(lph, 1) + " L/h" + (price ? " ≈ " + (country.value === "RW" ? "FRw " : "UGX ") + fmt(Math.round(lph * price / 100) * 100) + " per hour" : "") + ", " + fmt(lph * H, 0) + " L over " + H + " hours");

      var details = "Power Planner estimate:\n" + items.join("\n") +
        "\n\nPeak load " + fmt(peak / 1000, 2) + " kW, daily energy " + fmt(daily / 1000, 1) + " kWh, backup " + H + " h." +
        "\nSuggested: " + invKva + " kVA inverter, " + fmt(nominal / 1000, 1) + " kWh battery" + (solarOn ? ", " + fmt(kwp, 1) + " kWp solar" : "") + "; generator option " + genKva + " kVA.";
      var service = solarOn ? "solar-pv-hybrid-systems" : "standby-generators-backup-power";
      document.getElementById("planner-quote").href = (cfg.root || "../") + "request-a-quote/?service=" + service + "&details=" + encodeURIComponent(details);
    }
    loadPreset("home");
  }
})();

/* ===== Photo viewer: opens photos on the same page (no new tabs) ===== */
(function () {
  "use strict";
  var groups = document.querySelectorAll(".story-gallery, .project-grid, .detail-gallery, .stages, .mini-gallery");
  if (!groups.length) return;

  var box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Photo viewer");
  box.innerHTML =
    '<button type="button" class="lb-close" aria-label="Close">×</button>' +
    '<button type="button" class="lb-prev" aria-label="Previous photo">‹</button>' +
    '<figure class="lb-figure"><img class="lb-img" alt=""><figcaption class="lb-cap"></figcaption></figure>' +
    '<button type="button" class="lb-next" aria-label="Next photo">›</button>';
  document.body.appendChild(box);
  var img = box.querySelector(".lb-img"), cap = box.querySelector(".lb-cap");
  var list = [], idx = 0, lastFocus = null;

  function captionFor(el) {
    var fig = el.closest("figure");
    var fc = fig && fig.querySelector("figcaption");
    return fc ? fc.textContent.trim() : el.alt;
  }
  function show(i) {
    idx = (i + list.length) % list.length;
    var el = list[idx];
    img.src = el.currentSrc || el.src;
    img.alt = el.alt;
    cap.textContent = captionFor(el) + "  ·  " + (idx + 1) + " / " + list.length;
    box.querySelector(".lb-prev").hidden = box.querySelector(".lb-next").hidden = list.length < 2;
  }
  function open(group, el) {
    list = Array.prototype.filter.call(group.querySelectorAll("img"), function (x) {
      var f = x.closest("figure"); return !(f && f.hidden);
    });
    lastFocus = document.activeElement;
    show(list.indexOf(el));
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lb-close").focus();
  }
  function close() {
    box.hidden = true;
    document.body.style.overflow = "";
    img.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }

  groups.forEach(function (g) {
    g.querySelectorAll("img").forEach(function (el) {
      el.classList.add("lb-thumb");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", "Enlarge photo: " + captionFor(el));
      el.addEventListener("click", function () { open(g, el); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(g, el); }
      });
    });
  });

  box.querySelector(".lb-close").addEventListener("click", close);
  box.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
  box.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "Tab") { /* keep focus inside the viewer */
      var f = Array.prototype.filter.call(box.querySelectorAll("button"), function (b) { return !b.hidden; });
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  /* swipe on phones */
  var x0 = null;
  box.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
