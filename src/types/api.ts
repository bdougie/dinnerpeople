import { Request, Response } from 'express';

export type ApiHandler = (req: Request, res: Response) => Promise<void> | void;

export interface ErrorResponse {
  error: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
}