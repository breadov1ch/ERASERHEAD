import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { refreshTokens } from '../../api';

const API_URL = process.env.REACT_APP_API_URL

export default function OrderDetail(){
  const { id } = useParams(); 
  const [order, setOrder] = useState([]);
  const [products, setProducts] = useState([]);
  
  const navigate = useNavigate();

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
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
      <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-5">
        <h1 className="text-white text-1xl font-black tracking-[0.5em] uppercase mb-10 border-b border-zinc-900 pb-4">
          VOID_CONTROL // <Link to="/admin">ORDERS</Link> // ORDER#{id}
        </h1>
        <div className='w-full flex justify-center '>
          <div className='w-1/2 min-h-screen flex'>
            <div className="w-full">
              {products.map((item) => (
                <div key={item.id} className='flex text-white my-2 border border-zinc-900 p-3 hover:border-zinc-600'>
                  <div>
                    <img src={item.product?.imageURL} className='w-[200px] '></img>
                  </div>
                  <div className='flex flex-col justify-between w-full'>
                    <div className='flex justify-between w-full'>
                      <div className='flex flex-col'>
                        <span className='lg:text-[7px] tracking-[0.25em] text-zinc-500 mt-1'>product id: {item.productId}</span>
                        <span className='lg:text-[20px] tracking-[0.05em] uppercase text-white cursor-pointer' onClick={() => navigate(`/product/${item.productId}`)}>{item.product?.name}</span>
                        <span className='uppercase lg:text-[13px] font-medium text-zinc-400 mt-1'>Size: {item.size}</span>
                        <p className='uppercase lg:text-[13px] font-medium text-zinc-400'>QTY: {item.quantity}</p>
                        <p className='text-white lg:text-[15px]'>{formatter.format(item.price)}</p>
                      </div>
                      <div className='felx flex-col'>
                        <p className='text-white lg:text-[20px] text-end m-2'>{formatter.format(item.price*item.quantity)}</p>
                      </div>
                    </div>
                    
                  </div>
                  
                </div>
              ))}
            </div>
            <div className='sticky top-20'>
              <div className='p-6 border border-zinc-900 mt-2 mx-2 h-min py-10 '>
                <div className='text-zinc-300 border-b border-zinc-900 mb-5 pb-5'>
                  <p className='text-zinc-500 tracking-[0.2em] mb-3'>SHIPPING_ADDRESS</p>
                  <div className='pl-3'>
                    <p>{order?.country}</p>
                    <p>{order?.streetAddress}</p>
                    <p>{order?.zipCode}</p>
                  </div>
                </div>
                <div className='text-zinc-300'>
                  <p className='text-zinc-500 tracking-[0.2em] mb-3'>CONTACT_INFO</p>
                  <div className='pl-3'>
                    <p className='text-white font-black'>{order?.firstName} {order?.lastName}</p>
                    <p>{order?.phone}</p>
                    <p>{order?.client?.email}</p>
                  </div>
                </div>
              </div>
              <div className=' bg-[#1b1b1b] mx-2 py-6 px-5 w-[300px]'>
                <div className='flex justify-between'>
                  <span>SUBTOTAL</span>
                  <span className='text-zinc-300'>{formatter.format(order.sum)}</span>
                </div>
                <div className='flex justify-between mt-1 border-b border-zinc-600 pb-2 mb-2'>
                  <span className='uppercase'>Payment method</span>
                  <span className='text-zinc-300'>{order.paymentMethod}</span>
                </div>
                <div className='flex justify-between mt-1 items-end'>
                  <span className='uppercase'>Total</span>
                  <span className='text-zinc-300 text-2xl'>{formatter.format(order.sum)}</span>
                </div>
              </div>
              <div className='flex justify-center items-center uppercase text-black text-2xl font-black bg-white px-10 py-3 mx-2 '>
                <h1>{order.status}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}