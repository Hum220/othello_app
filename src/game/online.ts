import { database } from '../firebase';
import { ref, set, get, onValue, update, remove } from 'firebase/database';
import type { BoardState, Player, Move } from './logic';
import { createInitialBoard } from './logic';

export interface OnlineRoomData {
  boardStr: string;
  currentPlayer: Player;
  historyStr: string;
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  lastUpdated: number;
  guestJoined?: boolean;
  hostName?: string;
  guestName?: string;
  hostColor?: Player;
}

// 5桁のランダムコードを生成
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// オセロ用DBパス（五目並べと分離）
function roomPath(code: string): string {
  return `othello-rooms/${code}`;
}

export async function createRoom(hostName: string, hostColor: Player): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const roomRef = ref(database, roomPath(code));
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      const initialData: OnlineRoomData = {
        boardStr: JSON.stringify(createInitialBoard()),
        currentPlayer: 'black',
        historyStr: JSON.stringify([]),
        isGameOver: false,
        winner: null,
        lastUpdated: Date.now(),
        guestJoined: false,
        hostName,
        hostColor,
      };
      await set(roomRef, initialData);
      return code;
    }
  }
  throw new Error('部屋コードの生成に失敗しました。しばらくしてから再度お試しください。');
}

export async function checkRoomExists(code: string): Promise<boolean> {
  const roomRef = ref(database, roomPath(code));
  const snapshot = await get(roomRef);
  return snapshot.exists();
}

export async function joinRoom(code: string, guestName: string): Promise<Player> {
  const roomRef = ref(database, roomPath(code));
  const snapshot = await get(roomRef);
  const data = snapshot.val() as OnlineRoomData;
  const hostColor: Player = data.hostColor ?? 'black';
  await update(roomRef, { guestJoined: true, guestName, lastUpdated: Date.now() });
  return hostColor;
}

export function subscribeRoom(
  code: string,
  callback: (data: OnlineRoomData | null) => void
): () => void {
  const roomRef = ref(database, roomPath(code));
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as OnlineRoomData);
    } else {
      callback(null);
    }
  });
  return () => unsubscribe();
}

export async function updateRoomState(
  code: string,
  board: BoardState,
  currentPlayer: Player,
  history: Move[],
  isGameOver: boolean,
  winner: Player | 'draw' | null
): Promise<void> {
  const roomRef = ref(database, roomPath(code));
  const data: Partial<OnlineRoomData> = {
    boardStr: JSON.stringify(board),
    currentPlayer,
    historyStr: JSON.stringify(history),
    isGameOver,
    winner,
    lastUpdated: Date.now(),
  };
  await update(roomRef, data);
}

export async function deleteRoom(code: string): Promise<void> {
  const roomRef = ref(database, roomPath(code));
  await remove(roomRef);
}
