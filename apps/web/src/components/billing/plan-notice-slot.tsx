import type { Locale } from '@/i18n/locales';
import type { CurrentUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { planNoticeNow } from '@/lib/plan-notice';

import { PlanBanner } from './plan-banner';

/** Shows the plan-ending banner when it applies (C1); nothing otherwise. */
export function PlanNoticeSlot({
  user,
  locale,
}: {
  user: CurrentUser;
  locale: Locale;
}) {
  const { notice, now } = planNoticeNow(user);
  if (!notice) return null;
  return (
    <PlanBanner
      userId={user.id}
      notice={notice}
      date={formatDate(notice.until, locale)}
      now={now}
    />
  );
}
