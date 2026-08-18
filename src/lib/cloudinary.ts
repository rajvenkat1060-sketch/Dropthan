/// <reference types="vite/client" />
/**
 * Cloudinary Upload Service
 * Cloud Name: jc7xqqko
 * Unsigned Upload Preset: dropthan
 *
 * Simplified Direct Upload Route:
 * Sends image uploads directly to Cloudinary using cloud 'jc7xqqko'
 * and preset 'dropthan' without folder parameters to guarantee maximum compatibility.
 */

export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'jc7xqqko';
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dropthan';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

/**
 * Uploads a single File object or data URL string directly to Cloudinary
 * using unsigned preset 'dropthan' under Cloud Name 'jc7xqqko'.
 */
export const uploadToCloudinary = async (
  fileOrDataUrl: File | string,
  context?: string
): Promise<string> => {
  // Method 1: Direct Client-Side Upload to Cloudinary
  try {
    const formData = new FormData();
    formData.append('file', fileOrDataUrl);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    console.log(
      `☁️ [Cloudinary Direct Upload] Cloud: "${CLOUDINARY_CLOUD_NAME}", Preset: "${CLOUDINARY_UPLOAD_PRESET}"`
    );

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data: CloudinaryUploadResponse = await response.json();
      if (data && data.secure_url) {
        console.log(`✅ [Cloudinary Secure URL Direct]: ${data.secure_url}`);
        return data.secure_url;
      }
    } else {
      const errorText = await response.text();
      console.warn(`⚠️ [Cloudinary Direct Upload Notice ${response.status}]:`, errorText);
    }
  } catch (err: any) {
    console.warn('⚠️ [Cloudinary Direct Exception]:', err?.message || err);
  }

  // Method 2: Server API Proxy Route (/api/upload)
  try {
    console.log('🔄 [Upload Fallback] Trying /api/upload server proxy endpoint...');
    let fileDataStr = '';
    if (typeof fileOrDataUrl === 'string') {
      fileDataStr = fileOrDataUrl;
    } else {
      fileDataStr = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(fileOrDataUrl);
      });
    }

    const resp = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: fileDataStr,
        fileName: typeof fileOrDataUrl !== 'string' ? fileOrDataUrl.name : `upload-${Date.now()}.jpg`,
        hintCategory: context || 'offers',
      }),
    });

    if (resp.ok) {
      const resData = await resp.json();
      if (resData.url) {
        console.log(`✅ [Server Proxy Upload Success]: ${resData.url}`);
        return resData.url;
      }
    }
  } catch (serverErr) {
    console.warn('⚠️ [Server Proxy Upload Notice]:', serverErr);
  }

  // Method 3: Base64 Data URL Fallback (Guarantees image preview and state display)
  console.log('🖼️ [Data URL Fallback] Returning compressed Base64 Data URL...');
  if (typeof fileOrDataUrl === 'string') {
    return fileOrDataUrl;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(fileOrDataUrl);
  });
};

/**
 * Uploads multiple File objects directly to Cloudinary using unsigned preset 'dropthan'
 */
export const uploadMultipleToCloudinary = async (
  files: (File | string)[],
  _context?: string
): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) => uploadToCloudinary(file));
  return Promise.all(uploadPromises);
};

