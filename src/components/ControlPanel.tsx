import React from 'react';
import type { Player } from '../game/logic';
import type { Difficulty } from '../game/ai';
import {
  RotateCcw, Undo2, Volume2, VolumeX, Lightbulb,
  Download, Users, Bot, Eye, EyeOff
} from 'lucide-react';

interface ControlPanelProps {
  humanPlayer: Player;
  setHumanPlayer: (p: Player) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  showLegalMoves: boolean;
  setShowLegalMoves: (show: boolean) => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isThinking: boolean;
  aiProgress?: number;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
  onHint: () => void;
  onExport: () => void;
  gameMode: 'vs-ai' | 'online';
  setGameMode: (m: 'vs-ai' | 'online') => void;
  isVsAI: boolean;
  isOnline: boolean;
  isMyTurn: boolean;
  onOpenLobby?: () => void;
  onlineRoomCode?: string | null;
  blackCount: number;
  whiteCount: number;
  boardSize: number;
  setBoardSize: (size: number) => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '入門',
  beginner: '初級',
  medium: '中級',
  hard: '上級',
  expert: '達人',
  master: '名人',
};

const DIFFICULTY_EMOJIS: Record<Difficulty, string> = {
  easy: '🟢',
  beginner: '🟡',
  medium: '🟠',
  hard: '🔴',
  expert: '🟣',
  master: '⚫',
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  humanPlayer,
  setHumanPlayer,
  difficulty,
  setDifficulty,
  showLegalMoves,
  setShowLegalMoves,
  onReset,
  onUndo,
  canUndo,
  isThinking,
  aiProgress,
  soundEnabled,
  setSoundEnabled,
  onHint,
  onExport,
  gameMode,
  setGameMode,
  isVsAI,
  isOnline,
  isMyTurn,
  onOpenLobby,
  onlineRoomCode,
  blackCount,
  whiteCount,
  boardSize,
  setBoardSize,
}) => {
  return (
    <div className="glass control-panel">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        ⚫ オセロ
      </h2>

      {/* 石数リアルタイム表示 */}
      <div className="stone-count-row">
        <div className={`stone-count-card ${blackCount >= whiteCount ? 'leading' : ''}`}>
          <div className="stone-count-icon black" />
          <span>{blackCount}</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>vs</span>
        <div className={`stone-count-card ${whiteCount >= blackCount ? 'leading' : ''}`}>
          <div className="stone-count-icon white" />
          <span>{whiteCount}</span>
        </div>
      </div>

      {/* ゲームモード */}
      <div className="control-group">
        <label>対戦モード</label>
        <div className="radio-group">
          <button
            type="button"
            className={`radio-btn ${gameMode === 'vs-ai' ? 'active' : ''}`}
            onClick={() => setGameMode('vs-ai')}
            aria-pressed={gameMode === 'vs-ai'}
          >
            <Bot size={14} />
            AI対戦
          </button>
          <button
            type="button"
            className={`radio-btn ${gameMode === 'online' ? 'active' : ''}`}
            onClick={() => {
              setGameMode('online');
              if (onOpenLobby) onOpenLobby();
            }}
            aria-pressed={gameMode === 'online'}
          >
            <Users size={14} />
            オンライン
          </button>
        </div>
      </div>

      {/* オンライン部屋情報 */}
      {gameMode === 'online' && (
        <div
          className="control-group"
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid var(--glass-border)',
            padding: '0.75rem',
            borderRadius: '10px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>
            {onlineRoomCode ? `部屋コード: ${onlineRoomCode}` : '部屋に未接続'}
          </div>
          <button className="btn-primary" onClick={onOpenLobby} style={{ width: '100%' }}>
            オンラインメニューを開く
          </button>
        </div>
      )}

      {/* 盤面サイズ */}
      <div className="control-group">
        <label>盤面サイズ (リセットされます)</label>
        <div className="radio-group">
          <button
            type="button"
            className={`radio-btn ${boardSize === 8 ? 'active' : ''}`}
            onClick={() => setBoardSize(8)}
            aria-pressed={boardSize === 8}
            disabled={isOnline} // オンライン時は変更不可
          >
            8 × 8
          </button>
          <button
            type="button"
            className={`radio-btn ${boardSize === 12 ? 'active' : ''}`}
            onClick={() => setBoardSize(12)}
            aria-pressed={boardSize === 12}
            disabled={isOnline}
          >
            12 × 12
          </button>
        </div>
      </div>

      {/* 自分の色（vs-AI時のみ） */}
      {isVsAI && (
        <div className="control-group">
          <label>あなたの色</label>
          <div className="radio-group">
            <button
              type="button"
              className={`radio-btn ${humanPlayer === 'black' ? 'active' : ''}`}
              onClick={() => setHumanPlayer('black')}
              aria-pressed={humanPlayer === 'black'}
            >
              ⚫ 黒 (先手)
            </button>
            <button
              type="button"
              className={`radio-btn ${humanPlayer === 'white' ? 'active' : ''}`}
              onClick={() => setHumanPlayer('white')}
              aria-pressed={humanPlayer === 'white'}
            >
              ⚪ 白 (後手)
            </button>
          </div>
        </div>
      )}

      {/* AI難易度 */}
      <div
        className="control-group"
        style={{ opacity: isVsAI ? 1 : 0.4, pointerEvents: isVsAI ? 'auto' : 'none' }}
      >
        <label>
          AIの強さ{' '}
          {!isVsAI && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'none' }}>
              (AI対戦時のみ)
            </span>
          )}
        </label>
        <div className="radio-group" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`radio-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              title={d}
            >
              {DIFFICULTY_EMOJIS[d]} {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* 表示設定 */}
      <div className="control-group">
        <label>打てる場所ガイド</label>
        <button
          type="button"
          className={`toggle-btn ${showLegalMoves ? 'active' : ''}`}
          onClick={() => setShowLegalMoves(!showLegalMoves)}
          aria-pressed={showLegalMoves}
        >
          {showLegalMoves ? <><Eye size={18} /> 表示中</> : <><EyeOff size={18} /> 非表示</>}
        </button>
      </div>

      <div className="control-group">
        <button
          className={soundEnabled ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ width: '100%' }}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          効果音: {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ヒント & 棋譜コピー */}
      <div className="control-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
        {(isVsAI || isOnline) && (
          <button
            className="btn-secondary"
            onClick={onHint}
            disabled={isThinking || (isOnline && !isMyTurn)}
            style={{ flex: 1, opacity: isOnline && !isMyTurn ? 0.45 : 1 }}
            title="AIに最善手を教えてもらう"
          >
            <Lightbulb size={16} />
            ヒント
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={onExport}
          title="対戦記録をクリップボードにコピー"
          style={{ flex: isVsAI || isOnline ? 1 : undefined, width: !(isVsAI || isOnline) ? '100%' : undefined }}
        >
          <Download size={18} />
          <span>対戦記録コピー</span>
        </button>
      </div>

      {/* 操作ボタン */}
      <div className="control-group" style={{ marginTop: 'auto', gap: '0.75rem' }}>
        <button
          className="btn-secondary"
          onClick={onUndo}
          disabled={!canUndo || isThinking || isOnline}
          style={{ opacity: (!canUndo || isThinking || isOnline) ? 0.45 : 1 }}
        >
          <Undo2 size={16} />
          待った（１手戻る）
        <button className="btn-primary" onClick={onReset}>
          <RotateCcw size={16} />
          最初からやり直す
        </button>
      </div>
    </div>
  );
};
