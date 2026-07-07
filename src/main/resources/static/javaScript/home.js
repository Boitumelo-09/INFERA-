/* ─────────────────────────────────────────
   INFERA — home.js
───────────────────────────────────────── */

// ─── CUSTOM CURSOR ───────────────────────
const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');

let mouseX = 0, mouseY = 0;
let ringX  = 0, ringY  = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top  = mouseY + 'px';
});

// Smooth ring follow
function animateRing() {
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
}
animateRing();

// Hover state on interactive elements
const hoverTargets = document.querySelectorAll('a, button, [data-cursor-hover]');
hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

// Hide cursor when it leaves window
document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
});

// ─── NAVBAR SCROLL ───────────────────────
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}, { passive: true });

// ─── LIGHTWEIGHT AOS ─────────────────────
(function () {
    const elements = document.querySelectorAll('[data-aos]');
    const delays   = {};

    elements.forEach(el => {
        const delay = parseInt(el.getAttribute('data-aos-delay') || 0);
        delays.set ? null : (delays[el] = delay);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el    = entry.target;
                const delay = parseInt(el.getAttribute('data-aos-delay') || 0);
                setTimeout(() => el.classList.add('aos-animate'), delay);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(el => observer.observe(el));
})();

// ─── SMOOTH SCROLL FOR NAV LINKS ─────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });

        // close mobile nav if open
        const navCollapse = document.getElementById('navMenu');
        if (navCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
            if (bsCollapse) bsCollapse.hide();
        }
    });
});

// ─── ACTIVE NAV LINK on scroll ───────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-center .nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        if (window.scrollY >= section.offsetTop - 100) {
            current = section.getAttribute('id');
        }
    });
    navLinks.forEach(link => {
        link.classList.remove('active-link');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active-link');
        }
    });
}, { passive: true });

// ─── HERO PARALLAX (subtle) ──────────────
const heroOrbs = document.querySelectorAll('.hero-orb');
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    heroOrbs.forEach((orb, i) => {
        const speed = i === 0 ? 0.12 : -0.07;
        orb.style.transform = `translateX(-50%) translateY(${y * speed}px)`;
    });
}, { passive: true });

// Style active nav link
const style = document.createElement('style');
style.textContent = `.nav-center .nav-link.active-link { color: var(--text) !important; }`;
document.head.appendChild(style);
document.getElementById("year").textContent = new Date().getFullYear().toString();