import { api } from "./client.js";

export const taskKeys = {
  all: ["tasks"],
  paginated: (offset, limit) => ["tasks", "paginated", offset, limit],
  byStatus: (status) => ["tasks", "status", status],
  byAgent: (agentId) => ["tasks", "agent", String(agentId)],
  detail: (id) => ["tasks", String(id)],
};

export const fetchTasks = (signal) => api.get("/tasks", signal);
export const fetchTasksPaginated = (offset, limit, signal) =>
  api.get(`/tasks/paginated?offset=${offset}&limit=${limit}`, signal);
export const fetchTasksByAgent = (agentId, signal) => api.get(`/tasks/agent/${agentId}`, signal);
export const fetchTask = (id, signal) => api.get(`/tasks/${id}`, signal);
export const createTask = (body) => api.post("/tasks", body);
export const updateTask = (id, body) => api.patch(`/tasks/${id}`, body);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
