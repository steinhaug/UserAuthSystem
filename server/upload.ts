import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

// In ES modules, we need to use fileURLToPath to get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });

  // Create subdirectories for different media types
  fs.mkdirSync(path.join(uploadDir, 'images'), { recursive: true });
  fs.mkdirSync(path.join(uploadDir, 'videos'), { recursive: true });
  fs.mkdirSync(path.join(uploadDir, 'audio'), { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'images';
    if (file.mimetype.startsWith('video/')) {
      folder = 'videos';
    } else if (file.mimetype.startsWith('audio/')) {
      folder = 'audio';
    }
    cb(null, path.join(uploadDir, folder));
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with original extension
    const uniqueId = randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

// File filter function
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept images, videos, and audio files
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type! Only images, videos, and audio files are allowed.'));
  }
};

// Configure file size limits based on type
const fileSizeLimits = {
  image: 5 * 1024 * 1024, // 5MB for images
  video: 50 * 1024 * 1024, // 50MB for videos
  audio: 10 * 1024 * 1024, // 10MB for audio
};

// Create the multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // Maximum 50MB (for videos)
  }
});

// Helper function to get appropriate file size limit based on mime type
export const getFileSizeLimit = (mimetype: string): number => {
  if (mimetype.startsWith('image/')) {
    return fileSizeLimits.image;
  } else if (mimetype.startsWith('video/')) {
    return fileSizeLimits.video;
  } else if (mimetype.startsWith('audio/')) {
    return fileSizeLimits.audio;
  }
  return fileSizeLimits.image; // Default to image size limit
};

// Helper to get file type from mime type
export const getFileType = (mimetype: string): 'image' | 'video' | 'audio' => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('audio/')) {
    return 'audio';
  }
  return 'image'; // Default to image
};

// Function to get public URL for a file
export const getFileUrl = (req: any, file: Express.Multer.File): string => {
  // We need to use 'any' type because Express.Request doesn't have protocol and get methods
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  const baseUrl = `${protocol}://${host}`;
  const fileType = getFileType(file.mimetype);
  return `${baseUrl}/uploads/${fileType}s/${file.filename}`;
};

// Helper to generate thumbnail for images and videos (basic implementation)
export const generateThumbnail = async (
  file: Express.Multer.File
): Promise<string | null> => {
  // For simplicity, just return the original file for images
  // In a real implementation, you would generate actual thumbnails
  if (file.mimetype.startsWith('image/')) {
    return file.path;
  }
  
  // For videos, you would use a library like ffmpeg to generate a thumbnail
  // This is a simplified placeholder implementation
  if (file.mimetype.startsWith('video/')) {
    return null; // In a real app, return path to generated thumbnail
  }
  
  return null;
};