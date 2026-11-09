import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';

const getBaseUrl = () => {
  try {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
};

export const AXIOS_INSTANCE = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
AXIOS_INSTANCE.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: 401 & 403 handling
AXIOS_INSTANCE.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; statusCode?: number }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Bir hata oluştu.';

    if (status === 401) {
      // Don't toast if already on login page
      if (!window.location.pathname.includes('/login')) {
        toast.error('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(`Erişim Engellendi (403): ${message}`);
    }

    return Promise.reject(error);
  },
);

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-expect-error cancel property
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export default customInstance;
