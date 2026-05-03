import { usePageTitle } from 'shared/hooks/usePageTitle';
import { KanbanBoard } from 'features/kanban/components/KanbanBoard';

export function KanbanPage() {
  usePageTitle('Kanban Board');
  return <KanbanBoard />;
}
