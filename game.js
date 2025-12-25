// game.js - كود اللعبة الكامل
document.addEventListener('DOMContentLoaded', function() {
    // ============= تهيئة اللعبة =============
    const startScreen = document.getElementById('startScreen');
    const gameContainer = document.getElementById('gameContainer');
    const startButton = document.getElementById('startButton');
    const gameCanvas = document.getElementById('gameCanvas');
    const ctx = gameCanvas.getContext('2d');
    
    // نظام الصوت
    const audioSystem = new AudioSystem();
    
    // ============= متغيرات اللعبة =============
    let score = 0;
    let health = 100;
    let level = 1;
    let gameRunning = false;
    let gameTime = 0;
    let lastEnemySpawn = 0;
    let enemies = [];
    let enemyMissiles = [];
    let playerMissiles = [];
    let particles = [];
    let gameLoopId;
    
    // ============= دبابة اللاعب =============
    const player = {
        x: 400,
        y: 450,
        width: 60,
        height: 40,
        speed: 8,
        color: '#FFD700',
        lastShot: 0,
        shootDelay: 300
    };
    
    // ============= عناصر التحكم =============
    let keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ' ': false
    };
    
    // ============= بدء اللعبة =============
    startButton.addEventListener('click', function() {
        startGame();
    });
    
    // ============= التحكم بالدبابة =============
    // أزرار التحكم
    document.getElementById('leftButton').addEventListener('click', function() {
        movePlayer('left');
    });
    
    document.getElementById('rightButton').addEventListener('click', function() {
        movePlayer('right');
    });
    
    // زر النار
    document.getElementById('fireButton').addEventListener('click', function() {
        shoot();
    });
    
    // ============= التحكم بلوحة المفاتيح =============
    document.addEventListener('keydown', function(e) {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
            e.preventDefault();
        }
    });
    
    // ============= التحكم باللمس للجوال =============
    let touchStartX = 0;
    const touchArea = document.getElementById('touchArea');
    
    touchArea.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        e.preventDefault();
    });
    
    touchArea.addEventListener('touchmove', function(e) {
        const touchX = e.touches[0].clientX;
        const diff = touchX - touchStartX;
        
        if (Math.abs(diff) > 10) {
            if (diff > 0) {
                movePlayer('left');
            } else {
                movePlayer('right');
            }
            touchStartX = touchX;
        }
        e.preventDefault();
    });
    
    // ============= دوال الحركة =============
    function movePlayer(direction) {
        if (!gameRunning) return;
        
        if (direction === 'left') {
            player.x -= player.speed;
        } else if (direction === 'right') {
            player.x += player.speed;
        }
        
        // تحديد الحدود
        if (player.x < player.width/2) player.x = player.width/2;
        if (player.x > gameCanvas.width - player.width/2) player.x = gameCanvas.width - player.width/2;
    }
    
    function shoot() {
        if (!gameRunning) return;
        
        const now = Date.now();
        if (now - player.lastShot < player.shootDelay) return;
        
        player.lastShot = now;
        
        playerMissiles.push({
            x: player.x,
            y: player.y - 30,
            width: 8,
            height: 20,
            speed: 12,
            color: '#FF4757',
            damage: 25
        });
        
        if (audioSystem.enabled) {
            audioSystem.play('shoot');
        }
    }
    
    // ============= إدارة الأعداء =============
    function spawnEnemy() {
        const x = 50 + Math.random() * (gameCanvas.width - 100);
        enemies.push({
            x: x,
            y: 50,
            width: 50,
            height: 35,
            speed: 1 + level * 0.2,
            color: '#FF4757',
            health: 50 + level * 20,
            lastShot: 0,
            shootDelay: 1000 + Math.random() * 2000
        });
    }
    
    function updateEnemies(deltaTime) {
        // تحريك الأعداء
        enemies.forEach((enemy, index) => {
            enemy.x += Math.sin(gameTime * 0.001 + index) * 2;
            
            // إطلاق النار من الأعداء
            const now = Date.now();
            if (now - enemy.lastShot > enemy.shootDelay) {
                enemy.lastShot = now;
                enemyMissiles.push({
                    x: enemy.x,
                    y: enemy.y + enemy.height/2,
                    width: 6,
                    height: 15,
                    speed: 5 + level * 0.5,
                    color: '#FFA502',
                    damage: 10
                });
            }
            
            // حذف الأعداء خارج الشاشة
            if (enemy.y > gameCanvas.height + 100) {
                enemies.splice(index, 1);
            }
        });
        
        // توليد أعداء جدد
        if (gameTime - lastEnemySpawn > 2000 - level * 100) {
            spawnEnemy();
            lastEnemySpawn = gameTime;
        }
    }
    
    // ============= إدارة التصادمات =============
    function checkCollisions() {
        // تصادم صواريخ اللاعب مع الأعداء
        playerMissiles.forEach((missile, mIndex) => {
            enemies.forEach((enemy, eIndex) => {
                if (isColliding(missile, enemy)) {
                    // تدمير الصاروخ
                    playerMissiles.splice(mIndex, 1);
                    
                    // تقليل صحة العدو
                    enemy.health -= missile.damage;
                    
                    // إضافة تأثيرات
                    createExplosion(enemy.x, enemy.y);
                    
                    if (audioSystem.enabled) {
                        audioSystem.play('hit');
                    }
                    
                    // إذا مات العدو
                    if (enemy.health <= 0) {
                        enemies.splice(eIndex, 1);
                        score += 100 * level;
                        
                        if (audioSystem.enabled) {
                            audioSystem.play('explosion');
                        }
                        
                        // زيادة المستوى
                        if (score >= level * 1000) {
                            level++;
                            showMessage(`🎉 المستوى ${level}!`, `الهدف: ${level * 1000} نقطة`);
                        }
                    }
                }
            });
        });
        
        // تصادم صواريخ الأعداء مع اللاعب
        enemyMissiles.forEach((missile, index) => {
            if (isColliding(missile, player)) {
                enemyMissiles.splice(index, 1);
                health -= missile.damage;
                createExplosion(player.x, player.y - 20);
                
                if (audioSystem.enabled) {
                    audioSystem.play('hit');
                }
                
                // فحص إذا انتهت الصحة
                if (health <= 0) {
                    gameOver();
                }
            }
        });
        
        // حذف الصواريخ خارج الشاشة
        playerMissiles = playerMissiles.filter(m => m.y > 0);
        enemyMissiles = enemyMissiles.filter(m => m.y < gameCanvas.height);
    }
    
    function isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width/2 &&
               obj1.x + obj1.width > obj2.x - obj2.width/2 &&
               obj1.y < obj2.y + obj2.height/2 &&
               obj1.y + obj1.height > obj2.y - obj2.height/2;
    }
    
    // ============= التأثيرات البصرية =============
    function createExplosion(x, y) {
        for (let i = 0; i < 15; i++) {
            particles.push({
                x: x,
                y: y,
                size: Math.random() * 5 + 2,
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 6 - 3,
                color: `hsl(${Math.random() * 30 + 20}, 100%, 50%)`,
                life: 30
            });
        }
    }
    
    function updateParticles() {
        particles.forEach((particle, index) => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.life--;
            
            if (particle.life <= 0) {
                particles.splice(index, 1);
            }
        });
    }
    
    // ============= الرسم =============
    function draw() {
        // مسح الشاشة
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // رسم الخلفية
        drawBackground();
        
        // رسم الأعداء
        enemies.forEach(enemy => drawEnemy(enemy));
        
        // رسم صواريخ اللاعب
        playerMissiles.forEach(missile => drawMissile(missile));
        
        // رسم صواريخ الأعداء
        enemyMissiles.forEach(missile => drawMissile(missile, true));
        
        // رسم الدبابة
        drawTank(player.x, player.y);
        
        // رسم الجسيمات
        particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life / 30;
            ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        });
        ctx.globalAlpha = 1;
    }
    
    function drawBackground() {
        // خلفية متدرجة
        const gradient = ctx.createLinearGradient(0, 0, 0, gameCanvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(1, '#2a5298');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        
        // النجوم
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const x = (gameTime * 0.01 + i * 50) % gameCanvas.width;
            const y = (i * 20) % gameCanvas.height;
            const size = Math.sin(gameTime * 0.001 + i) * 2 + 2;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function drawTank(x, y) {
        // جسم الدبابة
        ctx.fillStyle = player.color;
        ctx.fillRect(x - player.width/2, y - player.height/2, player.width, player.height);
        
        // برج الدبابة
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(x, y - player.height/2 - 10, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // مدفع الدبابة
        ctx.fillStyle = '#666';
        ctx.fillRect(x - 5, y - player.height/2 - 25, 10, 30);
        
        // الجنزير
        ctx.fillStyle = '#333';
        ctx.fillRect(x - player.width/2 - 5, y + player.height/2 - 10, player.width + 10, 10);
        ctx.fillRect(x - player.width/2 - 5, y - player.height/2, player.width + 10, 10);
        
        // تأثير الحركة
        if (keys.ArrowLeft || keys.ArrowRight) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.fillRect(x - player.width/2 - 10, y + player.height/2 - 5, 5, 8);
            ctx.fillRect(x + player.width/2 + 5, y + player.height/2 - 5, 5, 8);
        }
    }
    
    function drawEnemy(enemy) {
        // جسم العدو
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2, enemy.width, enemy.height);
        
        // برج العدو
        ctx.fillStyle = '#FF6347';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - enemy.height/2 - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // شريط الصحة
        const healthWidth = (enemy.health / (50 + level * 20)) * enemy.width;
        ctx.fillStyle = '#FF4757';
        ctx.fillRect(enemy.x - enemy.width/2, enemy.y - enemy.height/2 - 10, healthWidth, 3);
        
        // مدفع العدو
        ctx.fillStyle = '#444';
        ctx.fillRect(enemy.x - 4, enemy.y - enemy.height/2 - 20, 8, 25);
    }
    
    function drawMissile(missile, isEnemy = false) {
        ctx.fillStyle = missile.color;
        ctx.fillRect(missile.x - missile.width/2, missile.y, missile.width, missile.height);
        
        // ذيل الصاروخ
        ctx.fillStyle = isEnemy ? '#FFD700' : '#FF6B81';
        ctx.fillRect(missile.x - missile.width/2, missile.y + missile.height, missile.width, 5);
    }
    
    // ============= تحديث الواجهة =============
    function updateUI() {
        document.getElementById('scoreValue').textContent = score;
        document.getElementById('healthBar').style.width = health + '%';
        document.getElementById('levelValue').textContent = level;
        
        // تغيير لون شريط الصحة
        const healthBar = document.getElementById('healthBar');
        if (health > 60) healthBar.style.background = 'linear-gradient(90deg, #2ED573, #1DD1A1)';
        else if (health > 30) healthBar.style.background = 'linear-gradient(90deg, #FFA502, #FFD700)';
        else healthBar.style.background = 'linear-gradient(90deg, #FF4757, #FF6B81)';
    }
    
    // ============= الحلقة الرئيسية =============
    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!gameRunning) return;
        
        const deltaTime = timestamp - lastTime || 0;
        lastTime = timestamp;
        gameTime += deltaTime;
        
        // تحديث المدخلات
        if (keys.ArrowLeft) movePlayer('left');
        if (keys.ArrowRight) movePlayer('right');
        if (keys[' ']) shoot();
        
        // تحديث المواقع
        playerMissiles.forEach(m => m.y -= m.speed);
        enemyMissiles.forEach(m => m.y += m.speed);
        enemies.forEach(enemy => enemy.y += enemy.speed * (deltaTime * 0.01));
        
        // تحديث المكونات
        updateEnemies(deltaTime);
        updateParticles();
        checkCollisions();
        updateUI();
        
        // الرسم
        draw();
        
        // استمرار الحلقة
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    // ============= دوال إدارة اللعبة =============
    function startGame() {
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        gameRunning = true;
        
        // تعيين حجم الكانفاس
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        player.x = gameCanvas.width / 2;
        
        // إعادة تعيين اللعبة
        resetGame();
        
        // بدء الحلقة
        lastTime = 0;
        gameLoopId = requestAnimationFrame(gameLoop);
        
        // إظهار منطقة اللمس على الجوال
        if ('ontouchstart' in window) {
            touchArea.style.display = 'block';
        }
    }
    
    function resetGame() {
        score = 0;
        health = 100;
        level = 1;
        gameTime = 0;
        lastEnemySpawn = 0;
        enemies = [];
        enemyMissiles = [];
        playerMissiles = [];
        particles = [];
        player.x = gameCanvas.width / 2;
        player.lastShot = 0;
    }
    
    function gameOver() {
        gameRunning = false;
        cancelAnimationFrame(gameLoopId);
        
        showMessage('💀 انتهت اللعبة', `نقاطك النهائية: ${score}<br>وصلت للمستوى: ${level}`, true);
    }
    
    function showMessage(title, text, isGameOver = false) {
        document.getElementById('messageTitle').innerHTML = title;
        document.getElementById('messageText').innerHTML = text;
        document.getElementById('gameMessage').style.display = 'block';
        
        // تغيير أزرار الرسالة
        const restartBtn = document.getElementById('restartButton');
        const menuBtn = document.getElementById('menuButton');
        
        if (isGameOver) {
            restartBtn.innerHTML = '<i class="fas fa-redo"></i> إعادة المحاولة';
            restartBtn.onclick = function() {
                document.getElementById('gameMessage').style.display = 'none';
                startGame();
            };
        } else {
            restartBtn.innerHTML = '<i class="fas fa-check"></i> حسناً';
            restartBtn.onclick = function() {
                document.getElementById('gameMessage').style.display = 'none';
            };
        }
        
        menuBtn.onclick = function() {
            gameRunning = false;
            cancelAnimationFrame(gameLoopId);
            document.getElementById('gameMessage').style.display = 'none';
            gameContainer.style.display = 'none';
            startScreen.style.display = 'flex';
            resetGame();
        };
    }
    
    // ============= تحجيم النافذة =============
    window.addEventListener('resize', function() {
        if (gameRunning) {
            gameCanvas.width = window.innerWidth;
            gameCanvas.height = window.innerHeight;
            player.x = Math.min(player.x, gameCanvas.width - player.width/2);
        }
    });
    
    // ============= أزرار الرسائل =============
    document.getElementById('restartButton').addEventListener('click', function() {
        if (!gameRunning) {
            startGame();
        }
        document.getElementById('gameMessage').style.display = 'none';
    });
    
    document.getElementById('menuButton').addEventListener('click', function() {
        gameRunning = false;
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        document.getElementById('gameMessage').style.display = 'none';
        gameContainer.style.display = 'none';
        startScreen.style.display = 'flex';
        resetGame();
    });
});
