import React, { useState, useEffect, useRef, useCallback, useContext, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useTranslation } from 'react-i18next';
import './TetrisGame.css';

const TetrisGame = forwardRef(({ isLocalPlayer = true, networkMode = false, onGameStateUpdate, onScoreUpdate, onGameOver, initialScore = 0 }, ref) => {
    const { user } = useContext(AuthContext);
    const { t } = useTranslation();
    const [score, setScore] = useState(initialScore);
    const [opponentScore, setOpponentScore] = useState(0);
    const [nextPiece, setNextPiece] = useState(null);
    const nextPieceCanvasRef = useRef(null);
    const nextPieceCtxRef = useRef(null);
    const nextPieceSceneRef = useRef(null);
    const nextPieceRendererRef = useRef(null);
    const nextPieceCameraRef = useRef(null);
    const gameContainerRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const playerRef = useRef({
        pos: { x: 0, y: 0, side: 0 },
        matrix: null,
        score: 0,
        clearing: false
    });
    const arenasRef = useRef(null);
    const parallelepiped = useRef(null);
    const currentBlocksRef = useRef([]);
    const fallenBlocksRef = useRef([]);
    const dropCounterRef = useRef(0);
    const lastTimeRef = useRef(0);
    const dropIntervalRef = useRef(1000);
    const requestAnimationFrameId = useRef(null);
    const navigate = useNavigate();
    const [isGameOver, setIsGameOver] = useState(false);
    const [showGameOverModal, setShowGameOverModal] = useState(false);
    const stopGame = useCallback(() => {
        console.log('Stopping game...');
        setIsGameOver(true);
        if (requestAnimationFrameId.current) {
            cancelAnimationFrame(requestAnimationFrameId.current);
            requestAnimationFrameId.current = null;
        }
        window.removeEventListener('keydown', handleKeyDown);
        dropCounterRef.current = 0;
        dropIntervalRef.current = 1000;
        setShowGameOverModal(true);
    }, []);

    const GAME_CONFIG = useRef({
        width: 12,
        height: 20,
        depth: 12,
        sides: 4
    }).current;

    const createArena = useCallback((width, height) => {
        const arena = [];
        while (height--) {
            arena.push(new Array(width).fill(0));
        }
        return arena;
    }, []);

    const createPiece = useCallback((type) => {
        const pieces = {
            'T': [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0],
            ],
            
            'L': [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0],
            ],
            'J': [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0],
            ],
            'S': [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0],
            ],
            'Z': [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0],
            ],
            'O': [
                [1, 1],
                [1, 1],
            ],
            'I': [
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
                [0, 1, 0, 0],
            ],
        };
        return pieces[type];
    }, []);

    const getRandomColor = useCallback(() => {
        const customColor = localStorage.getItem(`blockColor_${user?.id}`) || '#00f0f0';
        return new THREE.Color(customColor);
    }, [user]);

    
  

    const drawBlock = useCallback((x, y, side, color) => {
      const blockSize = 0.9;
      const geometry = new THREE.BoxGeometry(blockSize, blockSize, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: color });
      const cube = new THREE.Mesh(geometry, material);
  
      const halfHeight = GAME_CONFIG.height / 2;
      const halfWidth = GAME_CONFIG.width / 2;
      const halfDepth = GAME_CONFIG.depth / 2;
  
      switch (side) {
          case 0: 
              cube.position.set(x - halfWidth + 0.5, halfHeight - y - 0.5, halfDepth);
              break;
          case 1: 
              cube.position.set(halfWidth, halfHeight - y - 0.5, halfDepth - x - 0.5);
              cube.rotation.y = -Math.PI / 2;
              break;
          case 2: 
              cube.position.set(halfWidth - x - 0.5, halfHeight - y - 0.5, -halfDepth);
              cube.rotation.y = Math.PI;
              break;
          case 3: 
              cube.position.set(-halfWidth, halfHeight - y - 0.5, x - halfDepth + 0.5);
              cube.rotation.y = Math.PI / 2;
              break;
      }
  
      sceneRef.current.add(cube);
      currentBlocksRef.current.push(cube);
      return cube;
  }, []);
  
  const drawBlockOnAllSides = useCallback((x, y, color) => {
    for (let side = 0; side < GAME_CONFIG.sides; side++) {
        drawBlock(x, y, side, color);
    }
}, [drawBlock]);

    const clearCurrentBlocks = useCallback(() => {
        currentBlocksRef.current.forEach(block => {
            sceneRef.current.remove(block);
            block.geometry.dispose();
            block.material.dispose();
        });
        currentBlocksRef.current = [];
    }, []);

    const drawMatrix = useCallback((matrix, offset, color) => {
      matrix.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  drawBlock(x + offset.x, y + offset.y, playerRef.current.pos.side, color);
              }
          });
      });
      for (let side = 0; side < GAME_CONFIG.sides; side++) {
          if (side !== playerRef.current.pos.side) {
              arenasRef.current[side].forEach((row, y) => {
                  row.forEach((value, x) => {
                      if (value !== 0) {
                          drawBlock(x, y, side, 0xaaaaaa);
                      }
                  });
              });
          }
      }
  }, [drawBlock]);
  
  

    const collide = useCallback((arena, player) => {
        const m = player.matrix;
        const o = player.pos;
        
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (arena[y + o.y] &&
                        arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }, []);

    const checkGameOver = useCallback(() => {
        if (!playerRef.current || !arenasRef.current) return false;
        const hasBlocksInTopRow = arenasRef.current[playerRef.current.pos.side][0].some(cell => cell !== 0);
        
        if (hasBlocksInTopRow) {
            setIsGameOver(true);
            if (onGameOver) {
                onGameOver(score);
            }
            return true;
        }
        return false;
    }, [onGameOver, score]);

    
    

    const createBlock = useCallback((x, y, side, color) => {
        const blockSize = 0.9;
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, 0.1);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const cube = new THREE.Mesh(geometry, material);

        const halfHeight = GAME_CONFIG.height / 2;
        const halfWidth = GAME_CONFIG.width / 2;
        const halfDepth = GAME_CONFIG.depth / 2;

        switch (side) {
            case 0: 
                cube.position.set(x - halfWidth + 0.5, halfHeight - y, halfDepth);
                break;
            case 1: 
                cube.position.set(halfWidth, halfHeight - y, halfDepth - x - 0.5);
                cube.rotation.y = -Math.PI / 2;
                break;
            case 2: 
                cube.position.set(halfWidth - x - 0.5, halfHeight - y, -halfDepth);
                cube.rotation.y = Math.PI;
                break;
            case 3: 
                cube.position.set(-halfWidth, halfHeight - y, x - halfDepth + 0.5);
                cube.rotation.y = Math.PI / 2;
                break;
        }

        cube.visible = false;
        sceneRef.current.add(cube);
        fallenBlocksRef.current.push(cube);
        return cube;
    }, []);

    const playerMove = useCallback((dir) => {
        const player = playerRef.current;
        player.pos.x += dir;
        
        if (collide(arenasRef.current[player.pos.side], player)) {
            player.pos.x -= dir;
            player.pos.side = (player.pos.side + dir + GAME_CONFIG.sides) % GAME_CONFIG.sides;
            
            if (collide(arenasRef.current[player.pos.side], player)) {
                player.pos.side = (player.pos.side - dir + GAME_CONFIG.sides) % GAME_CONFIG.sides;
            } else {
                player.pos.x += dir;
                if (collide(arenasRef.current[player.pos.side], player)) {
                    player.pos.x -= dir;
                }
            }
            rotateParallelepiped(dir);
        }
    }, [collide]);

    const rotateParallelepiped = useCallback((dir) => {
      const rotationAngle = Math.PI / 2;
      const rotationAxis = new THREE.Vector3(0, 1, 0);
      const rotateMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, dir * rotationAngle);
  
      parallelepiped.current.applyMatrix4(rotateMatrix);
      updateCameraPosition();
  }, []);

  const playerReset = useCallback(() => {
    const player = playerRef.current;
    const pieces = 'ILJOTSZ';
    if (nextPiece) {
        player.matrix = nextPiece;
    } else {
        player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    }
    const newNextPiece = createPiece(pieces[pieces.length * Math.random() | 0]);
    setNextPiece(newNextPiece);
    
    player.pos.y = 0;
    player.pos.x = (arenasRef.current[player.pos.side][0].length / 2 | 0) -
                  (player.matrix[0].length / 2 | 0);
    if (collide(arenasRef.current[player.pos.side], player)) {
        if (!isGameOver) {
            stopGame();
            setShowGameOverModal(true);
            if (onGameOver) {
                onGameOver(score);
            }
        }
    }
}, [createPiece, collide, isGameOver, onGameOver, score, nextPiece]);

