/* ═══════════════════════════════════════════════════════════════════
   INCAPTUR — dashboard-home.js
   Behaviour for the redesigned dashboard body only.

   Load AFTER dashboard.js and utility.js. It reuses their globals
   (showToast, softNavigate, createTagInput) when present and never
   redeclares them. Everything is inside one IIFE, so it can't clash
   with the top-level consts in dashboard.js.

   Covers:
     · Time-aware greeting + live weekday / date / clock
     · Weather (Open-Meteo, driven by the Profile "location" field)
     · Today's focus: a small to-do that lives for 24 hours
     · Quick capture box → opens the new-note modal with the title filled in
     · Relative timestamps ("12m ago", "Yesterday")
     · New-note modal wiring (tags widget, validation)
     · Soft page transitions for links inside the dashboard body
═══════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const root = document.querySelector('.dx');
    if (!root) return;

    const q  = (sel, ctx = root) => ctx.querySelector(sel);
    const qa = (sel, ctx = root) => [...ctx.querySelectorAll(sel)];
    const pad = n => String(n).padStart(2, '0');

    const toast = (msg, type) => { if (typeof showToast === 'function') showToast(msg, type); };
    const goTo  = url => {
        if (typeof softNavigate === 'function') softNavigate(url);
        else window.location.href = url;
    };
    const openModal = id => {
        const el = document.getElementById(id);
        if (el && window.bootstrap) bootstrap.Modal.getOrCreateInstance(el).show();
    };

    /* ─────────────────────────────────────────────────────────────
       GREETING + LIVE DATE / CLOCK
    ───────────────────────────────────────────────────────────── */
    const greetingEl = q('#dxGreeting');
    const weekdayEl  = q('#dxWeekday');
    const dateEl     = q('#dxDate');
    const clockEl    = q('#dxClock');
    const firstName  = ((greetingEl && greetingEl.dataset.name) || '').trim();

    let lastDay = -1;
    let lastPeriod = '';

    function periodFor(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        return 'evening';
    }

    // Built from nodes (not innerHTML) so a name can never be parsed as markup
    function renderGreeting(period) {
        greetingEl.textContent = '';
        greetingEl.append(`${period}`);
        if (firstName) {
            const name = document.createElement('span');
            name.className = 'dx-name';
            name.textContent = firstName;
            greetingEl.append(', ', name);
        }
        greetingEl.append('.');
    }

    function tick() {
        const now = new Date();

        if (clockEl) {
            clockEl.innerHTML =
                `${pad(now.getHours())}:${pad(now.getMinutes())}<small>${pad(now.getSeconds())}</small>`;
        }

        if (now.getDate() !== lastDay) {
            lastDay = now.getDate();
            if (weekdayEl) weekdayEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'long' });
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-GB',
                    { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        const period = periodFor(now.getHours());
        if (greetingEl && period !== lastPeriod) {
            lastPeriod = period;
            renderGreeting(period);
        }
    }
    tick();
    setInterval(tick, 1000);

    /* ─────────────────────────────────────────────────────────────
       RELATIVE TIMES: any element with data-dx-time="<ISO datetime>"
       (the server-rendered text is the no-JS fallback)
    ───────────────────────────────────────────────────────────── */
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    function relative(date) {
        const now  = new Date();
        const mins = Math.floor((now - date) / 60000);

        if (mins < 1) return 'Just now';            // also covers small clock skew
        if (mins < 60) return `${mins}m ago`;

        const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
        if (days <= 0) return `${Math.floor(mins / 60)}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });

        const opts = { day: 'numeric', month: 'short' };
        if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
        return date.toLocaleDateString('en-GB', opts);
    }

    function applyTimes() {
        qa('[data-dx-time]').forEach(el => {
            const d = new Date(el.dataset.dxTime);
            if (isNaN(d)) return;
            el.textContent = relative(d);
            el.title = d.toLocaleString('en-GB');
        });
    }
    applyTimes();
    setInterval(applyTimes, 60000);

    /* ─────────────────────────────────────────────────────────────
       WEATHER: Open-Meteo (no API key). The Profile "location" text is
       geocoded, then today's forecast is fetched. Cached for 30 minutes
       so coming back to the dashboard doesn't refetch.
       States live in data-state on #dxWeather: loading | ready | empty | error
    ───────────────────────────────────────────────────────────── */
    const WEATHER_TTL = 30 * 60 * 1000;

    const WEATHER_CODES = {
        0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Fog',
        51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
        56: 'Freezing drizzle', 57: 'Freezing drizzle',
        61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
        66: 'Freezing rain', 67: 'Freezing rain',
        71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
        80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
        85: 'Snow showers', 86: 'Snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail'
    };

    const wxEl = q('#dxWeather');
    const setWeatherState = state => { if (wxEl) wxEl.dataset.state = state; };

    function readCache(key) {
        try {
            const raw = JSON.parse(localStorage.getItem(key) || 'null');
            return raw && Date.now() - raw.at < WEATHER_TTL ? raw.data : null;
        } catch { return null; }
    }
    function writeCache(key, data) {
        try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch { /* blocked or full: fine */ }
    }

    async function fetchJson(url) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 7000);
        try {
            const res = await fetch(url, { signal: ctrl.signal });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } finally {
            clearTimeout(timer);
        }
    }

    // Bootstrap Icons; an array means [day, night]
    const WEATHER_ICONS = {
        0: ['bi-sun', 'bi-moon-stars'],
        1: ['bi-cloud-sun', 'bi-cloud-moon'],
        2: ['bi-cloud-sun', 'bi-cloud-moon'],
        3: 'bi-clouds',
        45: 'bi-cloud-fog2', 48: 'bi-cloud-fog2',
        51: 'bi-cloud-drizzle', 53: 'bi-cloud-drizzle', 55: 'bi-cloud-drizzle',
        56: 'bi-cloud-sleet', 57: 'bi-cloud-sleet',
        61: 'bi-cloud-rain', 63: 'bi-cloud-rain', 65: 'bi-cloud-rain-heavy',
        66: 'bi-cloud-sleet', 67: 'bi-cloud-sleet',
        71: 'bi-cloud-snow', 73: 'bi-cloud-snow', 75: 'bi-cloud-snow', 77: 'bi-snow2',
        80: 'bi-cloud-rain', 81: 'bi-cloud-rain', 82: 'bi-cloud-rain-heavy',
        85: 'bi-cloud-snow', 86: 'bi-cloud-snow',
        95: 'bi-cloud-lightning-rain', 96: 'bi-cloud-lightning-rain', 99: 'bi-cloud-lightning-rain'
    };
    function weatherIcon(code, isDay) {
        const icon = WEATHER_ICONS[code] || 'bi-thermometer-half';
        return Array.isArray(icon) ? icon[isDay ? 0 : 1] : icon;
    }
    const compass = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round((deg || 0) / 45) % 8];
    const hhmm = iso => (iso && iso.length >= 16 ? iso.slice(11, 16) : '–');   // "2026-10-08T05:41" → "05:41"

    function renderWeather(w) {
        q('#dxWxIcon').className       = `dx-wx-icon bi ${weatherIcon(w.code, w.isDay)}`;
        q('#dxWxTemp').textContent     = `${w.temp}°`;
        q('#dxWxDesc').textContent     = WEATHER_CODES[w.code] || 'Weather';
        q('#dxWxPlace').textContent    = w.place;
        q('#dxWxHigh').textContent     = `${w.high}°`;
        q('#dxWxLow').textContent      = `${w.low}°`;
        q('#dxWxFeels').textContent    = `${w.feels}°`;
        q('#dxWxHumidity').textContent = `${w.humidity}%`;
        q('#dxWxWind').textContent     = `${w.wind} km/h ${compass(w.windDir)}`;
        q('#dxWxRain').textContent     = w.rain == null ? '–' : `${w.rain}%`;
        q('#dxWxSunrise').textContent  = hhmm(w.sunrise);
        q('#dxWxSunset').textContent   = hhmm(w.sunset);
        setWeatherState('ready');
    }
    async function loadWeather() {
        if (!wxEl) return;

        const location = (wxEl.dataset.location || '').trim();
        if (!location) { setWeatherState('empty'); return; }

        const cacheKey = 'incaptur:weather:v2:' + location.toLowerCase();
        const cached = readCache(cacheKey);
        if (cached) { renderWeather(cached); return; }

        try {
            // "Polokwane, Limpopo" → search on "Polokwane"
            const place = location.split(',')[0].trim();
            const geo = await fetchJson(
                'https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' +
                encodeURIComponent(place));
            const hit = geo.results && geo.results[0];
            if (!hit) throw new Error('location not found');

            const wx = await fetchJson(
                'https://api.open-meteo.com/v1/forecast' +
                `?latitude=${hit.latitude}&longitude=${hit.longitude}` +
                '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day' +
                '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max' +
                '&timezone=auto&forecast_days=1');

            const data = {
                place: hit.name,
                temp: Math.round(wx.current.temperature_2m),
                feels: Math.round(wx.current.apparent_temperature),
                humidity: Math.round(wx.current.relative_humidity_2m),
                code: wx.current.weather_code,
                isDay: wx.current.is_day === 1,
                wind: Math.round(wx.current.wind_speed_10m),
                windDir: wx.current.wind_direction_10m,
                high: Math.round(wx.daily.temperature_2m_max[0]),
                low:  Math.round(wx.daily.temperature_2m_min[0]),
                rain: (wx.daily.precipitation_probability_max || [])[0] ?? null,
                sunrise: wx.daily.sunrise[0],
                sunset: wx.daily.sunset[0]
            };
            writeCache(cacheKey, data);
            renderWeather(data);
        } catch (err) {
            console.warn('Weather unavailable:', err);
            setWeatherState('error');   // never show invented numbers
        }
    }
    loadWeather();

    /* ─────────────────────────────────────────────────────────────
       TODAY'S FOCUS: a small to-do
       FOCUS STORE: for now the list lives in localStorage, keyed by
       user id, and each item expires 24 hours after it was added. It is
       real persistence, but only on this browser. When the backend
       exists, replace load() and save() with calls to it (and let the
       server enforce the 24 hours); nothing else here needs to change.
    ───────────────────────────────────────────────────────────── */
    const focusRoot = q('#dxFocus');
    if (focusRoot) {
        const storageKey = 'incaptur:todos:' + (focusRoot.dataset.userId || 'me');
        const TTL = 24 * 60 * 60 * 1000;
        const MAX_ITEMS = 8;

        const listEl     = q('#dxTodoList', focusRoot);
        const emptyEl    = q('#dxTodoEmpty', focusRoot);
        const formEl     = q('#dxTodoForm', focusRoot);
        const inputEl    = q('#dxTodoInput', focusRoot);
        const addBtn     = q('button[type="submit"]', formEl);
        const countEl    = q('#dxFocusCount', focusRoot);
        const progressEl = q('#dxFocusProgress', focusRoot);
        const barEl      = q('#dxFocusBar', focusRoot);

        // ── store ──
        function load() {
            try {
                const arr = JSON.parse(localStorage.getItem(storageKey) || '[]');
                const cutoff = Date.now() - TTL;
                return Array.isArray(arr)
                    ? arr.filter(t => t && typeof t.text === 'string' && t.createdAt > cutoff)
                    : [];
            } catch { return []; }
        }
        function save(list) {
            try { localStorage.setItem(storageKey, JSON.stringify(list)); return true; }
            catch { return false; }
        }

        let items = load();
        const persist = () => {
            if (!save(items)) toast('Could not save your list on this browser', 'error');
        };

        // ── view ──
        function updateSummary() {
            const done = items.filter(i => i.done).length;
            const total = items.length;
            emptyEl.hidden = total > 0;
            progressEl.hidden = total === 0;
            barEl.style.width = total ? `${(done / total) * 100}%` : '0%';
            countEl.textContent = total ? `${done} of ${total} done` : '';

            const full = total >= MAX_ITEMS;
            inputEl.disabled = full;
            addBtn.disabled = full;
            inputEl.placeholder = full ? 'That\u2019s plenty for one day' : 'Add something for today';
        }

        function buildTodo(item) {
            const li = document.createElement('li');
            li.className = 'dx-todo' + (item.done ? ' is-done' : '');

            const label = document.createElement('label');
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = !!item.done;
            const tick = document.createElement('span');
            tick.className = 'dx-check';
            const text = document.createElement('span');
            text.className = 'dx-todo-text';
            text.textContent = item.text;            // textContent: never parsed as HTML
            label.append(box, tick, text);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'dx-todo-x';
            remove.setAttribute('aria-label', `Remove "${item.text}"`);
            remove.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';

            box.addEventListener('change', () => {
                item.done = box.checked;
                li.classList.toggle('is-done', item.done);
                persist();
                updateSummary();
            });
            remove.addEventListener('click', () => {
                items = items.filter(i => i.id !== item.id);
                persist();
                render();
                inputEl.focus();
            });

            li.append(label, remove);
            return li;
        }

        function render() {
            listEl.textContent = '';
            items.forEach(item => listEl.appendChild(buildTodo(item)));
            updateSummary();
        }

        formEl.addEventListener('submit', e => {
            e.preventDefault();
            const text = inputEl.value.trim();
            if (!text || items.length >= MAX_ITEMS) return;
            items.push({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                text,
                done: false,
                createdAt: Date.now()
            });
            inputEl.value = '';
            persist();
            render();
            inputEl.focus();
        });

        render();
    }

    /* ─────────────────────────────────────────────────────────────
       NEW NOTE: quick-capture box + modal
       Typing a title in the capture box and pressing Enter opens the
       modal with that title filled in; the modal posts to /notes and
       the server redirects straight into the editor.
    ───────────────────────────────────────────────────────────── */
    const noteModalEl = document.getElementById('dxNewNoteModal');
    const titleInput  = document.getElementById('dxNoteTitle');

    const captureForm  = q('#dxCaptureForm');
    const captureInput = q('#dxCaptureInput');
    if (captureForm) {
        const hasWorkspaces = captureForm.dataset.hasWorkspaces === 'true';

        captureForm.addEventListener('submit', e => {
            e.preventDefault();
            // A note can't exist without a workspace, so start there instead
            if (!hasWorkspaces) { openModal('newWorkspaceModal'); return; }

            if (titleInput) titleInput.value = captureInput.value.trim().slice(0, 150);
            captureInput.value = '';
            openModal('dxNewNoteModal');
        });
    }

    if (noteModalEl) {
        const tagWidget = typeof createTagInput === 'function'
            ? createTagInput({
                wrapId: 'dxNoteTagWrap', chipsId: 'dxNoteTagChips', textInputId: 'dxNoteTagsInput',
                suggestionsId: 'dxNoteTagSuggestions', hiddenInputId: 'dxNoteTags'
            })
            : null;

        const noteForm  = document.getElementById('dxNewNoteForm');
        const submitBtn = document.getElementById('dxNoteSubmit');

        noteModalEl.addEventListener('shown.bs.modal', () => {
            if (!titleInput) return;
            titleInput.focus();
            const end = titleInput.value.length;
            titleInput.setSelectionRange(end, end);      // caret after any prefilled title
        });

        noteForm && noteForm.addEventListener('submit', e => {
            if (tagWidget) tagWidget.flushPending();
            if (!titleInput.value.trim()) {
                e.preventDefault();
                titleInput.focus();
                titleInput.style.borderColor = '#ef4444';
                return;
            }
            if (submitBtn) submitBtn.disabled = true;    // no double-creates
        });
        titleInput && titleInput.addEventListener('input', () => { titleInput.style.borderColor = ''; });

        // Coming back with the browser's back button restores the page from cache
        window.addEventListener('pageshow', () => { if (submitBtn) submitBtn.disabled = false; });
    }

    /* ─────────────────────────────────────────────────────────────
       SOFT NAVIGATION: plain left-clicks on same-site links inside
       the dashboard body fade out like the rest of the app. Modified
       clicks (ctrl/cmd/shift, middle button) keep the browser default.
    ───────────────────────────────────────────────────────────── */
    root.addEventListener('click', e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest('a[href]');
        if (!a || a.target === '_blank' || a.origin !== window.location.origin) return;
        e.preventDefault();
        goTo(a.href);
    });
})();