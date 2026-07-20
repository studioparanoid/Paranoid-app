import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "@/lib/auth/redirects";
import { computeMfaCookieValue, mfaCookieName } from "@/lib/auth/mfaCookie";

const protectedPrefixes = ["/admin", "/organizador", "/submeter"];
const mfaExemptPrefixes = ["/auth/mfa-email", "/auth/mfa", "/login", "/registar", "/auth/callback", "/api/auth/mfa-email"];

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isMfaExempt(pathname: string) {
  return mfaExemptPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    if (isProtected(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL(loginPath(`${request.nextUrl.pathname}${request.nextUrl.search}`), request.url));
    }
    return response;
  }

  if (!isMfaExempt(request.nextUrl.pathname)) {
    const expectedCookie = await computeMfaCookieValue(user.id);
    const currentCookie = request.cookies.get(mfaCookieName)?.value;

    if (currentCookie !== expectedCookie) {
      const { data: profile } = await supabase.from("profiles").select("email_mfa_enabled").eq("id", user.id).maybeSingle();

      if (profile?.email_mfa_enabled) {
        const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        return NextResponse.redirect(new URL(`/auth/mfa-email?next=${encodeURIComponent(next)}`, request.url));
      }

      response.cookies.set(mfaCookieName, expectedCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
