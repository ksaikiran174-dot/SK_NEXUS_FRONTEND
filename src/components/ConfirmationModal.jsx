import { motion, AnimatePresence } from "framer-motion";
import "./ConfirmationModal.css";

function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  type = "confirm", // 'success', 'error', 'warning', 'confirm', 'info'
  showCancelButton = true,
}) {
  const getIcon = () => {
    if (isDangerous) return "⚠️";
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "?";
    }
  };

  const getTypeClass = () => {
    if (isDangerous) return "confirmation-modal--danger";
    return `confirmation-modal--${type}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirmation-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className={`confirmation-modal ${getTypeClass()}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`confirmation-icon ${isDangerous ? "confirmation-icon--danger" : `confirmation-icon--${type}`}`}>
              {getIcon()}
            </div>

            <div className="confirmation-header">
              <h2 id="confirmation-modal-title">{title}</h2>
            </div>

            <div className="confirmation-body">
              <p>{message}</p>
            </div>

            {children}
            
            <div className="confirmation-footer">
              {showCancelButton && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancel}
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                className={`btn ${isDangerous || type === "error" ? "btn-danger" : type === "warning" ? "btn-warning" : "btn-success"}`}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ConfirmationModal;