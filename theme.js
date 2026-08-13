/**
 * ====================================================================
 * GLOBAL THEME & ACCENT COLOR ENGINE (SHARED ACROSS ALL PAGES)
 * ====================================================================
 */

// 1. EARLY EXECUTION (Runs immediately to prevent theme/accent flash)
(function initThemeAndAccent() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedAccent = localStorage.getItem('accentColor') || '#1DB954';

    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    applyAccentColorVariables(savedAccent);
})();

// Helper: Convert Hex to RGB and apply to CSS Variables
function applyAccentColorVariables(hex) {
    if (!hex) hex = '#1DB954';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

    // Developer Debug Mode Console Output
    if (window.location.hash === '#debug') {
        console.log("[Theme Engine] Current Accent:", getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
    }

    // Update accent swatch indicators & color inputs on page if present
    const hexInput = document.getElementById('accent-hex-input');
    const colorPicker = document.getElementById('accent-color-picker');
    const rgbVal = document.getElementById('accent-rgb-val');
    const deskSwatch = document.getElementById('desktop-accent-swatch');
    const mobSwatch = document.getElementById('mobile-accent-swatch');
    const modalSwatch = document.getElementById('modal-accent-swatch');

    if (hexInput) hexInput.value = hex.toUpperCase();
    if (colorPicker) colorPicker.value = hex;
    if (rgbVal) rgbVal.textContent = `rgb(${r}, ${g}, ${b})`;
    if (deskSwatch) deskSwatch.style.backgroundColor = hex;
    if (mobSwatch) mobSwatch.style.backgroundColor = hex;
    if (modalSwatch) modalSwatch.style.backgroundColor = hex;
}

// 2. TOGGLE DARK / LIGHT THEME
function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';

    if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', newTheme);
    updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
    const icons = document.querySelectorAll('.theme-toggle-icon');
    const texts = document.querySelectorAll('.theme-toggle-text');

    icons.forEach(icon => {
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-moon theme-toggle-icon text-[var(--accent)]';
        } else {
            icon.className = 'fa-solid fa-sun theme-toggle-icon text-amber-500';
        }
    });

    texts.forEach(text => {
        if (text) text.textContent = theme === 'dark' ? 'Spotify Dark' : 'Light Mode';
    });
}

// 3. SET ACCENT COLOR (PERSISTENT & DYNAMIC)
function setAccentColor(hex, save = true) {
    if (!hex) hex = '#1DB954';
    applyAccentColorVariables(hex);

    if (save) {
        localStorage.setItem('accentColor', hex);
    }

    // Refresh active section highlights on current page
    const currentTab = document.querySelector('main > div > section:not(.hidden)');
    if (currentTab && typeof switchTab === 'function') {
        const tabId = currentTab.id.replace('view-', '');
        switchTab(tabId);
    }

    // Trigger page-specific re-renders if available
    if (typeof renderPlaylistCards === 'function') renderPlaylistCards();
    if (typeof renderPlaylistItems === 'function') renderPlaylistItems();
    if (typeof updatePlayerControlsUI === 'function') updatePlayerControlsUI();
    if (typeof renderJadwal === 'function') renderJadwal();
    if (typeof drawSnake === 'function' && typeof snakeCanvas !== 'undefined' && snakeCanvas) drawSnake();
}

function resetAccentColor() {
    setAccentColor('#1DB954', true);
}

// 4. ACCENT COLOR CUSTOMIZER MODAL CONTROLS
function toggleColorCustomizer(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('color-customizer-modal');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

function closeColorCustomizer() {
    const modal = document.getElementById('color-customizer-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 5. CROSS-TAB & CROSS-PAGE LOCALSTORAGE SYNCHRONIZATION
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
        if (e.newValue === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        updateThemeIcons(e.newValue);
    } else if (e.key === 'accentColor') {
        setAccentColor(e.newValue, false);
    }
});

// 6. INITIALIZE UI ON DOM CONTENT LOADED
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedAccent = localStorage.getItem('accentColor') || '#1DB954';
    updateThemeIcons(savedTheme);
    applyAccentColorVariables(savedAccent);
});
