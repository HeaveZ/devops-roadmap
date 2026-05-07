export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  priority: string;
  section: string;
}

const STORAGE_KEY = 'taskly-templates';

const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    title: '[BUG] ',
    description: 'Hata aciklamasi:\n\nBeklenen davranis:\n\nGerceklesen davranis:\n\nAdimlar:',
    priority: 'yuksek',
    section: '',
  },
  {
    id: 'feature',
    name: 'Yeni Ozellik',
    title: '[FEAT] ',
    description: 'Ozellik aciklamasi:\n\nKabul kriterleri:\n- [ ] \n- [ ] ',
    priority: 'orta',
    section: '',
  },
  {
    id: 'devops',
    name: 'DevOps Gorevi',
    title: '[OPS] ',
    description: 'Gorev:\n\nOrtam: staging / production\n\nKontrol listesi:\n- [ ] Backup\n- [ ] Test\n- [ ] Deploy',
    priority: 'kritik',
    section: 'DevOps',
  },
];

export function getTemplates(): TaskTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_TEMPLATES;
}

export function saveTemplate(template: TaskTemplate): void {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === template.id);
  if (idx >= 0) templates[idx] = template;
  else templates.push(template);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
