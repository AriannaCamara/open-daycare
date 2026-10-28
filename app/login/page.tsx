import type { Metadata } from "next";
import { LoginForm } from "@/app/_components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

export default function LoginPage() {
  return <LoginForm />;
}
