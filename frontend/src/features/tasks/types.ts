export type PriorityKey = 'none' | 'dusuk' | 'orta' | 'yuksek' | 'kritik';
export type LevelKey = 'temel' | 'orta' | 'ileri';

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
  subtasks?: Subtask[];
  comments?: TaskComment[];
}

export type FilterStatus = 'all' | 'active' | 'completed';

export interface TaskFilterState {
  search: string;
  status: FilterStatus;
  section: string;
  priority: string;
}
