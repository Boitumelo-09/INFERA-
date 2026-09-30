/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/drawing-canvas.js
   The single "live" Excalidraw session. React + Excalidraw load lazily
   the first time a drawing is entered, and only this file touches them.
   drawing-node.js owns the DOM around it; this file owns loading,
   saving and leaving.
═══════════════════════════════════════════════════════════════════ */

const EXCALIDRAW_VERSION = '0.18.0';
const BASE = `https://esm.sh/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}/dist/prod/`;
const KEEP_KEYALIVE_BYTES = 60000; // keepalive requests are capped at ~64KB by browsers
const SAVE_DEBOUNCE_MS = 1200;
const SCROLL_MARGIN = 0.5; // pannable area = drawing bounds + this fraction of a viewport per side
/* Clicks on these never leave the canvas: Excalidraw's own UI (including
   its portalled dialogs/menus) and the toolbar's undo/redo buttons. */
const KEEP_ACTIVE_SELECTOR = [
    '.excalidraw',
    '.excalidraw-modal-container',
    '.excalidraw-contextMenuContainer',
    '.tiptap-toolbar-btn[data-action="undo"]',
    '.tiptap-toolbar-btn[data-action="redo"]',
].join(',');

/* ─── Lazy library load ────────────────────────────────────────── */
let libPromise = null;
function loadLib() {
    if (!libPromise) {
        window.EXCALIDRAW_ASSET_PATH = BASE; // fonts/locales
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = BASE + 'index.css';
        document.head.appendChild(css);

        libPromise = Promise.all([
            import('react'),
            import('react-dom/client'),
            import(BASE + 'index.js?external=react,react-dom'),
        ]).then(([r, rd, ex]) => ({ React: r.default || r, createRoot: rd.createRoot, ex }))
            .catch(err => { libPromise = null; css.remove(); throw err; });
    }
    return libPromise;
}

/* ─── Small helpers ────────────────────────────────────────────── */
const toast = (msg, type) => window.showToast?.(msg, type);
const appTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

/* Same idea as Excalidraw's own getSceneVersion: element versions only go
   up, so their sum changes whenever anything (including undo) changes. */
const sceneVersion = elements => elements.reduce((sum, el) => sum + el.version, 0);

/* Reports into the same save-status pill the note autosave uses. */
function setPill(state) {
    // Normal path: report to the shared status in editor-api.js. The code below
    // is only a fallback if that script hasn't loaded.
    if (window.__inferaReportSaveStatus) { window.__inferaReportSaveStatus('drawing', state); return; }
    const pill = document.getElementById('editorSaveStatus');
    if (!pill) return;
    const states = {
        saving: ['bi-arrow-repeat', 'Saving…'],
        saved:  ['bi-check2', 'Saved'],
        error:  ['bi-exclamation-circle', 'Save failed'],
    };
    const [icon, text] = states[state];
    pill.classList.toggle('saving', state === 'saving');
    pill.classList.toggle('error', state === 'error');
    pill.querySelector('i').className = `bi ${icon}`;
    pill.querySelector('span').textContent = text;
}

/* ─── Session state ────────────────────────────────────────────── */
let active = null;      // { ctx, lib, root, api, theme, savedVersion, lastVersion, timer, chain, cleanup }
let activating = false;
let closing = null;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

