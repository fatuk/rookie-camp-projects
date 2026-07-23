let coins = 0;
let points = 0;
let lives = 5;
let level = 1;
let isGameOver = false;
let isVictory = false;

let cannonX = window.innerWidth / 2; // Initial position of the cannon
const fallingCoins = []; // Stores falling physical coins
const keysPressed = {}; // Stores key states

// --- UPGRADE VARIABLES ---
let reloadLvl = 0;
const maxReloadLvl = 5;
let reloadCost = 150;
let reloadTime = 1000; // Base reload time (ms)

let lifeCost = 100;

let hasTripleShot = false;
let tripleCost = 800;

let hasShield = false;
let isShieldActive = false;
let shieldCost = 500;
let shieldRechargeTimer = null;

let spoilsLvl = 0;
const maxSpoilsLvl = 3;
let spoilsCost = 250;
let spoilsMultiplier = 1.0;

// Elite items
let hasNuke = false;
let nukeReady = true;
let nukeCost = 3000;
let nukeCooldownTimer = null;

let hasRailgun = false;
let railgunCost = 2000;

const pointsValueEl = document.getElementById('points-value');
const coinsValueEl = document.getElementById('coins-value');
const livesValueEl = document.getElementById('lives-value');
const levelValueEl = document.getElementById('level-value');

// Рисуем абсолютно плоское пиксельное сердце 8x8 чистым красным цветом #FF0000
const heartSVG = `<svg class="pixel-heart" viewBox="0 0 8 8"><path d="M1,1 h2 v1 h-2 z M5,1 h2 v1 h-2 z M0,2 h8 v1 h-8 z M0,3 h8 v1 h-8 z M1,4 h6 v1 h-6 z M2,5 h4 v1 h-4 z M3,6 h2 v1 h-2 z" fill="#FF0000" /></svg>`;

function updateLivesDisplay() {
    livesValueEl.innerHTML = heartSVG.repeat(Math.max(0, lives));
}
updateLivesDisplay(); // Инициализируем при старте
const nextLevelReqEl = document.getElementById('next-level-req');
const gameOverScreen = document.getElementById('game-over-screen');
const victoryScreen = document.getElementById('victory-screen');
const resetBtn = document.getElementById('reset-btn');

// Shop elements
const reloadLvlEl = document.getElementById('reload-lvl');
const reloadCostEl = document.getElementById('reload-cost');
const lifeCostEl = document.getElementById('life-cost');
const tripleCostEl = document.getElementById('triple-cost');

const buyReloadBtn = document.getElementById('buy-reload-btn');
const buyLifeBtn = document.getElementById('buy-life-btn');
const buyTripleBtn = document.getElementById('buy-triple-btn');

const buyShieldBtn = document.getElementById('buy-shield-btn');
const buySpoilsBtn = document.getElementById('buy-spoils-btn');
const spoilsLvlEl = document.getElementById('spoils-lvl');
const spoilsCostEl = document.getElementById('spoils-cost');
const shieldCostEl = document.getElementById('shield-cost');
const shieldBubble = document.getElementById('shield-bubble');

// Elite shop elements
const buyNukeBtn = document.getElementById('buy-nuke-btn');
const buyRailgunBtn = document.getElementById('buy-railgun-btn');
const nukeFlashScreen = document.getElementById('nuke-flash-screen');

// --- TARGET DATABASE ---
const squares = [
    { el: document.getElementById('square-1'), x: 0, yOffset: 0, baseY: 50, speed: 280,  size: 65, reward: 10, shootTimer: 1.5, type: 'sin', t: 0 },
    { el: document.getElementById('square-2'), x: 0, yOffset: 0, baseY: 110, speed: 420,  size: 65, reward: 20, shootTimer: 2.2, type: 'cos', t: 0 },
    { el: document.getElementById('square-3'), x: 0, yOffset: 0, baseY: 170, speed: 580,  size: 65, reward: 50, shootTimer: 0.8, type: 'evade', t: 0 }
];

