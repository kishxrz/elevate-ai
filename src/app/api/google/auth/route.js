import { NextResponse } from "next/server";

export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const targetUrl = new URL(request.url);
  const userId = targetUrl.searchParams.get("state") || "";

  if (!clientId) {
    console.warn("GOOGLE_CLIENT_ID is not configured. Redirecting with simulation warning.");
    const dashboardUrl = `${targetUrl.origin}/#dashboard?google_error=missing_credentials`;
    return NextResponse.redirect(dashboardUrl);
  }

  const redirectUri = `${targetUrl.origin}/api/google/callback`;
  
  // Forward the state parameter (which contains the user ID)
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send")}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(userId)}`;

  return NextResponse.redirect(authUrl);
}
