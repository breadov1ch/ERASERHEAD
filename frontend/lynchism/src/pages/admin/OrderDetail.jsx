import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { refreshTokens } from '../../api';

const API_URL = process.env.REACT_APP_API_URL

export default function OrderDetail(){
  const { id } = useParams(); 
  const [order, setOrder] = useState([]);
  const [products, setProducts] = useState([]);
  
  const navigate = useNavigate();

  const formatter = new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
  });

  const fetchOrder = async () => {
    const token = localStorage.getItem("access_token");
    if(!token) return navigate("/login")
    try {
      const response = await fetch(`${API_URL}/Order/getOrderById/${id}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return fetchOrder();
          }else {
            return navigate("/login");
          }
        }
        const errorText = await response.text(); 
        console.error("Server Message:", errorText);
        return;
      }

      const data = await response.json();
      console.log(data);
      setOrder(data);
      setProducts(data.products)

      
    } catch (err) {
      console.error("Ошибка сети:", err);
    }
  }


  useEffect(() => {
    if (id) {
    fetchOrder();
  }
  },[id])

  return (
    <>
      <div className="min-h-screen bg-[#131313] text-zinc-300 font-mono p-5">
        <h1 className="text-white text-1xl font-black tracking-[0.5em] uppercase mb-10 border-b border-zinc-700 pb-4">
          VOID_CONTROL // <Link to="/admin" className="hover:text-white underline">ORDERS</Link> // ORDER#{id}
        </h1>
        <div className='w-full flex justify-center'>
          <div className='w-full max-w-6xl flex flex-col lg:flex-row gap-6'>
            <div className="w-full">
              {products.map((item) => (
                <div key={item.id} className='flex flex-col lg:flex-row text-white my-2 bg-[#181818] border border-zinc-700 p-3 hover:border-zinc-500 gap-4 shadow-md'>
                  <div className='w-full lg:w-[200px] shrink-0 bg-[#111111] border border-zinc-700/60 p-1'>
                    <img src={item.product?.imageURL} className='w-full h-auto object-cover rounded-none' alt={item.product?.name} />
                  </div>
                  <div className='flex flex-col justify-between w-full'>
                    <div className='flex justify-between w-full'>
                      <div className='flex flex-col'>
                        <span className='lg:text-[9px] tracking-[0.25em] text-zinc-400 mt-1'>PRODUCT ID: {item.productId}</span>
                        <span className='lg:text-[18px] font-bold tracking-[0.05em] uppercase text-white cursor-pointer hover:underline' onClick={() => navigate(`/product/${item.productId}`)}>{item.product?.name}</span>
                        <span className='uppercase lg:text-[13px] font-medium text-zinc-300 mt-1'>Size: {item.size}</span>
                        <p className='uppercase lg:text-[13px] font-medium text-zinc-400'>QTY: {item.quantity}</p>
                        <p className='text-zinc-200 font-mono lg:text-[15px]'>{formatter.format(item.price)}</p>
                      </div>
                      <div className='flex flex-col'>
                        <p className='text-white font-mono lg:text-[20px] text-end m-2'>{formatter.format(item.price*item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className='w-full lg:w-[360px] space-y-4'>
              <div className='p-6 bg-[#181818] border border-zinc-700 shadow-md'>
                <div className='text-zinc-300 border-b border-zinc-700/80 mb-5 pb-5'>
                  <p className='text-zinc-400 tracking-[0.2em] mb-3 text-xs font-bold uppercase'>SHIPPING_DETAILS</p>
                  <div className='pl-3 space-y-1 text-sm'>
                    <p><span className="text-zinc-500 text-xs">ПЕРЕВІЗНИК:</span> <strong className="text-amber-400">{order?.carrier || 'Нова Пошта'}</strong> ({order?.deliveryType || 'Відділення'})</p>
                    {order?.deliveryCity && <p><span className="text-zinc-500 text-xs">МІСТО:</span> {order.deliveryCity}</p>}
                    {order?.deliveryBranch && <p><span className="text-zinc-500 text-xs">ВІДДІЛЕННЯ:</span> {order.deliveryBranch}</p>}
                    <p><span className="text-zinc-500 text-xs">АДРЕСА:</span> {order?.streetAddress}</p>
                    <p><span className="text-zinc-500 text-xs">КРАЇНА / ІНДЕКС:</span> {order?.country} {order?.zipCode}</p>
                  </div>
                </div>
                <div className='text-zinc-300'>
                  <p className='text-zinc-400 tracking-[0.2em] mb-3 text-xs font-bold uppercase'>CONTACT_INFO</p>
                  <div className='pl-3 space-y-1 text-sm'>
                    <p className='text-white font-black'>{order?.firstName} {order?.lastName}</p>
                    <p>{order?.phone}</p>
                    <p className='text-zinc-300 break-all'>{order?.client?.email}</p>
                  </div>
                </div>
              </div>
              <div className='bg-[#181818] border border-zinc-700 p-6 shadow-md'>
                <div className='flex justify-between text-sm'>
                  <span className="text-zinc-400">СУМА ТОВАРІВ</span>
                  <span className='text-zinc-200 font-mono'>{formatter.format(order.sum - (order.deliveryCost || 0) + (order.discountSum || 0))}</span>
                </div>
                {order?.deliveryCost > 0 && (
                  <div className='flex justify-between text-sm mt-1'>
                    <span className="text-zinc-400">ДОСТАВКА ({order.carrier})</span>
                    <span className='text-amber-400 font-mono'>+{formatter.format(order.deliveryCost)}</span>
                  </div>
                )}
                {order?.promoCode && (
                  <div className='flex justify-between text-sm mt-1 text-emerald-400'>
                    <span>ПРОМОКОД ({order.promoCode})</span>
                    <span className='font-mono'>-{formatter.format(order.discountSum || 0)}</span>
                  </div>
                )}
                <div className='flex justify-between mt-2 border-b border-zinc-700 pb-3 mb-3 text-sm'>
                  <span className='uppercase text-zinc-400'>Payment method</span>
                  <span className='text-zinc-200'>{order.paymentMethod}</span>
                </div>
                <div className='flex justify-between mt-1 items-end'>
                  <span className='uppercase text-sm font-bold'>Total</span>
                  <span className='text-white font-mono text-2xl font-black'>{formatter.format(order.sum)}</span>
                </div>
              </div>
              <div className='flex justify-center items-center uppercase text-black text-xl font-black bg-white px-8 py-3 tracking-widest'>
                <h1>{order.status}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}