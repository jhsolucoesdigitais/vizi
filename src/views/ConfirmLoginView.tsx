import React from 'react';
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
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-6 overflow-hidden">

      {/* Glow central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#FEFEFE] rounded-[40px] p-10 shadow-2xl scale-in-center text-center">

        {/* Ícone de casa */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100 rotate-3">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>

        {/* Saudação */}
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic leading-tight tracking-tight">
          Quase lá, <span className="text-blue-600">{firstName}</span>!
        </h2>
        <p className="text-slate-400 font-medium text-sm mb-8">
          Confirme se seu apartamento é o:
        </p>

        {/* Destaque da unidade */}
        <div className="bg-blue-50 rounded-[32px] p-8 mb-8 border border-blue-100 shadow-inner">
          <span className="text-6xl font-black text-blue-600 italic tracking-tighter drop-shadow-sm">
            {tempUser.block}{tempUser.floor}{tempUser.apartment}
          </span>
          <p className="mt-4 text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">
            Unidade Identificada
          </p>
        </div>

        {/* Ações */}
        <div className="space-y-4">
          <button
            onClick={handleConfirmLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-100 uppercase tracking-widest active:scale-95 transition-all"
          >
            Sim, está correto!
          </button>

          <button
            onClick={() => setView('login')}
            className="w-full bg-transparent text-slate-400 hover:text-slate-600 font-bold py-3 rounded-3xl uppercase tracking-widest text-xs active:scale-95 transition-all"
          >
            Não, quero ajustar
          </button>
        </div>

      </div>
    </div>
  );
}