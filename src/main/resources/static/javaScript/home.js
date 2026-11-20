/* incaptur - home.js */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 3D LOGO BACKGROUND ---------- */
(function logo3d() {
    const cv = document.getElementById('bg3d');
    if (!window.THREE || !cv) return;
    const T = THREE, k = 0.05, cx = 104.75, cy = 100;
    let R;
    try {
        R = new T.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
    } catch (e) {
        return;
    }
    R.setPixelRatio(Math.min(devicePixelRatio, 2));
    const S = new T.Scene(), C = new T.PerspectiveCamera(40, 1, 0.1, 100);
    const mat = new T.MeshStandardMaterial({color: 0xc4cad3, metalness: 0.7, roughness: 0.28});
    const G = new T.Group();
    S.add(G);
    S.add(new T.AmbientLight(0xffffff, 0.55));
    const d1 = new T.DirectionalLight(0xffffff, 1.1);
    d1.position.set(5, 6, 8);
    S.add(d1);
    const d2 = new T.DirectionalLight(0x9fb4ff, 0.8);
    d2.position.set(-6, -2, 4);
    S.add(d2);

    // sample the same SVG paths used by the logo, so the 3D mark matches it exactly
    const ns = 'http://www.w3.org/2000/svg';
    const host = document.createElementNS(ns, 'svg');
    host.style.cssText = 'position:absolute;width:0;height:0';
    document.body.appendChild(host);
    const pt = (x, y) => new T.Vector3((x - cx) * k, -(y - cy) * k, 0);
    const RAD = 6.5 * k;
    [
        'M162.4 60.6A64 64 0 1 0 112 164C132 164 142 156 142 140V110C142 96 134 86 120 86C106 86 94 94 94 110',
        'M94 127.5V98'
    ].forEach(d => {
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        host.appendChild(p);
        const len = p.getTotalLength(), n = 160, pts = [];
        for (let i = 0; i <= n; i++) {
            const q = p.getPointAtLength(len * i / n);
            pts.push(pt(q.x, q.y));
        }
        G.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 240, RAD, 24, false), mat));
        [pts[0], pts[n]].forEach(c => {
            const s = new T.Mesh(new T.SphereGeometry(RAD, 24, 16), mat);
            s.position.copy(c);
            G.add(s);
        });
    });
    host.remove();
    const dot = new T.Mesh(new T.SphereGeometry(8 * k, 32, 20), mat);
    dot.position.copy(pt(94, 72));
    G.add(dot);

    let mx = 0, my = 0, base = 2.6, dim = 1;

    function fit() {
        const w = innerWidth, h = innerHeight, wide = w / h >= 1;
        R.setSize(w, h, false);
        C.aspect = w / h;
        C.updateProjectionMatrix();
        C.position.z = wide ? 10.5 : 15;
        base = wide && w > 900 ? 2.6 : 0;
        dim = w <= 900 ? 0.6 : 1;
    }

    function frame(t) {
        const p = Math.min(scrollY / innerHeight, 2.5);
        G.rotation.y = (reduce ? 0 : Math.sin(t * 0.00035) * 0.5) + mx * 0.5 + p * 1.1;
        G.rotation.x = my * 0.3 + (reduce ? 0 : Math.sin(t * 0.0005) * 0.06);
        G.position.x = base * (1 - Math.min(p, 1));
        G.scale.setScalar(1 + p * 0.15);
        cv.style.opacity = Math.max(0.28, 1 - p * 0.45) * dim;
        R.render(S, C);
        if (!reduce) requestAnimationFrame(frame);
    }

    addEventListener('resize', () => {
        fit();
        if (reduce) frame(0);
    });
    addEventListener('pointermove', e => {
        mx = e.clientX / innerWidth - 0.5;
        my = e.clientY / innerHeight - 0.5;
    }, {passive: true});
    fit();
    if (reduce) {
        addEventListener('scroll', () => frame(0), {passive: true});
        frame(0);
    } else requestAnimationFrame(frame);
})();

/* ---------- NAV + DASHBOARD PHOTO ---------- */
const nav = document.getElementById('nav');
const photo = document.querySelector('.bg-photo');
function onScroll() {
    nav.classList.toggle('scrolled', scrollY > 40);
    photo.style.opacity = (Math.min(scrollY / innerHeight, 1) * 0.65).toFixed(3);
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- MOBILE MENU ---------- */
const burger = document.getElementById('burger');
function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
document.getElementById('navLinks').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
addEventListener('resize', () => { if (innerWidth > 900) setMenu(false); });

/* ---------- MODALS ---------- */
const FEATURES = [
    { tab: 'Workspaces', title: 'Workspaces you can share',
        body: 'Coursework, a side project, a job search, a novel, a team\'s research. Each one gets its own workspace with its own notes, resources and activity. Invite people in, give each one a role, and work on the same material without stepping on each other.' },
    { tab: 'Editor', title: 'A note editor that stays out of your way',
        body: 'Markdown, math and code render cleanly as you write. Tag notes as you go, and incaptur suggests tags you have already used so your system stays consistent.',
        tags: ['#science', '#business', '#maths'] },
    { tab: 'Resources', title: 'A resource library with context',
        body: 'Save articles, docs and videos with real context attached: which workspace they belong to, which notes mention them, and why you saved them in the first place.' },
    { tab: 'Search', title: 'Find anything in the app.',
        body: 'One bar covers note titles, note bodies, resource links, workspace names and tags. Type a few characters and stop scrolling through folders.' }
];
const fm = document.getElementById('featureModal');
const qm = document.getElementById('faqModal');
const tabs = document.getElementById('fTabs');

tabs.innerHTML = FEATURES.map((f, i) => `<button role="tab" data-t="${i}">${f.tab}</button>`).join('');
function showFeature(i) {
    const f = FEATURES[i];
    document.getElementById('fTitle').textContent = f.title;
    document.getElementById('fBody').textContent = f.body;
    document.getElementById('fTags').innerHTML = (f.tags || []).map(t => `<span>${t}</span>`).join('');
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
}
tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) showFeature(+b.dataset.t); });

document.addEventListener('click', e => {
    const f = e.target.closest('[data-f]');
    if (f) { e.preventDefault(); showFeature(+f.dataset.f); fm.showModal(); return; }
    if (e.target.closest('[data-open="faq"]')) { e.preventDefault(); qm.showModal(); return; }
    if (e.target.closest('[data-close]')) { e.target.closest('dialog').close(); return; }
    if (e.target.tagName === 'DIALOG') e.target.close();   // click on the backdrop
});

/* ---------- STATS COUNT-UP + YEAR ---------- */
document.querySelectorAll('.stats strong').forEach(el => {
    const target = parseInt(el.textContent.replace(/,/g, ''), 10);
    if (!target || reduce) return;
    const t0 = performance.now();
    (function tick(now) {
        const p = Math.min((now - t0) / 1200, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
});
document.getElementById('year').textContent = new Date().getFullYear();