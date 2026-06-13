import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";

import { api, setAuthToken } from "../api/client";

const TOKEN_KEY = "fitlog_pro_jwt";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
        try {
          const response = await api.get("/users/me");
          setUser(response.data);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          setAuthToken(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const response = await api.post("/auth/login", form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const jwt = response.data.access_token;
    await SecureStore.setItemAsync(TOKEN_KEY, jwt);
    setAuthToken(jwt);
    setToken(jwt);
    const me = await api.get("/users/me");
    setUser(me.data);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ loading, login, logout, token, user, setUser }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
