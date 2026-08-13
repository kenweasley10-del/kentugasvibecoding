/**
 * ====================================================================
 * MINI GAMES ENGINE - 100% VANILLA JS PLAYABLE GAMES
 * ====================================================================
 */

let activeGame = null;

function showGamesMenu() {
    activeGame = null;
    const menuView = document.getElementById('games-menu-view');
    const stageView = document.getElementById('game-stage-view');
    const badge = document.getElementById('games-active-badge');

    if (menuView) menuView.classList.remove('hidden');
    if (stageView) stageView.classList.add('hidden');
    if (badge) badge.classList.add('hidden');

    // Stop active loops
    if (typeof snakeInterval !== 'undefined' && snakeInterval) clearInterval(snakeInterval);
    if (typeof memoryTimerInterval !== 'undefined' && memoryTimerInterval) clearInterval(memoryTimerInterval);
    if (typeof reactionTimeout !== 'undefined' && reactionTimeout) clearTimeout(reactionTimeout);

    updateGameCardBestScores();
}

function updateGameCardBestScores() {
    const snakeBest = localStorage.getItem('snake_high_score') || 0;
    const memoryBest = localStorage.getItem('memory_best_moves') || '-';
    const reactionBest = localStorage.getItem('reaction_best_ms') || '-';
    const best2048 = localStorage.getItem('2048_high_score') || 0;

    const elSnake = document.getElementById('high-score-snake-card');
    const elMem = document.getElementById('best-memory-card');
    const elReac = document.getElementById('best-reaction-card');
    const el2048 = document.getElementById('high-score-2048-card');

    if (elSnake) elSnake.textContent = `BEST: ${snakeBest}`;
    if (elMem) elMem.textContent = `BEST: ${memoryBest !== '-' ? memoryBest + ' Moves' : '-'}`;
    if (elReac) elReac.textContent = `BEST: ${reactionBest !== '-' ? reactionBest + ' ms' : '-'}`;
    if (el2048) el2048.textContent = `BEST: ${best2048}`;
}

function launchGame(gameId) {
    activeGame = gameId;
    const menuView = document.getElementById('games-menu-view');
    const stageView = document.getElementById('game-stage-view');
    const badge = document.getElementById('games-active-badge');

    if (menuView) menuView.classList.add('hidden');
    if (stageView) stageView.classList.remove('hidden');
    if (badge) badge.classList.remove('hidden');

    const stages = ['snake', 'memory', 'reaction', '2048'];
    stages.forEach(s => {
        const el = document.getElementById(`${s}-stage`);
        if (el) el.classList.add('hidden');
    });

    const activeEl = document.getElementById(`${gameId}-stage`);
    if (activeEl) activeEl.classList.remove('hidden');

    const titleEl = document.getElementById('active-game-title');
    if (gameId === 'snake') {
        if (titleEl) titleEl.textContent = '🐍 Classic Snake';
        startSnakeGame();
    } else if (gameId === 'memory') {
        if (titleEl) titleEl.textContent = '🧠 Memory Cards';
        startMemoryGame();
    } else if (gameId === 'reaction') {
        if (titleEl) titleEl.textContent = '⚡ Reaction Test';
        startReactionGame();
    } else if (gameId === '2048') {
        if (titleEl) titleEl.textContent = '🔢 2048 Puzzle';
        start2048Game();
    }
}

/* ====================================================================
   GAME 1: SNAKE
   ==================================================================== */
let snakeCanvas = null, snakeCtx = null;
let snake = [];
let snakeFood = { x: 0, y: 0 };
let snakeDx = 20, snakeDy = 0;
let snakeScore = 0;
let snakeHighScore = 0;
let snakeInterval = null;
let snakePaused = false;
const snakeGridSize = 20;

