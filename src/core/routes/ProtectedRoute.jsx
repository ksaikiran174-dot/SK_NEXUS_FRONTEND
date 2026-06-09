import { Navigate } from "react-router-dom";

export default function ProtectedRoute({

  children,

  role = "manager",

}) {

  const token = localStorage.getItem(
    `${role}AccessToken`
  );

  if (!token) {

    return (
      <Navigate to="/login" replace />
    );
  }

  return children;
}