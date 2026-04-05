import { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const widthClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${widthClass} bg-white dark:bg-[#0f0f10] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl my-auto`}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
                {description && <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