function startSnakeGame() {
    snakeCanvas = document.getElementById('snake-canvas');
    if (!snakeCanvas) return;
    snakeCtx = snakeCanvas.getContext('2d');

    snakeHighScore = parseInt(localStorage.getItem('snake_high_score') || '0');
    snakeScore = 0;
    snakeDx = snakeGridSize;
    snakeDy = 0;
    snakePaused = false;

    const goOverlay = document.getElementById('snake-gameover');
    if (goOverlay) goOverlay.classList.add('hidden');

    updateSnakeScoreUI();

    snake = [
        { x: 160, y: 200 },
        { x: 140, y: 200 },
        { x: 120, y: 200 }
    ];

    spawnSnakeFood();

    if (snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(updateSnakeLoop, 100);
}

function spawnSnakeFood() {
    if (!snakeCanvas) return;
    const maxX = (snakeCanvas.width / snakeGridSize) - 1;
    const maxY = (snakeCanvas.height / snakeGridSize) - 1;
    snakeFood = {
        x: Math.floor(Math.random() * maxX) * snakeGridSize,
        y: Math.floor(Math.random() * maxY) * snakeGridSize
    };
}

function updateSnakeLoop() {
    if (snakePaused) return;

    const head = { x: snake[0].x + snakeDx, y: snake[0].y + snakeDy };

    // Wall collision
    if (head.x < 0 || head.x >= snakeCanvas.width || head.y < 0 || head.y >= snakeCanvas.height) {
        onSnakeGameOver();
        return;
    }

    // Body collision
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            onSnakeGameOver();
            return;
        }
    }

    snake.unshift(head);

    // Eat food
    if (head.x === snakeFood.x && head.y === snakeFood.y) {
        snakeScore += 10;
        if (snakeScore > snakeHighScore) {
            snakeHighScore = snakeScore;
            localStorage.setItem('snake_high_score', snakeHighScore);
        }
        updateSnakeScoreUI();
        spawnSnakeFood();
    } else {
        snake.pop();
    }

    drawSnake();
}

function drawSnake() {
    if (!snakeCtx || !snakeCanvas) return;
    const computedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1DB954';
    const computedBgCard = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#181818';

    snakeCtx.fillStyle = computedBgCard;
    snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

    // Draw Food
    snakeCtx.fillStyle = '#EF4444';
    snakeCtx.beginPath();
    snakeCtx.arc(snakeFood.x + snakeGridSize / 2, snakeFood.y + snakeGridSize / 2, snakeGridSize / 2 - 2, 0, Math.PI * 2);
    snakeCtx.fill();

    // Draw Snake Body
    snake.forEach((part, idx) => {
        snakeCtx.fillStyle = idx === 0 ? computedAccent : computedAccent + 'CC';
        snakeCtx.beginPath();
        snakeCtx.roundRect(part.x + 1, part.y + 1, snakeGridSize - 2, snakeGridSize - 2, 4);
        snakeCtx.fill();
    });
}

function handleSnakeKeydown(e) {
    if (activeGame !== 'snake') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
    }
    const k = e.key.toLowerCase();
    if ((k === 'arrowup' || k === 'w') && snakeDy === 0) { snakeDx = 0; snakeDy = -snakeGridSize; }
    if ((k === 'arrowdown' || k === 's') && snakeDy === 0) { snakeDx = 0; snakeDy = snakeGridSize; }
    if ((k === 'arrowleft' || k === 'a') && snakeDx === 0) { snakeDx = -snakeGridSize; snakeDy = 0; }
    if ((k === 'arrowright' || k === 'd') && snakeDx === 0) { snakeDx = snakeGridSize; snakeDy = 0; }
}

function handleSnakeTouchDir(dir) {
    if (dir === 'UP' && snakeDy === 0) { snakeDx = 0; snakeDy = -snakeGridSize; }
    if (dir === 'DOWN' && snakeDy === 0) { snakeDx = 0; snakeDy = snakeGridSize; }
    if (dir === 'LEFT' && snakeDx === 0) { snakeDx = -snakeGridSize; snakeDy = 0; }
    if (dir === 'RIGHT' && snakeDx === 0) { snakeDx = snakeGridSize; snakeDy = 0; }
}