const enemyBullets = [];
const baseEnemyBulletSpeed = 350;

const bombs = [
    { el: document.getElementById('bomb-1'), x: -100, yOffset: 0, baseY: 240, speed: 180, size: 100, isActive: false, shootTimer: 1.0 }
];
bombs[0].el.style.display = 'none';

let bombTimer = 0; 
let lastTime = 0;

function gameLoop(timestamp) {
    if (isGameOver || isVictory) {
        lastTime = 0;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!lastTime) {
        lastTime = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    updateCannon(dt); 
    updateTargets(dt);
    updateBullets(dt);
    updateEnemyBullets(dt); 
    updateCoins(dt); 
    updateShopButtons(); 

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// --- LEVEL PROGRESSION ---
function checkLevelProgress() {
    let newLevel = 1;
    let nextReqText = "";

    if (points >= 1500) {
        newLevel = 5;
        nextReqText = "VICTORY!";
        triggerVictory();
    } else if (points >= 1000) {
        newLevel = 5;
        nextReqText = `To Victory: ${1500 - points} pts`;
    } else if (points >= 650) {
        newLevel = 4;
        nextReqText = `To Lvl 5: ${1000 - points} pts`;
    } else if (points >= 350) {
        newLevel = 3;
        nextReqText = `To Lvl 4: ${650 - points} pts`;
    } else if (points >= 150) {
        newLevel = 2;
        nextReqText = `To Lvl 3: ${350 - points} pts`;
    } else {
        newLevel = 1;
        nextReqText = `To Lvl 2: ${150 - points} pts`;
    }

    if (nextLevelReqEl) {
        nextLevelReqEl.innerText = nextReqText;
    }

    if (newLevel !== level) {
        level = newLevel;
        levelValueEl.innerText = level;
        levelValueEl.style.textShadow = "0 0 25px #e040fb";
        setTimeout(() => { levelValueEl.style.textShadow = "0 0 10px rgba(224,64,251,0.5)"; }, 500);
    }
}

function updateTargets(dt) {
    const speedMultiplier = 1 + (level - 1) * 0.25; 
    const enemyShootCooldownFactor = 1 + (level - 1) * 0.25; 

    squares.forEach(sq => {
        const rightWall = window.innerWidth - sq.size;
        sq.x += sq.speed * speedMultiplier * dt;
        
        if (sq.x >= rightWall) { 
            sq.x = rightWall; 
            sq.speed = -Math.abs(sq.speed); 
        } else if (sq.x <= 0) { 
            sq.x = 0; 
            sq.speed = Math.abs(sq.speed); 
        }
        
        if (sq.t === undefined) sq.t = 0;
        sq.t += dt;
        
        if (sq.type === 'sin') {
            sq.yOffset = Math.sin(sq.t * 1.5) * 90; 
        } else if (sq.type === 'cos') {
            sq.yOffset = Math.cos(sq.t * 2.2) * 130; 
        } else if (sq.type === 'evade') {
            sq.yOffset = Math.sin(sq.t * 2.0) * Math.cos(sq.t * 0.8) * 180;
        }

        const dir = sq.speed > 0 ? 1 : -1;
        sq.el.style.transform = `translate(${sq.x}px, ${sq.yOffset}px) scaleX(${dir})`;

        sq.shootTimer -= dt;
        if (sq.shootTimer <= 0) {
            spawnEnemyBullet(sq.x + sq.size / 2, sq.baseY + sq.yOffset + sq.size);
            sq.shootTimer = (Math.random() * 3 + 1.5) / enemyShootCooldownFactor;
        }
    });

    bombs.forEach(bomb => {
        if (!bomb.isActive) {
            bombTimer += dt;
            const spawnDelay = Math.max(2, 5 - (level - 1));
            if (bombTimer >= spawnDelay) {
                bombTimer = 0;
                bomb.isActive = true;
                bomb.x = -bomb.size; 
                bomb.yOffset = 0;
                bomb.el.style.display = 'flex';
            }
        } else {
            bomb.x += bomb.speed * speedMultiplier * dt;
            
            bomb.yOffset = Math.sin(Date.now() * 0.002) * 40;
            bomb.el.style.transform = `translate(${bomb.x}px, ${bomb.yOffset}px)`;

            bomb.shootTimer -= dt;
            if (bomb.shootTimer <= 0) {
                spawnEnemyBullet(bomb.x + bomb.size / 2, bomb.baseY + bomb.yOffset + bomb.size);
                bomb.shootTimer = (Math.random() * 1.5 + 0.5) / enemyShootCooldownFactor;
            }

            if (bomb.x > window.innerWidth) {
                bomb.isActive = false;
                bomb.el.style.display = 'none';
                bombTimer = 0; 
            }
        }
    });
}

// --- CANNON CONTROLS ---
const cannon = document.getElementById('cannon');
const barrel = document.getElementById('barrel');
let currentAngle = 0;

document.addEventListener('mousemove', (event) => {
    if (isGameOver) return;

    const cannonRect = cannon.getBoundingClientRect();
    const pivotX = cannonRect.left + (cannonRect.width / 2);
    const pivotY = cannonRect.bottom - 20;

    const dx = event.clientX - pivotX;
    const dy = event.clientY - pivotY;

    currentAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (currentAngle > 85) currentAngle = 85;
    if (currentAngle < -85) currentAngle = -85;

    barrel.style.transform = `rotate(${currentAngle}deg)`;
});

// --- FIRING ---
const bullets = [];
const bulletSpeed = 2500; 
let lastShotTime = 0;

const shopPanel = document.getElementById('shop-panel');
const shopHint = document.getElementById('shop-hint');

function toggleShop() {
    shopPanel.classList.toggle('shop-hidden');
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

if (shopHint) {
    shopHint.addEventListener('click', toggleShop);
}

const closeShopBtn = document.getElementById('close-shop-btn');
if (closeShopBtn) {
    closeShopBtn.addEventListener('click', toggleShop);
}

document.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
    }

    keysPressed[event.code] = true; 
    keysPressed[event.key] = true;  

    // Toggle shop with R (handles both English and Russian layout)
    if (event.code === 'KeyR' || event.key.toLowerCase() === 'r' || event.key.toLowerCase() === 'к') {
        toggleShop();
    }

    // Nuke detonation with Q (handles both layouts)
    if (event.code === 'KeyQ' || event.key.toLowerCase() === 'q' || event.key.toLowerCase() === 'й') {
        if (hasNuke && nukeReady && !isGameOver && !isVictory) {
            triggerNuke();
        }
    }

    if (isGameOver) return;

    if (event.code === 'Space') {
        const currentTime = Date.now();
        if (currentTime - lastShotTime >= reloadTime) {
            shoot();
            lastShotTime = currentTime;
        }
    }
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.code] = false;
    keysPressed[event.key] = false;
});

