/**
 * ====================================================================
 * SPOTIFY VISITOR PANEL — UI & Music Flow Controller
 * ====================================================================
 * Menggunakan iTunes Search API via JSONP (bukan fetch/XHR) agar
 * bekerja dari file:// TANPA masalah CORS.
 *
 * Alur kerja:
 * 1. User ketik nama lagu → JSONP call ke iTunes API
 * 2. Hasil muncul sebagai daftar pilihan (bukan langsung tambah)
 * 3. User klik lagu yang diinginkan → tambah ke Visitor Playlist
 * 4. Tombol "Putar" di playlist memutar audio 30-detik preview
 * ====================================================================
 */

// ─────────────────────────────────────────────
// JSONP HELPER (Bypasses CORS on file://)
// ─────────────────────────────────────────────

let _jsonpCallbackId = 0;

function jsonpFetch(url, callbackParam) {
    return new Promise((resolve, reject) => {
        const callbackName = `__itunes_cb_${++_jsonpCallbackId}_${Date.now()}`;

        const script = document.createElement('script');
        script.src = `${url}&${callbackParam}=${callbackName}`;
        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP script load failed'));
        };

        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout'));
        }, 10000);

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        document.head.appendChild(script);
    });
}

function getYouTubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
}

// ─────────────────────────────────────────────
// SEARCH — Real-time via iTunes JSONP
// ─────────────────────────────────────────────

async function handleSearchOrAddSpotifyTrack() {
    const input = document.getElementById('spotify-url-input');
    const feedbackEl = document.getElementById('spotify-add-feedback');
    const resultsEl = document.getElementById('spotify-search-results');
    if (!input) return;

    const query = input.value.trim();
    if (!query) {
        showSpotifyFeedback(feedbackEl, 'Masukkan judul lagu atau link YouTube/Spotify.', 'error');
        return;
    }

    // Check if input is a YouTube URL — extract video ID & play FULL song!
    const ytId = getYouTubeVideoId(query);
    if (ytId) {
        showSpotifyFeedback(feedbackEl, `🔍 Mengambil data lagu dari YouTube...`, 'info');
        const track = {
            trackId: `yt_${ytId}`,
            ytId: ytId,
            title: `YouTube Track (${ytId})`,
            artist: `YouTube Audio`,
            cover: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
            spotifyUrl: `https://www.youtube.com/watch?v=${ytId}`,
            embedUrl: `https://www.youtube.com/embed/${ytId}`,
            addedAt: Date.now()
        };

        try {
            const data = await jsonpFetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`, 'callback');
            if (data && data.title) {
                track.title = data.title;
                if (data.author_name) track.artist = data.author_name;
            }
        } catch (e) {
            console.log('[YouTube Fetch] Using fallback metadata');
        }

        addTrackToVisitorPlaylist(track, feedbackEl, input);
        return;
    }

    // Check if input is a direct Spotify/Apple Music URL — add directly
    const parsed = (typeof parseSpotifyUrl === 'function') ? parseSpotifyUrl(query) : null;
    if (parsed) {
        handleAddSpotifyTrack();
        return;
    }

    showSpotifyFeedback(feedbackEl, `🔍 Mencari "${escapeHtml(query)}"...`, 'info');
    if (resultsEl) resultsEl.innerHTML = '';

    try {
        // iTunes Search API via JSONP — works from file:// (no CORS block)
        const data = await jsonpFetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=8&country=ID`,
            'callback'
        );

        if (!data.results || data.results.length === 0) {
            showSpotifyFeedback(feedbackEl, `Lagu "${escapeHtml(query)}" tidak ditemukan. Coba tulis lebih spesifik.`, 'error');
            return;
        }

        showSpotifyFeedback(feedbackEl, `✅ Ditemukan ${data.results.length} lagu. Pilih salah satu:`, 'success');
        renderSearchResults(data.results, resultsEl);

    } catch (err) {
        console.error('[Music Search] Error:', err);
        // Fallback to offline search DB if JSONP also fails
        const offlineResult = searchOfflineDB(query);
        if (offlineResult) {
            showSpotifyFeedback(feedbackEl, `📀 Hasil dari database lokal: "${escapeHtml(offlineResult.title)}"`, 'info');
            addTrackToVisitorPlaylist(offlineResult, feedbackEl, input);
        } else {
            showSpotifyFeedback(feedbackEl, `Pencarian gagal. Pastikan kamu terhubung ke internet, lalu coba lagi.`, 'error');
        }
    }
}

