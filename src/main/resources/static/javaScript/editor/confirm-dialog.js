/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/confirm-dialog.js
   Small themed confirm dialog (replaces window.confirm).
   confirmDialog({ title, message, confirmText, cancelText, danger })
   resolves true (confirmed) or false (cancelled / Esc / backdrop click).
═══════════════════════════════════════════════════════════════════ */

let openDialog = null;

export function confirmDialog({
                                  title = 'Are you sure?',
                                  message = '',
                                  confirmText = 'Confirm',
                                  cancelText = 'Cancel',
                                  danger = false,
                              } = {}) {
    if (openDialog) return openDialog; // one at a time

    openDialog = new Promise(resolve => {
        const previouslyFocused = document.activeElement;

        const overlay = document.createElement('div');
        overlay.className = 'drawing-confirm';
        overlay.innerHTML = `
            <div class="drawing-confirm-box" role="alertdialog" aria-modal="true"
                 aria-labelledby="drawingConfirmTitle" aria-describedby="drawingConfirmMsg">
                <h4 class="drawing-confirm-title" id="drawingConfirmTitle"></h4>
                <p class="drawing-confirm-msg" id="drawingConfirmMsg"></p>
                <div class="drawing-confirm-actions">
                    <button type="button" class="drawing-confirm-btn" data-act="cancel"></button>
                    <button type="button" class="drawing-confirm-btn primary" data-act="ok"></button>
                </div>
            </div>`;
        // textContent, not innerHTML: the strings are never treated as markup
        overlay.querySelector('#drawingConfirmTitle').textContent = title;
        overlay.querySelector('#drawingConfirmMsg').textContent = message;

        const cancelBtn = overlay.querySelector('[data-act="cancel"]');
        const okBtn = overlay.querySelector('[data-act="ok"]');
        cancelBtn.textContent = cancelText;
        okBtn.textContent = confirmText;
        okBtn.classList.toggle('danger', danger);

        const close = result => {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            openDialog = null;
            previouslyFocused?.focus?.({ preventScroll: true });
            resolve(result);
        };

        const onKey = e => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(false);
            } else if (e.key === 'Tab') {
                // Keep focus inside the dialog: it only has two buttons
                e.preventDefault();
                (document.activeElement === cancelBtn ? okBtn : cancelBtn).focus();
            }
        };

        overlay.addEventListener('pointerdown', e => { if (e.target === overlay) close(false); }); // backdrop
        cancelBtn.addEventListener('click', () => close(false));
        okBtn.addEventListener('click', () => close(true));
        document.addEventListener('keydown', onKey, true);

        document.body.appendChild(overlay);
        cancelBtn.focus(); // the safe default for a destructive action
    });

    return openDialog;
}