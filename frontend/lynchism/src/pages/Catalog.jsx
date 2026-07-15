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

  // useEffect(() => {

  // },[value,size,category]);
  
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
        console.log(data);
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
      <div className='bg-[#0f0f0f] min-h-screen p-10 '>
          <div className=''>
            <div className="flex flex-col">
            <h1 className="text-white text-[80px] font-light tracking-tighter leading-none">
              CATALOG
            </h1>
            <p className="text-zinc-600 text-[13px] uppercase tracking-[0.3em] mt-2 ml-1 max-w-[390px] leading-relaxed">
              “Never let anyone put their long fingers into your plans.” — D. Lynch
            </p>
          </div>
          <div className="border-t border-white/10 w-full mt-5"></div>
          <div className='flex justify-start items-center bg-black py-3 flex-nowrap'>
              <div className='flex flex-col text-white mr-[60px]'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>Availability size</span>
              <select className='bg-black text-white outline-none uppercase font-bold text-[15px] tracking-wide cursor-pointer '
                onChange={(e) => setSize(e.target.value)}>
                <option value="All">ALL</option>
                <option value="M">M</option>
                <option value="S">S</option>
                <option value="L">L</option>
              </select>
            </div>
            <div className='flex flex-col text-white mr-[60px]'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>Category</span>
              <select className='bg-black text-white outline-none font-bold text-[15px] tracking-wide cursor-pointer w-[150px]' 
                onChange={(e) => setCategory(e.target.value)}>
                <option value="All">ALL</option>
                <option value="Tops">Tops</option>
                <option value="Pants">Pants</option>
                <option value="Outerwear">Outerwear</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div className='flex flex-col text-white mr-20'>
              <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>Expensive</span>
              <button className='bg-black text-white outline-none font-bold text-[15px] tracking-wide cursor-pointer hover:text-zinc-400 transition-all duration-100' 
                onClick={() => setMinOfMax(prev => (prev === 0 ? 1 : 0))}>
                {minOfMax === 0 ? "Price: High-Low" : "Price: Low-High"}
              </button>
            </div>
            <div className='flex flex-col text-white min-w-[200px] ml-auto'>
              <div className='flex flex-col text-white mr-20'>
                <span className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>Price range: <b>[{value[0]}$-{value[1]}$]</b></span>
                <Box sx={{ width: 200}}>
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
            
            
            
          </div>
          <div className="border-t border-white/10 w-full mb-5"></div>
        </div>
        
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          {loading ? (
            // ПОКА ГРУЗИТСЯ: Выводим 8 аккуратных скелетонов под стиль твоего сайта
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="border bg-black border-white/5 p-4 animate-pulse">
                {/* Заглушка под картинку */}
                <div className="aspect-[3/4] bg-zinc-900 w-full mb-4"></div>
                {/* Заглушка под название и цену */}
                <div className="flex justify-between items-center mb-2">
                  <div className="h-3 bg-zinc-800 w-2/3 rounded-sm"></div>
                  <div className="h-3 bg-zinc-800 w-12 rounded-sm"></div>
                </div>
                {/* Заглушка под категорию */}
                <div className="h-2.5 bg-zinc-900 w-1/3 rounded-sm mb-4"></div>
                {/* Заглушка под размеры */}
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <div className="h-2 w-10 bg-zinc-900 rounded-sm"></div>
                  <div className="h-2 w-4 bg-zinc-800 rounded-sm"></div>
                  <div className="h-2 w-4 bg-zinc-800 rounded-sm"></div>
                </div>
              </div>
            ))
          ) : (
            // КОГДА ЗАГРУЗИЛОСЬ: Твой оригинальный рабочий код вывода товаров
            sortedProducts.map(product => (
              <div onClick={() => navigate(`/product/${product.id}`)} key={product.id} className="animate-fade-in group border bg-black border-white/5 p-4 hover:border-white/25 transition-all duration-500 cursor-pointer">
                <div className="overflow-hidden aspect-[3/4] flex items-center justify-center">
                  <img 
                    className='w-full bg-[#0d0d0d] group-hover:scale-105 transition-all duration-700 object-contain' 
                    src={product.imageURL} 
                    alt={product.name}
                    loading="lazy" 
                    decoding="async" 
                  />                
                </div>
                <div className='flex text-white justify-between'>
                  <h2 className='uppercase tracking-[0.2em] font-light'>{product.name}</h2>
                  <span className='font-mono text-sm'>${product.price}</span>
                </div>
                <span className='text-[10px] text-zinc-600 uppercase mt-1 tracking-widest'>{product.category}</span>
                <div className='mt-4 pt-4 border-t border-white/10 flex gap-2'>
                  <span className='text-[9px] text-zinc-700 uppercase tracking-tighter'>Available:</span>
                  {product.sizes && product.sizes.length > 0 ? (
                      product.sizes
                        .filter(s => s.quantity > 0)
                        .map(s => (
                          <span key={s.id} className='text-[9px] text-zinc-400 uppercase font-bold px-1'>
                            {s.size}
                          </span>
                        ))
                      ) : (
                        <span className='text-[9px] text-red-900 uppercase'>Sold Out</span>
                      )}
                    {product.sizes && product.sizes.filter(s => s.quantity > 0).length === 0 && (
                      <span className='text-[9px] text-red-900 uppercase'>Sold Out</span>
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