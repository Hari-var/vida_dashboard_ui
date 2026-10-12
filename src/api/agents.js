import { api } from "./client.js";

export const agentKeys = {
  all: ["agents"],
  withMetrics: ["agents", "with-metrics"],
  detail: (id) => ["agents", String(id)],
  withMetricsDetail: (id) => ["agents", String(id), "with-metrics"],
  runStats: (id) => ["agents", String(id), "run-stats"],
};

export const fetchAgents = (signal) => api.get("/agents", signal);
export const fetchAgentsWithMetrics = (signal) => api.get("/agents/with-metrics", signal);
export const fetchAgent = (id, signal) => api.get(`/agents/${id}/with-metrics`, signal);
export const fetchAgentRunStats = (id, signal) => api.get(`/agents/${id}/run-stats`, signal);
export const createAgent = (body) => api.post("/agents", body);
export const updateAgent = (id, body) => api.patch(`/agents/${id}`, body);
