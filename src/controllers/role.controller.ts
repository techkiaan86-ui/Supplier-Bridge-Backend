import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

export const getRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });

    res.status(200).json({ status: 'success', data: { roles } });
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { name } });
    if (existingRole) {
      return next(new AppError('Role name already exists', 400));
    }

    const role = await prisma.role.create({
      data: { name },
    });

    res.status(201).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;
    console.log(`[updateRole] Updating role ${id} with name=${name}, perms=`, permissions);
    console.time(`updateRole-${id}`);

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;

    console.timeLog(`updateRole-${id}`, 'Starting role update');
    let role = await prisma.role.update({
      where: { id },
      data: dataToUpdate,
    });
    console.timeLog(`updateRole-${id}`, 'Role updated');

    if (permissions && Array.isArray(permissions)) {
      console.timeLog(`updateRole-${id}`, 'Deleting old permissions');
      await prisma.rolePermission.deleteMany({
        where: { roleId: id }
      });
      console.timeLog(`updateRole-${id}`, 'Old permissions deleted');

      console.timeLog(`updateRole-${id}`, 'Finding new permissions');
      const permsInDb = await prisma.permission.findMany({
        where: { name: { in: permissions } }
      });
      console.timeLog(`updateRole-${id}`, 'New permissions found', permsInDb.map(p => p.name));

      if (permsInDb.length > 0) {
        console.timeLog(`updateRole-${id}`, 'Creating new role permissions');
        await prisma.rolePermission.createMany({
          data: permsInDb.map(p => ({
            roleId: id,
            permissionId: p.id
          }))
        });
        console.timeLog(`updateRole-${id}`, 'New role permissions created');
      }
    }

    console.timeLog(`updateRole-${id}`, 'Fetching final role with include');
    role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    }) as any;
    console.timeLog(`updateRole-${id}`, 'Final role fetched');
    console.timeEnd(`updateRole-${id}`);

    res.status(200).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Optional: Check if users exist with this role
    const usersWithRole = await prisma.user.count({ where: { roleId: id } });
    if (usersWithRole > 0) {
      return next(new AppError('Cannot delete role as it is assigned to users', 400));
    }

    await prisma.role.delete({ where: { id } });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
