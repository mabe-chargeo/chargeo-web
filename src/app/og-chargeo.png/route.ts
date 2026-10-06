// src/app/og-chargeo.png/route.ts
//
// Image d'apercu de partage (WhatsApp, LinkedIn, Facebook, SMS) : logo CHARGéO
// avec slogan sur fond navy, 1200 x 630. Generee a la demande par next/og a
// partir du logo deja present dans public/ : aucun fichier binaire a maintenir.
import { ImageResponse } from "next/og";
import { createElement as h } from "react";

export async function GET(req: Request): Promise<Response> {
  const logo = new URL("/logo-chargeo-slogan-blanc.svg", req.url).toString();
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          backgroundColor: "#032b60",
        },
      },
      h("div", { style: { width: 150, height: 10, borderRadius: 5, backgroundColor: "#0097b2", marginBottom: 40 } }),
      // eslint-disable-next-line @next/next/no-img-element
      h("img", { src: logo, width: 720, height: 234, alt: "" })
    ),
    { width: 1200, height: 630 }
  );
}
