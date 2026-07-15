import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL

export default function ProductPage({ updateCart }){
  const { id } = useParams();
  const [product, setProduct] = useState()
  const [selectedSize,setSelectedSize] = useState("")
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/Product/${id}`)
    .then(res => res.json())
    .then(data => {
      setProduct(data)
      console.log(data)
  })
    .catch(err => console.error("Error when receiving product:", err))
  },[id])
  const addToCart = async (e) => {
    e.preventDefault()
    setShowModal(true);
    try{
      var token = localStorage.getItem("access_token")
      if(token == null) navigate("/login")
      const response = await fetch(`${API_URL}/Cart/add-to-cart`,{
        method:"POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        body: JSON.stringify({ 
          productId: id,         
          quantity: 1,             
          size: selectedSize       
      })
      })
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return addToCart(e);
          } else {
            localStorage.clear();
            navigate("/login");
            return;
          }
        }
        const errorText = await response.text(); 
        throw new Error(errorText || "Что-то пошло не так");
      }
      else{
        console.log(product)
        updateCart();
        
        updateCart();
      }
    }
    catch(err){
      console.error("error while add-to-cart")
    }
    
  }
  return (
    <>
    <div className='min-h-screen flex justify-center bg-[#0d0d0d]'>
      <div className='grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-10 lg:gap-10 w-full max
      -w-[1600px] bg-[#0f0f0f] p-10' >
        <div>
          <img src = {product?.imageURL} alt={product?.name} className='w-full h-auto max-h-[85vh] object-contain sticky top-24 bg-[#0a0a0a]'/>
        </div>
        <div className='flex text-white flex-col mt-10'>
          <span className='lg:text-[62px] font-bold uppercase text-white tracking-tighter leading-[0.9]'>{product?.name}</span>
          <span className='font-mono text-zinc-300 text-base md:text-xl tracking-tight mt-3 lg:text-[20px]'>${product?.price}.00</span>
          <span className='text-zinc-400 text-[12px] max-w-[280px] md:mt-1 lg:mt-10'>{product?.description}</span>
          <div className='flex mt-8 lg:max-w-[290px] border-b border-white/10 pb-1 w-full justify-between'>
            <span className='font-medium text-zinc-500 text-[10px] tracking-[0.1em] uppercase'>SILHOUETTE</span>
            <span className='font-bold text-white text-[10px] tracking-[0.1em] uppercase'>OVERSIZED</span>
          </div>
          <div className='flex lg:max-w-[290px] border-b border-white/10 my-3 pb-1 w-full justify-between'>
            <span className='font-medium text-zinc-500 text-[10px] tracking-[0.1em] uppercase'>FABRIC</span>
            <span className='font-bold text-white text-[10px] tracking-[0.1em] uppercase'>100% COTTON</span>
          </div>
          <div className='flex lg:w-full mt-5 pb-1 w-full justify-between  lg:mt-20'>
            <span className='font-bold text-white text-[10px] tracking-[0.1em] uppercase'>SELECT SIZE</span>
            <span className='font-medium text-zinc-500 text-[10px] tracking-[0.1em] uppercase border-b border-white/50'>SIZE GUIDE</span>
          </div>
          <div className='grid grid-cols-5 border border-white/10'>
            {["S","M","L","XL","XXL"].map((sizeNumber) => (
              
              <button key={sizeNumber} 
                disabled={!product?.sizes?.some(s => s.size === sizeNumber && s.quantity > 0)}              
                className={`p-3 border transition-all aspect-square text-[12px] uppercase relative
                  ${!product?.sizes?.some(s => s.size === sizeNumber && s.quantity > 0) 
                    ? 'opacity-50 cursor-not-allowed text-red-900 border-white/5' 
                    : selectedSize === sizeNumber 
                      ? 'border-white border-2 text-white bg-white/10 z-10' 
                      : 'border-white/10 text-zinc-500 hover:bg-white/5'
                  }`}
                onClick={() => setSelectedSize(sizeNumber)}
              >
                {sizeNumber}
              </button>
            ))}
          </div>
          <button
            onClick={(e) => addToCart(e)}
            className='bg-white text-black py-5 mt-7 hover:bg-zinc-200 transition-colors active:scale-95 active:bg-green-800'>
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">
              Add to cart
            </span>
          </button>
        </div>
      </div>
    </div>
    {showModal && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] font-mono">
        <div className="bg-[#0a0a0a] border border-zinc-800 p-6 w-[320px] text-center">
          <p className="text-white uppercase tracking-[0.2em] mb-6 text-[13px]">
            Item added to cart
          </p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => navigate('/cart')}
              className="bg-white text-black py-2 uppercase font-black text-[11px] hover:bg-zinc-200"
            >
              Go to Cart
            </button>
            <button 
              onClick={() => setShowModal(false)}
              className="border border-zinc-800 text-zinc-500 py-2 uppercase text-[11px] hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}