async function fetchDrawing(ctx) {
    const res = await fetch(`/api/notes/${ctx.noteId}/drawings/${ctx.drawingId}`, {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Load failed: ' + res.status);
    return res.json();
}

async function renderPreview(s, elements, appState, files) {
    const svg = await s.lib.ex.exportToSvg({
        elements,
        appState: {
            exportBackground: true,
            viewBackgroundColor: appState.viewBackgroundColor,
            exportWithDarkMode: s.theme === 'dark',
        },
        files,
        exportPadding: 16,
    });
    return new XMLSerializer().serializeToString(svg);
}

/* Saves are chained so two never overlap; resolves true/false, never throws. */
function save(s) {
    s.chain = s.chain.then(() => doSave(s));
    return s.chain;
}

async function doSave(s) {
    if (!s.api) return true;
    const version = sceneVersion(s.api.getSceneElementsIncludingDeleted());
    if (version === s.savedVersion) return true;

    setPill('saving');
    try {
        const elements = s.api.getSceneElements();
        const appState = s.api.getAppState();
        const files = s.api.getFiles();

        const sceneJson = s.lib.ex.serializeAsJSON(elements, appState, files, 'local');
        const previewSvg = elements.length ? await renderPreview(s, elements, appState, files) : '';
        const body = JSON.stringify({ sceneJson, previewSvg });

        const res = await fetch(`/api/notes/${s.ctx.noteId}/drawings/${s.ctx.drawingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...s.ctx.csrfHeaders() },
            body,
            keepalive: new Blob([body]).size < KEEP_KEYALIVE_BYTES,
        });
        if (res.status === 413) {
            setPill('error');
            toast('This drawing is too large to save.', 'error');
            return false;
        }
        if (!res.ok) throw new Error('Save failed: ' + res.status);

        const { updatedAt } = await res.json();
        s.savedVersion = version;
        // A drawing edit is a content edit for the activity log (see editor-api.js)
        window.__inferaDrawingRevision = (window.__inferaDrawingRevision || 0) + 1;
        if (document.visibilityState === 'hidden') window.__inferaLogEditIfChanged?.();
        s.ctx.onSaved({ id: s.ctx.drawingId, mode: s.ctx.mode, previewSvg, updatedAt });
        setPill('saved');
        return true;
    } catch (err) {
        setPill('error');
        return false;
    }
}

/* Excalidraw's canvas is infinite. Confine panning/zooming to the drawing's
   own "page": its content bounds plus a margin (so the page grows as you
   draw), or the entry view while the canvas is still empty. */
function clampViewport(s) {
    if (!s.api || s.clamping) return;
    const el = s.ctx.dom.querySelector('.excalidraw');
    if (!el || !el.clientWidth || !el.clientHeight) return;

    const Vw = el.clientWidth, Vh = el.clientHeight; // viewport px = scene units at zoom 1
    const elements = s.api.getSceneElements();

    let x0, y0, x1, y1;
    if (elements.length) {
        const [minX, minY, maxX, maxY] = s.lib.ex.getCommonBounds(elements);
        x0 = minX - Vw * SCROLL_MARGIN; x1 = maxX + Vw * SCROLL_MARGIN;
        y0 = minY - Vh * SCROLL_MARGIN; y1 = maxY + Vh * SCROLL_MARGIN;
    } else {
        x0 = s.home.x; y0 = s.home.y; x1 = x0 + Vw; y1 = y0 + Vh;
    }

    const st = s.api.getAppState();
    // Can't zoom out past the point where the whole page fits in view
    const zoom = Math.max(st.zoom.value, Math.min(Vw / (x1 - x0), Vh / (y1 - y0)), 0.1);
    const vw = Vw / zoom, vh = Vh / zoom; // visible size in scene units

    // Keep the visible rect inside the page; if it's larger than the page, centre it
    const fit = (start, size, lo, hi) =>
        size >= hi - lo ? lo + (hi - lo - size) / 2 : Math.min(Math.max(start, lo), hi - size);
    const scrollX = -fit(-st.scrollX, vw, x0, x1);
    const scrollY = -fit(-st.scrollY, vh, y0, y1);

    if (Math.abs(scrollX - st.scrollX) < 0.5 && Math.abs(scrollY - st.scrollY) < 0.5
        && Math.abs(zoom - st.zoom.value) < 0.001) return;

    s.clamping = true; // our own correction re-triggers onScrollChange; ignore that echo
    s.api.updateScene({ appState: { scrollX, scrollY, zoom: { value: zoom } } });
    setTimeout(() => { s.clamping = false; }, 0);
}

function onSceneChange(s, elements) {
    const v = sceneVersion(elements);
    if (v === s.lastVersion) return;      // pan/zoom/selection only — nothing to save
    s.lastVersion = v;
    clearTimeout(s.timer);
    // Also re-check bounds here: erasing content shrinks the page
    s.timer = setTimeout(() => { clampViewport(s); save(s); }, SAVE_DEBOUNCE_MS);}

const isDirty = s => !!s.api && sceneVersion(s.api.getSceneElementsIncludingDeleted()) !== s.savedVersion;

/* ─── Build the React element ──────────────────────────────────── */
function buildElement(s, initialData) {
    const { React, ex } = s.lib;
    const h = React.createElement;
    return h(ex.Excalidraw, {
            initialData,
            excalidrawAPI: api => {
                s.api = api;
                const st = api.getAppState();
                s.home = { x: -st.scrollX, y: -st.scrollY }; // entry view, used while the canvas is empty
            },
            onChange: elements => onSceneChange(s, elements),
            onScrollChange: () => clampViewport(s),
            theme: s.theme,
            autoFocus: true,
            UIOptions: {
                canvasActions: {
                    loadScene: false, saveToActiveFile: false, export: false,
                    saveAsImage: false, toggleTheme: false, changeViewBackgroundColor: false,
                },
                tools: { image: false }, // images need a separate files store we don't persist
            },
        },
        // Trimmed menu: saving is ours, so no load/save/export/social items.
        h(ex.MainMenu, null,
            h(ex.MainMenu.DefaultItems.ClearCanvas),
            h(ex.MainMenu.DefaultItems.Help))
    );
}

/* ─── Public session API ───────────────────────────────────────── */
/* Desktop layout only (tall canvases): Excalidraw pins its styles panel
   (.App-menu__left) to the left, covering the drawing. Hide it and show it on
   demand via our own palette button instead. The button only exists while
   Excalidraw is actually rendering that panel, so the compact layout (which
   has no such panel) never gets one. The button lives on the card, not inside
   the React-managed mount, so React can't wipe it. */
function setupPropsPanelToggle(ctx, mountEl) {
    const card = ctx.dom;
    const PANEL = '.App-menu__left';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drawing-props-toggle';
    btn.title = 'Stroke & style';
    btn.setAttribute('aria-label', 'Stroke and style options');
    btn.setAttribute('aria-pressed', 'false');
    btn.hidden = true;
    btn.innerHTML = '<i class="bi bi-palette2"></i>';
    card.appendChild(btn);

    const setOpen = open => {
        card.classList.toggle('props-open', open);
        btn.setAttribute('aria-pressed', String(open));
    };
    const sync = () => {
        const has = !!mountEl.querySelector(PANEL);
        btn.hidden = !has;
        if (!has) setOpen(false);
    };

    const observer = new MutationObserver(sync);
    observer.observe(mountEl, { childList: true, subtree: true });
    sync();

    const onToggle = () => setOpen(!card.classList.contains('props-open'));
    // Only a press on the drawing surface itself closes it — presses on the panel's
    // own popovers (colour pickers etc.) must not, or their anchor would vanish.
    const onPointerDown = e => { if (e.target instanceof HTMLCanvasElement) setOpen(false); };
    const onKeyDown = e => { if (e.key === 'Escape') setOpen(false); };

    btn.addEventListener('click', onToggle);
    mountEl.addEventListener('pointerdown', onPointerDown, true);
    mountEl.addEventListener('keydown', onKeyDown);

    return () => {
        observer.disconnect();
        mountEl.removeEventListener('pointerdown', onPointerDown, true);
        mountEl.removeEventListener('keydown', onKeyDown);
        btn.remove();
        card.classList.remove('props-open');
    };
}

export const drawingSession = {
    isActive: () => !!active,

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    async activate(ctx) {
        if (activating || (active && active.ctx === ctx)) return;
        activating = true;
        try {
            if (active && !(await this.deactivate())) return; // couldn't save the previous one

            ctx.setLoading(true);
            let lib, data;
            try {
                [lib, data] = await Promise.all([loadLib(), fetchDrawing(ctx)]);
            } catch (err) {
                toast('Could not open the drawing. Please try again.', 'error');
                return;
            } finally {
                ctx.setLoading(false);
            }

            let initialData = { scrollToContent: false };
            if (data.sceneJson) {
                try {
                    // restore() validates/normalises saved scenes before they reach the canvas
                    initialData = { ...lib.ex.restore(JSON.parse(data.sceneJson), null, null), scrollToContent: true };
                } catch (err) {
                    // Never open a blank canvas over data we couldn't read — it would overwrite it.
                    toast('This drawing could not be read, so it was left untouched.', 'error');
                    return;
                }
            }

            const mountEl = ctx.enter();
            const s = {
                ctx, lib, theme: appTheme(), api: null, timer: null,
                home: { x: 0, y: 0 }, clamping: false,
                root: lib.createRoot(mountEl),
                chain: Promise.resolve(),
                savedVersion: sceneVersion(initialData.elements || []),
                lastVersion: sceneVersion(initialData.elements || []),
                cleanup: [],
            };
            active = s;
            s.root.render(buildElement(s, initialData));

            // Resizing the card changes the viewport, so re-check the bounds
            const ro = new ResizeObserver(() => clampViewport(s));
            ro.observe(mountEl);
            s.cleanup.push(() => ro.disconnect());
            s.cleanup.push(setupPropsPanelToggle(ctx, mountEl));

            // The library is hidden, so its "0" shortcut must not open it invisibly.
            // Listening on the card in the capture phase runs before Excalidraw sees the key.
            const blockLibraryShortcut = e => {
                if (e.key !== '0' || e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl/Cmd+0 = reset zoom, keep it
                if (e.target instanceof Element && e.target.closest('textarea, input, [contenteditable="true"]')) return; // typing text
                e.stopPropagation();
            };
            ctx.dom.addEventListener('keydown', blockLibraryShortcut, true);
            s.cleanup.push(() => ctx.dom.removeEventListener('keydown', blockLibraryShortcut, true));
            // Click outside the drawing (that isn't Excalidraw UI / undo-redo) → leave + save
            const onPointerDown = e => {
                const t = e.target;
                if (!(t instanceof Element) || ctx.dom.contains(t) || t.closest(KEEP_ACTIVE_SELECTOR)) return;
                // Full screen: the top bar (save pill, Back link) stays usable without collapsing the canvas
                if (ctx.isExpanded?.() && t.closest('.editor-topbar')) return;                this.deactivate().then(ok => {
                    if (!ok) toast('Couldn’t save the drawing yet — it’s still open. Click outside again to retry.', 'error');
                });
            };
            document.addEventListener('pointerdown', onPointerDown, true);
            s.cleanup.push(() => document.removeEventListener('pointerdown', onPointerDown, true));

            // Unsaved work + closing the tab → browser confirmation
            const onBeforeUnload = e => { if (isDirty(s)) { e.preventDefault(); e.returnValue = ''; } };
            window.addEventListener('beforeunload', onBeforeUnload);
            s.cleanup.push(() => window.removeEventListener('beforeunload', onBeforeUnload));

            // Tab hidden / app switched → flush now (more reliable than unload)
            const onVisibility = () => { if (document.visibilityState === 'hidden') save(s); };
            document.addEventListener('visibilitychange', onVisibility);
            s.cleanup.push(() => document.removeEventListener('visibilitychange', onVisibility));

            // Same reasoning as editor-api.js: pagehide is the reliable "leaving" signal on Safari/back-nav
            const onPageHide = () => save(s);
            window.addEventListener('pagehide', onPageHide);
            s.cleanup.push(() => window.removeEventListener('pagehide', onPageHide));
            notify();
        } finally {
            activating = false;
        }
    },

    /* Saves, unmounts, swaps back to the static preview. Resolves false
       (and stays live) if the save failed — no silent data loss. */
    deactivate({ silent = false } = {}) {
        if (!active) return Promise.resolve(true);
        if (closing) return closing;
        const s = active;
        closing = (async () => {
            clearTimeout(s.timer);
            const ok = await save(s);
            if (!ok) return false;
            s.cleanup.forEach(fn => fn());
            s.root.unmount();
            active = null;
            if (!silent) s.ctx.leave();
            notify();
            return true;
        })().finally(() => { closing = null; });
        return closing;
    },

    /* The canvas changed size/position (expand/collapse): let Excalidraw re-measure. */
    refresh() {
        requestAnimationFrame(() => {
            if (!active) return;
            active.api?.refresh?.();
            clampViewport(active);
            active.ctx.dom.querySelector('.excalidraw')?.focus?.({ preventScroll: true });
        });
    },

    /* Called when a drawing node is removed from the document while live. */
    release(ctx) {
        if (active && active.ctx === ctx) this.deactivate({ silent: true });
    },

    /* Excalidraw exposes no undo/redo method, so send it the shortcut. */
    undo() { sendUndoRedo(false); },
    redo() { sendUndoRedo(true); },
};

function sendUndoRedo(redo) {
    if (!active) return;
    const el = active.ctx.dom.querySelector('.excalidraw');
    if (!el) return;
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    el.focus?.({ preventScroll: true });
    el.dispatchEvent(new KeyboardEvent('keydown', {
        key: redo ? 'Z' : 'z', code: 'KeyZ', shiftKey: redo,
        ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true,
    }));
}