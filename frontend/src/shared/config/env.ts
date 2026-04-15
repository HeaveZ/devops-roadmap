export const env = {
  apiUrl: import.meta.env.REACT_APP_API_URL ?? '',
  appVersion: import.meta.env.REACT_APP_VERSION ?? '2.0.0',
  isProduction: import.meta.env.PROD,
} as const;
