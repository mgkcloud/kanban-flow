import { NextResponse, NextRequest } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase";
import { randomId } from "@/lib/data";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }
  const supabase = supabaseAdminClient();
  const { data, error } = await supabase
    .from("status_webhooks")
    .select("*")
    .eq("project_id", projectId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, status, url } = body;
  if (!project_id || !status || !url) {
    return NextResponse.json(
      { error: "project_id, status and url are required" },
      { status: 400 }
    );
  }
  const supabase = supabaseAdminClient();
  const { data, error } = await supabase
    .from("status_webhooks")
    .upsert({
      id: randomId(),
      project_id,
      status,
      url,
    }, { onConflict: "project_id,status" })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
