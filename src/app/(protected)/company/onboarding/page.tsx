"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Globe, Mail, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";

interface FormErrors {
  name?: string;
  description?: string;
  location?: string;
  website?: string;
  email?: string;
}

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useClerk();

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    location: "",
    website: "",
    email: "",
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Nome da empresa é obrigatório";
    if (!form.description.trim() || form.description.trim().length < 10) errs.description = "Descrição deve ter pelo menos 10 caracteres";
    if (!form.location.trim()) errs.location = "Localização é obrigatória";
    if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = "URL deve começar com http:// ou https://";
    if (!form.email.trim()) errs.email = "Email de contacto é obrigatório";
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = "Email inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put("/api/company/profile", form);
      await session?.reload();
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setDone(true);
      // Full page reload so the middleware reads the updated Clerk JWT with the
      // RECRUITER role before navigating to the protected recruiter route.
      setTimeout(() => { window.location.assign("/recruiter/postings"); }, 1500);
    } catch {
      setErrors({ name: "Erro ao guardar. Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold">Perfil criado com sucesso!</h2>
          <p className="text-muted-foreground">A redirigir para o dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Perfil da Empresa</h1>
          <p className="text-muted-foreground">
            Preencha os dados da sua empresa para começar a publicar vagas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Nome da empresa <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Acme Moçambique, Lda."
              value={form.name}
              onChange={set("name")}
              className={cn(errors.name && "border-destructive")}
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Descrição da empresa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva a sua empresa, sector de actividade, missão e valores..."
              value={form.description}
              onChange={set("description")}
              rows={4}
              className={cn(errors.description && "border-destructive")}
              disabled={loading}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Localização <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              placeholder="Ex: Maputo, Moçambique"
              value={form.location}
              onChange={set("location")}
              className={cn(errors.location && "border-destructive")}
              disabled={loading}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.empresa.co.mz"
                value={form.website}
                onChange={set("website")}
                className={cn(errors.website && "border-destructive")}
                disabled={loading}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email de contacto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="rh@empresa.co.mz"
                value={form.email}
                onChange={set("email")}
                className={cn(errors.email && "border-destructive")}
                disabled={loading}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A criar perfil...
              </>
            ) : (
              "Criar perfil e continuar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
