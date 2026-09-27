import { ContactListPane } from '@/components/contacts/contact-list-pane';
import { parseListParams } from '@/lib/contact-params';
import { UUID } from '@/lib/contacts';
import { isWide } from '@/lib/wide';

/**
 * Beside a contact (and its edit and QR pages), laptops only. Other pages
 * under /contacts (new, import, tags, duplicates) are not ids: no pane.
 */
export default async function ContactPane({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!UUID.test(id) || !(await isWide())) return null;
  return (
    <ContactListPane p={parseListParams(await searchParams)} selectedId={id} />
  );
}
