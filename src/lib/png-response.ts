// src/lib/png-response.ts
//
// Sert une image PNG embarquee en base64. Utilise par les icones du site et le
// logo lu par Google : chaque image vit dans un fichier texte (route.ts), ce
// qui permet de la mettre a jour sans manipuler de fichier binaire.

export function pngResponse(base64: string): Response {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=604800",
    },
  });
}
