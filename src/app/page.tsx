"use client";

import React, { useState, useEffect, useRef } from 'react';
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

// --- LOGO COMPOSANT ---
const Logo = ({ light = false, className = "" }: { light?: boolean, className?: string }) => {
  const [imgError, setImgError] = useState(false);

  const logoSrc = light 
    ? "/CHARGEO_LOGO_BLANC.png" 
    : "/CHARGEO_LOGO_COMPLET_FOND_TRANSPARENT_2026-01-24.png";

  return (
    <div className={`relative h-10 flex items-center select-none cursor-pointer ${className}`}>
      {!imgError ? (
        <img 
          src={logoSrc}
          alt="Logo CHARGéO"
          onError={() => setImgError(true)}
          className="h-full w-auto object-contain transition-all duration-300"
        />
      ) : (
        <span className={`text-xl md:text-2xl font-black tracking-tighter ${light ? 'text-white' : 'text-[#032b60]'}`}>
          CHARG<span className="text-[#0097b2]">é</span>O
        </span>
      )}
    </div>
  );
};

// --- COMPOSANT BRAND LOGO ---
const BrandLogo = ({ name, url }: { name: string, url: string }) => {
  const [error, setError] = useState(false);
  return (
    <div className="flex items-center justify-center h-12 w-28 sm:w-32">
      {!error ? (
        <img 
          src={url} 
          alt={`Logo ${name}`} 
          className="max-h-6 md:max-h-8 max-w-full object-contain opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-black text-xl md:text-2xl italic tracking-tighter opacity-30">{name}</span>
      )}
    </div>
  );
};

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const simulatorRef = useRef<HTMLDivElement>(null);

  const [power, setPower] = useState('7.4kW');
  const [selectedModel, setSelectedModel] = useState('AUT7');
  const [distance, setDistance] = useState(15);
  const [pathingRows, setPathingRows] = useState<RowData[]>([{ typeId: 'apparent', qty: 5 }]);
  const [drillingRows, setDrillingRows] = useState<RowData[]>([{ typeId: 'placo', qty: 1 }]);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [currentReview, setCurrentReview] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const brandNavy = "#032b60";
  const brandTeal = "#0097b2";

  // Réduction aux puissances monophasées (particuliers)
  const hardwarePacks = {
    '3.7kW': [{ id: 'LEG', name: "Legrand Green'Up", price: 490 }, { id: 'HAG', name: "Hager Witty Prise", price: 550 }],
    '7.4kW': [{ id: 'AUT7', name: "Autel MaxiCharger Pro", price: 1290 }, { id: 'HAG7', name: "Hager Witty Wallbox", price: 1350 }, { id: 'PUL7', name: "Wallbox Pulsar Max", price: 1320 }]
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

  // Réduction aux services B2C pertinents
  const servicesOptions: ServiceOption[] = [
    { id: 'consuel', label: 'Consuel IRVE Officiel', price: 180, icon: <ShieldCheck size={18}/>, desc: "Certificat obligatoire." },
    { id: 'advenir', label: 'Dossier Aide Advenir', price: 150, icon: <FileText size={18}/>, desc: "Montage administratif." },
    { id: 'tic', label: 'Délestage TIC Linky', price: 120, icon: <Zap size={18}/>, desc: "Évite les coupures." },
    { id: 'rj45', label: 'Liaison Réseau RJ45', price: 140, icon: <Wifi size={18}/>, desc: "Stabilité maximale." }
  ];

  const faqs = [
    { q: "Quelles sont les aides de l'État pour l'installation ?", a: "En choisissant CHARGéO, installateur certifié IRVE, vous pouvez bénéficier de la Prime Advenir (jusqu'à 600€ en logement collectif). Nous gérons toutes les démarches administratives pour vous." },
    { q: "Quel est le délai d'installation ?", a: "Une fois le devis validé, notre agence locale intervient en moyenne sous 10 à 15 jours pour installer et mettre en service votre borne." },
    { q: "Les bornes sont-elles compatibles avec mon véhicule ?", a: "Oui, toutes nos bornes sont équipées du standard européen (Prise Type 2S) et sont 100% compatibles avec toutes les marques de véhicules électriques et hybrides rechargeables." },
    { q: "Pourquoi faut-il un installateur certifié IRVE ?", a: "C'est une obligation légale pour toute installation supérieure à 3,7 kW. Cela garantit votre sécurité, vous assure d'être couvert par votre assurance habitation en cas de sinistre, et est indispensable pour toucher la Prime Advenir." }
  ];

  const reviews = [
    {
      text: "Enfin un installateur qui explique clairement ce qu'on paie. Devis reçu en 2 min, pose en 10 jours.",
      author: "Jean-Philippe",
      location: "Thonon",
      image: "https://images.unsplash.com/photo-1692052664566-477579a08e8c?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc5fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "Intervention très propre. Le technicien a pris le temps de tout m'expliquer. Borne au top.",
      author: "Sophie",
      location: "Annecy",
      image: "https://images.unsplash.com/photo-1760539068164-e7186a197d09?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTc1fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    },
    {
      text: "Le prix annoncé sur le simulateur est exactement ce que j'ai payé. Aucune mauvaise surprise.",
      author: "Marc",
      location: "Annemasse",
      image: "https://images.unsplash.com/photo-1765272088009-100c96a4cd4e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTY2fHxib3JuZSUyMGRlJTIwcmVjaGFyZ2V8ZW58MHx8MHx8fDA%3D"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      if (simulatorRef.current) {
        const rect = simulatorRef.current.getBoundingClientRect();
        const isInSimulator = rect.top < window.innerHeight - 200 && rect.bottom > 200;
        setShowStickyBar(isInSimulator);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

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

    const totalHT = pack.price + s2 + s3 + s4;
    const totalTTC = totalHT * 1.055; // TVA 5.5%

    return { s1: pack.price, s2, s3, s4, totalHT, totalTTC, totalMeters, packName: pack.name };
  };

  const quote = calculateQuote();
  const formatTTC = (value: number) => value.toFixed(2).replace('.', ',');

  const updateRow = (type: 'path' | 'drill', index: number, field: keyof RowData, value: string | number) => {
    const setRows = type === 'path' ? setPathingRows : setDrillingRows;
    const rows = [...(type === 'path' ? pathingRows : drillingRows)];
    (rows[index] as any)[field] = value;
    setRows(rows);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0097b2]/20">
      
      {/* NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Logo light={!scrolled} />
          <div className="hidden lg:flex items-center gap-10">
            <div className="flex gap-8 text-[13px] font-black uppercase tracking-widest" style={{ color: scrolled ? brandNavy : '#fff' }}>
              <a href="#concept" className="hover:opacity-70 transition-opacity">Concept</a>
              <a href="#simulateur" className="hover:opacity-70 transition-opacity text-[#0097b2]">Chiffrage</a>
            </div>
          </div>
        </div>
      </nav>

      {/* STICKY BOTTOM BAR (MOBILE ONLY) */}
      <div className={`lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-transform duration-500 transform ${showStickyBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimation TTC*</p>
            <p className="text-2xl font-black" style={{ color: brandNavy }}>{formatTTC(quote.totalTTC)}€</p>
          </div>
          <a href="/contact" className="bg-[#032b60] text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 active:scale-95 transition-transform">
            Etre rappelé par un expert<ChevronRight size={18} />
          </a>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative h-[90vh] flex items-center overflow-hidden bg-[#032b60]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            className="w-full h-full object-cover scale-105 bg-[#032b60]" 
            alt="Installation CHARGéO" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#032b60]/95 via-[#032b60]/60 to-transparent"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <h1 className="text-5xl md:text-[6.5rem] font-black text-white tracking-tighter leading-[0.9] uppercase">
              La recharge <br/><span style={{ color: brandTeal }}>en toute clarté.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-medium max-w-2xl italic">
              "Fini les forfaits approximatifs. Configurez votre installation au mètre près. Nos experts IRVE locaux garantissent une pose zéro stress, protégeant votre domicile et la batterie de votre véhicule."
            </p>
            <div className="flex flex-col items-center gap-4 pt-4 w-full">
              <a href="#simulateur" className="inline-flex items-center justify-center gap-3 bg-[#0097b2] text-white px-12 py-5 rounded-full font-black text-lg shadow-2xl hover:brightness-110 transition-all w-fit">
                Estimer mon chiffrage <ArrowRight size={24}/>
              </a>
              <p className="text-white/60 text-sm font-bold tracking-wide mt-2">
                ✓ Experts locaux IRVE • Prime Advenir déduite • Garantie Décennale
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BANDEAU CONFIANCE */}
      <div className="bg-slate-50 border-y border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-12">
          <BrandLogo name="HAGER" url="https://upload.wikimedia.org/wikipedia/commons/d/d1/Hagerlogo.jpg" />
          <BrandLogo name="AUTEL" url="https://mms.businesswire.com/media/20230321006038/fr/1595853/4/AUTEL_New_Energy_Logo.jpg" />
          <BrandLogo name="WALLBOX" url="https://data.ladn.eu/wp-content/uploads/2022/12/Nomination-Wallbox-Myriam-Lhermurier-Boublil-1280x467.jpg?v=202602" />
          <BrandLogo name="ALFEN" url="https://upload.wikimedia.org/wikipedia/commons/3/39/Alfen_logo.svg" />
          <BrandLogo name="LEGRAND" url="https://upload.wikimedia.org/wikipedia/fr/3/3e/Logo_Legrand.svg" />
          <BrandLogo name="ABB" url="https://upload.wikimedia.org/wikipedia/commons/0/00/ABB_logo.svg" />
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
                Le réseau CHARGéO repose sur une transparence absolue. Chaque devis est construit sur notre base algorithmique pour garantir le prix juste. Sur le terrain, nos experts IRVE locaux, formés au standard d'excellence CHARGéO, assurent une installation 100% sécurisée et zéro stress.
              </p>
              <div className="space-y-6">
                {[
                  { i: <Zap/>, t: "1. Solution Borne", d: "La borne adaptée et son kit de protection électrique certifié." },
                  { i: <Construction/>, t: "2. Infrastructure", d: "Une pose au mètre réel. Vous ne payez que ce que nous installons." },
                  { i: <ShieldCheck/>, t: "3. Services & Admin", d: "Services techniques et administratifs optionnels." },
                  { i: <Truck/>, t: "4. Logistique", d: "Forfait déplacement optimisé au départ de l'agence la plus proche." }
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
              
              <div className="relative w-full rounded-[2.5rem] shadow-2xl aspect-[4/5] bg-slate-200 overflow-hidden">
                {reviews.map((review, idx) => (
                  <img 
                    key={idx}
                    src={review.image} 
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                      idx === currentReview ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                    alt={`Installation de borne de recharge - Avis ${idx + 1}`}
                  />
                ))}
              </div>
              
              <div className="absolute -bottom-10 -left-4 md:-left-10 bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 max-w-xs min-h-[220px] flex flex-col justify-between z-20">
                <div>
                    <div className="flex gap-1 text-yellow-400 mb-4">
                       {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor"/>)}
                    </div>
                    <div key={currentReview} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{reviews[currentReview].text}"</p>
                        <p className="mt-4 font-black text-[10px] uppercase tracking-widest text-[#0097b2]">— {reviews[currentReview].author}, {reviews[currentReview].location}</p>
                    </div>
                </div>
                <div className="flex gap-2 mt-6 justify-center">
                    {reviews.map((_, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => setCurrentReview(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentReview ? 'w-6 bg-[#0097b2]' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                            aria-label={`Aller à l'avis ${idx + 1}`}
                        />
                    ))}
                </div>
              </div>
           </div>
        </div>
      </section>

      {/* SIMULATEUR PROFESSIONNEL */}
      <section ref={simulatorRef} id="simulateur" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-5xl md:text-[7rem] font-black tracking-tighter uppercase leading-none" style={{ color: brandNavy }}>Simulateur <br/><span style={{ color: brandTeal }}>CHARGéO</span></h2>
            <div className="text-right">
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">Obtenez votre estimation en 2 minutes</p>
               <p className="text-sm font-medium text-slate-500 max-w-xs ml-auto mt-3">Ce simulateur est destiné aux particuliers. D'autres prestations, gammes de puissance et services sont disponibles sur demande.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start relative">
            
            {/* INPUTS COLUMN */}
            <div className="lg:col-span-7 space-y-8">
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

              <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8 text-center">
                 <h3 className="text-xl font-black uppercase tracking-[0.2em] flex items-center gap-4 justify-center"><MapPin style={{ color: brandTeal }}/> 4. Agence locale</h3>
                 <div className="space-y-6">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Distance parcourue par l'agence locale : {distance} km</p>
                   <input type="range" min="1" max="80" value={distance} onChange={(e) => setDistance(parseInt(e.target.value))} className="w-full h-2 accent-[#0097b2]" />
                   <div className="p-8 md:p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0097b2]/20 to-transparent opacity-50"></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 relative z-10">Zone tarifaire standardisée</p>
                      <p className="text-3xl md:text-4xl font-black relative z-10 tracking-tighter">{quote.s4 === 0 ? "LOGISTIQUE OFFERTE (Z1)" : `${quote.s4},00 € HT`}</p>
                   </div>
                 </div>
              </div>
            </div>

            {/* RESULTS COLUMN (STICKY REPARÉ ET PLUS COMPACT) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 z-10 w-full">
              <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 relative ring-1 ring-slate-100 flex flex-col gap-4">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#0097b2]/5 rounded-full blur-[100px] -mr-40 -mt-40 z-0"></div>
                
                <h3 className="text-lg font-black border-b pb-3 border-slate-100 uppercase tracking-[0.2em] flex items-center gap-3 italic relative z-10" style={{ color: brandNavy }}>
                  <FileText style={{ color: brandTeal }} size={20}/> Chiffrage Estimé
                </h3>
                
                <div className="space-y-3 font-mono text-[12px] relative z-10">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-400 uppercase text-[8px] font-bold tracking-[0.2em]">1 : Matériel</span>
                      <span className="font-black text-[11px] uppercase leading-tight mt-1">{quote.packName}</span>
                    </div>
                    <span className="font-black whitespace-nowrap">{quote.s1},00 € HT</span>
                  </div>
                  <div className="flex justify-between items-start border-t pt-3 border-slate-50 text-sm">
                    <span className="text-slate-400 uppercase text-[8px] font-bold tracking-[0.2em]">2 : Infra ({quote.totalMeters}m + 2m)</span>
                    <span className="font-black text-[#0097b2] whitespace-nowrap">+ {quote.s2},00 € HT</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 border-slate-50 text-sm">
                    <span className="text-slate-400 uppercase text-[8px] font-bold tracking-[0.2em]">3 : Services & Administratif</span>
                    <span className="font-black whitespace-nowrap">+ {quote.s3},00 € HT</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 border-slate-50 text-sm">
                    <span className="text-slate-400 uppercase text-[8px] font-bold tracking-[0.2em]">4 : Logistique</span>
                    <span className={`font-black whitespace-nowrap ${quote.s4 === 0 ? 'text-green-500' : ''}`}>{quote.s4 === 0 ? 'OFFERTE' : `+ ${quote.s4},00 € HT`}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-1 relative z-10">
                  <p className="text-[9px] text-slate-400 font-black uppercase italic mb-1">Estimation Net TTC (TVA 5.5%*)</p>
                  <p className="text-5xl font-black tracking-tighter leading-none" style={{ color: brandNavy }}>
                    {(() => {
                      const [int, dec] = formatTTC(quote.totalTTC).split(',');
                      return <>{int}<span className="text-2xl">,{dec}€</span></>;
                    })()}
                  </p>
                  <p className="text-[8px] text-slate-400 mt-1 leading-tight">*Taux de TVA à 5.5% applicable uniquement si le logement a plus de 2 ans.</p>
                </div>
                
                <div className="p-3 rounded-2xl text-center bg-green-50 border border-green-100 relative group cursor-pointer hover:bg-green-100 transition-colors z-10 mt-1">
                  <p className="text-[9px] font-black uppercase text-green-600 mb-1 tracking-widest">Prime Advenir (Collectif)</p>
                  <p className="text-xl font-black text-green-600">- 600,00 €</p>
                  <p className="text-[8px] text-green-700/60 mt-1 uppercase font-bold leading-tight">*Soumis à éligibilité, montant susceptible d'évoluer sans préavis.</p>
                </div>
                
                <div className="text-[10px] text-slate-500 font-medium leading-tight text-center mt-3 z-10 relative">
                  Lancement officiel de CHARGéO très prochainement. En remplissant ce formulaire, vous faites partie de nos premiers contacts prioritaires.
                </div>

                <a href="/contact" className="w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 bg-[#032b60] text-white shadow-xl hover:scale-[1.03] active:scale-95 group mt-1 relative z-10">
                  Etre rappelé par un expert <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase" style={{ color: brandNavy }}>
              Questions <span style={{ color: brandTeal }}>Fréquentes</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg">Tout ce que vous devez savoir avant de lancer votre installation.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 md:p-8 bg-slate-50 text-left transition-colors hover:bg-slate-100"
                >
                  <span className="font-black text-lg" style={{ color: brandNavy }}>{faq.q}</span>
                  <ChevronDown className={`transition-transform duration-300 shrink-0 ml-4 ${openFaq === idx ? 'rotate-180' : ''}`} style={{ color: brandTeal }} size={24} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 md:p-8 bg-white text-slate-500 font-medium leading-relaxed border-t border-slate-50">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#032B60] py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-16">
           <div className="space-y-10">
              <Logo light={true} className="scale-125 origin-left" />
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-white/40 uppercase text-[10px] font-black tracking-[0.3em]">
                    <Building2 size={16} /> Siège Social
                 </div>
                 <p className="text-white font-black text-2xl tracking-tighter uppercase leading-none">74200 Thonon-les-Bains</p>
                 <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">Entreprise en cours de création</p>
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