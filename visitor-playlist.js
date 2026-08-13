/**
 * ====================================================================
 * VISITOR SPOTIFY PLAYLIST — Session Storage Manager
 * ====================================================================
 * This file manages the temporary Spotify visitor playlist stored in
 * sessionStorage. It persists across page navigation within the same
 * browser session but is cleared when the tab/window is closed.
 *
 * NOTE: This does NOT download or store any audio. Only Spotify
 * track metadata/references (URL, embed) are stored.
 * All playback uses official Spotify iFrame embeds or the
 * "Open in Spotify" external link.
 * ====================================================================
 */

const VISITOR_PLAYLIST_KEY = 'visitorSpotifyPlaylist';
const VISITOR_LAST_RANDOM_KEY = 'visitorSpotifyLastRandom';
const VISITOR_MUSIC_FLOW_KEY = 'visitorMusicFlow';
const VISITOR_TRANSITION_DELAY_KEY = 'visitorTransitionDelay';

// ─────────────────────────────────────────────
// PLAYLIST READ / WRITE
// ─────────────────────────────────────────────

function getVisitorPlaylist() {
    try {
        const raw = sessionStorage.getItem(VISITOR_PLAYLIST_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveVisitorPlaylist(list) {
    try {
        sessionStorage.setItem(VISITOR_PLAYLIST_KEY, JSON.stringify(list));
    } catch (e) {
        console.warn('Could not save visitor playlist to sessionStorage:', e);
    }
}

function clearVisitorPlaylist() {
    sessionStorage.removeItem(VISITOR_PLAYLIST_KEY);
    sessionStorage.removeItem(VISITOR_LAST_RANDOM_KEY);
}

// ─────────────────────────────────────────────
// TRACK MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Parses a Spotify track URL and returns { trackId, type } or null.
 * Supports:
 *   https://open.spotify.com/track/TRACK_ID
 *   https://open.spotify.com/track/TRACK_ID?si=...
 *   spotify:track:TRACK_ID
 */
function parseSpotifyUrl(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();

    // spotify:track:ID URI format
    const uriMatch = url.match(/^spotify:track:([A-Za-z0-9]+)$/);
    if (uriMatch) return { trackId: uriMatch[1], type: 'track' };

    // https://open.spotify.com/track/ID
    const httpMatch = url.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
    if (httpMatch) return { trackId: httpMatch[1], type: 'track' };

    return null;
}

function buildSpotifyEmbedUrl(trackId) {
    return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
}

function buildSpotifyOpenUrl(trackId) {
    return `https://open.spotify.com/track/${trackId}`;
}

/**
 * Add a track to the visitor playlist.
 * Returns { success: bool, message: string, track: object|null }
 */
function addToVisitorPlaylist(spotifyUrl, manualTitle, manualArtist) {
    const parsed = parseSpotifyUrl(spotifyUrl);
    if (!parsed) {
        return {
            success: false,
            message: 'URL Spotify tidak valid. Gunakan link dari "Share → Copy Link" lagu di Spotify.',
            track: null
        };
    }

    const { trackId } = parsed;
    const playlist = getVisitorPlaylist();

    // Reject duplicates
    if (playlist.some(t => t.trackId === trackId)) {
        return {
            success: false,
            message: 'Lagu ini sudah ada di playlist kamu.',
            track: null
        };
    }

    const track = {
        trackId,
        title: manualTitle || `Track ${trackId.substring(0, 8)}...`,
        artist: manualArtist || 'Spotify Track',
        spotifyUrl: buildSpotifyOpenUrl(trackId),
        embedUrl: buildSpotifyEmbedUrl(trackId),
        addedAt: Date.now()
    };

    playlist.push(track);
    saveVisitorPlaylist(playlist);

    return { success: true, message: 'Lagu berhasil ditambahkan ke Visitor Playlist!', track };
}

/**
 * Remove a track from the visitor playlist by trackId.
 */
function removeFromVisitorPlaylist(trackId) {
    let playlist = getVisitorPlaylist();
    playlist = playlist.filter(t => t.trackId !== trackId);
    saveVisitorPlaylist(playlist);
}

/**
 * Returns a random track from the visitor playlist,
 * trying to avoid the last one played.
 */
function getRandomVisitorTrack() {
    const playlist = getVisitorPlaylist();
    if (playlist.length === 0) return null;
    if (playlist.length === 1) return playlist[0];

    const lastId = sessionStorage.getItem(VISITOR_LAST_RANDOM_KEY);
    let candidates = playlist.filter(t => t.trackId !== lastId);
    if (candidates.length === 0) candidates = playlist;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    sessionStorage.setItem(VISITOR_LAST_RANDOM_KEY, picked.trackId);
    return picked;
}

// ─────────────────────────────────────────────
// MUSIC FLOW SETTINGS
// ─────────────────────────────────────────────

/** Music flow mode: 'stop' | 'random' | 'playlist' */
function getMusicFlowMode() {
    return localStorage.getItem(VISITOR_MUSIC_FLOW_KEY) || 'stop';
}

function setMusicFlowMode(mode) {
    localStorage.setItem(VISITOR_MUSIC_FLOW_KEY, mode);
}

/** Transition delay in milliseconds */
function getTransitionDelay() {
    const val = parseInt(localStorage.getItem(VISITOR_TRANSITION_DELAY_KEY), 10);
    return isNaN(val) ? 2000 : val;
}

function setTransitionDelay(ms) {
    localStorage.setItem(VISITOR_TRANSITION_DELAY_KEY, String(ms));
}
