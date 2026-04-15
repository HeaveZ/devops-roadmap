import { useMutation } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';

export const useUploadAvatar = () =>
  useMutation({ mutationFn: profileApi.uploadAvatar });
