import { useEffect } from 'react';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { Card } from '../cards/Card';
import { cardLabel } from './EventLog';

interface AskAnnouncement {
  cardId: string;
  askerPlayerId: string;
  targetPlayerId: string;
  askerName: string;
  targetName: string;
  success: boolean;
}

interface Props {
  readonly announcement: AskAnnouncement | null;
}

// ─── Wrong ask: prohibition sign zooms from tiny → half-screen → fades ────────

function WrongAskOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ scale: 0.05 }}
      animate={{ scale: [0.05, 1, 1], opacity: [1, 1, 0] }}
      transition={{ duration: 0.5, delay: 0.3, times: [0, 0.7, 1], ease: 'easeOut' }}
    >
      {/* ⊘ prohibition sign built with CSS */}
      <div className="relative flex items-center justify-center" style={{ width: '50vmin', height: '50vmin' }}>
        <div
          className="absolute inset-0 rounded-full border-red-500"
          style={{ borderWidth: '1.8vmin' }}
        />
        <div
          className="absolute bg-red-500"
          style={{ width: '100%', height: '1.8vmin', transform: 'rotate(-45deg)' }}
        />
      </div>
    </motion.div>
  );
}

// ─── Correct ask: card starts at target's seat (small, face-down), flips,
//     zooms to center, spins+travels to asker's seat, zooms small, flips down ──

function CardTravelOverlay({ cardId, askerPlayerId, targetPlayerId }: Readonly<{
  cardId: string;
  askerPlayerId: string;
  targetPlayerId: string;
}>) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // Look up real DOM positions of both player seats
      const targetRect = document
        .querySelector(`[data-player-id="${targetPlayerId}"]`)
        ?.getBoundingClientRect();
      const askerRect = document
        .querySelector(`[data-player-id="${askerPlayerId}"]`)
        ?.getBoundingClientRect();

      // Offsets from viewport center (where motion.div rests at 0,0)
      const tx = targetRect ? (targetRect.left + targetRect.width / 2) - cx : -300;
      const ty = targetRect ? (targetRect.top + targetRect.height / 2) - cy : 0;
      const ax = askerRect ? (askerRect.left + askerRect.width / 2) - cx : 300;
      const ay = askerRect ? (askerRect.top + askerRect.height / 2) - cy : 0;

      // 1. Snap to target's seat: small, face-down
      await animate(scope.current, { x: tx, y: ty, scale: 0.3, rotateY: 90, rotate: 0 }, { duration: 0 });

      // Wait for backdrop + names to render
      await new Promise<void>(r => setTimeout(r, 280));
      if (cancelled) return;

      // 2. Flip face-up (still small, still at target's seat)
      await animate(scope.current, { rotateY: 0 }, { duration: 0.35, ease: 'easeOut' });
      if (cancelled) return;

      // 3. Zoom to center (slightly below, so text above stays readable)
      await animate(scope.current, { x: 0, y: 80, scale: 1 }, { duration: 0.4, ease: 'easeOut' });
      if (cancelled) return;

      // 3b. Hold at center so everyone can read the card
      await new Promise<void>(r => setTimeout(r, 1200));
      if (cancelled) return;

      // 4. Spin + glide to asker's seat, zooming back small
      await animate(scope.current, { x: ax, y: ay, scale: 0.3, rotate: 720 }, { duration: 0.8, ease: 'easeInOut' });
      if (cancelled) return;

      // 5. Pause — card shown face-up next to asker's hand
      await new Promise<void>(r => setTimeout(r, 2000));
      if (cancelled) return;

      // 6. Flip face-down — card joins asker's hidden hand
      await animate(scope.current, { rotateY: 90 }, { duration: 0.3, ease: 'easeIn' });
    }

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ perspective: 1200 }}
    >
      <motion.div ref={scope} style={{ transformOrigin: 'center' }}>
        <div style={{ transform: 'scale(3)', transformOrigin: 'center' }}>
          <Card cardId={cardId} size="md" className="!justify-center gap-3" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main overlay ──────────────────────────────────────────────────────────────

export function AskAnnouncementOverlay({ announcement }: Props) {
  const key = announcement ? `${announcement.cardId}-${announcement.askerName}` : '';

  return (
    <>
      {/* Backdrop + names (always shown while announcement is active) */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative z-10 flex flex-col items-center gap-5"
            >
              {/* Who asked whom */}
              <div className="text-center">
                <span className="text-white text-2xl font-bold drop-shadow-lg">{announcement.askerName}</span>
                <span className="text-gray-300 text-xl mx-3">asked</span>
                <span className="text-white text-2xl font-bold drop-shadow-lg">{announcement.targetName}</span>
                <span className="text-gray-300 text-xl ml-3">for the</span>
              </div>

              {/* Card label */}
              <div className={`text-xl font-bold ${announcement.success ? 'text-green-300' : 'text-red-300'}`}>
                {cardLabel(announcement.cardId)}
              </div>

              {/* Wrong ask: show card face-up so everyone sees what was asked */}
              {!announcement.success && (
                <motion.div
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ delay: 0.15, duration: 0.3, ease: 'easeOut' }}
                  className={`drop-shadow-2xl ring-4 ring-offset-4 ring-offset-transparent rounded-2xl
                    ring-red-500`}
                >
                  <Card cardId={announcement.cardId} size="xl" className="!justify-center gap-3" />
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong ask: ⊘ zoom animation */}
      <AnimatePresence>
        {announcement && !announcement.success && (
          <WrongAskOverlay key={`wrong-${key}`} />
        )}
      </AnimatePresence>

      {/* Correct ask: card travels from target's seat to asker's seat */}
      <AnimatePresence>
        {announcement && announcement.success && (
          <CardTravelOverlay
            key={`correct-${key}`}
            cardId={announcement.cardId}
            askerPlayerId={announcement.askerPlayerId}
            targetPlayerId={announcement.targetPlayerId}
          />
        )}
      </AnimatePresence>
    </>
  );
}
