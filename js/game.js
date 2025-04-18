// 游戏配置
const config = {
    easy: {
        speed: 150,
        speedIncrease: 1
    },
    medium: {
        speed: 100,
        speedIncrease: 2
    },
    hard: {
        speed: 80,
        speedIncrease: 3
    }
};

// 调试功能
const DEBUG = {
    soundsLoaded: false,
    logSoundStatus: function() {
        console.log("音效加载状态:");
        console.log("- 吃食物音效:", sounds.eat.readyState > 0 ? "已加载" : "未加载");
        console.log("- 游戏结束音效:", sounds.gameOver.readyState > 0 ? "已加载" : "未加载");
        console.log("音效文件路径:");
        console.log("- 吃食物音效路径:", sounds.eat.src);
        console.log("- 游戏结束音效路径:", sounds.gameOver.src);
    }
};

// 游戏音效
const sounds = {
    eat: new Audio('sounds/eat.mp3'),
    gameOver: new Audio('sounds/game-over.mp3')
};

// 预加载音效
function preloadSounds() {
    for (const sound in sounds) {
        sounds[sound].load();
        // 设置音量
        sounds[sound].volume = 0.6;
    }
    
    // 添加音效加载完成事件
    sounds.eat.addEventListener('canplaythrough', () => {
        console.log('吃食物音效已加载');
    });
    
    sounds.gameOver.addEventListener('canplaythrough', () => {
        console.log('游戏结束音效已加载');
    });
    
    // 添加音效加载错误事件
    sounds.eat.addEventListener('error', (e) => {
        console.error('吃食物音效加载失败:', e);
    });
    
    sounds.gameOver.addEventListener('error', (e) => {
        console.error('游戏结束音效加载失败:', e);
    });
}

// 游戏状态
let gameState = {
    // 游戏区域大小
    tileSize: 20,
    boardWidth: 20,
    boardHeight: 20,
    
    // 蛇和食物状态
    snake: [],
    food: { x: 0, y: 0 },
    direction: 'right',
    nextDirection: 'right',
    
    // 游戏控制
    gameRunning: false,
    gamePaused: false,
    gameSpeed: config.easy.speed,
    speedIncrease: config.easy.speedIncrease,
    
    // 分数
    score: 0,
    highScores: {
        easy: 0,
        medium: 0,
        hard: 0
    },
    
    // 当前难度
    difficulty: 'easy',
    
    // 音效设置
    muted: false
};

// DOM 元素
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const finalScoreDisplay = document.getElementById('final-score');
const easyHighScoreDisplay = document.getElementById('easy-high-score');
const mediumHighScoreDisplay = document.getElementById('medium-high-score');
const hardHighScoreDisplay = document.getElementById('hard-high-score');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const muteBtn = document.getElementById('mute-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');

// 初始化游戏
function initGame() {
    // 从本地存储加载最高分
    const savedHighScores = localStorage.getItem('snakeHighScores');
    if (savedHighScores) {
        try {
            gameState.highScores = JSON.parse(savedHighScores);
        } catch (e) {
            console.error('解析最高分数据失败:', e);
            // 如果解析失败，使用默认值
            gameState.highScores = { easy: 0, medium: 0, hard: 0 };
        }
    } else {
        // 兼容旧版本：如果有旧的单一最高分，迁移到新格式
        const oldHighScore = localStorage.getItem('snakeHighScore');
        if (oldHighScore) {
            const score = parseInt(oldHighScore);
            gameState.highScores.easy = score;
            // 保存新格式
            localStorage.setItem('snakeHighScores', JSON.stringify(gameState.highScores));
            // 可以选择删除旧格式
            localStorage.removeItem('snakeHighScore');
        }
    }
    
    // 从本地存储加载静音设置
    const savedMuted = localStorage.getItem('snakeMuted');
    if (savedMuted !== null) {
        gameState.muted = savedMuted === 'true';
        // 更新静音按钮状态
        if (gameState.muted) {
            muteBtn.textContent = '🔇';
            muteBtn.classList.add('muted');
            muteBtn.title = '取消静音';
        }
    }
    
    // 预加载音效
    preloadSounds();
    
    // 设置画布尺寸
    updateCanvasSize();
    
    // 初始化蛇
    resetSnake();
    
    // 生成第一个食物
    generateFood();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 页面加载完成后尝试解锁音频
    setTimeout(unlockAudio, 1000);
    
    // 添加用户首次交互音频解锁
    document.addEventListener('click', function initialUnlock() {
        unlockAudio();
        document.removeEventListener('click', initialUnlock);
    }, { once: true });
    
    // 更新显示
    updateHighScoreDisplay();
}

