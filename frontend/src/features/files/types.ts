export interface UploadedFile {
  id: number | string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  uploaded_by: string;
  created_at: string;
}
