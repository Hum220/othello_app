import { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from './components/Board';
import { ControlPanel } from './components/ControlPanel';
import { FeedbackModal } from './components/FeedbackModal';
import { OnlineLobby } from './components/OnlineLobby';
import type { BoardState, Player, Move } from './game/logic';
import {
  createInitialBoard,
  cloneBoard,
  applyMove,
  getLegalMoves,
  countStones,
  getWinner,
  opponent,
} from './game/logic';
import type { Difficulty } from './game/ai';
import { findBestMove, evaluateBoard } from './game/ai';
import type { TurnRecord, FeedbackItem } from './game/feedback';
import { generateFeedback } from './game/feedback';
import { audioEngine } from './utils/audio';
import { subscribeRoom, updateRoomState, type OnlineRoomData } from './game/online';

// スコアを -100〜100 にマッピング
function mapScore(score: number): number {
  if (score >= 10000) return 100;
  if (score <= -10000) return -100;
  const mapped = Math.floor((Math.abs(score) / 300) * 100);
  return Math.sign(score) * Math.min(100, mapped);
}

function App() {
  // ─── ゲーム状態 ───
  const [boardSize, setBoardSize] = useState<number>(8);
  const [board, setBoard] = useState<BoardState>(createInitialBoard(8));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<Player | null | 'draw'>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [aiProgress, setAiProgress] = useState(0); // AI思考ゲージ
  const [isPassing, setIsPassing] = useState(false); // パスオーバーレイ

  // ─── 設定 ───
  const [humanPlayer, setHumanPlayer] = useState<Player>('black');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showLegalMoves, setShowLegalMoves] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameMode, setGameMode] = useState<'vs-ai' | 'online'>('vs-ai');

  // ─── 履歴 & フィードバック ───
  const [history, setHistory] = useState<Move[]>([]);
  const [turnRecords, setTurnRecords] = useState<TurnRecord[]>([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

  // ─── 振り返りレビュー ───
  const [viewingFeedback, setViewingFeedback] = useState(false);
  const [reviewBoardState, setReviewBoardState] = useState<BoardState | null>(null);
  const [highlightBad, setHighlightBad] = useState<{ row: number; col: number } | null>(null);
  const [highlightGood, setHighlightGood] = useState<{ row: number; col: number } | null>(null);
  const [hintMove, setHintMove] = useState<{ row: number; col: number } | null>(null);

  // ─── オンライン ───
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [onlineRole, setOnlineRole] = useState<'host' | 'guest' | null>(null);
  const [myName, setMyName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const onlineModalShownRef = useRef(false);

  // ─── UI ───
  const [currentScore, setCurrentScore] = useState(0);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const aiPlayer = humanPlayer === 'black' ? 'white' : 'black';
  const isVsAI = gameMode === 'vs-ai';
  const isOnline = gameMode === 'online' && roomCode !== null;
  const isMyTurnOnline = isOnline && currentPlayer === humanPlayer;

  // トースト
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // アニメーション中フラグ（フリップ完了前のクリックを防ぐ）
  const isAnimatingRef = useRef(false);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ─── ゲームリセット ───
  const resetGame = useCallback(() => {
    setBoard(createInitialBoard(boardSize));
    setCurrentPlayer('black');
    setIsGameOver(false);
    setWinner(null);
    setIsThinking(false);
    setAiProgress(0);
    setIsPassing(false);
    setHistory([]);
    setTurnRecords([]);
    setIsFeedbackOpen(false);
    setFeedbackList([]);
    setViewingFeedback(false);
    setReviewBoardState(null);
    setHighlightBad(null);
    setHighlightGood(null);
    setHintMove(null);
    setCurrentScore(0);
    setLastMove(null);
    onlineModalShownRef.current = false;
  }, [boardSize]);

  // ─── オンライン購読 ───
  useEffect(() => {
    if (!isOnline || !roomCode) return;
    onlineModalShownRef.current = false;

    const unsubscribe = subscribeRoom(roomCode, (data: OnlineRoomData | null) => {
      if (!data) {
        showToast('対戦相手が部屋を解散しました。');
        setGameMode('vs-ai');
        setRoomCode(null);
        resetGame();
        return;
      }

      let parsedBoard: BoardState, parsedHistory: Move[];
      try {
        parsedBoard = JSON.parse(data.boardStr);
        parsedHistory = JSON.parse(data.historyStr);
      } catch {
        return;
      }

      setBoard(parsedBoard);
      setCurrentPlayer(data.currentPlayer);
      setHistory(parsedHistory);
      setIsGameOver(data.isGameOver);

      if (parsedHistory.length > 0) {
        const lm = parsedHistory[parsedHistory.length - 1];
        setLastMove({ row: lm.row, col: lm.col });
      }

      if (onlineRole === 'host' && data.guestName) setOpponentName(data.guestName);
      else if (onlineRole === 'guest' && data.hostName) setOpponentName(data.hostName);

      const updatedScore = evaluateBoard(parsedBoard, humanPlayer === 'black' ? 'white' : 'black');
      setCurrentScore(-updatedScore);

      if (data.isGameOver && data.winner) {
        let newResult: 'win' | 'lose' | 'draw' | null = null;
        if (data.winner === 'draw') newResult = 'draw';
        else newResult = data.winner === humanPlayer ? 'win' : 'lose';
        setWinner(newResult === 'win' ? humanPlayer : newResult === 'lose' ? opponent(humanPlayer) : null);

        if (!onlineModalShownRef.current) {
          onlineModalShownRef.current = true;
          if (soundEnabled) audioEngine.playWinSound();
          setTimeout(() => setIsFeedbackOpen(true), 1800);
        }
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, roomCode]);

  // ─── ゲーム終了処理 ───
  const handleGameOver = useCallback(
    (finalBoard: BoardState, finalCurrentPlayer: Player) => {
      setIsGameOver(true);
      const w = getWinner(finalBoard);
      setWinner(w);

      if (soundEnabled) {
        if (isVsAI) {
          if (w === humanPlayer) audioEngine.playWinSound();
          else if (w !== null) audioEngine.playLoseSound();
        } else {
          audioEngine.playWinSound();
        }
      }

      if (isOnline && currentPlayer === humanPlayer) {
        updateRoomState(roomCode!, finalBoard, finalCurrentPlayer, history, true, w ?? 'draw').catch(
          console.error
        );
      }
    },
    [humanPlayer, soundEnabled, isVsAI, isOnline, roomCode, history, currentPlayer]
  );

  // ─── 着手実行（2フェーズアニメーション） ───
  // Phase 1 (即時): 置いた石だけ表示 + 着手音
  // Phase 2 (300ms後): ひっくり返る石をアニメーション + フリップ音
  const executeMove = useCallback(
    (r: number, c: number, player: Player) => {
      const capturedBoard = board;
      const scoreBefore = evaluateBoard(capturedBoard, aiPlayer);
      const [newBoard, flipped] = applyMove(capturedBoard, r, c, player);
      const move: Move = { row: r, col: c, player };
      const newHistory = [...history, move];

      // ── Phase 1: 置いた石だけ即座に表示 ──
      isAnimatingRef.current = true;
      const partialBoard = cloneBoard(capturedBoard);
      partialBoard[r][c] = player;
      setBoard(partialBoard);
      setLastMove({ row: r, col: c });

      if (soundEnabled) audioEngine.playPlaceSound();

      // ── Phase 2: 300ms後にひっくり返し適用 ──
      setTimeout(() => {
        setBoard(newBoard);
        setHistory(newHistory);
        setTurnRecords((prev) => [
          ...prev,
          { turnNumber: newHistory.length, player, move, boardBefore: capturedBoard, scoreBefore },
        ]);

        if (soundEnabled && flipped.length > 0) {
          audioEngine.playFlipSound(flipped.length);
        }

        const scoreAfter = evaluateBoard(newBoard, aiPlayer);
        setCurrentScore(-scoreAfter);
        isAnimatingRef.current = false;

        // 次のプレイヤーを判定
        const nextPlayer = opponent(player);
        const nextMoves = getLegalMoves(newBoard, nextPlayer);

        if (nextMoves.length === 0) {
          const afterPassMoves = getLegalMoves(newBoard, player);
          if (afterPassMoves.length === 0) {
            handleGameOver(newBoard, nextPlayer);
            return;
          }
          if (soundEnabled) audioEngine.playPassSound();
          setIsPassing(true);
          setTimeout(() => {
            setIsPassing(false);
            setCurrentPlayer(player);
          }, 1800);
          return;
        }

        setCurrentPlayer(nextPlayer);
      }, 450);
    },
    [board, history, aiPlayer, soundEnabled, handleGameOver]
  );

  // ─── 人間の着手 ───
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (isGameOver || viewingFeedback || isThinking || isAnimatingRef.current) return;
      if (isVsAI && currentPlayer !== humanPlayer) return;
      if (isOnline && !isMyTurnOnline) return;

      setHintMove(null);
      executeMove(r, c, currentPlayer);

      // オンライン時はFirebaseに同期
      if (isOnline && isMyTurnOnline) {
        const [newBoard] = applyMove(board, r, c, currentPlayer);
        const nextPlayer = opponent(currentPlayer);
        const nextMoves = getLegalMoves(newBoard, nextPlayer);
        const move: Move = { row: r, col: c, player: currentPlayer };
        const newHistory = [...history, move];

        if (nextMoves.length === 0 && getLegalMoves(newBoard, currentPlayer).length === 0) {
          // handleGameOver が同期するので何もしない
        } else if (nextMoves.length === 0) {
          // パス → 同じプレイヤーの番
          updateRoomState(roomCode!, newBoard, currentPlayer, newHistory, false, null).catch(console.error);
        } else {
          updateRoomState(roomCode!, newBoard, nextPlayer, newHistory, false, null).catch(console.error);
        }
      }
    },
    [isGameOver, viewingFeedback, isThinking, isVsAI, currentPlayer, humanPlayer, isOnline, isMyTurnOnline, board, history, roomCode, executeMove]
  );

  // ─── AI着手のref ───
  const executeMoveRef = useRef(executeMove);
  useEffect(() => { executeMoveRef.current = executeMove; }, [executeMove]);

  // ─── AIワーカー ───
  const aiWorkerRef = useRef<Worker | null>(null);
  useEffect(() => {
    aiWorkerRef.current = new Worker(new URL('./game/ai.worker.ts', import.meta.url), { type: 'module' });
    return () => aiWorkerRef.current?.terminate();
  }, []);

  // ─── AIターン ───
  useEffect(() => {
    if (!isVsAI) return;
    if (isGameOver || currentPlayer !== aiPlayer || viewingFeedback || isPassing) return;

    const moves = getLegalMoves(board, aiPlayer);
    if (moves.length === 0) return; // AIもパス → executeMove内で処理済

    setIsThinking(true);
    const startTime = Date.now();

    const handleAiResult = (move: [number, number]) => {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 700 - elapsed);
      setTimeout(() => {
        executeMoveRef.current(move[0], move[1], aiPlayer);
        setIsThinking(false);
        setAiProgress(0);
      }, delay);
    };

    const timer = setTimeout(() => {
      if (aiWorkerRef.current) {
        aiWorkerRef.current.onmessage = (e) => {
          if (e.data.type === 'progress') {
            setAiProgress(e.data.progress);
          } else if (e.data.type === 'result') {
            handleAiResult(e.data.move);
          }
        };
        aiWorkerRef.current.postMessage({ board, aiPlayer, difficulty });
      } else {
        const best = findBestMove(board, aiPlayer, difficulty, (p) => setAiProgress(p));
        handleAiResult(best);
      }
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, isGameOver, aiPlayer, difficulty, viewingFeedback, isVsAI, isPassing]);

  // ─── ゲーム終了後フィードバック（AI対戦時） ───
  useEffect(() => {
    if (isGameOver && isVsAI && !viewingFeedback) {
      const timer = setTimeout(() => {
        const generated = generateFeedback(turnRecords, aiPlayer);
        setFeedbackList(generated);
        setIsFeedbackOpen(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, isVsAI, viewingFeedback, turnRecords, aiPlayer]);

  // ─── サウンドトグル ───
  useEffect(() => { audioEngine.toggleMute(soundEnabled); }, [soundEnabled]);

  // ─── 待った（Undo） ───
  const undoMove = useCallback(() => {
    if (viewingFeedback) {
      setViewingFeedback(false);
      setReviewBoardState(null);
      setHighlightBad(null);
      setHighlightGood(null);
      return;
    }
    if (isOnline || isThinking || history.length === 0) return;
    setHintMove(null);

    // AIとの対戦: 2手戻す（人間＋AI）
    const undoCount = isVsAI && history.length >= 2 ? 2 : 1;
    const newHistory = history.slice(0, history.length - undoCount);
    // 履歴を再適用して盤面を再構築
    let rebuilt = createInitialBoard(boardSize);
    for (const m of newHistory) {
      const [nb] = applyMove(rebuilt, m.row, m.col, m.player);
      rebuilt = nb;
    }
    setBoard(rebuilt);
    setHistory(newHistory);
    setTurnRecords(turnRecords.slice(0, turnRecords.length - undoCount));
    const nextPlayer = newHistory.length === 0 ? 'black' : opponent(newHistory[newHistory.length - 1].player);
    setCurrentPlayer(nextPlayer);
    setCurrentScore(-evaluateBoard(rebuilt, aiPlayer));
    setIsGameOver(false);
    setWinner(null);
    if (newHistory.length > 0) {
      setLastMove({ row: newHistory[newHistory.length - 1].row, col: newHistory[newHistory.length - 1].col });
    } else {
      setLastMove(null);
    }
  }, [viewingFeedback, isOnline, isThinking, history, isVsAI, turnRecords, aiPlayer, boardSize]);

  // ─── フィードバック選択 ───
  const handleSelectFeedback = (item: FeedbackItem) => {
    setIsFeedbackOpen(false);
    setViewingFeedback(true);
    setReviewBoardState(item.boardState);
    setHighlightBad({ row: item.badMove.r, col: item.badMove.c });
    setHighlightGood({ row: item.suggestedMove.r, col: item.suggestedMove.c });
  };

  // ─── ヒント ───
  const handleShowHint = () => {
    if (isGameOver || isThinking) return;
    if (isVsAI && currentPlayer !== humanPlayer) return;
    if (isOnline && !isMyTurnOnline) return;

    setIsThinking(true);
    setTimeout(() => {
      const best = findBestMove(board, currentPlayer, 'medium');
      if (best[0] !== -1) setHintMove({ row: best[0], col: best[1] });
      setIsThinking(false);
    }, 10);
  };

  // ─── 対戦記録エクスポート ───
  const handleExportHistory = () => {
    if (history.length === 0) return;
    const text = history
      .map((m, i) => {
        const col = String.fromCharCode(65 + m.col);
        const row = m.row + 1;
        const p = m.player === 'black' ? '黒' : '白';
        return `${i + 1}手目: ${p} ${col}${row}`;
      })
      .join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => showToast('対戦記録をクリップボードにコピーしました ✓'))
      .catch(() => showToast('コピーに失敗しました。'));
  };

  // ─── 表示盤面 ───
  const displayBoard = viewingFeedback && reviewBoardState ? reviewBoardState : board;
  const { black: blackCount, white: whiteCount } = countStones(displayBoard);
  const activeHighlightGood = viewingFeedback ? highlightGood : hintMove;

  // ─── 形勢ゲージ ───
  const scorePercent = mapScore(currentScore);

  // ─── オンライン番表示 ───
  const currentTurnName = isMyTurnOnline ? (myName || 'あなた') : (opponentName || '相手');
  const currentStoneEmoji = currentPlayer === 'black' ? '⚫' : '⚪';

  // 勝敗結果文字列
  const resultForModal: 'win' | 'lose' | 'draw' | null = (() => {
    if (!isGameOver) return null;
    if (winner === null || winner === 'draw') return 'draw';
    return winner === humanPlayer ? 'win' : 'lose';
  })();

  return (
    <div className="app-container">
      {/* ─── メイン（盤面エリア） ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1>⚫ オセロ ⚪</h1>

        {/* 形勢ゲージ */}
        {(isVsAI || isOnline) && (
          <div className="score-bar-container">
            <div className="score-bar-labels">
              <span style={{ color: 'var(--text-muted)' }}>
                {isOnline ? (opponentName || '相手') + '優勢' : 'AI優勢'}
              </span>
              <span style={{ color: 'var(--text-main)' }}>
                形勢: {scorePercent > 0 ? '+' : ''}{scorePercent}
              </span>
              <span style={{ color: 'var(--accent)' }}>
                {isOnline ? (myName || 'あなた') + '優勢' : 'あなた優勢'}
              </span>
            </div>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{
                  width: `${Math.abs(scorePercent) / 2}%`,
                  background: scorePercent >= 0 ? 'var(--accent)' : 'var(--text-muted)',
                  transform: scorePercent >= 0 ? 'translateX(0)' : 'translateX(-100%)',
                  transition: 'all 0.4s ease',
                }}
              />
              <div className="score-bar-center" />
            </div>
          </div>
        )}

        {/* オンライン番インジケーター */}
        {isOnline && !isGameOver && (
          <div
            className={`status-banner ${currentPlayer === 'black' ? 'black-turn' : 'white-turn'}`}
            style={{ marginBottom: '0.75rem' }}
          >
            {currentStoneEmoji}
            <span style={{ color: isMyTurnOnline ? 'var(--accent)' : 'var(--text-muted)' }}>
              {currentTurnName}
            </span>
            の番
            {isMyTurnOnline && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.3rem', animation: 'blink 1s step-end infinite' }}>
                ▶ あなた
              </span>
            )}
          </div>
        )}

        {/* 振り返りバナー */}
        {viewingFeedback && (
          <div className="review-banner" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>悪手の振り返り</h3>
            <p style={{ fontSize: '0.85rem' }}>
              🔴 赤 = あなたが打った手 &nbsp;|&nbsp; 🟢 緑 = AIが推奨する最善手
            </p>
            <button
              className="btn-secondary"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setViewingFeedback(false);
                setReviewBoardState(null);
                setHighlightBad(null);
                setHighlightGood(null);
              }}
            >
              最終盤面に戻る
            </button>
          </div>
        )}

        {/* ─── 石数スコアボード（盤面直上） ─── */}
        <div className="board-scoreboard">
          {/* 黒陣営 */}
          <div className={`board-score-card ${blackCount > whiteCount ? 'board-score-card--leading' : blackCount < whiteCount ? 'board-score-card--trailing' : ''}`}>
            <div className="board-score-icon board-score-icon--black" />
            <div className="board-score-info">
              <span className="board-score-label">黒</span>
              <span className="board-score-count">{blackCount}</span>
            </div>
            {blackCount > whiteCount && <span className="board-score-badge">リード</span>}
          </div>

          {/* 番表示 */}
          <div className="board-score-turn">
            {isGameOver ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ゲーム終了</span>
            ) : (
              <>
                <div className={`turn-indicator ${currentPlayer === 'black' ? 'turn-indicator--black' : 'turn-indicator--white'}`} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {currentPlayer === 'black' ? '黒' : '白'}の番
                </span>
              </>
            )}
          </div>

          {/* 白陣営 */}
          <div className={`board-score-card ${whiteCount > blackCount ? 'board-score-card--leading' : whiteCount < blackCount ? 'board-score-card--trailing' : ''}`} style={{ flexDirection: 'row-reverse' }}>
            <div className="board-score-icon board-score-icon--white" />
            <div className="board-score-info" style={{ textAlign: 'right' }}>
              <span className="board-score-label">白</span>
              <span className="board-score-count">{whiteCount}</span>
            </div>
            {whiteCount > blackCount && <span className="board-score-badge">リード</span>}
          </div>
        </div>

        {/* 盤面 */}
        <Board
          board={displayBoard}
          onCellClick={handleCellClick}
          currentPlayer={currentPlayer}
          isGameOver={isGameOver}
          showLegalMoves={showLegalMoves && !viewingFeedback && currentPlayer === humanPlayer}
          winningPlayer={winner === 'draw' ? null : winner}
          highlightBad={highlightBad}
          highlightGood={activeHighlightGood}
          lastMove={viewingFeedback ? null : lastMove}
          isReversed={isOnline && humanPlayer === 'white'}
          isPassing={isPassing}
        />


        {/* ゲーム終了時バナー（モーダル表示前） */}
        {isGameOver && !isFeedbackOpen && !viewingFeedback && (
          <div
            className={`status-banner ${resultForModal === 'win' ? 'leading' : ''}`}
            style={{
              marginTop: '1rem',
              background: resultForModal === 'win'
                ? 'rgba(34,197,94,0.15)'
                : resultForModal === 'lose'
                ? 'rgba(244,63,94,0.15)'
                : 'rgba(255,255,255,0.07)',
              border: `2px solid ${resultForModal === 'win' ? 'var(--success)' : resultForModal === 'lose' ? 'var(--danger)' : 'rgba(255,255,255,0.15)'}`,
              color: resultForModal === 'win' ? 'var(--success)' : resultForModal === 'lose' ? 'var(--danger)' : 'var(--text-muted)',
              fontSize: '1.1rem',
            }}
          >
            {resultForModal === 'win' && '🎉 あなたの勝ち！'}
            {resultForModal === 'lose' && '💀 あなたの負け...'}
            {resultForModal === 'draw' && '🤝 引き分け'}
          </div>
        )}
      </div>

      {/* ─── コントロールパネル ─── */}
      <ControlPanel
        humanPlayer={humanPlayer}
        setHumanPlayer={(p) => { setHumanPlayer(p); resetGame(); }}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        showLegalMoves={showLegalMoves}
        setShowLegalMoves={setShowLegalMoves}
        onReset={resetGame}
        onUndo={undoMove}
        canUndo={history.length > 0 && !isOnline}
        isThinking={isThinking}
        aiProgress={aiProgress}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onHint={handleShowHint}
        onExport={handleExportHistory}
        gameMode={gameMode}
        setGameMode={(m) => {
          if (m === 'online' && !roomCode) setIsLobbyOpen(true);
          else { setGameMode(m); resetGame(); }
        }}
        isVsAI={isVsAI}
        isOnline={isOnline}
        isMyTurn={isVsAI ? currentPlayer === humanPlayer : isMyTurnOnline}
        onOpenLobby={() => setIsLobbyOpen(true)}
        onlineRoomCode={roomCode}
        blackCount={blackCount}
        whiteCount={whiteCount}
        boardSize={boardSize}
        setBoardSize={(s) => {
          setBoardSize(s);
          setBoard(createInitialBoard(s));
          setCurrentPlayer('black');
          setIsGameOver(false);
          setWinner(null);
          setIsThinking(false);
          setAiProgress(0);
          setIsPassing(false);
          setHistory([]);
          setTurnRecords([]);
          setIsFeedbackOpen(false);
          setFeedbackList([]);
          setViewingFeedback(false);
          setReviewBoardState(null);
          setHighlightBad(null);
          setHighlightGood(null);
          setHintMove(null);
          setCurrentScore(0);
          setLastMove(null);
        }}
      />

      {/* ─── オンラインロビー ─── */}
      <OnlineLobby
        isOpen={isLobbyOpen}
        onClose={() => setIsLobbyOpen(false)}
        onRoomReady={(code, role, nickname, hostColor) => {
          setRoomCode(code);
          setOnlineRole(role);
          setGameMode('online');
          setIsLobbyOpen(false);
          setMyName(nickname);
          setOpponentName('');
          const myColor: Player = role === 'host' ? hostColor : opponent(hostColor);
          setHumanPlayer(myColor);
          resetGame();
        }}
      />

      {/* ─── フィードバックモーダル ─── */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        result={resultForModal}
        feedback={feedbackList}
        onSelectFeedback={handleSelectFeedback}
        onReset={resetGame}
        isOnlineMode={isOnline}
        blackCount={blackCount}
        whiteCount={whiteCount}
      />

      {/* ─── トースト ─── */}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
