/* ============================================================
   FIESTA DEL ENCANTO — main.js
   Bazar de Artes Urbanas · Circo de Medellín · 4 de Julio
   ============================================================ */

'use strict';

/* ══════════════════════════════
   NAVBAR — scroll behaviour
══════════════════════════════ */
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });


/* ══════════════════════════════
   NAVBAR — hamburger menu
══════════════════════════════ */
const hamburger = document.querySelector('.nav-hamburger');
const navLinks  = document.querySelector('.nav-links');

if (hamburger && navLinks) {

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    // Animate bars into X
    const bars = hamburger.querySelectorAll('span');
    if (isOpen) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity   = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
    }
  });

  // Close on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.querySelectorAll('span').forEach(b => {
        b.style.transform = '';
        b.style.opacity   = '';
      });
    });
  });
}


/* ══════════════════════════════
   SCROLL REVEAL
══════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -32px 0px',
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ══════════════════════════════
   SMOOTH ANCHOR LINKS
══════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


/* ══════════════════════════════
   BOLETA CARD SELECTION
══════════════════════════════ */
const boletaCards = document.querySelectorAll('.bol-card');
const boletaSelect = document.getElementById('boleta-select');

// Price lookup (COP)
const precios = {
  1: { total: 25000,  label: '1 Persona'  },
  2: { total: 50000,  label: '2 Personas' },
  3: { total: 75000,  label: '3 Personas' },
  4: { total: 100000, label: '4 Personas' },
};

// Click on card → activate + sync form select + scroll to form
boletaCards.forEach(card => {
  card.addEventListener('click', () => {
    const qty = parseInt(card.dataset.personas, 10);

    boletaCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    if (boletaSelect) boletaSelect.value = qty;

    const formSection = document.getElementById('compra');
    if (formSection) {
      setTimeout(() => {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  });

  // Keyboard accessibility
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});

// Select dropdown → sync card highlight
if (boletaSelect) {
  boletaSelect.addEventListener('change', () => {
    const val = parseInt(boletaSelect.value, 10);
    boletaCards.forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.personas, 10) === val);
    });
  });
}


/* ══════════════════════════════
   CHECKOUT FORM — submit to PHP
══════════════════════════════ */
const checkoutForm = document.getElementById('checkout-form');

if (checkoutForm) {
  checkoutForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nombre   = document.getElementById('nombre').value.trim();
    const email    = document.getElementById('email').value.trim();
    const personas = parseInt(boletaSelect?.value || 1, 10);

    // Validate
    if (!nombre || !email) {
      showToast('Por favor completa todos los campos ✨', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Ingresa un correo electrónico válido 📧', 'error');
      return;
    }

    // Build payload for PHP backend
    const payload = {
      nombre,
      email,
      personas,
      precio_unit:  precios[personas].total / personas,
      precio_total: precios[personas].total,
      referencia:   'FDE-' + Date.now(),
      descripcion:  `Fiesta del Encanto — ${precios[personas].label}`,
    };

    const submitBtn = checkoutForm.querySelector('.form-submit');
    submitBtn.textContent = 'PROCESANDO...';
    submitBtn.disabled    = true;

    try {
      const res  = await fetch('php/checkout.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.url) {
        // ✅ Redirect to Wompi checkout
        window.location.href = data.url;
      } else {
        showToast('Error: ' + (data.error || 'Intenta de nuevo'), 'error');
        submitBtn.textContent = 'COMPRAR BOLETA';
        submitBtn.disabled    = false;
      }
    } catch {
      showToast('Hubo un problema de conexión. Inténtalo de nuevo 🔄', 'error');
      submitBtn.textContent = 'COMPRAR BOLETA';
      submitBtn.disabled    = false;
    }
  });
}


/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(message, type = 'info') {
  // Remove existing toast
  document.querySelector('.fde-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'fde-toast';
  toast.textContent = message;

  Object.assign(toast.style, {
    position:    'fixed',
    bottom:      '28px',
    left:        '50%',
    transform:   'translateX(-50%) translateY(14px)',
    background:  type === 'error' ? '#C1121F' : '#F4B400',
    color:       type === 'error' ? '#fff'    : '#000',
    fontFamily:  "'Oswald', sans-serif",
    fontSize:    '.95rem',
    fontWeight:  '700',
    letterSpacing: '2px',
    padding:     '12px 28px',
    zIndex:      '9999',
    opacity:     '0',
    transition:  'all .4s ease',
    clipPath:    'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)',
    whiteSpace:  'nowrap',
  });

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(14px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}


/* ══════════════════════════════
   INIT — default active card
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const defaultCard = document.querySelector('.bol-card[data-personas="2"]');
  if (defaultCard) defaultCard.classList.add('active');
  if (boletaSelect) boletaSelect.value = '2';
});
