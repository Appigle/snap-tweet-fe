"use client";

import axiosInstance from "@/lib/axios-config";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Update the fetchUser function to use the configured axios instance
  const fetchUser = async (token: string) => {
    try {
      const response = await axiosInstance.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  // Update the login function to use the configured axios instance
  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login with:", { email });
      const response = await axiosInstance.post("/auth/login", {
        email,
        password,
      });

      console.log("Login response:", response.data);
      const token = response.data.token;
      localStorage.setItem("token", token);

      // Fetch user details with the token
      await fetchUser(token);
    } catch (error: any) {
      console.error("Login error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });

      if (error.code === "ECONNABORTED") {
        throw new Error("Request timed out. Please try again.");
      }

      if (error.response) {
        if (error.response.status === 500) {
          throw new Error("Server error. Please try again in a few moments.");
        }
        throw new Error(error.response.data.message || "Login failed");
      }

      if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      }

      throw new Error("An unexpected error occurred. Please try again.");
    }
  };

  // Update the signup function to use the configured axios instance
  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await axiosInstance.post("/auth/signup", {
        username: name,
        email,
        password,
      });

      const token = response.data.token;
      localStorage.setItem("token", token);

      await fetchUser(token);
    } catch (error: any) {
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timed out. Please try again.");
      }

      if (error.response) {
        if (error.response.status === 500) {
          throw new Error("Server error. Please try again in a few moments.");
        }
        throw new Error(error.response.data.message || "Signup failed");
      }

      if (error.request) {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      }

      throw new Error("An unexpected error occurred. Please try again.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
