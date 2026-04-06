import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (validatedData.body) req.body = validatedData.body;
      
      if (validatedData.query) {
        Object.defineProperty(req, 'query', {
          value: validatedData.query,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }

      if (validatedData.params) {
        Object.defineProperty(req, 'params', {
          value: validatedData.params,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      return next();
    } catch (error: any) {
      if (error instanceof ZodError || error.name === 'ZodError') {
        const issues = error.issues || [];
        return res.status(400).json({
          error: 'Erro de Validação',
          details: issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      console.error('[Validation Error]:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error during validation',
        message: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };
