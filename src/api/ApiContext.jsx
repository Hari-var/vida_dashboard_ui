import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { AUTO_REFRESH_MS, DEFAULT_BASE_URL, getInitialBaseUrl, getInitialTheme, normalizeBaseUrl, persistBaseUrl, persistTheme } from "../config.js";
import { setClientBaseUrl, apiFetch } from "./client.js";

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const [baseUrl, setBaseUrlState] = useState(() => {
    const url = getInitialBaseUrl();
    setClientBaseUrl(url);
    return url;
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [theme, setThemeState] = useState(getInitialTheme);

  const setBaseUrl = useCallback((url) => {
    const normalized = normalizeBaseUrl(url) || DEFAULT_BASE_URL;
    persistBaseUrl(normalized);
    setClientBaseUrl(normalized);
    setBaseUrlState(normalized);
  }, []);

  const setTheme = useCallback((t) => {
    persistTheme(t);
    setThemeState(t);
  }, []);

  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => queryClient.invalidateQueries(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, queryClient]);

  const value = useMemo(
    () => ({ baseUrl, setBaseUrl, autoRefresh, setAutoRefresh, refresh, theme, setTheme }),
    [baseUrl, setBaseUrl, autoRefresh, refresh, theme, setTheme]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApiContext must be used inside <ApiProvider>");
  return ctx;
}

// Legacy hook kept for backward compat
import { useEffect as _ue, useState as _us } from "react";

export function useApi(path) {
  const { baseUrl } = useApiContext();
  const key = path == null ? null : `${baseUrl}${path}`;
  const [state, setState] = _us({ key: null, data: null, loading: path != null, error: null });

  _ue(() => {
    if (key == null) return undefined;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    apiFetch(path, { signal: controller.signal })
      .then((data) => setState({ key, data, loading: false, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ key, data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [key, baseUrl, path]);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    loading: key != null && (!current || state.loading),
    error: current ? state.error : null,
  };
}

export function useLookups() {
  const agents = useApi("/agents");
  const tasks = useApi("/tasks");
  const agentList = useMemo(() => agents.data || [], [agents.data]);
  const taskList = useMemo(() => tasks.data || [], [tasks.data]);
  const agentMap = useMemo(() => Object.fromEntries(agentList.map((a) => [a.id, a])), [agentList]);
  const taskMap = useMemo(() => Object.fromEntries(taskList.map((t) => [t.id, t])), [taskList]);
  return { agentList, taskList, agentMap, taskMap, loading: agents.loading || tasks.loading, error: agents.error || tasks.error };
}

export function useApiQuery(queryKey, fetcher, options = {}) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
    staleTime: 20_000,
    ...options,
  });
}

export function useApiMutation(mutFn, options = {}) {
  return useMutation({ mutationFn: mutFn, ...options });
}

export { useQueryClient, useQuery, useMutation };