function toggleSnakePause() {
    snakePaused = !snakePaused;
    const btn = document.getElementById('btn-snake-pause');
    if (btn) btn.textContent = snakePaused ? 'Lanjut ▶' : 'Jeda ⏸';
}

function onSnakeGameOver() {
    clearInterval(snakeInterval);
    const goOverlay = document.getElementById('snake-gameover');
    const finalScore = document.getElementById('snake-final-score');
    if (finalScore) finalScore.textContent = `Skor Akhir: ${snakeScore}`;
    if (goOverlay) goOverlay.classList.remove('hidden');
}

function updateSnakeScoreUI() {
    const sScore = document.getElementById('game-score-display');
    const sBest = document.getElementById('game-best-display');
    if (sScore) sScore.textContent = `SCORE: ${snakeScore}`;
    if (sBest) sBest.textContent = `BEST: ${snakeHighScore}`;
}

/* ====================================================================
   GAME 2: MEMORY CARDS
   ==================================================================== */
const memoryIcons = [
    'fa-music', 'fa-headphones', 'fa-bolt', 'fa-rocket',
    'fa-laptop-code', 'fa-gamepad', 'fa-trophy', 'fa-fire'
];

let flippedCards = [];
let matchedPairs = 0;
let memoryMoves = 0;
let memoryTimer = 0;
let memoryTimerInterval = null;
let memoryLock = false;

function startMemoryGame() {
    const grid = document.getElementById('memory-grid');
    if (!grid) return;

    memoryMoves = 0;
    matchedPairs = 0;
    memoryTimer = 0;
    flippedCards = [];
    memoryLock = false;

    if (memoryTimerInterval) clearInterval(memoryTimerInterval);
    memoryTimerInterval = setInterval(() => {
        memoryTimer++;
        const m = Math.floor(memoryTimer / 60);
        const s = memoryTimer % 60;
        const timerEl = document.getElementById('memory-timer');
        if (timerEl) timerEl.textContent = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }, 1000);

    const movesEl = document.getElementById('memory-moves');
    if (movesEl) movesEl.textContent = '0';
    document.getElementById('game-score-display').textContent = 'MOVES: 0';

    const bestMoves = localStorage.getItem('memory_best_moves') || '-';
    document.getElementById('game-best-display').textContent = `BEST: ${bestMoves !== '-' ? bestMoves + ' Moves' : '-'}`;

    const deck = [...memoryIcons, ...memoryIcons].sort(() => Math.random() - 0.5);

    grid.innerHTML = '';
    deck.forEach((iconClass, idx) => {
        const cardNode = document.createElement('div');
        cardNode.className = 'w-full aspect-square rounded-xl bg-theme-card border-2 border-theme cursor-pointer flex items-center justify-center text-2xl transition-all duration-300 hover:scale-105 shadow-md relative select-none';
        cardNode.dataset.icon = iconClass;

        cardNode.innerHTML = `
            <div class="card-front text-[var(--accent)] hidden">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="card-back text-theme-muted font-bold text-lg">
                <i class="fa-solid fa-question text-xs"></i>
            </div>
        `;

        cardNode.addEventListener('click', () => onMemoryCardClick(cardNode));
        grid.appendChild(cardNode);
    });
}

