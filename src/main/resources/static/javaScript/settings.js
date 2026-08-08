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