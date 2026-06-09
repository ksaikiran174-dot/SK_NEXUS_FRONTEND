import { useState } from "react";
import { motion } from "framer-motion";
import "./Login.css";

function SuperAdminLogin({
  onLoginSuccess,
  onBackClick
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleLogin = async (e) => {

    e.preventDefault();

    setLoading(true);

    setError("");

    try {

      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/auth/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              email,
              password,

              role:
                "super_admin",
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        setError(
          data.detail ||
          "Login failed"
        );

        return;
      }

      localStorage.setItem(

        "superAdminAccessToken",

        data.access_token
      );

      localStorage.setItem(

        "refreshToken",

        data.refresh_token
      );

      localStorage.setItem(
        "role",
        "super_admin"
      );

      onLoginSuccess();

    } catch (err) {

      console.error(err);

      setError(
        "Connection error"
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div className="auth-container">

      <motion.div

        className="auth-wrapper"

        initial={{
          opacity: 0,
          y: 20
        }}

        animate={{
          opacity: 1,
          y: 0
        }}

        transition={{
          duration: 0.4
        }}
      >

        <div className="auth-form-container">

          <div className="auth-form-inner">

            <div className="form-header">

              <h1 className="form-title">
                Super Admin Login
              </h1>

              <p className="form-subtitle">
                Access system control panel
              </p>

            </div>

            {error && (

              <div className="alert alert-error">

                <span>⚠️</span>

                <span>{error}</span>

              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="form"
            >

              <div className="form-group">

                <label>Email</label>

                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@system.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  disabled={loading}
                />

              </div>

              <div className="form-group">

                <label>Password</label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  disabled={loading}
                />

              </div>

              <motion.button

                type="submit"

                className="btn-login"

                disabled={loading}

                whileHover={{
                  scale: 1.02
                }}

                whileTap={{
                  scale: 0.98
                }}
              >

                {loading
                  ? "Signing In..."
                  : "Login"}

              </motion.button>

            </form>

            <div className="form-footer">

              <button

                type="button"

                className="back-btn"

                onClick={onBackClick}
              >

                ← Back

              </button>

            </div>

          </div>

        </div>

      </motion.div>

    </div>
  );
}

export default SuperAdminLogin;