export interface AuditLog {
  id: number;
  action: string;
  user_id: string | null;
  email: string | null;
  resource: string;
  resource_id: string;
  details: string;
  created_at: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
}
