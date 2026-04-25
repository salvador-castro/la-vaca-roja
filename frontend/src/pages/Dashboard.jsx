import { useAuth } from "../context/AuthContext";
import AdminLayout from "./admin/AdminLayout";
import ClientDashboard from "./client/ClientDashboard";

export default function Dashboard() {
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }
  return isAdmin ? <AdminLayout /> : <ClientDashboard />;
}
