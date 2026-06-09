import { motion } from "framer-motion";
import "./ConfirmationModal.css";

function ConfirmationModal({
  isOpen,
  title,
  message,
  type = "info", // 'info', 'success', 'error', 'warning', 'confirm'
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancelButton = true,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "confirm":
        return "?";
      default:
        return "ℹ";
    }
  };

  return (
    <div className="confirmation-modal-overlay">
      <motion.div
        className={`confirmation-modal confirmation-modal-${type}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`modal-icon modal-icon-${type}`}>{getIcon()}</div>

        <h3 className="modal-title">{title}</h3>

        <p className="modal-message">{message}</p>

        <div className="modal-footer">
          {showCancelButton && (
            <motion.button
              className="modal-btn modal-btn-cancel"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {cancelText}
            </motion.button>
          )}
          <motion.button
            className={`modal-btn modal-btn-confirm modal-btn-${type}`}
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfirmationModal;
