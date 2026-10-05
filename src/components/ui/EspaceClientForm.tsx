"use client";

// Connexion à l'Espace client : logique inchangée (/api/espace-client, redirection). Habillage charte 2026.
import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

const CHAMP = "w-full bg-white text-[#032b60] text-[15px] rounded-[14px] border-0 ring-[1.5px] ring-[#dfe3e8] focus:ring-2 focus:ring-[#0097b2] block px-4 py-3.5 transition outline-none placeholder:text-slate-400";
const ETIQUETTE = "mb-2 ml-1 block text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#032b60]";

export function EspaceClientForm({ defaultDossier = '' }: { defaultDossier?: string }) {
  const [dossier, setDossier] = useState(defaultDossier);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/espace-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && data?.redirect) {
        window.location.href = data.redirect;
        return;
      }
      setError(data?.error || 'Une erreur est survenue. Réessayez dans un instant.');
    } catch {
      setError('Une erreur est survenue. Réessayez dans un instant.');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="dossier" className={ETIQUETTE}>Numéro de dossier</label>
        <input
          id="dossier"
          name="dossier"
          type="text"
          required
          autoComplete="off"
          value={dossier}
          onChange={(e) => setDossier(e.target.value.trim())}
          placeholder="Ex. 86c1ab2cd"
          className={CHAMP}
        />
      </div>

      <div>
        <label htmlFor="email" className={ETIQUETTE}>Email utilisé lors de votre demande</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
          className={CHAMP}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-[14px] bg-white px-4 py-3 text-[15px] leading-relaxed text-[#032b60]" style={{ boxShadow: 'inset 4px 0 0 #FF6B00' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group inline-flex w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
        style={{ backgroundColor: '#FF6B00', boxShadow: '0 8px 22px rgba(255,107,0,0.28)' }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
        Accéder à mon dossier {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
