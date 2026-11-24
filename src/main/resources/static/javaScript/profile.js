
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('avatarDropzone');
    const input = document.getElementById('avatarInput');
    const menu = document.getElementById('avatarMenu');
    const menuUpdate = document.getElementById('avatarMenuUpdate');
    const menuDelete = document.getElementById('avatarMenuDelete');
    const bio = document.getElementById('bioInput');
    const bioCount = document.getElementById('bioCount');
    const profileFields = document.querySelectorAll('[data-field]');
    const saved = {};
    profileFields.forEach(el => { saved[el.dataset.field] = el.value.trim(); });

    const fitBio = () => {
        if (!bio) return;
        bio.style.height = 'auto';
        bio.style.height = bio.scrollHeight + 'px';
        bioCount.textContent = bio.value.length + '/280';
        bioCount.classList.toggle('show', bio.value.length >= 240);
    };
    if (bio) { bio.addEventListener('input', fitBio); fitBio(); }

    function saveField(el) {
        const field = el.dataset.field;
        const value = el.value.trim();
        el.value = value;
        if (value === saved[field]) return;

        if ((field === 'firstName' || field === 'lastName') && !value) {
            el.value = saved[field];
            el.classList.add('is-invalid');
            setTimeout(() => el.classList.remove('is-invalid'), 1200);
            showToast("Name can't be empty", true);
            return;
        }

        const csrfToken = document.querySelector('input[name="_csrf"]').value;
        const body = new FormData();
        body.append('_csrf', csrfToken);
        profileFields.forEach(f => {
            const k = f.dataset.field;
            body.append(k, k === field ? value : saved[k]);
        });

        fetch('/profile/update', { method: 'POST', body })
            .then(res => res.json())
            .then(data => {
                if (!data.success) { showToast(data.message || 'Save failed', true); return; }
                saved[field] = value;
                showToast('Saved');
                if (field === 'firstName') {
                    const bc = document.querySelector('.bc-root');
                    if (bc) bc.textContent = value + "'s";
                }
                if (field === 'firstName' || field === 'lastName') {
                    const initials = (saved.firstName[0] || '') + (saved.lastName[0] || '');
                    if (dropzone) dropzone.dataset.initials = initials;
                    const fb = document.getElementById('avatarFallback');
                    if (fb) fb.textContent = initials;
                }
            })
            .catch(() => showToast('Save failed', true));
    }

    profileFields.forEach(el => {
        el.addEventListener('blur', () => saveField(el));
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' && el.tagName === 'INPUT') { e.preventDefault(); el.blur(); }
            if (e.key === 'Escape') { el.value = saved[el.dataset.field]; if (el === bio) fitBio(); el.blur(); }
        });
    });

    if (dropzone && menu) {
        dropzone.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
        dropzone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); menu.classList.toggle('show'); }
        });
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) menu.classList.remove('show');
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

