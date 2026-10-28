"use client";

// Puente explícito entre el botón de la sidebar y el modal del feed,
// que viven en árboles RSC distintos y no pueden compartir estado directo.
let openListener: (() => void) | null = null;
let pendingOpen = false;

export function setNewPostOpenListener(listener: (() => void) | null) {
  openListener = listener;
  if (listener && pendingOpen) {
    pendingOpen = false;
    listener();
  }
}

export function requestNewPost() {
  if (openListener) {
    openListener();
  } else {
    // El feed aún no está montado (p. ej. desde /kids): se abre al montarse.
    pendingOpen = true;
  }
}
