"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { LoadingButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { createAlbum, type AlbumEntityType, type AlbumVisibility } from "@/lib/albums";
import { supabase } from "@/lib/supabase/public";

export default function NovoAlbumPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<AlbumVisibility>("private");
  const [entityType, setEntityType] = useState<AlbumEntityType | null>(null);
  const [entityId, setEntityId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    const id = params.get("entityId");
    if ((type === "artist" || type === "organizer" || type === "venue") && id) {
      setEntityType(type);
      setEntityId(id);
      setVisibility("public");
    }

    const { data: { user } } = await supabase.auth.getUser();
    setAuthenticated(Boolean(user));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      const album = await createAlbum({ title, visibility, entityType, entityId });
      toast({ message: "Álbum criado.", tone: "success" });
      router.push(`/albuns/${album.id}`);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : "Não foi possível criar o álbum.", tone: "error" });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg"><LoadingSkeleton rows={3} /></section>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
        <section className="mx-auto max-w-lg">
          <EmptyState title="Tens de iniciar sessão." description="Precisas de uma conta para criar um álbum." actionLabel="Entrar" actionHref="/login?next=%2Falbuns%2Fnovo" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-accent">Novo álbum</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Criar álbum.</h1>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Título</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="Ex: Sonic Blast 2026" />
          </label>

          <div>
            <span className="mb-2 block text-xs font-bold text-foreground-muted">Visibilidade</span>
            <SegmentedControl
              label="Visibilidade"
              value={visibility}
              onChange={setVisibility}
              options={[{ value: "private", label: "Privado" }, { value: "public", label: "Público" }]}
            />
            <p className="mt-2 text-xs text-foreground-muted">{visibility === "public" ? "Visível no teu perfil e no feed da Paranoid." : "Só quem tiveres na equipa do álbum vê as fotos."}</p>
          </div>

          <LoadingButton type="submit" loading={submitting} loadingText="A criar..." className="w-full" disabled={!title.trim()}>Criar álbum</LoadingButton>
        </form>
      </section>
    </main>
  );
}
