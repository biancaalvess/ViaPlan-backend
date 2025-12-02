import { Request, Response, NextFunction } from 'express';
// import { JWTUtils } from '../utils/jwt'; // Arquivo vazio - funcionalidade removida

// Tipos simplificados para TAKEOFF e UPLOAD
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ENGINEER = 'engineer',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer'
}

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  username: string;
  role: UserRole;
  type: string;
}

/**
 * Middleware de autenticação JWT simplificado para TAKEOFF e UPLOAD
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se o modo de desenvolvimento está ativo (APENAS para testes locais)
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true' && process.env.ALLOW_DEV_BYPASS === 'true') {
      console.warn('⚠️  ATENÇÃO: DEV_AUTH_BYPASS está ativo! Use apenas para testes locais!');
      req.user = {
        id: 'dev-user-id',
        userId: 'dev-user-id',
        email: 'dev@viaplan.com',
        username: 'dev',
        role: UserRole.ADMIN,
        type: 'access'
      };
      return next();
    }

    // Obter token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido',
        message: 'Authorization header é obrigatório'
      });
    }

    // Verificar formato do token (Bearer <token>)
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido',
        message: 'Token deve estar no formato: Bearer <token>'
      });
    }

    // const _token = tokenParts[1]; // Token não usado - autenticação simplificada

    try {
      // Verificar e decodificar o token
      // JWTUtils removido - autenticação simplificada
      // const decoded = JWTUtils.verifyAccessToken(token) as AuthUser;
      const decoded = { id: 'anonymous', role: 'viewer' } as AuthUser; // Placeholder

      // Adicionar informações do usuário à requisição
      req.user = {
        id: decoded.userId || decoded.id,
        userId: decoded.userId || decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
        type: decoded.type || 'access'
      };

      next();
    } catch (jwtError) {
      console.error('Erro na validação do token JWT:', jwtError);
      
      if (jwtError instanceof Error) {
        if (jwtError.message.includes('expirado')) {
          return res.status(401).json({
            success: false,
            error: 'Token expirado',
            message: 'Token de acesso expirou. Faça login novamente.'
          });
        } else if (jwtError.message.includes('inválido')) {
          return res.status(401).json({
            success: false,
            error: 'Token inválido',
            message: 'Token de acesso é inválido'
          });
        }
      }
      
      return res.status(401).json({
        success: false,
        error: 'Erro de autenticação',
        message: 'Erro ao verificar token de acesso'
      });
    }

  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha na autenticação'
    });
  }
};

/**
 * Middleware para verificar permissões de role
 */
export const requireRole = (requiredRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          message: 'Autenticação é obrigatória para esta operação'
        });
        return;
      }

      // Verificar se o usuário tem a role necessária
      const userRole = (req.user as AuthUser).role;
      if (userRole !== requiredRole && userRole !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          error: 'Acesso negado',
          message: `Role ${requiredRole} é necessária para esta operação. Sua role atual: ${userRole}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de role:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Falha na verificação de permissões'
      });
      return;
    }
  };
};

/**
 * Middleware para verificar se o usuário pode acessar um projeto específico
 */
export const requireProjectAccess = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        message: 'Autenticação é obrigatória para esta operação'
      });
      return;
    }

    const userRole = (req.user as AuthUser).role;
    
    // Admins e managers podem acessar qualquer projeto
    if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
      return next();
    }

    // Em uma implementação real, você verificaria se o usuário tem acesso ao projeto
    // Por enquanto, permitimos que engenheiros e técnicos acessem qualquer projeto
    if (userRole === UserRole.ENGINEER || userRole === UserRole.TECHNICIAN) {
      return next();
    }

    // Viewers têm acesso limitado
    if (userRole === UserRole.VIEWER) {
      // Verificar se é uma operação de leitura
      if (req.method === 'GET') {
        return next();
      }
      
      res.status(403).json({
        success: false,
        error: 'Acesso negado',
        message: 'Viewers só podem visualizar projetos'
      });
      return;
    }

    next();

  } catch (error) {
    console.error('Erro na verificação de acesso ao projeto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha na verificação de acesso ao projeto'
    });
    return;
  }
};

export default {
  authenticate,
  requireRole,
  requireProjectAccess
};
