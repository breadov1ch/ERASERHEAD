import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { startWayForPayPayment } from '../wayforpay';
import { API_URL } from '../config';

export default function ConfirmationPage(){
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, loc } = useTranslation();
  const clientCreated = location.state?.clientCreated;
  const clientEmail = location.state?.email;

  const searchParams = new URLSearchParams(location.search);
  const isApprovedFromUrl = 
    searchParams.get("paid") === "1" || 
    searchParams.get("status") === "Approved" ||
    searchParams.get("transactionStatus") === "Approved";
  const wasApproved = isApprovedFromUrl || Boolean(location.state?.paid);

  const [orderStatus, setOrderStatus] = useState(
    wasApproved 
      ? (location.state?.isPrepaid ? "Prepaid_Deposit" : "Paid") 
      : "Pending"
  );
  const [paymentMethod, setPaymentMethod] = useState(location.state?.paymentMethod || "WayForPay");
  const [orderData, setOrderData] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!id) return;

    const syncStatus = async () => {
      if (wasApproved) {
        try {
          await fetch(`${API_URL}/Payment/mark-paid/${id}`, { method: "POST" });
        } catch (e) {
          console.error("mark-paid error:", e);
        }
      }

      try {
        const res = await fetch(`${API_URL}/Order/getOrderStatus/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrderData(data);
          if (data?.paymentMethod) setPaymentMethod(data.paymentMethod);

          const isCodMethod = 
            data?.paymentMethod === "Cash on Delivery" || 
            data?.paymentMethod === "COD" || 
            data?.paymentMethod === "PreOrder_Deposit" ||
            location.state?.isPrepaid;

          if (wasApproved) {
            setOrderStatus(isCodMethod ? "Prepaid_Deposit" : "Paid");
          } else if (data?.status === "Paid" || data?.status === "Prepaid_Deposit") {
            setOrderStatus(data.status);
          } else if (data?.status) {
            setOrderStatus(data.status);
          }
        }
      } catch (err) {
        console.error("Fetch status error:", err);
        if (wasApproved) {
          setOrderStatus(location.state?.isPrepaid ? "Prepaid_Deposit" : "Paid");
        }
      }
    };

    syncStatus();
  }, [id, wasApproved, location.state?.isPrepaid]);

  const isCod = paymentMethod === "Cash on Delivery" || paymentMethod === "COD" || paymentMethod === "PreOrder_Deposit";
  const isPaid = orderStatus === "Paid" || orderData?.status === "Paid";
  const isPrepaid = orderStatus === "Prepaid_Deposit" || orderData?.status === "Prepaid_Deposit" || (location.state?.isPrepaid && wasApproved);
  const isPending = !isPaid && !isPrepaid;

  const hasPreOrder = Boolean(orderData?.hasPreOrder);
  const requiredDeposit = orderData?.requiredDeposit || (hasPreOrder ? Math.round((orderData?.preOrderSum || 0) * 0.5) : 150);
  const dueOnDelivery = orderData?.dueOnDelivery ?? 0;

  const handlePayWayForPay = () => {
    setPaying(true);
    startWayForPayPayment({
      orderId: id,
      onApproved: async () => {
        try {
          await fetch(`${API_URL}/Payment/mark-paid/${id}`, { method: "POST" });
        } catch (e) {}
        setOrderStatus(isCod ? "Prepaid_Deposit" : "Paid");
        setPaying(false);
      },
      onDeclined: () => {
        setPaying(false);
      },
      onPending: async () => {
        try {
          await fetch(`${API_URL}/Payment/mark-paid/${id}`, { method: "POST" });
        } catch (e) {}
        setOrderStatus(isCod ? "Prepaid_Deposit" : "Paid");
        setPaying(false);
      },
      onError: (err) => {
        alert(err.message || "Помилка при запуску оплати");
        setPaying(false);
      }
    });
  };

  const SuccessIcon = () => {
    return (
      <div className="relative flex items-center justify-center w-32 h-32">
        <div className="absolute w-40 h-40 border border-zinc-800 rotate-[30deg]"></div>
        <div className="absolute w-40 h-40 border border-zinc-700 rotate-[15deg]"></div>
        <div className={`absolute w-40 h-40 border ${isPaid || isPrepaid ? 'border-emerald-500 bg-emerald-950/20' : 'border-zinc-500 bg-[#0d0d0d]'} flex items-center justify-center`}>
          <svg 
            width="34" 
            height="34" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isPaid || isPrepaid ? "#34d399" : "white"} 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className='w-full flex justify-center bg-[#131313] min-h-screen font-mono py-12'>
      <div className='flex flex-col items-center justify-center w-full max-w-2xl px-6'>
        
        <SuccessIcon />

        <p className='mt-14 font-black tracking-[0.2em] text-white text-3xl uppercase text-center'>
          {lang === 'ua' ? 'ЗАМОВЛЕННЯ' : lang === 'ru' ? 'ЗАКАЗ' : 'ORDER'}{' '}
          <span className='text-zinc-500'>#{id?.padStart(6, '0')}</span>{' '}
          {lang === 'ua' ? 'ПРИЙНЯТО' : lang === 'ru' ? 'ПРИНЯТ' : 'ACCEPTED'}
        </p>

        {/* Статус оплаты */}
        <div className="mt-4">
          {isPaid ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-bold uppercase tracking-widest">
              <span>●</span> {loc('ПОВНІСТЮ ОПЛАЧЕНО // WAYFORPAY APPROVED', 'FULLY PAID // WAYFORPAY APPROVED', 'ПОЛНОСТЬЮ ОПЛАЧЕНО // WAYFORPAY APPROVED')}
            </span>
          ) : isPrepaid ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-950/60 border border-emerald-500 text-emerald-300 text-xs font-bold uppercase tracking-widest">
              <span>●</span> {hasPreOrder 
                ? loc('ПЕРЕДОПЛАТА 50% СПЛАЧЕНА // ПЕРЕДЗАМОВЛЕННЯ', '50% DEPOSIT PAID // PRE-ORDER', 'ПРЕДОПЛАТА 50% ОПЛАЧЕНА // ПРЕДЗАКАЗ')
                : loc('ПЕРЕДОПЛАТА 150 ₴ СПЛАЧЕНА // ОПЛАТА ПРИ ОТРИМАННІ', '150 ₴ DEPOSIT PAID // CASH ON DELIVERY', 'ПРЕДОПЛАТА 150 ₴ ОПЛАЧЕНА // ОПЛАТА ПРИ ПОЛУЧЕНИИ')}
            </span>
          ) : isCod ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest">
              <span>○</span> {hasPreOrder 
                ? loc(`ОЧІКУЄТЬСЯ ПЕРЕДОПЛАТА 50% (${requiredDeposit} ₴)`, `AWAITING 50% DEPOSIT (${requiredDeposit} ₴)`, `ОЖИДАЕТСЯ ПРЕДОПЛАТА 50% (${requiredDeposit} ₴)`)
                : loc('ОЧІКУЄТЬСЯ ПЕРЕДОПЛАТА 150 ₴ ЗА ОДЯГ', 'AWAITING 150 ₴ GARMENT DEPOSIT', 'ОЖИДАЕТСЯ ПРЕДОПЛАТА 150 ₴ ЗА ОДЕЖДУ')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest">
              <span>○</span> {loc('ОЧІКУЄТЬСЯ ОПЛАТА // AWAITING WAYFORPAY', 'AWAITING PAYMENT // WAYFORPAY', 'ОЖИДАЕТСЯ ОПЛАТА // AWAITING WAYFORPAY')}
            </span>
          )}
        </div>

        <div className='mt-4 w-full max-w-md text-center'>
          <p className='text-zinc-400 text-xs uppercase tracking-widest leading-relaxed'>
            {isPaid
              ? loc(
                  'Оплату успішно підтверджено. Замовлення передано на збірку та відправку.',
                  'Payment successfully confirmed. Your order has been dispatched to fulfillment.',
                  'Оплата успешно подтверждена. Заказ передан на комплектацию и отправку.'
                )
              : isPrepaid
              ? (hasPreOrder
                  ? loc(
                      `Передоплату 50% (${requiredDeposit} ₴) успішно отримано! Замовлення передано у виробництво. Залишок вартості одягу (${dueOnDelivery} ₴) ви сплатите при отриманні у відділенні (доставка сплачується окремо за тарифами перевізника).`,
                      `50% deposit (${requiredDeposit} ₴) received! Your order is queued for tailoring. The remaining ${dueOnDelivery} ₴ is paid upon delivery (shipping is paid separately per carrier rates).`,
                      `Предоплата 50% (${requiredDeposit} ₴) успешно получена! Заказ запущен в производство. Остаток стоимости одежды (${dueOnDelivery} ₴) вы оплатите при получении в отделении (доставка оплачивается отдельно по тарифам перевозчика).`
                    )
                  : loc(
                      `Передоплату 150 ₴ за одяг успішно отримано! Замовлення підтверджено. Фінальну суму зменшено на 150 ₴. Залишок вартості товару (${dueOnDelivery} ₴) ви сплатите при отриманні на пошті (доставка сплачується окремо за тарифами перевізника).`,
                      `150 ₴ garment deposit received! Order confirmed. The order total was reduced by 150 ₴. The balance (${dueOnDelivery} ₴) is paid upon pickup at post office (shipping is paid per carrier rates).`,
                      `Предоплата 150 ₴ за одежду успешно получена! Заказ подтвержден. Финальная сумма уменьшена на 150 ₴. Остаток стоимости товара (${dueOnDelivery} ₴) вы оплатите при получении на почте (доставка оплачивается отдельно по тарифам перевозчика).`
                    ))
              : isCod
              ? (hasPreOrder
                  ? loc(
                      `Для замовлень із передзамовленням обов'язкова передоплата складає 50% від вартості одягу (${requiredDeposit} ₴). Фінальна сума при отриманні буде зменшена на цю суму.`,
                      `For pre-order items, mandatory deposit is 50% of the garment cost (${requiredDeposit} ₴). Remaining balance upon pickup will be credited with this deposit.`,
                      `Для заказов с предзаказом обязательная предоплата составляет 50% от стоимости одежды (${requiredDeposit} ₴). Финальная сумма при получении будет уменьшена на эту сумму.`
                    )
                  : loc(
                      `Ваше замовлення зареєстровано. Для відправки необхідно внести обов’язкову передоплату 150 ₴ за одяг. Залишок (${dueOnDelivery} ₴) оплачується при отриманні.`,
                      `Your order has been logged. To dispatch, a mandatory 150 ₴ garment deposit is required. Balance (${dueOnDelivery} ₴) is due upon delivery.`,
                      `Ваш заказ зарегистрирован. Для отправки необходимо внести обязательную предоплату 150 ₴ за одежду. Остаток (${dueOnDelivery} ₴) оплачивается при получении.`
                    ))
              : loc(
                  'Ваше замовлення успішно зареєстровано в системі. Очікується онлайн-оплата.',
                  'Your order has been successfully logged. Awaiting online payment.',
                  'Ваш заказ успешно зарегистрирован в системе. Ожидается онлайн-оплата.'
                )}
          </p>

          {/* Кнопка повторной быстрой оплаты WayForPay если заказ еще не оплачен */}
          {isPending && (
            <div className="mt-6 p-4 bg-[#181818] border border-zinc-700 space-y-3 shadow-lg">
              <span className="text-[11px] text-zinc-300 block font-bold uppercase tracking-wider">
                {isCod 
                  ? (hasPreOrder ? loc(`Внесіть передоплату 50% (${requiredDeposit} ₴) за одяг:`, `Deposit 50% (${requiredDeposit} ₴) for garment:`, `Внесите предоплату 50% (${requiredDeposit} ₴) за одежду:`) : loc('Внесіть передоплату 150 ₴ за одяг:', 'Deposit 150 ₴ for garment:', 'Внесите предоплату 150 ₴ за одежду:'))
                  : loc('Бажаєте завершити оплату зараз?', 'Complete payment now?', 'Желаете завершить оплату сейчас?')}
              </span>
              <button
                type="button"
                disabled={paying}
                onClick={handlePayWayForPay}
                className="w-full py-3.5 bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                {paying 
                  ? loc('ЗАПУСК WAYFORPAY...', 'LAUNCHING WAYFORPAY...', 'ЗАПУСК WAYFORPAY...') 
                  : isCod 
                  ? loc(`СПЛАТИТИ ПЕРЕДОПЛАТУ ${requiredDeposit} ₴ (WAYFORPAY)`, `PAY ${requiredDeposit} ₴ DEPOSIT (WAYFORPAY)`, `ОПЛАТИТЬ ПРЕДОПЛАТУ ${requiredDeposit} ₴ (WAYFORPAY)`) 
                  : loc('ОПЛАТИТИ ЧЕРЕЗ WAYFORPAY', 'PAY VIA WAYFORPAY', 'ОПЛАТИТЬ ЧЕРЕЗ WAYFORPAY')}
              </button>
            </div>
          )}

          {clientCreated && (
            <div className="mt-6 border border-zinc-700 bg-[#181818] p-5 text-left shadow-lg">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block mb-1">
                SYSTEM_ACCESS // ACCOUNT CREATED
              </span>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed">
                {lang === 'ua' ? 'Для вас створено акаунт покупця: ' : lang === 'ru' ? 'Для вас создан аккаунт покупателя: ' : 'Customer account created: '}
                <strong className="text-white">{clientEmail}</strong>.
              </p>
              <p className="text-[11px] text-zinc-500 uppercase mt-2">
                {lang === 'ua' 
                  ? 'Згенерований пароль для входу надіслано на вашу пошту. Ви можете використовувати його для перегляду статусу замовлення.'
                  : lang === 'ru'
                  ? 'Сгенерированный пароль для входа отправлен на вашу почту. Вы можете использовать его для отслеживания заказа.'
                  : 'An access password has been dispatched to your email. You can use it to track your orders.'}
              </p>
            </div>
          )}
        </div>

        <button 
          onClick={() => navigate("/catalog")}
          className='bg-white text-black py-4 px-10 mt-7 hover:bg-zinc-200 transition-colors active:scale-95 cursor-pointer'>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">
            {t("catalog_title") || "CATALOG"}
          </span>
        </button>
      </div>
    </div>
  );
}
