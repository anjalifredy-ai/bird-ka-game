document.addEventListener("DOMContentLoaded", () => {
    
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let frames = 0;
    
    // --- DIRECT ONLINE SOUNDS & BGM ---
    let soundEnabled = true;
    let bgmUnlocked = false; // Browser block hatane ke liye lock

    const sounds = {
        // Classic Tetris Theme for Main Menu (Mast BGM)
        menuMusic: new Audio('https://ia800504.us.archive.org/33/items/TetrisThemeMusic/Tetris.mp3'),
        // Super Mario Theme for Gameplay (Energetic BGM)
        gameMusic: new Audio('https://ia600903.us.archive.org/25/items/tvtunes_28124/Super%20Mario%20Bros.%20-%20Overworld%20Theme.mp3'),
        // Sound Effects
        flap: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/wing.wav'),
        coin: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/point.wav'),
        score: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/swooshing.wav'),
        crash: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/hit.wav')
    };

    // BGM ko loop par set karna taaki khatam na ho
    sounds.menuMusic.loop = true;
    sounds.gameMusic.loop = true;

    // Volume level (BGM thoda halka rakha hai taaki sound effects sunai dein)
    sounds.menuMusic.volume = 0.3;
    sounds.gameMusic.volume = 0.3;
    sounds.flap.volume = 0.6;
    sounds.coin.volume = 0.6;
    sounds.score.volume = 0.6;
    sounds.crash.volume = 0.7;

    // Play Sound Function
    function playSound(type) {
        if (!soundEnabled) return;

        if (type === 'menuMusic') {
            sounds.gameMusic.pause();
            sounds.menuMusic.currentTime = 0;
            sounds.menuMusic.play().catch(e => console.log("BGM blocked:", e));
        } else if (type === 'gameMusic') {
            sounds.menuMusic.pause();
            sounds.gameMusic.currentTime = 0;
            sounds.gameMusic.play().catch(e => console.log("BGM blocked:", e));
        } else if (type === 'stopMusic') {
            sounds.menuMusic.pause();
            sounds.gameMusic.pause();
        } else {
            // Sound Effects
            sounds[type].currentTime = 0;
            sounds[type].play().catch(e => console.log("SFX blocked:", e));
        }
    }

    // --- BROWSER AUTOPLAY FIX ---
    // User jaise hi screen par pehla click karega, Menu Music chalu ho jayega
    document.body.addEventListener('click', () => {
        if (!bgmUnlocked && soundEnabled && state.current === state.MENU) {
            playSound('menuMusic');
            bgmUnlocked = true; // Ek baar unlock ho gaya toh wapas trigger nahi hoga
        }
    });

    // State Management
    const state = { current: 0, MENU: 0, MODE_SELECT: 1, GAME: 2, GAMEOVER: 3 };

    let bestScore = parseInt(localStorage.getItem('birdBestScore')) || 0;
    let totalCoins = parseInt(localStorage.getItem('birdTotalCoins')) || 0;

    let difficulty = { gap: 220, speed: 4 };
    let score = 0, sessionCoins = 0, groundX = 0;

    // Bird Object
    const bird = {
        x: 80, y: 350, vy: 0, radius: 20, gravity: 0.35, jump: -7,
        draw() {
            ctx.font = '40px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(this.x, this.y);
            let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.vy * 0.1)));
            ctx.rotate(rotation);
            ctx.fillText('🐦', 0, 0);
            ctx.restore();
        },
        update() {
            this.vy += this.gravity;
            this.y += this.vy;
            if (this.y + this.radius >= canvas.height - 100) {
                this.y = canvas.height - 100 - this.radius;
                gameOver();
            }
            if (this.y - this.radius <= 0) {
                this.y = this.radius;
                this.vy = 0;
            }
        },
        flap() { 
            this.vy = this.jump; 
            playSound('flap'); 
        },
        reset() { this.y = 350; this.vy = 0; }
    };

    // Pipes Object
    const pipes = {
        list: [],
        draw() {
            for (let i = 0; i < this.list.length; i++) {
                let p = this.list[i];
                let grad = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
                grad.addColorStop(0, '#53a828');
                grad.addColorStop(0.5, '#73d93b');
                grad.addColorStop(1, '#53a828');
                ctx.fillStyle = grad;
                
                ctx.fillRect(p.x, 0, p.w, p.top);
                ctx.strokeRect(p.x, 0, p.w, p.top);
                ctx.fillRect(p.x - 5, p.top - 20, p.w + 10, 20); 
                
                ctx.fillRect(p.x, canvas.height - 100 - p.bottom, p.w, p.bottom);
                ctx.strokeRect(p.x, canvas.height - 100 - p.bottom, p.w, p.bottom);
                ctx.fillRect(p.x - 5, canvas.height - 100 - p.bottom, p.w + 10, 20); 
                
                if (!p.coinCollected) {
                    ctx.font = '30px sans-serif';
                    ctx.fillText('🪙', p.x + p.w/2, p.top + difficulty.gap/2);
                }
            }
        },
        update() {
            if (frames % 100 === 0) {
                let pHeight = canvas.height - 100 - difficulty.gap;
                let topPipe = Math.max(50, Math.random() * (pHeight - 100) + 50);
                this.list.push({
                    x: canvas.width, w: 60, top: topPipe, bottom: pHeight - topPipe,
                    passed: false, coinCollected: Math.random() > 0.5 
                });
            }
            
            for (let i = 0; i < this.list.length; i++) {
                let p = this.list[i];
                p.x -= difficulty.speed;

                let bx = bird.x - 10, by = bird.y - 10, bw = 20, bh = 20;
                
                if (bx + bw > p.x && bx < p.x + p.w && by < p.top) gameOver();
                if (bx + bw > p.x && bx < p.x + p.w && by + bh > canvas.height - 100 - p.bottom) gameOver();

                if (!p.coinCollected) {
                    let cx = p.x + p.w/2, cy = p.top + difficulty.gap/2;
                    if (Math.hypot(bird.x - cx, bird.y - cy) < 40) {
                        p.coinCollected = true; sessionCoins++; totalCoins++;
                        playSound('coin');
                        document.getElementById('coinDisplay').innerText = `🪙 ${sessionCoins}`;
                    }
                }

                if (p.x + p.w < bird.x && !p.passed) {
                    score++; p.passed = true;
                    playSound('score');
                    document.getElementById('scoreDisplay').innerText = score;
                    
                    if (score % 20 === 0) difficulty.speed += 0.5;
                    if (score % 10 === 0) {
                        triggerCelebration();
                        sessionCoins += 5; totalCoins += 5;
                        playSound('coin');
                        document.getElementById('coinDisplay').innerText = `🪙 ${sessionCoins}`;
                    }
                }

                if (p.x + p.w < 0) { this.list.shift(); i--; }
            }
        },
        reset() { this.list = []; }
    };

    function drawBackground() {
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        let cloudX = (frames * 0.5) % (canvas.width + 100);
        ctx.beginPath();
        ctx.arc(canvas.width - cloudX, 150, 30, 0, Math.PI * 2);
        ctx.arc(canvas.width - cloudX + 40, 150, 40, 0, Math.PI * 2);
        ctx.arc(canvas.width - cloudX + 80, 150, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8FBC8F";
        ctx.beginPath(); ctx.moveTo(0, canvas.height - 100); ctx.lineTo(100, canvas.height - 300); ctx.lineTo(250, canvas.height - 100); ctx.fill();
        ctx.fillStyle = "#7CB342";
        ctx.beginPath(); ctx.moveTo(150, canvas.height - 100); ctx.lineTo(300, canvas.height - 250); ctx.lineTo(400, canvas.height - 100); ctx.fill();

        groundX = (groundX - difficulty.speed) % 40;
        ctx.fillStyle = '#D2B48C'; ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
        ctx.fillStyle = '#8B4513'; ctx.fillRect(0, canvas.height - 100, canvas.width, 10);
        
        ctx.fillStyle = '#556B2F';
        for(let i=0; i<15; i++) {
            ctx.beginPath();
            ctx.moveTo(groundX + (i*40), canvas.height - 100);
            ctx.lineTo(groundX + (i*40) + 20, canvas.height - 120);
            ctx.lineTo(groundX + (i*40) + 40, canvas.height - 100); ctx.fill();
        }
    }

    function triggerCelebration() {
        const cel = document.getElementById('celebration');
        cel.style.opacity = 1; setTimeout(() => cel.style.opacity = 0, 1500);
    }

    function loop() {
        if (state.current !== state.GAME) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        pipes.update(); pipes.draw();
        bird.update(); bird.draw();
        frames++;
        requestAnimationFrame(loop);
    }

    // Input Handling
    function handleFlap(e) {
        if (state.current === state.GAME) {
            if(e && e.cancelable) e.preventDefault();
            bird.flap();
        }
    }

    document.addEventListener('touchstart', handleFlap, {passive: false});
    document.addEventListener('mousedown', handleFlap);
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') handleFlap(e); });

    // UI Logic
    function updateMenuStats() {
        document.getElementById('menuBestScore').innerText = bestScore;
        document.getElementById('menuTotalCoins').innerText = totalCoins;
    }

    function gameOver() {
        state.current = state.GAMEOVER;
        playSound('stopMusic'); // BGM band
        playSound('crash'); // Hit sound

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('birdBestScore', bestScore);
        }
        localStorage.setItem('birdTotalCoins', totalCoins);
        
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over').classList.remove('hidden');
        
        document.getElementById('endScore').innerText = score;
        document.getElementById('endBestScore').innerText = bestScore;
        document.getElementById('endCoins').innerText = sessionCoins;
    }

    function startGame(mode) {
        if (mode === 'easy') { difficulty.gap = 260; difficulty.speed = 3; }
        else if (mode === 'normal') { difficulty.gap = 220; difficulty.speed = 5; }
        else if (mode === 'hard') { difficulty.gap = 180; difficulty.speed = 7; }

        bird.reset(); pipes.reset();
        score = 0; sessionCoins = 0; frames = 0;
        
        document.getElementById('scoreDisplay').innerText = score;
        document.getElementById('coinDisplay').innerText = `🪙 ${sessionCoins}`;
        
        document.getElementById('mode-select').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        
        state.current = state.GAME;
        playSound('gameMusic'); // Gameplay BGM Start!
        loop();
    }

    // Button Listeners
    document.getElementById('playBtn').addEventListener('click', () => {
        playSound('score'); 
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('mode-select').classList.remove('hidden');
        state.current = state.MODE_SELECT;
    });

    document.getElementById('soundBtn').addEventListener('click', (e) => {
        e.stopPropagation(); // Yeh zaroori hai taaki background click isko overrule na kare
        soundEnabled = !soundEnabled;
        document.getElementById('soundBtn').innerText = soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        
        if (!soundEnabled) {
            playSound('stopMusic');
        } else {
            if (state.current === state.MENU || state.current === state.MODE_SELECT) {
                playSound('menuMusic');
            } else if (state.current === state.GAME) {
                playSound('gameMusic');
            }
        }
    });

    document.getElementById('easy-card').addEventListener('click', () => startGame('easy'));
    document.getElementById('normal-card').addEventListener('click', () => startGame('normal'));
    document.getElementById('hard-card').addEventListener('click', () => startGame('hard'));

    document.getElementById('restartBtn').addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        let mode = difficulty.gap === 260 ? 'easy' : (difficulty.gap === 180 ? 'hard' : 'normal');
        startGame(mode);
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        state.current = state.MENU;
        updateMenuStats();
        playSound('menuMusic'); // Menu BGM wapas shuru
        
        ctx.clearRect(0,0,canvas.width,canvas.height);
        drawBackground();
    });

    // Init
    updateMenuStats(); drawBackground(); 
});
