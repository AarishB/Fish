import { useEffect } from 'react';
import { AnimatePresence, motion, useAnimate, stagger } from 'framer-motion';
import { SET_DEFINITIONS } from 'shared';
import type { SetId } from 'shared';

interface CallSetResultAnim {
  success: boolean;
  winningTeam: string;
  setId: string;
  callerName: string;
}

interface Props {
  result: CallSetResultAnim | null;
}

// ─── Gold brick brick (initial state only — useAnimate drives it) ──────────────
function GoldBrick({ className = '' }: Readonly<{ className?: string }>) {
  return (
    <motion.div
      className={`gold-bar rounded-lg shadow-xl relative overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      style={{
        background: 'linear-gradient(160deg, #fde68a 0%, #f59e0b 28%, #d97706 55%, #fbbf24 78%, #92400e 100%)',
        boxShadow: '0 6px 24px rgba(251,191,36,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
      }}
    >
      {/* shine */}
      <div
        className="absolute inset-y-0 w-8 opacity-25 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, white, transparent)', left: '20%' }}
      />
      {/* emboss lines */}
      <div className="absolute inset-x-4 top-2 h-px rounded bg-amber-300/40" />
      <div className="absolute inset-x-4 bottom-2 h-px rounded bg-amber-900/30" />
    </motion.div>
  );
}

// ─── Success: bars stack → shake → scatter → text punches through ─────────────
function SuccessOverlay({ setId, winningTeam }: Readonly<{ setId: string; winningTeam: string }>) {
  const [scope, animate] = useAnimate();
  const setLabel = SET_DEFINITIONS[setId as SetId]?.label ?? setId;

  useEffect(() => {
    let cancelled = false;
    async function sequence() {
      // 1. Stack bars in (staggered spring)
      await animate(
        '.gold-bar',
        { y: 0, opacity: 1, scale: 1 },
        { duration: 0.38, delay: stagger(0.09), ease: [0.22, 1.2, 0.36, 1] }
      );
      if (cancelled) return;

      await new Promise<void>(r => setTimeout(r, 120));
      if (cancelled) return;

      // 2. Light shake
      await animate('.gold-bar', { x: [-3, 3, -3, 3, 0] }, { duration: 0.24 });
      if (cancelled) return;

      // 3. Medium shake
      await animate('.gold-bar', { x: [-8, 8, -8, 8, 0], y: [-2, 2, -2, 0] }, { duration: 0.3 });
      if (cancelled) return;

      // 4. Heavy shake — building pressure
      await animate('.gold-bar', { x: [-15, 15, -15, 15, 0], y: [-5, 5, -5, 0] }, { duration: 0.38 });
      if (cancelled) return;

      // 5. SCATTER all bars simultaneously
      const bars = scope.current?.querySelectorAll('.gold-bar');
      const directions = [
        { x: -380, y: -220, rotate: -40 },
        { x: 400, y: -190, rotate: 44 },
        { x: -300, y: 160, rotate: -24 },
        { x: 330, y: 230, rotate: 36 },
        { x: 80, y: -340, rotate: 20 },
        { x: -120, y: 320, rotate: -50 },
      ];
      bars?.forEach((bar: Element, i: number) => {
        const d = directions[i % directions.length];
        animate(bar, { ...d, opacity: 0, scale: 0.25 }, { duration: 0.5, ease: [0.4, 0, 1, 1] });
      });

      // 6. Text PUNCHES through (starts tiny at center, bursts to large)
      await animate(
        '.result-text',
        { scale: [0.08, 1.3, 1], opacity: [0, 1, 1] },
        { duration: 0.58, times: [0, 0.62, 1], ease: 'easeOut' }
      );
      if (cancelled) return;

      // 7. Sub-info staggered fade in
      animate(
        '.result-info',
        { opacity: [0, 1], y: [14, 0] },
        { duration: 0.38, delay: stagger(0.14) }
      );
    }

    sequence();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={scope}
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #78350f 0%, #451a03 55%, #1c0a00 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, exit: { duration: 0.5 } } as object}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.18) 0%, transparent 65%)' }}
      />

      {/* Text — starts hidden behind bars (z-10), bursts through when bars scatter */}
      <div
        className="result-text relative z-10 text-center px-8"
        style={{ opacity: 0 }}
      >
        <div
          className="font-black leading-tight"
          style={{
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            color: '#fde68a',
            textShadow: '0 0 60px rgba(251,191,36,0.9), 0 0 20px rgba(251,191,36,0.6), 0 3px 12px rgba(0,0,0,0.9)',
          }}
        >
          Correctly Called!
        </div>

        <div
          className="result-info text-2xl font-bold text-white mt-3"
          style={{ opacity: 0 }}
        >
          {setLabel}
        </div>

        <div
          className="result-info text-xl font-semibold text-amber-300 mt-1"
          style={{ opacity: 0 }}
        >
          Team {winningTeam} wins the set
        </div>
      </div>

      {/* Gold bars — absolutely centered on top of text (z-20) */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-2">
          {/* Top single bar */}
          <GoldBrick className="w-32 h-9" />
          {/* Middle two */}
          <div className="flex gap-2">
            <GoldBrick className="w-32 h-10" />
            <GoldBrick className="w-32 h-10" />
          </div>
          {/* Bottom three */}
          <div className="flex gap-2">
            <GoldBrick className="w-28 h-9" />
            <GoldBrick className="w-28 h-9" />
            <GoldBrick className="w-28 h-9" />
          </div>
        </div>
      </div>

      {/* Shimmer particles (fire after scatter) */}
      {(['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9'] as const).map((id, i) => (
        <motion.div
          key={id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            background: i % 2 === 0 ? '#fbbf24' : '#fde68a',
            left: `${10 + i * 8}%`,
            top: '55%',
          }}
          initial={{ y: 0, opacity: 0, scale: 0 }}
          animate={{ y: -(80 + i * 20), opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{ delay: 1.5 + i * 0.06, duration: 1, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  );
}

// ─── Failure overlay (unchanged) ──────────────────────────────────────────────
function FailureOverlay({ setId, winningTeam, callerName }: { readonly setId: string; readonly winningTeam: string; readonly callerName: string }) {
  const setLabel = SET_DEFINITIONS[setId as SetId]?.label ?? setId;

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 3.8, duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-red-950" />

      <motion.div
        className="relative z-10 text-center px-8"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 160, damping: 16 }}
      >
        <motion.div
          className="text-7xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 1.1, duration: 0.5, times: [0, 0.6, 1] }}
        >
          ❌
        </motion.div>
        <div className="text-5xl font-black mb-3 drop-shadow-lg text-red-400">
          Incorrectly Called!
        </div>
        <div className="text-2xl text-white font-bold mb-1">{setLabel}</div>
        <div className="text-xl font-semibold text-red-300">
          Team {winningTeam} wins the set
        </div>
        {callerName && (
          <div className="text-base text-gray-400 mt-2">
            {callerName}'s wrong call handed the set to Team {winningTeam}
          </div>
        )}
      </motion.div>

      {/* Red curtain sweeps away */}
      <motion.div
        className="absolute inset-0 z-20"
        style={{
          background: 'repeating-linear-gradient(105deg, #3f0a0a 0%, #7f1d1d 20%, #450a0a 35%, #991b1b 50%, #3f0a0a 65%, #7f1d1d 80%, #3f0a0a 100%)',
        }}
        initial={{ x: 0 }}
        animate={{ x: '100%' }}
        transition={{ delay: 0.3, duration: 0.9, ease: [0.4, 0, 0.15, 1] }}
      />
    </motion.div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function CallSetResultOverlay({ result }: Props) {
  return (
    <AnimatePresence>
      {result && (
        result.success
          ? <SuccessOverlay key={`success-${result.setId}`} setId={result.setId} winningTeam={result.winningTeam} />
          : <FailureOverlay key={`fail-${result.setId}`} setId={result.setId} winningTeam={result.winningTeam} callerName={result.callerName} />
      )}
    </AnimatePresence>
  );
}
