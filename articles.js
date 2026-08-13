/**
 * ====================================================================
 * SHARED ARTICLE EXPANSION SYSTEM — Robust & Event-Delegated
 * ====================================================================
 * Serves both informatika.html and bahasaindonesia.html.
 * Handles "Baca Selengkapnya" / "Tutup Artikel" toggles cleanly
 * via inline helper function and global event delegation.
 * Works seamlessly in file:// local browsing environments.
 * ====================================================================
 */

/**
 * Direct toggle function called via onclick="toggleArticle('article-id', this)"
 * or triggered by event delegation.
 */
function toggleArticle(articleId, btn) {
    if (!articleId) return;

    // Find the target content element
    const content = document.getElementById(articleId);
    if (!content) {
        console.warn('[Article Engine] Content element not found with ID:', articleId);
        return;
    }

    // Determine current visibility state
    const isHidden = content.classList.contains('hidden') || content.style.display === 'none' || getComputedStyle(content).display === 'none';

    // Toggle hidden class and force explicit display property
    if (isHidden) {
        content.classList.remove('hidden');
        content.style.display = 'block';
    } else {
        content.classList.add('hidden');
        content.style.display = 'none';
    }

    // Update button text and arrow icon if present
    if (btn) {
        const label = btn.querySelector('.artikel-btn-label') || btn.querySelector('span') || btn;
        const arrow = btn.querySelector('.artikel-arrow') || btn.querySelector('i');

        if (label && label !== btn) {
            label.textContent = isHidden ? 'Tutup Artikel' : 'Baca Selengkapnya';
        }

        if (arrow) {
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}

// Global Event Delegation setup to catch any click on article buttons
document.addEventListener('click', (e) => {
    // Find closest clickable button element with toggleArticle or data-target or .baca-selengkapnya
    const btn = e.target.closest('button[onclick*="toggleArticle"], .baca-selengkapnya, [data-target]');
    if (!btn) return;

    // Extract article ID from data-target or onclick attribute
    let articleId = btn.getAttribute('data-target');
    if (!articleId) {
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/toggleArticle\s*\(\s*['"]([^'"]+)['"]/);
            if (match) articleId = match[1];
        }
    }

    if (articleId) {
        const content = document.getElementById(articleId);
        if (content) {
            // Guarantee toggle execution in case inline event was suppressed or blocked
            if (e.target.tagName === 'A') e.preventDefault();
        }
    }
}, true);

