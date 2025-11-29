// api/adminRoutes.d.ts
import type { Router, Request, Response, NextFunction } from "express";


export type Role = "admin" | "vaad" | "student";

export function getEffectiveRole(email: string): Promise<Role>;

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void;

export function requireAdminLike(
  req: Request,
  res: Response,
  next: NextFunction
): void;

declare const router: Router;
export default router;
