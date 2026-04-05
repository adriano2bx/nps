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
      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Erro de Validação',
          details: error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      return res.status(500).json({ error: 'Internal Server Error during validation' });
    }
  };
