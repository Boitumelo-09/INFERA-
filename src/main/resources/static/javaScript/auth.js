/* ─────────────────────────────────────────
   INFERA — auth.js  (unified email-OTP + OAuth)
───────────────────────────────────────── */


// ─── CSRF ─────────────────────────────────
const csrfToken  = document.querySelector('meta[name="_csrf"]')?.content;
const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;

function authFetch(url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (csrfToken && csrfHeader) headers[csrfHeader] = csrfToken;
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}
// add anywhere in auth.js, ideally near the top
function showToast(msg, type = 'success') {
    const toast = document.getElementById('inferaToast');
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
        const res = await authFetch('/auth/request-code', { email });
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
    stepEmail.classList.add('d-none');
    stepCode.classList.remove('d-none');
    otpBoxes.forEach(b => b.value = '');
    otpBoxes[0].focus();
    updateVerifyState();
}

editEmailBtn.addEventListener('click', () => {
    stepCode.classList.add('d-none');
    stepEmail.classList.remove('d-none');
    hideAlert();
    clearInterval(cooldownInterval);
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

async function verifyCode() {
    hideAlert();
    const code = getCode();
    if (code.length !== 6) return;

    setLoading(verifyBtn, true);
    try {
        const res = await authFetch('/auth/verify-code', { email: currentEmail, code });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            otpBoxesWrap.classList.add('success');
            verifyBtn.querySelector('.btn-submit-text').innerHTML = '<i class="bi bi-check2"></i> Verified';
            setTimeout(() => { window.location.href = data.redirect || '/dashboard'; }, 500);
        } else {
            otpBoxesWrap.classList.add('shake');
            setTimeout(() => otpBoxesWrap.classList.remove('shake'), 400);
            otpBoxes.forEach(b => b.value = '');
            otpBoxes[0].focus();
            showAlert(data.message || 'Incorrect code.');
            setLoading(verifyBtn, false);
            verifyBtn.disabled = true;
        }
    } catch {
        showAlert('Could not reach the server. Check your connection.');
        setLoading(verifyBtn, false);
    }
}

verifyBtn.addEventListener('click', verifyCode);

// ─── RESEND ─────────────────────────────────
resendBtn.addEventListener('click', async () => {
    hideAlert();
    try {
        const res = await authFetch('/auth/request-code', { email: currentEmail });
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

// ─── INPUT FOCUS LABEL COLOR ────────────────
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--accent)');
    });
    input.addEventListener('blur', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--muted)');
    });
});