const saveScore = useCallback(async (username, score) => {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    const userIndex = leaderboard.findIndex(entry => entry.username === username);
    
    if (userIndex !== -1) {
        if (leaderboard[userIndex].maxScore < score) {
            leaderboard[userIndex].maxScore = score;
        }
    } else {
        leaderboard.push({ username, maxScore: score });
    }
    
    leaderboard.sort((a, b) => b.maxScore - a.maxScore);
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/score/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ score })
        });
        
        if (!response.ok) {
            console.error('Failed to update score on server');
            return;
        }

        const data = await response.json();
        console.log('Score updated successfully:', data);
    } catch (error) {
        console.error('Error saving score to server:', error);
    }
}, []);

const arenaSweep = useCallback(() => {
    console.log('[DEBUG] Starting arenaSweep');
    const player = playerRef.current;
    if (player.clearing) {
        console.log('[DEBUG] Already clearing, skipping arenaSweep');
        return;
    }
    
    player.clearing = true;
    let fullRows = [];
    for (let y = GAME_CONFIG.height - 1; y >= 0; y--) {
        let rowComplete = true;
        for (let side = 0; side < GAME_CONFIG.sides; side++) {
            for (let x = 0; x < GAME_CONFIG.width; x++) {
                if (arenasRef.current[side][y][x] === 0) {
                    rowComplete = false;
                    break;
                }
            }
            if (!rowComplete) break;
        }
        if (rowComplete) {
            console.log('[DEBUG] Found complete row at y:', y);
            fullRows.push(y);
        }
    }

    console.log('[DEBUG] Full rows found:', fullRows.length);

    if (fullRows.length > 0 && !isGameOver) {
        fullRows.forEach(row => {
            for (let side = 0; side < GAME_CONFIG.sides; side++) {
                arenasRef.current[side].splice(row, 1);
                arenasRef.current[side].unshift(new Array(GAME_CONFIG.width).fill(0));
            }
        });

        fallenBlocksRef.current.forEach(block => {
            const halfHeight = GAME_CONFIG.height / 2;
            const rowsClearedBelow = fullRows.filter(r =>
                block.position.y < halfHeight - r
            ).length;

            if (rowsClearedBelow > 0) {
                block.position.y += rowsClearedBelow;
            }
        });

        const newScore = player.score + fullRows.length * 100;
        player.score = newScore;

        requestAnimationFrame(() => {
            setScore(newScore);
            if (user?.username) {
                saveScore(user.username, newScore);
            }
            if (networkMode && onGameStateUpdate) {
                onGameStateUpdate({
                    gameState: arenasRef.current[player.pos.side],
                    player: player,
                    score: newScore,
                });
            }
            player.clearing = false;
        });
    } else {
        player.clearing = false;
    }
}, [isGameOver, user, saveScore, networkMode, onGameStateUpdate]);


