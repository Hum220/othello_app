import React, { useState } from 'react';
import { createRoom, checkRoomExists, joinRoom } from '../game/online';
import type { Player } from '../game/logic';
import { X, Loader2, Users, Shuffle, User } from 'lucide-react';

interface OnlineLobbyProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomReady: (code: string, role: 'host' | 'guest', nickname: string, hostColor: Player) => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({ isOpen, onClose, onRoomReady }) => {
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [shuffleColors, setShuffleColors] = useState(false);

  if (!isOpen) return null;

  const trimmedNickname = nickname.trim();
  const isNicknameValid = trimmedNickname.length > 0 && trimmedNickname.length <= 12;

  const handleCreateRoom = async () => {
    if (!isNicknameValid) {
      setError('ニックネームを入力してください（1〜12文字）。');
      return;
    }
    try {
      setIsCreating(true);
      setError('');
      const hostColor: Player = shuffleColors
        ? (Math.random() < 0.5 ? 'black' : 'white')
        : 'black';
      const code = await createRoom(trimmedNickname, hostColor);
      onRoomReady(code, 'host', trimmedNickname, hostColor);
    } catch (e: unknown) {
      setError('部屋の作成に失敗しました。' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    if (!isNicknameValid) {
      setError('ニックネームを入力してください（1〜12文字）。');
      return;
    }
    try {
      setIsJoining(true);
      setError('');
      const exists = await checkRoomExists(code);
      if (!exists) {
        setError('部屋が見つかりません。コードを確認してください。');
        setIsJoining(false);
        return;
      }
      const hostColor = await joinRoom(code, trimmedNickname);
      onRoomReady(code, 'guest', trimmedNickname, hostColor);
    } catch (e: unknown) {
      setError('入室に失敗しました。' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass" style={{ maxWidth: '420px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Users size={22} /> オンライン対戦
          </h2>
          <button style={{ background: 'transparent', padding: '0.25rem', color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* ニックネーム */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <User size={14} /> ニックネーム（必須）
          </label>
          <input
            type="text"
            placeholder="あなたの名前 (最大12文字)"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(''); }}
            maxLength={12}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              border: `2px solid ${isNicknameValid ? 'var(--accent)' : nickname.length > 0 ? 'var(--danger)' : 'rgba(255,255,255,0.1)'}`,
              background: 'rgba(0, 0, 0, 0.25)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {nickname.length > 0 && !isNicknameValid && (
            <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.3rem' }}>
              1〜12文字で入力してください
            </p>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(244,63,94,0.12)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid rgba(244,63,94,0.3)' }}>
            {error}
          </div>
        )}

        {/* 部屋を作る */}
        <div style={{ padding: '1.25rem', background: 'rgba(34,197,94,0.06)', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(34,197,94,0.15)' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>新しく部屋を作る</h3>

          {/* シャッフルトグル */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Shuffle size={14} /> 先攻・後攻をランダムに決める
            </span>
            <button
              type="button"
              onClick={() => setShuffleColors((s) => !s)}
              aria-label={shuffleColors ? 'ランダムOFF' : 'ランダムON'}
              style={{
                width: '48px', height: '26px',
                borderRadius: '13px',
                background: shuffleColors ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.25s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: '3px',
                left: shuffleColors ? '25px' : '3px',
                width: '20px', height: '20px',
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.25s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: shuffleColors ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '1rem', minHeight: '1.2em' }}>
            {shuffleColors ? '🎲 先攻・後攻はランダムで決まります' : 'あなたは黒番（先攻）になります'}
          </p>

          <button
            className="btn-primary"
            onClick={handleCreateRoom}
            disabled={isCreating || isJoining || !isNicknameValid}
            style={{ width: '100%' }}
          >
            {isCreating ? <Loader2 size={18} className="spin" style={{ margin: '0 auto' }} /> : '部屋を作る'}
          </button>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.25rem', fontWeight: 600, fontSize: '0.85rem' }}>
          ── または ──
        </div>

        {/* 部屋に入る */}
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>部屋に入る</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
            友達から教えてもらったコードを入力してください。
          </p>
          <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="例: XJ3K9"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.25)',
                color: 'var(--text-main)',
                fontSize: '1.2rem',
                textAlign: 'center',
                letterSpacing: '0.2em',
                outline: 'none',
              }}
              maxLength={5}
            />
            <button
              type="submit"
              className="btn-secondary"
              disabled={isCreating || isJoining || joinCode.trim().length !== 5 || !isNicknameValid}
            >
              {isJoining ? <Loader2 size={18} className="spin" /> : '入室'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
