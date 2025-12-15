// api.js - centralized API helper (include on every page BEFORE page-specific JS)
const API = (function () {
  const baseURL = window.CARECONNECT_API_BASE || "http://localhost:4000";

  function getToken() {
    return localStorage.getItem("careconnect_token");
  }

  function setToken(token) {
    if (token) localStorage.setItem("careconnect_token", token);
    else localStorage.removeItem("careconnect_token");
  }

  function setUser(user) {
    if (user) localStorage.setItem("careconnect_user", JSON.stringify(user));
    else localStorage.removeItem("careconnect_user");
  }

  function getUser() {
    const raw = localStorage.getItem("careconnect_user");
    return raw ? JSON.parse(raw) : null;
  }

  async function request(path, options = {}) {
    const url = baseURL + path;
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      options.headers || {}
    );

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const opts = Object.assign({}, options, { headers });

    if (opts.body && typeof opts.body === "object") {
      opts.body = JSON.stringify(opts.body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      // Network or CORS error
      throw { code: "NETWORK_ERROR", message: "Network error or server unavailable", detail: err };
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      json = null;
    }

    if (!res.ok) {
      // Handle auth expired centrally
      if (res.status === 401) {
        // remove tokens and redirect to login
        setToken(null);
        setUser(null);
        // allow caller to handle redirect; but also throw standard error
        throw { code: "UNAUTHORIZED", status: 401, message: (json && json.message) || "Unauthorized" };
      }
      throw { code: "API_ERROR", status: res.status, message: (json && json.message) || res.statusText, body: json };
    }

    return json;
  }

  return {
    baseURL,
    request,
    getToken,
    setToken,
    setUser,
    getUser,
  };
})();
