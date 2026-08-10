import React from 'react';
import type { FeedbackItem } from '../game/feedback';
import { X, AlertTriangle, Trophy } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: 'win' | 'lose' | 'draw' | null;
  feedback: FeedbackItem[];
  onSelectFeedback: (item: FeedbackItem) => void;
  onReset: () => void;
  isOnlineMode?: boolean;
  blackCount: number;
  whiteCount: number;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  result,
  feedback,
  onSelectFeedback,
  onReset,
  isOnlineMode = false,
  blackCount,
  whiteCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{isOnlineMode ? 'オンライン対戦結果' : '対戦結果と振り返り'}</h2>
          <button style={{ background: 'transparent', padding: '0.25rem', color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* 勝敗バナー */}
        {result === 'win'  && <div className="game-status status-win">🎉 あなたの勝ち！</div>}
        {result === 'lose' && <div className="game-status status-lose">💀 あなたの負け...</div>}
        {result === 'draw' && <div className="game-status status-draw">🤝 引き分け</div>}

        {/* 石数 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1rem 0', fontSize: '1.3rem', fontWeight: 700 }}>
          <span>⚫ {blackCount}枚</span>
          <span>⚪ {whiteCount}枚</span>
        </div>

        {isOnlineMode ? (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Trophy
              size={52}
              style={{
                color: result === 'win' ? '#fbbf24' : result === 'lose' ? 'var(--text-muted)' : 'var(--accent)',
                marginBottom: '1rem',
              }}
            />
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {result === 'win'  && '素晴らしい勝利でした！また対戦しましょう。'}
              {result === 'lose' && '惜しかった！次の対戦で頑張りましょう。'}
              {result === 'draw' && 'お互い白熱した対局でした！'}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>感想とアドバイス</h3>
            {feedback.length === 0 ? (
              <p style={{ marginTop: '0.75rem' }}>
                素晴らしい対局でした！特に大きな悪手は見当たりませんでした。
              </p>
            ) : (
              <div className="feedback-list">
                <p>以下をクリックすると、当時の盤面と推奨手を確認できます。</p>
                {feedback.map((item, idx) => (
                  <div
                    key={idx}
                    className={`feedback-item ${item.type === 'blunder' ? 'bad' : ''}`}
                    onClick={() => onSelectFeedback(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectFeedback(item)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      <AlertTriangle size={16} color="var(--danger)" />
                      {item.turnNumber}手目 – 改善の余地あり
                    </div>
                    <p style={{ fontSize: '0.875rem' }}>{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isOnlineMode && (
            <button className="btn-secondary" onClick={onClose}>
              分析を閉じる
            </button>
          )}
          <button className="btn-primary" onClick={onReset}>
            もう一度プレイ
          </button>
        </div>
      </div>
    </div>
  );
};
