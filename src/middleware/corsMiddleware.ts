// src/middleware/corsMiddleware.ts
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'https://viaplan-test.vercel.app',
    // Adicione outros domínios do Vercel aqui conforme necessário
];

const corsOptions: cors.CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Permitir requests sem origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        // Verificar se é um domínio do Vercel (padrão *.vercel.app)
        const isVercelDomain = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
        
        // Verificar se está na lista de origens permitidas ou é um domínio do Vercel
        if (allowedOrigins.includes(origin) || isVercelDomain) {
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origin ${origin} não permitida`);
            // Em desenvolvimento, permitir mesmo assim para debug
            if (process.env.NODE_ENV === 'development') {
                console.warn(`⚠️ Permitindo ${origin} em modo desenvolvimento`);
                callback(null, true);
            } else {
                callback(new Error(`Origin ${origin} não permitida pelo CORS`), false);
            }
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Access-Token',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods'
    ],
    exposedHeaders: [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Para suportar browsers legados
    maxAge: 86400 // Cache preflight por 24 horas
};

export const corsMiddleware = cors(corsOptions);

// Middleware adicional para debugging CORS
export const corsDebugMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    const method = req.method;
    
    console.log(`🌐 CORS Debug: ${method} ${req.url} from ${origin || 'no-origin'}`);
    
    // Adicionar headers CORS manualmente como fallback
    if (origin) {
        const isVercelDomain = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
        const isAllowed = allowedOrigins.includes(origin) || isVercelDomain;
        
        if (isAllowed || process.env.NODE_ENV === 'development') {
            res.header('Access-Control-Allow-Origin', origin);
        }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (method === 'OPTIONS') {
        console.log(`✅ Respondendo preflight OPTIONS para ${origin}`);
        res.status(200).end();
        return;
    }
    
    next();
};

export default { corsMiddleware, corsDebugMiddleware };