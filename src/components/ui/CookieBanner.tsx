"use client";

import React from "react";
import CookieConsent from "react-cookie-consent";

export function CookieBanner() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/(^| )chargeo-gdpr-consent=([^;]+)/);
      const consent = match ? match[2] : null;
      if (consent) {
        const state = consent === "true" ? "granted" : "denied";
        (window as any).dataLayer = (window as any).dataLayer || [];
        const gtag = function(..._args: any[]){(window as any).dataLayer.push(arguments);};
        gtag('consent', 'update', {
          'ad_storage': state,
          'ad_user_data': state,
          'ad_personalization': state,
          'analytics_storage': state
        });
      }
    }
  }, []);

  return (
    <CookieConsent
      location="bottom"
      buttonText="J'accepte"
      declineButtonText="Je refuse"
      enableDeclineButton
      cookieName="chargeo-gdpr-consent"
      disableStyles={false}
      style={{ 
        background: "#032b60", // Bleu marine CHARGÉO
        color: "#fff", 
        fontSize: "14px", 
        alignItems: "center",
        padding: "16px",
        zIndex: 99999
      }}
      buttonStyle={{ 
        background: "#0097b2", // Turquoise CHARGÉO
        color: "#fff", 
        fontSize: "14px", 
        fontWeight: "900", 
        borderRadius: "9999px", 
        padding: "12px 24px",
        cursor: "pointer"
      }}
      declineButtonStyle={{ 
        background: "transparent", 
        color: "#fff", 
        fontSize: "14px", 
        fontWeight: "bold",
        border: "1px solid rgba(255,255,255,0.3)", 
        borderRadius: "9999px", 
        padding: "12px 24px",
        cursor: "pointer"
      }}
      expires={180} // Durée légale de conservation du choix (6 mois)
      onAccept={() => {
        if (typeof window !== "undefined") {
          (window as any).dataLayer = (window as any).dataLayer || [];
          function gtag(cmd: string, action: string, params: any){(window as any).dataLayer.push(arguments);}
          gtag('consent', 'update', {
            'ad_storage': 'granted',
            'ad_user_data': 'granted',
            'ad_personalization': 'granted',
            'analytics_storage': 'granted'
          });
        }
      }}
      onDecline={() => {
        if (typeof window !== "undefined") {
          (window as any).dataLayer = (window as any).dataLayer || [];
          function gtag(cmd: string, action: string, params: any){(window as any).dataLayer.push(arguments);}
          gtag('consent', 'update', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'denied'
          });
        }
      }}
    >
      <div className="font-medium leading-relaxed">
        Nous utilisons des cookies pour analyser notre trafic et mesurer l'efficacité de nos campagnes publicitaires. 
        Pour en savoir plus, consultez notre <a href="/mentions-legales" className="underline text-[#0097b2] hover:text-white transition-colors">Politique de confidentialité</a>.
      </div>
    </CookieConsent>
  );
}