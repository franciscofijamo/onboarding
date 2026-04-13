"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  Globe,
  Mail,
  FileText,
  Loader2,
  CheckCircle,
  Save,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";
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
  logoUrl: string | null;
  logoPath: string | null;
}

interface FormErrors {
  name?: string;
  description?: string;
  location?: string;
  website?: string;
  email?: string;
  logo?: string;
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
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoPath, setLogoPath] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const companyInitial = form.name.trim().charAt(0).toUpperCase() || "C";

  React.useEffect(() => {
    setImageError(false);
  }, [logoPreview]);

  React.useEffect(() => {
    if (data?.company) {
      setForm({
        name: data.company.name,
        description: data.company.description,
        location: data.company.location,
        website: data.company.website ?? "",
        email: data.company.email,
      });
      setLogoPreview(data.company.logoUrl ?? null);
      setLogoUrl(data.company.logoUrl ?? null);
      setLogoPath(data.company.logoPath ?? null);
      setLogoFile(null);
    }
  }, [data]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((err) => ({ ...err, [field]: undefined }));
    setSaved(false);
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
    setSaved(false);
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
      const uploaded = await res.json();
      setLogoUrl(uploaded.url);
      setLogoPath(uploaded.pathname);
    } catch {
      setErrors((e) => ({ ...e, logo: "Erro ao carregar logo. Tente novamente." }));
      setLogoFile(null);
      setLogoPreview(data?.company?.logoUrl ?? null);
      setLogoUrl(data?.company?.logoUrl ?? null);
      setLogoPath(data?.company?.logoPath ?? null);
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
    setSaved(false);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
    setLogoPath(null);
    setErrors((e) => ({ ...e, logo: "Logo da empresa é obrigatório" }));
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

    setSaving(true);
    try {
      await api.put("/api/company/profile", { ...form, logoUrl, logoPath });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
      setSaved(true);
    } catch {
      setErrors((current) => ({ ...current, name: "Erro ao guardar. Tente novamente." }));
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
    <div className="max-w-6xl">
      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Identidade visual</h2>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                Logo da empresa <span className="text-destructive">*</span>
              </Label>

              {logoPreview ? (
                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-3">
                      {!imageError ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="h-full w-full object-contain"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xl font-bold text-slate-400">
                          {companyInitial}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{logoFile?.name ?? "Logo actual"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {logoUploading ? (
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            A carregar...
                          </span>
                        ) : logoUrl ? (
                          <span className="font-medium text-emerald-600">✓ Carregado com sucesso</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving || logoUploading}>
                      Trocar
                    </Button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      disabled={saving || logoUploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                    errors.logo
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/20"
                  )}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-slate-900 to-slate-700 text-2xl font-semibold text-white shadow-sm">
                    {companyInitial}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Adicione o logo da empresa</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se não houver logo, a inicial da empresa será usada no sidebar.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    PNG, JPG, SVG — máximo 5 MB
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
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
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

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Descrição da empresa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva a sua empresa, sector de actividade, missão e valores..."
                value={form.description}
                onChange={set("description")}
                rows={7}
                className={cn("min-h-44", errors.description && "border-destructive")}
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

            <div className="space-y-2 lg:col-span-2">
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
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || logoUploading} className="gap-2">
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
    </div>
  );
}
