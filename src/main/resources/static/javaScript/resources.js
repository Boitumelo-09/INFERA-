'use strict';
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];


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

previewModalEl?.addEventListener('hidden.bs.modal', () => {
    $('#resPreviewBody').innerHTML = '';
});
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