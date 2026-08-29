import { motion } from "framer-motion";
import { Shield, Terminal } from "lucide-react"; // Imported premium geometric vectors
import "./RoleSelection.css";

function RoleSelection({ onSelectRole, onRegisterClick }) {
  return (
    <div className="role-selection-container">
      {/* TOP RIGHT — CREATE WORKSPACE BUTTON */}
      <motion.button
        type="button"
        className="create-workspace-btn"
        onClick={onRegisterClick}
        whileHover={{ y: -2, scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="create-workspace-icon"></span>
        Create Workspace
      </motion.button>

      <motion.div
        className="role-selection-wrapper"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="role-selection-header">
          <h1 className="role-selection-title"> Select Your Role</h1>
          <p className="role-selection-subtitle">
            Choose how you want to access the business system
          </p>
        </div>

        {/* MAIN CARDS GRID (Manager & Employee Only) */}
        <div className="role-selection-cards">
          {/* MANAGER CARD */}
          <motion.div
            className="role-card manager"
            whileHover={{
              y: -10,
              scale: 1.03,
              boxShadow: "0 25px 40px rgba(37,99,235,0.35)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("manager")}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectRole("manager");
              }
            }}
          >
            {/* Preserved your beautiful floating infinite loop animation */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="avatar-wrapper"
            >
              {/* Premium Manager Neon Shield Replacement */}
              <div className="neon-icon-box manager-icon">
                <Shield size={44} className="vector-icon-blue" />
              </div>
            </motion.div>
            <h3 className="role-card-title">Manager Dashboard</h3>
            <p className="role-description">
              Control sales, analytics, staff & business operations
            </p>
          </motion.div>

          {/* EMPLOYEE CARD */}
          <motion.div
            className="role-card employee"
            whileHover={{
              y: -10,
              scale: 1.03,
              boxShadow: "0 25px 40px rgba(16,185,129,0.35)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectRole("employee")}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectRole("employee");
              }
            }}
          >
            {/* Preserved your beautiful floating infinite loop animation */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="avatar-wrapper"
            >
              {/* Premium Employee Neon Terminal Node Replacement */}
              <div className="neon-icon-box employee-icon">
                <Terminal size={44} className="vector-icon-green" />
              </div>
            </motion.div>
            <h3 className="role-card-title">Employee Portal</h3>
            <p className="role-description">
              Manage kitchen tasks, orders & workflow
            </p>
          </motion.div>
        </div>

        {/* ADMIN PANEL AS A SUBTLE TEXT LINK */}
        <div className="admin-link-wrapper">
          <span
            className="admin-text-link"
            onClick={() => onSelectRole("super_admin")}
            role="button"
            tabIndex="0"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelectRole("super_admin");
              }
            }}
          >
            ⚙️ Access Admin Panel
          </span>
        </div>

        <p className="role-selection-footer">
          Welcome to Business Management System
        </p>
      </motion.div>
    </div>
  );
}

export default RoleSelection;
