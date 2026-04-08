"use client";

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/language";
import { type Locale } from "@/i18n";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ChevronsUpDown, Globe, User } from "lucide-react";
import { cn } from "@/lib/utils";

import { mozambiqueProvinces } from "@/lib/data/mozambique-provinces";
import { courses } from "@/lib/data/courses";
import { mozambiqueUniversities } from "@/lib/data/mozambique-universities";

interface ProfileCompletionModalProps {
    open: boolean;
    onComplete: () => void;
}

type Step = "language" | "profile";

export function ProfileCompletionModal({ open, onComplete }: ProfileCompletionModalProps) {
    const { t, locale, setLocale } = useLanguage();
    const router = useRouter();

    const [step, setStep] = useState<Step>("language");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [province, setProvince] = useState("");
    const [birthYear, setBirthYear] = useState<number | null>(null);
    const [gender, setGender] = useState<"male" | "female" | "">("");
    const [course, setCourse] = useState("");
    const [university, setUniversity] = useState("");

    // Combobox open states
    const [courseOpen, setCourseOpen] = useState(false);
    const [universityOpen, setUniversityOpen] = useState(false);

    const currentYear = new Date().getFullYear();
    const years = useMemo(() => {
        const yearList = [];
        for (let y = currentYear - 16; y >= 1950; y--) {
            yearList.push(y);
        }
        return yearList;
    }, [currentYear]);

    const isProfileValid = province && birthYear && gender && course && university;

    const handleLanguageNext = () => {
        setStep("profile");
    };

    const handleSubmit = async () => {
        if (!isProfileValid) return;

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    province,
                    birthYear,
                    gender,
                    course,
                    university,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success(t("profileCompletion.success"));
                onComplete();
                router.refresh();
            } else {
                toast.error(data.error || "Error saving profile");
            }
        } catch {
            toast.error("Error connecting to server");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-2xl [&>button]:hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {t("profileCompletion.title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("profileCompletion.subtitle")}
                    </DialogDescription>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        step === "language" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                        1
                    </span>
                    <div className="h-px flex-1 bg-border" />
                    <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        step === "profile" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                        2
                    </span>
                </div>

                {step === "language" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{t("profileCompletion.languageStep")}</p>
                                <p className="text-sm text-muted-foreground">{t("profileCompletion.languageStepDesc")}</p>
                            </div>
                        </div>

                        <RadioGroup
                            value={locale}
                            onValueChange={(value) => setLocale(value as Locale)}
                            className="grid gap-3"
                        >
                            {[
                                { value: "pt-MZ", label: t("language.ptMZ") },
                                { value: "en-US", label: t("language.enUS") },
                                { value: "en-GB", label: t("language.enGB") },
                            ].map((lang) => (
                                <Label
                                    key={lang.value}
                                    htmlFor={lang.value}
                                    className={cn(
                                        "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                                        locale === lang.value
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:bg-muted/50"
                                    )}
                                >
                                    <RadioGroupItem value={lang.value} id={lang.value} />
                                    <span className="font-medium">{lang.label}</span>
                                </Label>
                            ))}
                        </RadioGroup>

                        <Button onClick={handleLanguageNext} className="w-full">
                            {t("common.continue")}
                        </Button>
                    </div>
                )}

                {step === "profile" && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{t("profileCompletion.profileStep")}</p>
                                <p className="text-sm text-muted-foreground">{t("profileCompletion.profileStepDesc")}</p>
                            </div>
                        </div>

                        {/* Province */}
                        <div className="space-y-2">
                            <Label>{t("profileCompletion.province")} *</Label>
                            <Select value={province} onValueChange={setProvince}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("profileCompletion.provincePlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {mozambiqueProvinces.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Birth Year & Gender Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("profileCompletion.birthYear")} *</Label>
                                <Select value={birthYear?.toString() ?? ""} onValueChange={(v) => setBirthYear(parseInt(v))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("profileCompletion.birthYearPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {years.map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("profileCompletion.gender")} *</Label>
                                <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("profileCompletion.gender")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">{t("profileCompletion.male")}</SelectItem>
                                        <SelectItem value="female">{t("profileCompletion.female")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Course (Searchable) */}
                        <div className="space-y-2">
                            <Label>{t("profileCompletion.course")} *</Label>
                            <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={courseOpen}
                                        className="w-full justify-between font-normal"
                                    >
                                        {course || t("profileCompletion.coursePlaceholder")}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder={t("profileCompletion.coursePlaceholder")} />
                                        <CommandList>
                                            <CommandEmpty>{t("profileCompletion.courseNoResults")}</CommandEmpty>
                                            <CommandGroup>
                                                {courses.map((c) => (
                                                    <CommandItem
                                                        key={c}
                                                        value={c}
                                                        onSelect={(currentValue) => {
                                                            setCourse(currentValue === course ? "" : currentValue);
                                                            setCourseOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                course === c ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {c}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* University (Searchable) */}
                        <div className="space-y-2">
                            <Label>{t("profileCompletion.university")} *</Label>
                            <Popover open={universityOpen} onOpenChange={setUniversityOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={universityOpen}
                                        className="w-full justify-between font-normal"
                                    >
                                        {university
                                            ? mozambiqueUniversities.find((u) => u.value === university)?.label || university
                                            : t("profileCompletion.universityPlaceholder")}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder={t("profileCompletion.universityPlaceholder")} />
                                        <CommandList>
                                            <CommandEmpty>{t("profileCompletion.universityNoResults")}</CommandEmpty>
                                            <CommandGroup>
                                                {mozambiqueUniversities.map((u) => (
                                                    <CommandItem
                                                        key={u.value}
                                                        value={u.label}
                                                        onSelect={() => {
                                                            setUniversity(u.value === university ? "" : u.value);
                                                            setUniversityOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                university === u.value ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {u.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setStep("language")} className="flex-1">
                                {t("common.back")}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!isProfileValid || isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting ? t("profileCompletion.submitting") : t("profileCompletion.submit")}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
