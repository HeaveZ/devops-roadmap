import { usePageTitle } from 'shared/hooks/usePageTitle';
import { ActivityFeed } from 'features/activity/components/ActivityFeed';

export function ActivityPage() {
  usePageTitle('Aktivite');
  return <ActivityFeed />;
}
