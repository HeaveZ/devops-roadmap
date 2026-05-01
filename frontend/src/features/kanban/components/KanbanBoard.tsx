import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Task, TaskStatus } from 'features/tasks/types';

interface Column {
  id: 'todo' | 'in_progress' | 'in_review' | 'done';
  title: string;
  accentClass: string;
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'Yapilacak', accentClass: 'border-t-brand' },
  { id: 'in_progress', title: 'Devam Ediyor', accentClass: 'border-t-accent-orange' },
  { id: 'in_review', title: 'Incelemede', accentClass: 'border-t-purple-500' },
  { id: 'done', title: 'Tamamlandi', accentClass: 'border-t-status-green' },
];

export function KanbanBoard() {
  const { isAuthenticated } = useAuth();
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const toast = useToast();
  const navigate = useNavigate();
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

  const getTaskStatus = (t: Task): TaskStatus => {
    if (t.status) return t.status;
    return t.completed ? 'done' : 'todo';
  };

  const columnTasks = useMemo(
    () => ({
      todo: filtered.filter((t) => getTaskStatus(t) === 'todo'),
      in_progress: filtered.filter((t) => getTaskStatus(t) === 'in_progress'),
      in_review: filtered.filter((t) => getTaskStatus(t) === 'in_review'),
      done: filtered.filter((t) => getTaskStatus(t) === 'done'),
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

    const newStatus = destination.droppableId as TaskStatus;
    const currentStatus = getTaskStatus(task);
    if (currentStatus === newStatus) return;

    updateTask.mutate(
      { id: task.id, patch: { status: newStatus } },
      {
        onSuccess: () => {
          const statusLabel = COLUMNS.find((c) => c.id === newStatus)?.title ?? newStatus;
          toast.success(`Gorev durumu: ${statusLabel}`);
        },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              items={columnTasks[col.id]}
              onNavigate={(taskId) => navigate(`/tasks/${taskId}`)}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

function KanbanColumn({ column, items, onNavigate }: { column: Column; items: Task[]; onNavigate: (id: string | number) => void }) {
  return (
    <div className={cn('bg-navy-800 border border-border rounded-xl border-t-2', column.accentClass)}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink">{column.title}</h3>
        <span className="text-[11px] text-muted bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn('p-3 min-h-[280px] space-y-2 transition-colors', snapshot.isDraggingOver && 'bg-brand/5')}
          >
            {items.map((task, index) => (
              <KanbanCard key={task.id} task={task} index={index} onNavigate={() => onNavigate(task.id)} />
            ))}
            {provided.placeholder}
            {items.length === 0 && (
              <EmptyState className="border-none bg-transparent py-16">Bu kolonda gorev yok</EmptyState>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function KanbanCard({ task, index, onNavigate }: { task: Task; index: number; onNavigate: () => void }) {
  const pri = getPriorityInfo(task.priority);
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.completed).length;
  const comments = task.comments ?? [];
  const taskLabels = task.labels ?? [];

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          role="button"
          tabIndex={0}
          onClick={onNavigate}
          onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(); }}
          className={cn(
            'bg-navy-900 border border-border rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-shadow hover:border-brand/30',
            snapshot.isDragging && 'shadow-glow border-brand/40',
          )}
        >
          {taskLabels.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {taskLabels.map((label) => (
                <span
                  key={label.id}
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}

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
          {(task.assignee_email || task.due_date) && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted">
              {task.assignee_email && (
                <span className="bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={task.assignee_email}>
                  {task.assignee_email.split('@')[0]}
                </span>
              )}
              {task.due_date && (
                <span className="ml-auto bg-white/5 px-1.5 py-0.5 rounded">
                  {new Date(task.due_date).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
