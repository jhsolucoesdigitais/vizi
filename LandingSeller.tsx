import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { 
  Check, X, ArrowRight, MessageCircle, ShieldCheck, Zap, 
  TrendingUp, Star, Layout, ShoppingBag, BarChart3, Heart,
  Scale, Wrench, Hammer, IceCream, Utensils, Store, Waves, Users, Smartphone,
  ShieldAlert
} from 'lucide-react';

interface LandingSellerProps {
  onBack: () => void;
}

type BillingCycle = 'mensal' | 'trimestral' | 'anual';

export default function LandingSeller({ onBack, currentCondo }: any) {
  
  // 1. Criamos um estado para saber se mostramos o botão
  const [hasAppAccess, setHasAppAccess] = useState(false);

  // 2. Verificamos o localStorage assim que a tela carrega
useEffect(() => {
    const savedSession = localStorage.getItem('maxi_user_v3');
    
    // Se tem uma sessão guardada OU se o condomínio foi carregado, mostra o botão!
    if (savedSession || currentCondo) {
      setHasAppAccess(true);
    } else {
      setHasAppAccess(false);
    }
  }, [currentCondo]);
  
  const [cycle, setCycle] = useState<BillingCycle>('trimestral');
  const [showVideo, setShowVideo] = useState(false);  

  const getWhatsAppLink = (message: string) => {
    const phone = "5519982098586";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const pricing = {
    vitrine: {
      mensal: { installment: "15,00", times: "", total: "Pagamento único" },
      trimestral: { installment: "12,72", times: "3x", total: "Total R$ 36,00" },
      anual: { installment: "10,84", times: "12x", total: "Total R$ 108,00" },
    },
    empreendedor: {
      mensal: { installment: "35,00", times: "", total: "Por mês" },
      trimestral: { installment: "33,31", times: "3x", total: "Total R$ 90,00 / trimestre" },
      anual: { installment: "30,12", times: "12x", total: "Total R$ 300,00 / anual" },
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* BOTÃO FLUTUANTE WHATSAPP - DÚVIDAS */}
      <a 
        href={getWhatsAppLink("Olá! Estou na página de planos e tenho algumas dúvidas sobre o Vizi.")}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z- bg-emerald-500 hover:bg-emerald-400 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/40 transition-all hover:scale-110 flex items-center gap-2 group"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap uppercase text-xs tracking-widest">
          Tirar Dúvidas
        </span>
        <MessageCircle size={24} fill="currentColor" />
      </a>

      {/* Background Decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>

{/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="bg-white p-2 rounded-xl shadow-lg shadow-white/5">
            <img src="/assets/web-app-manifest-512x512.png" alt="VIZI" className="h-7 md:h-9 object-contain" />
          </div>
          
          {/* O botão SÓ aparece se o usuário já acessou o app antes */}
          {hasAppAccess && (
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar ao App
            </button>
          )}
          
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-8xl font-black italic tracking-tighter leading-[0.9] mb-8 bg-gradient-to-br from-white via-slate-200 to-blue-500 bg-clip-text text-transparent uppercase">
              VENDA MAIS DENTRO <br /> DO SEU CONDOMÍNIO.
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
              Venda produtos e serviços para quem mora ao seu lado. <br className="hidden md:block" /> 
              A maior plataforma de comércio hiperlocal com <span className="text-white font-bold italic">Taxa Zero</span> sobre suas vendas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="#planos" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                Começar a Vender <ArrowRight size={18} />
              </a>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                Sua loja ativa em menos de 5 minutos
              </p>
            </div>
          </motion.div>
        </div>
      </section>
	  


      {/* Mar de Oportunidades */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 skew-y-3 translate-y-20" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-400">
                <Waves size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mar de Oportunidades</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black italic leading- mb-6 uppercase tracking-tighter">
                O CONDOMÍNIO É UM <br /> 
                <span className="text-blue-500">OCEANO DE NEGÓCIOS.</span>
              </h2>
              <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
                Já parou para pensar em quantas pessoas moram a poucos metros de você? O condomínio é uma <strong>comunidade próspera</strong> com infinitas possibilidades de negócio. Para quem usa o Vizi, é a praticidade de ter diversos negócios em um único lugar.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-600 p-2 rounded-lg mt-1 shadow-lg shadow-blue-600/20"><Users size={20} /></div>
                  <div>
                    <h4 className="font-black italic uppercase text-sm tracking-tight">Comunidade Conectada</h4>
                    <p className="text-slate-500 text-sm">Transforme seus vizinhos em clientes fiéis que compram sem precisar de frete ou espera.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-emerald-600 p-2 rounded-lg mt-1 shadow-lg shadow-emerald-600/20"><Smartphone size={20} /></div>
                  <div>
                    <h4 className="font-black italic uppercase text-sm tracking-tight">Praticidade Absoluta</h4>
                    <p className="text-slate-500 text-sm">A facilidade de encontrar o vidraceiro, o bolo e o marido de aluguel em um só clique.</p>
                 


				 </div>
				  
				  
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[64px] overflow-hidden rotate-3 flex items-center justify-center p-12 shadow-3xl">
                 <div className="text-center">
                    <TrendingUp size={80} className="mx-auto mb-6 text-white/20" />
                    <p className="text-3xl font-black italic uppercase leading-none">Cresça onde <br /> você mora.</p>
                 </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-white text-slate-950 p-6 rounded-3xl shadow-2xl -rotate-6">
                <p className="text-xs font-black uppercase">Oportunidade</p>
                <p className="text-2xl font-black italic leading-none">HIPERLOCAL</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categorias / Nichos */}
      <section className="py-20 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto text-center mb-12">
            <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px]">O Vizi é para todo mundo</span>
            <h2 className="text-3xl md:text-5xl font-black italic mt-2 uppercase">Para todo tipo de empreendedor</h2>
            <p className="text-slate-500 mt-4 uppercase text-[10px] tracking-widest font-bold max-w-2xl mx-auto leading-relaxed">Advogados • Vidraceiros • Maridos de Aluguel • Lojas • Vendedores de Geladinhos • Bolos e muito mais.</p>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { icon: Scale, label: "Advogados", desc: "Consultoria local" },
              { icon: Wrench, label: "Manutenção", desc: "Marido de Aluguel" },
              { icon: Hammer, label: "Serviços", desc: "Vidraceiros e Obras" },
              { icon: IceCream, label: "Doces", desc: "Geladinhos e Bolos" },
              { icon: Utensils, label: "Comida", desc: "Lanches e Marmitas" },
              { icon: Store, label: "Lojas", desc: "Moda e Acessórios" },
            ].map((item, i) => (
              <div key={i} className="p-6 bg-slate-900/50 border border-white/5 rounded-[32px] text-center hover:border-blue-500/50 transition-all group cursor-default">
                <item.icon className="mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                <h4 className="text-[12px] font-black uppercase mb-1">{item.label}</h4>
                <p className="text-slate-500 text-[10px] font-medium leading-tight">{item.desc}</p>
              </div>
            ))}
        </div>
      </section>

      {/* Bento Grid - Funcionalidades */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-slate-900/40 border border-white/5 p-10 rounded-[48px] hover:border-blue-500/30 transition-all group">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-blue-500" size={30} fill="currentColor" />
            </div>
            <h3 className="text-3xl font-black italic mb-3 uppercase">100% SEU LUCRO.</h3>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Esqueça as taxas abusivas dos grandes apps de entrega. No Vizi, o lucro da venda é totalmente seu. Cobramos apenas uma subscrição fixa por condomínio.
            </p>
          </div>

          <div className="bg-blue-600 p-10 rounded-[48px] flex flex-col justify-between shadow-2xl shadow-blue-600/10 hover:-translate-y-1 transition-transform">
            <ShieldCheck size={40} className="text-white mb-6" />
            <div>
              <h3 className="text-2xl font-black italic mb-2 leading-none uppercase">CONFIANÇA LOCAL</h3>
              <p className="text-blue-100 font-medium text-sm">Venda para vizinhos validados. Logística simplificada, entrega rápida e pagamento direto.</p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[48px] flex flex-col justify-center items-center text-center group">
            <div className="relative mb-4">
              <Star className="text-amber-400 fill-amber-400" size={48} />
              <div className="absolute inset-0 blur-xl bg-amber-400/20" />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Fidelidade</h3>
            <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest leading-tight">Crie cupons e pontuação para seus clientes recorrentes.</p>
          </div>

          <div className="md:col-span-4 bg-gradient-to-r from-slate-900/40 to-slate-800/20 border border-white/5 p-10 rounded-[48px] flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="text-3xl font-black italic mb-4 uppercase tracking-tighter">O Ecossistema Completo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { icon: Layout, label: "Catálogo" },
                  { icon: ShoppingBag, label: "Pedidos" },
                  { icon: BarChart3, label: "Relatórios" },
                  { icon: Heart, label: "Avaliações" }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-blue-400"><item.icon size={20} /></div>
                    <span className="text-[10px] font-black uppercase text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-px h-px md:h-20 bg-white/10" />
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-black italic text-white leading-none uppercase">Vendas Via</p>
                <p className="text-emerald-500 font-black text-xl italic leading-none">WHATSAPP</p>
              </div>
              <MessageCircle size={48} className="text-emerald-500" fill="currentColor" />
            </div>
          </div>
        </div>
      </section>
	  
	  {/* SEÇÃO TESTE GRÁTIS - 7 DIAS */}
<section className="py-24 px-6 relative overflow-hidden">
  <div className="max-w-5xl mx-auto">
    <div className="relative bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[56px] p-10 md:p-20 overflow-hidden shadow-3xl border border-white/10">
      
      {/* Elementos visuais de fundo */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

      <div className="relative z-10 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-amber-400 text-slate-900"
        >
          <Zap size={16} fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Oportunidade Exclusiva</span>
        </motion.div>

        <h2 className="text-4xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9] text-white">
          EXPERIMENTE O PODER <br /> DO VIZI POR <span className="text-amber-400">7 DIAS GRÁTIS.</span>
        </h2>

        <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
          Ative sua loja agora, cadastre seus produtos e comece a vender para seus vizinhos hoje mesmo. Sem compromisso e sem taxas de cancelamento.
        </p>

        <div className="flex flex-col items-center gap-6 pt-4">
          <a 
            href={getWhatsAppLink("Olá! Quero testar o VIZI grátis por 7 dias.")}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-white text-blue-600 hover:bg-slate-50 px-12 py-6 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-sm"
          >
            <MessageCircle size={20} fill="currentColor" />
            Quero testar no VIZI
          </a>
          
          <div className="flex items-center gap-4 text-blue-200/60">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Ativação Imediata</span>
            </div>
            <div className="w-1 h-1 bg-blue-400/30 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Check size={14} strokeWidth={3} />
              <span className="text-[9px] font-black uppercase tracking-widest">Sem Cartão de Crédito</span>
            </div>


          </div>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 px-6 bg-slate-900/20 relative">
	  
	  

	  
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
		  
		  	  			{/* Botão de Ver Vídeo */}
						<button 
						  onClick={() => setShowVideo(true)}
						  className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-slate-900/40 text-white font-black text-[11px] md:text-xs uppercase tracking-widest border border-white/20 hover:bg-slate-900 hover:border-white/40 transition-all shadow-xl backdrop-blur-md active:scale-95"
						>
						  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
							<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
						  </svg>
						  Como Funciona (Vídeo)
						</button>

            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter mb-8 uppercase">Escolha seu impacto</h2>
            
            <div className="inline-flex items-center p-1.5 bg-slate-950 border border-white/10 rounded-[24px] backdrop-blur-xl">
              {(['mensal', 'trimestral', 'anual'] as BillingCycle[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setCycle(opt)}
                  className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                    cycle === opt ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* PLANO VITRINE */}
            <div className="bg-slate-950 border border-white/5 p-10 md:p-12 rounded-[56px] flex flex-col hover:border-white/20 transition-all group">
              <div className="mb-8">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 block">Foco em Exposição</span>
                <h4 className="text-3xl font-black italic text-white uppercase mb-6 tracking-tighter">Vitrine</h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-600">{pricing.vitrine[cycle].times}</span>
                  <span className="text-7xl font-black italic tracking-tighter text-white">R$ {pricing.vitrine[cycle].installment}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-widest italic">{pricing.vitrine[cycle].total}</p>
              </div>

              {/* Selo Garantia */}
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-2xl mb-8 border border-white/5">
                <ShieldAlert className="text-blue-500" size={20} />
                <span className="text-[10px] font-black uppercase text-slate-300">Garantia incondicional de 7 dias</span>
              </div>

              <ul className="space-y-5 mb-12 flex-1">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Nome e Foto no App</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Link Direto para WhatsApp</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Link Direto para Redes Sociais</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Link Direto para Site</li>

				<li className="flex items-center gap-3 text-sm font-bold text-slate-700 italic"><X size={20} /> Sem Gestão de Pedidos</li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-700 italic"><X size={20} /> Sem Cardápio Digital</li>
              </ul>

              <a 
                href={getWhatsAppLink(`Olá! Quero assinar o Plano VITRINE (${cycle}) para o meu negócio no Vizi.`)}
                target="_blank"
                className="w-full py-5 rounded-2xl border border-white/10 font-black uppercase text-[11px] tracking-widest text-center hover:bg-white hover:text-slate-950 transition-all active:scale-95"
              >
                Assinar Vitrine
              </a>
            </div>

            {/* PLANO EMPREENDEDOR */}
            <div className="relative group md:scale-105">
              <div className="absolute inset-0 bg-blue-600 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative bg-blue-600 p-[2px] rounded-[56px] h-full shadow-2xl">
                <div className="bg-slate-950 rounded-[54px] p-10 md:p-12 h-full flex flex-col">
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Ferramenta Completa</span>
                      <span className="bg-blue-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Popular</span>
                    </div>
                    <h4 className="text-3xl font-black italic text-white uppercase mb-6 tracking-tighter">Empreendedor</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-600">{pricing.empreendedor[cycle].times}</span>
                      <span className="text-7xl font-black italic tracking-tighter text-blue-500">R$ {pricing.empreendedor[cycle].installment}</span>
                    </div>
                    <p className="text-[11px] font-bold text-blue-500/60 mt-2 uppercase tracking-widest italic">{pricing.empreendedor[cycle].total}</p>
                  </div>

                  {/* Selo Garantia */}
                  <div className="flex items-center gap-2 bg-blue-500/10 p-3 rounded-2xl mb-8 border border-blue-500/20">
                    <ShieldAlert className="text-blue-400" size={20} />
                    <span className="text-[10px] font-black uppercase text-blue-100">Garantia incondicional de 7 dias</span>
                  </div>

                  <ul className="space-y-5 mb-12 flex-1 text-slate-200">
                    <li className="flex items-center gap-3 text-sm font-bold"><Check className="text-blue-500" size={20} strokeWidth={3} /> Receba Pedidos no App</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><Check className="text-blue-500" size={20} strokeWidth={3} /> Cardápio Digital Completo</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><Check className="text-blue-500" size={20} strokeWidth={3} /> Controle de Estoque Real</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><Check className="text-blue-500" size={20} strokeWidth={3} /> Programa de Fidelidade</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><Check className="text-blue-500" size={20} strokeWidth={3} /> Relatórios Financeiros</li>
					<li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Link Direto para Redes Sociais</li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-300"><Check className="text-blue-500" size={20} strokeWidth={3} /> Link Direto para Site</li>
				
                  </ul>

                  <a 
                    href={getWhatsAppLink(`Olá! Quero assinar o Plano EMPREENDEDOR (${cycle}) para o meu negócio no Vizi.`)}
                    target="_blank"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all text-center active:scale-95"
                  >
                    Assinar Empreendedor
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
	  
	 
	

      {/* Footer Final */}
      <footer className="py-20 px-6 border-t border-white/5 relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="bg-white p-2 rounded-lg inline-block">
                <img src="/assets/web-app-manifest-512x512.png" alt="VIZI" className="h-6 object-contain" />
            </div>
            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.5em]">The Hyperlocal Marketplace System</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-6 text-center md:text-right">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-loose">
                Transformando Condomínios em <br /> Comunidades Prósperas.
              </p>
              <p className="text-blue-500 text-[11px] font-black uppercase tracking-widest mt-2 italic">
                DESENVOLVIDO POR JHS SOLUÇÕES DIGITAIS LTDA
              </p>
            </div>
             
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-700 text-[8px] font-black uppercase tracking-[0.4em]">© 2026 VIZI • HORTOLÃNDIA - SP • VERSÃO 2.0.4 PRO</p>
        </div>
      </footer>
	  
	  
	   {/* ── MODAL DO VÍDEO DO YOUTUBE ── */}
      {showVideo && (
        <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Fundo clicável para fechar */}
          <div className="absolute inset-0" onClick={() => setShowVideo(false)}></div>
          
          <div className="relative w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/20 border border-slate-800 scale-in-center">
            {/* Botão de Fechar */}
            <button 
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 md:top-4 md:right-4 z-10 w-10 h-10 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* O Vídeo Embutido (iframe) */}
            <div className="relative w-full aspect-video">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/4NyPSZJaKhg?autoplay=1" 
                title="Apresentação VIZI" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
	
	  
    </div>
	
	
  );
}