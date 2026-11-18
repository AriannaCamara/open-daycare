// Marca visual compartida de la app: huella y nombre visibles.
// La usan sidebar, login, activación y los títulos de pestaña.

export const BRAND_NAME = "Huellitas";

export function PawIcon({ size = 21 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="4.6" cy="10.4" r="1.9" />
      <circle cx="9.4" cy="6.2" r="1.9" />
      <circle cx="14.6" cy="6.2" r="1.9" />
      <circle cx="19.4" cy="10.4" r="1.9" />
      <path d="M12 11.8C14 11.8 16.4 13.2 17.4 15.4C18.4 17.6 17.6 20.4 15.4 21.2C14.2 21.6 13.1 21.4 12 21.4C10.9 21.4 9.8 21.6 8.6 21.2C6.4 20.4 5.6 17.6 6.6 15.4C7.6 13.2 10 11.8 12 11.8Z" />
    </svg>
  );
}
