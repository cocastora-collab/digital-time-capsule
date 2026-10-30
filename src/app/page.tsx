"use client";
import { FormEvent, useEffect, useState } from "react";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } } }

export default function Home() {
  const [message,setMessage]=useState("");
  const [nickname,setNickname]=useState("");
  const [anonymous,setAnonymous]=useState(false);
  const [consent,setConsent]=useState(false);
  const [participants,setParticipants]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");

  useEffect(()=>{ fetch("/api/stats").then(r=>r.json()).then(d=>setParticipants(d.participants ?? 0)).catch(()=>setParticipants(null)); },[]);

  async function submit(e:FormEvent) {
    e.preventDefault();
    if(!consent || message.trim().length<5) return;
    setBusy(true); setStatus("Preparing secure checkout…");
    try {
      const orderRes=await fetch("/api/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:message.trim(),nickname:nickname.trim(),anonymous,consent})});
      const order=await orderRes.json();
      if(!orderRes.ok) throw new Error(order.error || "Could not create payment order.");
      const script=document.createElement("script");
      script.src="https://checkout.razorpay.com/v1/checkout.js";
      script.onload=()=>{
        if(!window.Razorpay){setStatus("Payment checkout could not load. Please try again.");setBusy(false);return;}
        const checkout=new window.Razorpay({
          key:order.keyId, amount:order.amount, currency:"INR", name:"The Digital Time Capsule",
          description:"One message for the 2030 capsule", order_id:order.orderId,
          theme:{color:"#171717"},
          handler:async (response:Record<string,string>)=>{
            setStatus("Verifying payment and saving your message…");
            const verify=await fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...response,submissionToken:order.submissionToken})});
            const result=await verify.json();
            if(!verify.ok) throw new Error(result.error || "Payment verification failed.");
            setStatus("Payment verified. Your message has been received and is pending moderation. Thank you for contributing to the 2030 capsule.");
            setMessage("");setNickname("");setAnonymous(false);setConsent(false);
            fetch("/api/stats").then(r=>r.json()).then(d=>setParticipants(d.participants ?? 0));
            setBusy(false);
          },
          modal:{ondismiss:()=>{setBusy(false);setStatus("Checkout closed. No message was submitted.");}}
        });
        checkout.open();
      };
      script.onerror=()=>{setBusy(false);setStatus("Could not load payment checkout. Please try again.");};
      document.body.appendChild(script);
    } catch(err) { setBusy(false);setStatus(err instanceof Error?err.message:"Something went wrong."); }
  }

  return <main>
    <div className="topline"><span>THE DIGITAL TIME CAPSULE</span><span>EST. 2026</span></div>
    <section className="hero">
      <div className="kicker">A message from today · A memory for tomorrow</div>
      <h1>The Digital<br/>Time Capsule</h1>
      <p className="lede">The world keeps changing. Leave a small piece of this moment for the people who will be here in the future.</p>
      <div className="rule"/>
      <div className="date">THE CAPSULE OPENS · 1 JANUARY 2030</div>
    </section>
    <section className="grid" aria-label="Project details">
      <div className="stat"><strong>{participants===null?"—":participants.toLocaleString("en-IN")}</strong><span>Messages received</span></div>
      <div className="stat"><strong>₹10</strong><span>One-time participation</span></div>
    </section>
    <section className="panel">
      <h2>Leave a message for 2030</h2>
      <p className="note">A prediction, a hope, a memory, or a snapshot of ordinary life. Up to 1,000 characters.</p>
      <form onSubmit={submit}>
        <label htmlFor="message">Your message</label>
        <textarea id="message" maxLength={1000} required minLength={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Dear people of 2030…"/>
        <label htmlFor="nickname">Name or nickname <span style={{color:"#888",fontWeight:400}}>(optional)</span></label>
        <input id="nickname" type="text" maxLength={40} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="How should we credit you?"/>
        <label className="check"><input type="checkbox" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)}/> Publish my message anonymously.</label>
        <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I understand that my message will be reviewed and may be published when the capsule opens on 1 January 2030. I will not include private, confidential, or sensitive information. I have read the project terms and privacy notice.</label>
        <div className="price"><span>One-time participation</span><b>₹10</b></div>
        <button type="submit" disabled={busy||!consent||message.trim().length<5}>{busy?"PLEASE WAIT…":"CONTRIBUTE ₹10"}</button>
        {status&&<p className="status" role="status">{status}</p>}
      </form>
    </section>
    <footer>
      Messages are held for moderation. Payment is processed by Razorpay; card and UPI details are never stored on this website.<br/>
      Participation is voluntary and does not provide investment returns, prizes, or charitable tax benefits.<br/>
      © 2026 The Digital Time Capsule
    </footer>
  </main>;
}