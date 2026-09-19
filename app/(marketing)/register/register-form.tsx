"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok) {
      setLoading(false);
      push(json.error || "Could not create account", "error");
      return;
    }

    const signInRes = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.error) {
      push("Account created — please log in", "info");
      router.push("/login");
      return;
    }

    push("Account created! Let's set up your profile.", "success");
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Full name" error={errors.name?.message}>
        <Input placeholder="Your name" {...register("name")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="you@example.com" {...register("email")} />
      </Field>
      <Field label="Password" error={errors.password?.message} hint="At least 6 characters">
        <Input type="password" placeholder="••••••••" {...register("password")} />
      </Field>
      <Button type="submit" loading={loading} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}
