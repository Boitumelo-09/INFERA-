/* ─────────────────────────────────────────
   INFERA — auth.js  (signup + signin)
───────────────────────────────────────── */

    // ─── CUSTOM CURSOR ───────────────────────
    const dot  = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

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

    document.querySelectorAll('a, button, input, label').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

// ─── TOGGLE PASSWORD ─────────────────────
const togglePw  = document.getElementById('togglePw');
const eyeIcon   = document.getElementById('eyeIcon');
const pwInput   = document.getElementById('password');

if (togglePw && pwInput) {
    togglePw.addEventListener('click', () => {
        const isHidden = pwInput.type === 'password';
        pwInput.type = isHidden ? 'text' : 'password';
        eyeIcon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
}

// ─── PASSWORD STRENGTH (signup only) ─────
const strengthBar = document.getElementById('strengthBar');
const sbFill      = document.getElementById('sbFill');
const sbLabel     = document.getElementById('sbLabel');

function getStrength(pw) {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
}

if (pwInput && sbFill) {
    pwInput.addEventListener('input', () => {
        const val = pwInput.value;
        if (!val) {
            sbFill.style.width = '0';
            sbLabel.textContent = '';
            sbFill.style.background = 'var(--accent)';
            return;
        }
        const score = getStrength(val);
        const widths  = ['15%', '30%', '50%', '75%', '100%'];
        const colors  = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
        const labels  = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
        const idx = Math.min(score - 1, 4);
        sbFill.style.width      = widths[idx];
        sbFill.style.background = colors[idx];
        sbLabel.textContent     = labels[idx];
    });
}

// ─── FORM VALIDATION HELPERS ─────────────
function showError(inputId, errId, msg) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errId);
    if (input) { input.classList.add('is-error'); input.classList.remove('is-success'); }
    if (err)   err.textContent = msg;
}

function showSuccess(inputId, errId) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errId);
    if (input) { input.classList.remove('is-error'); input.classList.add('is-success'); }
    if (err)   err.textContent = '';
}

function clearState(inputId, errId) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errId);
    if (input) { input.classList.remove('is-error', 'is-success'); }
    if (err)   err.textContent = '';
}

// ─── SIGNUP FORM ─────────────────────────
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    // Real-time validation
    document.getElementById('firstName')?.addEventListener('blur', validateFirstName);
    document.getElementById('lastName')?.addEventListener('blur',  validateLastName);
    document.getElementById('email')?.addEventListener('blur',     validateEmail);
    document.getElementById('password')?.addEventListener('blur',  validatePassword);
    document.getElementById('confirmPassword')?.addEventListener('blur', validateConfirmPassword);

    signupForm.addEventListener("submit", (e) => {

        const ok = [
            validateFirstName(),
            validateLastName(),
            validateEmail(),
            validatePassword(),
            validateConfirmPassword()
        ].every(Boolean);

        const agree = document.getElementById("agree");

        if (!ok || !agree.checked) {
            e.preventDefault();

            if (!agree.checked) {
                agree.style.outline = "2px solid #ef4444";
            }

            return;
        }

        const btn = document.getElementById("submitBtn");
        const btnText = btn.querySelector(".btn-submit-text");
        const spinner = btn.querySelector(".btn-submit-spinner");

        btn.disabled = true;
        btnText.classList.add("d-none");
        spinner.classList.remove("d-none");

        // Let the browser continue submitting naturally.
    });

    function validateFirstName() {
        const val = document.getElementById('firstName')?.value.trim();
        if (!val) { showError('firstName', 'firstNameErr', 'First name is required'); return false; }
        showSuccess('firstName', 'firstNameErr'); return true;
    }
    function validateLastName() {
        const val = document.getElementById('lastName')?.value.trim();
        if (!val) { showError('lastName', 'lastNameErr', 'Last name is required'); return false; }
        showSuccess('lastName', 'lastNameErr'); return true;
    }
    function validateEmail() {
        const val = document.getElementById('email')?.value.trim();
        const re  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val)     { showError('email', 'emailErr', 'Email is required'); return false; }
        if (!re.test(val)) { showError('email', 'emailErr', 'Enter a valid email address'); return false; }
        showSuccess('email', 'emailErr'); return true;
    }
    function validatePassword() {
        const val = document.getElementById('password')?.value;
        if (!val)          { showError('password', 'passwordErr', 'Password is required'); return false; }
        if (val.length < 8) { showError('password', 'passwordErr', 'Password must be at least 8 characters'); return false; }
        showSuccess('password', 'passwordErr'); return true;
    }
    function validateConfirmPassword() {
        const pw  = document.getElementById('password')?.value;
        const cpw = document.getElementById('confirmPassword')?.value;
        if (!cpw)       { showError('confirmPassword', 'confirmPasswordErr', 'Please confirm your password'); return false; }
        if (pw !== cpw) { showError('confirmPassword', 'confirmPasswordErr', 'Passwords do not match'); return false; }
        showSuccess('confirmPassword', 'confirmPasswordErr'); return true;
    }
}

// ─── SIGNIN FORM ─────────────────────────
const signinForm = document.getElementById('signinForm');

if (signinForm) {
    document.getElementById('email')?.addEventListener('blur', validateSigninEmail);
    document.getElementById('password')?.addEventListener('blur', validateSigninPassword);

    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ok = [validateSigninEmail(), validateSigninPassword()].every(Boolean);
        if (!ok) return;

        const btn     = document.getElementById('submitBtn');
        const btnText = btn.querySelector('.btn-submit-text');
        const spinner = btn.querySelector('.btn-submit-spinner');
        const alert   = document.getElementById('loginAlert');

        btn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        if (alert) alert.classList.add('d-none');

        await new Promise(r => setTimeout(r, 1600));

        // Demo: any login succeeds
        btn.style.background = '#16a34a';
        spinner.classList.add('d-none');
        btnText.classList.remove('d-none');
        btnText.innerHTML = '<i class="bi bi-check2"></i> Welcome back!';

        setTimeout(() => {
            // Real app: redirect to dashboard
            window.location.href = 'home.html';
        }, 1000);
    });

    function validateSigninEmail() {
        const val = document.getElementById('email')?.value.trim();
        const re  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val || !re.test(val)) { showError('email', 'emailErr', 'Enter a valid email address'); return false; }
        showSuccess('email', 'emailErr'); return true;
    }
    function validateSigninPassword() {
        const val = document.getElementById('password')?.value;
        if (!val) { showError('password', 'passwordErr', 'Password is required'); return false; }
        showSuccess('password', 'passwordErr'); return true;
    }
}

// ─── INPUT ANIMATION (focus ring on label) ─
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--accent)');
    });
    input.addEventListener('blur', () => {
        input.closest('.form-group')?.querySelector('.form-label-custom')?.style.setProperty('color', 'var(--muted)');
    });
});