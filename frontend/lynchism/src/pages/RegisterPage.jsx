import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

export default function RegisterPage(){
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const registerUser = async (e) => {
    e.preventDefault();
    setError("");
    try{
      const response = await fetch(`${API_URL}/Client/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password })
      });
      if (!response.ok) {
        const errorText = await response.text(); 
        throw new Error(errorText || "Что-то пошло не так");
      }
      const data = await response.json()
      localStorage.setItem("access_token",data.accessToken)
      localStorage.setItem("refresh_token",data.refreshToken)

    console.log({"access_token": localStorage.getItem("access_token"), "refresh_token": localStorage.getItem("refresh_token")})
      navigate("/");
    }
    catch(err){
      setError(err.message)
    }
  }

  return (
    <div className='min-h-screen flex justify-center bg-[#131313] flex '>
      <div className='hidden lg:flex w-full items-start justify-center flex-col px-[5%]'>
        <h1 className="font-display text-[7vw] xl:text-[115px] font-black uppercase text-white 
               tracking-[-0.06em] leading-[0.75] ml-[-0.05em]">
          ERASERHEAD
        </h1>
        <p className='max-w-[900px] font-mono text-[11px] text-zinc-600 uppercase tracking-[0.1em] leading-relaxed mt-3'>
          The best designer clothing store in Ukraine. <br/>
          Any item from the store is free with purchase, <br/>
          provided you can prove you killed one "ТЦК" worker.
        </p> 
      </div>
      <div className='bg-black w-full lg:w-1/2 lg:max-w-[550px] lg:mr-[5%]  10 flex flex-col items-start justify-center p-16 xl:p-20'>
        <h1 className='text-white text-2xl font-medium uppercase tracking-[0.03em]'>registration</h1>
        <p className='text-zinc-500 uppercase tracking-[0.1em] text-[10px]'>Identity Verification</p>
        <form className='flex flex-col mt-10  w-full' onSubmit={registerUser}>
          <label className="font-bold text-zinc-500 text-[9px] uppercase tracking-[0.3em] block ">
            Name
          </label>
          <input 
            required
            type="text" 
            value = {name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-zinc-300 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2"
            placeholder="Bread" 
          />
          <label className="font-bold text-zinc-500 text-[9px] uppercase tracking-[0.3em] block mt-7">
            Email Address
          </label>
          <input 
            required
            type="email" 
            value = {email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent text-zinc-300 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2"
            placeholder="user@eraserhead.com" 
          />
          <label className="font-bold text-zinc-500 text-[9px] uppercase tracking-[0.3em] block mt-7">
            password
          </label>
          <input 
            required
            type="password" 
            value = {password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent text-zinc-300 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2"
            placeholder="•••••••••••" 
          />
          {error && (
          <span className="text-red-500 text-sm mb-2 block animate-pulse">
            {error}
          </span>
)}
          <button type='submit' className="w-full bg-white text-black py-4 uppercase font-medium tracking-[0.3em] text-xs hover:bg-zinc-200 transition-colors mt-20">
            Register
          </button>
          <div className="flex justify-end items-center pt-2">
            <span onClick={() => navigate(`/login`)} className="text-white text-[9px] uppercase tracking-widest font-bold border-b border-white pb-1 cursor-pointer">
              Already have account? Login
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}