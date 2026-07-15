import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingGif1 from '../assets/loading.gif';
const API_URL = process.env.REACT_APP_API_URL;

export default function LoginPage(){
  const loadingGif2 = 'https://usagif.com/wp-content/uploads/loading-44.gif';
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loginUser = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try{
      const response = await fetch(`${API_URL}/Client/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        if (response.status === 401){
          throw new Error("Password or Email is incorrect");
        }
        const errorText = await response.text(); 
        throw new Error(errorText || "Что-то пошло не так");
      }
      const data = await response.json()
      localStorage.setItem("access_token",data.accessToken)
      localStorage.setItem("refresh_token",data.refreshToken)

      console.log({"access_token": localStorage.getItem("access_token"), "refresh_token": localStorage.getItem("refresh_token")})
      navigate("/");
      setIsSubmitting(false);
    }
    catch(err){
      setError(err.message)
      setIsSubmitting(false);
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
        <h1 className='text-white text-2xl font-medium uppercase tracking-[0.03em]'>authentication</h1>
        <p className='text-zinc-500 uppercase tracking-[0.1em] text-[10px]'>Identity Verification</p>
        <form className='flex flex-col mt-10  w-full' onSubmit={loginUser}>
          <label className="font-bold text-zinc-500 text-[9px] uppercase tracking-[0.3em] block mt-7">
            Email Address
          </label>
          <input 
            type="text" 
            value = {email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent text-zinc-300 font-mono text-sm outline-none placeholder:text-zinc-700 border-b border-zinc-700 p-2"
            placeholder="user@eraserhead.com" 
          />
          <label className="font-bold text-zinc-500 text-[9px] uppercase tracking-[0.3em] block mt-7">
            password
          </label>
          <input 
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
          <button 
            type="submit" 
            className="w-full bg-white text-black py-4 uppercase font-medium tracking-[0.3em] text-xs hover:bg-zinc-200 transition-colors mt-20 flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
                <img src={loadingGif1} className="w-6 h-6" alt="Loading..." />
              ) : 
              "Authenticate"
             }
          </button>
          <div className="flex justify-between items-center pt-2">
          <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-zinc-400">
            Forgot Credentials?
          </span>
          <span onClick={() => navigate(`/register`)} className="text-white text-[9px] uppercase tracking-widest font-bold border-b border-white pb-1 cursor-pointer">
            Create Account
          </span>
    </div>
        </form>
        
      </div>
    </div>
  )
}