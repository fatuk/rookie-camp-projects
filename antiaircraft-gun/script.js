let coins = 0;
let points = 0;
let lives = 5;
let level = 1;
let isGameOver = false;

let cannonX = window.innerWidth / 2; // Начальное положение зенитки по центру
const keysPressed = {}; // Тут храним, какие клавиши сейчас нажаты

// --- ПЕРЕМЕННЫЕ УЛУЧШЕНИЙ ---
let reloadLvl = 0;
const maxReloadLvl = 5;
let reloadCost = 150;
let reloadTime = 1000; // Базовая перезарядка (в мс) - ровно 1 выстрел в секунду!

let lifeCost = 100;

let hasTripleShot = false;
let tripleCost = 800;

// Новые переменные для щита и трофеев
let hasShield = false;
let isShieldActive = false;
let shieldCost = 500;
let shieldRechargeTimer = null;

let spoilsLvl = 0;
const maxSpoilsLvl = 3;
let spoilsCost = 250;
let spoilsMultiplier = 1.0;

const pointsValueEl = document.getElementById('points-value');
const coinsValueEl = document.getElementById('coins-value');
const livesValueEl = document.getElementById('lives-value');
const levelValueEl = document.getElementById('level-value');
const nextLevelReqEl = document.getElementById('next-level-req');
const gameOverScreen = document.getElementById('game-over-screen');
const resetBtn = document.getElementById('reset-btn');

// Элементы магазина
const reloadLvlEl = document.getElementById('reload-lvl');
const reloadCostEl = document.getElementById('reload-cost');
const lifeCostEl = document.getElementById('life-cost');
const tripleCostEl = document.getElementById('triple-cost');

const buyReloadBtn = document.getElementById('buy-reload-btn');
const buyLifeBtn = document.getElementById('buy-life-btn');
const buyTripleBtn = document.getElementById('buy-triple-btn');

// Кнопки и элементы новых улучшений
const buyShieldBtn = document.getElementById('buy-shield-btn');
const buySpoilsBtn = document.getElementById('buy-spoils-btn');
const spoilsLvlEl = document.getElementById('spoils-lvl');
const spoilsCostEl = document.getElementById('spoils-cost');
const shieldCostEl = document.getElementById('shield-cost');
const shieldBubble = document.getElementById('shield-bubble');

// --- БАЗА ДАННЫХ ЦЕЛЕЙ ---
const squares = [
    { el: document.getElementById('square-1'), x: 0, yOffset: 0, baseY: 50, speed: 280,  size: 65, reward: 10, shootTimer: 1.5, type: 'sin', t: 0 },
    { el: document.getElementById('square-2'), x: 0, yOffset: 0, baseY: 110, speed: 420,  size: 65, reward: 20, shootTimer: 2.2, type: 'cos', t: 0 },
    { el: document.getElementById('square-3'), x: 0, yOffset: 0, baseY: 170, speed: 580,  size: 65, reward: 50, shootTimer: 0.8, type: 'evade', t: 0 }
];

const enemyBullets = [];
const baseEnemyBulletSpeed = 350; // Базовая скорость ракет

const bombs = [
    { el: document.getElementById('bomb-1'), x: -100, yOffset: 0, baseY: 240, speed: 180, size: 100, isActive: false, shootTimer: 1.0 }
];
bombs[0].el.style.display = 'none';

let bombTimer = 0; 
let lastTime = 0;