// 更新最高分显示
function updateHighScoreDisplay() {
    // 显示当前难度的最高分（游戏界面）
    const currentHighScore = gameState.highScores[gameState.difficulty];
    highScoreDisplay.textContent = currentHighScore;
    
    // 更新所有难度的最高分（结束界面）
    easyHighScoreDisplay.textContent = gameState.highScores.easy;
    mediumHighScoreDisplay.textContent = gameState.highScores.medium;
    hardHighScoreDisplay.textContent = gameState.highScores.hard;
    
    // 高亮当前难度
    document.querySelectorAll('.high-score-row').forEach(row => {
        row.classList.remove('current-difficulty');
    });
    
    // 找到对应当前难度的行并添加高亮类
    const difficultyRow = document.querySelector(`.high-score-row:nth-child(${getDifficultyIndex(gameState.difficulty)})`);
    if (difficultyRow) {
        difficultyRow.classList.add('current-difficulty');
    }
}

// 获取难度对应的索引
function getDifficultyIndex(difficulty) {
    switch(difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 1;
    }
}

// 更新画布尺寸
function updateCanvasSize() {
    // 确保画布大小适应游戏区域大小
    canvas.width = gameState.tileSize * gameState.boardWidth;
    canvas.height = gameState.tileSize * gameState.boardHeight;
    
    // 设置画布的最大宽度不超过容器
    const maxWidth = Math.min(600, window.innerWidth * 0.9);
    if (canvas.width > maxWidth) {
        const scale = maxWidth / canvas.width;
        canvas.style.width = `${maxWidth}px`;
        canvas.style.height = `${canvas.height * scale}px`;
    } else {
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    }
}

// 重置蛇的位置和长度
function resetSnake() {
    const centerX = Math.floor(gameState.boardWidth / 2);
    const centerY = Math.floor(gameState.boardHeight / 2);
    
    gameState.snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY }
    ];
    
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
}

// 生成食物
function generateFood() {
    let foodPosition;
    
    do {
        foodPosition = {
            x: Math.floor(Math.random() * gameState.boardWidth),
            y: Math.floor(Math.random() * gameState.boardHeight)
        };
        
        // 确保食物不会出现在蛇身上
    } while (gameState.snake.some(segment => segment.x === foodPosition.x && segment.y === foodPosition.y));
    
    gameState.food = foodPosition;
}

// 设置事件监听器
function setupEventListeners() {
    // 键盘控制
    document.addEventListener('keydown', function(e) {
        // 任何键盘事件也尝试解锁音频
        unlockAudio();
        
        // 处理游戏控制
        handleKeyPress(e);
    });
    
    // 触屏控制（滑动）
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        
        // 尝试解锁音频
        unlockAudio();
    });
    
    document.addEventListener('touchend', function(e) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;
        
        // 检测滑动方向
        if (Math.abs(diffX) > Math.abs(diffY)) {
            // 水平滑动
            if (diffX > 0 && gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            } else if (diffX < 0 && gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
        } else {
            // 垂直滑动
            if (diffY > 0 && gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            } else if (diffY < 0 && gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
        }
    });
    
    // 按钮事件
    startBtn.addEventListener('click', function() {
        unlockAudio();
        startGame();
    });
    
    pauseBtn.addEventListener('click', function() {
        unlockAudio();
        togglePause();
    });
    
    restartBtn.addEventListener('click', function() {
        unlockAudio();
        restartGame();
    });
    
    // 难度选择
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 点击难度按钮也尝试解锁音频
            unlockAudio();
            
            difficultyBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新当前难度
            gameState.difficulty = this.id;
            gameState.gameSpeed = config[this.id].speed;
            gameState.speedIncrease = config[this.id].speedIncrease;
            
            // 更新显示的最高分为当前难度的最高分
            updateHighScoreDisplay();
        });
    });
    
    // 静音按钮
    muteBtn.addEventListener('click', function() {
        toggleMute();
        unlockAudio(); // 点击静音按钮时也尝试解锁音频
    });
    
    // 响应窗口大小变化
    window.addEventListener('resize', updateCanvasSize);
}

// 处理键盘输入
function handleKeyPress(e) {
    if (!gameState.gameRunning) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'ArrowDown':
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'ArrowRight':
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
        case ' ':
            // 空格键暂停/继续
            togglePause();
            break;
    }
}

// 播放音效
function playSound(sound) {
    // 如果已静音，直接返回
    if (gameState.muted) {
        return;
    }
    
    try {
        // 重置音效，确保能够连续播放
        sound.currentTime = 0;
        
        // 创建播放承诺
        const playPromise = sound.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("音效播放被阻止:", error);
                
                // 当音频被浏览器策略阻止时，我们需要在用户下一次交互时播放
                document.addEventListener('click', function resumeAudio() {
                    unlockAudio();
                    sound.play().catch(e => console.log("仍然无法播放音效:", e));
                    document.removeEventListener('click', resumeAudio);
                }, { once: true });
            });
        }
    } catch (e) {
        console.error("播放音效错误:", e);
    }
}

