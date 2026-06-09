import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "../pages/LoginPage";

import DashboardLayout from "../layouts/DashboardLayout";

import CreateOrderPage from "../pages/CreateOrderPage";

import ActiveOrdersPage from "../pages/ActiveOrdersPage";

function KitchenRoutes() {

  return (

    <Routes>

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/dashboard"
        element={<DashboardLayout />}
      >

        <Route
          path="create-order"
          element={<CreateOrderPage />}
        />

        <Route
          path="orders"
          element={<ActiveOrdersPage />}
        />

      </Route>

      <Route
        path="*"
        element={
          <Navigate to="/login" />
        }
      />

    </Routes>
  );
}

export default KitchenRoutes;

