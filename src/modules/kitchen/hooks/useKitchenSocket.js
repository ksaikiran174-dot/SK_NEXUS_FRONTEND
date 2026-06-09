import { useEffect, useRef, useState } from "react";

export const useKitchenSocket = ({
  role = "manager",
  onNewOrder,
  onOrderUpdate,
  onOrderCompleted,
  onEmployeeStatus,
}) => {

  const socketRef = useRef(null);

  const [isConnected, setIsConnected] =
    useState(false);

  const reconnectTimeout = useRef(null);

  useEffect(() => {

    const token =
      localStorage.getItem("token");

    if (!token) return;

    const connectSocket = () => {

      const ws = new WebSocket(

        `wss://sknexus-production.up.railway.app/ws/${role}?token=${token}`

      );

      socketRef.current = ws;

      // =========================
      // CONNECTED
      // =========================

      ws.onopen = () => {

        console.log(
          "✅ Kitchen socket connected"
        );

        setIsConnected(true);
      };

      // =========================
      // MESSAGE RECEIVED
      // =========================

      ws.onmessage = (event) => {

        try {

          const message = JSON.parse(
            event.data
          );

          console.log(
            "📩 WS MESSAGE:",
            message
          );

          switch (message.type) {

            case "new_order":

              onNewOrder?.(
                message.data
              );

              break;

            case "order_update":

              onOrderUpdate?.(
                message.data
              );

              break;

            case "order_completed":

              onOrderCompleted?.(
                message.data
              );

              break;

            case "employee_status":

              onEmployeeStatus?.(
                message.data
              );

              break;

            default:

              console.warn(
                "Unknown WS event:",
                message.type
              );
          }

        } catch (err) {

          console.error(
            "WS Parse Error:",
            err
          );
        }
      };

      // =========================
      // CLOSED
      // =========================

      ws.onclose = () => {

        console.warn(
          "⚠️ Kitchen socket disconnected"
        );

        setIsConnected(false);

        reconnectTimeout.current =
          setTimeout(() => {

            connectSocket();

          }, 3000);
      };

      // =========================
      // ERROR
      // =========================

      ws.onerror = (err) => {

        console.error(
          "❌ WS Error:",
          err
        );

        ws.close();
      };
    };

    connectSocket();

    // =========================
    // CLEANUP
    // =========================

    return () => {

      if (reconnectTimeout.current) {

        clearTimeout(
          reconnectTimeout.current
        );
      }

      if (
        socketRef.current &&
        socketRef.current.readyState ===
          WebSocket.OPEN
      ) {

        socketRef.current.close();
      }
    };

  }, [
    role,
    onNewOrder,
    onOrderUpdate,
    onOrderCompleted,
    onEmployeeStatus,
  ]);

  return {

    socket: socketRef.current,

    isConnected,
  };
};