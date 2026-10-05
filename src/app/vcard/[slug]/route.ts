import { VCARD_CONTACTS, type VCardContact } from "@/lib/vcard-contacts";

// Échappe les caractères spéciaux du format vCard (RFC 6350)
const esc = (v: string) =>
  v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

function buildVCard(c: VCardContact): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(c.nom)};${esc(c.prenom)};;;`,
    `FN:${esc(`${c.prenom} ${c.nom}`)}`,
    `ORG:${esc(c.entreprise)}`,
    `TITLE:${esc(c.fonction)}`,
  ];
  if (c.mobile) lines.push(`TEL;TYPE=CELL,VOICE:${c.mobile}`);
  if (c.fixe) lines.push(`TEL;TYPE=WORK,VOICE:${c.fixe}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${c.email}`);
  if (c.site) lines.push(`URL:${c.site}`);
  if (c.adresse) {
    const a = c.adresse;
    lines.push(`ADR;TYPE=WORK:;;${esc(a.rue)};${esc(a.ville)};;${esc(a.codePostal)};${esc(a.pays)}`);
  }
  if (c.note) lines.push(`NOTE:${esc(c.note)}`);
  lines.push(`REV:${new Date().toISOString()}`, "END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const contact = VCARD_CONTACTS[slug.toLowerCase()];
  if (!contact) return new Response("Fiche contact introuvable", { status: 404 });

  const filename = `${contact.prenom}-${contact.nom}-CHARGEO.vcf`.replace(/\s+/g, "-");
  return new Response(buildVCard(contact), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Toute modification de la fiche est visible en moins de 5 minutes
      "Cache-Control": "public, max-age=0, s-maxage=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
