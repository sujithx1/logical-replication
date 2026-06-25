import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || "http://localhost:3000/api/replica",
  headers: {
    "Content-Type": "application/json",
  },
});
