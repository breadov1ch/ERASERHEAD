import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL;
export default function CartPage({removeItem}){
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([])

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });


  const handleChangeCount = async (id, num) =>{
    const token = localStorage.getItem("access_token");
      if(!token) return navigate("/login")
      const response = await fetch(`${API_URL}/Cart/change-quantity?id=${id}&quantity=${num}`, {
        method: "PUT", 
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: num } : item));
        return true;
      }
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return handleChangeCount(id, num);
          }else {
            return navigate("/login");
            
          }
        }
        console.error(response.text())
      }
      return false;
      
  }

  const handleRemove = async (id) =>{
    const token = localStorage.getItem("access_token");
      if(!token) return navigate("/login")
      
      const response = await fetch(`${API_URL}/Cart/${id}`, {
        method: "DELETE", 
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return handleRemove(id);
          }else {
            return navigate("/login");
          }
        }
        return;
      }
      setCartItems(prevItems => prevItems.filter(item => item.id !== id));
      removeItem()
  }

  useEffect(() => {
    const fetchCart = async ()=>{
      const token = localStorage.getItem("access_token");
      if(!token) return navigate("/login")
      
      const response = await fetch(`${API_URL}/Cart/get-cart`, {
        method: "GET", 
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return fetchCart();
          }else {
            return navigate("/login");
          }
        }
        return;
      }
      const data = await response.json();
      setCartItems(data);
    }
    fetchCart();
  },[navigate])

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  const tax = subtotal * 0.08; 
  const total = subtotal + tax;
  return(
    <>
      <div className='bg-[#0f0f0f] min-h-screen p-10'>
        <div className=''>
          <div className="flex flex-col">
            <h1 className="text-white text-[50px] font-light tracking-tighter leading-none uppercase">
              Shopping Cart
            </h1>
            <p className="text-zinc-600 text-[13px] uppercase tracking-[0.3em] mt-2 ml-1 leading-relaxed">
              Your selection of curated silhouettes
            </p>
          </div>
        </div>
        <div className='lg:flex gap-5 w-full lg:px-20 mt-5'>
          <div className='text-black p-5 flex-grow min-h-[400px]'>
            {cartItems.map((item) => (
              <div className='flex text-white my-2 border border-zinc-900 p-3 hover:border-zinc-600'>
                <div>
                  <img src={item.imageURL} className='w-[400px] '></img>
                </div>
                <div className='flex flex-col justify-between w-full'>
                  <div className='flex justify-between w-full'>
                    <div className='flex flex-col'>
                      <span className='lg:text-[7px] tracking-[0.25em] text-zinc-500 mt-1'>product id: {item.productId}</span>
                      <span className='lg:text-[20px] tracking-[0.05em] uppercase text-white' >{item?.productName}</span>
                      <span className='uppercase lg:text-[13px] font-medium text-zinc-400 mt-1'>Size: {item.size}</span>
                    </div>
                    <div>
                      <span className='text-white lg:text-[20px] m-2'>{formatter.format(item. price)}</span>
                    </div>
                  </div>
                  <div className='flex items-center justify-between gap-6 mt-auto'>
                    <div className='flex items-center bg-black border border-zinc-800 h-9 w-min'>
                      <button onClick={() => {
                        if(item.quantity > 1) handleChangeCount(item.id, item.quantity-1) 
                      }} className='flex items-center justify-center w-9 h-full hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white border-r border-zinc-800'>
                        <span className="mb-0.5">-</span>
                      </button>
                      <span className='text-white text-[13px] px-4 font-light min-w-[40px] text-center'>
                        {item.quantity}
                      </span>
                      <button onClick={async () => {
                          const result = await handleChangeCount(item.id, item.quantity + 1);
                          if (!result) {
                            console.log("Недостаточно товара");
                          }
                        }} className='flex items-center justify-center w-9 h-full hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white border-l border-zinc-800'>
                        <span className="mb-0.5">+</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className='lg:ml-6 text-zinc-600 hover:text-red-800 text-[10px] uppercase tracking-[0.2em] transition-all duration-50 underline underline-offset-8 decoration-zinc-800 hover:decoration-red-800'
                    >
                      Remove
                    </button>
                  </div>
                  
                </div>
                
              </div>
            ))}
          </div>

          <div className='bg-[#141414] text-zinc-200 mt-7 ml-10 p-10 lg:w-[450px] h-[600px] border border-zinc-900 flex flex-col justify-between sticky top-10'>
            <div>
              <h2 className="uppercase text-[22px] tracking-[0.1em] font-medium mb-12">Order summary</h2>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="uppercase text-[11px] tracking-[0.15em] text-zinc-500 font-medium">Subtotal</span>
                  <span className="text-[16px] font-medium">{formatter.format(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="uppercase text-[11px] tracking-[0.15em] text-zinc-500 font-medium">Shipping</span>
                  <span className="text-[16px] font-medium">{formatter.format(shipping)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="uppercase text-[11px] tracking-[0.15em] text-zinc-500 font-medium">Tax (est.)</span>
                  <span className="text-[16px] font-medium">{formatter.format(tax)}</span>
                </div>

                <div className="border-t border-zinc-800 my-10 pt-10 flex justify-between items-baseline">
                  <span className="uppercase text-[14px] tracking-[0.2em] font-bold">Total</span>
                  <span className="text-[32px] font-bold tracking-tight">{formatter.format(total)}</span>
                </div>
              </div>
            </div>

            <div className="w-full">
              <button onClick={() => navigate("/checkout")} className="w-full bg-white text-black py-6 uppercase text-[12px] tracking-[0.3em] font-bold hover:bg-zinc-200 transition-all">
                Proceed to Checkout
              </button>
              
              <p className="text-center text-zinc-600 text-[9px] uppercase tracking-widest mt-6 leading-relaxed">
                Complimentary shipping on all seasonal drops.<br/>
                Taxes calculated at the final step.
              </p>

              <div className="flex justify-center gap-3 mt-10 h-[15px] ">
                <img src="https://deluxe.com.ua/media/img/design/icon-product-visa.png"/>
                <img src="https://deluxe.com.ua/media/img/design/icon-product-mastercard.png"/>
                <img src="https://deluxe.com.ua/media/img/design/icon-product-privat.png"/>
                <img src="https://deluxe.com.ua/media/img/design/icon-product-google.png"/>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </>
  )
}