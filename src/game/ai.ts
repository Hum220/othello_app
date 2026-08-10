import type { BoardState, Player } from './logic';
import {
  getLegalMoves,
  applyMove,
  countStones,
  countEmpty,
  opponent,
} from './logic';

export type Difficulty = 'easy' | 'beginner' | 'medium' | 'hard' | 'expert' | 'master';

// ============================================================
// 位置スコアテーブル
// ============================================================
const POSITION_SCORES_8: number[][] = [
  [100, -25, 10,  5,  5, 10, -25, 100],
  [-25, -50,  -5, -5, -5,  -5, -50, -25],
  [ 10,  -5,  2,  2,  2,  2,  -5,  10],
  [  5,  -5,  2,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  2,  -5,   5],
  [ 10,  -5,  2,  2,  2,  2,  -5,  10],
  [-25, -50,  -5, -5, -5,  -5, -50, -25],
  [100, -25, 10,  5,  5, 10, -25, 100],
];

const POSITION_SCORES_12: number[][] = [
  [100, -25, 10,  5,  5,  5,  5,  5,  5, 10, -25, 100],
  [-25, -50, -5, -5, -5, -5, -5, -5, -5, -5, -50, -25],
  [ 10,  -5,  2,  2,  2,  2,  2,  2,  2,  2,  -5,  10],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [  5,  -5,  2,  1,  1,  1,  1,  1,  1,  2,  -5,   5],
  [ 10,  -5,  2,  2,  2,  2,  2,  2,  2,  2,  -5,  10],
  [-25, -50, -5, -5, -5, -5, -5, -5, -5, -5, -50, -25],
  [100, -25, 10,  5,  5,  5,  5,  5,  5, 10, -25, 100],
];

function getPosScore(size: number, r: number, c: number): number {
  if (size === 12) return POSITION_SCORES_12[r][c];
  return POSITION_SCORES_8[r][c];
}

function getCorners(size: number): [number, number][] {
  const m = size - 1;
  return [[0,0], [0, m], [m, 0], [m, m]];
}

function isCorner(size: number, r: number, c: number): boolean {
  return (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
}

// ============================================================
// 確定石（絶対にひっくり返らない石）の数を近似的に計算
// ============================================================
function countStableDiscs(board: BoardState, player: Player): number {
  let stable = 0;
  const size = board.length;
  const corners = getCorners(size);

  for (const [r, c] of corners) {
    if (board[r][c] === player) {
      stable++;
      // コーナーから伸びる辺の確定石を数える（簡易版）
      const directions: [number, number][][] = [
        [[0,1]], [[1,0]], [[1,1]]
      ];
      if (r === size - 1) directions[1] = [[-1, 0]];
      if (c === size - 1) { directions[0] = [[0, -1]]; directions[2] = [[r===0?1:-1, -1]]; }
      for (const dirSet of directions) {
        for (const [dr, dc] of dirSet) {
          let nr = r + dr;
          let nc = c + dc;
          while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player) {
            stable++;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }
  return stable;
}

// ============================================================
// 盤面評価関数
// ============================================================
export function evaluateBoard(board: BoardState, aiPlayer: Player): number {
  const humanPlayer = opponent(aiPlayer);
  const { black, white } = countStones(board);
  const empty = countEmpty(board);
  const total = black + white;

  // 序盤/終盤フェーズ判定
  const isEndgame = empty <= 15;
  const isMidgame = total >= 20;

  let score = 0;

  const size = board.length;

  // 1. 位置スコア（全フェーズ）
  let posScore = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === aiPlayer) posScore += getPosScore(size, r, c);
      else if (board[r][c] === humanPlayer) posScore -= getPosScore(size, r, c);
    }
  }
  score += posScore * 2;

  // 2. モビリティ差（合法手数差）- 序盤〜中盤で特に重要
  const aiMoves = getLegalMoves(board, aiPlayer).length;
  const humanMoves = getLegalMoves(board, humanPlayer).length;
  if (aiMoves + humanMoves > 0) {
    const mobilityScore = 100 * (aiMoves - humanMoves) / (aiMoves + humanMoves);
    score += mobilityScore * (isEndgame ? 1 : isMidgame ? 3 : 5);
  }

  // 3. 確定石差（コーナー付近）
  const aiStable = countStableDiscs(board, aiPlayer);
  const humanStable = countStableDiscs(board, humanPlayer);
  score += (aiStable - humanStable) * 25;

  // 4. コーナー占有ボーナス
  let cornerScore = 0;
  const corners = getCorners(size);
  for (const [r, c] of corners) {
    if (board[r][c] === aiPlayer) cornerScore += 25;
    else if (board[r][c] === humanPlayer) cornerScore -= 25;
  }
  score += cornerScore;

  // 5. 石数差（終盤のみ重視）
  const aiCount = aiPlayer === 'black' ? black : white;
  const humanCount = humanPlayer === 'black' ? black : white;
  if (isEndgame) {
    score += (aiCount - humanCount) * 10;
  } else if (isMidgame) {
    // 中盤は石を取り過ぎない方がいいこともある
    score += (aiCount - humanCount) * 0.5;
  }

  return score;
}

// ============================================================
// Zobrist Hashing
// ============================================================
const ZOBRIST_TABLE: bigint[][][] = [];
let zobristInit = false;

function initZobrist() {
  if (zobristInit) return;
  // 最大サイズ(12)で初期化しておく
  for (let r = 0; r < 12; r++) {
    ZOBRIST_TABLE[r] = [];
    for (let c = 0; c < 12; c++) {
      ZOBRIST_TABLE[r][c] = [
        BigInt(Math.floor(Math.random() * 0xFFFFFFFF)) << 32n | BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
        BigInt(Math.floor(Math.random() * 0xFFFFFFFF)) << 32n | BigInt(Math.floor(Math.random() * 0xFFFFFFFF)),
      ];
    }
  }
  zobristInit = true;
}

function computeHash(board: BoardState): bigint {
  let h = 0n;
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') h ^= ZOBRIST_TABLE[r][c][0];
      else if (board[r][c] === 'white') h ^= ZOBRIST_TABLE[r][c][1];
    }
  }
  return h;
}

