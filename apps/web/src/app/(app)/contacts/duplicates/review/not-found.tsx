import Link from 'next/link';

export default function PairNotFound() {
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        This pair is no longer available
      </h1>
      <p className="text-muted">
        One of the contacts may have been merged, moved to the trash or deleted.
      </p>
      <Link href="/contacts/duplicates" className="underline">
        Back to duplicates
      </Link>
    </div>
  );
}
