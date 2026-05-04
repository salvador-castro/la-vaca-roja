import { useLocation } from "react-router-dom";
import { Truck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const REPEAT = 6;

export default function ShippingTopBar() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const isDashboardAdmin = location.pathname === "/dashboard" && isAdmin;
  if (isDashboardAdmin) return null;

  return (
    <div
      className="shipping-top-bar"
      id="shipping-top-bar"
      role="region"
      aria-label="Promoción envío gratis"
    >
      <div className="shipping-top-bar-track" aria-hidden="false">
        {Array.from({ length: REPEAT }).map((_, i) => (
          <span className="shipping-top-bar-item" key={i} aria-hidden={i > 0}>
            <Truck size={16} strokeWidth={2.5} />
            <strong>Envío gratis</strong>
            <span className="sep">·</span>
            <span>en compras desde</span>
            <strong className="amt">$60.000</strong>
            <span className="sep">·</span>
            <span>solo CABA</span>
          </span>
        ))}
      </div>
    </div>
  );
}
