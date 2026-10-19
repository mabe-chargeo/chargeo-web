"use client";

// Signature au doigt sur le téléphone (PV de réception, décision de Matthieu du 18/10/2026, 16 h 04).
// Cadre blanc, trait navy ; rend la signature en JPEG base64 (fond blanc) à chaque levée du doigt, null si effacée.
import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { CYAN } from '@/components/charte/couleurs';

export default function PadSignature({ libelle, onChange }: { libelle: string; onChange: (jpeg: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const enCours = useRef(false);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const [signe, setSigne] = useState(false);

  const preparer = () => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.strokeStyle = '#032b60';
    ctx.fillStyle = '#032b60';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setSigne(false);
    onChange(null);
  };
  useEffect(() => { preparer(); }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const debut = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    enCours.current = true;
    const p = point(e);
    dernier.current = p;
    const ctx = e.currentTarget.getContext('2d');
    ctx?.beginPath();
    ctx?.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
    ctx?.fill();
  };
  const trace = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enCours.current || !dernier.current) return;
    e.preventDefault();
    const p = point(e);
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(dernier.current.x, dernier.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    dernier.current = p;
  };
  const fin = () => {
    if (!enCours.current) return;
    enCours.current = false;
    dernier.current = null;
    setSigne(true);
    const url = ref.current?.toDataURL('image/jpeg', 0.85) || '';
    onChange(url.split(',')[1] || null);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[14px] font-bold">{libelle}</p>
        {signe && (
          <button type="button" onClick={preparer} className="flex items-center gap-1 text-[13px] font-semibold" style={{ color: CYAN }}>
            <Eraser size={14} /> Effacer
          </button>
        )}
      </div>
      <canvas
        ref={ref}
        onPointerDown={debut}
        onPointerMove={trace}
        onPointerUp={fin}
        onPointerCancel={fin}
        onPointerLeave={fin}
        className="block h-[180px] w-full rounded-[14px] bg-white ring-[1.5px] ring-[#dfe3e8]"
        style={{ touchAction: 'none' }}
      />
      {!signe && <p className="mt-1 text-[12px]">Signe avec le doigt dans le cadre.</p>}
    </div>
  );
}
