/* KaTeX loader + render helpers shared by the formula nodes and the dialog. */
import katex from 'https://esm.sh/katex@0.16.11';

export const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';

export function ensureKatexCss() {
    if (document.querySelector('link[data-katex-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = KATEX_CSS;
    link.dataset.katexCss = '1';
    document.head.appendChild(link);
}

/* Invalid LaTeX renders as visible red source text instead of throwing, so a bad formula never breaks a note. */
export function renderMath(el, latex, display) {
    ensureKatexCss();
    katex.render(latex || '', el, { displayMode: display, throwOnError: false, strict: 'ignore' });
}

/* Returns null when the LaTeX is valid, otherwise a short readable message. */
export function validateMath(latex, display) {
    try {
        katex.renderToString(latex, { displayMode: display, throwOnError: true, strict: 'ignore' });
        return null;
    } catch (err) {
        return String(err.message || err).replace(/^KaTeX parse error:\s*/, '');
    }
}