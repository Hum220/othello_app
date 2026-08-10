// オセロ ゲームロジック

export type Player = 'black' | 'white';
export type CellState = Player | null;
export type BoardState = CellState[][];

export interface Move {
  row: number;
  col: number;
  player: Player;
}

// BOARD_SIZE は動的に決定するため削除
// 8方向
const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0,  -1],          [0,  1],
  [1,  -1], [1,  0], [1,  1],
];

/** size×size 初期配置（中央4マスに黒白） */
export function createInitialBoard(size: number = 8): BoardState {
  const board: BoardState = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  const mid = size / 2;
  board[mid - 1][mid - 1] = 'white';
  board[mid - 1][mid]     = 'black';
  board[mid][mid - 1]     = 'black';
  board[mid][mid]         = 'white';
  return board;
}

/** ディープコピー */
export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row]);
}

/** (row, col) に player が石を置いた時にひっくり返る石の座標一覧 */
export function getFlippedStones(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): [number, number][] {
  if (board[row][col] !== null) return [];
  const opponent: Player = player === 'black' ? 'white' : 'black';
  const flipped: [number, number][] = [];

  const size = board.length;
  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === opponent) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // lineの末端が自分の石なら有効
    if (
      line.length > 0 &&
      r >= 0 && r < size && c >= 0 && c < size &&
      board[r][c] === player
    ) {
      flipped.push(...line);
    }
  }

  return flipped;
}

/** (row, col) が player にとって合法手かどうか */
export function isLegalMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): boolean {
  if (board[row][col] !== null) return false;
  return getFlippedStones(board, row, col, player).length > 0;
}

/** player の合法手一覧を返す */
export function getLegalMoves(
  board: BoardState,
  player: Player
): [number, number][] {
  const moves: [number, number][] = [];
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isLegalMove(board, r, c, player)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
}

/** 石を置いて裏返した新しい盤面を返す（イミュータブル）。
 *  戻り値は [新しい盤面, 裏返した石の座標一覧] */
export function applyMove(
  board: BoardState,
  row: number,
  col: number,
  player: Player
): [BoardState, [number, number][]] {
  const flipped = getFlippedStones(board, row, col, player);
  if (flipped.length === 0) return [board, []]; // 不正手

  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  for (const [r, c] of flipped) {
    newBoard[r][c] = player;
  }
  return [newBoard, flipped];
}

/** 石数カウント */
export function countStones(board: BoardState): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === 'black') black++;
      else if (cell === 'white') white++;
    }
  }
  return { black, white };
}

/** 空きマス数 */
export function countEmpty(board: BoardState): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) count++;
    }
  }
  return count;
}

/** ゲーム終了判定：両者とも合法手なし */
export function checkGameOver(board: BoardState): boolean {
  return (
    getLegalMoves(board, 'black').length === 0 &&
    getLegalMoves(board, 'white').length === 0
  );
}

/** 石数で勝者を決定。null = 引き分け */
export function getWinner(board: BoardState): Player | null {
  const { black, white } = countStones(board);
  if (black > white) return 'black';
  if (white > black) return 'white';
  return null;
}

/** 相手プレイヤー */
export function opponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}