function gameLoop(timestamp) {
    if (isGameOver) {
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

    updateCannon(dt); // Двигаем зенитку каждый кадр
    updateTargets(dt);
    updateBullets(dt);
    updateEnemyBullets(dt); // Двигаем вражеские ракеты и считаем попадания
    updateShopButtons(); // Постоянно проверяем, на что хватает монет

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// --- ДВИЖЕНИЕ ЦЕЛЕЙ ---
function checkLevelProgress() {
    let newLevel = 1;
    let nextReqText = "";

    if (points >= 1000) {
        newLevel = 5;
        nextReqText = "МАКС. УРОВЕНЬ";
    } else if (points >= 650) {
        newLevel = 4;
        nextReqText = `До 5-го ур: ${1000 - points} б.`;
    } else if (points >= 350) {
        newLevel = 3;
        nextReqText = `До 4-го ур: ${650 - points} б.`;
    } else if (points >= 150) {
        newLevel = 2;
        nextReqText = `До 3-го ур: ${350 - points} б.`;
    } else {
        newLevel = 1;
        nextReqText = `До 2-го ур: ${150 - points} б.`;
    }

    if (nextLevelReqEl) {
        nextLevelReqEl.innerText = nextReqText;
    }

    if (newLevel !== level) {
        level = newLevel;
        levelValueEl.innerText = level;
        // Эффект вспышки уровня на экране
        levelValueEl.style.textShadow = "0 0 25px #e040fb";
        setTimeout(() => { levelValueEl.style.textShadow = "0 0 10px rgba(224,64,251,0.5)"; }, 500);
    }
}

function updateTargets(dt) {
    // Влияние уровня на скорости
    const speedMultiplier = 1 + (level - 1) * 0.25; // +25% скорости самолетов за уровень
    const enemyShootCooldownFactor = 1 + (level - 1) * 0.25; // Враги стреляют на 25% чаще за уровень

    squares.forEach(sq => {
        const rightWall = window.innerWidth - sq.size;
        // Двигаем самолет с учетом множителя скорости уровня
        sq.x += sq.speed * speedMultiplier * dt;
        
        if (sq.x >= rightWall) { 
            sq.x = rightWall; 
            sq.speed = -Math.abs(sq.speed); 
        } else if (sq.x <= 0) { 
            sq.x = 0; 
            sq.speed = Math.abs(sq.speed); 
        }
        
        // Накапливаем время для плавных волновых движений без рывков
        if (sq.t === undefined) sq.t = 0;
        sq.t += dt;
        
        // Считаем красивую искривленную траекторию на основе времени (очень плавно!)
        if (sq.type === 'sin') {
            sq.yOffset = Math.sin(sq.t * 1.5) * 90; // Огромные плавные волны
        } else if (sq.type === 'cos') {
            sq.yOffset = Math.cos(sq.t * 2.2) * 130; // Глубокие крутые нырки
        } else if (sq.type === 'evade') {
            // Экстремальная траектория уклонения по всему небу
            sq.yOffset = Math.sin(sq.t * 2.0) * Math.cos(sq.t * 0.8) * 180;
        }

        // Разворачиваем самолет по направлению движения и смещаем по Y
        const dir = sq.speed > 0 ? 1 : -1;
        sq.el.style.transform = `translate(${sq.x}px, ${sq.yOffset}px) scaleX(${dir})`;

        // Логика стрельбы самолетов (с учетом уровня)
        sq.shootTimer -= dt;
        if (sq.shootTimer <= 0) {
            spawnEnemyBullet(sq.x + sq.size / 2, sq.baseY + sq.yOffset + sq.size);
            // Интервал стрельбы уменьшается с ростом уровня
            sq.shootTimer = (Math.random() * 3 + 1.5) / enemyShootCooldownFactor;
        }
    });

    bombs.forEach(bomb => {
        if (!bomb.isActive) {
            bombTimer += dt;
            // Бомбардировщик прилетает чаще на высоких уровнях
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

            // Бомбардировщик бросает бомбы чаще (с учетом уровня)!
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

// --- ЛОГИКА ПУШКИ ---
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

// --- СТРЕЛЬБА ---
const bullets = [];
const bulletSpeed = 2500; 
let lastShotTime = 0;

const shopPanel = document.getElementById('shop-panel');
const shopHint = document.getElementById('shop-hint');

// Функция открыть/закрыть магазин
function toggleShop() {
    shopPanel.classList.toggle('shop-hidden');
    // Сбрасываем фокус, чтобы нажатие пробела стреляло, а не покупало апгрейд повторно!
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

// Клик мышкой по подсказке
if (shopHint) {
    shopHint.addEventListener('click', toggleShop);
}

// Клик по крестику в магазине
const closeShopBtn = document.getElementById('close-shop-btn');
if (closeShopBtn) {
    closeShopBtn.addEventListener('click', toggleShop);
}

document.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true; // Запоминаем по коду клавиши
    keysPressed[event.key] = true;  // Запоминаем по символу (для надежности)

    // Переключение магазина на клавишу R (работает на любой раскладке!)
    if (event.code === 'KeyR' || event.key.toLowerCase() === 'r' || event.key.toLowerCase() === 'к') {
        toggleShop();
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

    // Вычисляем углы для выстрелов (один или три)
    const anglesToShoot = [currentAngle];
    if (hasTripleShot) {
        anglesToShoot.push(currentAngle - 15); // Пуля левее
        anglesToShoot.push(currentAngle + 15); // Пуля правее
    }

    anglesToShoot.forEach(angle => {
        const bulletEl = document.createElement('div');
        bulletEl.className = 'bullet';
        document.body.appendChild(bulletEl);

        const angleRad = (angle - 90) * (Math.PI / 180); 

        bullets.push({
            el: bulletEl, x: startX, y: startY,
            vx: Math.cos(angleRad) * bulletSpeed,
            vy: Math.sin(angleRad) * bulletSpeed
        });
    });
}

// --- ПОЛЕТ И СТОЛКНОВЕНИЯ ПУЛЬ ---
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
                hit = true;
                // Рассчитываем награду с учетом улучшения "Военные трофеи"
                const earnedPoints = Math.round(sq.reward * spoilsMultiplier);
                points += earnedPoints;
                coins += earnedPoints;
                pointsValueEl.innerText = points;
                coinsValueEl.innerText = coins;
                checkLevelProgress(); // Проверяем, повысился ли уровень!
                respawnTarget(sq);
                break; 
            }
        }

        if (!hit) {
            for (let j = 0; j < bombs.length; j++) {
                const bomb = bombs[j];
                if (!bomb.isActive) continue; 

                const bombY = bomb.baseY + bomb.yOffset; 

                if (b.x < bomb.x + bomb.size && b.x + 10 > bomb.x && b.y < bombY + bomb.size && b.y + 10 > bombY) {
                    hit = true;
                    
                    lives--;
                    livesValueEl.innerText = lives;

                    bomb.el.style.backgroundColor = 'red';
                    setTimeout(() => { bomb.el.style.backgroundColor = '#111'; }, 200);

                    respawnTarget(bomb);

                    if (lives <= 0) {
                        triggerGameOver();
                    }
                    break; 
                }
            }
        }

        if (hit || b.x < 0 || b.x > screenWidth || b.y < 0 || b.y > screenHeight) {
            b.el.remove();
            bullets.splice(i, 1);
        }
    }
}

// --- ВРАЖЕСКИЙ ОГОНЬ ---
function spawnEnemyBullet(startX, startY) {
    if (isGameOver) return;
    const bEl = document.createElement('div');
    bEl.className = 'enemy-bullet';
    bEl.style.left = startX + 'px';
    bEl.style.top = startY + 'px';
    document.body.appendChild(bEl);

    // Скорость вражеских снарядов увеличивается с ростом уровня (до +60% на 5-м уровне)
    const currentEnemyBulletSpeed = baseEnemyBulletSpeed * (1 + (level - 1) * 0.15);

    enemyBullets.push({
        el: bEl,
        x: startX,
        y: startY,
        vy: currentEnemyBulletSpeed
    });
}

function updateEnemyBullets(dt) {
    const screenHeight = window.innerHeight;

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        eb.y += eb.vy * dt;
        eb.el.style.top = eb.y + 'px';

        let hitPlayer = false;

        // Считаем коллизию с кузовом зенитки (80x80 пикселей на дне экрана)
        const cannonLeft = cannonX - 40;
        const cannonRight = cannonX + 40;
        const cannonTop = screenHeight - 80;

        // Условие пересечения прямоугольника кабины и ракеты (размером примерно 8x22)
        if (eb.x + 8 > cannonLeft && eb.x < cannonRight && eb.y + 22 > cannonTop && eb.y < screenHeight) {
            hitPlayer = true;

            // Логика работы силового щита
            if (isShieldActive) {
                isShieldActive = false;
                shieldBubble.classList.remove('active');
                
                // Запуск перезарядки щита на 12 секунд
                clearTimeout(shieldRechargeTimer);
                shieldRechargeTimer = setTimeout(() => {
                    if (hasShield && !isGameOver) {
                        isShieldActive = true;
                        shieldBubble.classList.add('active');
                    }
                }, 12000);
            } else {
                // Если щит выключен (или еще не куплен) — теряем жизнь
                lives--;
                livesValueEl.innerText = lives;

                // Визуальный эффект попадания по пушке (красная вспышка)
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

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function respawnTarget(target) {
    if (target.el.classList.contains('bomber')) {
        target.isActive = false;
        target.el.style.display = 'none';
        bombTimer = 0;
    } else {
        target.el.style.opacity = 0;
        setTimeout(() => { target.el.style.opacity = 1; }, 150);
        target.x = 0;
        target.t = 0; // Сбрасываем фазу движения
        target.speed = Math.abs(target.speed);
    }
}

function triggerGameOver() {
    isGameOver = true;
    gameOverScreen.style.display = 'flex';
    setTimeout(restartGame, 3000);
}

function restartGame() {
    lives = 5;
    points = 0;
    level = 1;
    livesValueEl.innerText = lives;
    pointsValueEl.innerText = points;
    levelValueEl.innerText = level;
    checkLevelProgress(); // Сбросит текст оставшихся баллов
    gameOverScreen.style.display = 'none';
    
    // Сброс апгрейдов при поражении (все ресурсы исчезают, кроме монет!)
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

    // Возвращаем зенитку в центр при перезапуске
    cannonX = window.innerWidth / 2;
    cannon.style.left = cannonX + 'px';

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
    updateShopButtons(); // Обновляем кнопки в магазине, чтобы сбросить циферки уровней
}

// --- ЛОГИКА МАГАЗИНА УЛУЧШЕНИЙ ---

function updateShopButtons() {
    // 1. Кнопка скорострельности
    if (reloadLvl >= maxReloadLvl) {
        buyReloadBtn.innerText = "МАКС.";
        buyReloadBtn.disabled = true;
    } else {
        buyReloadBtn.innerHTML = `Купить: ${reloadCost} 🪙`;
        buyReloadBtn.disabled = (coins < reloadCost);
    }
    reloadLvlEl.innerText = reloadLvl;

    // 2. Кнопка покупки жизни
    buyLifeBtn.disabled = (coins < lifeCost || lives >= 10);
    buyLifeBtn.innerHTML = lives >= 10 ? "МАКС. ❤️" : `Купить: ${lifeCost} 🪙`;

    // 3. Кнопка тройного выстрела
    if (hasTripleShot) {
        buyTripleBtn.innerText = "АКТИВНО";
        buyTripleBtn.disabled = true;
    } else {
        buyTripleBtn.innerHTML = `Купить: ${tripleCost} 🪙`;
        buyTripleBtn.disabled = (coins < tripleCost);
    }

    // 4. Кнопка силового щита
    if (hasShield) {
        buyShieldBtn.innerText = "АКТИВЕН 🛡️";
        buyShieldBtn.disabled = true;
    } else {
        buyShieldBtn.innerHTML = `Купить: ${shieldCost} 🪙`;
        buyShieldBtn.disabled = (coins < shieldCost);
    }

    // 5. Кнопка военных трофеев
    if (spoilsLvl >= maxSpoilsLvl) {
        buySpoilsBtn.innerText = "МАКС.";
        buySpoilsBtn.disabled = true;
    } else {
        buySpoilsBtn.innerHTML = `Купить: ${spoilsCost} 🪙`;
        buySpoilsBtn.disabled = (coins < spoilsCost);
    }
    spoilsLvlEl.innerText = spoilsLvl;
}

// Покупки
buyReloadBtn.addEventListener('click', () => {
    if (coins >= reloadCost && reloadLvl < maxReloadLvl) {
        coins -= reloadCost;
        reloadLvl++;
        reloadTime = 1000 - (reloadLvl * 175); // Постепенно разгоняем пушку с 1000мс до 125мс!
        reloadCost = Math.round(reloadCost * 1.8); // Следующий уровень дороже
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

buyLifeBtn.addEventListener('click', () => {
    if (coins >= lifeCost && lives < 10) {
        coins -= lifeCost;
        lives++;
        livesValueEl.innerText = lives;
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
        spoilsMultiplier = 1.0 + (spoilsLvl * 0.5); // +50% за каждый уровень!
        spoilsCost = Math.round(spoilsCost * 2.0); // Следующий уровень дороже в два раза
        coinsValueEl.innerText = coins;
        updateShopButtons();
    }
});

// Полный сброс игры (кнопка внизу)
function fullReset() {
    coins = 0;
    points = 0;
    lives = 5;
    level = 1;
    levelValueEl.innerText = level;
    checkLevelProgress(); // Сбросит текст оставшихся баллов

    // Сброс апгрейдов пушки
    reloadLvl = 0;
    reloadTime = 1000;
    reloadCost = 150;
    hasTripleShot = false;

    // Сброс новых улучшений
    hasShield = false;
    isShieldActive = false;
    clearTimeout(shieldRechargeTimer);
    shieldBubble.classList.remove('active');

    spoilsLvl = 0;
    spoilsMultiplier = 1.0;
    spoilsCost = 250;

    coinsValueEl.innerText = coins;
    pointsValueEl.innerText = points;
    livesValueEl.innerText = lives;

    gameOverScreen.style.display = 'none';
    
    // Возвращаем зенитку в центр при сбросе
    cannonX = window.innerWidth / 2;
    cannon.style.left = cannonX + 'px';

    bullets.forEach(b => b.el.remove());
    bullets.length = 0;

    bombs.forEach(bomb => {
        bomb.isActive = false;
        bomb.el.style.display = 'none';
    });
    bombTimer = 0;

    isGameOver = false;
    updateShopButtons();
}

resetBtn.addEventListener('click', fullReset);

// --- ДВИЖЕНИЕ ЗЕНИТКИ ---
function updateCannon(dt) {
    const speed = 650; // Скорость движения (пикселей в секунду)
    const halfWidth = 40; // Половина ширины зенитки, чтобы не выезжать за края экрана

    // Проверяем зажатые клавиши (буквы проверим во всех регистрах и раскладках)
    const leftPressed = keysPressed['ArrowLeft'] || keysPressed['KeyA'] || keysPressed['a'] || keysPressed['A'] || keysPressed['ф'] || keysPressed['Ф'];
    const rightPressed = keysPressed['ArrowRight'] || keysPressed['KeyD'] || keysPressed['d'] || keysPressed['D'] || keysPressed['в'] || keysPressed['В'];

    if (leftPressed) {
        cannonX -= speed * dt;
    }
    if (rightPressed) {
        cannonX += speed * dt;
    }

    // Ограничиваем движение границами экрана
    if (cannonX < halfWidth) {
        cannonX = halfWidth;
    }
    if (cannonX > window.innerWidth - halfWidth) {
        cannonX = window.innerWidth - halfWidth;
    }

    // Применяем позицию к элементу (вычитаем 40px ширины, чтобы центрировать модельку)
    cannon.style.left = (cannonX - halfWidth) + 'px';
}