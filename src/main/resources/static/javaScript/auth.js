/* ─────────────────────────────────────────
   INFERA — auth.js  (unified email-OTP + OAuth)
───────────────────────────────────────── */


// ─── CSRF ─────────────────────────────────
const csrfToken  = document.querySelector('meta[name="_csrf"]')?.content;
const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;

const recaptchaSiteKey = document.querySelector('meta[name="recaptcha-site-key"]')?.content;

// Tokens are single-use and expire after ~2 min, so fetch a fresh one per request
function getRecaptchaToken(action) {
    return new Promise((resolve) => {
        if (!window.grecaptcha || !recaptchaSiteKey) return resolve(null);
        grecaptcha.ready(() => {
            grecaptcha.execute(recaptchaSiteKey, { action })
                .then(resolve)
                .catch(() => resolve(null));
        });
    });
}

function authFetch(url, body, extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (csrfToken && csrfHeader) headers[csrfHeader] = csrfToken;
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}
// add anywhere in auth.js, ideally near the top
function showToast(msg, type = 'success') {
    const toast = document.getElementById('authToast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');
    if (!toast) return;

    toastMsg.textContent = msg;
    toastIcon.className = 'toast-icon' + (type === 'error' ? ' error' : '');
    toastIcon.innerHTML = type === 'error'
        ? '<i class="bi bi-exclamation-circle"></i>'
        : '<i class="bi bi-check2-circle"></i>';

    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}
// ─── ELEMENTS ─────────────────────────────
const stepEmail   = document.getElementById('stepEmail');
const stepCode    = document.getElementById('stepCode');
const emailInput  = document.getElementById('email');
const emailErr    = document.getElementById('emailErr');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const codeEmailDisplay = document.getElementById('codeEmailDisplay');
const editEmailBtn = document.getElementById('editEmailBtn');
const otpBoxesWrap  = document.getElementById('otpBoxes');
const otpBoxes      = Array.from(document.querySelectorAll('.otp-box'));
const verifyBtn      = document.getElementById('verifyBtn');
const resendBtn      = document.getElementById('resendBtn');
const resendIdle     = document.getElementById('resendIdle');
const resendCooldown = document.getElementById('resendCooldown');
const resendTimer    = document.getElementById('resendTimer');
const authAlert     = document.getElementById('authAlert');
const authAlertText = document.getElementById('authAlertText');

const authOptions    = document.getElementById('authOptions');
const emailToggleBtn = document.getElementById('emailToggleBtn');
const backToOptions  = document.getElementById('backToOptions');
const authTitle      = document.getElementById('authTitle');
const authSub        = document.getElementById('authSub');

const views = { options: authOptions, email: stepEmail, code: stepCode };
const viewCopy = {
    options: ['Continue to incaptur.', 'Your mind has no save button. We do!'],
    email:   ['Continue with email', 'We’ll send a 6-digit code to sign you in.'],
    code:    ['Check your inbox', 'Enter the code to finish signing in.']
};

function showView(name) {
    Object.entries(views).forEach(([key, el]) => el.classList.toggle('d-none', key !== name));
    authTitle.textContent = viewCopy[name][0];
    authSub.textContent = viewCopy[name][1];
    hideAlert();
    const el = views[name];            // replay the fade-in
    el.classList.remove('view');
    void el.offsetWidth;
    el.classList.add('view');
}

emailToggleBtn.addEventListener('click', () => { showView('email'); emailInput.focus(); });
backToOptions.addEventListener('click', () => showView('options'));

let currentEmail = '';
let cooldownInterval = null;

// ─── ALERT HELPERS ────────────────────────
function showAlert(message) {
    authAlertText.textContent = message;
    authAlert.classList.remove('d-none');
}
function hideAlert() {
    authAlert.classList.add('d-none');
}

// ─── BUTTON SPINNER HELPERS ───────────────
function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-submit-text');
    const spinner = btn.querySelector('.btn-submit-spinner');
    btn.disabled = loading;
    text.classList.toggle('d-none', loading);
    spinner.classList.toggle('d-none', !loading);
}

// ─── EMAIL VALIDATION ─────────────────────
function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

// ─── STEP 1: SEND CODE ────────────────────
sendCodeBtn.addEventListener('click', async () => {
    hideAlert();
    const email = emailInput.value.trim().toLowerCase();

    if (!isValidEmail(email)) {
        emailInput.classList.add('is-error');
        emailErr.textContent = 'Enter a valid email address';
        return;
    }
    emailInput.classList.remove('is-error');
    emailErr.textContent = '';

    setLoading(sendCodeBtn, true);
    try {
        const recaptcha = await getRecaptchaToken('request_otp');
        const res = await authFetch('/auth/request-code', { email }, { 'X-Recaptcha-Token': recaptcha || '' });
        const data = await res.json();

        if (res.ok) {
            currentEmail = email;
            enterCodeStep(email);
            startResendCooldown();
        } else if (data.status === 'cooldown') {
            currentEmail = email;
            enterCodeStep(email);
            startResendCooldown();
        } else {
            showAlert(data.message || 'Something went wrong. Try again.');
        }
    } catch {
        showAlert('Could not reach the server. Check your connection.');
    } finally {
        setLoading(sendCodeBtn, false);
    }
});

emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendCodeBtn.click(); }
});

function enterCodeStep(email) {
    codeEmailDisplay.textContent = email;
    showView('code');
    otpBoxes.forEach(b => b.value = '');
    otpBoxes[0].focus();
    updateVerifyState();
}

editEmailBtn.addEventListener('click', () => {
    showView('email');
    clearInterval(cooldownInterval);
    resendCooldown.classList.add('d-none');
    resendIdle.classList.remove('d-none');
    emailInput.focus();
    emailInput.select();
});

// ─── STEP 2: OTP BOXES ─────────────────────
otpBoxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
        box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
        if (box.value && idx < otpBoxes.length - 1) otpBoxes[idx + 1].focus();
        updateVerifyState();
    });

    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
            otpBoxes[idx - 1].focus();
            otpBoxes[idx - 1].value = '';
            updateVerifyState();
        }
    });

    box.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
        pasted.split('').forEach((digit, i) => { if (otpBoxes[i]) otpBoxes[i].value = digit; });
        const nextEmpty = otpBoxes.findIndex(b => !b.value);
        (nextEmpty === -1 ? otpBoxes[5] : otpBoxes[nextEmpty]).focus();
        updateVerifyState();
    });
});

function getCode() {
    return otpBoxes.map(b => b.value).join('');
}

function updateVerifyState() {
    const code = getCode();
    verifyBtn.disabled = code.length !== 6;
    if (code.length === 6) verifyCode();
}

let verifying = false;

async function verifyCode() {
    if (verifying) return;
    hideAlert();
    const code = getCode();
    if (code.length !== 6) return;

    verifying = true;
    setLoading(verifyBtn, true);
    try {
        const res = await authFetch('/auth/verify-code', { email: currentEmail, code });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            otpBoxesWrap.classList.add('success');
            setLoading(verifyBtn, false);
            verifyBtn.disabled = true;
            verifyBtn.querySelector('.btn-submit-text').innerHTML = '<i class="bi bi-check2"></i> Verified';
            setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 500);
        } else {
            otpBoxesWrap.classList.add('shake');
            setTimeout(() => otpBoxesWrap.classList.remove('shake'), 400);
            otpBoxes.forEach(b => b.value = '');
            otpBoxes[0].focus();
            showAlert(data.message || 'Incorrect code.');
            verifying = false;
            setLoading(verifyBtn, false);
            verifyBtn.disabled = true;
        }
    } catch {
        showAlert('Could not reach the server. Check your connection.');
        verifying = false;
        setLoading(verifyBtn, false);
    }
}

verifyBtn.addEventListener('click', verifyCode);

// ─── RESEND ─────────────────────────────────
resendBtn.addEventListener('click', async () => {
    hideAlert();
    try {
        const recaptcha = await getRecaptchaToken('request_otp');
        const res = await authFetch('/auth/request-code', { email: currentEmail }, { 'X-Recaptcha-Token': recaptcha || '' });
        const data = await res.json();
        if (res.ok) {
            startResendCooldown();
        } else if (data.status !== 'cooldown') {
            showAlert(data.message || 'Could not resend. Try again.');
        }
    } catch {
        showAlert('Could not reach the server. Check your connection.');
    }
});

function startResendCooldown() {
    let seconds = 60;
    resendIdle.classList.add('d-none');
    resendCooldown.classList.remove('d-none');
    resendTimer.textContent = seconds;

    clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
        seconds -= 1;
        resendTimer.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(cooldownInterval);
            resendCooldown.classList.add('d-none');
            resendIdle.classList.remove('d-none');
        }
    }, 1000);
}

// ─── GOOGLE ONE TAP ─────────────────────────
const googleClientId = document.querySelector('meta[name="google-client-id"]')?.content;
const oneTapNonce    = document.querySelector('meta[name="one-tap-nonce"]')?.content;

async function handleOneTap(response) {
    try {
        const res = await authFetch('/auth/google-one-tap', { credential: response.credential });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            window.location.href = data.redirect || '/dashboard';
        } else {
            showToast(data.message || 'Google sign-in failed. Try again.', 'error');
        }
    } catch {
        showToast('Could not reach the server. Check your connection.', 'error');
    }
}

function initOneTap() {
    // GIS script blocked or offline: stay silent, the normal buttons still work
    if (!window.google?.accounts?.id || !googleClientId) return;
    google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleOneTap,
        nonce: oneTapNonce,
        auto_select: false,
        cancel_on_tap_outside: false
    });
    google.accounts.id.prompt();
}
// 'load' waits for the async GIS script, so no race with auth.js
window.addEventListener('load', initOneTap);

// ─── INPUT FOCUS LABEL COLOR ────────────────
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--accent)');
    });
    input.addEventListener('blur', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--muted)');
    });
});

