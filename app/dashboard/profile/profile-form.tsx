"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema } from "@/lib/validations";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";
import { useRouter } from "next/navigation";

type FormValues = { name: string; phone: string; education: string; countryGoal: string; dailyGoalMinutes: number };

export function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string; education: string; countryGoal: string; dailyGoalMinutes: number };
}) {
  const { push } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(profileUpdateSchema) as any,
    defaultValues: initial,
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      push("Could not update profile", "error");
      return;
    }
    push("Profile updated", "success");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Full name" error={errors.name?.message}>
        <Input {...register("name")} />
      </Field>
      <Field label="Email">
        <Input value={initial.email} disabled />
      </Field>
      <Field label="Phone">
        <Input {...register("phone")} placeholder="+880 1XXX-XXXXXX" />
      </Field>
      <Field label="Education">
        <Input {...register("education")} placeholder="e.g. BSc in Computer Science" />
      </Field>
      <Field label="Country goal">
        <Input {...register("countryGoal")} placeholder="e.g. Canada" />
      </Field>
      <Field label="Daily goal (minutes)">
        <Input type="number" {...register("dailyGoalMinutes")} />
      </Field>
      <Button type="submit" loading={loading} className="mt-1 w-fit">
        Save changes
      </Button>
    </form>
  );
}
