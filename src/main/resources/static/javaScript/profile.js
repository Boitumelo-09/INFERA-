
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('avatarDropzone');
    const input = document.getElementById('avatarInput');
    const menu = document.getElementById('avatarMenu');
    const menuUpdate = document.getElementById('avatarMenuUpdate');
    const menuDelete = document.getElementById('avatarMenuDelete');
    const bio = document.getElementById('bioInput');
    const bioCount = document.getElementById('bioCount');

    if (bio && bioCount) {
        const updateCount = () => bioCount.textContent = bio.value.length;
        bio.addEventListener('input', updateCount);
        updateCount();
    }

    const avatarToggle = document.getElementById('avatarToggle');
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (dropzone && menu) {
        let hideTimer;
        const showMenu = () => { clearTimeout(hideTimer); menu.classList.add('show'); };
        const hideMenu = () => { hideTimer = setTimeout(() => menu.classList.remove('show'), 150); };
        if (canHover) {
            dropzone.addEventListener('mouseenter', showMenu);
            dropzone.addEventListener('mouseleave', hideMenu);
            menu.addEventListener('mouseenter', showMenu);
            menu.addEventListener('mouseleave', hideMenu);
            dropzone.addEventListener('click', () => input.click());
        }

        avatarToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== avatarToggle) menu.classList.remove('show');
        });

        menuUpdate.addEventListener('click', () => { input.click(); menu.classList.remove('show'); });
        menuDelete.addEventListener('click', () => {
            menu.classList.remove('show');
            const csrfToken = document.querySelector('input[name="_csrf"]').value;
            const formData = new FormData();
            formData.append('_csrf', csrfToken);
            fetch('/profile/avatar/delete', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const img = document.getElementById('avatarImg');
                        if (img) {
                            const fallback = document.createElement('div');
                            fallback.id = 'avatarFallback';
                            fallback.className = 'prof-avatar-fallback';
                            fallback.textContent = dropzone.dataset.initials || '';
                            img.replaceWith(fallback);
                        }
                        showToast('Profile picture removed');
                    } else {
                        showToast(data.message || 'Delete failed', true);
                    }
                })
                .catch(() => showToast('Delete failed', true));
        });

        ['dragenter', 'dragover'].forEach(evt =>
            dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag-over'); })
        );
        ['dragleave', 'drop'].forEach(evt =>
            dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag-over'); })
        );
        dropzone.addEventListener('drop', e => {
            const file = e.dataTransfer.files[0];
            if (file) uploadAvatar(file);
        });
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) uploadAvatar(file);
        });
    }

    function uploadAvatar(file) {
        const csrfToken = document.querySelector('input[name="_csrf"]').value;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('_csrf', csrfToken);

        fetch('/profile/avatar', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderAvatar(data.avatarUrl);
                    const topbarImg = document.querySelector('.topbar-avatar-img');
                    const topbarFallback = document.querySelector('.topbar-avatar');
                    if (topbarImg) { topbarImg.src = data.avatarUrl; topbarImg.style.display = ''; if (topbarFallback) topbarFallback.style.display = 'none'; }
                    showToast('Profile picture updated');
                } else {
                    showToast(data.message || 'Upload failed', true);
                }
            })
            .catch(() => showToast('Upload failed', true));
    }

    function renderAvatar(url) {
        const existingImg = document.getElementById('avatarImg');
        const fallback = document.getElementById('avatarFallback');
        if (existingImg) {
            existingImg.src = url;
        } else if (fallback) {
            const img = document.createElement('img');
            img.id = 'avatarImg';
            img.className = 'prof-avatar-img';
            img.src = url;
            fallback.replaceWith(img);
        }
    }
});

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
const dot = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px'; dot.style.top = mouseY + 'px';
});
(function animateRing() {
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
})();
document.querySelectorAll('a, button, input, label').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});
