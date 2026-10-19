// Fichier prêt à l'envoi depuis le téléphone : photo réduite à 1600 px en JPEG (limite de taille et réseau de chantier),
// PDF envoyé tel quel. Sorti de la réception (src/components/interne/Reception.tsx) le 19/10/2026 pour servir aussi à la
// photo du bon de livraison d'une commande (src/components/ui/Suivi.tsx). Navigateur seulement.

// Taille maximale d'un envoi (limite des routes Vercel)
export const TAILLE_MAX_ENVOI = 4 * 1024 * 1024;

export async function preparerFichier(fichier: File): Promise<File> {
  if (!fichier.type.startsWith('image/')) return fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * echelle);
    canvas.height = Math.round(image.height * echelle);
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob) return fichier;
    return new File([blob], fichier.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return fichier;
  }
}
