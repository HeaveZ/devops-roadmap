import { apiClient } from 'shared/api/client';
import { endpoints } from 'shared/api/endpoints';
import type { UploadedFile } from '../types';

export const filesApi = {
  list: () => apiClient.get<UploadedFile[]>(endpoints.files.list).then((r) => r.data),

  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<UploadedFile>(endpoints.files.upload, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  delete: (id: number | string) =>
    apiClient.delete(endpoints.files.delete(id)).then(() => undefined),
};
