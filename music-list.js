/**
 * ====================================================================
 * DAFTAR PLAYLIST & LAGU MP3 LOKAL (SPOTIFY MUSIC PLAYER)
 * ====================================================================
 * File ini digunakan sebagai struktur data terpusat untuk mengelola
 * multiple playlists dan lagu MP3 lokal.
 * 
 * CARA MENAMBAH PLAYLIST BARU / LAGU BARU:
 * 1. Tambahkan key baru di dalam objek `playlists` di bawah ini.
 * 2. Masukkan nama playlist, deskripsi, gambar cover, dan daftar lagu (songs).
 * 3. Setiap lagu berisi: title, artist, src, cover, duration.
 * 
 * Anda tidak perlu mengubah kode pemutar musik utama (index.html).
 */

const playlists = {
    chill: {
        id: "chill",
        name: "Chill Vibes",
        description: "Lagu-lagu santai untuk relaksasi dan belajar",
        cover: "Screenshot 2026-03-07 214405.png",
        songs: [
            {
                id: 1,
                title: "Sunflower (Slowed + Reverb)",
                artist: "Post Malone, Swae Lee",
                src: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                file: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                cover: "Screenshot 2026-03-07 214405.png",
                duration: "04:12"
            },
            {
                id: 2,
                title: "Swim (Slowed + Reverb)",
                artist: "Chase Atlantic",
                src: "chase_atlantic_-_swim_slowed_reverb_lyrics_.mp3",
                file: "chase_atlantic_-_swim_slowed_reverb_lyrics_.mp3",
                cover: "Screenshot 2025-12-07 215648.png",
                duration: "04:46"
            }
        ]
    },

    night: {
        id: "night",
        name: "Night Drive",
        description: "Musik atmosferik untuk menemani malam hari",
        cover: "Screenshot 2025-11-15 225031.png",
        songs: [
            {
                id: 3,
                title: "Make It To The Morning (Slowed + Reverb)",
                artist: "PARTYNEXTDOOR",
                src: "partynextdoor_-_make_it_to_the_morning_slowed_reverb_.mp3",
                file: "partynextdoor_-_make_it_to_the_morning_slowed_reverb_.mp3",
                cover: "Screenshot 2025-11-15 225031.png",
                duration: "03:18"
            },
            {
                id: 4,
                title: "The Less I Know The Better (Slowed + Reverb)",
                artist: "Tame Impala",
                src: "-.mp3",
                file: "-.mp3",
                cover: "Screenshot 2025-11-17 065137.png",
                duration: "04:24"
            }
        ]
    },

    coding: {
        id: "coding",
        name: "Coding Focus",
        description: "Irama penambah fokus saat ngoding dan nugas",
        cover: "Screenshot 2025-12-16 174820.png",
        songs: [
            {
                id: 5,
                title: "20 Min (slowed + reverb)",
                artist: "Lil Uzi Vert",
                src: "Lil_Uzi_Vert_-_20_Min_slowed_reverb_.mp3",
                file: "Lil_Uzi_Vert_-_20_Min_slowed_reverb_.mp3",
                cover: "Screenshot 2025-12-16 174820.png",
                duration: "04:30"
            },
            {
                id: 1,
                title: "Sunflower (Slowed + Reverb)",
                artist: "Post Malone, Swae Lee",
                src: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                file: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                cover: "Screenshot 2026-03-07 214405.png",
                duration: "03:00"
            }
        ]
    },

    all: {
        id: "all",
        name: "Semua Lagu",
        description: "Kumpulan seluruh lagu MP3 lokal favorit Ken",
        cover: "Screenshot 2025-12-07 215648.png",
        songs: [
            {
                id: 1,
                title: "Sunflower (Slowed + Reverb)",
                artist: "Post Malone, Swae Lee",
                src: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                file: "Post_Malone_Swae_Lee_-_Sunflower_Slowed_down_and_reverb_.mp3",
                cover: "Screenshot 2026-03-07 214405.png",
                duration: "03:00"
            },
            {
                id: 2,
                title: "Swim (Slowed + Reverb)",
                artist: "Chase Atlantic",
                src: "chase_atlantic_-_swim_slowed_reverb_lyrics_.mp3",
                file: "chase_atlantic_-_swim_slowed_reverb_lyrics_.mp3",
                cover: "Screenshot 2025-12-07 215648.png",
                duration: "04:46"
            },
            {
                id: 3,
                title: "Make It To The Morning (Slowed + Reverb)",
                artist: "PARTYNEXTDOOR",
                src: "partynextdoor_-_make_it_to_the_morning_slowed_reverb_.mp3",
                file: "partynextdoor_-_make_it_to_the_morning_slowed_reverb_.mp3",
                cover: "Screenshot 2025-11-15 225031.png",
                duration: "03:18"
            },
            {
                id: 4,
                title: "The Less I Know The Better (Slowed + Reverb)",
                artist: "Tame Impala",
                src: "-.mp3",
                file: "-.mp3",
                cover: "Screenshot 2025-11-17 065137.png",
                duration: "04:24"
            },
            {
                id: 5,
                title: "20 Min (slowed + reverb)",
                artist: "Lil Uzi Vert",
                src: "Lil_Uzi_Vert_-_20_Min_slowed_reverb_.mp3",
                file: "Lil_Uzi_Vert_-_20_Min_slowed_reverb_.mp3",
                cover: "Screenshot 2025-12-16 174820.png",
                duration: "04:30"
            }
        ]
    }
};

// Helper function untuk mengambil seluruh data playlists
function getPlaylistsData() {
    return (typeof playlists !== 'undefined' && playlists) ? playlists : {};
}

// Helper function untuk mengambil daftar lagu dari playlist tertentu (backward compatible)
function getProjectPlaylist(playlistKey) {
    const data = getPlaylistsData();
    if (playlistKey && data[playlistKey] && Array.isArray(data[playlistKey].songs)) {
        return data[playlistKey].songs;
    }
    // Fallback: kembalikan playlist pertama atau gabungan lagu
    const keys = Object.keys(data);
    if (keys.length > 0 && Array.isArray(data[keys[0]].songs)) {
        return data[keys[0]].songs;
    }
    return [];
}

// Flat array fallback untuk kompatibilitas versi sebelumnya
const musicList = getProjectPlaylist('all');
