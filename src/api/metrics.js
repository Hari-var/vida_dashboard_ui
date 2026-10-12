import { api } from "./client.js";

export const metricKeys = {
  all: ["metrics"],
  detail: (agentId) => ["metrics", String(agentId)],
};

export const fetchMetrics = (signal) => api.get("/metrics", signal);
export const fetchMetric = (agentId, signal) => api.get(`/metrics/${agentId}`, signal);
export const createMetric = (body) => api.post("/metrics", body);
export const updateMetric = (agentId, body) => api.patch(`/metrics/${agentId}`, body);
export const deleteMetric = (agentId) => api.delete(`/metrics/${agentId}`);
