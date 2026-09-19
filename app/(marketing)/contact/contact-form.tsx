"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, ContactInput } from "@/lib/validations";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useState } from "react";

export function ContactForm() {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = async (data: ContactInput) => {
    setLoading(true);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      push("Could not send your message — try again", "error");
      return;
    }
    push("Message sent! We'll get back to you soon.", "success");
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field label="Name" error={errors.name?.message}>
        <Input placeholder="Your name" {...register("name")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="you@example.com" {...register("email")} />
      </Field>
      <Field label="Message" error={errors.message?.message}>
        <Textarea rows={5} placeholder="How can we help?" {...register("message")} />
      </Field>
      <Button type="submit" loading={loading} className="mt-1 w-full sm:w-fit">
        Send message
      </Button>
    </form>
  );
}
