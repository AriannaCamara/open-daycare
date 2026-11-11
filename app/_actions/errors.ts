// Errores compartidos entre las server actions y sus formularios (un solo
// literal, DRY). Módulo sin "use server": solo exporta constantes.
export const SESSION_ERROR = "Tu sesión expiró. Iniciá sesión de nuevo.";
export const COMMENT_EMPTY_ERROR = "Escribí un comentario.";
