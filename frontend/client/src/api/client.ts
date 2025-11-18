import axios from "axios";

// Use relative URL for production, absolute for development
const isDevelopment = import.meta.env.DEV;

export const api = axios.create({
  baseURL: isDevelopment ? "http://127.0.0.1:8000" : "",
});

// Shutdown function
export const sendShutdown = async (): Promise<void> => {
  try {
    await api.post("/shutdown");
  } catch (error) {
    // Ignore errors
  }
};