'use strict';
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* Cursor + sidebar — same as notes.js */
const dot = $('#cursorDot'), ring = $('#cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
if (dot && ring) {
    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.left = mouseX + 'px';
        dot.style.top = mouseY + 'px';
    });
    (function animateRing() {
        ringX += (mouseX - ringX) * 0.14;
        ringY += (mouseY - ringY) * 0.14;
        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';
        requestAnimationFrame(animateRing);
    })();
}
const sidebar = $('#sidebar'), sidebarToggle = $('#sidebarToggle'), sidebarClose = $('#sidebarClose'), sidebarOverlay = $('#sidebarOverlay');
sidebarToggle?.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); });
sidebarClose?.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); });
sidebarOverlay?.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); });

/* ─── SHELF DRAG-TO-SCROLL ─── */
$$('.shelf-track').forEach(track => {
    let isDown = false, startX, scrollLeft, velocity = 0, lastX = 0, momentumId;

    track.addEventListener('mousedown', e => {
        cancelAnimationFrame(momentumId);
        isDown = true; track.classList.add('dragging');
        startX = e.pageX - track.offsetLeft; scrollLeft = track.scrollLeft;
        lastX = e.pageX; velocity = 0;
    });

    window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false; track.classList.remove('dragging');
        applyMomentum();
    });

    track.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - track.offsetLeft;
        track.scrollLeft = scrollLeft - (x - startX);
        velocity = e.pageX - lastX;
        lastX = e.pageX;
    });

    function applyMomentum() {
        if (Math.abs(velocity) < 0.5) return;
        track.scrollLeft -= velocity;
        velocity *= 0.94;
        momentumId = requestAnimationFrame(applyMomentum);
    }
});

/* ─── SHELF ARROW BUTTONS ─── */
$$('.shelf-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
        const track = btn.closest('.res-shelf').querySelector('.shelf-track');
        track.scrollBy({ left: 260 * Number(btn.dataset.dir), behavior: 'smooth' });
    });
});

/* ─── PREVIEW MODAL ─── */
function getYoutubeEmbedUrl(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
/* add near getYoutubeEmbedUrl */
function getYoutubeThumbnail(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function renderCardThumbnails() {
    $$('.res-card').forEach(card => {
        const { category, url, title } = card.dataset;
        const mediaEl = card.querySelector('.rc-media');
        if (!mediaEl) return;

        if (category === 'VIDEO') {
            const thumb = getYoutubeThumbnail(url);
            if (thumb) {
                mediaEl.innerHTML = `<img src="${thumb}" alt="${title}" /><span class="rc-play-badge"><i class="bi bi-play-circle-fill"></i></span>`;
            }
        } else if (category === 'IMAGE') {
            const img = document.createElement('img');
            img.src = url;
            img.alt = title;
            img.onerror = () => { mediaEl.innerHTML = `<i class="bi bi-image"></i>`; };
            mediaEl.innerHTML = '';
            mediaEl.appendChild(img);
        }
    });
}
renderCardThumbnails();
const previewModalEl = $('#resPreviewModal');
const previewModal = previewModalEl ? new bootstrap.Modal(previewModalEl) : null;

$$('.res-card').forEach(card => {
    card.addEventListener('click', () => {
        const { title, url, description, category, note } = card.dataset;

        $('#resPreviewCat').textContent = category;
        $('#resPreviewTitle').textContent = title;
        $('#resPreviewNote').innerHTML = `<i class="bi bi-journal-text"></i> ${note}`;
        $('#resPreviewOpenBtn').href = url;
        $('#resPreviewNotesBtn').href = `/notes?view=${card.dataset.noteId}`;

        let media;
        if (category === 'VIDEO') {
            const embed = getYoutubeEmbedUrl(url);
            media = embed
                ? `<iframe src="${embed}" class="res-preview-media-video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
                : `<div class="res-preview-link-block"><i class="bi bi-box-arrow-up-right"></i> ${url}</div>`;
        } else if (category === 'IMAGE') {
            media = `<img src="${url}" class="res-preview-media-image" alt="${title}" id="resPreviewImg" />`;
        } else {
            media = `<div class="res-preview-link-block"><i class="bi bi-box-arrow-up-right"></i> ${url}</div>`;
        }

        const desc = description && description !== 'null' ? `<p class="res-preview-desc">${description}</p>` : '';
        $('#resPreviewBody').innerHTML = media + desc;

        $('#resPreviewImg')?.addEventListener('error', function () {
            this.outerHTML = `<div class="res-preview-link-block"><i class="bi bi-exclamation-triangle"></i> Image failed to load — link may not be public.</div>`;
        });

        previewModal?.show();
    });
});

/* ─── SEARCH FILTER ─── */
const searchInput = $('#resSearchInput');
searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    let anyVisible = false;

    $$('.res-shelf').forEach(shelf => {
        let shelfHasMatch = false;
        $$('.res-card', shelf).forEach(card => {
            const matches = !q || card.dataset.title.toLowerCase().includes(q) || card.dataset.note.toLowerCase().includes(q);
            card.style.display = matches ? '' : 'none';
            if (matches) shelfHasMatch = true;
        });
        shelf.classList.toggle('shelf-hidden', !shelfHasMatch);
        if (shelfHasMatch) anyVisible = true;
    });

    $('#resNoMatch').hidden = anyVisible || !q;
});