function shoot() {
    const cannonRect = cannon.getBoundingClientRect();
    const startX = cannonRect.left + (cannonRect.width / 2);
    const startY = cannonRect.bottom - 60; 

    const anglesToShoot = [currentAngle];
    if (hasTripleShot) {
        anglesToShoot.push(currentAngle - 15); 
        anglesToShoot.push(currentAngle + 15); 
    }

    anglesToShoot.forEach(angle => {
        const bulletEl = document.createElement('div');
        bulletEl.className = 'bullet';
        document.body.appendChild(bulletEl);

        const angleRad = (angle - 90) * (Math.PI / 180); 

        bullets.push({
            el: bulletEl, x: startX, y: startY,
            vx: Math.cos(angleRad) * bulletSpeed,
            vy: Math.sin(angleRad) * bulletSpeed,
            hitTargets: [] 
        });
    });
}

// --- PROJECTILE & COLLISION LOGIC ---
function updateBullets(dt) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        b.el.style.left = b.x + 'px';
        b.el.style.top = b.y + 'px';

        let hit = false;

        for (let j = 0; j < squares.length; j++) {
            const sq = squares[j];
            const sqY = sq.baseY + sq.yOffset; 

            if (b.x < sq.x + sq.size && b.x + 10 > sq.x && b.y < sqY + sq.size && b.y + 10 > sqY) {
                const targetId = 'sq-' + j;
                if (!b.hitTargets.includes(targetId)) {
                    b.hitTargets.push(targetId);
                    
                    const earnedPoints = Math.round(sq.reward * spoilsMultiplier);
                    points += earnedPoints;
                    pointsValueEl.innerText = points;

                    coins += earnedPoints;
                    coinsValueEl.innerText = coins;

                    checkLevelProgress(); 
                    
                    const explosionX = sq.x + sq.size / 2;
                    const explosionY = sqY + sq.size / 2;
                    
                    createExplosion(explosionX, explosionY);
                    respawnTarget(sq);

                    if (Math.random() < 0.5) {
                        spawnCoin(explosionX, explosionY, earnedPoints);
                    }

                    if (!hasRailgun) {
                        hit = true;
                        break; 
                    }
                }
            }
        }

        if (!hit) {
            for (let j = 0; j < bombs.length; j++) {
                const bomb = bombs[j];
                if (!bomb.isActive) continue; 

                const bombY = bomb.baseY + bomb.yOffset; 

                if (b.x < bomb.x + bomb.size && b.x + 10 > bomb.x && b.y < bombY + bomb.size && b.y + 10 > bombY) {
                    const targetId = 'bomb-' + j;
                    if (!b.hitTargets.includes(targetId)) {
                        b.hitTargets.push(targetId);

                        lives--;
                        updateLivesDisplay();
                        triggerScreenShake();

                        bomb.el.style.backgroundColor = 'red';
                        setTimeout(() => { bomb.el.style.backgroundColor = '#111'; }, 200);

                        createExplosion(bomb.x + bomb.size / 2, bombY + bomb.size / 2);
                        respawnTarget(bomb);

                        if (lives <= 0) {
                            triggerGameOver();
                        }

                        if (!hasRailgun) {
                            hit = true;
                            break; 
                        }
                    }
                }
            }
        }

        if (hit || b.x < 0 || b.x > screenWidth || b.y < 0 || b.y > screenHeight) {
            b.el.remove();
            bullets.splice(i, 1);
        }
    }
}

