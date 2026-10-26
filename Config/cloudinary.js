import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a Base64 string or file path to Cloudinary
 * @param {string} fileStr - Base64 Data URI or file path
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<string|null>} - Secure URL of uploaded image
 */
export const uploadToCloudinary = async (fileStr, folder = 'gcaaa/alumni') => {
  if (!fileStr || typeof fileStr !== 'string' || !fileStr.trim()) {
    return null;
  }

  // If it's already an http/https url, no need to re-upload
  if (fileStr.startsWith('http://') || fileStr.startsWith('https://')) {
    return fileStr;
  }

  try {
    const result = await cloudinary.uploader.upload(fileStr, {
      folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload failed for folder ${folder}:`, error.message);
    return null;
  }
};

export { cloudinary };
export default { cloudinary, uploadToCloudinary };
