import React from 'react';

type StrategyGuideProps = {
  onBack: () => void;
};

export const StrategyGuide: React.FC<StrategyGuideProps> = ({ onBack }) => {
  return (
    <div className="strategy-guide-container">
      {/* ヒーローセクション */}
      <div className="strategy-hero">
        <button className="btn-back" onClick={onBack}>
          ← ゲームに戻る
        </button>
        <div className="strategy-hero-content">
          <h1>オセロ必勝法・定石ガイド</h1>
          <p>初心者から上級者まで、勝率を劇的に上げる6つの極意</p>
        </div>
      </div>

      <div className="strategy-content">
        <section className="strategy-intro">
          <p>
            オセロは「覚えるのは1分、極めるのは一生」と言われるほど奥深いゲームです。
            絶対に勝てる「魔法の手」はありませんが、先人たちが築き上げた<strong>定石</strong>や<strong>考え方（セオリー）</strong>を知ることで、あなたの勝率は見違えるほど上がります。
          </p>
        </section>

        <h2>【初級編】まずはここから！基本の3か条</h2>

        {/* 1. 序盤は石を取りすぎない */}
        <article className="strategy-card">
          <div className="strategy-card-text">
            <h3>1. 序盤は石を取りすぎない</h3>
            <p>
              初心者が最も陥りやすい罠が「序盤からたくさん石をひっくり返してしまう」ことです。
              オセロでは、自分の石が多いということは<strong>「相手が打てる場所（選択肢）が多い」</strong>ことを意味します。
              序盤は相手に選択肢を与えないよう、あえて少なく石を取るのが鉄則です。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-less-is-more">
            <div className="othello-disc black small"></div>
            <div className="vs-text">vs</div>
            <div className="othello-disc white large"></div>
          </div>
        </article>

        {/* 2. X打ち・C打ちを避ける */}
        <article className="strategy-card reverse">
          <div className="strategy-card-text">
            <h3>2. 危険地帯「X打ち」と「C打ち」を避ける</h3>
            <p>
              盤面の四隅（角）の斜め内側を<strong>「X（エックス）」</strong>、角の上下左右を<strong>「C（シー）」</strong>と呼びます。
              ここに打つと、相手に決定的な有利となる「角」を簡単に奪われてしまいます。
              相手から強制されない限り、序盤〜中盤でXやCには絶対に打たないようにしましょう。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-xc-squares">
            <div className="grid-mini">
              <div className="cell corner">角</div><div className="cell c-square">C</div><div className="cell"></div>
              <div className="cell c-square">C</div><div className="cell x-square">X</div><div className="cell"></div>
              <div className="cell"></div><div className="cell"></div><div className="cell"></div>
            </div>
          </div>
        </article>

        {/* 3. 角を確実に取る */}
        <article className="strategy-card">
          <div className="strategy-card-text">
            <h3>3. 勝負の分かれ目「角」を確実に取る</h3>
            <p>
              角（四隅）に置かれた石は、ゲーム終了まで絶対にひっくり返されることがありません。これを<strong>確定石（かくていせき）</strong>と呼びます。
              角を取ることで、辺への展開が有利になり、最終的な石数で圧倒的な差を生み出します。
              相手を誘導し、いかにして自分が角を取るかがオセロの醍醐味です。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-corners">
            <div className="glow-board">
              <div className="glow-corner top-left"></div>
              <div className="glow-corner top-right"></div>
              <div className="glow-corner bottom-left"></div>
              <div className="glow-corner bottom-right"></div>
            </div>
          </div>
        </article>

        <h2>【中級編】相手をコントロールする戦術</h2>

        {/* 4. 中割り */}
        <article className="strategy-card reverse">
          <div className="strategy-card-text">
            <h3>4. 必修手筋「中割り（なかわり）」</h3>
            <p>
              中割りとは、<strong>「相手の石に囲まれている内側の石だけを裏返す」</strong>打ち方のことです。
              これにより、自分の石を盤面の外側に露出させず、相手の打てる場所を増やさないまま自分の手番を終えることができます。
              中盤戦は、この中割りをいかに多く打てるかの勝負と言っても過言ではありません。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-nakawari">
            <div className="nakawari-demo">
              <div className="row"><div className="cell white"></div><div className="cell white"></div><div className="cell white"></div></div>
              <div className="row"><div className="cell white"></div><div className="cell black pulse"></div><div className="cell white"></div></div>
              <div className="row"><div className="cell white"></div><div className="cell white"></div><div className="cell white"></div></div>
            </div>
          </div>
        </article>

        {/* 5. 辺の形（ウイング・マウンテン） */}
        <article className="strategy-card">
          <div className="strategy-card-text">
            <h3>5. 確定石を増やす「辺の形」</h3>
            <p>
              辺（一番外側の列）に石を置く際は形に注意が必要です。
              例えば、5つの石が並んだ<strong>「ウイング」</strong>という形は、相手に角を取られやすくなる「悪形」です。
              逆に、角から連続して石を置くことで、決して返されない確定石のブロックを構築していくのが勝利への近道です。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-wing">
            <div className="wing-demo">
              <div className="cell"></div><div className="cell black"></div><div className="cell black"></div><div className="cell black"></div><div className="cell black"></div><div className="cell black"></div><div className="cell"></div><div className="cell"></div>
            </div>
            <span className="caption">危険なウイングの形</span>
          </div>
        </article>

        <h2>【上級編】ロジカルに勝ち切る</h2>

        {/* 6. 偶数理論 */}
        <article className="strategy-card reverse">
          <div className="strategy-card-text">
            <h3>6. 究極の終盤戦術「偶数理論」</h3>
            <p>
              終盤、空きマスの数が重要になります。オセロの基本は<strong>「相手に偶数個の空きマスがあるエリアに打たせる」</strong>ことです。
              相手が先に打てば、自分がそのエリアの最後の1マス（手止まり）を打つことができます。
              この手番のコントロール（偶数理論）をマスターすれば、終盤の逆転を許さない圧倒的な強さを手に入れられます。
            </p>
          </div>
          <div className="strategy-illustration css-illustration-parity">
            <div className="math-concept">
              <span className="number">2</span>
              <span className="math-operator">→</span>
              <span className="number">1</span>
              <span className="math-operator">→</span>
              <span className="number">0</span>
            </div>
            <span className="caption">手止まり（最後に打つ権利）を確保する</span>
          </div>
        </article>

        <div className="strategy-footer">
          <button className="btn-primary large" onClick={onBack}>
            学んだ知識で対戦してみる
          </button>
        </div>
      </div>
    </div>
  );
};
