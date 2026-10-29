const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error(
    'Falta la variable de entorno EXPO_PUBLIC_API_URL con la URL del backend.',
  );
}

export const API_BASE_URL = rawApiUrl;
