import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { cn } from 'shared/lib/cn';
import { useAuth } from 'features/auth/context/AuthContext';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { useUpdateTask } from 'features/tasks/hooks/useTaskMutations';
import { getTaskTitle, getSection } from 'features/tasks/utils/grouping';
import { getPriorityInfo } from 'features/tasks/utils/priority';
import { useToast } from 'shared/ui/Toast';
import { Spinner } from 'shared/ui/Spinner';
import { EmptyState } from 'shared/ui/EmptyState';
import type { Task } from 'features/tasks/types';

interface Column {
  id: 'todo' | 'done';
  title: string;
  accentClass: string;
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'Yapilacak', accentClass: 'border-t-brand' },
  { id: 'done', title: 'Tamamlandi', accentClass: 'border-t-status-green' },
];

export function KanbanBoard() {
  const { isAuthenticated } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const toast = useToast();
  const [filterSection, setFilterSection] = useState('all');

  const allSections = useMemo(
    () => [...new Set(tasks.map((t) => getSection(t)))],
    [tasks],
  );

  const filtered = useMemo(
    () =>
      filterSection === 'all'
        ? tasks
        : tasks.filter((t) => getSection(t) === filterSection),
    [tasks, filterSection],
  );

  const columnTasks = useMemo(
    () => ({
      todo: filtered.filter((t) => !t.completed),
      done: filtered.filter((t) => t.completed),
    }),
    [filtered],
  );

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    if (!isAuthenticated) {
      toast.error('Bu islemi yapmak icin giris yapin');
      return;
    }

    const taskId = draggableId;
    const task = tasks.find((t) => String(t.id) === taskId);
    if (!task) return;

    const newCompleted = destination.droppableId === 'done';
    if (task.completed === newCompleted) return;

    updateTask.mutate(
      { id: task.id, patch: { completed: newCompleted } },
      {
        onSuccess: () =>
          toast.success(newCompleted ? 'Gorev tamamlandi!' : 'Gorev yeniden acildi'),
      },
    );
  };

  if (isLoading) return <Spinner label="Gorevler yukleniyor..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Kanban Board</h2>
          <p className="text-sm text-muted mt-1">
            Gorevleri surukleyerek durumunu degistir
          </p>
        </div>
        {allSections.length > 1 && (
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="px-3 py-2 bg-navy-800 border border-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50"
          >
            <option value="all">Tum Bolumler</option>
            {allSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COLUMNS.map((col) => {
            const items = columnTasks[col.id];
            return (
              <div
                key={col.id}
                className={cn(
                  'bg-navy-800 border border-border rounded-xl border-t-2',
                  col.accentClass,
                )}
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{col.title}</h3>
                  <span className="text-[11px] text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'p-3 min-h-[280px] space-y-2 transition-colors',
                        snapshot.isDraggingOver && 'bg-brand/5',
                      )}
                    >
                      {items.map((task, index) => (
                        <KanbanCard key={task.id} task={task} index={index} />
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <EmptyState className="border-none bg-transparent py-16">
                          {col.id === 'todo'
                            ? 'Tum gorevler tamamlandi!'
                            : 'Henuz tamamlanan gorev yok'}
                        </EmptyState>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function KanbanCard({ task, index }: { task: Task; index: number }) {
  const pri = getPriorityInfo(task.priority);
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const comments = task.comments ?? [];

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'bg-navy-900 border border-border rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-shadow',
            snapshot.isDragging && 'shadow-glow border-brand/40',
          )}
        >
          <p className="text-sm font-medium text-ink mb-2.5">
            {getTaskTitle(task)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted bg-white/5 px-2 py-0.5 rounded-md">
              {getSection(task)}
            </span>
            {pri.key !== 'none' && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-md border',
                  pri.colorClass,
                )}
              >
                {pri.label}
              </span>
            )}
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted">
                {subDone}/{subtasks.length} alt gorev
              </span>
            )}
            {comments.length > 0 && (
              <span className="text-[10px] text-muted ml-auto">
                {comments.length} yorum
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
