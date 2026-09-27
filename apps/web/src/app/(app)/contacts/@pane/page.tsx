import { ContactListPane } from '@/components/contacts/contact-list-pane';
import { parseListParams } from '@/lib/contact-params';
import { isWide } from '@/lib/wide';

/** Beside the Contacts page (laptops only). */
export default async function ListPane({
  searchParams,
}: PageProps<'/contacts'>) {
  if (!(await isWide())) return null;
  return (
    <ContactListPane
      p={parseListParams(await searchParams)}
      selectedId={null}
    />
  );
}
