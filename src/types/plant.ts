// Interfaces unificadas para o sistema de plantas
export interface BasePlant {
  id: string;
  name: string;
  code: string;
  description?: string;
  project_id: string;
  status: 'active' | 'archived' | 'draft' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface PlantFile extends BasePlant {
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: string;
  mime_type?: string;
  thumbnail_path?: string;
  original_filename?: string;
}

export interface PlantWithVersioning extends PlantFile {
  version_number: string;
  version_name?: string;
  is_current: boolean;
  parent_version_id?: string;
  change_log: VersionChange[];
}

// Interface principal para plantas (compatível com frontend e backend)
export interface Plant extends PlantFile {
  category_id?: number;
  ocr_text?: string;
  metadata?: any;
  filename?: string;
  sheet_id?: string;
  uploaded_by?: string;
  category?: string;
  pages_count?: number;
  avg_confidence?: number;
  location?: string;
}

// Interface para criação de plantas
export interface PlantCreationAttributes {
  name: string;
  code: string;
  description?: string;
  category_id?: number;
  project_id: string;
  status: string;
  file_path: string;
  file_url: string;
  thumbnail_path?: string;
  file_size: number;
  file_type: string;
  mime_type?: string;
  original_filename?: string;
  ocr_text?: string;
  metadata?: any;
  created_by: string;
  uploaded_by?: string;
  category?: string;
  pages_count?: number;
  avg_confidence?: number;
  location?: string;
}

// Interface para listagem com filtros
export interface PlantListOptions {
  project_id?: string | null;
  status?: string;
  search?: string;
  category_id?: number | null;
  limit: number;
  offset: number;
}

// Interface para versionamento
export interface PlantVersion {
  id: string;
  plant_id: string;
  version_number: string;
  version_name: string;
  description?: string;
  file_path: string;
  thumbnail_path?: string;
  file_size: number;
  file_type: string;
  checksum?: string;
  status: 'draft' | 'review' | 'approved' | 'archived' | 'deprecated';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  parent_id?: string;
  children: PlantVersion[];
  depth: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
  approval_info?: any;
  tags?: string[];
  metadata?: {
    scale?: string;
    units?: string;
    dimensions?: { width: number; height: number; unit: string };
    layers?: string[];
    annotations_count?: number;
    measurements_count?: number;
    last_modified?: string;
    software_used?: string;
    software_version?: string;
    [key: string]: any;
  };
  change_log: VersionChange[];
}

// Interface para criação de versões
export interface CreateVersionRequest {
  plant_id: string;
  version_number: string;
  version_name: string;
  description?: string;
  file_path: string;
  thumbnail_path?: string;
  file_size: number;
  file_type: string;
  parent_id?: string;
  is_current?: boolean;
  checksum?: string;
  tags?: string[];
  metadata?: any;
}

// Interface para mudanças de versão
export interface VersionChange {
  id: string;
  type: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  description: string;
  author_id: string;
  author_name: string;
  timestamp: string;
  related_versions: string[];
  metadata?: any;
}

// Interface para nós de versão (árvore)
export interface VersionNode {
  id: string;
  version_number: string;
  version_name: string;
  status: 'draft' | 'review' | 'approved' | 'archived' | 'deprecated';
  created_at: string;
  parent_id?: string | null;
  children: VersionNode[];
  depth: number;
  is_current: boolean;
}

// Interface para páginas das plantas
export interface PlantPage {
  id: string;
  plant_id: string;
  page_number: number;
  file_path: string;
  thumbnail_path?: string;
  width: number;
  height: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  sheet_id?: string;
  text?: string;
  file_url?: string;
  category?: string;
  ocr_confidence?: number;
}

// Interface para metadados OCR
export interface OCRMetadata {
  text: string;
  confidence: number;
  bounding_boxes: any[];
  page_number: number;
}

// Interface para estatísticas
export interface PlantStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byProject: Record<string, number>;
  recentUploads: Plant[];
  storageUsed: number;
}

// Interface para resposta padronizada da API
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Interface para filtros de versão
export interface VersionFilter {
  plant_id?: string;
  status?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  is_current?: boolean;
}

// Interface para comparação de versões
export interface VersionComparison {
  version1: PlantVersion;
  version2: PlantVersion;
  differences: {
    field: string;
    old_value: any;
    new_value: any;
    type: 'added' | 'removed' | 'modified';
  }[];
}

// Interface para histórico de versões
export interface VersionHistory {
  plant_id: string;
  versions: PlantVersion[];
  current_version: PlantVersion;
  total_versions: number;
}

// Interface para analytics de versões
export interface VersionAnalytics {
  total_versions: number;
  versions_by_status: Record<string, number>;
  versions_by_user: Record<string, number>;
  average_approval_time: number;
  most_active_plants: Array<{
    plant_id: string;
    plant_name: string;
    version_count: number;
  }>;
}

// Interface para atualização de versões
export interface UpdateVersionRequest {
  version_name?: string;
  description?: string;
  status?: string;
  tags?: string[];
  metadata?: any;
}
