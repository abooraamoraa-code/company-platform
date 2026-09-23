const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE =
  Number(process.env.MAX_UPLOAD_MB || 10) *
  1024 *
  1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const allowedExtensions = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
]);

/*
|--------------------------------------------------------------------------
| Temporary memory storage
|--------------------------------------------------------------------------
|
| Vercel Serverless Functions do not provide a persistent local
| filesystem for application uploads.
|
| We therefore keep the uploaded file in memory temporarily.
| Permanent storage will be added later using external storage.
|
*/

const storage = multer.memoryStorage();

const fileFilter = (_req, file, callback) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedMimeTypes.has(file.mimetype)) {
    return callback(
      new Error("Unsupported file type")
    );
  }

  if (!allowedExtensions.has(extension)) {
    return callback(
      new Error("Unsupported file extension")
    );
  }

  callback(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5
  },
  fileFilter
});

/*
|--------------------------------------------------------------------------
| Public file name
|--------------------------------------------------------------------------
|
| There is no permanent public URL yet because files are currently
| stored only in memory.
|
| Permanent file storage will be connected later.
|
*/

function getPublicFileName(_file) {
  return null;
}

module.exports = {
  upload,
  getPublicFileName
};
