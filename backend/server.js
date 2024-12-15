import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import Game from './models/Game.js';



dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://bb60-62-65-196-16.ngrok-free.app"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    }
});

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log('Request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
});

// CORS middleware
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:5173', 'https://bb60-62-65-196-16.ngrok-free.app'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Authenticate token middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);
        req.user = { 
            userId: decoded.id  
        };
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        let user = await User.findOne({ $or: [{ email }, { username }] });

        if (user) {
            return res.status(400).json({ 
                message: 'USER_EXISTS',
                code: 'auth.userExists'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username });

        const user = await User.findOne({ username });
        if (!user) {
            console.log('User not found:', username);
            return res.status(400).json({ 
                message: 'USER_NOT_FOUND',
                code: 'auth.userNotFound'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        
        if (!isMatch) {
            console.log('Invalid password for user:', username);
            return res.status(400).json({ 
                message: 'Invalid password',
                code: 'auth.invalidPassword'
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('Token generated for user:', username);

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'SERVER_ERROR',
            code: 'errors.serverError'
        });
    }
});

// Получение лидерборда для одиночной игры
app.get('/api/leaderboard/single', authenticateToken, async (req, res) => {
    try {
        const topPlayers = await User.find()
            .sort({ singlePlayerMaxScore: -1 })
            .limit(5)
            .select('username singlePlayerMaxScore');
        
        console.log('Single Leaderboard Players:', topPlayers);
        
        res.json({ 
            success: true, 
            data: topPlayers.map(player => ({
                username: player.username,
                maxScore: player.singlePlayerMaxScore || 0
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении лидерборда одиночной игры:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обновление максимального счета для одиночной игры
app.post('/api/score/update', authenticateToken, async (req, res) => {
    try {
        const { score } = req.body;
        console.log('Updating score for user:', req.user.userId, 'New score:', score);

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update maxScore only if the new score is higher
        if (score > (user.singlePlayerMaxScore || 0)) {
            user.singlePlayerMaxScore = score;
            await user.save();
            console.log('Score updated successfully');
            return res.json({ success: true, maxScore: user.singlePlayerMaxScore });
        }

        return res.json({ success: true, maxScore: user.singlePlayerMaxScore });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получение лидерборда для сетевой игры
app.get('/api/leaderboard/network', authenticateToken, async (req, res) => {
    try {
        const topPlayers = await User.find()
            .sort({ networkWins: -1 })
            .limit(5)
            .select('username networkWins');
        
        console.log('Network Leaderboard Players:', topPlayers);
        
        res.json({ 
            success: true, 
            data: topPlayers.map(player => ({
                username: player.username,
                wins: player.networkWins || 0
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении лидерборда сетевой игры:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user's network wins
app.post('/api/network/win', authenticateToken, async (req, res) => {
    try {
        console.log('Received network win request for user ID:', req.user.userId);
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            console.error('Пользователь не найден для ID:', req.user.userId);
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        console.log('Текущее количество побед:', user.networkWins);
        
        user.networkWins = (user.networkWins || 0) + 1;
        await user.save();
        
        console.log('Обновленное количество побед:', user.networkWins);
        
        res.json({ 
            success: true, 
            networkWins: user.networkWins 
        });
    } catch (error) {
        console.error('Ошибка при обновлении побед:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Получаем количество сыгранных игр из коллекции Game
        const gamesPlayed = await Game.countDocuments({
            $or: [
                { player1: user._id },
                { player2: user._id }
            ]
        });

        // Получаем количество игр из поля пользователя
        const userGamesPlayed = user.gamesPlayed || 0;

        // Используем большее значение из двух источников
        const totalGamesPlayed = Math.max(gamesPlayed, userGamesPlayed);

        // Обновляем поле gamesPlayed в модели пользователя, если оно отличается
        if (totalGamesPlayed !== userGamesPlayed) {
            user.gamesPlayed = totalGamesPlayed;
            await user.save();
        }

        res.json({
            username: user.username,
            email: user.email,
            networkWins: user.networkWins || 0,
            singlePlayerMaxScore: user.singlePlayerMaxScore || 0,
            networkMaxScore: user.networkMaxScore || 0,
            gamesPlayed: totalGamesPlayed
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update block color
app.post('/api/profile/color', authenticateToken, async (req, res) => {
    try {
        const { blockColor } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.blockColor = blockColor;
        await user.save();
        res.json({ message: 'Color updated successfully', blockColor });
    } catch (error) {
        console.error('Error updating block color:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Increment games played
app.post('/api/games/increment', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.gamesPlayed += 1;
        await user.save();
        res.json({ message: 'Games played incremented', gamesPlayed: user.gamesPlayed });
    } catch (error) {
        console.error('Error incrementing games played:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get match history
app.get('/api/matches/history', authenticateToken, async (req, res) => {
    try {
        // Находим все игры, где пользователь был player1 или player2
        const games = await Game.find({
            $or: [
                { player1: req.user.userId },
                { player2: req.user.userId }
            ]
        })
        .sort({ date: -1 }) // Сортировка по дате (сначала новые)
        .limit(10) // Ограничиваем 10 последними играми
        .populate('player1', 'username')
        .populate('player2', 'username');

        // Форматируем результаты для фронтенда
        const matches = games.map(game => {
            const isPlayer1 = game.player1._id.toString() === req.user.userId;
            const opponent = isPlayer1 ? game.player2 : game.player1;
            const result = game.winner.toString() === req.user.userId ? 'WIN' : 'LOSS';

            return {
                opponentName: opponent.username,
                result: result
            };
        });

        res.json({ matches });
    } catch (error) {
        console.error('Error fetching match history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// WebSocket: обработка поиска противников и начала игры
let waitingPlayer = null;
const players = new Map();
const playerSockets = new Map();
const gameStates = new Map();

// WebSocket: обработка обновления состояния игры
io.on('connection', (socket) => {
    console.log(`🔗 Игрок подключен: ${socket.id}`);

    socket.on('find-opponent', (data) => {
        if (waitingPlayer) {
            const opponentSocket = waitingPlayer;

            // Создаем игру и сохраняем сокеты
            const gameId = `${socket.id}_${opponentSocket.id}`;
            players.set(gameId, { player1: socket, player2: opponentSocket });

            // Отправляем событие начала игры с именами игроков
            opponentSocket.emit('opponent-found', { 
                opponent: { username: data.username }, 
                gameId 
            });
            socket.emit('opponent-found', { 
                opponent: { username: waitingPlayer.username }, 
                gameId 
            });

            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            waitingPlayer.username = data.username;
            socket.emit('waiting-for-opponent', { message: 'Ожидание противника...' });
        }
    });

    socket.on('opponent-game-state', (data) => {
        console.log('📥 Данные от клиента:', data);
    
        const game = players.get(data.gameId);
        console.log('🎮 Найденная игра:', game);
    
        if (game) {
            const opponentSocket = game.player1 === socket ? game.player2 : game.player1;
            console.log('🎯 Сокет оппонента:', opponentSocket);
    
            if (opponentSocket && typeof opponentSocket.emit === 'function') {
                opponentSocket.emit('opponent-game-state', data);
            } else {
                console.error('⚠️ Ошибка: Оппонентский сокет не найден или не поддерживает emit');
            }
        } else {
            console.error('⚠️ Ошибка: Игра не найдена для gameId:', data.gameId);
        }
    });

    // Обработка окончания игры
    socket.on('game-over', async ({ username, gameId, score }) => {
        try {
            console.log(`🎮 Игрок ${username} закончил игру ${gameId} со счетом ${score}`);
            
            const game = players.get(gameId);
            if (game) {
                // Получаем или создаем состояние игры
                if (!gameStates.has(gameId)) {
                    gameStates.set(gameId, {
                        player1: null,
                        player2: null
                    });
                }
                
                const gameState = gameStates.get(gameId);
                const isPlayer1 = game.player1.id === socket.id;
                
                // Сохраняем результат игрока
                if (isPlayer1) {
                    gameState.player1 = { username, score, socketId: game.player1.id };
                } else {
                    gameState.player2 = { username, score, socketId: game.player2.id };
                }
                
                // Проверяем, закончили ли оба игрока
                if (gameState.player1 && gameState.player2) {
                    console.log('Оба игрока закончили игру, определяем победителя...');
                    
                    let winner, loser;
                    // Определяем победителя по очкам
                    if (gameState.player1.score > gameState.player2.score) {
                        winner = gameState.player1;
                        loser = gameState.player2;
                    } else if (gameState.player2.score > gameState.player1.score) {
                        winner = gameState.player2;
                        loser = gameState.player1;
                    } else {
                        // При равном счете побеждает тот, кто закончил последним
                        winner = gameState.player2;
                        loser = gameState.player1;
                    }
                    
                    // Получаем ID игроков из базы данных
                    const winnerUser = await User.findOne({ username: winner.username });
                    const loserUser = await User.findOne({ username: loser.username });

                    if (!winnerUser || !loserUser) {
                        console.error('Could not find users:', winner.username, loser.username);
                        return;
                    }

                    // Создаем новую запись об игре
                    const gameRecord = new Game({
                        player1: winnerUser._id,
                        player2: loserUser._id,
                        winner: winnerUser._id
                    });
                    await gameRecord.save();

                    // Обновляем статистику победителя
                    await User.findByIdAndUpdate(winnerUser._id, { 
                        $inc: { networkWins: 1, gamesPlayed: 1 } 
                    });
                    // Обновляем статистику проигравшего
                    await User.findByIdAndUpdate(loserUser._id, { 
                        $inc: { gamesPlayed: 1 } 
                    });

                    // Update networkMaxScore for winner
                    if (winner.score > (winnerUser.networkMaxScore || 0)) {
                        await User.findByIdAndUpdate(winnerUser._id, { networkMaxScore: winner.score });
                    }

                    // Отправляем событие окончания игры обоим игрокам
                    const gameOverData = {
                        winner: winner.username,
                        loser: loser.username,
                        winnerScore: winner.score,
                        loserScore: loser.score
                    };

                    // Используем socket.id вместо playerSockets
                    io.to(winner.socketId).emit('game-over', gameOverData);
                    io.to(loser.socketId).emit('game-over', gameOverData);

                    console.log('Отправлены события game-over игрокам:', {
                        winner: winner.username,
                        winnerSocket: winner.socketId,
                        loser: loser.username,
                        loserSocket: loser.socketId
                    });

                    // Очищаем данные игры
                    players.delete(gameId);
                    gameStates.delete(gameId);
                }
            }
        } catch (error) {
            console.error('Error handling game over:', error);
        }
    });

    // Отключение игрока
    socket.on('disconnect', () => {
        console.log(`🔌 Игрок отключился: ${socket.id}`);
        
        // Находим и удаляем все игры этого игрока
        for (const [gameId, game] of players.entries()) {
            if (game.player1 === socket || game.player2 === socket) {
                players.delete(gameId);
            }
        }
        
        // Удаляем сокет из списка ожидающих
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
    });
    
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на http://0.0.0.0:${PORT}`);
    console.log('👉 Доступные маршруты:');
    console.log(' - POST /api/login');
    console.log(' - POST /api/register');
    console.log(' - GET /api/verify-token');
    console.log(' - GET /api/profile');
    console.log(' - POST /api/profile/color');
    console.log(' - GET /api/leaderboard/single');
    console.log(' - GET /api/leaderboard/network');
});
