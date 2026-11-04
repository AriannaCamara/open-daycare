import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Rutas que no requieren sesión; todo lo demás queda protegido por defecto.
const PUBLIC_PATHS = ["/login", "/activate-account"];

const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname);

// Paneles por rol: staff/admin → /staff; parent o rol desconocido → /family
// (panel de solo lectura: evita bucles de redirect ante usuarios sin fila).
type PanelRole = "staff" | "admin" | "parent";

const isStaffRole = (role: PanelRole | null) => role === "staff" || role === "admin";

function panelForRole(role: PanelRole | null): string {
  return isStaffRole(role) ? "/staff" : "/family";
}

const matchesPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

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
  const claims = data?.claims ?? null;
  const hasSession = Boolean(claims);
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  // Sin sesión en ruta protegida → /login; con sesión en ruta pública → /
  // (el ciclo siguiente resuelve el panel según rol).
  if (!hasSession && !isPublic) {
    return redirectWithSession(request, supabaseResponse, "/login");
  }
  if (hasSession && isPublic) {
    return redirectWithSession(request, supabaseResponse, "/");
  }

  if (!claims) {
    return supabaseResponse;
  }

  // Guard por prefijo: el rol vive en public.users (RLS users_select_own
  // permite leer la fila propia desde el cliente con cookies de la request).
  const isPanelRoute =
    pathname === "/" ||
    matchesPrefix(pathname, "/staff") ||
    matchesPrefix(pathname, "/family");

  if (!isPanelRoute) {
    return supabaseResponse;
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle();
  const role = (userData?.role as PanelRole | undefined) ?? null;

  // Raíz → panel del rol.
  if (pathname === "/") {
    return redirectWithSession(request, supabaseResponse, panelForRole(role));
  }

  // /staff/* exige staff/admin; /family/* exige parent (un rol desconocido
  // cae en /family, que es el panel de solo lectura, sin bucle de redirect).
  if (matchesPrefix(pathname, "/staff")) {
    if (!isStaffRole(role)) {
      return redirectWithSession(request, supabaseResponse, "/family");
    }
  } else if (isStaffRole(role)) {
    return redirectWithSession(request, supabaseResponse, "/staff");
  }

  return supabaseResponse;
};
