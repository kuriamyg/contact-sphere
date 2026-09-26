import Link from 'next/link';

export default function ContactNotFound() {
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        Contact not found
      </h1>
      <p className="text-muted">
        It may have been deleted for good, or the link is wrong.
      </p>
      <Link href="/contacts" className="underline">
        Back to contacts
      </Link>
    </div>
  );
}
