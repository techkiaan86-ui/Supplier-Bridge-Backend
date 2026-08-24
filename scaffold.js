const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const controllersDir = path.join(srcDir, 'controllers');
const routesDir = path.join(srcDir, 'routes');

const dirs = [controllersDir, routesDir];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Generic basic controller template
const generateController = (name) => `
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const get${name}s = async (req: Request, res: Response) => {
  try {
    const data = await prisma.${name.toLowerCase()}.findMany();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ${name}s' });
  }
};

export const create${name} = async (req: Request, res: Response) => {
  try {
    const data = await prisma.${name.toLowerCase()}.create({ data: req.body });
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ${name}' });
  }
};
`;

// Generic basic route template
const generateRoute = (name) => `
import express from 'express';
import { get${name}s, create${name} } from '../controllers/${name.toLowerCase()}.controller';

const router = express.Router();

router.get('/', get${name}s);
router.post('/', create${name});

export default router;
`;

const entities = ['Supplier', 'Product', 'Category', 'Brand', 'Store'];

entities.forEach(entity => {
  fs.writeFileSync(path.join(controllersDir, `${entity.toLowerCase()}.controller.ts`), generateController(entity));
  fs.writeFileSync(path.join(routesDir, `${entity.toLowerCase()}.routes.ts`), generateRoute(entity));
});

console.log('Basic PIM Controllers and Routes scaffolded.');
