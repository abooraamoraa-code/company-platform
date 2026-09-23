const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_FILE_SIZE =
  Number(process.env.MAX_UPLOAD_MB || 10) *
  1024 *
  1024;

const uploadDirectory = path.join(
  process.cwd(),
  "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true
  });
}

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

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 12)}${extension}`;

    callback(null, uniqueName);
  }
});

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

function getPublicFileName(file) {
  if (!file) {
    return null;
  }

  return `/uploads/${file.filename}`;
}

module.exports = {
  upload,
  getPublicFileName,
  uploadDirectory
};
