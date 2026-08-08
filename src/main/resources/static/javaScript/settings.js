function showToast(message, isError = false) {
    const toast = document.getElementById('inferaToast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMessage');
    if (!toast) return;
    msg.textContent = message;
    icon.classList.toggle('error', isError);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // Theme switching — only present on settings.html, but this file loads sitewide
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const theme = opt.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');

            const csrfToken = document.querySelector('input[name="_csrf"]')?.value;
            const formData = new FormData();
            formData.append('theme', theme);
            if (csrfToken) formData.append('_csrf', csrfToken);
            fetch('/settings/theme', { method: 'POST', body: formData }).catch(() => {});
        });
    });

    // Delete account confirm-text gate
    const confirmInput = document.getElementById('deleteConfirmInput');
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    if (confirmInput && confirmBtn) {
        confirmInput.addEventListener('input', () => {
            confirmBtn.disabled = confirmInput.value.trim() !== 'DELETE';
        });
    }
});

const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

if (dot && ring) {
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        dot.style.left = mouseX + 'px';
        dot.style.top  = mouseY + 'px';
    });
    (function animateRing() {
        ringX += (mouseX - ringX) * 0.14;
        ringY += (mouseY - ringY) * 0.14;
        ring.style.left = ringX + 'px';
        ring.style.top  = ringY + 'px';
        requestAnimationFrame(animateRing);
    })();
}
document.querySelectorAll('a, button, input, label').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});
document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

function showToast(message, isError = false) {
    const toast = document.getElementById('inferaToast');
    const icon = document.getElementById('toastIcon');
    const msg = document.getElementById('toastMsg');
    if (!toast) return;
    msg.textContent = message;
    icon.innerHTML = isError ? '<i class="bi bi-exclamation-circle"></i>' : '<i class="bi bi-check2-circle"></i>';
    icon.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    function openSidebar() { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); document.body.style.overflow = ''; }
    sidebarToggle?.addEventListener('click', openSidebar);
    sidebarClose?.addEventListener('click', closeSidebar);
    sidebarOverlay?.addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => { if (window.innerWidth >= 992) closeSidebar(); }, { passive: true });
});