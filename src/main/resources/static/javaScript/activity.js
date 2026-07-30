'use strict';
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* Cursor + sidebar */
const dot = $('#cursorDot'), ring = $('#cursorRing');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
if (dot && ring) {
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; dot.style.left = mouseX+'px'; dot.style.top = mouseY+'px'; });
    (function animateRing(){ ringX += (mouseX-ringX)*0.14; ringY += (mouseY-ringY)*0.14; ring.style.left=ringX+'px'; ring.style.top=ringY+'px'; requestAnimationFrame(animateRing); })();
    document.addEventListener('mouseleave', () => { dot.style.opacity='0'; ring.style.opacity='0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity='1'; ring.style.opacity='1'; });
}
const sidebar = $('#sidebar'), sidebarToggle = $('#sidebarToggle'), sidebarClose = $('#sidebarClose'), sidebarOverlay = $('#sidebarOverlay');
sidebarToggle?.addEventListener('click', () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); });
sidebarClose?.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); });
sidebarOverlay?.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); });

/* ─── STREAK RING ─── */
function buildStreakRing() {
    const ring = $('#currentStreakRing');
    if (!ring) return;
    const value = parseInt(ring.dataset.value, 10) || 0;
    const circumference = 264;
    const pct = Math.min(value / 30, 1); // caps visual fill at a 30-day streak
    requestAnimationFrame(() => {
        ring.style.strokeDashoffset = circumference - (pct * circumference);
    });
}

/* ─── 30-DAY TREND LINE ─── */
function buildTrendChart() {
    const wrap = $('#trendChartWrap'), svg = $('#trendChartSvg'), tooltip = $('#trendTooltip');
    if (!wrap || !svg) return;

    const values = JSON.parse(wrap.dataset.values || '[]');
    if (!values.length) return;

    const W = 700, H = 260, padTop = 20, padBottom = 28, padLeft = 34;    const chartH = H - padTop - padBottom;
    const chartW = W - padLeft - 15;
    const max = Math.max(...values, 1);
    const stepX = chartW / (values.length - 1);

    const points = values.map((v, i) => ({ x: padLeft + i * stepX, y: padTop + chartH - (v / max) * chartH, v, i }));

    // Y-axis: 4 evenly spaced gridlines + labels, based on actual max
    const ySteps = 4;
    let yAxis = '';
    for (let s = 0; s <= ySteps; s++) {
        const val = Math.round((max / ySteps) * s);
        const y = padTop + chartH - (s / ySteps) * chartH;
        yAxis += `<line class="chart-grid-line" x1="${padLeft}" x2="${W - 10}" y1="${y}" y2="${y}" />`;
        yAxis += `<text class="chart-axis-label" x="${padLeft - 8}" y="${y + 3}" text-anchor="end">${val}</text>`;
    }

    // X-axis: label every 5th day ("30d ago" ... "Today")
    let xAxis = '';
    points.forEach((p, i) => {
        if (i % 5 === 0 || i === points.length - 1) {
            const daysAgo = points.length - 1 - i;
            const label = daysAgo === 0 ? 'Today' : `-${daysAgo}d`;
            xAxis += `<line class="chart-grid-line-v" x1="${p.x}" x2="${p.x}" y1="${padTop}" y2="${padTop + chartH}" />`;
            xAxis += `<text class="chart-axis-label" x="${p.x}" y="${H - 4}" text-anchor="middle">${label}</text>`;
        }
    });
    xAxis += `<line class="chart-axis-line" x1="${padLeft}" x2="${W - 10}" y1="${padTop + chartH}" y2="${padTop + chartH}" />`;
    function smoothPath(pts) {
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
            const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
            const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    }

    const linePath = smoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - padBottom} L ${points[0].x} ${H - padBottom} Z`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3" />
                <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
            </linearGradient>
        </defs>
        ${yAxis}
        ${xAxis}
       <path d="${areaPath}" fill="url(#trendFill)" stroke="none" />
        <path class="chart-line" id="trendLinePath" d="${linePath}" />
        ${points.filter((p, i) => i % 3 === 0 || i === points.length - 1).map(p =>
        `<circle class="chart-point" data-idx="${p.i}" cx="${p.x}" cy="${p.y}" r="3.5"></circle>`
    ).join('')}
        ${points.map(p => `<circle class="chart-hit-area" data-idx="${p.i}" cx="${p.x}" cy="${p.y}" r="12"></circle>`).join('')}
    `;

    const lineEl = $('#trendLinePath');
    const len = lineEl.getTotalLength();
    lineEl.style.strokeDasharray = len;
    lineEl.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
        lineEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
        lineEl.style.strokeDashoffset = 0;
    });

    $$('.chart-hit-area', svg).forEach(circle => {
        circle.addEventListener('mouseenter', () => {
            const p = points[circle.dataset.idx];
            const daysAgo = points.length - 1 - p.i;
            const label = daysAgo === 0 ? 'Today' : `${daysAgo}d ago`;
            const countText = p.v === 0
                ? 'No activities on this day'
                : `${p.v} ${p.v === 1 ? 'activity' : 'activities'} on this day`;
            tooltip.innerHTML = `<span class="tt-day">${label}</span> · ${countText}`;

            const wrapWidth = wrap.getBoundingClientRect().width;
            const pxPosition = (p.x / W) * wrapWidth;
            const tooltipWidth = tooltip.offsetWidth || 90;
            const halfTooltip = tooltipWidth / 2;

            const clampedPx = Math.min(Math.max(pxPosition, halfTooltip), wrapWidth - halfTooltip);
            tooltip.style.left = clampedPx + 'px';
            tooltip.style.transform = `translate(-50%, -100%)`;
            tooltip.classList.add('show');
        });
        circle.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
    });

    buildTrendDescription(values);
}

