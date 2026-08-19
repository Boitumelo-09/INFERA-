/* ─────────────────────────────────────────
   INFERA — home.js
───────────────────────────────────────── */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

if (prefersReducedMotion) {
    document.querySelectorAll('svg').forEach(svg => svg.pauseAnimations && svg.pauseAnimations());
}
// ─── NAVBAR SCROLL STATE ─────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
}, { passive: true });

// ─── HAMBURGER MENU ──────────────────────
const hamburger = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
const backdrop = document.getElementById('menuBackdrop');

function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    backdrop.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-locked');
}
function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    backdrop.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-locked');
}
if (hamburger) {
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.contains('open') ? closeMenu() : openMenu();
    });
    backdrop.addEventListener('click', closeMenu);
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && mobileMenu.classList.contains('open')) closeMenu();
    });
}

// ─── SMOOTH SCROLL FOR ANCHOR LINKS ──────
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
});

// ─── FAQ ACCORDION ───────────────────────
document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(open => {
            if (open !== item) {
                open.classList.remove('open');
                open.querySelector('.faq-answer').style.maxHeight = null;
                open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            }
        });
        if (isOpen) {
            item.classList.remove('open');
            answer.style.maxHeight = null;
            question.setAttribute('aria-expanded', 'false');
        } else {
            item.classList.add('open');
            answer.style.maxHeight = answer.scrollHeight + 'px';
            question.setAttribute('aria-expanded', 'true');
        }
    });
});

// ─── SCROLL REVEAL (with natural per-item stagger) ──
(function initScrollReveal() {
    if (prefersReducedMotion) return;

    const groups = [
        { selector: '.value-item', parent: '.values-grid' },
        { selector: '.showcase-row', parent: null },
        { selector: '.why-item', parent: '.why-list' },
        { selector: '.faq-item', parent: '.faq-list' },
    ];

    const singles = ['.eyebrow', '.section-title', '.section-sub', '.hero-text > *', '.cta-headline', '.cta-sub'];

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    groups.forEach(({ selector, parent }) => {
        const scopes = parent ? document.querySelectorAll(parent) : [document];
        scopes.forEach(scope => {
            const items = (parent ? scope : document).querySelectorAll(selector);
            items.forEach((el, i) => {
                el.classList.add('reveal-init');
                el.style.transitionDelay = `${Math.min(i * 70, 400)}ms`;
                observer.observe(el);
            });
        });
    });

    document.querySelectorAll(singles.join(',')).forEach(el => {
        if (el.closest('.hero-text')) return; // hero handled separately on load
        el.classList.add('reveal-init');
        observer.observe(el);
    });
})();

// ─── HERO ENTRANCE (on load, not on scroll) ──
(function heroEntrance() {
    if (prefersReducedMotion) return;
    const heroBits = document.querySelectorAll('.hero-logo-col, .hero-headline, .hero-sub, .hero-cta, .hero-stats');
    heroBits.forEach((el, i) => {
        el.classList.add('reveal-init');
        el.style.transitionDelay = `${i * 110}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('reveal-in')));
    });
})();

// ─── COUNT-UP FOR HERO STATS ─────────────
(function countUpStats() {
    const statEls = document.querySelectorAll('.hero-stats strong');
    if (!statEls.length) return;

    function animateCount(el) {
        const raw = el.textContent.trim();
        const match = raw.match(/[\d,]+/);
        if (!match) return;
        const target = parseInt(match[0].replace(/,/g, ''), 10);
        if (isNaN(target) || target === 0) return;
        const suffix = raw.slice(match.index + match[0].length);
        if (prefersReducedMotion) { el.textContent = target.toLocaleString() + suffix; return; }

        const duration = 1100;
        const start = performance.now();
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                statEls.forEach(animateCount);
                statsObserver.disconnect();
            }
        });
    }, { threshold: 0.4 });
    statsObserver.observe(document.querySelector('.hero-stats'));
})();

// ─── SUBTLE PARALLAX ON HERO LOGO + GLOW ──
(function heroParallax() {
    if (prefersReducedMotion || !hasFinePointer) return;
    const heroSection = document.querySelector('.hero-section');
    const logo = document.querySelector('.hero-logo-mark');
    if (!heroSection || !logo) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const rect = heroSection.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                const progress = -rect.top / (rect.height || 1);
                logo.style.transform = `translateY(${progress * 34}px) rotate(${progress * 3}deg)`;
                heroSection.style.setProperty('--scroll-shift', `${progress * 18}px`);
            }
            ticking = false;
        });
    }, { passive: true });
})();

// ─── SOFT TILT ON INTERACTIVE CARDS ──────
(function tiltCards() {
    if (prefersReducedMotion || !hasFinePointer) return;
    const targets = document.querySelectorAll('.value-item, .showcase-visual .shot-placeholder, .why-item');
    targets.forEach(card => {
        card.classList.add('tilt-target');
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(600px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg) translateY(-2px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
})();

// ─── YEAR ─────────────────────────────────
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear().toString();