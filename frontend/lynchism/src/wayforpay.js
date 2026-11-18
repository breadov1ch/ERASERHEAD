import { API_URL } from "./config";

/**
 * Загружает скрипт виджета WayForPay
 */
export const loadWayForPayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Wayforpay) {
      resolve(window.Wayforpay);
      return;
    }

    const existingScript = document.getElementById("wayforpay-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.Wayforpay));
      existingScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "wayforpay-script";
    script.src = "https://secure.wayforpay.com/server/pay-widget.js";
    script.async = true;
    script.onload = () => resolve(window.Wayforpay);
    script.onerror = () => reject(new Error("Не удалось загрузить платежный шлюз WayForPay"));
    document.body.appendChild(script);
  });
};

/**
 * Получает параметры платежа с бэкенда и запускает виджет оплаты WayForPay
 */
export const startWayForPayPayment = async ({
  orderId,
  onApproved,
  onDeclined,
  onPending,
  onError
}) => {
  try {
    const clientOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    const res = await fetch(`${API_URL}/Payment/wayforpay-params/${orderId}?clientUrl=${encodeURIComponent(clientOrigin)}`);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Ошибка при генерации счета WayForPay");
    }

    const paymentData = await res.json();

    // Пытаемся загрузить интерактивный виджет WayForPay
    try {
      await loadWayForPayScript();
      if (window.Wayforpay) {
        const wayforpay = new window.Wayforpay();
        wayforpay.run(
          paymentData,
          async function (response) {
            console.log("WayForPay approved callback:", response);
            try {
              await fetch(`${API_URL}/Payment/mark-paid/${orderId}`, { method: "POST" });
            } catch (err) {
              console.error("Failed to mark order paid:", err);
            }
            if (onApproved) {
              onApproved(response);
            } else {
              window.location.href = `/confirmation/${orderId}?paid=1&status=Approved`;
            }
          },
          function (response) {
            console.log("WayForPay declined callback:", response);
            if (onDeclined) onDeclined(response);
          },
          async function (response) {
            console.log("WayForPay pending callback:", response);
            try {
              await fetch(`${API_URL}/Payment/mark-paid/${orderId}`, { method: "POST" });
            } catch (err) {
              console.error("Failed to mark order paid:", err);
            }
            if (onApproved) {
              onApproved(response);
            } else if (onPending) {
              onPending(response);
            } else {
              window.location.href = `/confirmation/${orderId}?paid=1&status=Approved`;
            }
          }
        );
        return;
      }
    } catch (widgetErr) {
      console.warn("WayForPay widget error, falling back to direct redirect form:", widgetErr);
    }

    // Резервный вариант: стандартная HTML-форма с автоматической отправкой
    submitWayForPayForm(paymentData);
  } catch (err) {
    console.error("WayForPay payment error:", err);
    if (onError) onError(err);
  }
};

/**
 * Создает и отправляет POST форму напрямую на шлюз WayForPay
 */
export const submitWayForPayForm = (data) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://secure.wayforpay.com/pay";
  form.acceptCharset = "utf-8";
  form.style.display = "none";

  Object.entries(data).forEach(([key, val]) => {
    if (Array.isArray(val)) {
      val.forEach((item) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = `${key}[]`;
        input.value = String(item);
        form.appendChild(input);
      });
    } else if (val !== null && val !== undefined) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(val);
      form.appendChild(input);
    }
  });

  document.body.appendChild(form);
  form.submit();
};