// --- ENEMY BULLETS ---
function spawnEnemyBullet(startX, startY) {
    if (isGameOver) return;
    const bEl = document.createElement('div');
    bEl.className = 'enemy-bullet';
    bEl.style.left = startX + 'px';
    bEl.style.top = startY + 'px';
    document.body.appendChild(bEl);

    const currentEnemyBulletSpeed = baseEnemyBulletSpeed * (1 + (level - 1) * 0.15);

    enemyBullets.push({
        el: bEl,
        x: startX,
        y: startY,
        vy: currentEnemyBulletSpeed
    });
}

// --- CANNON MOVEMENT ---
function updateCannon(dt) {
    const speed = 650; 
    const halfWidth = 40; 

    // Support both WASD and Arrow controls
    const leftPressed = keysPressed['ArrowLeft'] || keysPressed['KeyA'] || keysPressed['a'] || keysPressed['A'] || keysPressed['ф'] || keysPressed['Ф'];
    const rightPressed = keysPressed['ArrowRight'] || keysPressed['KeyD'] || keysPressed['d'] || keysPressed['D'] || keysPressed['в'] || keysPressed['В'];

    if (leftPressed) {
        cannonX -= speed * dt;
    }
    if (rightPressed) {
        cannonX += speed * dt;
    }

    if (cannonX < halfWidth) {
        cannonX = halfWidth;
    }
    if (cannonX > window.innerWidth - halfWidth) {
        cannonX = window.innerWidth - halfWidth;
    }

    cannon.style.left = (cannonX - halfWidth) + 'px';
}

