import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../../api';

const API_URL = process.env.REACT_APP_API_URL

export default function AdminPanel() {
  const [orders, setOrders] = useState([]);
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      fetchOrders();
    }
  }, [page, pageSize, token, navigate]);



  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/Order/getAllOrders?page=${page}&pageSize=${pageSize}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.items);
        setTotalPages(data.totalPages);
        console.log("Данные получены:", data.items);
      }else{
        if (res.status === 401) {
          const isRefreshed = await refreshTokens();
          
          if (isRefreshed) {
            return fetchOrders();
          }else {
            return navigate("/login");
          }
        }
      }
    } catch (err) {
      console.error("Ошибка сети:", err);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    await fetch(`${API_URL}/Admin/update-status?id=${orderId}&status=${newStatus}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    });
    fetchOrders(); 
  };

  

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono p-5 ">
      <h1 className="text-white text-1xl font-black tracking-[0.5em] uppercase mb-10 border-b border-zinc-900 pb-4">
        VOID_CONTROL // ORDERS
      </h1>

      <div className='w-full flex items-center justify-center'>
        <div className="w-1/2 border border-zinc-900 overflow-hidden ">
          <div className="flex justify-between items-center border-t border-zinc-900 p-4 text-[9px] text-zinc-500">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="hover:text-white uppercase tracking-widest">Prev</button>
              <span className='text-zinc-300 font-mono text-sm'>
                <input 
                className='w-[50px] bg-transparent  outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2' 
                value={page} 
                onChange={(e) => setPage(parseInt(e.target.value))} /> / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="hover:text-white uppercase tracking-widest">Next</button>
          </div>
          <table className="w-full text-left text-[11px] uppercase tracking-tighter">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-500 text-[14px] tracking-widest">
                <th className="p-4">ID</th>
                <th className="p-4">Client</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-white divide-y divide-zinc-900 text-[15px]">
              {orders.map((order) => (
                <tr onClick={() => navigate(`/admin/order/${order.id}`)} key={order.id} className=' hover:bg-zinc-900 cursor-pointer transition-all'>
                  <td className="p-4 text-zinc-500">#{order.id}</td>
                  <td className="p-4">{new Date(order.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    {order.items.map(item => (
                      <div key={`${order.id}-${item.productId}-${item.size}`} className="text-[10px]">
                        {item.productName} x{item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="p-4 font-bold">{order.totalSum} USD</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 ${
                      order.status === 'Completed' ? 'bg-white text-black' : 'border border-zinc-700 text-zinc-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
        </div>
      </div>
    </div>
      
  );
};