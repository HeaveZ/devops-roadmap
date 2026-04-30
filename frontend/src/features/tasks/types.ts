export type PriorityKey = 'none' | 'dusuk' | 'orta' | 'yuksek' | 'kritik';
export type LevelKey = 'temel' | 'orta' | 'ileri';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Sprint {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
}

export interface Subtask {
  id: number | string;
  parent_id?: number | string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: number | string;
  task_id?: number | string;
  text: string;
  author: string;
  created_at: string;
}

export interface Task {
  id: number | string;
  title?: string;
  name?: string;
  completed: boolean;
  priority?: PriorityKey | string;
  section?: string;
  category?: string;
  level?: string;
  difficulty?: string;
  description?: string;
  status?: TaskStatus;
  assignee_email?: string;
  due_date?: string | null;
  sprint_id?: number | null;
  labels?: Label[];
  subtasks?: Subtask[];
  comments?: TaskComment[];
}

export type FilterStatus = 'all' | 'active' | 'completed';

export interface TaskFilterState {
  search: string;
  status: FilterStatus;
  section: string;
  priority: string;
  assignee: string;
  label: string;
  sprint: string;
}
