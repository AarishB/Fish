import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import type { ToastType } from '../../store/useGameStore';

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 border-green-400',
  error: 'bg-red-700 border-red-400',
  info: 'bg-gray-700 border-gray-500',
  gold: 'bg-amber-600 border-amber-400',
};

function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const removeToast = useGameStore(s => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 4000);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`px-4 py-3 rounded-lg border text-white text-sm font-medium shadow-lg cursor-pointer ${typeStyles[type]}`}
      onClick={() => removeToast(id)}
    >
      {message}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useGameStore(s => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
