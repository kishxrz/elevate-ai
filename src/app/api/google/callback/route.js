import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const targetUrl = new URL(request.url);
    const code = targetUrl.searchParams.get("code");
    const userId = targetUrl.searchParams.get("state");

    console.log("Log: received authorization code:", code);

    if (!code) {
      console.error("Google OAuth callback failed: authorization code is missing.");
      return NextResponse.redirect(`${targetUrl.origin}/#dashboard?google_error=missing_code`);
    }

    if (!userId) {
      console.error("Google OAuth callback failed: user state is missing.");
      return NextResponse.redirect(`${targetUrl.origin}/#dashboard?google_error=missing_user`);
    }

    // Try to authenticate Supabase client using browser cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    const rt = cookieStore.get("sb-refresh-token")?.value;
    
    let authenticatedUser = null;
    if (token) {
      const { data: authData, error: authError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: rt || "",
      });
      if (authError) {
        console.error("Failed to restore Supabase session in callback:", authError);
      } else {
        authenticatedUser = authData.user;
      }
    }

    console.log("Log: current authenticated user id:", authenticatedUser?.id || "None (unauthenticated)");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${targetUrl.origin}/api/google/callback`;

    console.log(`Exchanging Google auth code for user: ${userId}`);

    // Exchange auth code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    console.log("Log: token exchange response:", tokens);
    console.log("Log: access_token:", tokens.access_token);
    console.log("Log: refresh_token:", tokens.refresh_token);

    if (!tokenResponse.ok) {
      console.error("Failed to exchange authorization code for tokens:", tokens);
      return NextResponse.redirect(`${targetUrl.origin}/#dashboard?google_error=token_exchange_failed`);
    }

    console.log("Tokens retrieved successfully from Google. Refresh token present:", !!tokens.refresh_token);

    // Profile lookup prior to update
    const profileLookup = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    console.log("Log: profile lookup result:", profileLookup);

    // Save connection status and refresh token to profiles
    const updateData = {
      google_connected: true,
    };
    
    if (tokens.refresh_token) {
      updateData.google_refresh_token = tokens.refresh_token;
    }

    const updateResult = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select();

    console.log("Log: profile update result:", updateResult);

    if (updateResult.error) {
      console.error("Failed to save Google tokens in Supabase profile:", updateResult.error);
      return NextResponse.redirect(`${targetUrl.origin}/#dashboard?google_error=database_save_failed`);
    }

    console.log(`Google Calendar successfully connected for user ${userId}`);
    return NextResponse.redirect(`${targetUrl.origin}/#dashboard?google_connected=true`);
  } catch (err) {
    console.error("Unexpected error in Google OAuth callback handler:", err);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/#dashboard?google_error=server_error`);
  }
}
