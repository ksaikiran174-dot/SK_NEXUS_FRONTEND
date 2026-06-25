// api.js

export const apiFetch = async (url, options = {}, role) => {
  // 🎯 FIX 1: AUTO-DETECT ROLE ACCURATELY USING LOCAL STORAGE TRUTH
  let currentRole = role;
  if (!currentRole) {
    // Read the explicit global state role token saved by App.jsx
    currentRole = localStorage.getItem("role");
    
    // Fallback safe defaults if local storage hasn't initialized yet
    if (!currentRole) {
      currentRole = window.location.pathname.includes("manager") || url.includes("manager") 
        ? "manager" 
        : "employee";
    }
  }

  const tokenKey =
    currentRole === "manager"
      ? "managerAccessToken"
      : "employeeAccessToken";

  const refreshTokenKey =
    currentRole === "manager"
      ? "managerRefreshToken"
      : "employeeRefreshToken";

  let accessToken = localStorage.getItem(tokenKey);

  // =========================================
  // DETECT FORMDATA
  // =========================================
  const isFormData = options.body instanceof FormData;

  // =========================================
  // HEADERS
  // =========================================
  const headers = { ...(options.headers || {}) };

  // 🎯 FIX 2: ONLY ATTACH AUTH IF TOKEN ACTUALLY EXISTS (Avoids sending "Bearer null")
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // ONLY SET JSON HEADER IF NOT FORMDATA
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // =========================================
  // REQUEST
  // =========================================
  let response = await fetch(url, {
    ...options,
    headers
  });

  // =========================================
  // 🚀 INSTANT BLOCK INTERCEPTOR (403 Catch)
  // =========================================
  if (response.status === 403) {
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      
      // Check for either Admin Suspension OR Instant Subscription Expiration
      if (data?.detail === "RESTAURANT_SUSPENDED" || data?.detail === "SUBSCRIPTION_EXPIRED") {
        
        if (data.detail === "SUBSCRIPTION_EXPIRED") {
          alert("Your plan subscription has expired. Please contact administration to extend your service.");
        } else {
          alert("This restaurant account has been suspended by the administrator.");
        }
        
        // Wipe local tokens and force cleanly back to login page instantly
        logout(currentRole);
        return response;
      }
    } catch (e) {
      console.error("Error reading 403 error context:", e);
    }
  }

  // =========================================
  // TOKEN EXPIRED (401 Interceptor)
  // =========================================
  if (response.status === 401) {
    const refreshToken = localStorage.getItem(refreshTokenKey);

    if (!refreshToken) {
      logout(currentRole);
      return response;
    }

    try {
      const refreshRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (!refreshRes.ok) {
        logout(currentRole);
        return response;
      }

      const refreshData = await refreshRes.json();
      localStorage.setItem(tokenKey, refreshData.access_token);

      // =========================================
      // RETRY REQUEST
      // =========================================
      const retryHeaders = {
        Authorization: `Bearer ${refreshData.access_token}`,
        ...(options.headers || {})
      };

      if (!isFormData) {
        retryHeaders["Content-Type"] = "application/json";
      }

      response = await fetch(url, {
        ...options,
        headers: retryHeaders
      });
    } catch (error) {
      console.error("Token refresh routing error:", error);
      logout(currentRole);
    }
  }

  return response;
};

// =========================================
// LOGOUT
// =========================================
const logout = (role) => {
  if (role === "manager") {
    localStorage.removeItem("managerAccessToken");
    localStorage.removeItem("managerRefreshToken");
    localStorage.removeItem("restaurantStatus");
  } else {
    localStorage.removeItem("employeeAccessToken");
    localStorage.removeItem("employeeRefreshToken");
  }
  
  localStorage.removeItem("role");
  localStorage.removeItem("plan");

  window.location.href = "/";
};