// ============================================================
// 置換表 (Transposition Table)
// ============================================================
type TTEntry = {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND';
};
let transpositionTable = new Map<bigint, TTEntry>();
const TT_MAX_SIZE = 150_000;

// ============================================================
// 手の並べ替え（Move Ordering）
// ============================================================
function orderMoves(
  board: BoardState,
  moves: [number, number][],
  _player: Player
): [number, number][] {
  const size = board.length;
  const scored = moves.map(([r, c]) => {
    let score = getPosScore(size, r, c);
    // コーナーは最優先
    if (isCorner(size, r, c)) score += 500;
    return { r, c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(m => [m.r, m.c]);
}

// ============================================================
// ミニマックス + アルファベータ枝刈り
// ============================================================
function minimax(
  board: BoardState,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiPlayer: Player,
  hash: bigint,
  passCount: number
): number {
  // 置換表参照
  const ttEntry = transpositionTable.get(hash);
  if (ttEntry !== undefined && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'EXACT') return ttEntry.score;
    if (ttEntry.flag === 'LOWERBOUND') alpha = Math.max(alpha, ttEntry.score);
    else if (ttEntry.flag === 'UPPERBOUND') beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }

  const currentPlayer: Player = isMaximizing ? aiPlayer : opponent(aiPlayer);
  const moves = getLegalMoves(board, currentPlayer);

  // ゲーム終了 or 両者パス
  if (moves.length === 0) {
    if (passCount >= 1) {
      // 両者ともパス → ゲーム終了
      const { black, white } = countStones(board);
      const aiCount = aiPlayer === 'black' ? black : white;
      const humanCount = aiPlayer === 'black' ? white : black;
      return (aiCount - humanCount) * 1000;
    }
    // 一方のみパス → 相手のターン
    return minimax(board, depth, !isMaximizing, alpha, beta, aiPlayer, hash, passCount + 1);
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const orderedMoves = orderMoves(board, moves, currentPlayer);
  const playerIdx = currentPlayer === 'black' ? 0 : 1;
  const originalAlpha = alpha;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const [r, c] of orderedMoves) {
    const [newBoard] = applyMove(board, r, c, currentPlayer);
    // Zobristハッシュ更新（applyMoveで変化したセルのみ反映）
    let newHash = hash ^ ZOBRIST_TABLE[r][c][playerIdx];
    // ひっくり返った石のハッシュ更新
    // 簡易版: 全盤面再計算（精度より速度のために省略可、ここは正確に計算）
    newHash = computeHash(newBoard);

    const score = minimax(newBoard, depth - 1, !isMaximizing, alpha, beta, aiPlayer, newHash, 0);

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }

  // 置換表に記録
  let flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND' = 'EXACT';
  if (bestScore <= originalAlpha) flag = 'UPPERBOUND';
  else if (bestScore >= beta) flag = 'LOWERBOUND';
  if (transpositionTable.size < TT_MAX_SIZE) {
    transpositionTable.set(hash, { depth, score: bestScore, flag });
  }

  return bestScore;
}

// ============================================================
// 完全読み切り（パーフェクトサーチ）
// ============================================================
function perfectSearch(
  board: BoardState,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiPlayer: Player,
  passCount: number
): number {
  const currentPlayer: Player = isMaximizing ? aiPlayer : opponent(aiPlayer);
  const moves = getLegalMoves(board, currentPlayer);

  if (moves.length === 0) {
    if (passCount >= 1) {
      const { black, white } = countStones(board);
      const aiCount = aiPlayer === 'black' ? black : white;
      const humanCount = aiPlayer === 'black' ? white : black;
      return aiCount > humanCount ? 100000 : aiCount < humanCount ? -100000 : 0;
    }
    return perfectSearch(board, !isMaximizing, alpha, beta, aiPlayer, passCount + 1);
  }

  const orderedMoves = orderMoves(board, moves, currentPlayer);
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const [r, c] of orderedMoves) {
    const [newBoard] = applyMove(board, r, c, currentPlayer);
    const score = perfectSearch(newBoard, !isMaximizing, alpha, beta, aiPlayer, 0);

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }

  return bestScore;
}

// ============================================================
// 難易度別の探索深度
// ============================================================
export function getDepthByDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':     return 1;
    case 'beginner': return 2;
    case 'medium':   return 4;
    case 'hard':     return 6;
    case 'expert':   return 8;
    case 'master':   return 10;
    default:         return 4;
  }
}

