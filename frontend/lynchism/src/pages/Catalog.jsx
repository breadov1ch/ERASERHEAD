import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Slider from '@mui/material/Slider';
import Box from '@mui/material/Box';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL;

const valuetext = (value) => `${value}°C`;

export default function Catalog(){
  const [value, setValue] = useState([0, 10000]);
  const [size, setSize] = useState("")
  const [category, setCategory] = useState("")
  const [minOfMax, setMinOfMax] = useState(0)

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  
  const dispatch = useDispatch();
  const { products, loading } = useSelector(state => state.products);
  const navigate = useNavigate();

  useEffect(() => {
    const getProducts = async () => {
      dispatch({ type: "FETCH_PRODUCTS_LOADING" });
      try {
        let response = await fetch(`${API_URL}/Product/GetProducts`);
        if (!response.ok && response.status === 401) {
          console.warn("SYSTEM_SYNC // 401_UNAUTHORIZED // ATTEMPTING_REFRESH");
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            response = await fetch(`${API_URL}/Product/GetProducts`);
          } else {
            localStorage.clear();
            navigate("/login");
            return;
          }
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "SYSTEM_SYNC_ERROR");
        }

        const data = await response.json();
        dispatch({ type: "SET_PRODUCTS", payload: data });

      } catch (err) {
        console.error("SYSTEM_FAILURE // FETCH_PRODUCTS_FAILED:", err);
      }
    };

    if (products.length === 0) {
      getProducts();
    }
  }, [dispatch, products.length, navigate]);

  const filteredProducts = products.filter((product) => {
    const isPriceOk = product.price >= value[0] && product.price <= value[1];
    const isCategoryOk = category === "" || product.category === category || category === "All";
    const isSizeOk = size === "" || product.sizes.some(s => s.size === size && s.quantity > 0) || size === "All";
    return isPriceOk && isCategoryOk && isSizeOk;
  });
  
  const sortedProducts = [...filteredProducts].sort((a, b) => minOfMax === 1 ? a.price - b.price : b.price - a.price);

  return (
    <>
      <div className='bg-[#0f0f0f] min-h-screen p-4 sm:p-10'>
        <div>
          <div className="flex flex-col">
            <h1 className="text-white text-[12vw] sm:text-[80px] font-light tracking-tighter leading-none">
              CATALOG
            </h1>
            <p className="text-zinc-600 text-[11px] sm:text-[13px] uppercase tracking-[0.3em] mt-2 ml-1 max-w-[390px] leading-relaxed">
              “Never let anyone put their long fingers into your plans.” — D. Lynch
            </p>
          </div>
          <div className="border-t border-white/10 w-full mt-5"></div>
          
          {/* Адаптивная панель фильтров */}
          <div className='grid grid-cols-2 md:flex md:flex-row md:items-center bg-black py-4 px-2 md:px-0 gap-6 md:gap-x-[60px]'>
            
            {/* Размер */}
            <div className='flex flex-col text-white'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[9px] sm:text-[11px] mb-1'>Availability size</span>
              <select 
                className='bg-black text-white outline-none uppercase font-bold text-[13px] sm:text-[15px] tracking-wide cursor-pointer'
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="All">ALL</option>
                <option value="M">M</option>
                <option value="S">S</option>
                <option value="L">L</option>
              </select>
            </div>

            {/* Категория */}
            <div className='flex flex-col text-white'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[9px] sm:text-[11px] mb-1'>Category</span>
              <select 
                className='bg-black text-white outline-none font-bold text-[13px] sm:text-[15px] tracking-wide cursor-pointer w-[120px] sm:w-[150px]' 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="All">ALL</option>
                <option value="Tops">Tops</option>
                <option value="Pants">Pants</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            {/* Сортировка по цене */}
            <div className='flex flex-col text-white col-span-2 md:col-span-1'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[9px] sm:text-[11px] mb-1'>Sort By Price</span>
              <button 
                className='bg-black text-white text-left md:text-center outline-none font-bold text-[13px] sm:text-[15px] tracking-wide cursor-pointer hover:text-zinc-400 transition-all duration-100' 
                onClick={() => setMinOfMax(prev => (prev === 0 ? 1 : 0))}
              >
                {minOfMax === 0 ? "Price: High-Low" : "Price: Low-High"}
              </button>
            </div>

            {/* Ползунок цены */}
            <div className='flex flex-col text-white col-span-2 md:col-span-1 md:ml-auto w-full max-w-[280px] md:max-w-[200px]'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[9px] sm:text-[11px] mb-1'>Price range: <b>[{value[0]}$-{value[1]}$]</b></span>
              <Box className="w-full">
                <Slider
                  getAriaLabel={() => 'Temperature range'}
                  value={value}
                  onChange={handleChange}
                  valueLabelDisplay="auto"
                  getAriaValueText={valuetext}
                  min={0}
                  max={10000} 
                  step={100}
                />
              </Box>
            </div>
            
          </div>
          <div className="border-t border-white/10 w-full mb-5"></div>
        </div>
        
        {/* Адаптивная сетка товаров: 2 колонки на мобилках, 4 на десктопе */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 items-stretch">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="border bg-black border-white/5 p-2 sm:p-4 animate-pulse">
                <div className="aspect-[3/4] bg-zinc-900 w-full mb-4"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
                  <div className="h-3 bg-zinc-800 w-2/3 rounded-sm"></div>
                  <div className="h-3 bg-zinc-800 w-12 rounded-sm"></div>
                </div>
                <div className="h-2.5 bg-zinc-900 w-1/3 rounded-sm mb-4"></div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <div className="h-2 w-10 bg-zinc-900 rounded-sm"></div>
                  <div className="h-2 w-4 bg-zinc-800 rounded-sm"></div>
                </div>
              </div>
            ))
          ) : (
            sortedProducts.map(product => (
              <div 
                onClick={() => navigate(`/product/${product.id}`)} 
                key={product.id} 
                className="animate-fade-in group border bg-black border-white/5 p-2 sm:p-4 hover:border-white/25 transition-all duration-500 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="overflow-hidden aspect-[3/4] flex items-center justify-center mb-2 sm:mb-4">
                    <img 
                      className='w-full bg-[#0d0d0d] group-hover:scale-105 transition-all duration-700 object-contain max-h-full' 
                      src={product.imageURL} 
                      alt={product.name}
                      loading="lazy" 
                      decoding="async" 
                    />                
                  </div>
                  <div className='flex flex-col sm:flex-row text-white justify-between sm:items-baseline gap-1'>
                    <h2 className='uppercase tracking-[0.1em] sm:tracking-[0.2em] font-light text-[11px] sm:text-sm leading-tight truncate'>{product.name}</h2>
                    <span className='font-mono text-xs sm:text-sm'>${product.price}</span>
                  </div>
                  <span className='text-[8px] sm:text-[10px] text-zinc-600 uppercase tracking-widest block mt-0.5'>{product.category}</span>
                </div>

                <div className='mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex flex-wrap gap-1 sm:gap-2'>
                  <span className='text-[8px] sm:text-[9px] text-zinc-700 uppercase tracking-tighter'>Available:</span>
                  {product.sizes && product.sizes.length > 0 ? (
                    product.sizes
                      .filter(s => s.quantity > 0)
                      .map(s => (
                        <span key={s.id} className='text-[8px] sm:text-[9px] text-zinc-400 uppercase font-bold px-0.5 sm:px-1'>
                          {s.size}
                        </span>
                      ))
                  ) : (
                    <span className='text-[8px] sm:text-[9px] text-red-900 uppercase'>Sold Out</span>
                  )}
                  {product.sizes && product.sizes.filter(s => s.quantity > 0).length === 0 && (
                    <span className='text-[8px] sm:text-[9px] text-red-900 uppercase'>Sold Out</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}