function onMemoryCardClick(cardNode) {
    if (memoryLock || cardNode.classList.contains('flipped') || cardNode.classList.contains('matched')) return;

    cardNode.classList.add('flipped');
    cardNode.querySelector('.card-front').classList.remove('hidden');
    cardNode.querySelector('.card-back').classList.add('hidden');
    cardNode.style.borderColor = 'var(--accent)';

    flippedCards.push(cardNode);

    if (flippedCards.length === 2) {
        memoryMoves++;
        const movesEl = document.getElementById('memory-moves');
        if (movesEl) movesEl.textContent = memoryMoves;
        document.getElementById('game-score-display').textContent = `MOVES: ${memoryMoves}`;

        const [c1, c2] = flippedCards;
        if (c1.dataset.icon === c2.dataset.icon) {
            c1.classList.add('matched');
            c2.classList.add('matched');
            c1.style.backgroundColor = 'rgba(var(--accent-rgb), 0.2)';
            c2.style.backgroundColor = 'rgba(var(--accent-rgb), 0.2)';
            matchedPairs++;
            flippedCards = [];

            if (matchedPairs === 8) {
                clearInterval(memoryTimerInterval);
                const prevBest = localStorage.getItem('memory_best_moves');
                if (!prevBest || memoryMoves < parseInt(prevBest)) {
                    localStorage.setItem('memory_best_moves', memoryMoves);
                }
                setTimeout(() => {
                    alert(`🎉 Selamat! Kamu menyelesaikan Memory Game dalam ${memoryMoves} langkah dan ${memoryTimer} detik!`);
                }, 300);
            }
        } else {
            memoryLock = true;
            setTimeout(() => {
                c1.classList.remove('flipped');
                c2.classList.remove('flipped');
                c1.querySelector('.card-front').classList.add('hidden');
                c1.querySelector('.card-back').classList.remove('hidden');
                c2.querySelector('.card-front').classList.add('hidden');
                c2.querySelector('.card-back').classList.remove('hidden');
                c1.style.borderColor = '';
                c2.style.borderColor = '';
                flippedCards = [];
                memoryLock = false;
            }, 800);
        }
    }
}

/* ====================================================================
   GAME 3: REACTION TIME TEST
   ==================================================================== */
let reactionState = 'IDLE'; // IDLE | WAITING | READY | RESULT
let reactionStartTime = 0;
let reactionTimeout = null;

function startReactionGame() {
    reactionState = 'IDLE';
    if (reactionTimeout) clearTimeout(reactionTimeout);

    const box = document.getElementById('reaction-box');
    const prompt = document.getElementById('reaction-prompt');
    const sub = document.getElementById('reaction-sub');
    const icon = document.getElementById('reaction-icon');

    const bestMs = localStorage.getItem('reaction_best_ms') || '-';
    document.getElementById('game-score-display').textContent = 'TIME: - ms';
    document.getElementById('game-best-display').textContent = `BEST: ${bestMs !== '-' ? bestMs + ' ms' : '-'}`;

    if (box) box.style.backgroundColor = '';
    if (prompt) prompt.textContent = 'Klik untuk Mulai!';
    if (sub) sub.textContent = 'Uji seberapa cepat reaksi kamu saat layar berubah jadi HIJAU.';
    if (icon) icon.textContent = '⚡';
}

function handleReactionClick() {
    const box = document.getElementById('reaction-box');
    const prompt = document.getElementById('reaction-prompt');
    const sub = document.getElementById('reaction-sub');
    const icon = document.getElementById('reaction-icon');

    if (reactionState === 'IDLE') {
        reactionState = 'WAITING';
        if (box) box.style.backgroundColor = '#EF4444'; // Waiting Red
        if (prompt) { prompt.textContent = 'Tunggu Warna HIJAU...'; prompt.className = 'text-lg font-extrabold text-white font-display'; }
        if (sub) sub.textContent = 'Jangan klik dulu sampai layar berubah warna!';
        if (icon) icon.textContent = '⏳';

        const randomDelay = Math.floor(Math.random() * 3000) + 2000;
        reactionTimeout = setTimeout(() => {
            reactionState = 'READY';
            reactionStartTime = Date.now();
            const computedAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#1DB954';
            if (box) box.style.backgroundColor = computedAccent;
            if (prompt) prompt.textContent = 'KLIK SEKARANG!';
            if (sub) sub.textContent = 'Cepat klik!';
            if (icon) icon.textContent = '🟢';
        }, randomDelay);

    } else if (reactionState === 'WAITING') {
        clearTimeout(reactionTimeout);
        reactionState = 'IDLE';
        if (box) box.style.backgroundColor = '#F59E0B';
        if (prompt) prompt.textContent = 'Terlalu Cepat! ❌';
        if (sub) sub.textContent = 'Kamu mengeklik sebelum warna HIJAU muncul. Klik untuk coba lagi.';
        if (icon) icon.textContent = '⚠️';

    } else if (reactionState === 'READY') {
        const ms = Date.now() - reactionStartTime;
        reactionState = 'RESULT';

        const bestMs = localStorage.getItem('reaction_best_ms');
        if (!bestMs || ms < parseInt(bestMs)) {
            localStorage.setItem('reaction_best_ms', ms);
        }

        document.getElementById('game-score-display').textContent = `TIME: ${ms} ms`;
        document.getElementById('game-best-display').textContent = `BEST: ${localStorage.getItem('reaction_best_ms')} ms`;

        if (box) box.style.backgroundColor = '';
        if (prompt) prompt.textContent = `${ms} ms`;
        if (icon) icon.textContent = '🏆';

        let rating = '👍 Bagus!';
        if (ms < 200) rating = '⚡ Refleks Kilat! Superhuman!';
        else if (ms < 300) rating = '🚀 Sangat Cepat!';
        else if (ms > 450) rating = '🐢 Agak lambat, coba lagi!';

        if (sub) sub.textContent = `${rating} Klik untuk tes lagi.`;

    } else if (reactionState === 'RESULT') {
        startReactionGame();
        handleReactionClick();
    }
}

