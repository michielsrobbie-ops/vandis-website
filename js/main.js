// Van Dis Solutions — gedeelde scripts

// reveal on scroll
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// mobiel menu
const ham = document.getElementById('hamburger');
if (ham) ham.addEventListener('click', () => document.querySelector('nav').classList.toggle('open'));

// actieve navigatielink
const here = location.pathname.replace(/\/+$/, '') || '/';
document.querySelectorAll('nav a[href]').forEach(a => {
  const h = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/';
  if (h === here && !a.classList.contains('cta')) a.classList.add('active');
});

// tellers
function countUp(el, target, dur) {
  let s = null;
  function step(ts) {
    if (!s) s = ts;
    const p = Math.min((ts - s) / dur, 1);
    el.textContent = Math.floor(p * target);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
document.querySelectorAll('[data-count]').forEach(el => {
  const obs = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { countUp(el, +el.dataset.count, 1600); obs.disconnect(); }
  }, { threshold: .4 });
  obs.observe(el);
});

// cookiebanner (consent vóór eventuele tracking)
(function () {
  const bar = document.getElementById('cookiebar');
  if (!bar) return;
  const consent = localStorage.getItem('vds-consent');
  if (!consent) bar.classList.add('show');
  window.vdsConsent = function (val) {
    localStorage.setItem('vds-consent', val);
    bar.classList.remove('show');
    if (val === 'all') loadTracking();
  };
  if (consent === 'all') loadTracking();
  function loadTracking() {
    // Hier pas GTM/Analytics laden — nooit vóór toestemming.
    // Voorbeeld: var s=document.createElement('script');s.src='https://www.googletagmanager.com/gtm.js?id=GTM-XXXX';document.head.appendChild(s);
  }
})();

// ===== motion upgrade =====
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// header krimpt + scroll-progress
const hdr = document.querySelector('header');
const sig = document.getElementById('signal');
let prog = null;
if (sig) { prog = document.createElement('div'); prog.className = 'progress'; sig.appendChild(prog); }
addEventListener('scroll', () => {
  if (hdr) hdr.classList.toggle('scrolled', scrollY > 60);
  if (prog) {
    const h = document.documentElement;
    prog.style.height = (scrollY / (h.scrollHeight - innerHeight) * 100) + '%';
  }
}, { passive: true });

// staggered reveal: kinderen van grids krijgen oplopende delay
document.querySelectorAll('.reveal').forEach(parent => {
  if (parent.matches('.grid3,.grid2,.steps')) {
    [...parent.children].forEach((c, i) => {
      c.classList.add('rc');
      c.style.transitionDelay = (i * 90) + 'ms';
    });
  }
});

// subtiele 3D-tilt op cards (niet op touch / reduced motion)
if (!reduced && matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `translateY(-5px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

// parallax op grid-achtergrond
if (!reduced) {
  const bg = document.querySelector('.grid-bg');
  if (bg) addEventListener('scroll', () => {
    bg.style.backgroundPosition = `0 ${scrollY * -.06}px, ${scrollY * -.06}px 0`;
  }, { passive: true });
}

// dropdown op touch-apparaten (tablet/desktop-breedte): eerste tik opent, tweede navigeert
if (matchMedia('(pointer:coarse)').matches) {
  document.querySelectorAll('.nav-dd > a').forEach(a => {
    a.addEventListener('click', e => {
      const dd = a.parentElement;
      if (!dd.classList.contains('open')) {
        e.preventDefault();
        document.querySelectorAll('.nav-dd.open').forEach(o => o.classList.remove('open'));
        dd.classList.add('open');
      }
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-dd')) {
      document.querySelectorAll('.nav-dd.open').forEach(o => o.classList.remove('open'));
    }
  });
}
