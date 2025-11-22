

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("game-container");
const scoreList = document.getElementById("scoreList");

// UI Elements
const scoreSpan = document.getElementById("scoreDisplay");
const livesSpan = document.getElementById("livesDisplay");
const cooldownSpan = document.getElementById("cooldownDisplay");
const shieldSpan = document.getElementById("shieldDisplay");

// --- IMAGES ---
const catImg = new Image(); catImg.src = 'images/cat.png'; 
const carImg = new Image(); carImg.src = 'images/car.png';
const fishImg = new Image(); fishImg.src = 'images/fish.png';
const meteorImg = new Image(); meteorImg.src = 'images/meteor.png';

// --- SOUNDS ---
const jumpSound = new Audio('sounds/jump.wav');
const shootSound = new Audio('sounds/laserShoot.wav');
const explosionSound = new Audio('sounds/explosion.wav');
const hitSound = new Audio('sounds/hitHurt.wav');
const fishSound = new Audio('sounds/meow.mp3');
const bgMusic = new Audio('sounds/music.mp3');
const powerupSound = new Audio('sounds/rampage.mp3'); 
const gameOverSound = new Audio('sounds/gameover.mp3');

bgMusic.loop = true; 
bgMusic.volume = 0.4; 

// --- GAME STATE ---
let gameStarted = false;
let isGameOver = false;
let score = 0;
let lives = 9;

// SPEED SETTINGS
let startSpeed = 3;     
let calculatedSpeed = 3; 
let gameSpeed = 3;      
let isSlowMotion = false; 

let bullets = []; 
let particles = []; 
let fishes = []; 
let fishTimer = 0;
let roadStripes = 0;

// COOLDOWN & SHIELD
let lastShotTime = 0;
const COOLDOWN_DURATION = 2000;
let shieldActive = false;
let shieldEndTime = 0;
let fishesForShield = 0;
const SHIELD_DURATION = 5000; 

// Load High Scores
let highScores = JSON.parse(localStorage.getItem('catHighScores')) || [0, 0, 0];
updateLeaderboardUI();

// --- OBJECTS ---
const cat = { 
    x: 50, y: 150, width: 32, height: 32, 
    dy: 0, 
    jumpPower: -11, 
    gravity: 0.5,   
    grounded: false 
};

let car = { 
    x: 800, y: 160, width: 50, height: 30, 
    color: "#ff0055" 
};

let meteor = {
    x: canvas.width + 500,
    y: -100,
    width: 40, height: 40,
    speedX: 10, speedY: 2,
    active: false 
};

// --- HELPERS ---
function checkHighScore(finalScore) {
    highScores.push(finalScore); highScores.sort((a, b) => b - a); highScores = highScores.slice(0, 3);
    localStorage.setItem('catHighScores', JSON.stringify(highScores)); updateLeaderboardUI();
}
function updateLeaderboardUI() { scoreList.innerHTML = highScores.map(s => `<li>${s} Fishes</li>`).join(''); }

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({ x: x, y: y, size: Math.random() * 5 + 2, dx: (Math.random() - 0.5) * 10, dy: (Math.random() - 0.5) * 10, life: 30, color: color });
    }
}
function shakeScreen() { 
    gameContainer.classList.add("shake"); setTimeout(() => { gameContainer.classList.remove("shake"); }, 500); 
}

// --- CONTROLS ---
function handleInput() {
    if (!gameStarted) { 
        gameStarted = true; 
        bgMusic.play().catch(() => {});
        return; 
    }
    if (isGameOver) { location.reload(); return; }
    if (cat.grounded) { 
        cat.dy = cat.jumpPower; cat.grounded = false; 
        jumpSound.currentTime = 0; jumpSound.play().catch(() => {}); 
    }
}
function shoot() {
    if (!gameStarted || isGameOver) return;
    const currentTime = Date.now();
    if (currentTime - lastShotTime >= COOLDOWN_DURATION) {
        bullets.push({ x: cat.x + cat.width, y: cat.y + 15, width: 8, height: 8, speed: gameSpeed + 10, color: "#ffffff" }); 
        shootSound.currentTime = 0; shootSound.play().catch(() => {}); lastShotTime = currentTime;
    }
}

