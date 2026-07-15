import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshTokens } from '../api';

const API_URL = process.env.REACT_APP_API_URL

export default function OrderPostPage({removeItem}){
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState("Google Pay")
  const [adress, setAdress] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [zip, setZip] = useState("")
  const [country, setCountry] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

   const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shipping = 0;
  const tax = subtotal * 0.08; 
  const total = subtotal + tax;
  const isFormValid = Boolean(
    phoneNumber.trim() &&
    firstName.trim() &&
    lastName.trim() &&
    country.trim() &&
    zip.trim() &&
    adress.trim() &&
    paymentMethod.trim() &&
    cartItems.length > 0
  );

  const fetchConfirmOrder = async () => {
    if (!isFormValid) return;
    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");

    const currentOrderData = {
      phone: phoneNumber,
      firstName: firstName,
      lastName: lastName,
      country: country,
      zipCode: zip,
      streetAddress: adress,
      paymentMethod: paymentMethod,
    };

    try {
      const response = await fetch(`${API_URL}/Order/create_order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(currentOrderData)
      });

      console.log(currentOrderData)

      if (!response.ok) {
        if (response.status === 401) {
          const isRefreshed = await refreshTokens();
          if (isRefreshed) return fetchConfirmOrder();
          return navigate("/login");
        }
        
        navigate("/catalog")
        return;
      }

      const data = await response.json();
      console.log("Успех:", data.id);
      removeItem()
      navigate(`/сonfirmation_page/${data.id}`)

    } catch (err) {
      console.error("Network error:", err);
    }
  };

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
        const errorText = await response.text(); 
        console.error("Server Message:", errorText);
        return;
      }
      const data = await response.json();
      setCartItems(data);
    }
    fetchCart();
  },[navigate])

  return (
    <>
      <div className='bg-[#0f0f0f] min-h-screen p-5 lg:p-10 lg:px-40'>
        <div className='flex flex-col lg:flex-row justify-center gap-8 lg:gap-10'>
          <div className='m-3 text-white max-w-4xl w-full'>
            <div className='tracking-[0.25em] font-medium text-1xl text-zinc-300'>01. CONTACT INFO</div>
            <div className='pl-4 m-2'>
              <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>PHONE NUMBER</p>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className='font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
            </div>
            <div className='tracking-[0.25em] font-medium text-1xl text-zinc-300 mt-5'>02. SHIPPING ADDRESS</div>
            <div className='pl-4 m-2'>
              <div className='flex flex-col lg:flex-row gap-3'>
                <div className='w-full'>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>FIRST NAME</p>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className='w-full font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
                </div>
                <div className='w-full'>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>LAST NAME</p>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" className='w-full font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
                </div>
              </div>
              <div className='flex flex-col lg:flex-row gap-3 mt-3'>
                <div className='w-full'>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>COUNTRY, CITY</p>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className='w-full lg:w-[350px] font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
                </div>
                <div className='w-full lg:w-[50px]'>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>ZIP</p>
                  <input value={zip} onChange={(e) => setZip(e.target.value)} type="text"  className='w-full font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
                </div>
              </div>
              <div className='mt-3'>
                  <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>STREET ADRESS</p>
                  <input value={adress} onChange={(e) => setAdress(e.target.value)} type="text" className='w-full lg:w-[410px] font-mono placeholder:text-zinc-500 appearance-none pl-2 p-0.5 bg-[#1c1c1c] outline-none decoration-none' placeholder=' ' required/>
              </div>
            </div>
            <div className='tracking-[0.25em] font-medium text-1xl text-zinc-300 mt-5'>03. PAYMENT METHOD</div>
            <div className='pl-4 m-2 max-w-full'>
              <p className='text-zinc-500 uppercase tracking-[0.15em] font-medium text-[11px] mb-1'>PAYMENT METHOD</p>
              <div className='flex flex-col text-white'>
                <select onChange={(e) => setPaymentMethod(e.target.value)} className='bg-black text-white w-full lg:w-[410px] p-1 outline-none font-bold text-[15px] tracking-wide cursor-pointer bg-[#1c1c1c]'
                  >
                  <option value="Google Pay">Google Pay</option>
                  <option value="Visa">Visa</option>
                  <option value="Privat24">Privat24</option>
                  <option value="Mastercard">Mastercard</option>
                </select>
              </div>
            </div>
          </div>
          <div className='bg-[#141414] text-zinc-200 mt-8 lg:mt-0 lg:ml-10 p-8 lg:p-10 w-full lg:w-[450px] border border-zinc-900 flex flex-col justify-between lg:sticky lg:top-10'>
            <div>
              <h2 className="uppercase text-[22px] tracking-[0.1em] font-medium mb-12">Order summary</h2>

              <div className="space-y-6">
                <div>
                  {cartItems.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="group flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] uppercase tracking-[0.15em] font-semibold text-white whitespace-nowrap">
                        {item.productName}
                      </span>
                      <div className="h-[1px] w-full border-b border-dashed border-white/10 mb-[3px] group-hover:border-white/30 transition-colors"></div>
                      <span className="text-[12px] font-mono text-white whitespace-nowrap">
                        {formatter.format(item.quantity * item.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">
                      <div className="flex gap-4">
                        <span>SIZE: {item.size}</span>
                        <span>QTY: {item.quantity}</span>
                      </div>
                      <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                        UNIT_PRICE: {formatter.format(item.price)}
                      </span>
                    </div>
                  </div>
                ))}
                </div>
                <div className="border-t border-white/10 w-full mt-5"></div>
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

            <div className="w-full mt-5">
              <button
                onClick={fetchConfirmOrder}
                disabled={!isFormValid}
                className={`w-full py-6 uppercase text-[12px] tracking-[0.3em] font-bold transition-all ${isFormValid ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'}`}
              >
                CONFIRM ORDER
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