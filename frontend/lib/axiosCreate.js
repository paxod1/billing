import axios from "axios";
import { getCookie, getAuthToken, clearAuthCookies } from "../utils/cookieHelper";

// Connection to Node.js backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/";

// ----------------------------
// 1. BASIC REQUEST INSTANCE
// ----------------------------
export const basicRequest = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ----------------------------
// 2. TOKEN REQUEST INSTANCE (SINGLE TOKEN AUTHENTICATION)
// ----------------------------
export const tokenRequest = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ----------------------------
// 3. SINGLE TOKEN REQUEST INTERCEPTOR
// ----------------------------
const setupRequestInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      // Access single token from cookie when in browser
      if (typeof window !== "undefined") {
        const token = getAuthToken();

        if (token) {
          // Pass single token in standard Authorization header & x-am-authorization header
          config.headers["Authorization"] = `Bearer ${token}`;
          config.headers["x-am-authorization"] = token;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Apply request interceptor to tokenRequest
setupRequestInterceptors(tokenRequest);

// Global Response Interceptor for Error Handling
import { showToast } from "./features/toast/toastSlice";

let store;

export const injectStore = (_store) => {
  store = _store;
  if (typeof window !== "undefined") {
    window.__redux_store__ = _store;
  }
};

const setupResponseInterceptors = (instance) => {
  instance.interceptors.response.use(
    (response) => {
      const activeStore = store || (typeof window !== "undefined" ? window.__redux_store__ : null);

      if (response.data?.success === true && response.data?.data?.success === false) {
        let errorMsg = "Internal Server Error";
        const rawError = response.data.data.error;
        
        if (typeof rawError === "string") {
          errorMsg = rawError;
        } else if (Array.isArray(rawError)) {
          errorMsg = rawError[0]?.message || rawError[0] || errorMsg;
        } else if (rawError && typeof rawError === "object") {
          errorMsg = rawError.message || errorMsg;
        }

        let isDispatched = false;
        if (activeStore) {
          activeStore.dispatch(showToast({ message: errorMsg, type: "error" }));
          isDispatched = true;
        }

        const innerError = new Error(errorMsg);
        innerError.response = response;
        innerError.isHandled = isDispatched;
        return Promise.reject(innerError);
      }
      return response;
    },
    (error) => {
      const activeStore = store || (typeof window !== "undefined" ? window.__redux_store__ : null);

      // Handle 401 Unauthorized -> Clear single token cookie & redirect
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          clearAuthCookies();
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }

      const isNetworkOrTimeoutOrServerError = 
        !error.response ||
        error.code === "ERR_NETWORK" ||
        error.code === "ECONNABORTED" ||
        (error.response?.status >= 500 && error.response?.status < 600);

      if (isNetworkOrTimeoutOrServerError) {
        const apiMessage = error.response?.data?.data?.message || 
                           error.response?.data?.data?.error || 
                           error.response?.data?.message;

        let errMsg = "Something went wrong. Please try again later.";
        if (apiMessage) {
          errMsg = apiMessage;
        } else if (error.response?.status >= 500) {
          errMsg = "Server error. Please try again later.";
        } else if (error.code === "ECONNABORTED") {
          errMsg = "Request timed out. Please check your connection.";
        } else if (error.message) {
          errMsg = error.message;
        }
        if (activeStore) {
          activeStore.dispatch(showToast({ message: errMsg, type: "error" }));
          error.isHandled = true;
        }
      }

      const apiMessage = error.response?.data?.data?.message || 
                         error.response?.data?.data?.error || 
                         error.response?.data?.message;
      
      if (!error.isHandled && apiMessage) {
        if (activeStore) {
          activeStore.dispatch(showToast({ message: apiMessage, type: "error" }));
          error.isHandled = true;
        }
      }

      return Promise.reject(error);
    }
  );
};

export const authRequest = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

setupResponseInterceptors(tokenRequest);
setupResponseInterceptors(basicRequest);
setupResponseInterceptors(authRequest);