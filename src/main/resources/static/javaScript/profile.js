document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('avatarDropzone');
    const input = document.getElementById('avatarInput');
    const bio = document.getElementById('bioInput');
    const bioCount = document.getElementById('bioCount');

    if (bio && bioCount) {
        const updateCount = () => bioCount.textContent = bio.value.length;
        bio.addEventListener('input', updateCount);
        updateCount();
    }

    if (!dropzone) return;

    dropzone.addEventListener('click', () => input.click());
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

    function uploadAvatar(file) {
        const csrfToken = document.querySelector('input[name="_csrf"]').value;
        const csrfHeader = '_csrf';
        const formData = new FormData();
        formData.append('file', file);
        formData.append(csrfHeader, csrfToken);

        fetch('/profile/avatar', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderAvatar(data.avatarUrl);
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
