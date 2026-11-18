import { API_URL } from './config';

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
};

/**
 * Обновляет access_token каждые 15 минут с помощью долгоживущего refresh_token (60 дней).
 * Предотвращает дублирующие параллельные запросы.
 */
export const refreshTokens = async () => {
  const token = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    return false;
  }

  // Если уже идет процесс обновления — ждем его завершения, а не шлем второй раз
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        resolve(Boolean(newToken));
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_URL}/Client/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        accessToken: token || "", 
        refreshToken: refreshToken 
      })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      localStorage.setItem("token_timestamp", String(Date.now()));
      
      isRefreshing = false;
      onRefreshed(data.accessToken);
      window.dispatchEvent(new Event("authChanged"));
      return true;
    } else if (response.status === 401 || response.status === 403) {
      // Только если сервер явно сообщил, что refresh_token просрочен (прошло 60 дней бездействия)
      console.warn("[Auth] Refresh token expired after 60 days of inactivity.");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_timestamp");
      
      isRefreshing = false;
      onRefreshed(null);
      window.dispatchEvent(new Event("authChanged"));
      return false;
    } else {
      // При временных сбоях сети или 5xx ошибках сервера НЕ сбрасываем токен!
      isRefreshing = false;
      onRefreshed(null);
      return false;
    }
  } catch (err) {
    console.warn("[Auth] Network error during token refresh (retaining login):", err);
    isRefreshing = false;
    onRefreshed(null);
    return false;
  }
};

/**
 * Фоновый таймер: автоматически обновляет токен каждые 14 минут, 
 * пока пользователь на сайте, и проверяет срок жизни токена при переключении на вкладку.
 */
export const initTokenRefresher = () => {
  // Проверка каждые 14 минут (токен живет 15 минут)
  const REFRESH_INTERVAL_MS = 14 * 60 * 1000;

  const intervalId = setInterval(() => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      refreshTokens();
    }
  }, REFRESH_INTERVAL_MS);

  // При возвращении пользователя на вкладку браузера (фокус):
  const onFocusOrVisible = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return;

    const lastTime = parseInt(localStorage.getItem("token_timestamp") || "0", 10);
    const elapsed = Date.now() - lastTime;

    // Если прошло больше 14 минут с последнего обновления — тихо обновляем токен
    if (elapsed > REFRESH_INTERVAL_MS) {
      refreshTokens();
    }
  };

  window.addEventListener("focus", onFocusOrVisible);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      onFocusOrVisible();
    }
  });

  return () => {
    clearInterval(intervalId);
    window.removeEventListener("focus", onFocusOrVisible);
  };
};
