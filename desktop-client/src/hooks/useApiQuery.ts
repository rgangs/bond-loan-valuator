import { useCallback, useEffect, useMemo, useState } from "react";
import { AxiosRequestConfig } from "axios";
import { apiClient } from "@/services/apiClient";

export type ApiQueryState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useApiQuery = <T = unknown>(config: AxiosRequestConfig, auto = true): ApiQueryState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(auto);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request<T>(config);
      setData(response.data);
    } catch (err) {
      let message = "Unable to load data.";
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message ?? message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    if (!auto) return;
    void fetchData();
  }, [auto, fetchData]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      refetch: fetchData
    }),
    [data, loading, error, fetchData]
  );
};