// KEYBOARD
document.addEventListener("keydown", function(e) { if (e.code === "Space") handleInput(); if (e.code === "KeyF") shoot(); });

// MOUSE & TOUCH
const jumpBtn = document.getElementById("jumpBtn");
const shootBtn = document.getElementById("shootBtn");

function addInteraction(element, action) {
    element.addEventListener("touchstart", (e) => { e.preventDefault(); action(); });
    element.addEventListener("mousedown", (e) => { e.preventDefault(); action(); });
}
addInteraction(jumpBtn, handleInput);
addInteraction(shootBtn, shoot);


// --- GAME LOOP ---
function update() {
    requestAnimationFrame(update);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
        ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.font = "20px 'Press Start 2P'"; ctx.fillText("PRESS SPACE TO START", canvas.width/2, canvas.height/2);
        ctx.font = "10px 'Press Start 2P'"; ctx.fillText("Dodge Meteors | Collect Fish", canvas.width/2, canvas.height/2 + 30);
        ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#ffaa00"; ctx.drawImage(catImg, 50, 150, 32, 32); ctx.restore();
        return;
    }

    if (isGameOver) {
        bgMusic.pause(); // Stop music
        ctx.fillStyle = "red"; ctx.textAlign = "center"; ctx.font = "40px 'Press Start 2P'"; ctx.fillText("GAME OVER", canvas.width/2, 80);
        ctx.fillStyle = "white"; ctx.font = "15px 'Press Start 2P'"; ctx.fillText("Press SPACE to Restart", canvas.width/2, 120);
        return;
    }

    const currentTime = Date.now();

    // SPEED LOGIC
    calculatedSpeed = startSpeed + Math.floor(score / 5);

    if (shieldActive) {
        gameSpeed = calculatedSpeed + 8; 
        isSlowMotion = false; 
    } 
    else if (
        meteor.active && 
        car.x < 250 && car.x > 0 && 
        meteor.x < 250 && meteor.x > 0
    ) {
        gameSpeed = calculatedSpeed * 0.3; // Matrix Slow-Mo
        isSlowMotion = true;
    } 
    else {
        gameSpeed = calculatedSpeed;
        isSlowMotion = false;
    }

    // ROAD
    roadStripes -= gameSpeed; if (roadStripes < -40) roadStripes = 0;
    ctx.fillStyle = "#555"; for(let i = 0; i < canvas.width/40 + 1; i++) { ctx.fillRect(roadStripes + (i*80), 180, 40, 5); }

    // UI
    const timePassed = currentTime - lastShotTime;
    if (timePassed >= COOLDOWN_DURATION) { cooldownSpan.innerText = "READY"; cooldownSpan.style.color = "#00ff00"; }
    else { cooldownSpan.innerText = ((COOLDOWN_DURATION - timePassed) / 1000).toFixed(1) + "s"; cooldownSpan.style.color = "red"; }

    if (shieldActive) {
        if (currentTime > shieldEndTime) { shieldActive = false; fishesForShield = 0; }
        else { shieldSpan.innerText = `ACTIVE ${((shieldEndTime - currentTime) / 1000).toFixed(1)}s`; shieldSpan.style.color = "#0088ff"; }
    } else { shieldSpan.innerText = `${fishesForShield}/10`; shieldSpan.style.color = "gray"; }

    // FISH
    fishTimer++;
    if (fishTimer > (1200 / gameSpeed) + Math.random() * 100) { 
        fishes.push({ x: canvas.width, y: Math.random() < 0.5 ? 150 : 90, width: 20, height: 20 }); 
        fishTimer = 0; 
    }

    for (let i = fishes.length - 1; i >= 0; i--) {
        let f = fishes[i]; f.x -= gameSpeed;
        ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#00ffff"; ctx.drawImage(fishImg, f.x, f.y, f.width, f.height); ctx.restore();

        if (cat.x < f.x + f.width && cat.x + cat.width > f.x && cat.y < f.y + f.height && cat.y + cat.height > f.y) {
            score++; 
            scoreSpan.innerText = score; 
            fishSound.currentTime = 0; fishSound.play().catch(() => {});

            if (score === 10 || score === 30) {
                powerupSound.currentTime = 0; powerupSound.play().catch(() => {});
            }

            if (!shieldActive) { fishesForShield++; if (fishesForShield >= 10) { shieldActive = true; shieldEndTime = Date.now() + SHIELD_DURATION; }}
            fishes.splice(i, 1); 
        } else if (f.x < -50) fishes.splice(i, 1);
    }

    // PHYSICS
    cat.dy += cat.gravity; cat.y += cat.dy; 
    if (cat.y > 168) { cat.y = 168; cat.dy = 0; cat.grounded = true; }

    // ENEMIES
    car.x -= gameSpeed;
    if (car.x < -50) { car.x = canvas.width + Math.random() * 300; }

    // METEOR
    if (meteor.active) {
        meteor.x -= (gameSpeed + 2); 
        meteor.y += meteor.speedY;   
        if (meteor.x < -50 || meteor.y > 200) { meteor.active = false; }
    } else {
        if (score >= 15) {
            if (Math.random() < 0.005) { 
                meteor.active = true;
                meteor.x = canvas.width;
                meteor.y = -50; 
            }
        }
    }

    // BULLETS
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i]; b.x += b.speed;
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "white"; ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.width, b.height); ctx.restore();
        
        if (b.x < car.x + car.width && b.x + b.width > car.x && b.y < car.y + car.height && b.y + b.height > car.y) {
            createParticles(car.x + 25, car.y + 15, car.color); explosionSound.currentTime = 0; explosionSound.play().catch(() => {});
            car.x = canvas.width + Math.random() * 200; bullets.splice(i, 1);
        } 
        else if (meteor.active && b.x < meteor.x + meteor.width && b.x + b.width > meteor.x && b.y < meteor.y + meteor.height && b.y + b.height > meteor.y) {
            createParticles(meteor.x + 15, meteor.y + 15, "#ffaa00"); explosionSound.currentTime = 0; explosionSound.play().catch(() => {});
            meteor.active = false; bullets.splice(i, 1);
        }
        else if (b.x > canvas.width) bullets.splice(i, 1);
    }

    // PARTICLES
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.dx; p.y += p.dy; p.life--;
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.life <= 0) particles.splice(i, 1);
    }

    // COLLISIONS
    function takeDamage() {
        if (shieldActive) return true;
        lives--; livesSpan.innerText = lives; shakeScreen(); hitSound.currentTime = 0; hitSound.play().catch(() => {});
        
        if (lives <= 0) { 
            isGameOver = true; 
            checkHighScore(score);
            // --- PLAY GAME OVER SOUND ---
            gameOverSound.play().catch(() => {});
        }
        return false;
    }

    if (cat.x < car.x + car.width && cat.x + cat.width > car.x && cat.y < car.y + car.height && cat.y + cat.height > car.y) {
        if (takeDamage()) { createParticles(car.x, car.y, "#ffffff"); car.x = canvas.width; } else { car.x = canvas.width; }
    }

    if (meteor.active && cat.x < meteor.x + meteor.width && cat.x + cat.width > meteor.x && cat.y < meteor.y + meteor.height && cat.y + cat.height > meteor.y) {
        if (takeDamage()) { createParticles(meteor.x, meteor.y, "#ffaa00"); meteor.active = false; } else { meteor.active = false; }
    }

    // DRAW
    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = shieldActive ? "#0088ff" : "#ffaa00"; 
    ctx.drawImage(catImg, cat.x, cat.y, cat.width, cat.height); ctx.restore();
    
    if (shieldActive) { 
        ctx.beginPath(); ctx.strokeStyle = "#0088ff"; ctx.lineWidth = 3; 
        ctx.arc(cat.x + cat.width/2, cat.y + cat.height/2, 35, 0, Math.PI * 2); ctx.stroke(); 
    }

    ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = "#ff0055"; ctx.drawImage(carImg, car.x, car.y, car.width, car.height); ctx.restore();

    if (meteor.active) {
        ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#ffaa00"; ctx.drawImage(meteorImg, meteor.x, meteor.y, meteor.width, meteor.height); ctx.restore();
    }

    // MATRIX VISUAL
    if (isSlowMotion) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

update();
