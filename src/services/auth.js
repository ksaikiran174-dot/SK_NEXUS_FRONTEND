export const refreshAccessToken =
  async () => {

    // Get role to determine which tokens to use
    const role =
      localStorage.getItem("role");

    const refreshTokenKey =
      role === "manager"
        ? "managerRefreshToken"
        : "employeeRefreshToken";

    const tokenKey =
      role === "manager"
        ? "managerAccessToken"
        : "employeeAccessToken";

    const refreshToken =
      localStorage.getItem(
        refreshTokenKey
      );

    if (!refreshToken) {
      return null;
    }

    try {

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            refresh_token:
              refreshToken,
          }),
        }
      );

      const data =
        await res.json();

      if (data.access_token) {

        localStorage.setItem(
          tokenKey,
          data.access_token
        );

        return data.access_token;
      }

      return null;

    } catch (err) {

      console.error(err);

      return null;
    }
};

/* ========================================
   ROLE-SPECIFIC localStorage CLEARING
======================================== */

export const clearManagerData = () => {
  localStorage.removeItem("managerAccessToken");
  localStorage.removeItem("managerRefreshToken");
  localStorage.removeItem("rememberedEmail");
};

export const clearEmployeeData = () => {
  localStorage.removeItem("employeeAccessToken");
  localStorage.removeItem("employeeRefreshToken");
  localStorage.removeItem("rememberedEmail");
};

export const clearAllRoleData = () => {
  clearManagerData();
  clearEmployeeData();
  localStorage.removeItem("role");
};

