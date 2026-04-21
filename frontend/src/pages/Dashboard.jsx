import { useAuth } from "../context/AuthContext";
import AdminLayout from "./admin/AdminLayout";
import ClientDashboard from "./client/ClientDashboard";

export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminLayout /> : <ClientDashboard />;
}