/* ─── DONUT BREAKDOWN ─── */
function buildDonutChart() {
    const wrap = $('.act-donut-wrap'), svg = $('#donutSvg'), legend = $('#donutLegend');
    if (!wrap || !svg) return;

    const data = [
        { label: 'Notes', value: parseInt(wrap.dataset.notes, 10) || 0, color: '#818cf8' },
        { label: 'Workspaces', value: parseInt(wrap.dataset.workspaces, 10) || 0, color: '#f59e0b' },
        { label: 'Resources', value: parseInt(wrap.dataset.resources, 10) || 0, color: '#34d399' },
        { label: 'Tags', value: parseInt(wrap.dataset.tags, 10) || 0, color: '#6a0afa' }
    ];

    const total = data.reduce((s, d) => s + d.value, 0);

    const svgWrap = $('.donut-svg-wrap');
    if (!$('.donut-center-label')) {
        svgWrap.insertAdjacentHTML('beforeend', `<div class="donut-center-label"><span class="donut-center-total">${total}</span><span class="donut-center-sub">total</span></div>`);
    } else {
        $('.donut-center-total').textContent = total;
    }

    if (total === 0) {
        svg.innerHTML = `<circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="16" />`;
        legend.innerHTML = `<p style="color:var(--muted);font-size:0.82rem;text-align:center;">No activity yet.</p>`;
        return;
    }

    const r = 40, circumference = 2 * Math.PI * r;
    let offset = 0;
    let arcs = '';

    data.forEach(d => {
        if (d.value === 0) return;
        const frac = d.value / total;
        const dash = frac * circumference;
        arcs += `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${d.color}" stroke-width="16"
                    stroke-dasharray="${dash} ${circumference - dash}"
                    stroke-dashoffset="${-offset}" class="donut-arc"><title>${d.label}: ${(frac * 100).toFixed(1)}%</title></circle>`;
        offset += dash;
    });

    svg.innerHTML = arcs;

    legend.innerHTML = data.map(d => {
        const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
        return `
        <div class="donut-legend-item">
            <span class="donut-legend-dot" style="background:${d.color};"></span>
            <span>${d.label}</span>
            <span class="donut-legend-pct">${pct}%</span>
            <strong>${d.value}</strong>
        </div>`;
    }).join('');

}

buildStreakRing();
buildTrendChart();
buildDonutChart();

function buildTrendDescription(values) {
    const el = $('#trendDesc');
    if (!el) return;

    const total = values.reduce((a, b) => a + b, 0);
    const avg = (total / values.length).toFixed(1);
    const last7 = values.slice(-7).reduce((a, b) => a + b, 0);
    const prev7 = values.slice(-14, -7).reduce((a, b) => a + b, 0);

    let trendPhrase;
    if (prev7 === 0 && last7 > 0) {
        trendPhrase = `you're picking up momentum after a quiet stretch`;
    } else if (prev7 === 0 && last7 === 0) {
        trendPhrase = `it's been quiet lately`;
    } else {
        const pctChange = Math.round(((last7 - prev7) / prev7) * 100);
        if (pctChange > 0) trendPhrase = `up <strong>${pctChange}%</strong> versus the week before`;
        else if (pctChange < 0) trendPhrase = `down <strong>${Math.abs(pctChange)}%</strong> versus the week before`;
        else trendPhrase = `holding steady week over week`;
    }

    el.innerHTML = `<strong>${total}</strong> actions logged over the last 30 days — averaging <strong>${avg}</strong> per day, ${trendPhrase}.`;
}