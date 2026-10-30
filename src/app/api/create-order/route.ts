import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { razorpayClient } from "@/lib/razorpay";
import { adminDb } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req:NextRequest) {
  try {
    const body=await req.json();
    const message=String(body.message??"").trim();
    const nickname=String(body.nickname??"").trim().slice(0,40);
    const anonymous=body.anonymous===true;
    const consent=body.consent===true;
    if(message.length<5||message.length>1000||!consent)
      return NextResponse.json({error:"A 5–1,000 character message and publication consent are required."},{status:400});

    const token=randomUUID();
    const db=adminDb();
    const {error:insertError}=await db.from("pending_submissions").insert({
      token,message,nickname:nickname||null,anonymous,consent
    });
    if(insertError) throw insertError;

    try {
      const order=await razorpayClient().orders.create({
        amount:1000,currency:"INR",receipt:token,notes:{submission_token:token}
      });
      const {error:updateError}=await db.from("pending_submissions").update({order_id:order.id}).eq("token",token);
      if(updateError) throw updateError;
      return NextResponse.json({orderId:order.id,amount:1000,keyId:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,submissionToken:token});
    } catch(e) {
      await db.from("pending_submissions").delete().eq("token",token);
      throw e;
    }
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"Payment setup is unavailable. Please try again later."},{status:500});
  }
}