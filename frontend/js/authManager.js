const API_BASE_URL = "https://trentbank.onrender.com/api";

class SecureAuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.refreshTimer = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  setToken(token, user) {
    this.token = token;
    this.user = user;
    this.isInitialized = true;
    this.setupTokenRefresh();
    console.log("Token stored securely in memory");
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  isAuthenticated() {
    return !!this.token && this.isInitialized;
  }

  setupTokenRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(async () => {
      await this.refreshToken();
    }, 45 * 60 * 1000);
  }

  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        console.log("Token refreshed successfully");
        return true;
      } else {
        console.warn("Token refresh failed:", response.status);
        this.logout();
        return false;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
      return false;
    }
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInitialize();
    return this.initPromise;
  }

  async _performInitialize() {
    if (this.isInitialized) {
      return true;
    }

    console.log("Initializing auth session...");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: "GET",
        credentials: "include",
      });

      console.log("Session check response status:", response.status);

      if (response.status === 200) {
        const data = await response.json();
        this.setToken(data.token, data.user);
        console.log(
          "Session restored successfully for user:",
          data.user.username
        );
        return true;
      } else if (response.status === 401 || response.status === 403) {
        console.warn("No valid session found");
        this.isInitialized = true; // Mark as initialized even if no session
        return false;
      } else {
        // For server errors, don't mark as initialized so we can retry
        console.error("Session check failed with status:", response.status);
        const errorText = await response.text();
        console.error("Error details:", errorText);
        throw new Error(`Session check failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Session initialization error:", error);
      // Don't logout on network errors, just mark as no session
      this.isInitialized = true;
      return false;
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    this.isInitialized = false;
    this.initPromise = null;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear any old localStorage items
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch (e) {
      // Ignore localStorage errors
    }

    console.log("Logged out successfully");

    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
  }

  async verifyToken() {
    if (!this.token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      if (response.ok) {
        return true;
      } else {
        console.warn("Token verification failed");
        this.logout();
        return false;
      }
    } catch (error) {
      console.error("Token verification error:", error);
      this.logout();
      return false;
    }
  }
}



// Global instance
const authManager = new SecureAuthManager();
