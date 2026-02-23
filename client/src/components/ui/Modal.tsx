import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  locked?: boolean; // when true: backdrop click disabled + no close button
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', locked = false }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={locked ? undefined : onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`w-full ${maxWidth} bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl pointer-events-auto`}
              onClick={e => e.stopPropagation()}
            >
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white font-card">{title}</h2>
                  {!locked && (
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div className="p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
