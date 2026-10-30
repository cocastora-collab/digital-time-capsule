import { NextResponse } from "next/server";
import { adminDb } from "@/lib/supabase";
export const runtime="nodejs";
export async function GET() {
  try {
    const {count,error}=await adminDb().from("capsule_messages").select("*",{count:"exact",head:true}).in("status",["pending_review","approved"]);
    if(error) throw error;
    return NextResponse.json({participants:count??0});
  } catch { return NextResponse.json({participants:0}); }
}