"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { safeRedirectPath } from "@/lib/security/redirect";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    const res = await signIn("credentials", { ...data, redirect: false });
    setLoading(false);
    if (res?.error) {
      push("Invalid email or password", "error");
      return;
    }
    push("Welcome back!", "success");
    // A full page load, not router.push: the router may hold a prefetched "please log in" redirect for this page.
    window.location.assign(safeRedirectPath(params.get("callbackUrl")));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="you@example.com" {...register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input type="password" placeholder="••••••••" {...register("password")} />
      </Field>
      <Button type="submit" loading={loading} className="mt-1 w-full">
        Log in
      </Button>
    </form>
  );
}
