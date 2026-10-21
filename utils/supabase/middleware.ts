import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Rutas que no requieren sesión; todo lo demás queda protegido por defecto.
const PUBLIC_PATHS = ["/login", "/activate-account"];

const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname);

// Copia cookies y headers de cache al redirect: sin eso se pierde el
// refresh de sesión que hizo getClaims() (patrón Supabase).
function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}

// Refresca la sesión de Supabase en cada request, propaga las cookies
// actualizadas y redirige según haya sesión (guard de rutas).
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Evita que un CDN cachee la respuesta con la cookie de sesión.
        Object.entries(cacheHeaders).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Verifica la firma del token y refresca la sesión si está por vencer.
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);
  const isPublic = isPublicPath(request.nextUrl.pathname);

  // Sin sesión en ruta protegida → /login; con sesión en ruta pública → /.
  if (!hasSession && !isPublic) {
    return redirectWithSession(request, supabaseResponse, "/login");
  }
  if (hasSession && isPublic) {
    return redirectWithSession(request, supabaseResponse, "/");
  }

  return supabaseResponse;
};
