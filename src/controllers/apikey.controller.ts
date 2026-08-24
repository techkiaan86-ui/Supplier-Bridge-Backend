import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { encryptSecret, generateRandomKey } from '../utils/crypto';

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const formatted = keys.map((k) => {
      let currentStatus = k.status;
      if (k.expiresAt && new Date(k.expiresAt) < now && currentStatus === 'active') {
        currentStatus = 'expired';
      }

      return {
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes ? k.scopes.split(',') : ['read', 'write'],
        status: currentStatus,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch API keys' });
  }
};

export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const { name, expirationDays, scopes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    const { keyPrefix, fullKey } = generateRandomKey('sb_live_');
    const encryptedSecret = encryptSecret(fullKey);

    let expiresAt: Date | null = null;
    if (expirationDays && !isNaN(Number(expirationDays)) && Number(expirationDays) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expirationDays));
    }

    const scopesStr = Array.isArray(scopes) ? scopes.join(',') : (scopes || 'read,write');

    const newKey = await prisma.apiKey.create({
      data: {
        name,
        keyPrefix,
        encryptedSecret,
        scopes: scopesStr,
        status: 'active',
        expiresAt,
        createdBy: req.user?.name || req.user?.id || 'Admin',
      },
    });

    // Return full unmasked key ONE TIME ONLY to client
    res.status(201).json({
      message: 'API Key generated successfully',
      apiKey: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        secretKey: fullKey, // One-time unmasked secret!
        scopes: newKey.scopes.split(','),
        status: newKey.status,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: error.message || 'Failed to generate API key' });
  }
};

export const revokeApiKey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.apiKey.update({
      where: { id },
      data: { status: 'revoked' },
    });
    res.json({ message: 'API key revoked successfully', apiKey: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to revoke API key' });
  }
};

export const regenerateApiKey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.apiKey.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const { keyPrefix, fullKey } = generateRandomKey('sb_live_');
    const encryptedSecret = encryptSecret(fullKey);

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        keyPrefix,
        encryptedSecret,
        status: 'active',
        updatedAt: new Date(),
      },
    });

    // Return regenerated secret ONE TIME ONLY
    res.json({
      message: 'API Key rotated and regenerated successfully',
      apiKey: {
        id: updated.id,
        name: updated.name,
        keyPrefix: updated.keyPrefix,
        secretKey: fullKey, // One-time unmasked rotated secret!
        status: updated.status,
        expiresAt: updated.expiresAt,
        createdAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to regenerate API key' });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.apiKey.delete({ where: { id } });
    res.json({ message: 'API Key deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete API Key' });
  }
};
