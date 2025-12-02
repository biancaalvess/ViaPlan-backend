/**
 * Índice de serviços - Apenas TAKEOFF e UPLOAD
 */

// Services relacionados a TAKEOFF
export { TakeoffUnifiedService } from './takeoff-unified-service';
export { QuickTakeoffService } from './quick-takeoff-service';

// Services relacionados a UPLOAD
export { PlantsUnifiedService } from './plants-unified-service';

// Cache service (usado por TAKEOFF e UPLOAD)
export { cacheService } from './cacheService';
