export const refreshTokens = async () => {
  const token = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!token || !refreshToken) return false;

  const API_URL = process.env.REACT_APP_API_URL
  try {
    const response = await fetch(`${API_URL}/Client/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, refreshToken: refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      return true;
    }
  } catch (err) {
    console.error("Refresh error:", err);
  }

  return false;
};