function updateEnemyBullets(dt) {
    const screenHeight = window.innerHeight;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        eb.y += eb.vy * dt;
        eb.el.style.top = eb.y + 'px';

        let hitPlayer = false;

        const cannonLeft = cannonX - 40;
        const cannonRight = cannonX + 40;
        const cannonTop = screenHeight - 80;

        if (eb.x + 8 > cannonLeft && eb.x < cannonRight && eb.y + 22 > cannonTop && eb.y < screenHeight) {
            hitPlayer = true;

            if (isShieldActive) {
                isShieldActive = false;
                shieldBubble.classList.remove('active');
                
                clearTimeout(shieldRechargeTimer);
                shieldRechargeTimer = setTimeout(() => {
                    if (hasShield && !isGameOver) {
                        isShieldActive = true;
                        shieldBubble.classList.add('active');
                    }
                }, 12000);
            } else {
                lives--;
                updateLivesDisplay();
                triggerScreenShake();

                cannon.classList.add('hit-flash');
                setTimeout(() => {
                    cannon.classList.remove('hit-flash');
                }, 150);

                if (lives <= 0) {
                    triggerGameOver();
                }
            }
        }

        if (hitPlayer || eb.y > screenHeight) {
            eb.el.remove();
            enemyBullets.splice(i, 1);
        }
    }
}

// --- UTILITY FUNCTIONS ---

function respawnTarget(target) {
    if (target.el.classList.contains('bomber')) {
        target.isActive = false;
        target.el.style.display = 'none';
        bombTimer = 0;
    } else {
        target.el.style.opacity = 0;
        setTimeout(() => { target.el.style.opacity = 1; }, 150);
        target.x = 0;
        target.t = 0; 
        target.speed = Math.abs(target.speed);
    }
}

function triggerNuke() {
    nukeReady = false;
    
    nukeFlashScreen.style.opacity = '1';
    setTimeout(() => {
        nukeFlashScreen.style.opacity = '0';
    }, 150);

    squares.forEach(sq => {
        const earnedPoints = Math.round(sq.reward * spoilsMultiplier);
        points += earnedPoints;
        coins += earnedPoints;

        const explosionX = sq.x + sq.size / 2;
        const explosionY = sq.baseY + sq.yOffset + sq.size / 2;

        createExplosion(explosionX, explosionY);
        respawnTarget(sq);

        if (Math.random() < 0.5) {
            spawnCoin(explosionX, explosionY, earnedPoints);
        }
    });

    pointsValueEl.innerText = points;
    coinsValueEl.innerText = coins;
    checkLevelProgress();

    enemyBullets.forEach(eb => eb.el.remove());
    enemyBullets.length = 0;

    updateShopButtons();
    nukeCooldownTimer = setTimeout(() => {
        nukeReady = true;
        updateShopButtons();
    }, 20000);
}

function triggerScreenShake() {
    document.body.classList.remove('shake-effect');
    void document.body.offsetWidth; 
    document.body.classList.add('shake-effect');
}

function createExplosion(x, y) {
    const bubble = document.createElement('div');
    bubble.className = 'explosion-bubble';
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 400);

    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'spark';
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 90 + 30; 
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        spark.style.setProperty('--dx', `${dx}px`);
        spark.style.setProperty('--dy', `${dy}px`);

        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 600);
    }
}

function spawnCoin(startX, startY, value) {
    const coinEl = document.createElement('div');
    coinEl.className = 'coin';
    coinEl.innerText = value;
    coinEl.style.left = startX + 'px';
    coinEl.style.top = startY + 'px';
    document.body.appendChild(coinEl);

    const fallSpeed = Math.random() * 160 + 120;

    fallingCoins.push({
        el: coinEl,
        x: startX,
        y: startY,
        vy: fallSpeed,
        value: value
    });
}