/** 完全読み切りに移行する空きマス数の閾値 */
function getPerfectSearchThreshold(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'expert': return 15;
    case 'master': return 20;
    default:       return 0; // 使わない
  }
}

// ============================================================
// 最善手探索
// ============================================================
export function findBestMove(
  board: BoardState,
  aiPlayer: Player,
  difficulty: Difficulty = 'medium',
  onProgress?: (progress: number, currentMove?: [number, number]) => void
): [number, number] {
  initZobrist();
  if (transpositionTable.size > TT_MAX_SIZE) {
    transpositionTable.clear();
  }

  const moves = getLegalMoves(board, aiPlayer);
  if (moves.length === 0) return [-1, -1]; // パス
  if (moves.length === 1) return moves[0];

  const empty = countEmpty(board);
  const perfectThreshold = getPerfectSearchThreshold(difficulty);

  // 貪欲AI（入門）
  if (difficulty === 'easy') {
    let best: [number, number] = moves[0];
    let bestCount = -1;
    for (let i = 0; i < moves.length; i++) {
      const [r, c] = moves[i];
      if (onProgress) {
        onProgress(Math.floor(((i + 1) / moves.length) * 100), [r, c]);
      }
      const [, flipped] = applyMove(board, r, c, aiPlayer);
      if (flipped.length > bestCount) {
        bestCount = flipped.length;
        best = [r, c];
      }
    }
    return best;
  }

  const depth = getDepthByDifficulty(difficulty);
  const orderedMoves = orderMoves(board, moves, aiPlayer);

  const scoredMoves: { r: number; c: number; score: number }[] = [];
  const totalMoves = orderedMoves.length;

  for (let i = 0; i < totalMoves; i++) {
    const [r, c] = orderedMoves[i];
    const [newBoard] = applyMove(board, r, c, aiPlayer);
    let score: number;

    // 完全読み切り判定
    if (perfectThreshold > 0 && empty <= perfectThreshold) {
      score = perfectSearch(newBoard, false, -Infinity, Infinity, aiPlayer, 0);
    } else {
      const newHash = computeHash(newBoard);
      score = minimax(newBoard, depth - 1, false, -Infinity, Infinity, aiPlayer, newHash, 0);
    }
    scoredMoves.push({ r, c, score });
    
    if (onProgress) {
      onProgress(Math.floor(((i + 1) / totalMoves) * 100), [r, c]);
    }
  }

  // 初級はランダム性を持たせる
  if (difficulty === 'beginner') {
    scoredMoves.sort((a, b) => b.score - a.score);
    const bestScore = scoredMoves[0].score;
    const validMoves = scoredMoves.filter(m => bestScore - m.score < 50);
    const topCount = Math.min(3, Math.max(1, Math.ceil(validMoves.length * 0.3)));
    const pool = validMoves.slice(0, topCount);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return [pick.r, pick.c];
  }

  // 最高スコアを選択（同スコアはランダム）
  const bestScore = Math.max(...scoredMoves.map(m => m.score));
  const bestMoves = scoredMoves.filter(m => m.score === bestScore);
  const chosen = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return [chosen.r, chosen.c];
}
