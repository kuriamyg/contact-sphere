import Link from 'next/link';

export default function GroupNotFound() {
  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        That group does not exist
      </h1>
      <p className="text-muted">It may have been deleted.</p>
      <Link href="/groups" className="underline">
        Back to groups
      </Link>
    </div>
  );
}
