// ============================================================================
// INTERFACES BASE COMUNS
// ============================================================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface BaseEntityWithStatus extends BaseEntity {
  status: 'active' | 'inactive' | 'archived' | 'draft' | 'processing' | 'completed' | 'error';
}

export interface BaseEntityWithProject extends BaseEntityWithStatus {
  project_id: string;
}

// ============================================================================
// RESPOSTAS PADRÃO DA API
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FILTROS E PAGINAÇÃO COMUNS
// ============================================================================

export interface BaseFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectFilters extends BaseFilters {
  client?: string;
  priority?: string;
  manager?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserFilters extends BaseFilters {
  role?: string;
  isActive?: boolean;
  department?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface TeamFilters extends BaseFilters {
  department?: string;
  role?: string;
  isActive?: boolean;
}

export interface TakeoffFilters extends BaseFilters {
  project_id?: string;
  type?: string;
  status?: string;
  created_by?: string;
}

export interface BudgetFilters extends BaseFilters {
  project_id?: string;
  category?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CollaborationFilters extends BaseFilters {
  project_id?: string;
  type?: string;
  status?: string;
  user_id?: string;
}

// ============================================================================
// ESTATÍSTICAS COMUNS
// ============================================================================

export interface BaseStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
}

export interface ProjectStats extends BaseStats {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byManager: Record<string, number>;
  totalBudget: number;
  totalEstimatedValue: number;
  averageProgress: number;
}

export interface UserStats extends BaseStats {
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
  activeUsers: number;
  newUsersThisMonth: number;
}

export interface TeamStats extends BaseStats {
  byDepartment: Record<string, number>;
  byRole: Record<string, number>;
  totalHours: number;
  averageEfficiency: number;
}

// ============================================================================
// OPERAÇÕES COMUNS
// ============================================================================

export interface CreateOperation<T> {
  data: Omit<T, 'id' | 'created_at' | 'updated_at'>;
  user_id: string;
}

export interface UpdateOperation<T> {
  id: string;
  data: Partial<Omit<T, 'id' | 'created_at' | 'created_by'>>;
  user_id: string;
}

export interface DeleteOperation {
  id: string;
  user_id: string;
  soft_delete?: boolean;
}

export interface BulkOperation<T> {
  items: T[];
  user_id: string;
}

// ============================================================================
// VALIDAÇÃO E ERROS
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: ValidationError[];
  code?: string;
}

// ============================================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
  role: string;
  type: string;
  permissions?: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface PermissionCheck {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  user_id: string;
  project_id?: string;
}

// ============================================================================
// ARQUIVOS E UPLOADS
// ============================================================================

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  checksum?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FileValidation {
  allowedTypes: string[];
  maxSize: number;
  allowedExtensions: string[];
}

// ============================================================================
// NOTIFICAÇÕES E LOGS
// ============================================================================

export interface NotificationData {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  user_id: string;
  project_id?: string;
  read: boolean;
  created_at: string;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  user_id?: string;
  project_id?: string;
  action: string;
  details?: any;
  timestamp: string;
}

// ============================================================================
// CONFIGURAÇÕES E PREFERÊNCIAS
// ============================================================================

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  display: {
    itemsPerPage: number;
    showThumbnails: boolean;
    compactMode: boolean;
  };
}

export interface SystemConfig {
  key: string;
  value: any;
  description: string;
  category: string;
  editable: boolean;
  updated_at: string;
  updated_by: string;
}


