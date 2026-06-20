import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  return handle(request, params);
}

export async function POST(request, { params }) {
  return handle(request, params);
}

export async function PUT(request, { params }) {
  return handle(request, params);
}

export async function DELETE(request, { params }) {
  return handle(request, params);
}

export async function PATCH(request, { params }) {
  return handle(request, params);
}

export async function OPTIONS(request, { params }) {
  return handle(request, params);
}

async function handle(request, params) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams?.path || [];
    const path = pathArray.join("/");
    
    const targetUrl = new URL(request.url);
    const searchParams = targetUrl.search;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL is not configured on the server." }, { status: 500 });
    }
    
    const destination = `${supabaseUrl}/${path}${searchParams}`;
    
    // Copy headers from incoming request, excluding host and origin
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "host" && lowerKey !== "origin") {
        headers.set(key, value);
      }
    });

    const method = request.method;
    let body = null;
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      body = await request.arrayBuffer();
    }

    const res = await fetch(destination, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Omit compression and length headers because node-fetch automatically decompresses the body
      if (
        lowerKey !== "content-encoding" && 
        lowerKey !== "content-length" && 
        lowerKey !== "transfer-encoding"
      ) {
        responseHeaders.set(key, value);
      }
    });

    // Ensure CORS headers are allowed for local development
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Supabase Proxy Error:", error);
    return NextResponse.json({ error: error.message || "Internal Proxy Error" }, { status: 500 });
  }
}
