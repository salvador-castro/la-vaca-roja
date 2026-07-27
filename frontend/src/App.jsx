import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ShippingTopBar from "./components/ShippingTopBar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import PrivateRoute from "./components/PrivateRoute";
import ScrollToTop from "./components/ScrollToTop";
import WhatsAppFloat from "./components/WhatsAppFloat";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentPending from "./pages/PaymentPending";
import PaymentFailure from "./pages/PaymentFailure";
import ResetPassword from "./pages/ResetPassword";
import TransferConfirmation from "./pages/TransferConfirmation";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <ShippingTopBar />
          <Navbar />
          <CartDrawer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/pago/exitoso" element={<PaymentSuccess />} />
            <Route path="/pago/pendiente" element={<PaymentPending />} />
            <Route path="/pago/fallido" element={<PaymentFailure />} />
            <Route path="/transferencia/:orderId" element={<TransferConfirmation />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
          <Footer />
          <WhatsAppFloat />
        </CartProvider>
      </AuthProvider>
      <Analytics />
    </BrowserRouter>
  );
}
