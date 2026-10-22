// ===== RUNHTec Contractors: site scripts =====

// Mobile menu open/close
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(link =>
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  })
);

// Current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Quote form: sends by WhatsApp or email (no server needed)
const WHATSAPP = { Rwanda: '250788307673', Uganda: '256754625168' };
const EMAIL = 'contact@runhteccontractors.com';

const form = document.getElementById('quote-form');
const errorBox = document.getElementById('form-error');
let via = 'whatsapp';

form.querySelectorAll('button[type="submit"]').forEach(btn =>
  btn.addEventListener('click', () => { via = btn.dataset.via; })
);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  if (!d.name.trim() || !d.phone.trim() || !d.service || !d.message.trim()) {
    errorBox.textContent = 'Please fill in your name, phone, service and project details.';
    return;
  }
  errorBox.textContent = '';

  const text =
    `Hello RUNHTec, I would like a quote.\n\n` +
    `Name: ${d.name}\nPhone: ${d.phone}\n` +
    (d.email ? `Email: ${d.email}\n` : '') +
    `Service: ${d.service}\nCountry: ${d.country}\n\n` +
    `Project details:\n${d.message}`;

  if (via === 'whatsapp') {
    window.open(`https://wa.me/${WHATSAPP[d.country]}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  } else {
    const subject = `Quote request: ${d.service} (${d.country})`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }
});