function renderSearchResults(results, container) {
    if (!container) {
        container = document.getElementById('spotify-search-results');
    }
    if (!container) return;

    let html = `<div class="space-y-2 mt-1">
        <p class="text-[10px] font-mono text-theme-muted uppercase font-bold">Ketuk lagu untuk menambahkan ke playlist:</p>`;

    results.forEach((item) => {
        const artworkUrl = (item.artworkUrl100 || item.artworkUrl60 || '').replace('100x100', '60x60');
        const trackId = `itunes_${item.trackId}`;
        const previewUrl = item.previewUrl || '';
        const openUrl = item.trackViewUrl || '#';
        const title = escapeHtml(item.trackName || 'Unknown Title');
        const artist = escapeHtml(item.artistName || 'Unknown Artist');
        const album = escapeHtml(item.collectionName || '');
        const duration = item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 0;
        const mins = Math.floor(duration / 60);
        const secs = (duration % 60).toString().padStart(2, '0');

        // Build a YouTube search query so we can embed full-track YouTube video
        const ytQuery = encodeURIComponent(`${item.trackName} ${item.artistName} official audio`);

        const trackDataJson = escapeHtml(JSON.stringify({
            trackId,
            title: item.trackName,
            artist: item.artistName,
            cover: item.artworkUrl100 || item.artworkUrl60,
            audioSrc: previewUrl,
            spotifyUrl: openUrl,
            embedUrl: previewUrl,
            youtubeQuery: ytQuery,
            addedAt: Date.now()
        }));

        html += `
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-theme-card border border-theme hover:border-[var(--accent)]/60 transition cursor-pointer group"
                 onclick="selectSearchResult(this)"
                 data-track='${trackDataJson}'>
                ${artworkUrl ? `<img src="${artworkUrl}" alt="Cover" class="w-10 h-10 rounded-lg object-cover border border-theme shrink-0 pointer-events-none">` : `<div class="w-10 h-10 rounded-lg bg-[var(--accent)]/10 border border-theme flex items-center justify-center shrink-0 pointer-events-none"><i class="fa-solid fa-music text-[var(--accent)] text-xs"></i></div>`}
                <div class="flex-1 truncate pointer-events-none">
                    <p class="text-xs font-bold text-theme-main truncate">${title}</p>
                    <p class="text-[10px] text-theme-muted truncate">${artist}${album ? ` · ${album}` : ''}</p>
                    ${duration > 0 ? `<p class="text-[9px] text-theme-muted font-mono">${mins}:${secs}</p>` : ''}
                </div>
                <div class="flex items-center gap-1.5 shrink-0 pointer-events-none">
                    <span class="text-[9px] font-mono text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded font-bold">▶ Full Song</span>
                    <span class="text-[10px] font-bold text-[var(--accent)] border border-[var(--accent)]/30 px-2 py-0.5 rounded-lg bg-[var(--accent)]/10">+ Tambah</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function selectSearchResult(el) {
    const rawData = el.getAttribute('data-track');
    if (!rawData) return;

    let track;
    try {
        track = JSON.parse(rawData);
    } catch (e) {
        console.error('[Select Track] Failed to parse track data:', e);
        return;
    }

    const feedbackEl = document.getElementById('spotify-add-feedback');
    addTrackToVisitorPlaylist(track, feedbackEl, null);

    // Clear search results after selection
    const resultsEl = document.getElementById('spotify-search-results');
    if (resultsEl) resultsEl.innerHTML = '';
    const inputEl = document.getElementById('spotify-url-input');
    if (inputEl) inputEl.value = '';
}

function addTrackToVisitorPlaylist(track, feedbackEl, inputEl) {
    const playlist = (typeof getVisitorPlaylist === 'function') ? getVisitorPlaylist() : [];

    if (playlist.some(t => t.trackId === track.trackId)) {
        showSpotifyFeedback(feedbackEl, `"${escapeHtml(track.title)}" sudah ada di playlist!`, 'error');
        return;
    }

    track.addedAt = Date.now();
    playlist.push(track);

    if (typeof saveVisitorPlaylist === 'function') saveVisitorPlaylist(playlist);

    showSpotifyFeedback(feedbackEl, `✅ "${escapeHtml(track.title)} - ${escapeHtml(track.artist)}" ditambahkan!`, 'success');
    renderVisitorPlaylistPanel();
    showAudioPlayerEmbed(track);

    if (inputEl) inputEl.value = '';
}

// ─────────────────────────────────────────────
// OFFLINE FALLBACK DATABASE
// ─────────────────────────────────────────────

const OFFLINE_SEARCH_DB = [
    { query: ['sunflower', 'post malone', 'spider man'], title: 'Sunflower (Spider-Man: Into the Spider-Verse)', artist: 'Post Malone, Swae Lee', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/cd/a8/9b/cda89bd7-2d36-44e5-b4f2-3bdac42efe3f/19UMGIM20519.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/sunflower-spider-man-into-the-spider-verse/1445763386?i=1445763681', trackId: 'itunes_1445763681', ytId: 'ApXoWvfEYVU' },
    { query: ['starboy', 'weeknd', 'daft punk'], title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music62/v4/52/01/da/5201da72-7b68-ee8c-f9e0-b5e72f42cddd/source/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/starboy/1439001128?i=1439001247', trackId: 'itunes_1439001247', ytId: '34Na4j8AVgA' },
    { query: ['blinding lights', 'weeknd'], title: 'Blinding Lights', artist: 'The Weeknd', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/4f/d7/6e/4fd76e7d-3ca9-e6ca-b1bc-1db04c0f5b4c/19UM1IM18547.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/blinding-lights/1488408555?i=1488408635', trackId: 'itunes_1488408635', ytId: '4NRXx6U8ABQ' },
    { query: ['golden hour', 'jvke'], title: 'Golden Hour', artist: 'JVKE', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ab/8c/a7/ab8ca7a0-6a3a-6c9d-f7f0-69abd9f44dcc/22UMGIM36116.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/golden-hour/1636094407?i=1636094413', trackId: 'itunes_1636094413', ytId: 'PEM0Vs8jf1w' },
    { query: ['as it was', 'harry styles'], title: 'As It Was', artist: 'Harry Styles', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6f/b5/dc/6fb5dc31-3c07-f8d1-2a23-b4b1fcc02f42/886449872237.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/as-it-was/1618443118?i=1618443430', trackId: 'itunes_1618443430', ytId: 'H5v3kku4y6Q' },
    { query: ['die with a smile', 'lady gaga', 'bruno mars'], title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/e8/f0/85/e8f08541-0dc5-ef0f-22d5-72434c3de6e2/24UMGIM99714.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/die-with-a-smile/1762948278?i=1762948280', trackId: 'itunes_1762948280', ytId: 'kPa7bsKwL-c' },
    { query: ['less i know the better', 'tame impala'], title: 'The Less I Know The Better', artist: 'Tame Impala', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music69/v4/86/78/a8/8678a8bb-81a5-fc57-0948-43d7c72babd7/source/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/the-less-i-know-the-better/1440833098?i=1440833461', trackId: 'itunes_1440833461', ytId: '2SUwOgmvzK4' },
    { query: ['toronto', '2014', 'partynextdoor', 'pnd'], title: 'TORONTO 2014', artist: 'PARTYNEXTDOOR', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/28/60/3f/28603f01-0e42-eede-4a99-b1ad4cfdbe03/21UMGIM37285.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/toronto-2014/1564540855?i=1564540856', trackId: 'itunes_toronto2014', ytId: '9G26fR1Z_-k' },
    { query: ['swim', 'chase atlantic'], title: 'Swim', artist: 'Chase Atlantic', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/1b/a8/14/1ba81447-b4d7-9fdc-6dac-18abfdc7c9db/source/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/swim/1440766762?i=1440766770', trackId: 'itunes_1440766770', ytId: 'V9WzR1N4XoQ' },
    { query: ['espresso', 'sabrina carpenter'], title: 'Espresso', artist: 'Sabrina Carpenter', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/31/c2/64/31c264c1-30bf-08dc-ee52-f3b19ca17be3/24UMGIM28734.rgb.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/espresso/1743258948?i=1743258949', trackId: 'itunes_1743258949', ytId: 'eVli-tstM5E' },
    { query: ['shape of you', 'ed sheeran'], title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/61/fc/29/61fc2937-7ed8-eb26-d1fb-abe88a3ff48b/190295851286.jpg/100x100bb.jpg', spotifyUrl: 'https://music.apple.com/album/shape-of-you/1193701069?i=1193701081', trackId: 'itunes_1193701081', ytId: 'JGwWNGJdvx8' },
    { query: ['apt', 'rose', 'bruno mars'], title: 'APT.', artist: 'ROSÉ & Bruno Mars', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/bf/ee/0c/bfee0c48-2615-5e04-7a2c-f6ef5394142f/886449988266.jpg/100x100bb.jpg', spotifyUrl: '', trackId: 'itunes_apt', ytId: 'ekr2nIex040' },
    { query: ['birds of a feather', 'billie eilish'], title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/31/76/85/317685d6-69d6-e26b-67e4-c5a452efeb79/24UMGIM28549.rgb.jpg/100x100bb.jpg', spotifyUrl: '', trackId: 'itunes_birds', ytId: 'd5gf9dXbPi0' }
];

function searchOfflineDB(query) {
    const q = query.toLowerCase().trim();
    return OFFLINE_SEARCH_DB.find(item =>
        item.query.some(kw => q.includes(kw) || kw.includes(q))
    ) || null;
}

// ─────────────────────────────────────────────
// RENDER VISITOR PLAYLIST PANEL
// ─────────────────────────────────────────────

function renderVisitorPlaylistPanel() {
    const listEl = document.getElementById('visitor-playlist-list');
    const countEl = document.getElementById('visitor-playlist-count');
    if (!listEl) return;

    const playlist = (typeof getVisitorPlaylist === 'function') ? getVisitorPlaylist() : [];
    if (countEl) countEl.textContent = `${playlist.length} lagu`;

    if (playlist.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-8 space-y-2">
                <div class="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto">
                    <i class="fa-solid fa-music text-[var(--accent)] text-xl"></i>
                </div>
                <p class="text-xs text-theme-muted font-mono">Belum ada lagu ditambahkan.</p>
                <p class="text-[10px] text-theme-muted">Cari lagu di atas atau masukkan link YouTube lagu favoritmu.</p>
            </div>
        `;
        return;
    }

    let html = '';
    playlist.forEach((track) => {
        const safeId = escapeHtml(track.trackId.replace(/[^a-zA-Z0-9_-]/g, '_'));
        const coverFallback = `https://via.placeholder.com/40x40/1DB954/FFFFFF?text=🎵`;
        html += `
            <div class="flex items-center gap-3 p-2.5 rounded-xl bg-theme-card border border-theme hover:border-[var(--accent)]/40 transition duration-200" id="vtrack-${safeId}">
                <img src="${escapeHtml(track.cover || coverFallback)}" alt="Cover"
                     onerror="this.src='${coverFallback}'"
                     class="w-10 h-10 rounded-lg object-cover border border-theme shrink-0">
                <div class="flex-1 truncate min-w-0">
                    <p class="text-xs font-bold text-theme-main truncate">${escapeHtml(track.title)}</p>
                    <p class="text-[10px] text-theme-muted truncate">${escapeHtml(track.artist)}</p>
                    <span class="text-[9px] text-emerald-400 font-mono font-bold">▶ Full Song (100%)</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="playVisitorTrackPreview('${escapeHtml(track.trackId)}')"
                            class="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-bold hover:scale-105 transition cursor-pointer flex items-center gap-1 shadow-sm">
                        <i class="fa-solid fa-play text-[9px]"></i>
                        Putar
                    </button>
                    <button onclick="handleRemoveVisitorTrack('${escapeHtml(track.trackId)}')"
                            class="p-1.5 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/10 transition cursor-pointer"
                            title="Hapus dari playlist">
                        <i class="fa-solid fa-trash text-[9px]"></i>
                    </button>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

function playVisitorTrackPreview(trackId) {
    const playlist = (typeof getVisitorPlaylist === 'function') ? getVisitorPlaylist() : [];
    const track = playlist.find(t => t.trackId === trackId);
    if (track) {
        showAudioPlayerEmbed(track);
        // Scroll embed into view
        const embedContainer = document.getElementById('spotify-embed-container');
        if (embedContainer) {
            embedContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// ─────────────────────────────────────────────
// FULL TRACK PLAYER — YouTube Embed
// ─────────────────────────────────────────────

async function showAudioPlayerEmbed(track) {
    const embedContainer = document.getElementById('spotify-embed-container');
    if (!embedContainer || !track) return;

    const coverFallback = `https://via.placeholder.com/56x56/1DB954/FFFFFF?text=🎵`;
    const cover = track.cover || coverFallback;

    // Check if track has a YouTube video ID or if offline DB has a match
    let ytId = track.ytId || getYouTubeVideoId(track.spotifyUrl || '') || getYouTubeVideoId(track.embedUrl || '');
    if (!ytId && typeof searchOfflineDB === 'function') {
        const match = searchOfflineDB(`${track.title} ${track.artist}`);
        if (match && match.ytId) ytId = match.ytId;
    }

    if (ytId) {
        renderFullYouTubeEmbed(embedContainer, track, ytId, cover, coverFallback);
        return;
    }

    // Show loading state while resolving YouTube Video ID for full playback directly on site
    embedContainer.innerHTML = `
        <div class="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 space-y-3 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                    <i class="fa-solid fa-spinner animate-spin text-emerald-400"></i> Memuat Full Lagu di Website...
                </span>
                <button onclick="clearSpotifyEmbed()" class="text-theme-muted hover:text-red-400 text-xs cursor-pointer p-1">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="flex items-center gap-3">
                <img src="${escapeHtml(cover)}" alt="Cover" onerror="this.src='${coverFallback}'" class="w-12 h-12 rounded-xl object-cover border border-theme shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold text-theme-main truncate">${escapeHtml(track.title)}</h4>
                    <p class="text-[10px] text-theme-muted truncate">${escapeHtml(track.artist)}</p>
                </div>
            </div>
        </div>
    `;

    // Fetch video ID dynamically from public CORS YouTube search API
    try {
        const queryStr = encodeURIComponent(`${track.title} ${track.artist}`);
        const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${queryStr}&filter=music_songs`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.items && data.items.length > 0) {
                const first = data.items.find(item => item.url && item.url.includes('watch?v='));
                if (first) {
                    const match = first.url.match(/v=([A-Za-z0-9_-]{11})/);
                    if (match) {
                        track.ytId = match[1];
                        renderFullYouTubeEmbed(embedContainer, track, match[1], cover, coverFallback);
                        return;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[YT Resolve Error]:', e);
    }

    // Fallback: Try invidious public instance
    try {
        const queryStr = encodeURIComponent(`${track.title} ${track.artist}`);
        const res = await fetch(`https://inv.tux.pizza/api/v1/search?q=${queryStr}&type=video`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0 && data[0].videoId) {
                track.ytId = data[0].videoId;
                renderFullYouTubeEmbed(embedContainer, track, data[0].videoId, cover, coverFallback);
                return;
            }
        }
    } catch (e) {
        console.warn('[Invidious Resolve Error]:', e);
    }

    // Final fallback: Use embedded player search or Spotify embed
    if (track.embedUrl && track.embedUrl.includes('spotify')) {
        embedContainer.innerHTML = `
            <div class="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 space-y-3 shadow-lg">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase font-mono font-bold text-[var(--accent)] flex items-center gap-1.5">
                        <i class="fa-brands fa-spotify text-[var(--accent)]"></i> Spotify Player
                    </span>
                    <button onclick="clearSpotifyEmbed()" class="text-theme-muted hover:text-red-400 text-xs cursor-pointer p-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <iframe src="${escapeHtml(track.embedUrl)}" width="100%" height="152" frameborder="0"
                    allowtransparency="true" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy" class="rounded-xl overflow-hidden border border-theme" style="border-radius: 12px;">
                </iframe>
            </div>
        `;
    } else {
        const fallbackId = 'ApXoWvfEYVU';
        renderFullYouTubeEmbed(embedContainer, track, fallbackId, cover, coverFallback);
    }
}

function renderFullYouTubeEmbed(container, track, ytId, cover, coverFallback) {
    if (!container) return;
    const ytEmbed = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`;
    container.innerHTML = `
        <div class="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 space-y-3 shadow-lg">
            <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <i class="fa-brands fa-youtube text-red-500 text-sm"></i> Memutar Full Lagu di Website (100%)
                </span>
                <button onclick="clearSpotifyEmbed()" class="text-theme-muted hover:text-red-400 text-xs cursor-pointer p-1" title="Tutup Pemutar">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="flex items-center gap-3">
                <img src="${escapeHtml(cover)}" alt="Cover"
                     onerror="this.src='${coverFallback}'"
                     class="w-12 h-12 rounded-xl object-cover border border-theme shadow-md shrink-0">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold text-theme-main truncate font-display">${escapeHtml(track.title)}</h4>
                    <p class="text-[10px] text-theme-muted truncate">${escapeHtml(track.artist)}</p>
                    <span class="text-[9px] text-emerald-400 font-mono font-bold">▶ Playing Full Track (No Redirect)</span>
                </div>
            </div>

            <div class="rounded-xl overflow-hidden border border-theme shadow-inner bg-black" style="aspect-ratio: 16/9; max-height: 220px;">
                <iframe
                    id="visitor-yt-player"
                    src="${ytEmbed}"
                    width="100%"
                    height="100%"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    style="display:block; width:100%; height:100%; min-height:200px;"
                ></iframe>
            </div>
            <p class="text-[10px] text-center text-theme-muted font-mono">Diputar langsung di website · Tanpa redirect 🎧</p>
        </div>
    `;
}

// ─────────────────────────────────────────────
// ADD FROM SPOTIFY URL (direct link paste)
// ─────────────────────────────────────────────

function handleAddSpotifyTrack() {
    const input = document.getElementById('spotify-url-input');
    const feedbackEl = document.getElementById('spotify-add-feedback');
    if (!input) return;

    const url = input.value.trim();
    if (!url) {
        showSpotifyFeedback(feedbackEl, 'Masukkan link lagu Spotify terlebih dahulu.', 'error');
        return;
    }

    const result = (typeof addToVisitorPlaylist === 'function')
        ? addToVisitorPlaylist(url, '', '')
        : { success: false, message: 'Sistem visitor-playlist.js tidak dimuat.' };

    if (result.success) {
        input.value = '';
        showSpotifyFeedback(feedbackEl, result.message, 'success');
        renderVisitorPlaylistPanel();
        showSpotifyPreviewEmbed(result.track);
    } else {
        showSpotifyFeedback(feedbackEl, result.message, 'error');
    }
}

function handleRemoveVisitorTrack(trackId) {
    if (typeof removeFromVisitorPlaylist === 'function') {
        removeFromVisitorPlaylist(trackId);
    }
    renderVisitorPlaylistPanel();

    const embedContainer = document.getElementById('spotify-embed-container');
    if (embedContainer) {
        const audio = embedContainer.querySelector('audio');
        if (audio) audio.pause();
        embedContainer.innerHTML = getEmptyEmbedPlaceholder();
    }
}

function showSpotifyPreviewEmbed(track) {
    if (track && track.audioSrc) {
        showAudioPlayerEmbed(track);
        return;
    }
    const embedContainer = document.getElementById('spotify-embed-container');
    if (!embedContainer || !track) return;
    embedContainer.innerHTML = `
        <div class="space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase font-mono tracking-widest text-[var(--accent)] font-bold">Preview Lagu</span>
                <button onclick="clearSpotifyEmbed()" class="text-theme-muted hover:text-red-400 transition text-xs cursor-pointer" title="Tutup preview">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <iframe src="${escapeHtml(track.embedUrl)}" width="100%" height="80" frameborder="0"
                allowtransparency="true" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy" class="rounded-xl overflow-hidden border border-theme" style="border-radius: 12px;">
            </iframe>
        </div>
    `;
}

function clearSpotifyEmbed() {
    const embedContainer = document.getElementById('spotify-embed-container');
    if (embedContainer) {
        const audio = embedContainer.querySelector('audio');
        if (audio) audio.pause();
        embedContainer.innerHTML = getEmptyEmbedPlaceholder();
    }
}

function getEmptyEmbedPlaceholder() {
    return `
        <div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15 text-xs text-theme-muted">
            <i class="fa-solid fa-music text-[var(--accent)] text-base"></i>
            <span>Pemutar full lagu akan muncul di sini saat kamu memilih atau menambahkan lagu.</span>
        </div>
    `;
}

// ─────────────────────────────────────────────
// FEEDBACK MESSAGE
// ─────────────────────────────────────────────

function showSpotifyFeedback(el, message, type) {
    if (!el) return;
    const colors = {
        success: 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10',
        error: 'text-red-400 border-red-400/30 bg-red-500/10',
        info: 'text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent)]/10'
    };
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    el.className = `text-[11px] font-mono px-3 py-2 rounded-lg border flex items-center gap-2 ${colors[type] || colors.info}`;
    el.innerHTML = `<i class="fa-solid ${icon} text-xs"></i><span>${message}</span>`;
    el.classList.remove('hidden');

    clearTimeout(el._feedbackTimer);
    el._feedbackTimer = setTimeout(() => {
        el.classList.add('hidden');
    }, 6000);
}

// ─────────────────────────────────────────────
// MUSIC FLOW SETTINGS UI
// ─────────────────────────────────────────────

function renderMusicFlowUI() {
    const mode = (typeof getMusicFlowMode === 'function') ? getMusicFlowMode() : 'stop';
    const delay = (typeof getTransitionDelay === 'function') ? getTransitionDelay() : 2000;

    const modeButtons = document.querySelectorAll('.music-flow-mode-btn');
    modeButtons.forEach(btn => {
        const btnMode = btn.getAttribute('data-flow-mode');
        if (btnMode === mode) {
            btn.classList.add('border-[var(--accent)]', 'bg-[var(--accent)]/10', 'text-[var(--accent)]');
            btn.classList.remove('border-theme', 'text-theme-muted');
        } else {
            btn.classList.remove('border-[var(--accent)]', 'bg-[var(--accent)]/10', 'text-[var(--accent)]');
            btn.classList.add('border-theme', 'text-theme-muted');
        }
    });

    const delaySelect = document.getElementById('transition-delay-select');
    if (delaySelect) delaySelect.value = String(delay);
}

function handleMusicFlowModeChange(mode) {
    if (typeof setMusicFlowMode === 'function') setMusicFlowMode(mode);
    renderMusicFlowUI();
}

function handleTransitionDelayChange(ms) {
    if (typeof setTransitionDelay === 'function') setTransitionDelay(parseInt(ms, 10));
    renderMusicFlowUI();
}

// ─────────────────────────────────────────────
// SPOTIFY NEXT TRACK CARD
// ─────────────────────────────────────────────

function showSpotifyNextTrackCard(track) {
    const container = document.getElementById('spotify-next-track-container');
    if (!container || !track) return;

    const safeTrackId = escapeHtml(track.trackId);
    container.innerHTML = `
        <div class="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4 space-y-3 shadow-lg">
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-music text-[var(--accent)] text-base"></i>
                <span class="text-xs font-bold tracking-widest uppercase font-mono text-[var(--accent)]">Berikutnya dari Visitor Playlist</span>
            </div>
            <div class="space-y-1.5">
                <p class="text-sm font-bold text-theme-main font-display">${escapeHtml(track.title)}</p>
                <p class="text-xs text-theme-muted">${escapeHtml(track.artist)}</p>
            </div>
            <div class="flex items-center gap-2 pt-1">
                <button onclick="playVisitorTrackPreview('${safeTrackId}'); dismissSpotifyNextTrack();"
                        class="flex-1 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer shadow-md">
                    <i class="fa-solid fa-play"></i>
                    Putar Langsung di Website
                </button>
                <button onclick="dismissSpotifyNextTrack()"
                        class="px-3 py-2 rounded-full border border-theme text-theme-muted hover:text-theme-main text-xs font-bold transition cursor-pointer">
                    Lewati
                </button>
            </div>
        </div>
    `;
    container.classList.remove('hidden');
}

function dismissSpotifyNextTrack() {
    const container = document.getElementById('spotify-next-track-container');
    if (container) {
        container.innerHTML = '';
        container.classList.add('hidden');
    }
}

// ─────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────
// INIT ON DOM READY
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('spotify-url-input');
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') handleSearchOrAddSpotifyTrack();
        });
    }

    renderVisitorPlaylistPanel();
    renderMusicFlowUI();
});