function updateCoins(dt) {
    const screenHeight = window.innerHeight;
    const cannonLeft = cannonX - 40;
    const cannonRight = cannonX + 40;
    const cannonTop = screenHeight - 80;
    const coinSize = 32;

    for (let i = fallingCoins.length - 1; i >= 0; i--) {
        const c = fallingCoins[i];
        c.y += c.vy * dt;
        c.el.style.top = c.y + 'px';

        let collected = false;

        if (c.x + coinSize > cannonLeft && c.x < cannonRight && c.y + coinSize > cannonTop && c.y < screenHeight) {
            collected = true;
            coins += c.value;
            coinsValueEl.innerText = coins;
            
            coinsValueEl.style.color = '#fff';
            setTimeout(() => { coinsValueEl.style.color = '#ffeb3b'; }, 150);
        }

        if (collected || c.y > screenHeight) {
            c.el.remove();
            fallingCoins.splice(i, 1);
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    gameOverScreen.style.display = 'flex';
    setTimeout(restartGame, 3000);
}

function triggerVictory() {
    isVictory = true;
    victoryScreen.style.display = 'flex';
    setTimeout(restartGame, 5000); 
}

function restartGame() {
    lives = 5;
    points = 0;
    level = 1;
    updateLivesDisplay();
    pointsValueEl.innerText = points;
    levelValueEl.innerText = level;
    checkLevelProgress(); 
    gameOverScreen.style.display = 'none';
    victoryScreen.style.display = 'none';
    
    fallingCoins.forEach(c => c.el.remove());
    fallingCoins.length = 0;

    reloadLvl = 0;
    reloadTime = 1000;
    reloadCost = 150;
    hasTripleShot = false;

    hasShield = false;
    isShieldActive = false;
    clearTimeout(shieldRechargeTimer);
    shieldBubble.classList.remove('active');

    spoilsLvl = 0;
    spoilsMultiplier = 1.0;
    spoilsCost = 250;

    hasNuke = false;
    nukeReady = true;
    clearTimeout(nukeCooldownTimer);
    hasRailgun = false;

    cannonX = window.innerWidth / 2;
    cannon.style.left = (cannonX - 40) + 'px';

    bullets.forEach(b => b.el.remove());
    bullets.length = 0; 

    enemyBullets.forEach(b => b.el.remove());
    enemyBullets.length = 0;

    bombs.forEach(bomb => {
        bomb.isActive = false;
        bomb.el.style.display = 'none';
    });
    bombTimer = 0;

    isGameOver = false;
    isVictory = false;
    updateShopButtons(); 
}

// --- UPGRADE SHOP LOGIC ---

function updateShopButtons() {
    // 1. Fire Rate
    if (reloadLvl >= maxReloadLvl) {
        buyReloadBtn.innerText = "MAX";
        buyReloadBtn.disabled = true;
    } else {
        buyReloadBtn.innerHTML = `Buy: ${reloadCost} 🪙`;
        buyReloadBtn.disabled = (coins < reloadCost);
    }
    reloadLvlEl.innerText = reloadLvl;

    // 2. Buy Life
    buyLifeBtn.disabled = (coins < lifeCost || lives >= 10);
    buyLifeBtn.innerHTML = lives >= 10 ? "MAX ❤️" : `Buy: ${lifeCost} 🪙`;

    // 3. Triple Shot
    if (hasTripleShot) {
        buyTripleBtn.innerText = "ACTIVE";
        buyTripleBtn.disabled = true;
    } else {
        buyTripleBtn.innerHTML = `Buy: ${tripleCost} 🪙`;
        buyTripleBtn.disabled = (coins < tripleCost);
    }

    // 4. Shield
    if (hasShield) {
        buyShieldBtn.innerText = "ACTIVE 🛡️";
        buyShieldBtn.disabled = true;
    } else {
        buyShieldBtn.innerHTML = `Buy: ${shieldCost} 🪙`;
        buyShieldBtn.disabled = (coins < shieldCost);
    }

    // 5. Spoils of War
    if (spoilsLvl >= maxSpoilsLvl) {
        buySpoilsBtn.innerText = "MAX";
        buySpoilsBtn.disabled = true;
    } else {
        buySpoilsBtn.innerHTML = `Buy: ${spoilsCost} 🪙`;
        buySpoilsBtn.disabled = (coins < spoilsCost);
    }
    spoilsLvlEl.innerText = spoilsLvl;

    // 6. Nuke Strike
    if (hasNuke) {
        buyNukeBtn.innerText = nukeReady ? "READY [Q]" : "RECHARGING ⏳";
        buyNukeBtn.disabled = true;
    } else {
        buyNukeBtn.innerHTML = `Buy: ${nukeCost} 🪙`;
        buyNukeBtn.disabled = (coins < nukeCost);
    }

    // 7. Hyper-Railgun
    if (hasRailgun) {
        buyRailgunBtn.innerText = "ACTIVE";
        buyRailgunBtn.disabled = true;
    } else {
        buyRailgunBtn.innerHTML = `Buy: ${railgunCost} 🪙`;
        buyRailgunBtn.disabled = (coins < railgunCost);
    }
}

// Purchases
buyReloadBtn.addEventListener('click', () => {
    if (coins >= reloadCost && reloadLvl < maxReloadLvl) {
        coins -= reloadCost;
        reloadLvl++;
        reloadTime = 1000 - (reloadLvl * 150); 
        reloadCost = Math.round(reloadCost * 1.8); 
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyLifeBtn.addEventListener('click', () => {
    if (coins >= lifeCost && lives < 10) {
        coins -= lifeCost;
        lives++;
        updateLivesDisplay();
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyTripleBtn.addEventListener('click', () => {
    if (coins >= tripleCost && !hasTripleShot) {
        coins -= tripleCost;
        hasTripleShot = true;
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyShieldBtn.addEventListener('click', () => {
    if (coins >= shieldCost && !hasShield) {
        coins -= shieldCost;
        hasShield = true;
        isShieldActive = true;
        shieldBubble.classList.add('active');
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buySpoilsBtn.addEventListener('click', () => {
    if (coins >= spoilsCost && spoilsLvl < maxSpoilsLvl) {
        coins -= spoilsCost;
        spoilsLvl++;
        spoilsMultiplier = 1.0 + (spoilsLvl * 0.5); 
        spoilsCost = Math.round(spoilsCost * 2.0); 
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyNukeBtn.addEventListener('click', () => {
    if (coins >= nukeCost && !hasNuke) {
        coins -= nukeCost;
        hasNuke = true;
        nukeReady = true;
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyRailgunBtn.addEventListener('click', () => {
    if (coins >= railgunCost && !hasRailgun) {
        coins -= railgunCost;
        hasRailgun = true;
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

// Full Reset
function fullReset() {
    coins = 0;
    points = 0;
    lives = 5;
    level = 1;
    levelValueEl.innerText = level;
    checkLevelProgress(); 

    reloadLvl = 0;
    reloadTime = 1000;
    reloadCost = 150;
    hasTripleShot = false;

    hasShield = false;
    isShieldActive = false;
    clearTimeout(shieldRechargeTimer);
    shieldBubble.classList.remove('active');

    spoilsLvl = 0;
    spoilsMultiplier = 1.0;
    spoilsCost = 250;

    hasNuke = false;
    nukeReady = true;
    clearTimeout(nukeCooldownTimer);
    hasRailgun = false;

    coinsValueEl.innerText = coins;
    pointsValueEl.innerText = points;
    updateLivesDisplay();

    gameOverScreen.style.display = 'none';
    victoryScreen.style.display = 'none';
    
    fallingCoins.forEach(c => c.el.remove());
    fallingCoins.length = 0;

    cannonX = window.innerWidth / 2;
    cannon.style.left = (cannonX - 40) + 'px';

    bullets.forEach(b => b.el.remove());
    bullets.length = 0;

    bombs.forEach(bomb => {
        bomb.isActive = false;
        bomb.el.style.display = 'none';
    });
    bombTimer = 0;

    isGameOver = false;
    isVictory = false;
    updateShopButtons();
}

resetBtn.addEventListener('click', fullReset);