const merge = useCallback((arena, player) => {
    console.log('[DEBUG] Merge function called');
    if (isGameOver || player.clearing) return;
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
    const minY = player.pos.y;
    const maxY = player.pos.y + player.matrix.length;
    let hasFilledRow = false;
    
    for (let y = minY; y < maxY && !hasFilledRow; y++) {
        if (y >= 0 && y < GAME_CONFIG.height) {
            let isRowFull = true;
            for (let x = 0; x < GAME_CONFIG.width; x++) {
                if (arena[y][x] === 0) {
                    isRowFull = false;
                    break;
                }
            }
            if (isRowFull) {
                hasFilledRow = true;
            }
        }
    }
    
    if (hasFilledRow) {
        console.log('[DEBUG] Found filled row, calling arenaSweep');
        arenaSweep();
    }
}, [arenaSweep, isGameOver]);


  const playerDrop = useCallback(() => {
    const player = playerRef.current;
    if (player.clearing) return;
    player.pos.y++;

    if (collide(arenasRef.current[player.pos.side], player)) {
        player.pos.y--;
        merge(arenasRef.current[player.pos.side], player);
        playerReset();

    }
    dropCounterRef.current = 0;
}, [collide, merge, playerReset, arenaSweep]);

    const playerRotate = useCallback((dir) => {
        const player = playerRef.current;
        const pos = player.pos.x;
        let offset = 1;
        
        rotate(player.matrix, dir);
        
        while (collide(arenasRef.current[player.pos.side], player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
    }, [collide]);

    const rotate = useCallback((matrix, dir) => {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }

        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }, []);

    

     

    

    const instantDrop = useCallback(() => {
    const player = playerRef.current;
    let dropDistance = 0;
    while (!collide(arenasRef.current[player.pos.side], player)) {
        player.pos.y++;
        dropDistance++;
    }
    if (dropDistance > 0) {
        player.pos.y--;
        merge(arenasRef.current[player.pos.side], player);
        playerReset();
        arenaSweep();
    }
}, [collide, merge, playerReset, arenaSweep]);

    const updateCameraPosition = useCallback(() => {
        const halfHeight = GAME_CONFIG.height / 2;
        const halfWidth = GAME_CONFIG.width / 2;
        const halfDepth = GAME_CONFIG.depth / 2;
        const player = playerRef.current;

        switch (player.pos.side) {
            case 0: 
                cameraRef.current.position.set(0, 0, halfDepth + 30);
                cameraRef.current.lookAt(0, 0, halfDepth);
                break;
            case 1: 
                cameraRef.current.position.set(halfWidth + 30, 0, 0);
                cameraRef.current.lookAt(halfWidth, 0, 0);
                break;
            case 2: 
                cameraRef.current.position.set(0, 0, -halfDepth - 30);
                cameraRef.current.lookAt(0, 0, -halfDepth);
                break;
            case 3: 
                cameraRef.current.position.set(-halfWidth - 30, 0, 0);
                cameraRef.current.lookAt(-halfWidth, 0, 0);
                break;
        }
    }, []);

    useEffect(() => {
        window.gameRef = ref;
        return () => {
            window.gameRef = null;
        };
    }, [ref]);

    useEffect(() => {
        window.tetrisGameState = {
            arenas: arenasRef,
            gameConfig: GAME_CONFIG
        };
        return () => {
            window.tetrisGameState = null;
        };
    }, []);

    const updateScore = useCallback(() => {
        const player = playerRef.current;
        if (player && Math.abs(player.score - score) >= 100) {
            requestAnimationFrame(() => {
                setScore(player.score);
                if (user && user.username) {
                    saveScore(user.username, player.score);
                }
            });
        }
    }, [user, saveScore, score]);

    useEffect(() => {
        if (score !== 0 && onScoreUpdate) {
            onScoreUpdate(score);
        }
    }, [score, onScoreUpdate]);

    const updateDropInterval = useCallback(() => {
        dropIntervalRef.current = Math.max(100, 1000 - playerRef.current.score)
        
        }, []);

        
        const update = useCallback(() => {
            const now = Date.now();
            const deltaTime = now - lastTimeRef.current;
            lastTimeRef.current = now;
            dropCounterRef.current += deltaTime;
            if (dropCounterRef.current > dropIntervalRef.current) {
                playerDrop();
            }
            
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.clear();
                clearCurrentBlocks();
                if (playerRef.current && arenasRef.current) {
                    drawMatrix(arenasRef.current[playerRef.current.pos.side], { x: 0, y: 0 }, 0x808080);
                    drawMatrix(playerRef.current.matrix, playerRef.current.pos, playerRef.current.color);
                }
                updateCameraPosition();
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        }, [playerDrop, clearCurrentBlocks, drawMatrix, updateCameraPosition]);
        const handleKeyDown = (event) => {
            if (!isLocalPlayer) return;
            
            switch (event.keyCode) {
                case 37: 
                    playerMove(-1);
                    break;
                case 39: 
                    playerMove(1);
                    break;
                case 40: 
                    playerDrop();
                    break;
                case 38: 
                    playerRotate(1);
                    break;
                case 32: 
                    instantDrop();
                    break;
                case 80: 
                    if (arenasRef.current && playerRef.current) {
                        const currentSide = playerRef.current.pos.side;
                        for (let x = 0; x < GAME_CONFIG.width; x++) {
                            arenasRef.current[currentSide][GAME_CONFIG.height - 1][x] = 1;
                        }
                    }
                    break;
                default:
                    break;
            }
        };
        useEffect(() => {
            
    
            if (isLocalPlayer) {
                window.addEventListener('keydown', handleKeyDown);
            }
    
            return () => {
                if (isLocalPlayer) {
                    window.removeEventListener('keydown', handleKeyDown);
                }
            };
        }, [isLocalPlayer, playerMove, playerDrop, playerRotate, instantDrop]);

        useEffect(() => {
            const container = gameContainerRef.current;
            if (container.querySelector('canvas')) {
                return;
            }
    
            sceneRef.current = new THREE.Scene();
            const FRAME_RATE = 24;
            const FRAME_INTERVAL = 1000 / FRAME_RATE;
            const aspect = container.clientWidth / container.clientHeight;
            cameraRef.current = new THREE.PerspectiveCamera(50, aspect, 0.9, 2000);
            rendererRef.current = new THREE.WebGLRenderer({
                preserveDrawingBuffer: true,
                powerPreference: "high-performance",
                antialias: true
            });
            
            rendererRef.current.setSize(container.clientWidth, container.clientHeight);
            container.appendChild(rendererRef.current.domElement);
            const geometry = new THREE.BoxGeometry(
                GAME_CONFIG.width,
                GAME_CONFIG.height,
                GAME_CONFIG.depth
            );
    
            const edgesGeometry = new THREE.EdgesGeometry(geometry);
            const edgesMaterial = new THREE.LineBasicMaterial({ color: "#FFFFFF" });
            const edgesMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            parallelepiped.current = edgesMesh;
            sceneRef.current.add(edgesMesh);
            arenasRef.current = Array.from({ length: GAME_CONFIG.sides }, () =>
                createArena(GAME_CONFIG.width, GAME_CONFIG.height)
            );
    
            playerRef.current = {
                pos: { x: 0, y: 0, side: 0 },
                matrix: createPiece('T'),
                color: getRandomColor(),
                score: 0
            };
            cameraRef.current.position.z = 50;
            lastTimeRef.current = Date.now();
            const handleResize = () => {
                const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
                const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
                if (vw <= 768) {
                    const width = vw * 0.8;
                    const height = vh * 0.7;
                    
                    if (cameraRef.current && rendererRef.current) {
                        cameraRef.current.aspect = width / height;
                        cameraRef.current.updateProjectionMatrix();
                        rendererRef.current.setSize(width, height);
                    }
                } else {
                    const width = vw * 0.4;
                    const aspectRatio = 4 / 3;
                    const height = width / aspectRatio;

                    if (cameraRef.current && rendererRef.current) {
                        cameraRef.current.aspect = width / height;
                        cameraRef.current.updateProjectionMatrix();
                        rendererRef.current.setSize(width, height);
                    }
                }
            };

            window.addEventListener('resize', handleResize);
            handleResize();
            const gameLoop = () => {
                if (!rendererRef.current || !sceneRef.current || !cameraRef.current || isGameOver) {
                    return;
                }
    
                const currentTime = Date.now();
                const deltaTime = currentTime - lastTimeRef.current;
                lastTimeRef.current = currentTime;
    
                if (isLocalPlayer) {
                    if (arenasRef.current[playerRef.current.pos.side][0].some(cell => cell !== 0)) {
                        if (!networkMode) {
                            handleGameOver();
                        } else if (onGameOver) {
                            onGameOver(score);
                        }
                        stopGame();
                        return;
                    }
    
                    dropCounterRef.current += deltaTime;
                    if (dropCounterRef.current > dropIntervalRef.current) {
                        playerDrop();
                    }
                    if (onGameStateUpdate && !isGameOver) {
                        onGameStateUpdate({
                            gameState: arenasRef.current[playerRef.current.pos.side],
                            player: {
                                pos: playerRef.current.pos,
                                matrix: playerRef.current.matrix,
                                color: playerRef.current.color
                            },
                            score: score
                        });
                    }
                }
    
                rendererRef.current.render(sceneRef.current, cameraRef.current);
                requestAnimationFrameId.current = requestAnimationFrame(gameLoop);
            };
            gameLoop();
            return () => {
                window.removeEventListener('resize', handleResize);
                cancelAnimationFrame(requestAnimationFrameId.current);
    
                if (rendererRef.current) {
                    rendererRef.current.dispose();
                    rendererRef.current.forceContextLoss();
                    rendererRef.current = null;
                }
    
                if (sceneRef.current) {
                    sceneRef.current.traverse((object) => {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => material.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    });
                    sceneRef.current = null;
                }
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            };
        }, [isLocalPlayer, GAME_CONFIG.width, GAME_CONFIG.height, GAME_CONFIG.depth, GAME_CONFIG.sides]);
      
        
        const handleGameOver = useCallback(async () => {
            if (!user?.id) return;

            setShowGameOverModal(true);
            if (score > 0) {
                await saveScore(user.username, score);
            }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/games/increment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    console.error('Failed to increment games count');
                }
            } catch (error) {
                console.error('Error incrementing games count:', error);
            }
        }, [user, score, saveScore]);

        useEffect(() => {
            if (!rendererRef.current || !sceneRef.current || !cameraRef.current || isGameOver) {
                if (requestAnimationFrameId.current) {
                    cancelAnimationFrame(requestAnimationFrameId.current);
                    requestAnimationFrameId.current = null;
                }
                return;
            }
        
            const gameLoop = () => {
                if (isGameOver) {
                    if (requestAnimationFrameId.current) {
                        cancelAnimationFrame(requestAnimationFrameId.current);
                        requestAnimationFrameId.current = null;
                    }
                    return;
                }
        
                const currentTime = Date.now();
                const deltaTime = currentTime - lastTimeRef.current;
                lastTimeRef.current = currentTime;
        
                if (isLocalPlayer) {
                    if (arenasRef.current[playerRef.current.pos.side][0].some(cell => cell !== 0)) {
                        handleGameOver();
                        return;
                    }
        
                    dropCounterRef.current += deltaTime;
                    if (dropCounterRef.current > dropIntervalRef.current) {
                        playerDrop();
                    }
                }
        
                rendererRef.current.clear();
                clearCurrentBlocks();
        
                if (arenasRef.current && playerRef.current) {
                    drawMatrix(arenasRef.current[playerRef.current.pos.side], { x: 0, y: 0 }, 0x808080);
                    drawMatrix(playerRef.current.matrix, playerRef.current.pos, playerRef.current.color);
                }
        
                updateCameraPosition();
                rendererRef.current.render(sceneRef.current, cameraRef.current);
                requestAnimationFrameId.current = requestAnimationFrame(gameLoop);
            };
        
            gameLoop();
        
            return () => {
                if (requestAnimationFrameId.current) {
                    cancelAnimationFrame(requestAnimationFrameId.current);
                    requestAnimationFrameId.current = null;
                }
            };
        }, [isLocalPlayer, networkMode, drawMatrix, updateCameraPosition, clearCurrentBlocks, 
            playerDrop, isGameOver, handleGameOver]);

            const updateOpponentGameState = (newState) => {
                if (!newState.gameState || !newState.player || !newState.player.pos) {
                    console.warn('Получены некорректные данные состояния противника:', newState);
                    return;
                }

                if (newState.isGameOver) {
                    setIsGameOver(true);
                    if (onGameOver) {
                        onGameOver(newState.score);
                    }
                    return;
                }
    
                const opponentSide = newState.player.pos.side;
                arenasRef.current[opponentSide] = newState.gameState.map(row => [...row]);
                playerRef.current = {
                    pos: { ...newState.player.pos },
                    matrix: newState.player.matrix.map(row => [...row]),
                    color: newState.player.color,
                    score: newState.score || 0
                };
                if (newState.score !== undefined && newState.score !== score) {
                    setScore(newState.score);
                    if (onScoreUpdate) {
                        onScoreUpdate(newState.score);
                    }
                }
                clearCurrentBlocks();
                for (let side = 0; side < GAME_CONFIG.sides; side++) {
                    if (arenasRef.current[side]) {
                        drawMatrix(arenasRef.current[side], { x: 0, y: 0 }, 0x808080);
                    }
                }
                drawMatrix(
                    playerRef.current.matrix,
                    playerRef.current.pos,
                    playerRef.current.color
                );
                rendererRef.current.render(sceneRef.current, cameraRef.current);
                console.log('🎮 Сторона противника:', opponentSide);
                console.log('🎨 Обновление арены:', arenasRef.current);
                console.log('🎯 Фигура противника:', playerRef.current);
            };

            useEffect(() => {
                if (!isLocalPlayer && initialScore !== undefined) {
                    setScore(initialScore);
                }
            }, [isLocalPlayer, initialScore]);

            useImperativeHandle(ref, () => ({
                updateGameState: updateOpponentGameState,
                stopGame,
                fillFirstRow: () => {
                    if (!arenasRef.current) {
                        console.error('Арены не инициализированы');
                        return;
                    }
                    for (let side = 0; side < GAME_CONFIG.sides; side++) {
                        for (let x = 0; x < GAME_CONFIG.width; x++) {
                            arenasRef.current[side][GAME_CONFIG.height - 2][x] = 1;
                        }
                    }
                    console.log('Ряд заполнен на всех сторонах');
                }
            }));

            
        
            const handleNewGame = () => {
                if (requestAnimationFrameId.current) {
                    cancelAnimationFrame(requestAnimationFrameId.current);
                    requestAnimationFrameId.current = null;
                }
                setShowGameOverModal(false);
                setIsGameOver(false);
                setScore(0);
                setOpponentScore(0);
                arenasRef.current = Array.from({ length: GAME_CONFIG.sides }, () =>
                    createArena(GAME_CONFIG.width, GAME_CONFIG.height)
                );
                playerRef.current = {
                    pos: { x: Math.floor(GAME_CONFIG.width / 2) - 1, y: 0, side: 0 },
                    matrix: createPiece('T'),
                    color: getRandomColor(),
                    score: 0
                };
                dropCounterRef.current = 0;
                dropIntervalRef.current = 1000;
                lastTimeRef.current = Date.now();
            };
        
            const handleReturnToMenu = () => {
                navigate('/menu');
            };

            const initNextPiecePreview = useCallback(() => {
                if (!isLocalPlayer) return;
            
                const container = document.createElement('div');
                container.className = 'next-piece-preview';
            
                const label = document.createElement('div');
                label.textContent = t('game.next_piece');
                label.style.color = 'white';
                label.style.marginBottom = '4px';
                label.style.textAlign = 'center';
                label.style.fontSize = '12px';
                container.appendChild(label);
            
                const canvas = document.createElement('canvas');
                canvas.width = 50;
                canvas.height = 50;
                nextPieceCanvasRef.current = canvas;
                nextPieceCtxRef.current = canvas.getContext('2d');
                container.appendChild(canvas);
            
                gameContainerRef.current.appendChild(container);
            }, [isLocalPlayer, t]);

            const updateNextPiecePreview = useCallback(() => {
                if (!isLocalPlayer || !nextPiece || !nextPieceCtxRef.current) return;

                const ctx = nextPieceCtxRef.current;
                const canvas = nextPieceCanvasRef.current;
                const blockSize = 12;
                ctx.fillStyle = '#242424';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const blockColor = localStorage.getItem(`blockColor_${user?.id}`) || '#00f0f0';
                let minX = nextPiece[0].length;
                let maxX = 0;
                let minY = nextPiece.length;
                let maxY = 0;

                nextPiece.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value !== 0) {
                            minX = Math.min(minX, x);
                            maxX = Math.max(maxX, x);
                            minY = Math.min(minY, y);
                            maxY = Math.max(maxY, y);
                        }
                    });
                });
                const pieceWidth = (maxX - minX + 1) * blockSize;
                const pieceHeight = (maxY - minY + 1) * blockSize;
                const offsetX = (canvas.width - pieceWidth) / 2 - minX * blockSize;
                const offsetY = (canvas.height - pieceHeight) / 2 - minY * blockSize;
                nextPiece.forEach((row, y) => {
                    row.forEach((value, x) => {
                        if (value !== 0) {
                            ctx.fillStyle = blockColor;
                            ctx.fillRect(
                                offsetX + x * blockSize,
                                offsetY + y * blockSize,
                                blockSize - 1,
                                blockSize - 1
                            );
                        }
                    });
                });
            }, [isLocalPlayer, nextPiece, user?.id, t]);
            useEffect(() => {
                if (isLocalPlayer) {
                    initNextPiecePreview();
                }
            }, [initNextPiecePreview, isLocalPlayer]);
            useEffect(() => {
                updateNextPiecePreview();
            }, [nextPiece, updateNextPiecePreview]);

    return (
        <>
            <div className="tetris-container" style={{ position: 'relative' }}>
                <div className="score" style={{ color: 'white', fontSize: '20px', marginBottom: '10px' }}>
                    {`${isLocalPlayer ? t('game.score') : t('game.opponent')}: ${score}`}
                </div>
                <div id='game-container' ref={gameContainerRef} style={{ display: 'flex', justifyContent: 'center' }} />
                {isLocalPlayer && (
                    <div className="controls" style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '10px', 
                        marginTop: '10px',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <button onClick={() => playerMove(-1)} style={buttonStyle}>←</button>
                        <button onClick={() => playerDrop()} style={buttonStyle}>D</button>
                        <button onClick={() => instantDrop()} style={buttonStyle}>↓</button>
                        <button onClick={() => playerRotate(1)} style={buttonStyle}>R</button>
                        <button onClick={() => playerMove(1)} style={buttonStyle}>→</button>
                    </div>
                )}
            </div>
            {showGameOverModal && !networkMode && (
                <div className="game-over-modal">
                    <div className="modal-content">
                        <h2>{t('game.game_over')}</h2>
                        <p>{t('game.score')}: {score}</p>
                        <div className="modal-buttons">
                            <button onClick={handleNewGame}>
                                {t('game.new_game')}
                            </button>
                            <button onClick={handleReturnToMenu}>
                                {t('game.return_to_menu')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
    const buttonStyle = {
        backgroundColor: 'transparent',
        color: 'white',
        border: '1px solid white',
        borderRadius: '5px',
        padding: '10px 20px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    };
    TetrisGame.displayName = 'TetrisGame';
    export default TetrisGame;