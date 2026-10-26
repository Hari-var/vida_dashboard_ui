import { Component, lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { Loading } from "./components/ui.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Agents = lazy(() => import("./pages/Agents.jsx"));
const AgentDetail = lazy(() => import("./pages/AgentDetail.jsx"));
const Tasks = lazy(() => import("./pages/Tasks.jsx"));
const TaskDetail = lazy(() => import("./pages/TaskDetail.jsx"));
const Runs = lazy(() => import("./pages/Runs.jsx"));
const RunDetail = lazy(() => import("./pages/RunDetail.jsx"));
const Metrics = lazy(() => import("./pages/Metrics.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const Overview = lazy(() => import("./pages/Overview.jsx"));

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="state-error" style={{ margin: 24 }}>
        <strong>Something went wrong</strong>
        <p>{String(this.state.error.message || this.state.error)}</p>
        <button className="btn btn-sm" onClick={() => this.setState({ error: null })} style={{ marginTop: 8 }}>
          Try again
        </button>
      </div>
    );
  }
}

function NotFound() {
  return (
    <div className="state" style={{ paddingTop: 80 }}>
      <span style={{ fontSize: 48 }}>404</span>
      <strong style={{ fontSize: 18 }}>Page not found</strong>
      <p className="text-muted">That address does not exist.</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 8 }}>Go to Dashboard</Link>
    </div>
  );
}

const Page = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<Loading />}>{children}</Suspense>
  </ErrorBoundary>
);

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="overview" element={<Page><Overview /></Page>} />
        <Route path="dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="agents" element={<Page><Agents /></Page>} />
        <Route path="agents/:agentId" element={<Page><AgentDetail /></Page>} />
        <Route path="tasks" element={<Page><Tasks /></Page>} />
        <Route path="tasks/:taskId" element={<Page><TaskDetail /></Page>} />
        <Route path="runs" element={<Page><Runs /></Page>} />
        <Route path="runs/:runId" element={<Page><RunDetail /></Page>} />
        <Route path="metrics" element={<Page><Metrics /></Page>} />
        <Route path="settings" element={<Page><Settings /></Page>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
