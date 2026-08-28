/* ═══════════════════════════════════════════════════════════════════
   INFERA — editor/scroll-nav.js
   Floating jump-to-top / jump-to-bottom buttons for long notes, same
   idea as chat apps' "jump to latest" arrow. The editor page scrolls
   at the document level (no inner scroll container), so this tracks
   window scroll position directly rather than a specific element.
═══════════════════════════════════════════════════════════════════ */

const NEAR_EDGE_PX = 80; // how close to top/bottom counts as "already there"

const topBtn    = document.getElementById('scrollToTopBtn');
const bottomBtn = document.getElementById('scrollToBottomBtn');

if (topBtn && bottomBtn) {
    function updateVisibility() {
        const scrollY = window.scrollY;
        const viewportH = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const scrollable = docH > viewportH + NEAR_EDGE_PX;

        const atTop = scrollY < NEAR_EDGE_PX;
        const atBottom = scrollY + viewportH > docH - NEAR_EDGE_PX;

        topBtn.classList.toggle('visible', scrollable && !atTop);
        bottomBtn.classList.toggle('visible', scrollable && !atBottom);
    }

    topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    bottomBtn.addEventListener('click', () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);

    // The note grows as the user types — no scroll/resize event fires
    // for that on its own, so watch the content mount directly.
    const contentMount = document.getElementById('editorContentMount');
    if (contentMount && window.MutationObserver) {
        new MutationObserver(updateVisibility).observe(contentMount, {
            childList: true, subtree: true, characterData: true,
        });
    }

    updateVisibility();
}