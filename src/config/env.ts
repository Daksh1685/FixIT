const removeTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const appConfig = {
  apiBaseUrl: configuredApiUrl ? removeTrailingSlash(configuredApiUrl) : null,
} as const;
