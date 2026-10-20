import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export const proxy = async (request: NextRequest) => updateSession(request);

export const config = {
  matcher: [
    /*
     * Se ejecuta en todas las rutas excepto recursos estáticos:
     * - _next/static, _next/image
     * - favicon.ico y metadatos
     * - imágenes directas de /public
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
