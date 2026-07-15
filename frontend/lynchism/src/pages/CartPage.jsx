import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL;
export default function CartPage({removeItem}){
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  
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
    setCartItems(prev => prev.filter(item => item.id !== id));
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
    removeItem()
  }

  useEffect(() => {
    const fetchCart = async ()=>{
      const token = localStorage.getItem("access_token");
      if(!token) return navigate("/login")
      setLoading(true);
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
            setLoading(false);
            return navigate("/login");
          }
        }
        return;
      }
      const data = await response.json();
      setCartItems(data);
      setLoading(false);
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
            {loading ? (
              // ПОКА ИДЕТ ЗАГРУЗКА: Рисуем красивые скелетоны для корзины
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className='flex text-white my-2 border border-zinc-950 p-3 animate-pulse'>
                  {/* Заглушка под картинку */}
                  <div className='w-[150px] aspect-[4/3] bg-zinc-900 mr-4 rounded-sm'></div>
                  
                  {/* Заглушка под текст и управление */}
                  <div className='flex flex-col justify-between w-full py-1'>
                    <div className='flex justify-between w-full'>
                      <div className='flex flex-col gap-2 w-2/3'>
                        <div className='h-2 bg-zinc-900 w-1/3 rounded-sm'></div>
                        <div className='h-4 bg-zinc-800 w-3/4 rounded-sm'></div>
                        <div className='h-3 bg-zinc-900 w-1/4 rounded-sm'></div>
                      </div>
                      <div className='h-4 bg-zinc-800 w-16 rounded-sm'></div>
                    </div>
                    
                    <div className='flex justify-between items-center mt-4'>
                      {/* Заглушка под кнопки количества - + */}
                      <div className='h-9 w-24 bg-zinc-900 rounded-sm border border-zinc-800/50'></div>
                      {/* Заглушка под кнопку Remove */}
                      <div className='h-3 w-12 bg-zinc-900 rounded-sm'></div>
                    </div>
                  </div>
                </div>
              ))
            ) : cartItems.length > 0 ? (
              // КОГДА ЗАГРУЗИЛОСЬ: Твой стандартный рабочий код товаров в корзине
              cartItems.map((item) => (
                <div key={item.id} className='flex text-white my-2 border border-zinc-900 p-3 hover:border-zinc-600 transition-all duration-300'>
                  <div className="shrink-0 mr-4">
                    <img src={item.imageURL} className='w-[120px] lg:w-[150px] object-cover rounded-sm' alt={item.productName} />
                  </div>
                  <div className='flex flex-col justify-between w-full'>
                    <div className='flex justify-between w-full gap-4'>
                      <div className='flex flex-col'>
                        <span className='text-[8px] lg:text-[10px] tracking-[0.25em] text-zinc-500 mt-1'>product id: {item.productId}</span>
                        <span className='text-[16px] lg:text-[20px] tracking-[0.05em] uppercase text-white font-light'>{item?.productName}</span>
                        <span className='uppercase text-[11px] lg:text-[13px] font-medium text-zinc-400 mt-1'>Size: {item.size}</span>
                      </div>
                      <div className="shrink-0">
                        <span className='text-white text-[16px] lg:text-[20px] font-mono'>{formatter.format(item.price)}</span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between gap-6 mt-4'>
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
                        className='text-zinc-600 hover:text-red-800 text-[10px] uppercase tracking-[0.2em] transition-all duration-50 underline underline-offset-8 decoration-zinc-800 hover:decoration-red-800'
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // ЕСЛИ КОРЗИНА ПУСТАЯ: Красивая заглушка в стиле Линча
              <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed border-zinc-900 rounded-sm">
                <span className="text-zinc-600 text-[11px] uppercase tracking-[0.25em] mb-4">Your cart is currently empty</span>
                <button onClick={() => navigate("/")} className="text-white hover:text-zinc-400 text-[11px] uppercase tracking-[0.2em] underline underline-offset-4 decoration-zinc-800 transition-colors">
                  Return to catalog
                </button>
              </div>
            )}
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