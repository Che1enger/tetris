import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import io from "socket.io-client";
import { AuthContext } from "./AuthContext";
import TetrisGame from "./TetrisGame";
import "./network.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_URL = "http://backend2-hazel.vercel.app";
const SOCKET_URL = "http://backend2-hazel.vercel.app";

const NetworkedTetris = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [opponentFieldClass, setOpponentFieldClass] = useState("game-field");
    const [gameStatus, setGameStatus] = useState("searching");
    const [opponent, setOpponent] = useState(null);
    const [gameId, setGameId] = useState(null);
    const [localScore, setLocalScore] = useState(0);
    const [opponentScore, setOpponentScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [winnerScore, setWinnerScore] = useState(0);
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const lastSentState = useRef(null);

    const socketRef = useRef(null);
    const localGameRef = useRef(null);
    const opponentGameRef = useRef(null);

    const handleNewGame = () => {
        setGameOver(false);
        setShowWinnerModal(false);
        setWinner(null);
        setWinnerScore(0);
        setGameStatus("searching");
        setOpponent(null);

        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token: localStorage.getItem("token")
            }
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("🔌 Подключено к серверу");
            socket.emit("find-opponent", { username: user.username });
        });

        socket.on("connect_error", error => {
            console.error("🔥 Ошибка подключения:", error);
            navigate("/menu");
        });

        socket.on("waiting-for-opponent", () => {
            console.log("🔍 Ожидание противника");
            setGameStatus("searching");
        });

        socket.on("game-start", data => {
            console.log("🎮 Игра начинается:", data);
            setGameStatus("playing");
            setOpponent(data.opponent);
            setGameId(data.gameId);
        });

        socket.on("opponent-game-state", data => {
            if (opponentGameRef.current) {
                console.log("📥 Получено состояние от противника:", data);
                setOpponentScore(data.score || 0);
                opponentGameRef.current.updateGameState({
                    gameState: data.gameState,
                    player: {
                        pos: data.player.pos,
                        matrix: data.player.matrix,
                        color: data.player.color
                    },
                    score: data.score
                });
            }
        });
    };

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token: localStorage.getItem("token")
            }
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("🔌 Подключено к серверу");
            socket.emit("find-opponent", { username: user.username });
        });

        socket.on("connect_error", error => {
            console.error("🔥 Ошибка подключения:", error);
            navigate("/menu");
        });

        socket.on("waiting-for-opponent", () => {
            setGameStatus("searching");
            setGameOver(false);
            setWinner(null);
            setWinnerScore(0);
        });

        socket.on("game-start", data => {
            setGameStatus("playing");
            setOpponent(data.opponent);
            setGameId(data.gameId);
        });

        socket.on("opponent-game-state", data => {
            if (opponentGameRef.current) {
                console.log("📥 Получено состояние от противника:", data);
                setOpponentScore(data.score || 0);
                opponentGameRef.current.updateGameState({
                    gameState: data.gameState,
                    player: {
                        pos: data.player.pos,
                        matrix: data.player.matrix,
                        color: data.player.color
                    },
                    score: data.score
                });
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user?.username, navigate]);

    useEffect(() => {
        const socket = socketRef.current;

        if (socket) {
            socket.on("opponent-found", data => {
                console.log("👥 Найден противник:", data);
                setOpponent(data.opponent.username);
                setGameId(data.gameId);
                setGameStatus("playing");
            });

            socket.on("waiting-for-opponent", data => {
                console.log("🔍 Ожидание противника:", data);
                setGameStatus("searching");
            });

            return () => {
                socket.off("opponent-found");
                socket.off("waiting-for-opponent");
            };
        }
    }, []);

    useEffect(() => {
        if (gameOver && winner) {
            setShowWinnerModal(true);
        }
    }, [gameOver, winner]);

    const handleGameStateUpdate = gameState => {
        const currentState = {
            gameState: gameState.gameState,
            player: {
                pos: gameState.player.pos,
                matrix: gameState.player.matrix,
                color: gameState.player.color
            },
            score: gameState.score
        };

        if (isStateChanged(lastSentState.current, currentState)) {
            lastSentState.current = currentState;
            console.log("📤 Отправляем обновленное состояние:", currentState);
            socketRef.current.emit("opponent-game-state", {
                username: user.username,
                gameId,
                ...currentState
            });
        }
    };

    const handleGameOver = score => {
        console.log("🎮 Игра окончена");
        if (localGameRef.current) {
            console.log("👋 Останавливаем игру");
            localGameRef.current.stopGame();
        }

        if (socketRef.current) {
            console.log("📣 Отправляем сообщение о завершении игры:", {
                username: user.username,
                gameId,
                score: localScore
            });
            socketRef.current.emit("game-over", {
                username: user.username,
                gameId,
                score: localScore
            });
        }

        setGameStatus("waiting");
    };

    useEffect(() => {
        const socket = socketRef.current;

        if (socket) {
            socket.on("game-over", data => {
                console.log("📣 Получено сообщение о завершении игры:", data);
                if (localGameRef.current) {
                    console.log("👋 Останавливаем игру");
                    localGameRef.current.stopGame();
                }

                if (opponentGameRef.current) {
                    console.log("👋 Останавливаем игру противника");
                    opponentGameRef.current.stopGame();
                }

                setGameOver(true);
                setWinner(data.winner);
                setWinnerScore(data.winnerScore);
                setGameStatus("finished");
                setShowWinnerModal(true);
                socket.disconnect();
            });

            return () => {
                socket.off("game-over");
            };
        }
    }, []);

    const handleLocalScoreUpdate = score => {
        setLocalScore(score);
    };

    const isStateChanged = (lastState, currentState) => {
        if (!lastState) return true;

        if (lastState.player.pos.x !== currentState.player.pos.x ||
            lastState.player.pos.y !== currentState.player.pos.y ||
            lastState.player.pos.side !== currentState.player.pos.side) {
            return true;
        }

        if (JSON.stringify(lastState.player.matrix) !== JSON.stringify(currentState.player.matrix)) {
            return true;
        }

        if (JSON.stringify(lastState.gameState) !== JSON.stringify(currentState.gameState)) {
            return true;
        }

        if (lastState.score !== currentState.score) {
            return true;
        }

        return false;
    };

    const renderGameStatus = () => {
        if (gameStatus === "searching") {
            return (
                <div className="status-message">
                    <div>{t("game.searching")}</div>
                    <div className="player-info">
                        {t("game.you")}: {user?.username}
                    </div>
                </div>
            );
        } else if (gameStatus === "waiting") {
            return (
                <div className="status-message waiting">
                    <div>{t("game.waiting")}</div>
                    <div className="score-info">
                        <div>
                            {t("game.yourScore")}: {localScore}
                        </div>
                        <div>
                            {t("game.opponentScore")}: {opponentScore}
                        </div>
                    </div>
                </div>
            );
        } else if (gameStatus === "playing") {
            return (
                <div className="game-fields-container">
                    <div className="game-field">
                        <div className="player-name">{user?.username}</div>
                        <TetrisGame
                            ref={localGameRef}
                            isLocalPlayer={true}
                            networkMode={true}
                            onGameStateUpdate={handleGameStateUpdate}
                            onScoreUpdate={handleLocalScoreUpdate}
                            onGameOver={handleGameOver}
                        />
                    </div>
                    <div className="game-field">
                        <div className="player-name">{opponent || t("game.opponent")}</div>
                        <TetrisGame
                            ref={opponentGameRef}
                            isLocalPlayer={false}
                            networkMode={true}
                            initialScore={opponentScore}
                            onScoreUpdate={score => setOpponentScore(score)}
                        />
                    </div>
                </div>
            );
        }

        return null;
    };

    const handleReturnToMenu = async () => {
        if (winner) {
            try {
                const token = localStorage.getItem("token");
                console.log("Token:", token);
                console.log("Current User:", user);

                const scoreResponse = await fetch(`${API_URL}/api/score/update`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ score: winnerScore })
                });

                if (winner === user.username) {
                    const winResponse = await fetch(`${API_URL}/api/network/win`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (!winResponse.ok) {
                        console.error("🚫 Не удалось обновить количество побед");
                        const errorText = await winResponse.text();
                        console.error("Ошибка:", errorText);
                    }
                }

                if (!scoreResponse.ok) {
                    console.error("🚫 Не удалось обновить максимальный счет");
                    const errorText = await scoreResponse.text();
                    console.error("Ошибка:", errorText);
                }
            } catch (error) {
                console.error("🚫 Ошибка при сохранении результатов:", error);
            }
        }

        navigate("/menu");
    };

    const handleResize = () => {
        if (window.innerWidth < 736) {
            setOpponentFieldClass("opponent-field");
        } else {
            setOpponentFieldClass("game-field");
        }
    };

    useEffect(() => {
        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <div className="network-tetris-container">
            {renderGameStatus()}
            {showWinnerModal && (
                <div className="game-over-modal">
                    <div className="game-over-content">
                        <h2>{t("game.gameOver")}</h2>
                        <p>
                            {t("game.winner")}: {winner}
                        </p>
                        <p>
                            {t("game.winnerScore")}: {winnerScore}
                        </p>
                        <div className="game-over-buttons">
                            <button onClick={handleNewGame}>{t("game.newGame")}</button>
                            <button onClick={handleReturnToMenu}>{t("game.return_to_menu")}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkedTetris;