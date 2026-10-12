import { api } from "./client.js";

export const runKeys = {
  all: ["runs"],
  paginated: (offset, limit) => ["runs", "paginated", offset, limit],
  recent: (limit) => ["runs", "recent", limit],
  byStatus: (status) => ["runs", "status", status],
  byTask: (taskId) => ["runs", "task", String(taskId)],
  byAgent: (agentId) => ["runs", "agent", String(agentId)],
  detail: (id) => ["runs", String(id)],
};

export const fetchRunsPaginated = (offset, limit, signal) =>
  api.get(`/runs/paginated?offset=${offset}&limit=${limit}`, signal);
export const fetchRecentRuns = (limit, signal) => api.get(`/runs/recent/${limit}`, signal);
export const fetchRunsByTask = (taskId, signal) => api.get(`/runs/task/${taskId}`, signal);
export const fetchRunsByAgent = (agentId, signal) => api.get(`/runs/agent/${agentId}`, signal);
export const fetchRun = (id, signal) => api.get(`/runs/${id}`, signal);
export const createRun = (body) => api.post("/runs", body);
export const updateRun = (id, body) => api.patch(`/runs/${id}`, body);
export const deleteRun = (id) => api.delete(`/runs/${id}`);