/* ====================================================================
   GAME 4: 2048 PUZZLE
   ==================================================================== */
let board2048 = [];
let score2048 = 0;
let highScore2048 = 0;

function start2048Game() {
    board2048 = Array(4).fill(null).map(() => Array(4).fill(0));
    score2048 = 0;
    highScore2048 = parseInt(localStorage.getItem('2048_high_score') || '0');

    update2048ScoreUI();
    spawn2048Tile();
    spawn2048Tile();
    render2048Board();
}

function spawn2048Tile() {
    const emptyCells = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (board2048[r][c] === 0) emptyCells.push({ r, c });
        }
    }
    if (emptyCells.length > 0) {
        const rand = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board2048[rand.r][rand.c] = Math.random() < 0.9 ? 2 : 4;
    }
}

function render2048Board() {
    const boardEl = document.getElementById('2048-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const val = board2048[r][c];
            const tileNode = document.createElement('div');
            
            let bgStyle = 'var(--game-tile-bg)';
            let textColor = 'var(--text-main)';
            if (val > 0) {
                const alpha = Math.min(1, 0.25 + (Math.log2(val) * 0.09));
                bgStyle = `rgba(var(--accent-rgb), ${alpha})`;
                if (val >= 8) textColor = 'var(--accent-text)';
            }

            tileNode.className = 'rounded-xl flex items-center justify-center font-bold font-mono text-base sm:text-lg transition-all duration-150 shadow-sm';
            tileNode.style.backgroundColor = bgStyle;
            tileNode.style.color = textColor;
            tileNode.textContent = val > 0 ? val : '';

            boardEl.appendChild(tileNode);
        }
    }
}

function move2048(direction) {
    if (activeGame !== '2048') return;
    let moved = false;

    const transpose = (m) => m[0].map((_, colIndex) => m.map(row => row[colIndex]));
    const reverseRows = (m) => m.map(row => [...row].reverse());

    let tempBoard = JSON.parse(JSON.stringify(board2048));

    if (direction === 'LEFT') {
        moved = slideLeft();
    } else if (direction === 'RIGHT') {
        board2048 = reverseRows(board2048);
        moved = slideLeft();
        board2048 = reverseRows(board2048);
    } else if (direction === 'UP') {
        board2048 = transpose(board2048);
        moved = slideLeft();
        board2048 = transpose(board2048);
    } else if (direction === 'DOWN') {
        board2048 = transpose(board2048);
        board2048 = reverseRows(board2048);
        moved = slideLeft();
        board2048 = reverseRows(board2048);
        board2048 = transpose(board2048);
    }

    if (moved) {
        spawn2048Tile();
        render2048Board();
        if (score2048 > highScore2048) {
            highScore2048 = score2048;
            localStorage.setItem('2048_high_score', highScore2048);
        }
        update2048ScoreUI();
    }
}

