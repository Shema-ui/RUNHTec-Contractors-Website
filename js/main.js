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

      if (cfg.formEndpoint) {
        /* Send to the form service, which emails RUNHTec */
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
          showStatus(form, "success", "Thank you, " + data.name.split(" ")[0] + ". Your " + (kind === "quote" ? "request" : "message") + " has been sent. Our team will contact you.");
        }).catch(function () {
          var o = officeFor(data.country);
          showStatus(form, "error", "Sorry, your message could not be sent. Please try again, or call or WhatsApp us on " + o.phone_display + ".");
        }).finally(function () { btn.disabled = false; });
      } else {
        /* No form service set up: open WhatsApp with the message ready to send */
        var office = officeFor(data.country);
        var url = "https://wa.me/" + office.whatsapp + "?text=" + encodeURIComponent(summary(data, kind));
        var win = window.open(url, "_blank");
        if (win) { win.opener = null; } else { window.location.href = url; }
        showStatus(form, "success", "WhatsApp has opened with your " + (kind === "quote" ? "request" : "message") + " to our " + office.country + " office. Tap send in WhatsApp to deliver it.");
      }
    });
  });
})();
