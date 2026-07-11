import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { refreshTokens } from '../../api';

const API_URL = process.env.REACT_APP_API_URL


export default function ChangeProduct(){
  const navigate = useNavigate();
  const { id } = useParams(); 
  const [productId, setProductId] = useState(0)

  const [product, setProduct] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    imageURL: ''
  });


  const fetchChangeProduct = async () => {
    const token = localStorage.getItem("access_token");
    if(!token) return navigate("/login")
    try {
      const response = await fetch(`${API_URL}/Product/change/${id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(product) 
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return fetchChangeProduct();
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
    } catch (err) {
      console.error("Ошибка сети:", err);
    }
  }

  const fetchProduct = async () => {
    const token = localStorage.getItem("access_token");
    if(!token) return navigate("/login")
    try {
      const response = await fetch(`${API_URL}/Product/${id}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return fetchProduct();
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
      setProduct(data)

      
    } catch (err) {
      console.error("Ошибка сети:", err);
    }
  }


  useEffect(() => {
    if (id) {
      setProductId(id)
      fetchProduct();
    }
  },[id])

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ 
      ...prev, 
      [name]: name === 'price' ? parseFloat(value) : value 
    }));
  };

  return (
    <>
      <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-5">
        <h1 className="text-white text-1xl font-black tracking-[0.5em] uppercase mb-10 border-b border-zinc-900 pb-4">
          VOID_CONTROL // <Link to="/admin">Products</Link> // product#{id}
        </h1>
        <div className='w-full max-h-screen'>
          <div className='border-b border-zinc-700 flex items-center h-[50px]'>
            <p className='text-zinc-200 tracking-[0.2em]'>PRODUCT_ID:</p>
            <input 
            value={productId}
            type='number'
            onChange={(e) => setProductId(e.target.value)}
            className="bg-transparent text-zinc-300 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2"/>
            <button className='' onClick={() => navigate(`/admin/change-product/${productId}`)}>Send</button>
          </div>
        </div>
        <div className='w-full max-h-screen'>
          <div className="flex flex-col gap-2">
            <label className="text-zinc-600 text-[10px] uppercase tracking-widest">Entry_Name</label>
            <input 
              name="name"
              value={product.name}
              onChange={handleChange}
              className="bg-transparent border-b border-zinc-800 text-white p-2 outline-none focus:border-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-10">
            <div className="flex flex-col gap-2">
              <label className="text-zinc-600 text-[10px] uppercase tracking-widest">Price_USD</label>
              <input 
                name="price"
                type="number"
                value={product.price}
                onChange={handleChange}
                className="bg-transparent border-b border-zinc-800 text-white p-2 outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-zinc-600 text-[10px] uppercase tracking-widest">Category_Tag</label>
              <input 
                name="category"
                value={product.category}
                onChange={handleChange}
                className="bg-transparent border-b border-zinc-800 text-white p-2 outline-none focus:border-white transition-colors"
              />
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-2">
              <label className="text-zinc-600 text-[10px] uppercase tracking-widest">Source_Image_URL</label>
              <input 
                name="imageURL"
                value={product.imageURL}
                onChange={handleChange}
                className="bg-transparent border-b border-zinc-800 text-zinc-400 p-2 text-xs outline-none focus:border-white transition-colors"
              />
              <img className="max-w-[150px]" src={product.imageURL}/>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-zinc-600 text-[10px] uppercase tracking-widest">Data_Description</label>
            <textarea 
              name="description"
              rows="4"
              value={product.description}
              className="bg-transparent border border-zinc-900 text-white p-3 text-sm outline-none focus:border-zinc-500 transition-colors resize-none"
            />
          </div>
          <button onClick={() => fetchChangeProduct()} className='bg-white text-black font-black uppercase p-2 hover:bg-zinc-500 transition-colors mt-10'>Save changes</button>
        </div>
      </div>
    </>
  )
}
