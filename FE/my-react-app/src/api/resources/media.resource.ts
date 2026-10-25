/**
 * api/resources/media.resource.ts
 */
import { authorizedFetch } from '@/api/interceptors/auth.interceptor'

export type MediaFileType = 'image' | 'video' | 'audio' | 'file'

export interface ApiMediaFile {
  id: string
  file_url: string
  file_type: MediaFileType
  created_at: string
}

export interface CreateMediaPayload {
  file_url: string
  file_type: MediaFileType
}

export const mediaResource = {
  /** 
   * ĐỂ Ý KỸ DÒNG NÀY: Phải có thêm chữ /upload 
   */
  async upload_file(file: File): Promise<{ url: string; file_type: string }> {
    const formData = new FormData();
    formData.append('file', file); // 'file' phải khớp với tên biến trong Python: file: UploadFile = File(...)

    // Gọi đến /media/upload (Xử lý file vật lý -> Cloudinary)
    return authorizedFetch('/media/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /** 
   * Hàm này gọi đến /media (Chỉ nhận JSON để lưu database)
   */
  create(payload: CreateMediaPayload): Promise<ApiMediaFile> {
    return authorizedFetch('/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /** Lấy danh sách file đã upload */
  list(offset = 0, limit = 20): Promise<ApiMediaFile[]> {
    return authorizedFetch(`/media?offset=${offset}&limit=${limit}`)
  },
}