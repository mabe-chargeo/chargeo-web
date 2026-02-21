"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Menu, 
  X, 
  ChevronDown, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Phone,
  Truck,
  Settings,
  Calculator,
  Minus,
  Plus,
  Info,
  CheckCircle2,
  FileText,
  Construction,
  Wifi,
  ChevronRight,
  Star,
  Globe,
  Database,
  Award,
  Trash2,
  Quote,
  Building2,
  ShieldAlert,
  HardHat,
  BadgeCheck
} from 'lucide-react';

// --- TYPES TYPESCRIPT ---
interface HardwareModel {
  id: string;
  name: string;
  price: number;
}

interface RowData {
  typeId: string;
  qty: number;
}

interface ServiceOption {
  id: string;
  label: string;
  price: number;
  icon: React.ReactNode;
  desc: string;
}

// --- LOGO COMPOSANT (Utilise ton fichier PNG) ---
const Logo = ({ light = false, className = "" }: { light?: boolean, className?: string }) => {
  return (
    <div className={`relative h-12 w-48 md:h-16 md:w-64 select-none cursor-pointer ${className}`}>
      <Image 
        src="/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png"
        alt="Logo CHARGÉO"
        fill
        className={`object-contain transition-all duration-300 ${light ? 'brightness-0 invert' : ''}`}
        priority
      />
    </div>
  );
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  // --- CATALOGUE DE DONNÉES ---
  const hardwarePacks = {
    '3.7kW': [{ id: 'LEG', name: "Legrand Green'Up", price: 490 }, { id: 'HAG', name: "Hager Witty Prise", price: 550 }],
    '7.4kW': [{ id: 'AUT7', name: "Autel MaxiCharger Pro", price: 1290 }, { id: 'HAG7', name: "Hager Witty Wallbox", price: 1350 }, { id: 'PUL7', name: "Wallbox Pulsar Max", price: 1320 }],
    '11kW': [{ id: 'AUT11', name: "Autel Triphasé Performance", price: 1690 }, { id: 'ALF11', name: "Alfen Eve Single", price: 1850 }],
    '22kW': [{ id: 'AUT22', name: "Autel High Power Business", price: 1990 }, { id: 'ALF22', name: "Alfen Pro-Line", price: 2150 }]
  };

  const pathingOptions = [
    { id: 'apparent', name: 'Tube Rigide Apparent', price: 35 },
    { id: 'goulotte', name: 'Goulotte Résidentielle', price: 55 },
    { id: 'vide', name: 'Vide de Construction', price: 20 },
    { id: 'encastre', name: 'Encastré (Saignée)', price: 120 },
    { id: 'cdc', name: 'Chemin de Câble (CDC)', price: 75 },
    { id: 'tpc', name: 'Tranchée Technique (TPC)', price: 145 },
    { id: 'tirage', name: 'Tirage Conduit Existant', price: 25 }
  ];

  const drillingOptions = [
    { id: 'placo', name: 'Placo / Brique / Parpaing', price: 35 },
    { id: 'beton', name: 'Béton Armé / Mur Porteur', price: 95 },
    { id: 'dalle', name: 'Dalle / Plancher / Toiture', price: 145 },
    { id: 'pierre', name: 'Pierre Naturelle / Moellon', price: 165 }
  ];

  const servicesOptions: ServiceOption[] = [
    { id: 'consuel', label: 'Consuel IRVE Officiel', price: 180, icon: <ShieldCheck size={18}/>, desc: "Certificat obligatoire." },
    { id: 'advenir', label: 'Dossier Aide Advenir', price: 150, icon: <FileText size={18}/>, desc: "Montage administratif." },
    { id: 'tic', label: 'Délestage TIC Linky', price: 120, icon: <Zap size={18}/>, desc: "Évite les coupures." },
    { id: 'rj45', label: 'Liaison Réseau RJ45', price: 140, icon: <Wifi size={18}/>, desc: "Stabilité maximale." },
    { id: 'grounding', label: 'Mise à la Terre (SECUR)', price: 450, icon: <ShieldAlert size={18}/>, desc: "Reprise obligatoire." },
    { id: 'maintenance', label: 'Maintenance (1an)', price: 150, icon: <Clock size={18}/>, desc: "Visite annuelle." }
  ];

  // --- ÉTATS ---
  const [power, setPower] = useState('7.4kW');
  const [selectedModel, setSelectedModel] = useState('AUT7');
  const [distance, setDistance] = useState(15);
  const [pathingRows, setPathingRows] = useState<RowData[]>([{ typeId: 'apparent', qty: 5 }]);
  const [drillingRows, setDrillingRows] = useState<RowData[]>([{ typeId: 'placo', qty: 1 }]);
  const [activeServices, setActiveServices] = useState<string[]>(['consuel', 'tic']);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const calculateQuote = () => {
    const packsForPower = hardwarePacks[power as keyof typeof hardwarePacks];
    const pack = packsForPower.find((m: HardwareModel) => m.id === selectedModel) || packsForPower[0];
    
    let s2 = 0, totalMeters = 0;
    pathingRows.forEach((r: RowData) => { 
      const o = pathingOptions.find(opt => opt.id === r.typeId); 
      if(o){ s2 += r.qty * o.price; totalMeters += r.qty; } 
    });
    
    if (totalMeters > 0) s2 += 2 * 35; 
    
    drillingRows.forEach((r: RowData) => { 
      const o = drillingOptions.find(opt => opt.id === r.typeId); 
      if(o) s2 += r.qty * o.price; 
    });

    const s3 = activeServices.reduce((acc, id) => {
      const srv = servicesOptions.find(s => s.id === id);
      return acc + (srv ? srv.price : 0);
    }, 0);

    let s4 = distance > 50 ? 115 : (distance > 20 ? 55 : 0);

    return { s1: pack.price, s2, s3, s4, totalHT: pack.price + s2 + s3 + s4, totalMeters, packName: pack.name };
  };

  const quote = calculateQuote();

  const updateRow = (type: 'path' | 'drill', index: number, field: keyof RowData, value: string | number) => {
    const setRows = type === 'path' ? setPathingRows : setDrillingRows;
    const rows = [...(type === 'path' ? pathingRows : drillingRows)];
    (rows[index] as any)[field] = value;
    setRows(rows);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 overflow-x-hidden selection:bg-[#0097b2]/20">
      
      {/* NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Logo light={!scrolled} />
          <div className="hidden lg:flex items-center gap-10">
            <div className="flex gap-8 text-[13px] font-black uppercase tracking-widest" style={{ color: scrolled ? brandNavy : '#fff' }}>
              <a href="#concept" className="hover:opacity-70 transition-opacity">Concept</a>
              <a href="#simulateur" className="hover:opacity-70 transition-opacity text-[#0097b2]">Chiffrage</a>
            </div>
            <button className="bg-[#0097b2] text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:scale-105 transition-transform active:scale-95">
              Audit technique offert
            </button>
          </div>
          <button className="lg:hidden" style={{ color: scrolled ? brandNavy : '#fff' }} onClick={() => setIsMenuOpen(true)}><Menu size={32} /></button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover scale-105" alt="Installation CHARGÉO" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/60 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-4xl space-y-10 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              <BadgeCheck size={16} className="text-[#0097b2]"/> Premier Réseau National d'Installateurs Qualifiés
            </div>
            <h1 className="text-6xl md:text-[8rem] font-black text-white tracking-tighter leading-[0.85] uppercase">
              La recharge <br/><span style={{ color: brandTeal }}>en toute clarté.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-medium max-w-2xl italic">
              "Fini les forfaits approximatifs. Configurez votre installation au mètre près avec le standard CHARGÉO et réservez l'audit de votre agence locale."
            </p>
            <div className="flex flex-col sm:flex-row gap-6 pt-4">
              <a href="#simulateur" className="flex items-center justify-center gap-3 bg-[#0097b2] text-white px-12 py-5 rounded-full font-black text-lg shadow-2xl hover:brightness-110 transition-all">
                Démarrer mon chiffrage <ArrowRight size={24}/>
              </a>
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-3xl backdrop-blur-sm">
                <Building2 size={24} className="text-white/40"/>
                <div>
                   <p className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Siège Social National</p>
                   <p className="text-white font-black text-sm uppercase tracking-tighter">74200 Thonon-les-Bains</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BANDEAU CONFIANCE */}
      <div className="bg-slate-50 border-y border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-12 opacity-30 grayscale font-black text-2xl italic tracking-tighter">
          <span>HAGER</span><span>AUTEL</span><span>WALLBOX</span><span>ALFEN</span><span>LEGRAND</span><span>ABB</span>
        </div>
      </div>

      {/* MÉTHODOLOGIE FRANCHISE */}
      <section id="concept" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>
                Une Méthode <br/><span style={{ color: brandTeal }}>Standardisée</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Le réseau CHARGÉO repose sur une transparence absolue. Chaque devis de nos agences est construit sur la même base algorithmique pour garantir le prix juste partout en France.
              </p>
              <div className="space-y-6">
                {[
                  { i: <Zap/>, t: "S1 : Solution Borne", d: "La borne adaptée et son kit de protection électrique certifié." },
                  { i: <Construction/>, t: "S2 : Infrastructure", d: "Une pose au mètre réel. Vous ne payez que ce que nous installons." },
                  { i: <ShieldCheck/>, t: "S3 : Services & Admin", d: "Consuel inclus et prise en charge totale de vos aides d'État." },
                  { i: <Truck/>, t: "S4 : Logistique", d: "Forfait déplacement optimisé au départ de l'agence la plus proche." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-5 group">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0097b2]/10 transition-colors shrink-0" style={{ color: brandTeal }}>{item.i}</div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: brandNavy }}>{item.t}</h4>
                      <p className="text-xs text-slate-400 font-medium">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
           <div className="relative">
              <div className="absolute -inset-4 bg-slate-100 rounded-[3rem] -rotate-3"></div>
              <img src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=1000" className="relative rounded-[2.5rem] shadow-2xl transition-transform hover:rotate-0 duration-700" alt="Qualité réseau"/>
              <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-xs">
                <div className="flex gap-1 text-yellow-400 mb-2">
                   {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor"/>)}
                </div>
                <p className="text-sm font-bold text-slate-700 italic">"Enfin un installateur qui explique clairement ce qu'on paie. Devis reçu en 2 min, pose en 10 jours."</p>
                <p className="mt-4 font-black text-[10px] uppercase tracking-widest text-[#0097b2]">— Jean-Phillippe, Thonon</p>
              </div>
           </div>
        </div>
      </section>

      {/* SIMULATEUR PROFESSIONNEL */}
      <section id="simulateur" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-5xl md:text-[7rem] font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>CHARGÉO <br/><span style={{ color: brandTeal }}>LOGIC</span></h2>
            <div className="text-right">
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Outil de chiffrage Réseau Officiel</p>
               <div className="inline-flex items-center gap-2 bg-[#0097b2]/10 px-4 py-2 rounded-xl text-[#0097b2] font-black text-xs">
                  <Calculator size={16}/> VERSION 2026.04
               </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            <div className="lg:col-span-7 space-y-12">
              
              {/* 1. MATÉRIEL */}
              <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
                <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4"><Zap style={{ color: brandTeal }}/> 1. Gamme de Puissance</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(hardwarePacks).map(p => (
                    <button 
                        key={p} 
                        onClick={() => {
                            setPower(p); 
                            const firstModel = hardwarePacks[p as keyof typeof hardwarePacks][0];
                            setSelectedModel(firstModel.id);
                        }} 
                        className={`px-8 py-3 rounded-2xl font-black text-xs transition-all border-2 ${power === p ? 'bg-[#0097b2] border-[#0097b2] text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}
                    >
                        {p}
                    </button>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(hardwarePacks[power as keyof typeof hardwarePacks]).map((m: HardwareModel) => (
                    <button key={m.id} onClick={() => setSelectedModel(m.id)} className={`p-6 rounded-[2rem] border-2 text-left transition-all ${selectedModel === m.id ? 'border-[#0097b2] bg-white shadow-xl scale-[1.02]' : 'border-transparent bg-slate-50 opacity-60'}`}>
                      <h4 className="font-black text-lg" style={{ color: brandNavy }}>{m.name}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Matériel Qualifié Réseau</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. INFRASTRUCTURE */}
              <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
                <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4"><Construction style={{ color: brandTeal }}/> 2. Infrastructure sur-mesure</h3>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Types de liaisons cumulables (mètres)</p>
                  {pathingRows.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 animate-in slide-in-from-top-2">
                      <select 
                        value={row.typeId} 
                        onChange={(e) => updateRow('path', idx, 'typeId', e.target.value)}
                        className="flex-1 min-w-[200px] p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-[#0097b2]/30"
                      >
                        {pathingOptions.map(o => <option key={o.id} value={o.id}>{o.name} — {o.price}€/m</option>)}
                      </select>
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button onClick={() => updateRow('path', idx, 'qty', Math.max(1, row.qty - 1))} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm hover:bg-slate-100 transition-colors"><Minus size={18}/></button>
                        <span className="font-black text-lg w-10 text-center">{row.qty}m</span>
                        <button onClick={() => updateRow('path', idx, 'qty', row.qty + 1)} className="w-10 h-10 rounded-xl bg-[#032b60] text-white flex items-center justify-center shadow-sm hover:bg-black transition-colors"><Plus size={18}/></button>
                      </div>
                      <button onClick={() => setPathingRows(pathingRows.filter((_, i) => i !== idx))} className="p-4 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>
                    </div>
                  ))}
                  <button onClick={() => setPathingRows([...pathingRows, { typeId: 'apparent', qty: 1 }])} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-[11px] font-black uppercase text-slate-400 hover:border-[#0097b2] hover:text-[#0097b2] transition-all flex items-center justify-center gap-2">
                    <Plus size={18}/> Ajouter un segment de pose
                  </button>
                </div>

                <div className="space-y-4 pt-10 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Passages & Percements</p>
                  {drillingRows.map((row, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 animate-in slide-in-from-top-2">
                      <select 
                        value={row.typeId} 
                        onChange={(e) => updateRow('drill', idx, 'typeId', e.target.value)}
                        className="flex-1 min-w-[200px] p-5 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent"
                      >
                        {drillingOptions.map(o => <option key={o.id} value={o.id}>{o.name} — {o.price}€/unité</option>)}
                      </select>
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button onClick={() => updateRow('drill', idx, 'qty', Math.max(1, row.qty - 1))} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><Minus size={18}/></button>
                        <span className="font-black text-lg w-10 text-center">{row.qty}</span>
                        <button onClick={() => updateRow('drill', idx, 'qty', row.qty + 1)} className="w-10 h-10 rounded-xl bg-[#032b60] text-white flex items-center justify-center"><Plus size={18}/></button>
                      </div>
                      <button onClick={() => setDrillingRows(drillingRows.filter((_, i) => i !== idx))} className="p-4 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>
                    </div>
                  ))}
                  <button onClick={() => setDrillingRows([...drillingRows, { typeId: 'placo', qty: 1 }])} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-[11px] font-black uppercase text-slate-400 hover:border-slate-800 hover:text-slate-800 transition-all flex items-center justify-center gap-2">
                    <Plus size={18}/> Ajouter un percement spécifique
                  </button>
                </div>
              </div>

              {/* 3. SERVICES */}
              <div id="services" className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-10">
                <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4"><Settings style={{ color: brandTeal }}/> 3. Services & Administratif</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {servicesOptions.map(srv => (
                    <button 
                      key={srv.id} 
                      onClick={() => setActiveServices(prev => prev.includes(srv.id) ? prev.filter(x => x !== srv.id) : [...prev, srv.id])}
                      className={`flex flex-col p-6 rounded-[2rem] border-2 transition-all text-left ${activeServices.includes(srv.id) ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${activeServices.includes(srv.id) ? 'bg-white/10' : 'bg-slate-50'}`} style={{ color: activeServices.includes(srv.id) ? '#fff' : brandTeal }}>{srv.icon}</div>
                        {activeServices.includes(srv.id) && <CheckCircle2 size={16} className="text-green-400" />}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider mb-1 leading-tight">{srv.label}</span>
                      <p className={`text-[10px] font-medium leading-relaxed ${activeServices.includes(srv.id) ? 'text-white/60' : 'text-slate-400'}`}>{srv.desc}</p>
                      <span className={`text-[11px] font-black mt-3 ${activeServices.includes(srv.id) ? 'text-[#0097b2]' : 'text-slate-800'}`}>+{srv.price},00 €</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. LOGISTIQUE */}
              <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8 text-center">
                 <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4 justify-center"><MapPin style={{ color: brandTeal }}/> 4. Agence locale</h3>
                 <div className="space-y-6">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Distance parcourue par l'agence locale : {distance} km</p>
                   <input type="range" min="1" max="80" value={distance} onChange={(e) => setDistance(parseInt(e.target.value))} className="w-full h-2 accent-[#0097b2]" />
                   <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0097b2]/20 to-transparent opacity-50"></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 relative z-10">Zone tarifaire standardisée</p>
                      <p className="text-4xl font-black relative z-10 tracking-tighter">{quote.s4 === 0 ? "LOGISTIQUE OFFERTE (Z1)" : `${quote.s4},00 € HT`}</p>
                   </div>
                 </div>
              </div>

            </div>

            {/* DEVIS FINAL (STICKY) */}
            <div className="lg:col-span-5 sticky top-28">
              <div className="bg-white rounded-[4rem] p-10 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden ring-1 ring-slate-100">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#0097b2]/5 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                <h3 className="text-xl font-black mb-12 border-b pb-8 uppercase tracking-[0.3em] flex items-center gap-4 italic" style={{ color: brandNavy }}>
                  <FileText style={{ color: brandTeal }} size={28}/> Chiffrage Estimé
                </h3>

                <div className="space-y-8 font-mono text-[14px]">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Section 1 : Matériel</span>
                      <span className="font-black text-[12px] uppercase">{quote.packName}</span>
                    </div>
                    <span className="font-black">{quote.s1},00 €</span>
                  </div>
                  
                  <div className="flex justify-between items-start border-t pt-4 border-slate-50">
                    <span className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Section 2 : Infra ({quote.totalMeters}m + 2m)</span>
                    <span className="font-black text-[#0097b2]">+ {quote.s2},00 €</span>
                  </div>

                  <div className="flex justify-between border-t pt-4 border-slate-50">
                    <span className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Section 3 : Admin & Services</span>
                    <span className="font-black">+ {quote.s3},00 €</span>
                  </div>

                  <div className="flex justify-between border-t pt-4 border-slate-50">
                    <span className="text-slate-400 uppercase text-[9px] font-bold tracking-[0.2em]">Section 4 : Logistique Réseau</span>
                    <span className={`font-black ${quote.s4 === 0 ? 'text-green-500' : ''}`}>{quote.s4 === 0 ? 'OFFERTE' : `+ ${quote.s4},00 €`}</span>
                  </div>

                  <div className="pt-14 mt-6 border-t flex flex-col gap-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase italic mb-1">Estimation Net HT (avant aides)</p>
                    <p className="text-8xl font-black tracking-tighter leading-none" style={{ color: brandNavy }}>{quote.totalHT}<span className="text-3xl">,00€</span></p>
                  </div>

                  <div className="p-8 rounded-[3rem] text-center bg-green-50 border border-green-100 mt-12 relative group cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-full">Automatique</div>
                    <p className="text-[10px] font-black uppercase text-green-600 mb-1 tracking-widest">Aides Advenir & Crédit 2026</p>
                    <p className="text-4xl font-black text-green-600">- 500,00 €*</p>
                  </div>

                  <button className="w-full py-8 rounded-[2.5rem] font-black text-2xl transition-all flex items-center justify-center gap-4 mt-12 bg-[#032b60] text-white shadow-2xl hover:scale-[1.03] active:scale-95 group">
                    Réserver mon Audit <ChevronRight size={32} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#020817] py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-16">
           <div className="space-y-10">
              <Logo light={true} className="scale-125 origin-left" />
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-white/40 uppercase text-[10px] font-black tracking-[0.3em]">
                    <Building2 size={16} /> Siège Social National
                 </div>
                 <p className="text-white font-black text-2xl tracking-tighter uppercase leading-none">74200 Thonon-les-Bains</p>
              </div>
           </div>
           <div className="flex gap-20">
              <div className="space-y-6">
                 <h4 className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Réseau</h4>
                 <ul className="text-white font-bold space-y-4 text-sm">
                    <li className="hover:text-[#0097b2] cursor-pointer transition-colors">Devenir Franchisé</li>
                    <li className="hover:text-[#0097b2] cursor-pointer transition-colors">Annuaire Agences</li>
                 </ul>
              </div>
              <div className="space-y-6">
                 <h4 className="text-white/20 font-black text-[10px] uppercase tracking-[0.3em]">Assistance</h4>
                 <ul className="text-white font-bold space-y-4 text-sm">
                    <li className="text-[#0097b2] font-black">contact@chargeo.fr</li>
                 </ul>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}