// 解锁音频 - 在用户交互时调用
function unlockAudio() {
    console.log("尝试解锁音频...");
    
    // 尝试播放静音的音频以解锁音频上下文
    const silentAudio = new Audio();
    silentAudio.play().catch(() => {});
    
    // 同时尝试恢复音频上下文
    if (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    
    // 解锁游戏中使用的音效
    for (const soundKey in sounds) {
        const sound = sounds[soundKey];
        sound.muted = true; // 先静音
        sound.play().catch(() => {});
        sound.pause();
        sound.currentTime = 0;
        sound.muted = false; // 恢复音量
    }
    
    console.log("音频解锁尝试完成");
}

// 开始游戏
function startGame() {
    // 先确保音频已解锁
    unlockAudio();
    
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    gameState.score = 0;
    scoreDisplay.textContent = '0';
    
    resetSnake();
    generateFood();
    
    // 开始游戏循环
    gameLoop();
}

// 暂停/继续游戏
function togglePause() {
    if (!gameState.gameRunning) return;
    
    gameState.gamePaused = !gameState.gamePaused;
    
    if (gameState.gamePaused) {
        pauseBtn.textContent = '继续';
        pauseBtn.classList.add('resume');
    } else {
        pauseBtn.textContent = '暂停';
        pauseBtn.classList.remove('resume');
        gameLoop();
    }
}

// 重新开始游戏
function restartGame() {
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// 游戏结束
function gameOver() {
    gameState.gameRunning = false;
    
    // 先解锁音频再播放音效，确保能够播放
    unlockAudio();
    
    // 播放游戏结束音效
    playSound(sounds.gameOver);
    
    // 更新当前难度的最高分
    if (gameState.score > gameState.highScores[gameState.difficulty]) {
        gameState.highScores[gameState.difficulty] = gameState.score;
        // 保存所有难度的最高分
        localStorage.setItem('snakeHighScores', JSON.stringify(gameState.highScores));
        // 更新显示
        updateHighScoreDisplay();
    }
    
    // 显示游戏结束界面
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    
    finalScoreDisplay.textContent = gameState.score;
}

// 游戏主循环
function gameLoop() {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    // 更新游戏状态
    updateGame();
    
    // 绘制游戏
    drawGame();
    
    // 设置下一帧
    setTimeout(gameLoop, gameState.gameSpeed);
}

// 更新游戏状态
function updateGame() {
    // 更新蛇的方向
    gameState.direction = gameState.nextDirection;
    
    // 获取蛇头
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch(gameState.direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // 检查是否游戏结束（碰撞边界或自身）
    if (
        head.x < 0 || 
        head.x >= gameState.boardWidth || 
        head.y < 0 || 
        head.y >= gameState.boardHeight ||
        gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
        gameOver();
        return;
    }
    
    // 将新的头部添加到蛇身前面
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 先解锁音频再播放音效，确保能够播放
        unlockAudio();
        
        // 播放吃食物音效
        playSound(sounds.eat);
        
        // 增加分数
        gameState.score += 1;
        scoreDisplay.textContent = gameState.score;
        
        // 加快游戏速度
        if (gameState.gameSpeed > 50) {
            gameState.gameSpeed -= gameState.speedIncrease;
        }
        
        // 生成新的食物
        generateFood();
    } else {
        // 如果没有吃到食物，移除蛇尾（保持长度不变）
        gameState.snake.pop();
    }
}

// 绘制游戏
function drawGame() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制蛇
    gameState.snake.forEach((segment, index) => {
        // 蛇头和蛇身使用不同颜色
        if (index === 0) {
            ctx.fillStyle = '#388E3C'; // 蛇头颜色
        } else {
            ctx.fillStyle = '#4CAF50'; // 蛇身颜色
        }
        
        ctx.fillRect(
            segment.x * gameState.tileSize, 
            segment.y * gameState.tileSize, 
            gameState.tileSize, 
            gameState.tileSize
        );
        
        // 绘制蛇身边框
        ctx.strokeStyle = '#2E7D32';
        ctx.strokeRect(
            segment.x * gameState.tileSize, 
            segment.y * gameState.tileSize, 
            gameState.tileSize, 
            gameState.tileSize
        );
    });
    
    // 绘制食物
    ctx.fillStyle = '#F44336'; // 食物颜色
    ctx.beginPath();
    ctx.arc(
        gameState.food.x * gameState.tileSize + gameState.tileSize / 2,
        gameState.food.y * gameState.tileSize + gameState.tileSize / 2,
        gameState.tileSize / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 切换静音状态
function toggleMute() {
    gameState.muted = !gameState.muted;
    
    // 更新所有音效的静音状态
    for (const sound in sounds) {
        sounds[sound].muted = gameState.muted;
    }
    
    // 更新按钮显示
    if (gameState.muted) {
        muteBtn.textContent = '🔇';
        muteBtn.classList.add('muted');
        muteBtn.title = '取消静音';
    } else {
        muteBtn.textContent = '🔊';
        muteBtn.classList.remove('muted');
        muteBtn.title = '静音';
    }
    
    // 如果正在游戏中，立即播放一个很短的提示音来确认设置更改
    if (gameState.gameRunning && !gameState.muted) {
        // 创建一个一次性的短提示音
        const testSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        testSound.volume = 0.2;
        testSound.play().catch(() => {});
    }
    
    // 保存设置到本地存储
    localStorage.setItem('snakeMuted', gameState.muted);
}

// 初始化游戏
window.addEventListener('load', initGame); 