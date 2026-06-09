export const createSocket = (
  role
) => {

  const token =
    role === "manager"
      ? localStorage.getItem(
          "managerAccessToken"
        )
      : localStorage.getItem(
          "employeeAccessToken"
        );

  if (!token) {
    console.error("No token found");
    return null;
  }

  return new WebSocket(
    `wss://sknexus-production.up.railway.app/ws/${role}?token=${token}`
  );
};