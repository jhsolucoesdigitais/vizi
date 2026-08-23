import React from 'react';
import { motion } from 'framer-motion';
import { User } from '../types';
import { ViewType } from '../hooks/useAppState';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

interface ConfirmLoginViewProps {
  tempUser:            User;
  setView:             (v: ViewType) => void;
  handleConfirmLogin:  () => void;
}

// ─────────────────────────────────────────────
//  Componente
// ─────────────────────────────────────────────

export default function ConfirmLoginView({
  tempUser,
  setView,
  handleConfirmLogin,
}: ConfirmLoginViewProps) {
  const firstName = tempUser.name.split(' ')[0];

  return (
    <div className="min-h-screen bg-ink-900 relative flex items-center justify-center p-6 overflow-hidden font-sans">

      {/* Glow central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
        className="relative w-full max-w-md bg-cream-50 rounded-[32px] p-8 md:p-10 shadow-2xl text-center"
      >

        {/* Ícone de casa */}
        <div className="w-16 h-16 bg-brand-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-600/25">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>

        {/* Saudação */}
        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1.5 tracking-tight">
          Quase lá, <span className="text-brand-600">{firstName}</span>!
        </h2>
        <p className="text-ink-500 font-medium text-sm mb-7">
          Confirme se seu apartamento é o:
        </p>

        {/* Destaque da unidade */}
        <div className="bg-brand-50 rounded-[28px] p-7 mb-7 border border-brand-100">
          <span className="font-display text-5xl font-bold text-brand-600 tracking-tight">
            {tempUser.block}{tempUser.floor}{tempUser.apartment}
          </span>
          <p className="mt-3 text-[10px] font-semibold uppercase text-brand-400 tracking-[0.25em]">
            Unidade Identificada
          </p>
        </div>

        {/* Ações */}
        <div className="space-y-3">
          <button
            onClick={handleConfirmLogin}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold py-4 rounded-2xl shadow-lg shadow-brand-600/20 uppercase tracking-widest text-sm active:scale-[0.98] transition-all"
          >
            Sim, está correto!
          </button>

          <button
            onClick={() => setView('login')}
            className="w-full bg-transparent text-ink-400 hover:text-ink-600 font-semibold py-2.5 rounded-2xl uppercase tracking-widest text-xs active:scale-[0.98] transition-all"
          >
            Não, quero ajustar
          </button>
        </div>

      </motion.div>
    </div>
  );
}