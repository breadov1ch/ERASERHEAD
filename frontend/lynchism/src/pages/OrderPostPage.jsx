import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';
import { getGuestCart, clearGuestCart, mergeGuestCartWithServer } from '../cartManager';
import { API_URL } from '../config';
import { useTranslation } from '../i18n';
import { useCurrency } from '../currency';
import { startWayForPayPayment } from '../wayforpay';
import DeliverySelector from '../components/DeliverySelector';

export default function OrderPostPage({ removeItem }) {
  const { t, loc } = useTranslation();
  const { formatPrice } = useCurrency();
  const [cartItems, setCartItems] = useState([]);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState("Ukraine");
  const [zip, setZip] = useState("49000");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Доставка перевозчиком (Нова Пошта / Укрпошта / Meest)
  const [deliveryInfo, setDeliveryInfo] = useState({
    carrier: 'Нова Пошта',
    carrierId: 'Nova Poshta',
    deliveryType: 'Відділення',
    deliveryTypeId: 'Warehouse',
    city: 'Дніпро',
    branch: 'Відділення №1: вул. Повітряна, 2',
    fullAddress: 'Дніпро, Відділення №1: вул. Повітряна, 2',
    deliveryCost: 0,
    timeEstimate: '1-2 дні'
  });

  // Промокоды
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Расчет стоимости товаров
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItemsCount = cartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const hasPreOrder = cartItems.some(item => Boolean(item.isPreOrder || item.product?.isPreOrder));

  // Способ оплаты:
  // Для обычных товаров: "WayForPay" (100%) или "Cash on Delivery" (наложка с 150 грн)
  // Для предзаказа: только 100% (WayForPay) или 50% (PreOrder_Deposit)
  const [paymentMethod, setPaymentMethod] = useState("WayForPay");

  useEffect(() => {
    if (hasPreOrder) {
      if (paymentMethod !== "WayForPay" && paymentMethod !== "PreOrder_Deposit") {
        setPaymentMethod("WayForPay");
      }
    } else {
      if (paymentMethod === "PreOrder_Deposit") {
        setPaymentMethod("Cash on Delivery");
      }
    }
  }, [hasPreOrder, paymentMethod]);

  const discountAmount = appliedPromo ? Number(appliedPromo.discount || 0) : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Бесплатная доставка строго от 2000 ₴ при 100% полной оплате (WayForPay)
  const isFreeDeliveryEligible = discountedSubtotal >= 2000;
  const isFreeDeliveryApplied = isFreeDeliveryEligible && paymentMethod === "WayForPay";

  // Расчет предоплаты строго:
  // Для обычных товаров: 150 ₴ (покрывает доставку в обе стороны)
  // Для предзаказа: 50% от суммы со скидкой
  const depositDueNow = hasPreOrder
    ? Math.round(discountedSubtotal * 0.5)
    : 150;

  // Остаток к доплате при получении посылки на почте
  const dueOnDelivery = Math.max(0, discountedSubtotal - depositDueNow);

  // Полная итоговая сумма заказа
  const total = discountedSubtotal;

  const isMiddleNameValid = deliveryInfo.carrierId === 'Ukrposhta' ? Boolean(middleName.trim()) : true;

  const isFormValid = Boolean(
    email.trim() &&
    phoneNumber.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    isMiddleNameValid &&
    deliveryInfo.fullAddress &&
    cartItems.length > 0 &&
    termsAccepted
  );

  useEffect(() => {
    const loadCart = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        const guestItems = getGuestCart().map(item => ({
          productId: item.productId,
          productName: item.name,
          price: item.price,
          size: item.size,
          color: item.color || "",
          quantity: item.quantity,
          isPreOrder: Boolean(item.isPreOrder)
        }));
        setCartItems(guestItems);
        return;
      }

      await mergeGuestCartWithServer(token);

      try {
        let response = await fetch(`${API_URL}/Cart/get-cart`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          const refreshed = await refreshTokens();
          if (refreshed) {
            const freshToken = localStorage.getItem("access_token");
            response = await fetch(`${API_URL}/Cart/get-cart`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${freshToken}`
              }
            });
          }
        }

        if (response.ok) {
          const data = await response.json();
          setCartItems(data);
        }
      } catch (err) {
        console.error("Cart fetch error:", err);
      }
    };

    loadCart();
  }, []);

  // Применение промокода
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setCheckingPromo(true);
    setPromoError("");
    setPromoMsg("");

    try {
      const res = await fetch(`${API_URL}/PromoCode/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim().toUpperCase(),
          orderAmount: subtotal
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || loc("Недійсний промокод", "Invalid promo code", "Недействительный промокод"));
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discountAmount,
        discountPercent: data.discountPercent
      });
      setPromoMsg(loc(`Промокод застосовано! Знижка: ${data.discountAmount} ₴`, `Promo code applied! Discount: ${data.discountAmount} ₴`, `Промокод применен! Скидка: ${data.discountAmount} ₴`));
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMsg("");
    setPromoError("");
  };

  const fetchConfirmOrder = async () => {
    if (!isFormValid) return;
    setSubmitting(true);
    setErrorMsg("");

    const items = cartItems.map(item => ({
      productId: item.product?.id || item.productId,
      size: item.size,
      color: item.color || "",
      quantity: item.quantity
    }));

    if (!items.length) {
      setErrorMsg(t("checkout_empty_cart") || "Bag is empty");
      setSubmitting(false);
      return;
    }

    const combinedLastName = middleName.trim()
      ? `${lastName.trim()} ${middleName.trim()}`
      : lastName.trim();

    const payload = {
      email: email.trim(),
      phone: phoneNumber.trim(),
      firstName: firstName.trim(),
      lastName: combinedLastName,
      middleName: middleName.trim(),
      streetAddress: deliveryInfo.fullAddress,
      country: country.trim() || "Ukraine",
      zipCode: zip.trim(),
      paymentMethod: paymentMethod,
      carrier: deliveryInfo.carrier,
      deliveryType: deliveryInfo.deliveryType,
      deliveryBranch: deliveryInfo.branch,
      deliveryCity: deliveryInfo.city,
      deliveryCost: 0,
      promoCode: appliedPromo ? appliedPromo.code : null,
      items: items
    };

    try {
      const response = await fetch(`${API_URL}/Order/guest_checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || t("checkout_error_failed") || "Failed to place order");
      }

      const createdOrderId = data.orderId;

      // Запускаем оплату через WayForPay
      startWayForPayPayment({
        orderId: createdOrderId,
        onApproved: async () => {
          try {
            await fetch(`${API_URL}/Payment/mark-paid/${createdOrderId}`, { method: "POST" });
          } catch (e) { }
          clearGuestCart();
          if (removeItem) removeItem();
          window.dispatchEvent(new Event("cartUpdated"));

          try {
            if (data?.clientCreated) {
              sessionStorage.setItem("lastOrderAccount", JSON.stringify({
                clientCreated: data.clientCreated,
                email: data.email
              }));
            }
          } catch (e) { }

          // Принудительный полный переход для очистки виджета WayForPay
          window.location.href = `/confirmation/${createdOrderId}?paid=1&status=Approved`;
        },
        onDeclined: async () => {
          try {
            await fetch(`${API_URL}/Order/cancel-pending/${createdOrderId}`, { method: "DELETE" });
          } catch (e) { }
          setErrorMsg(loc(
            "Оплату скасовано або відхилено банком. Неоплачене замовлення не було створене.",
            "Payment was cancelled or declined by your bank. Order was not created.",
            "Оплата отменена или отклонена банком. Неоплаченный заказ не был создан."
          ));
          setSubmitting(false);
        },
        onPending: async () => {
          try {
            await fetch(`${API_URL}/Payment/mark-paid/${createdOrderId}`, { method: "POST" });
          } catch (e) { }
          clearGuestCart();
          if (removeItem) removeItem();
          window.dispatchEvent(new Event("cartUpdated"));

          try {
            if (data?.clientCreated) {
              sessionStorage.setItem("lastOrderAccount", JSON.stringify({
                clientCreated: data.clientCreated,
                email: data.email
              }));
            }
          } catch (e) { }

          window.location.href = `/confirmation/${createdOrderId}?paid=1&status=Approved`;
        },
        onError: async () => {
          try {
            await fetch(`${API_URL}/Order/cancel-pending/${createdOrderId}`, { method: "DELETE" });
          } catch (e) { }
          setErrorMsg(loc(
            "Помилка при запуску платіжного шлюзу. Замовлення скасовано.",
            "Payment gateway error. Order was cancelled.",
            "Ошибка при запуске платежного шлюза. Заказ отменен."
          ));
          setSubmitting(false);
        }
      });
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className='bg-[#131313] text-white min-h-screen p-4 sm:p-10 font-mono'>
      <div className="max-w-6xl mx-auto">
        <div className="border-b border-zinc-700 pb-4 mb-8">
          <span className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] block">
            {t("checkout_subheading")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight mt-1">
            {t("checkout_heading")}
          </h1>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs uppercase mb-6 tracking-wider">
            {errorMsg}
          </div>
        )}

        <div className='flex flex-col lg:flex-row gap-10 items-start'>
          <div className='w-full space-y-8 bg-[#181818] border border-zinc-700 p-6 sm:p-8 shadow-xl'>

            {/* 01. КОНТАКТНАЯ ИНФОРМАЦИЯ */}
            <div>
              <div className='tracking-[0.25em] font-bold text-sm text-zinc-300 uppercase border-b border-zinc-700/80 pb-2 mb-4'>
                {t("checkout_contact_step")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1'>
                    {t("checkout_email_label")}
                  </p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300'
                    placeholder="order@void.com"
                    required
                  />
                </div>
                <div>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1'>
                    {t("checkout_phone_label")}
                  </p>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className='w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300'
                    placeholder="+380..."
                    required
                  />
                </div>
                <div>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1'>
                    {t("checkout_firstname_label")}
                  </p>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className='w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300'
                    required
                  />
                </div>
                <div>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1'>
                    {t("checkout_lastname_label")}
                  </p>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className='w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300'
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <p className='text-zinc-500 uppercase tracking-[0.15em] text-[10px] mb-1 flex justify-between items-center'>
                    <span>
                      {loc("По батькові", "Middle name", "Отчество")} {deliveryInfo.carrierId === 'Ukrposhta' ? '*' : loc('(необов\'язково)', '(optional)', '(необязательно)')}
                    </span>
                    {deliveryInfo.carrierId === 'Ukrposhta' && (
                      <span className="text-zinc-300 text-[9px] lowercase font-bold">
                        {loc("• обов'язково для ТТН Укрпошти", "• required for Ukrposhta TTN", "• обязательно для ТТН Укрпочты")}
                      </span>
                    )}
                  </p>
                  <input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className='w-full font-mono bg-[#111111] border border-zinc-700 text-white p-2.5 text-xs outline-none focus:border-zinc-300'
                    placeholder={loc("Іванович / Олександрівна...", "Middle name...", "Иванович / Александровна...")}
                    required={deliveryInfo.carrierId === 'Ukrposhta'}
                  />
                </div>
              </div>
            </div>

            {/* 02. ВЫБОР ПЕРЕВОЗЧИКА И ОТДЕЛЕНИЯ */}
            <div>
              <div className='tracking-[0.25em] font-bold text-sm text-zinc-300 uppercase border-b border-zinc-700/80 pb-2 mb-4'>
                {t("checkout_delivery_step")}
              </div>
              <DeliverySelector
                hasPreOrder={hasPreOrder}
                initialCity="Дніпро"
                onChange={setDeliveryInfo}
              />
            </div>

            {/* 03. СПОСОБ ОПЛАТЫ */}
            <div>
              <div className='tracking-[0.25em] font-bold text-sm text-zinc-300 uppercase border-b border-zinc-700/80 pb-2 mb-4'>
                {t("checkout_payment_step")}
              </div>

              {hasPreOrder ? (
                /* Режим для предзаказа: 100% или 50% */
                <div className="space-y-3 font-mono">
                  <div className="p-3 bg-[#141414] border border-zinc-700 text-zinc-200 text-xs space-y-1">
                    <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-white text-[11px]">
                      <span>★</span> {loc('ПРЕДЗАМОВЛЕННЯ // ТЕРМІН ВІДПРАВКИ: 10–14 РОБОЧИХ ДНІВ', 'PRE-ORDER // ESTIMATED DISPATCH: 10–14 BUSINESS DAYS', 'ПРЕДЗАКАЗ // СРОК ОТПРАВКИ: 10–14 РАБОЧИХ ДНЕЙ')}
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {loc(
                        'Поставка під замовлення (бронювання позиції). Термін відправки: 10–14 робочих днів. Для оформлення діє 100% повна оплата або передплата від 50%. Накладений платіж без передплати недоступний.',
                        'On-demand supply (item reservation). Dispatch timeframe: 10–14 business days. Requires 100% full payment or a minimum 50% deposit. Cash on delivery without prepayment is not available.',
                        'Поставка под заказ (бронирование позиции). Срок отправки: 10–14 рабочих дней. Действует 100% полная оплата или предоплата от 50%. Наложенный платеж без предоплаты недоступен.'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Вариант 1: Полная 100% оплата предзаказа */}
                    <label
                      onClick={() => setPaymentMethod("WayForPay")}
                      className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${paymentMethod === "WayForPay"
                        ? 'border-white bg-[#1a1a1a]'
                        : 'border-zinc-800 bg-[#111111] hover:border-zinc-700'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "WayForPay"}
                        onChange={() => setPaymentMethod("WayForPay")}
                        className="mt-0.5 accent-white cursor-pointer w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-white">
                            {loc('Повна оплата при оформленні передзамовлення (100%)', 'Full Payment on Pre-order Checkout (100%)', 'Полная оплата при оформлении предзаказа (100%)')}
                          </span>
                          {isFreeDeliveryEligible && (
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/60 px-1.5 py-0.5 bg-emerald-950/40">
                              {t("checkout_free_shipping_badge")}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 uppercase mt-1 leading-relaxed">
                          WayForPay • Apple Pay • Google Pay • Visa / Mastercard
                        </p>
                      </div>
                    </label>

                    {/* Вариант 2: Предоплата 50% */}
                    <label
                      onClick={() => setPaymentMethod("PreOrder_Deposit")}
                      className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${paymentMethod === "PreOrder_Deposit"
                        ? 'border-white bg-[#1a1a1a]'
                        : 'border-zinc-800 bg-[#111111] hover:border-zinc-700'
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "PreOrder_Deposit"}
                        onChange={() => setPaymentMethod("PreOrder_Deposit")}
                        className="mt-0.5 accent-white cursor-pointer w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-xs uppercase tracking-wider text-white block">
                          {loc(`Передплата 50% (${depositDueNow} ₴)`, `50% Deposit (${depositDueNow} ₴)`, `Предоплата 50% (${depositDueNow} ₴)`)}
                        </span>
                        <p className="text-[11px] text-zinc-400 uppercase mt-1 leading-relaxed">
                          {loc(
                            `Бронювання позиції після 50% передплати. Залишок (${dueOnDelivery} ₴) сплачуєте при отриманні на пошті`,
                            `Item reservation upon 50% deposit. The remaining ${dueOnDelivery} ₴ is paid upon parcel receipt`,
                            `Бронирование позиции после 50% предоплаты. Остаток (${dueOnDelivery} ₴) оплачиваете при получении на почте`
                          )}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                /* Режим для обычного заказа: 100% или 150 грн */
                <div className="grid grid-cols-1 gap-2.5 font-mono">
                  {/* Вариант 1: Онлайн-оплата карткою 100% */}
                  <label
                    onClick={() => setPaymentMethod("WayForPay")}
                    className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${paymentMethod === "WayForPay"
                      ? 'border-white bg-[#1a1a1a]'
                      : 'border-zinc-800 bg-[#111111] hover:border-zinc-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "WayForPay"}
                      onChange={() => setPaymentMethod("WayForPay")}
                      className="mt-0.5 accent-white cursor-pointer w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-white">
                          {loc('Онлайн-оплата карткою (100%)', 'Online Card Payment (100%)', 'Онлайн-оплата картой (100%)')}
                        </span>
                        {isFreeDeliveryEligible && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/60 px-1.5 py-0.5 bg-emerald-950/40">
                            {t("checkout_free_shipping_badge")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 uppercase mt-1 leading-relaxed">
                        WayForPay • Apple Pay • Google Pay • {loc('Без комісії за накладений платіж', 'Zero COD fees', 'Без комиссии за наложенный платеж')}
                      </p>
                    </div>
                  </label>

                  {/* Вариант 2: Оплата при получении (предоплата 150 грн) */}
                  <label
                    onClick={() => setPaymentMethod("Cash on Delivery")}
                    className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${paymentMethod === "Cash on Delivery"
                      ? 'border-white bg-[#1a1a1a]'
                      : 'border-zinc-800 bg-[#111111] hover:border-zinc-700'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === "Cash on Delivery"}
                      onChange={() => setPaymentMethod("Cash on Delivery")}
                      className="mt-0.5 accent-white cursor-pointer w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs uppercase tracking-wider text-white block">
                        {loc('Оплата при отриманні (передплата 150 грн)', 'Cash on Delivery (150 ₴ deposit)', 'Оплата при получении (предоплата 150 грн)')}
                      </span>
                      <p className="text-[11px] text-zinc-400 uppercase mt-1 leading-relaxed">
                        {loc(
                          `Передплата 150 ₴ за замовлення (покриває доставку в обидва боки). Залишок (${dueOnDelivery} ₴) — при отриманні на пошті`,
                          `150 ₴ order deposit due now (secures round-trip shipping). The balance (${dueOnDelivery} ₴) is paid upon pickup at branch`,
                          `Предоплата 150 ₴ за заказ (покрывает доставку в обе стороны). Остаток (${dueOnDelivery} ₴) — при получении на почте`
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* СВОДКА ЗАКАЗА И ПРОМОКОД */}
          <div className='bg-[#181818] border border-zinc-700 p-6 sm:p-8 w-full lg:w-[440px] shrink-0 sticky top-24 space-y-6 shadow-xl'>
            <h2 className="uppercase text-sm tracking-[0.2em] font-bold text-white border-b border-zinc-700 pb-3">
              {t("checkout_bag_contents")} ({cartItems.length})
            </h2>

            {/* Список товаров */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-2 divide-y divide-zinc-700/60">
              {cartItems.map((item, idx) => (
                <div key={idx} className="pt-2 flex justify-between text-xs">
                  <div>
                    <span className="font-bold uppercase text-white block truncate max-w-[200px]">
                      {item.productName}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase">
                      {t("checkout_size_label")} {item.size} × {item.quantity}
                      {item.isPreOrder && (
                        <span className="text-zinc-300 font-bold ml-1.5 block sm:inline">
                          • {loc('Передзамовлення (10–14 днів)', 'Pre-order (10–14 days)', 'Предзаказ (10–14 дней)')}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-zinc-200 block">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        {item.quantity} × {formatPrice(item.price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Блок промокода */}
            <div className="border-t border-zinc-700 pt-4">
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1.5 font-bold">
                {t("checkout_promo_label")}
              </label>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-950/40 border border-emerald-600/80 text-emerald-300 text-xs font-mono">
                  <div>
                    <span className="font-bold uppercase tracking-wider">{appliedPromo.code}</span>
                    <span className="text-[11px] block text-emerald-400">
                      -{discountAmount} ₴ ({appliedPromo.discountPercent ? `${appliedPromo.discountPercent}%` : loc('фіксована', 'fixed', 'фиксированная')})
                    </span>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="text-zinc-400 hover:text-white uppercase text-[10px] underline ml-2 cursor-pointer"
                  >
                    {t("checkout_promo_remove")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="VOID10"
                    className="w-full font-mono bg-[#111111] border border-zinc-700 text-white px-3 py-2 text-xs uppercase outline-none focus:border-zinc-300"
                  />
                  <button
                    type="button"
                    disabled={checkingPromo || !promoInput.trim()}
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {checkingPromo ? '...' : t("checkout_promo_apply")}
                  </button>
                </div>
              )}
              {promoError && (
                <div className="text-[11px] text-red-400 mt-1 font-mono">
                  ✕ {promoError}
                </div>
              )}
              {promoMsg && (
                <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                  ✓ {promoMsg}
                </div>
              )}
            </div>

            {/* Финансовый итог */}
            <div className="space-y-2.5 text-xs border-t border-zinc-700 pt-4">
              <div className="flex justify-between">
                <span className="text-zinc-400 uppercase tracking-widest">{t("checkout_subtotal_label")}</span>
                <span className="text-zinc-200">{formatPrice(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span className="uppercase tracking-widest">{t("checkout_promo_discount_label")}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-zinc-400 uppercase tracking-widest">
                  {loc(`ДОСТАВКА (${deliveryInfo.carrier})`, `SHIPPING (${deliveryInfo.carrier})`, `ДОСТАВКА (${deliveryInfo.carrier})`)}
                </span>
                {isFreeDeliveryApplied ? (
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold uppercase text-xs">
                      {t("checkout_free_shipping_applied")}
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-300 font-mono text-xs uppercase">
                    {t("checkout_carrier_rates")}
                  </span>
                )}
              </div>

              {isFreeDeliveryEligible && !isFreeDeliveryApplied && (
                <div className="text-[10px] text-zinc-200 font-mono bg-[#141414] border border-zinc-700 p-2.5 uppercase leading-relaxed">
                  {loc(
                    '★ Підказка: оберіть 100% повну оплату (WayForPay), щоб отримати безкоштовну доставку!',
                    '★ Tip: Choose 100% full payment (WayForPay) to get free shipping!',
                    '★ Подсказка: выберите 100% полную оплату (WayForPay), чтобы получить бесплатную доставку!'
                  )}
                </div>
              )}

              {!isFreeDeliveryEligible && (
                <div className="text-[10px] font-mono flex justify-between items-center bg-[#141414] border border-zinc-800 p-2 text-zinc-400">
                  <span className="uppercase">
                    {loc('До безкоштовної доставки:', 'For free shipping:', 'До бесплатной доставки:')}
                  </span>
                  <span className="text-white font-bold font-mono">
                    {loc(
                      `ще ${2000 - discountedSubtotal} ₴ (при 100% оплаті)`,
                      `add ${2000 - discountedSubtotal} ₴ (with 100% payment)`,
                      `еще ${2000 - discountedSubtotal} ₴ (при 100% оплате)`
                    )}
                  </span>
                </div>
              )}

              {hasPreOrder && (
                <div className="flex justify-between items-center text-[10px] text-white font-mono">
                  <span className="uppercase tracking-wider">{loc('ТЕРМІН ДОСТАВКИ:', 'DISPATCH TIMEFRAME:', 'СРОК ДОСТАВКИ:')}</span>
                  <span className="font-bold uppercase">{loc('10–14 РОБОЧИХ ДНІВ (ПОСТАВКА)', '10–14 BUSINESS DAYS (SUPPLY)', '10–14 РАБОЧИХ ДНЕЙ (ПОСТАВКА)')}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline border-t border-zinc-700 pt-3">
                <span className="uppercase tracking-widest font-black text-sm text-zinc-200">{t("checkout_total_label")}</span>
                <span className="text-2xl font-black text-white">{formatPrice(total)}</span>
              </div>

              {/* Расчет предоплаты / наложенного платежа */}
              {paymentMethod !== "WayForPay" && (
                <div className="mt-3 pt-3 border-t border-dashed border-zinc-700 space-y-2 bg-[#141414] p-3.5 border border-zinc-700 font-mono">
                  <div className="flex justify-between items-center text-zinc-300 text-[11px] uppercase">
                    <span>{hasPreOrder ? t("checkout_preorder_deposit_label") : t("checkout_delivery_deposit_label")}</span>
                    <span className="text-white font-mono font-bold">{depositDueNow} ₴</span>
                  </div>
                  <div className="flex justify-between items-center text-white font-bold uppercase tracking-wider text-[11px] border-t border-zinc-800 pt-2">
                    <span>{t("checkout_due_now")}</span>
                    <span className="text-sm font-black text-white">{depositDueNow} ₴</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300 text-[11px] uppercase">
                    <span>{t("checkout_due_delivery")}</span>
                    <span className="text-sm font-bold text-white font-mono">{dueOnDelivery} ₴</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase leading-relaxed pt-1.5 border-t border-zinc-800/80">
                    {loc(
                      `• Залишок за одяг (${dueOnDelivery} ₴) зменшено на суму передплати. Доставка сплачується окремо при отриманні.`,
                      `• Garment balance due (${dueOnDelivery} ₴) has been credited with your prepayment. Shipping is settled separately upon pickup.`,
                      `• Остаток за одежду (${dueOnDelivery} ₴) уменьшен на сумму предоплаты. Доставка оплачивается отдельно при получении.`
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Чекбокс згоди з умовами доставки та повернення (14 днів) */}
            <div className="border border-zinc-800 bg-[#121212] p-3.5 space-y-2 font-mono">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 accent-white w-4 h-4 cursor-pointer shrink-0"
                />
                <span className="text-[11px] text-zinc-300 uppercase leading-snug">
                  {t("checkout_terms_checkbox")}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[10px] text-zinc-300 hover:text-white uppercase underline tracking-wider cursor-pointer block pl-6 transition-colors"
              >
                {t("checkout_terms_link")}
              </button>
            </div>

            <button
              onClick={fetchConfirmOrder}
              disabled={!isFormValid || submitting}
              className={`w-full py-4 uppercase text-xs tracking-[0.3em] font-black transition-all ${isFormValid && !submitting
                ? 'bg-white text-black hover:bg-zinc-200 cursor-pointer active:scale-[0.99]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
            >
              {submitting
                ? t("checkout_btn_processing")
                : paymentMethod !== 'WayForPay'
                  ? (hasPreOrder
                    ? loc(`СПЛАТИТИ ПЕРЕДПЛАТУ 50% (${depositDueNow} ₴)`, `PAY 50% DEPOSIT (${depositDueNow} ₴)`, `ОПЛАТИТЬ ПРЕДОПЛАТУ 50% (${depositDueNow} ₴)`)
                    : loc(`СПЛАТИТИ ПЕРЕДПЛАТУ 150 ₴`, `PAY 150 ₴ DEPOSIT`, `ОПЛАТИТЬ ПРЕДОПЛАТУ 150 ₴`))
                  : (hasPreOrder
                    ? loc(`ОФОРМИТИ ПЕРЕДЗАМОВЛЕННЯ (${total} ₴)`, `PRE-ORDER NOW (${total} ₴)`, `ОФОРМИТЬ ПРЕДЗАКАЗ (${total} ₴)`)
                    : loc(`ОПЛАТИТИ ${total} ₴ (WAYFORPAY)`, `PAY ${total} ₴ (WAYFORPAY)`, `ОПЛАТИТЬ ${total} ₴ (WAYFORPAY)`))}
            </button>

            <p className="text-[10px] text-zinc-500 uppercase tracking-wider text-center leading-relaxed font-mono">
              {t("checkout_disclaimer")}
            </p>
          </div>
        </div>
      </div>

      {/* Модальне вікно: Умови доставки, огляду на пошті та повернення (14 днів) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono animate-fade-in" onClick={() => setShowTermsModal(false)}>
          <div
            className="w-full max-w-2xl bg-[#161616] border border-zinc-700 p-6 space-y-5 max-h-[85vh] overflow-y-auto shadow-2xl text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-400 block font-bold">
                  {"// ERASERHEAD LOGISTICS & RETURN POLICY"}
                </span>
                <h3 className="text-base font-black uppercase text-white tracking-wider mt-0.5">
                  {t("checkout_terms_modal_title")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-zinc-400 hover:text-white p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              {/* 1. Огляд на пошті */}
              <div className="border border-zinc-800 bg-[#121212] p-4 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">01</span>
                  <span>{loc('Огляд на пошті (головне правило)', 'Inspection upon pickup (Golden Rule)', 'Осмотр на почте (главное правило)')}</span>
                </div>
                <p className="text-zinc-300">
                  {loc(
                    "Обов'язково перевіряйте товар у відділенні Нової Пошти при отриманні. Якщо ви забрали посилку додому без огляду, претензії щодо механічних пошкоджень чи комплектації не приймаються.",
                    "Always inspect your items at the postal branch upon pickup. If the parcel is accepted without inspection, claims regarding external damage or missing parts cannot be accepted.",
                    "Обязательно проверяйте товар в отделении Новой Почты при получении. Если вы забрали посылку домой без осмотра, претензии по механическим повреждениям или комплектации не принимаются."
                  )}
                </p>
              </div>

              {/* 2. Хто платить за доставку */}
              <div className="border border-zinc-800 bg-[#121212] p-4 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">02</span>
                  <span>{loc('Транспортні витрати при поверненні', 'Return shipping expenses', 'Транспортные расходы при возврате')}</span>
                </div>
                <p className="text-zinc-300">
                  {loc(
                    "Якщо не підійшов розмір, фасон або ви передумали: всі транспортні витрати (повернення та повторна відправка на обмін) сплачує покупець. При відмові на пошті від замовлення з накладеним платежем передплата 150 грн не повертається, оскільки покриває послуги логістики в обидва боки. Якщо виявлено виробничий брак або помилку магазину (надіслали інший колір чи розмір) — доставку в обидва боки сплачує магазин.",
                    "If the size or style does not fit or you change your mind: all return shipping costs are covered by the customer. In case of refusal upon delivery for COD orders, the 150 ₴ prepayment is non-refundable as it covers round-trip carrier logistics. If a manufacturing defect or store mistake occurs — all shipping is covered by ERASERHEAD.",
                    "Если не подошел размер, фасон или вы передумали: все транспортные расходы (возврат и повторная отправка на обмен) оплачивает покупатель. При отказе на почте от заказа с наложенным платежом предоплата 150 грн не возвращается, так как покрывает логистику в обе стороны. Если производственный брак или ошибка магазина — доставку в обе стороны оплачивает магазин."
                  )}
                </p>
              </div>

              {/* 3. Умови прийому повернення */}
              <div className="border border-zinc-800 bg-[#121212] p-4 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">03</span>
                  <span>{loc('Вимоги до товару (14 днів)', 'Item condition requirements (14 days)', 'Требования к возврату (14 дней)')}</span>
                </div>
                <p className="text-zinc-300">
                  {loc(
                    "Повернення можливе протягом 14 днів з моменту отримання за умови збереження товарного вигляду, оригінального пакування, наявності всіх бірок та відсутності слідів носіння (запаху парфумів, шерсті, плям). Кошти повертаються на вашу банківську картку протягом 1–3 робочих днів після перевірки товару на нашому складі.",
                    "Returns are accepted within 14 days of delivery provided the item is unworn, unwashed, with all original tags attached and original packaging intact. Refunds are issued to your payment card within 1–3 business days after warehouse inspection.",
                    "Возврат возможен в течение 14 дней с момента получения при условии сохранения товарного вида, оригинальной упаковки, наличия всех бирок и отсутствия следов носки (запаха духов, шерсти, пятен). Средства возвращаются на карту в течение 1–3 рабочих дней после проверки товара на складе."
                  )}
                </p>
              </div>

              {/* 4. Нюанс для передзамовлення */}
              <div className="border border-zinc-800 bg-[#121212] p-4 space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="text-zinc-400 font-mono">04</span>
                  <span>{loc('Нюанс для передзамовлень (Pre-order)', 'Pre-order conditions', 'Нюанс для предзаказов (Pre-order)')}</span>
                </div>
                <p className="text-zinc-300">
                  {loc(
                    "Якщо оформлено передзамовлення, а товар уже викуплений у виробника та прямує в Україну — скасування до прибуття в Україну неможливе. Після отримання замовлення ви стандартно можете оформити обмін або повернення протягом 14 днів.",
                    "For custom pre-orders already dispatched into production, cancellation prior to parcel arrival in Ukraine is not possible. After receipt, you can exchange or return the item within standard 14 days.",
                    "Если оформлен предзаказ, а товар уже выкуплен у производителя и едет в Украину — отмена до приезда в Украину невозможна. После получения вы стандартно можете оформить возврат или обмен в течение 14 дней."
                  )}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4 flex justify-between items-center flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                {t("checkout_terms_btn_agree")}
              </button>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
              >
                {t("checkout_terms_btn_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
