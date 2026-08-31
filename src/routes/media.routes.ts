import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getMedia, createMedia, updateMedia, deleteMedia, uploadMedia } from '../controllers/media.controller';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.get('/', getMedia);
router.post('/', createMedia);
router.post('/upload', upload.single('file'), uploadMedia);
router.put('/:id', updateMedia);
router.delete('/:id', deleteMedia);

export default router;
