import { api } from "./client.js";

export const dashboardKeys = {
  summary: ["dashboard", "summary"],
  taskBreakdown: ["dashboard", "task-breakdown"],
  runBreakdown: ["dashboard", "run-breakdown"],
  tokenUsage: ["dashboard", "token-usage"],
};

export const fetchDashboardSummary = (signal) => api.get("/dashboard/summary", signal);
export const fetchTaskBreakdown = (signal) => api.get("/dashboard/task-breakdown", signal);
export const fetchRunBreakdown = (signal) => api.get("/dashboard/run-breakdown", signal);
export const fetchTokenUsage = (signal) => api.get("/dashboard/token-usage", signal);
