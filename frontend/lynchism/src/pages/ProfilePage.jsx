import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL

export default function ProfilePage() {
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return navigate('/login');

      const response = await fetch(`${API_URL}/Client/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();

          if (isRefreshed) {
            return fetchMe();
          }

          return navigate('/login');
        }

        const errorText = await response.text();
        console.error('Server Message:', errorText);
        return;
      }

      const data = await response.json();
      setUser(data);
    };

    const fetchOrders = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return navigate('/login');

      const response = await fetch(`${API_URL}/Order/getOrders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();

          if (isRefreshed) {
            return fetchOrders();
          }

          return navigate('/login');
        }

        const errorText = await response.text();
        console.error('Server Message:', errorText);
        return;
      }

      const data = await response.json();
      setOrders(data);
    };

    fetchMe();
    fetchOrders();
  }, [navigate]);

  const logOut = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/');
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-mono p-8 flex flex-col items-center">
      <div className="w-full flex flex-col items-center pt-2 pb-12 bg-black">
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center border border-zinc-700">
          <img
            src="https://i.ibb.co/Gf07hyRL/photo-2026-03-31-20-27-30-1.jpg"
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mt-5 text-center">
          <h1 className="font-black tracking-[0.2em] text-white text-5xl uppercase mb-4">
            HI, {user.name}
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono uppercase tracking-[0.4em] text-zinc-500 text-[11px]">
              email: <span className="text-zinc-300">{user.email}</span>
            </p>
            <p className="font-mono uppercase tracking-[0.4em] text-zinc-700 text-[9px]">
              role: {user.role}
            </p>
          </div>
        </div>
        <div className="flex mt-10">
          <button
            onClick={() => logOut()}
            className="px-4 py-2 hover:bg-white hover:text-black transition-all duration-300 border-b border-zinc-900 text-left"
          >
            Log out
          </button>
          {user?.role === 'Admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-2 hover:bg-white hover:text-black transition-all duration-300 border-b border-zinc-900 text-left"
            >
              Admin Panel
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <h2 className="text-xs tracking-[0.5em] text-zinc-500 uppercase mb-6 border-b border-zinc-900 pb-2">
          Your orders
        </h2>

        <div className="flex flex-col gap-4">
          {orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id}
                className="border border-zinc-900 p-6 flex justify-between items-center hover:bg-[#111] transition-all"
              >
                <div>
                  <span className=" font-bold block mb-1">
                    #{order.id.toString().padStart(6, '0')}
                  </span>
                  <span className="text-[10px] text-zinc-600 uppercase">{order.date}</span>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold tracking-tighter">
                    {formatter.format(order.totalSum)}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-400 uppercase tracking-tighter">
                    {order.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-zinc-800 uppercase tracking-[0.3em] text-center mt-10">
              You dont have orders yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}