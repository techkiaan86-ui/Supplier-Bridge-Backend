import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(200).json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        department: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, roleId, departmentId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        roleId,
        departmentId,
      },
    });
    
    // Log Activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'Create User',
          details: `Created user ${email}`,
          ipAddress: req.ip,
        }
      });
    }

    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, phone, roleId, departmentId, status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        roleId,
        departmentId,
        status,
      },
    });

    // Log Activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'Update User',
          details: `Updated user ${user.email}`,
          ipAddress: req.ip,
        }
      });
    }

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    // Log Activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'Delete User',
          details: `Deleted user with ID ${id}`,
          ipAddress: req.ip,
        }
      });
    }

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
