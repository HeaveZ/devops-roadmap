import { useMemo, useState } from 'react';
import { useDebounce } from 'shared/hooks/useDebounce';
import { getSection, getTaskTitle } from '../utils/grouping';
import type { FilterStatus, Task, TaskFilterState } from '../types';

export interface TaskFiltersApi {
  state: TaskFilterState;
  setSearch: (v: string) => void;
  setStatus: (v: FilterStatus) => void;
  setSection: (v: string) => void;
  setPriority: (v: string) => void;
  setAssignee: (v: string) => void;
  setLabel: (v: string) => void;
  setSprint: (v: string) => void;
  reset: () => void;
  sections: string[];
  filtered: Task[];
  activeFilterCount: number;
}

const DEFAULT_STATE: TaskFilterState = {
  search: '',
  status: 'all',
  section: 'all',
  priority: 'all',
  assignee: 'all',
  label: 'all',
  sprint: 'all',
};

export function useTaskFilters(tasks: Task[]): TaskFiltersApi {
  const [state, setState] = useState<TaskFilterState>(DEFAULT_STATE);
  const debouncedSearch = useDebounce(state.search, 180);

  const sections = useMemo(
    () => Array.from(new Set(tasks.map(getSection))),
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !getTaskTitle(t).toLowerCase().includes(q)) return false;
      if (state.status === 'active' && t.completed) return false;
      if (state.status === 'completed' && !t.completed) return false;
      if (state.section !== 'all' && getSection(t) !== state.section) return false;
      if (state.priority !== 'all' && (t.priority ?? 'none') !== state.priority) return false;
      if (state.assignee !== 'all' && (t.assignee_email ?? '') !== state.assignee) return false;
      if (state.label !== 'all' && !(t.labels ?? []).some((l) => l.name === state.label)) return false;
      if (state.sprint !== 'all' && String(t.sprint_id ?? '') !== state.sprint) return false;
      return true;
    });
  }, [tasks, debouncedSearch, state]);

  const activeFilterCount =
    (state.search ? 1 : 0) +
    (state.status !== 'all' ? 1 : 0) +
    (state.section !== 'all' ? 1 : 0) +
    (state.priority !== 'all' ? 1 : 0) +
    (state.assignee !== 'all' ? 1 : 0) +
    (state.label !== 'all' ? 1 : 0) +
    (state.sprint !== 'all' ? 1 : 0);

  return {
    state,
    setSearch: (search) => setState((s) => ({ ...s, search })),
    setStatus: (status) => setState((s) => ({ ...s, status })),
    setSection: (section) => setState((s) => ({ ...s, section })),
    setPriority: (priority) => setState((s) => ({ ...s, priority })),
    setAssignee: (assignee) => setState((s) => ({ ...s, assignee })),
    setLabel: (label) => setState((s) => ({ ...s, label })),
    setSprint: (sprint) => setState((s) => ({ ...s, sprint })),
    reset: () => setState(DEFAULT_STATE),
    sections,
    filtered,
    activeFilterCount,
  };
}