function slideLeft() {
    let hasMoved = false;
    for (let r = 0; r < 4; r++) {
        let row = board2048[r].filter(val => val !== 0);
        for (let c = 0; c < row.length - 1; c++) {
            if (row[c] === row[c + 1]) {
                row[c] *= 2;
                score2048 += row[c];
                row[c + 1] = 0;
                hasMoved = true;
            }
        }
        row = row.filter(val => val !== 0);
        while (row.length < 4) row.push(0);

        for (let c = 0; c < 4; c++) {
            if (board2048[r][c] !== row[c]) hasMoved = true;
            board2048[r][c] = row[c];
        }
    }
    return hasMoved;
}

function update2048ScoreUI() {
    const sScore = document.getElementById('game-score-display');
    const sBest = document.getElementById('game-best-display');
    if (sScore) sScore.textContent = `SCORE: ${score2048}`;
    if (sBest) sBest.textContent = `BEST: ${highScore2048}`;
}

/* ====================================================================
   GLOBAL & ELEMENT EVENT LISTENERS FOR MINI GAMES
   ==================================================================== */
document.addEventListener('keydown', (e) => {
    if (activeGame === 'snake') {
        handleSnakeKeydown(e);
    } else if (activeGame === '2048') {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
            e.preventDefault();
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') move2048('LEFT');
            if (k === 'arrowright' || k === 'd') move2048('RIGHT');
            if (k === 'arrowup' || k === 'w') move2048('UP');
            if (k === 'arrowdown' || k === 's') move2048('DOWN');
        }
    }
});

// Touch & Mouse Pointer Swipe Support for 2048 and Snake
let touchStartX = 0, touchStartY = 0;
let isPointerDown = false;

function initMiniGamesGestures() {
    const board2048 = document.getElementById('2048-board');
    if (!board2048) return;

    // Prevent default scroll when dragging/swiping on 2048 board
    board2048.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    board2048.addEventListener('touchmove', (e) => {
        if (activeGame === '2048') {
            e.preventDefault(); // Prevent page scroll during 2048 swipe
        }
    }, { passive: false });

    board2048.addEventListener('touchend', (e) => {
        if (activeGame !== '2048' || !touchStartX || !touchStartY) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        processSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });

    // Pointer / Mouse Drag Swipe for 2048
    board2048.addEventListener('pointerdown', (e) => {
        if (activeGame !== '2048') return;
        isPointerDown = true;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
    });

    board2048.addEventListener('pointerup', (e) => {
        if (activeGame !== '2048' || !isPointerDown) return;
        isPointerDown = false;
        processSwipeGesture(touchStartX, touchStartY, e.clientX, e.clientY);
        touchStartX = 0;
        touchStartY = 0;
    });

    board2048.addEventListener('pointerleave', () => {
        isPointerDown = false;
    });
}

function processSwipeGesture(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const minThreshold = 25; // Ignore tiny accidental taps

    if (Math.abs(dx) > minThreshold || Math.abs(dy) > minThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
            const dir = dx > 0 ? 'RIGHT' : 'LEFT';
            if (activeGame === '2048') move2048(dir);
            if (activeGame === 'snake') handleSnakeTouchDir(dir);
        } else {
            const dir = dy > 0 ? 'DOWN' : 'UP';
            if (activeGame === '2048') move2048(dir);
            if (activeGame === 'snake') handleSnakeTouchDir(dir);
        }
    }
}

// Global Touch Fallback
document.addEventListener('touchstart', (e) => {
    if (!activeGame) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!activeGame || !touchStartX || !touchStartY) return;
    // Only handle fallback if not already handled by board listener
    if (e.target.closest('#2048-board')) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    processSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
    initMiniGamesGestures();
});

