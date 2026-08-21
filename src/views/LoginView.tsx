import React from 'react';
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
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-6 overflow-hidden">

      {/* Glows de fundo */}
      <div className="absolute -top-[10%] -right-[10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#FEFEFE] rounded-[40px] p-10 shadow-2xl scale-in-center">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <img
              src="/assets/logo.png"
              alt="VIZI"
              className="h-28 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="mt-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-600 mb-1 leading-none">
              Vendas e Serviços
            </p>
            <div className="h-1 w-8 bg-blue-600 mx-auto rounded-full opacity-20" />
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">
              Nome / Apelido
            </label>
            <input
              name="name"
              required
              placeholder="Ex: João da Silva"
              className="w-full bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-400 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
            />
          </div>

          {/* Bloco / Andar / Final */}
          <div className="grid grid-cols-3 gap-3">

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider text-center block">
                {currentCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'}
              </label>
              <select
                name="block"
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold appearance-none text-center cursor-pointer"
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
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider text-center block">
                Andar
              </label>
              <select
                name="floor"
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold appearance-none text-center cursor-pointer"
              >
                {currentCondo && Array.from({ length: currentCondo.settings.floors + 1 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? 'Térreo' : i}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider text-center block">
                Final
              </label>
              <select
                name="apartment"
                className="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold appearance-none text-center cursor-pointer"
              >
                {currentCondo?.settings.apartmentsPerFloor.map(apt => (
                  <option key={apt} value={apt}>{apt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-wider">
              WhatsApp
            </label>
            <input
              name="whatsapp"
              type="tel"
              required
              placeholder="(00) 00000-0000"
              maxLength={15}
              onChange={applyPhoneMask}
              className="w-full bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-400 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
            />
          </div>

          <button className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-[24px] transition-all shadow-xl shadow-blue-100 mt-2">
            Entrar no Vizi
          </button>
        </form>

        {/* CTA lojista */}
        <div className="mt-10 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">
            Tem um negócio no condomínio?
          </p>
          <button
            type="button"
            onClick={() => setView('landing-seller')}
            className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg hover:bg-black transition-all text-[11px] flex items-center justify-center gap-3"
          >
            <span className="text-lg">🚀</span> Quero Vender Aqui
          </button>
        </div>

      </div>
    </div>
  );
}