document.addEventListener("DOMContentLoaded", () => {
    
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let frames = 0;
    
    // --- BGM FIX: Ek single BGM jo hamesha bajega ---
    let soundEnabled = true;

    const sounds = {
        bgm: new Audio('https://ia600903.us.archive.org/25/items/tvtunes_28124/Super%20Mario%20Bros.%20-%20Overworld%20Theme.mp3'),
        flap: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/wing.wav'),
        coin: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/point.wav'),
        score: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/swooshing.wav'),
        crash: new Audio('https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/audio/hit.wav')
    };

    sounds.bgm.loop = true;
    sounds.bgm.volume = 0.25; // Background music halka rakha hai taaki game sounds saaf sunayi dein

    // Play Sound Functions
    function playBGM() {
        if (soundEnabled) {
            sounds.bgm.play().catch(e => console.log("BGM start waiting for click"));
        }
    }

    function playSFX(type) {
        if (!soundEnabled) return;
        sounds[type].currentTime = 0;
        sounds[type].play();
    }

    // --- AUTOPLAY FIX ---
    // Pehle click par music shuru aur hamesha bajega
    window.addEventListener('click', () => {
        if (sounds.bgm.paused) {
            playBGM();
        }
    }, { once: true });

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
            playSFX('flap'); 
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
                ctx.fillRect(p.x, canvas.height - 100 - p.bottom, p.w, p.bottom);
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
                this.list.push({ x: canvas.width, w: 60, top: topPipe, bottom: pHeight - topPipe, passed: false, coinCollected: Math.random() > 0.5 });
            }
            for (let i = 0; i < this.list.length; i++) {
                let p = this.list[i];
                p.x -= difficulty.speed;
                // Collision
                if (bird.x + 10 > p.x && bird.x - 10 < p.x + p.w && (bird.y - 10 < p.top || bird.y + 10 > canvas.height - 100 - p.bottom)) gameOver();
                // Coin
                if (!p.coinCollected && bird.x > p.x && bird.x < p.x + p.w) {
                    p.coinCollected = true; sessionCoins++; totalCoins++;
                    playSFX('coin');
                    document.getElementById('coinDisplay').innerText = `🪙 ${sessionCoins}`;
                }
                // Score
                if (p.x + p.w < bird.x && !p.passed) {
                    score++; p.passed = true;
                    playSFX('score');
                    document.getElementById('scoreDisplay').innerText = score;
                }
                if (p.x + p.w < 0) { this.list.shift(); i--; }
            }
        },
        reset() { this.list = []; }
    };

    function drawBackground() {
        ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#D2B48C'; ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
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

    function gameOver() {
        state.current = state.GAMEOVER;
        playSFX('crash');
        // Music chalte rahega, band nahi hoga
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over').classList.remove('hidden');
    }

    function startGame(mode) {
        if (mode === 'easy') { difficulty.gap = 260; difficulty.speed = 3; }
        else if (mode === 'normal') { difficulty.gap = 220; difficulty.speed = 5; }
        else if (mode === 'hard') { difficulty.gap = 180; difficulty.speed = 7; }
        bird.reset(); pipes.reset();
        score = 0; sessionCoins = 0; frames = 0;
        state.current = state.GAME;
        loop();
    }

    // Buttons
    document.getElementById('playBtn').addEventListener('click', () => {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('mode-select').classList.remove('hidden');
    });

    document.getElementById('soundBtn').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        sounds.bgm.muted = !soundEnabled;
        document.getElementById('soundBtn').innerText = soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
    });

    document.getElementById('easy-card').addEventListener('click', () => startGame('easy'));
    document.getElementById('normal-card').addEventListener('click', () => startGame('normal'));
    document.getElementById('hard-card').addEventListener('click', () => startGame('hard'));

    document.getElementById('restartBtn').addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        startGame('normal');
    });

    document.getElementById('homeBtn').addEventListener('click', () => {
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    });

    document.addEventListener('mousedown', () => { if(state.current === state.GAME) bird.flap(); });
});
