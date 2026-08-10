import React, { useRef, useEffect, useState } from 'react';
import type { BoardState, Player } from '../game/logic';
import { getLegalMoves, isLegalMove } from '../game/logic';

interface BoardProps {
  board: BoardState;
  onCellClick: (row: number, col: number) => void;
  currentPlayer: Player;
  isGameOver: boolean;
  showLegalMoves: boolean;
  winningPlayer?: Player | null;
  highlightBad?: { row: number; col: number } | null;
  highlightGood?: { row: number; col: number } | null;
  lastMove?: { row: number; col: number } | null;
  aiConsideringMove?: { row: number; col: number } | null;
  isReversed?: boolean;
  isPassing?: boolean;
  isOpponentTurn?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  board,
  onCellClick,
  currentPlayer,
  isGameOver,
  showLegalMoves,
  winningPlayer,
  highlightBad,
  highlightGood,
  lastMove,
  aiConsideringMove,
  isReversed = false,
  isPassing = false,
  isOpponentTurn = false,
}) => {
  // 直近に追加された石を追跡（アニメーション用）
  const prevBoardRef = useRef<BoardState>(board);
  const [newCells, setNewCells] = useState<Set<string>>(new Set());
  const [flippedCells, setFlippedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevBoardRef.current;
    const added = new Set<string>();
    const flipped = new Set<string>();
    const size = board.length;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // prevBoard とサイズが異なる場合（リセット直後など）はスキップ
        if (prev.length !== size) continue;
        
        const prevCell = prev[r][c];
        const currCell = board[r][c];
        if (prevCell === null && currCell !== null) {
          added.add(`${r}-${c}`);
        } else if (prevCell !== null && currCell !== null && prevCell !== currCell) {
          flipped.add(`${r}-${c}`);
        }
      }
    }

    if (added.size > 0 || flipped.size > 0) {
      setNewCells(added);
      setFlippedCells(flipped);
      const timer = setTimeout(() => {
        setNewCells(new Set());
        setFlippedCells(new Set());
      }, 500);
      prevBoardRef.current = board;
      return () => clearTimeout(timer);
    }
    prevBoardRef.current = board;
  }, [board]);

  const legalMoves = !isGameOver && showLegalMoves
    ? getLegalMoves(board, currentPlayer)
    : [];
  const legalSet = new Set(legalMoves.map(([r, c]) => `${r}-${c}`));

  const isWinnerStone = (r: number, c: number): boolean => {
    if (!winningPlayer || !isGameOver) return false;
    return board[r][c] === winningPlayer;
  };

  const size = board.length;

  return (
    <div className="board-container glass">
      <div
        className="board-grid"
        role="grid"
        aria-label="オセロ盤"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`,
        }}
      >
        {Array.from({ length: size }, (_, ri) =>
          Array.from({ length: size }, (_, ci) => {
            const r = isReversed ? size - 1 - ri : ri;
            const c = isReversed ? size - 1 - ci : ci;
            const cell = board[r][c];
            const key = `${r}-${c}`;
            const isLegal = legalSet.has(key);
            const isNew = newCells.has(key);
            const isFlipped = flippedCells.has(key);
            const isLastMove = lastMove?.row === r && lastMove?.col === c;
            const isBad = highlightBad?.row === r && highlightBad?.col === c;
            const isGood = highlightGood?.row === r && highlightGood?.col === c;
            const isAiConsidering = aiConsideringMove?.row === r && aiConsideringMove?.col === c;
            const isWin = isWinnerStone(r, c);
            const isDark = (ri + ci) % 2 === 1;

            return (
              <div
                key={`${ri}-${ci}`}
                className={`cell ${isDark ? 'cell-dark' : ''}`}
                role="gridcell"
                aria-label={`行${r + 1} 列${c + 1}${cell ? ` ${cell === 'black' ? '黒' : '白'}` : ''}`}
                data-row={r}
                data-col={c}
                onClick={() => {
                  if (!cell && !isGameOver && isLegalMove(board, r, c, currentPlayer)) {
                    onCellClick(r, c);
                  }
                }}
              >
                {/* 石 */}
                {cell && (
                  <div className="stone-wrapper">
                    <div
                      className={`stone ${cell} ${isWin ? 'highlight-win' : ''} ${isNew ? 'pop-in' : ''} ${isFlipped ? 'stone-flip-enter' : ''}`}
                    />
                  </div>
                )}

                {/* 最後の着手グロー */}
                {isLastMove && <div className="stone-last-glow" />}

                {/* 合法手インジケーター */}
                {!cell && isLegal && <div className={`legal-move-dot ${isOpponentTurn ? 'opponent' : ''}`} />}

                {/* AI推論中ハイライト */}
                {isAiConsidering && <div className="ai-considering-indicator" />}

                {/* フィードバックハイライト */}
                {isBad && cell && <div className="highlight-bad" />}
                {isGood && <div className="highlight-good" />}
              </div>
            );
          })
        )}

        {/* パス通知オーバーレイ */}
        {isPassing && (
          <div className="pass-overlay">
            <div className="pass-overlay-text">
              ⏭️ パス！<br />
              <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>合法手がないためスキップします</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
