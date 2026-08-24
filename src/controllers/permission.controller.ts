import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

export const getPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.status(200).json({ status: 'success', data: { permissions } });
  } catch (error) {
    next(error);
  }
};

export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    const existingPerm = await prisma.permission.findUnique({ where: { name } });
    if (existingPerm) {
      return next(new AppError('Permission already exists', 400));
    }

    const permission = await prisma.permission.create({
      data: { name },
    });

    res.status(201).json({ status: 'success', data: { permission } });
  } catch (error) {
    next(error);
  }
};

export const updatePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const permission = await prisma.permission.update({
      where: { id },
      data: { name },
    });

    res.status(200).json({ status: 'success', data: { permission } });
  } catch (error) {
    next(error);
  }
};

export const deletePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.permission.delete({ where: { id } });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

// Role-Permission assignment endpoints
export const assignPermissionToRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId, permissionId } = req.body;
    
    await prisma.rolePermission.create({
      data: { roleId, permissionId }
    });

    res.status(200).json({ status: 'success', message: 'Permission assigned successfully' });
  } catch (error) {
    next(error);
  }
};

export const removePermissionFromRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId, permissionId } = req.body;
    
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId }
      }
    });

    res.status(200).json({ status: 'success', message: 'Permission removed successfully' });
  } catch (error) {
    next(error);
  }
};
