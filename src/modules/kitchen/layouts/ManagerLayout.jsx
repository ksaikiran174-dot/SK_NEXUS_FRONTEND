import { Outlet } from "react-router-dom";

import ManagerSidebar from "../components/manager/ManagerSidebar";

import "./ManagerLayout.css";

export default function ManagerLayout() {

  return (

    <div className="manager-layout">

      {/* SIDEBAR */}
      <ManagerSidebar />

      {/* MAIN CONTENT */}
      <main className="manager-main">

        <Outlet />

      </main>

    </div>
  );
}