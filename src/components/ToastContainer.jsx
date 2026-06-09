import { AnimatePresence, motion } from "framer-motion";
import { inferToastType, TOAST_ICONS } from "../utils/ToastHelpers";
import "./ToastContainer.css";

function ToastContainer({ notifications = [] }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {/* 🎯 Changed mode to "sync" to prevent structural snapping conflicts */}
      <AnimatePresence mode="sync">
        {notifications.map((n) => {
          const type = n.type || inferToastType(n.text);

          return (
            <motion.div
              // 🎯 CRITICAL CHECK: Make sure n.id is genuinely unique (e.g., use a random uuid or a counter id, not the order number)
              key={n.id}
              className={`toast toast--${type}`}
              role="status"
              layout /* Smoothly moves remaining toasts up */
              
              /* 🏎️ Entry: Drops fluidly straight down from the top boundary */
              initial={{ opacity: 0, y: -35, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              
              /* 💨 Exit: Glides effortlessly out to the right side */
              exit={{ 
                opacity: 0, 
                x: 120, 
                scale: 0.95,
                transition: { duration: 0.25, ease: "easeInOut" }
              }}
              
              /* 🚀 High-performance synchronized transition speeds */
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                mass: 0.8,
                layout: { type: "spring", stiffness: 350, damping: 28 }
              }}
            >
              <span className="toast-icon" aria-hidden="true">
                {TOAST_ICONS[type] || TOAST_ICONS.info}
              </span>
              <span className="toast-message">{n.text}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;