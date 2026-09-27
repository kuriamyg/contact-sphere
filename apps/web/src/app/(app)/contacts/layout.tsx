/**
 * Contacts on a laptop: the list pane (@pane) beside whatever contact page
 * is open, so the list stays put while the right side loads. The pane
 * renders nothing on phones and on pages it does not belong to; the grid
 * applies only when it is there.
 */
export default function ContactsLayout({
  children,
  pane,
}: {
  children: React.ReactNode;
  pane: React.ReactNode;
}) {
  return (
    <div className="gap-8 lg:has-[>[data-pane]]:grid lg:has-[>[data-pane]]:grid-cols-[22rem_minmax(0,1fr)] xl:has-[>[data-pane]]:grid-cols-[24rem_minmax(0,1fr)]">
      {pane}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
