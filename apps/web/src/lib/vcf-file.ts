/**
 * Prepares a .vcf file in the browser before upload. Phones put contact
 * photos in the file as base64, which can make it many megabytes; the app
 * does not import photos, so they are removed here and never leave the
 * device. Pure, so it is unit-tested.
 */
const BINARY = /^(?:[\w-]+\.)?(PHOTO|LOGO|SOUND|KEY)[;:]/i;

export function stripBinaryProperties(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const continuation = line.startsWith(' ') || line.startsWith('\t');
    if (continuation && skipping) continue;
    // vCard 2.1 base64 bodies continue on unindented lines until a blank line.
    if (
      skipping &&
      !continuation &&
      line.trim() !== '' &&
      !/^[\w.-]+[;:]/.test(line)
    ) {
      continue;
    }
    skipping = BINARY.test(line);
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

/** Largest text accepted, matching the API (after photos are removed). */
export const MAX_VCF_CHARS = 4_000_000;

export function countCards(text: string): number {
  return (text.match(/^BEGIN:VCARD\s*$/gim) ?? []).length;
}
