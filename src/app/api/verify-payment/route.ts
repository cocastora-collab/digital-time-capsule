import { NextRequest,NextResponse } from "next/server";
import { createHmac,timingSafeEqual } from "crypto";
import { adminDb } from "@/lib/supabase";

export const runtime="nodejs";
export async function POST(req:NextRequest) {
  try {
    const body=await req.json();
    const orderId=String(body.razorpay_order_id??"");
    const paymentId=String(body.razorpay_payment_id??"");
    const signature=String(body.razorpay_signature??"");
    const token=String(body.submissionToken??"");
    if(!orderId||!paymentId||!signature||!token)
      return NextResponse.json({error:"Missing payment verification details."},{status:400});

    const secret=process.env.RAZORPAY_KEY_SECRET;
    const keyId=process.env.RAZORPAY_KEY_ID;
    if(!secret||!keyId) throw new Error("Razorpay credentials missing");
    const expected=createHmac("sha256",secret).update(`${orderId}|${paymentId}`).digest("hex");
    const a=Buffer.from(expected); const b=Buffer.from(signature);
    if(a.length!==b.length||!timingSafeEqual(a,b))
      return NextResponse.json({error:"Payment signature is invalid."},{status:400});

    const db=adminDb();
    const {data:existing}=await db.from("capsule_messages").select("id").eq("payment_id",paymentId).maybeSingle();
    if(existing) return NextResponse.json({ok:true});

    const {data:pending,error:pendingError}=await db.from("pending_submissions").select("*").eq("token",token).eq("order_id",orderId).maybeSingle();
    if(pendingError||!pending) return NextResponse.json({error:"This submission has expired or cannot be matched to the payment."},{status:400});

    const auth=Buffer.from(`${keyId}:${secret}`).toString("base64");
    const paymentRes=await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,{
      headers:{Authorization:`Basic ${auth}`}
    });
    if(!paymentRes.ok) throw new Error("Could not verify payment status with provider");
    const payment=await paymentRes.json();
    if(payment.status!=="captured"||payment.amount!==1000||payment.currency!=="INR"||payment.order_id!==orderId)
      return NextResponse.json({error:"Payment is not captured or does not match the ₹10 participation fee."},{status:400});

    const {error:saveError}=await db.from("capsule_messages").insert({
      message:pending.message,nickname:pending.nickname,anonymous:pending.anonymous,
      consent_to_publish:pending.consent,payment_id:paymentId,order_id:orderId,
      amount_paise:1000,status:"pending_review"
    });
    if(saveError) {
      const {data:retry}=await db.from("capsule_messages").select("id").eq("payment_id",paymentId).maybeSingle();
      if(!retry) throw saveError;
    }
    await db.from("pending_submissions").delete().eq("token",token);
    return NextResponse.json({ok:true});
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"Could not complete submission. Contact support with your payment ID; do not pay again."},{status:500});
  }
}