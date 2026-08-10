import { findBestMove } from './ai';
import type { Difficulty } from './ai';
import type { BoardState, Player } from './logic';

self.onmessage = (e: MessageEvent<{ board: BoardState; aiPlayer: Player; difficulty: Difficulty }>) => {
  const { board, aiPlayer, difficulty } = e.data;
  const move = findBestMove(board, aiPlayer, difficulty, (progress, currentMove) => {
    self.postMessage({ type: 'progress', progress, currentMove });
  });
  self.postMessage({ type: 'result', move });
};
