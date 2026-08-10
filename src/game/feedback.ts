import type { BoardState, Player, Move } from './logic';
import { cloneBoard } from './logic';
import { evaluateBoard, findBestMove } from './ai';

export interface TurnRecord {
  turnNumber: number;
  player: Player;
  move: Move;
  boardBefore: BoardState;
  scoreBefore: number; // AI視点スコア（着手前）
}

export interface FeedbackItem {
  turnNumber: number;
  type: 'blunder';
  message: string;
  badMove: { r: number; c: number };
  suggestedMove: { r: number; c: number };
  boardState: BoardState;
}

export function generateFeedback(
  history: TurnRecord[],
  aiPlayer: Player
): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];
  const humanPlayer: Player = aiPlayer === 'black' ? 'white' : 'black';

  for (let i = 0; i < history.length; i++) {
    const record = history[i];
    if (record.player !== humanPlayer) continue;

    const scoreBeforeHumanMove = record.scoreBefore;
    let scoreAfterAITurn = 0;

    if (i + 1 < history.length) {
      if (i + 2 < history.length) {
        scoreAfterAITurn = history[i + 2].scoreBefore;
      } else {
        const finalRecord = history[i + 1];
        const finalBoard = cloneBoard(finalRecord.boardBefore);
        scoreAfterAITurn = evaluateBoard(finalBoard, aiPlayer);
      }
    } else {
      continue;
    }

    // AI視点スコアの増加 = 人間にとっての悪手
    const diff = scoreAfterAITurn - scoreBeforeHumanMove;

    if (diff >= 60) {
      // 人間が打つべき最善手を探す
      const bestMoveForHuman = findBestMove(record.boardBefore, humanPlayer, 'medium');
      if (bestMoveForHuman[0] === -1) continue; // パス

      if (
        bestMoveForHuman[0] !== record.move.row ||
        bestMoveForHuman[1] !== record.move.col
      ) {
        const colChar = String.fromCharCode(65 + record.move.col);
        const rowNum = record.move.row + 1;
        const bestColChar = String.fromCharCode(65 + bestMoveForHuman[1]);
        const bestRowNum = bestMoveForHuman[0] + 1;

        feedback.push({
          turnNumber: record.turnNumber,
          type: 'blunder',
          message: `${record.turnNumber}手目 (${colChar}${rowNum}): 不利な手でした。${bestColChar}${bestRowNum} に打てば、もっと有利な形勢を保てました。`,
          badMove: { r: record.move.row, c: record.move.col },
          suggestedMove: { r: bestMoveForHuman[0], c: bestMoveForHuman[1] },
          boardState: record.boardBefore,
        });
      }
    }
  }

  return feedback;
}
