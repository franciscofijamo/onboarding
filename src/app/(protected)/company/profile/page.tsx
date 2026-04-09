"use client";

import * as React from "react";
import { Building2, MapPin, Globe, Mail, FileText, Loader2, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSetPageMetadata } from "@/contexts/page-metadata";

interface Company {
  id: string;
  name: string;
  description: string;
  location: string;
  website: string | null;
  email: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  location?: string;
  website?: string;
  email?: string;
}

export default function CompanyProfilePage() {
  const queryClient = useQueryClient();

  useSetPageMetadata({ title: "Company Profile", description: "Manage your company information" });

  const { data, isLoading } = useQuery<{ company: Company | null }>({
    queryKey: ["company-profile"],
    queryFn: () => api.get("/api/company/profile"),
  });

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    location: "",
    website: "",
    email: "",
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (data?.company) {
      setForm({
        name: data.company.name,
        description: data.company.description,
        location: data.company.location,
        website: data.company.website ?? "",
        email: data.company.email,
      });
    }
  }, [data]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    setSaved(false);
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
    setSaving(true);
    try {
      await api.put("/api/company/profile", form);
      await queryClient.invalidateQueries({ queryKey: ["company-profile"] });
      setSaved(true);
    } catch {
      setErrors({ name: "Erro ao guardar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Building2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil da Empresa</h1>
          <p className="text-sm text-muted-foreground">Actualize as informações da sua empresa.</p>
        </div>
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
            disabled={saving}
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
            disabled={saving}
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
            disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar alterações
              </>
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              Guardado com sucesso
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
