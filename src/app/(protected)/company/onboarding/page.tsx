"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Globe, Mail, FileText, Loader2, CheckCircle, Upload, X, ImageIcon } from "lucide-react";
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
  logo?: string;
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
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoPath, setLogoPath] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field as keyof FormErrors]) setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const handleLogoChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, logo: "O ficheiro deve ser uma imagem (PNG, JPG, SVG, etc.)" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, logo: "Imagem demasiado grande (máximo 5 MB)" }));
      return;
    }
    setErrors((e) => ({ ...e, logo: undefined }));
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setLogoUrl(null);
    setLogoPath(null);

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload falhou");
      const data = await res.json();
      setLogoUrl(data.url);
      setLogoPath(data.pathname);
    } catch {
      setErrors((e) => ({ ...e, logo: "Erro ao carregar logo. Tente novamente." }));
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoChange(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
    setLogoPath(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Nome da empresa é obrigatório";
    if (!form.description.trim() || form.description.trim().length < 10) errs.description = "Descrição deve ter pelo menos 10 caracteres";
    if (!form.location.trim()) errs.location = "Localização é obrigatória";
    if (form.website && !/^https?:\/\/.+/.test(form.website)) errs.website = "URL deve começar com http:// ou https://";
    if (!form.email.trim()) errs.email = "Email de contacto é obrigatório";
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = "Email inválido";
    if (!logoUrl) errs.logo = "Logo da empresa é obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put("/api/company/profile", { ...form, logoUrl, logoPath });
      await session?.reload();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["company-profile"] }),
      ]);
      setDone(true);
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
          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Logo da empresa <span className="text-destructive">*</span>
            </Label>

            {logoPreview ? (
              <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="h-16 w-16 rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{logoFile?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {logoUploading ? (
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        A carregar...
                      </span>
                    ) : logoUrl ? (
                      <span className="text-emerald-600 font-medium">✓ Carregado com sucesso</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-colors",
                  errors.logo
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/20"
                )}
              >
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Clique ou arraste o logo aqui</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, SVG — máximo 5 MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            {errors.logo && <p className="text-xs text-destructive">{errors.logo}</p>}
          </div>

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

          <Button type="submit" className="w-full h-12 text-base" disabled={loading || logoUploading}>
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
