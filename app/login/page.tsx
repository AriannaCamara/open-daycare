import type { Metadata } from "next";
import { BRAND_NAME } from "@/app/_components/brand";
import { LoginForm } from "@/app/_components/login-form";

export const metadata: Metadata = {
  title: `Iniciar sesión · ${BRAND_NAME}`,
};

export default function LoginPage() {
  return <LoginForm />;
}
