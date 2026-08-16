/* Portfolio-Interaktionen und Kontaktformular */

document.documentElement.classList.add('js');

function initializeFoldText() {
  if (!window.FoldText) return;
  window.FoldText.enhanceAll('.hero h1, .section-title', {
    splitBy: 'char',
    hinge: 'top',
    trigger: 'scroll',
    duration: 0.65,
    stagger: 0.035,
    ease: 'power3.out',
    perspective: 700,
    creaseShading: 0.55
  });
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(initializeFoldText);
} else {
  initializeFoldText();
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = document.querySelector('.site-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));

function closeNavigation(returnFocus) {
  const wasOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', 'false');
  navLinks.classList.remove('is-open');
  if (returnFocus && wasOpen) navToggle.focus();
}

navToggle.addEventListener('click', function () {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
  navLinks.classList.toggle('is-open', !isOpen);
});

sectionLinks.forEach(function (link) {
  link.addEventListener('click', function () {
    closeNavigation(false);
  });
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeNavigation(true);
});

function updateScrollState() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  nav.classList.toggle('is-scrolled', window.scrollY > 24);
  nav.style.setProperty('--scroll-progress', Math.min(progress, 1));
}

updateScrollState();
window.addEventListener('scroll', updateScrollState, { passive: true });

const sectionObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (!entry.isIntersecting) return;

    sectionLinks.forEach(function (link) {
      const isCurrent = link.getAttribute('href') === '#' + entry.target.id;
      if (isCurrent) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  });
}, { rootMargin: '-35% 0px -55% 0px' });

document.querySelectorAll('header[id], main section[id]').forEach(function (section) {
  sectionObserver.observe(section);
});

const revealElements = document.querySelectorAll('.section-label, .about-body, .profile-portrait, .focus-editorial, .highlight-card, .project-card, .contact-link, .contact-form-wrap');

if (reducedMotion) {
  revealElements.forEach(function (element) {
    element.classList.add('reveal', 'is-visible');
  });
} else {
  const revealObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  revealElements.forEach(function (element, index) {
    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', (index % 3) * 70 + 'ms');
    revealObserver.observe(element);
  });
}

const finePointer = window.matchMedia('(pointer: fine)').matches;

if (finePointer && !reducedMotion) {
  const hero = document.querySelector('.hero');
  const redShape = document.querySelector('.hero-shape--red');
  const blueShape = document.querySelector('.hero-shape--blue');
  const watermark = document.querySelector('.hero-watermark');

  hero.addEventListener('pointermove', function (event) {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    redShape.style.setProperty('--pointer-x', x * 24 + 'px');
    redShape.style.setProperty('--pointer-y', y * 24 + 'px');
    blueShape.style.setProperty('--pointer-x', x * -18 + 'px');
    blueShape.style.setProperty('--pointer-y', y * -18 + 'px');
    watermark.style.setProperty('--pointer-x', x * 12 + 'px');
    watermark.style.setProperty('--pointer-y', y * 12 + 'px');
  });

  const projectsGrid = document.querySelector('.projects-grid');
  document.querySelectorAll('.project-card').forEach(function (card) {
    card.addEventListener('pointerenter', function () {
      projectsGrid.classList.add('is-hovering');
    });
    card.addEventListener('pointermove', function (event) {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--card-x', event.clientX - bounds.left + 'px');
      card.style.setProperty('--card-y', event.clientY - bounds.top + 'px');
    });
    card.addEventListener('pointerleave', function () {
      projectsGrid.classList.remove('is-hovering');
    });
  });
}

const copyEmailButton = document.querySelector('[data-copy-email]');
let copyResetTimer;

copyEmailButton.addEventListener('click', async function () {
  const originalText = copyEmailButton.textContent;
  window.clearTimeout(copyResetTimer);
  try {
    await navigator.clipboard.writeText(copyEmailButton.dataset.copyEmail);
    copyEmailButton.textContent = 'E-Mail kopiert';
  } catch (error) {
    copyEmailButton.textContent = 'Kopieren nicht möglich';
  }
  copyResetTimer = window.setTimeout(function () {
    copyEmailButton.textContent = originalText;
  }, 2200);
});

const SUPABASE_URL = 'https://kxtxviyspjhwjrfwjxcm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4dHh2aXlzcGpod2pyZndqeGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Mzg4MTQsImV4cCI6MjEwMjExNDgxNH0.vAUPrjlT6KC7KX0cVDE3ZuQr17HCehdU1f0JZsCsRKk';
const form = document.getElementById('kontakt-form');
const messageEl = document.getElementById('form-message');
const submitBtn = document.getElementById('form-submit');

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = 'form-message form-message--' + type;
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  messageEl.className = 'form-message';

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!window.supabase) {
    showMessage('Das Formular ist gerade nicht verfügbar. Bitte schreiben Sie direkt an info@gittens-consulting.de.', 'error');
    return;
  }

  submitBtn.disabled = true;
  form.setAttribute('aria-busy', 'true');
  submitBtn.textContent = 'Wird gesendet …';

  try {
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error } = await supabase.from('kontaktanfragen').insert([{
      vorname: form.vorname.value.trim(),
      nachname: form.nachname.value.trim(),
      unternehmen: form.unternehmen.value.trim() || null,
      email: form.email.value.trim(),
      telefon: form.telefon.value.trim() || null,
      nachricht: form.nachricht.value.trim()
    }]);

    if (error) throw error;

    form.reset();
    showMessage('Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet. Ich melde mich in Kürze bei Ihnen.', 'success');
  } catch (error) {
    showMessage('Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie direkt an info@gittens-consulting.de.', 'error');
  } finally {
    submitBtn.disabled = false;
    form.removeAttribute('aria-busy');
    submitBtn.textContent = 'Senden';
  }
});
