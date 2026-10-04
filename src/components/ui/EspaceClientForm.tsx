"use client";

import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

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
        <label htmlFor="dossier" className="block text-xs font-black uppercase tracking-widest text-[#032b60] mb-2">
          Numéro de dossier
        </label>
        <input
          id="dossier"
          name="dossier"
          type="text"
          required
          autoComplete="off"
          value={dossier}
          onChange={(e) => setDossier(e.target.value.trim())}
          placeholder="Ex. 86c1ab2cd"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-800 font-medium focus:outline-none focus:border-[#0097b2] focus:bg-white transition-colors"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-[#032b60] mb-2">
          Email utilisé lors de votre demande
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-800 font-medium focus:outline-none focus:border-[#0097b2] focus:bg-white transition-colors"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-800 font-medium leading-relaxed">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-3 bg-[#FF6B00] hover:bg-[#E66000] disabled:opacity-60 text-white px-8 py-4 rounded-full font-black transition-all shadow-[0_4px_14px_rgba(255,107,0,0.3)]"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
        Accéder à mon dossier {!loading && <ArrowRight size={18} />}
      </button>
    </form>
  );
}
