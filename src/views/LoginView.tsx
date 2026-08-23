import React from 'react';
import { motion } from 'framer-motion';
import { Condominio } from '../types';
import { ViewType } from '../hooks/useAppState';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

interface LoginViewProps {
  currentCondo:      Condominio | null;
  setView:           (v: ViewType) => void;
  handleLoginSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

// ─────────────────────────────────────────────
//  Máscara de WhatsApp (inline no onChange)
// ─────────────────────────────────────────────

const applyPhoneMask = (e: React.ChangeEvent<HTMLInputElement>) => {
  let v = e.target.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);

  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (v.length > 5) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (v.length > 0) {
    v = v.replace(/^(\d*)/, '($1');
  }

  e.target.value = v;
};

// ─────────────────────────────────────────────
//  Componente
// ─────────────────────────────────────────────

export default function LoginView({ currentCondo, setView, handleLoginSubmit }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-ink-900 relative flex items-center justify-center p-6 overflow-hidden font-sans">

      {/* Glows de fundo */}
      <div className="absolute -top-[10%] -right-[10%] w-[400px] h-[400px] bg-brand-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] bg-accent-500/15 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0 }}
        className="relative w-full max-w-md bg-cream-50 rounded-[32px] p-8 md:p-10 shadow-2xl"
      >

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/logo.png"
            alt="VIZI"
            className="h-24 w-auto object-contain"
          />
          <div className="mt-5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-brand-600 leading-none">
              Vendas e Serviços
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase text-ink-500 ml-1 tracking-wider">
              Nome / Apelido
            </label>
            <input
              name="name"
              required
              placeholder="Ex: João da Silva"
              className="w-full bg-black/[0.03] border border-transparent text-ink-900 placeholder:text-ink-400 rounded-2xl p-4 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-200 transition-all font-medium"
            />
          </div>

          {/* Bloco / Andar / Final */}
          <div className="grid grid-cols-3 gap-2.5">

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-ink-500 ml-1 tracking-wider text-center block">
                {currentCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'}
              </label>
              <select
                name="block"
                className="w-full bg-black/[0.03] border border-transparent text-ink-900 rounded-2xl p-4 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-200 transition-all font-medium appearance-none text-center cursor-pointer"
              >
                {currentCondo && Array.from({ length: currentCondo.settings.quantity }, (_, i) => {
                  const label = currentCondo.settings.namingType === 'number'
                    ? (i + 1).toString()
                    : String.fromCharCode(65 + i);
                  return <option key={i} value={label}>{label}</option>;
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-ink-500 ml-1 tracking-wider text-center block">
                Andar
              </label>
              <select
                name="floor"
                className="w-full bg-black/[0.03] border border-transparent text-ink-900 rounded-2xl p-4 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-200 transition-all font-medium appearance-none text-center cursor-pointer"
              >
                {currentCondo && Array.from({ length: currentCondo.settings.floors + 1 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? 'Térreo' : i}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase text-ink-500 ml-1 tracking-wider text-center block">
                Final
              </label>
              <select
                name="apartment"
                className="w-full bg-black/[0.03] border border-transparent text-ink-900 rounded-2xl p-4 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-200 transition-all font-medium appearance-none text-center cursor-pointer"
              >
                {currentCondo?.settings.apartmentsPerFloor.map(apt => (
                  <option key={apt} value={apt}>{apt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase text-ink-500 ml-1 tracking-wider">
              WhatsApp
            </label>
            <input
              name="whatsapp"
              type="tel"
              required
              placeholder="(00) 00000-0000"
              maxLength={15}
              onChange={applyPhoneMask}
              className="w-full bg-black/[0.03] border border-transparent text-ink-900 placeholder:text-ink-400 rounded-2xl p-4 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-200 transition-all font-medium"
            />
          </div>

          <button className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold uppercase tracking-[0.15em] text-sm rounded-2xl transition-all shadow-lg shadow-brand-600/20 active:scale-[0.98] mt-2">
            Entrar no Vizi
          </button>
        </form>

        {/* CTA lojista */}
        <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
          <p className="text-[10px] font-semibold text-ink-500 uppercase mb-3 tracking-[0.15em]">
            Tem um negócio no condomínio?
          </p>
          <button
            type="button"
            onClick={() => window.open(window.location.origin, '_blank', 'noopener')}
            className="w-full bg-ink-900 text-white font-semibold uppercase tracking-widest py-3.5 rounded-2xl shadow-md hover:bg-ink-700 active:scale-[0.98] transition-all text-[11px] flex items-center justify-center gap-2"
          >
            Quero Vender Aqui <span className="text-accent-400">→</span>
          </button>
        </div>

      </motion.div>
    </div>
  );
}