"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import {
  Plus,
  Trash2,
  Star,
  StarOff,
  GripVertical,
  Upload,
  X,
  Copy,
  Check,
  Image as ImgIcon,
  Video as VideoIcon,
  FileText,
  Settings as SettingsIcon,
  Layers,
} from "lucide-react";
import {
  listShowcase,
  listMedia,
  upsertShowcaseItem,
  deleteShowcaseItem,
  reorderShowcase,
  updateSettings,
  signMediaUpload,
  registerMediaAsset,
  deleteMediaAsset,
} from "@/lib/showcase.functions";
import { autoAnchorUpload } from "@/lib/blockchain.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Kind = "project" | "certification" | "achievement" | "video";
type Item = {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  poster_url: string | null;
  live_url: string | null;
  github_url: string | null;
  tech: string[];
  issuer: string | null;
  issue_date: string | null;
  verify_url: string | null;
  featured: boolean;
  sort_order: number;
};
type MediaAsset = {
  id: string;
  kind: "image" | "video" | "pdf" | "other";
  name: string;
  storage_path: string;
  original_url: string;
  poster_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  mime: string | null;
};

const KIND_LABEL: Record<Kind, string> = {
  project: "Project",
  certification: "Certification",
  achievement: "Achievement",
  video: "Video",
};

const KIND_HELP: Record<Kind, { title: string; description: string }> = {
  project: {
    title: "Projects section",
    description:
      "Use an image cover, optional live/code links, and tech tags for portfolio projects.",
  },
  video: {
    title: "Featured work video",
    description:
      "Use a video file with optional poster image so admins can manage motion content clearly.",
  },
  certification: {
    title: "Certificates",
    description: "Store issuer, date, and verification link for proof-based work.",
  },
  achievement: {
    title: "Achievements",
    description:
      "Highlight recognitions or outcomes with a strong cover image and short description.",
  },
};

export function ShowcaseManager() {
  const [sub, setSub] = useState<"items" | "media" | "settings">("items");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 border-b border-[#D7E2EA]/10 pb-3">
        {(
          [
            { key: "items", label: "Items", icon: Layers },
            { key: "media", label: "Media Library", icon: ImgIcon },
            { key: "settings", label: "Settings", icon: SettingsIcon },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-widest transition"
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(74,158,255,0.2), rgba(118,33,176,0.2))"
                  : "transparent",
                color: active ? "#fff" : "rgba(215,226,234,0.6)",
                border: active ? "1px solid rgba(74,158,255,0.3)" : "1px solid transparent",
              }}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>
      {sub === "items" && <ItemsManager />}
      {sub === "media" && <MediaLibrary />}
      {sub === "settings" && <SettingsPanel />}
    </div>
  );
}

/* ============ ITEMS ============ */

function ItemsManager() {
  const list = useServerFn(listShowcase);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["showcase"], queryFn: () => list() });
  const items = (data?.items ?? []) as Item[];

  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [editing, setEditing] = useState<Item | null>(null);
  const filtered = filter === "all" ? items : items.filter((i) => i.kind === filter);

  const upsert = useServerFn(upsertShowcaseItem);
  const del = useServerFn(deleteShowcaseItem);
  const reorder = useServerFn(reorderShowcase);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["showcase"] });

  const upsertMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (payload: Partial<Item>) => upsert({ data: payload as any }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: invalidate,
  });
  const reorderMut = useMutation({
    mutationFn: (ids: string[]) => reorder({ data: { ids } }),
    onSuccess: invalidate,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filtered.map((i) => i.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    reorderMut.mutate(arrayMove(ids, oldIdx, newIdx));
  };

  const addNew = (kind: Kind) => {
    setEditing({
      id: "",
      kind,
      title: `New ${KIND_LABEL[kind]}`,
      description: "",
      thumbnail_url: "",
      media_url: "",
      poster_url: "",
      live_url: "",
      github_url: "",
      tech: [],
      issuer: "",
      issue_date: null,
      verify_url: "",
      featured: false,
      sort_order: items.length,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "project", "certification", "achievement", "video"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="text-[10px] uppercase tracking-[0.3em] px-3 py-1.5 rounded-full transition"
              style={{
                background: filter === k ? "rgba(74,158,255,0.2)" : "rgba(215,226,234,0.05)",
                color: filter === k ? "#fff" : "rgba(215,226,234,0.6)",
                border: `1px solid ${filter === k ? "rgba(74,158,255,0.4)" : "rgba(215,226,234,0.1)"}`,
              }}
            >
              {k === "all" ? "All" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["project", "certification", "achievement", "video"] as const).map((k) => (
            <button
              key={k}
              onClick={() => addNew(k)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
            >
              <Plus className="w-3 h-3" /> {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/40 py-10 text-center">
          Loading…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-[#D7E2EA]/40">
          No items yet. Add one above.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={filtered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {filtered.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              onEdit={() => setEditing(item)}
              onToggleFeatured={() => upsertMut.mutate({ ...item, featured: !item.featured })}
              onDelete={() => {
                if (confirm(`Delete "${item.title}"?`)) delMut.mutate(item.id);
              }}
            />
          ))}
        </SortableContext>
      </DndContext>

      <AnimatePresence>
        {editing && (
          <ItemEditor
            item={editing}
            onClose={() => setEditing(null)}
            onSave={(it) => upsertMut.mutate(it)}
            saving={upsertMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableRow({
  item,
  onEdit,
  onToggleFeatured,
  onDelete,
}: {
  item: Item;
  onEdit: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-3 p-3 rounded-2xl"
      // eslint-disable-next-line react/forbid-dom-props
      data-row
    >
      <div
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
          border: "1px solid rgba(215,226,234,0.08)",
        }}
        className="flex items-center gap-3 p-3 rounded-2xl w-full"
      >
        <button {...listeners} className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]">
          <GripVertical className="w-4 h-4" />
        </button>
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt=""
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-[#D7E2EA]/5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff]">
            {KIND_LABEL[item.kind]}
          </div>
          <div className="text-sm font-medium text-[#D7E2EA] truncate">{item.title}</div>
        </div>
        <button
          onClick={onToggleFeatured}
          title="Featured"
          className={item.featured ? "text-[#4a9eff]" : "text-[#D7E2EA]/30 hover:text-[#D7E2EA]"}
        >
          {item.featured ? (
            <Star className="w-4 h-4" fill="currentColor" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={onEdit}
          className="text-xs uppercase tracking-widest text-[#D7E2EA]/70 hover:text-[#D7E2EA] px-3 py-1.5 rounded-full border border-[#D7E2EA]/15"
        >
          Edit
        </button>
        <button onClick={onDelete} className="text-[#D7E2EA]/40 hover:text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: Item;
  onClose: () => void;
  onSave: (it: Item) => void;
  saving: boolean;
}) {
  const [local, setLocal] = useState<Item>(item);
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setLocal((s) => ({ ...s, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...local, id: local.id || (undefined as unknown as string) });
  };
  const help = KIND_HELP[local.kind];

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      />
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 flex flex-col gap-4"
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.97), rgba(12,12,12,0.97))",
          border: "1px solid rgba(74,158,255,0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#4a9eff]">
              {KIND_LABEL[local.kind]}
            </div>
            <div className="text-lg font-medium text-[#D7E2EA]">
              {local.id ? "Edit Item" : "New Item"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#D7E2EA]/60 hover:text-[#D7E2EA] hover:bg-[#D7E2EA]/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(215,226,234,0.04)",
              border: "1px solid rgba(215,226,234,0.08)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff] mb-2">
              Editing target
            </div>
            <div className="text-sm font-medium text-[#D7E2EA]">{help.title}</div>
            <p className="text-sm leading-relaxed text-[#D7E2EA]/65 mt-2">{help.description}</p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(215,226,234,0.04)",
              border: "1px solid rgba(215,226,234,0.08)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff] mb-2">
              Quick setup
            </div>
            <ul className="text-sm leading-6 text-[#D7E2EA]/65 space-y-1">
              <li>• Pick cover image from the media library.</li>
              {local.kind === "video" ? (
                <li>• Add one video file and optional poster.</li>
              ) : (
                <li>• Add title, description, and important links.</li>
              )}
              <li>• Mark as featured to push it higher in featured work.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EditorField label="Title" value={local.title} onChange={(v) => set("title", v)} />
          <MediaPickerField
            label={local.kind === "video" ? "Cover / Poster image" : "Thumbnail / Cover image"}
            value={local.thumbnail_url ?? ""}
            onChange={(v) => set("thumbnail_url", v)}
            kindFilter="image"
          />
        </div>

        <EditorField
          label="Description"
          value={local.description ?? ""}
          onChange={(v) => set("description", v)}
          multiline
        />

        {local.kind === "project" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EditorField
                label="Live URL"
                value={local.live_url ?? ""}
                onChange={(v) => set("live_url", v)}
              />
              <EditorField
                label="GitHub URL"
                value={local.github_url ?? ""}
                onChange={(v) => set("github_url", v)}
              />
            </div>
            <EditorField
              label="Tech (comma-separated)"
              value={local.tech.join(", ")}
              onChange={(v) =>
                set(
                  "tech",
                  v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </>
        )}
        {local.kind === "certification" && (
          <>
            <EditorField
              label="Issuer"
              value={local.issuer ?? ""}
              onChange={(v) => set("issuer", v)}
            />
            <EditorField
              label="Issue Date"
              value={local.issue_date ?? ""}
              onChange={(v) => set("issue_date", v)}
              placeholder="YYYY-MM-DD"
            />
            <EditorField
              label="Verify URL"
              value={local.verify_url ?? ""}
              onChange={(v) => set("verify_url", v)}
            />
          </>
        )}
        {local.kind === "video" && (
          <>
            <MediaPickerField
              label="Video File"
              value={local.media_url ?? ""}
              onChange={(v) => set("media_url", v)}
              kindFilter="video"
            />
            <MediaPickerField
              label="Poster (optional)"
              value={local.poster_url ?? ""}
              onChange={(v) => set("poster_url", v)}
              kindFilter="image"
            />
          </>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={local.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="w-4 h-4 accent-[#4a9eff]"
          />
          <span className="text-xs uppercase tracking-widest text-[#D7E2EA]/70">Featured</span>
        </label>

        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-widest text-[#D7E2EA]/60 hover:text-[#D7E2EA] px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="text-xs uppercase tracking-widest text-white px-6 py-3 rounded-full disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function EditorField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="bg-transparent text-sm text-[#D7E2EA] placeholder:text-[#D7E2EA]/30 px-4 py-3 rounded-xl focus:outline-none border resize-y"
          style={{ borderColor: "rgba(215,226,234,0.15)" }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-sm text-[#D7E2EA] placeholder:text-[#D7E2EA]/30 px-4 py-3 rounded-xl focus:outline-none border"
          style={{ borderColor: "rgba(215,226,234,0.15)" }}
        />
      )}
    </label>
  );
}

function MediaPickerField({
  label,
  value,
  onChange,
  kindFilter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kindFilter: "image" | "video";
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">{label}</span>
      <div
        className="rounded-2xl p-3 md:p-4 flex flex-col gap-3"
        style={{ background: "rgba(215,226,234,0.03)", border: "1px solid rgba(215,226,234,0.08)" }}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {value && kindFilter === "image" && (
            <img
              src={value}
              alt=""
              className="w-full sm:w-20 h-20 rounded-xl object-cover shrink-0"
            />
          )}
          {value && kindFilter === "video" && (
            <div
              className="w-full sm:w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(215,226,234,0.05)" }}
            >
              <VideoIcon className="w-6 h-6 text-[#D7E2EA]/50" />
            </div>
          )}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or pick from library"
            className="flex-1 bg-transparent text-sm text-[#D7E2EA] placeholder:text-[#D7E2EA]/30 px-4 py-3 rounded-xl focus:outline-none border"
            style={{ borderColor: "rgba(215,226,234,0.15)" }}
          />
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-xs uppercase tracking-widest text-[#D7E2EA]/80 px-4 py-3 rounded-xl border border-[#D7E2EA]/15 hover:border-[#4a9eff]/50 whitespace-nowrap"
          >
            Pick
          </button>
        </div>
        <div className="text-xs text-[#D7E2EA]/45">
          {kindFilter === "image"
            ? "Best for covers, project thumbnails, posters, and featured previews."
            : "Best for project demos, featured reels, or showcase walkthrough videos."}
        </div>
      </div>
      <AnimatePresence>
        {picking && (
          <MediaPickerModal
            kindFilter={kindFilter}
            onClose={() => setPicking(false)}
            onPick={(url) => {
              onChange(url);
              setPicking(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MediaPickerModal({
  kindFilter,
  onClose,
  onPick,
}: {
  kindFilter: "image" | "video";
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const list = useServerFn(listMedia);
  const { data: media = [] } = useQuery({ queryKey: ["media"], queryFn: () => list() });
  const filtered = (media as MediaAsset[]).filter((m) => m.kind === kindFilter);
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative w-full max-w-4xl max-h-[80vh] overflow-y-auto rounded-3xl p-6 flex flex-col gap-4"
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.97), rgba(12,12,12,0.97))",
          border: "1px solid rgba(74,158,255,0.3)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[#D7E2EA]">Pick {kindFilter}</div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#D7E2EA]/60 hover:text-[#D7E2EA] hover:bg-[#D7E2EA]/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-[#D7E2EA]/40">
            No {kindFilter}s uploaded yet. Use the Media Library tab.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.original_url)}
              className="rounded-xl overflow-hidden border border-[#D7E2EA]/10 hover:border-[#4a9eff]/50 transition aspect-square bg-[#D7E2EA]/5"
            >
              {m.kind === "image" ? (
                <img src={m.original_url} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-xs text-[#D7E2EA]/60 p-2 text-center">
                  <VideoIcon className="w-6 h-6" />
                  <span className="truncate w-full">{m.name}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============ MEDIA LIBRARY ============ */

function MediaLibrary() {
  const list = useServerFn(listMedia);
  const qc = useQueryClient();
  const { data: media = [], isLoading } = useQuery({ queryKey: ["media"], queryFn: () => list() });
  const del = useServerFn(deleteMediaAsset);
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
  });
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <UploadDropzone onUploaded={() => qc.invalidateQueries({ queryKey: ["media"] })} />
      {isLoading && (
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/40 py-10 text-center">
          Loading…
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {(media as MediaAsset[]).map((m) => (
          <div
            key={m.id}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "rgba(20,22,38,0.5)", border: "1px solid rgba(215,226,234,0.08)" }}
          >
            <div className="aspect-square bg-[#D7E2EA]/5 relative">
              {m.kind === "image" && (
                <img
                  src={m.original_url}
                  alt={m.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              )}
              {m.kind === "video" &&
                (m.poster_url ? (
                  <img src={m.poster_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon className="w-8 h-8 text-[#D7E2EA]/40" />
                  </div>
                ))}
              {m.kind === "pdf" && (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-[#D7E2EA]/40" />
                </div>
              )}
            </div>
            <div className="p-3 flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-widest text-[#4a9eff]">{m.kind}</div>
              <div className="text-xs text-[#D7E2EA] truncate" title={m.name}>
                {m.name}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(m.original_url);
                    setCopied(m.id);
                    setTimeout(() => setCopied(null), 1200);
                  }}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#D7E2EA]/70 hover:text-[#D7E2EA] px-2 py-1 rounded-full border border-[#D7E2EA]/10"
                >
                  {copied === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{" "}
                  URL
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this asset?")) delMut.mutate(m.id);
                  }}
                  className="ml-auto text-[#D7E2EA]/40 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type UploadJob = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

function UploadDropzone({ onUploaded }: { onUploaded: () => void }) {
  const sign = useServerFn(signMediaUpload);
  const anchor = useServerFn(autoAnchorUpload);
  const register = useServerFn(registerMediaAsset);
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  const upload = useCallback(
    async (file: File) => {
      const jobId = Math.random().toString(36).slice(2, 10);
      setJobs((j) => [...j, { id: jobId, name: file.name, progress: 0, status: "uploading" }]);
      const update = (patch: Partial<UploadJob>) =>
        setJobs((js) => js.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));

      try {
        let processed: File = file;
        let posterFile: File | null = null;
        let kind: "image" | "video" | "pdf" | "other" = "other";
        let width: number | null = null;
        let height: number | null = null;
        let duration: number | null = null;

        if (file.type.startsWith("image/")) {
          kind = "image";
          processed = await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2400,
            fileType: "image/webp",
            useWebWorker: true,
          });
          const dims = await getImageDims(processed);
          width = dims.w;
          height = dims.h;
        } else if (file.type.startsWith("video/")) {
          kind = "video";
          const meta = await getVideoMeta(file);
          width = meta.w;
          height = meta.h;
          duration = meta.duration;
          posterFile = meta.poster;
        } else if (file.type === "application/pdf") {
          kind = "pdf";
        }

        const safeName = sanitizeFilename(
          kind === "image" ? processed.name.replace(/\.[^.]+$/, ".webp") : file.name,
        );
        const signed = await sign({
          data: { filename: safeName, mime: processed.type || file.type },
        });
        update({ progress: 20 });

        const putRes = await fetch(signed.signedUrl, {
          method: "PUT",
          body: processed,
          headers: { "Content-Type": processed.type || file.type },
        });
        if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
        update({ progress: 60 });

        let posterPath: string | null = null;
        if (posterFile) {
          const psafe = sanitizeFilename(`poster-${file.name.replace(/\.[^.]+$/, ".webp")}`);
          const psigned = await sign({ data: { filename: psafe, mime: posterFile.type } });
          const pput = await fetch(psigned.signedUrl, {
            method: "PUT",
            body: posterFile,
            headers: { "Content-Type": posterFile.type },
          });
          if (pput.ok) posterPath = psigned.path;
        }

        update({ progress: 90 });
        await register({
          data: {
            kind,
            name: file.name,
            storage_path: signed.path,
            poster_path: posterPath,
            width,
            height,
            duration_seconds: duration,
            size_bytes: processed.size,
            mime: processed.type,
          },
        });
        update({ progress: 100, status: "done" });

        // Automatic on-chain anchoring for EVERY upload (documents, images and
        // video alike). Best effort: the server returns { anchored: false }
        // when the chain layer is disabled or a contract is not deployed.
        void anchor({
          data: {
            subject_type: "asset",
            subject_ref: `media:${signed.path}`,
            title: file.name,
            file_name: file.name,
            source_url: `/api/public/m/${signed.path}`,
            mime: processed.type || file.type,
            metadata: { media_kind: kind },
          },
        }).catch(() => undefined);

        onUploaded();
        setTimeout(() => setJobs((js) => js.filter((j) => j.id !== jobId)), 1500);
      } catch (e) {
        update({ status: "error", error: e instanceof Error ? e.message : "Failed" });
      }
    },
    [sign, register, anchor, onUploaded],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      accepted.forEach((f) => void upload(f));
    },
    [upload],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className="rounded-3xl p-8 md:p-10 text-center cursor-pointer transition"
        style={{
          background: isDragActive ? "rgba(74,158,255,0.1)" : "rgba(20,22,38,0.4)",
          border: `2px dashed ${isDragActive ? "rgba(74,158,255,0.5)" : "rgba(215,226,234,0.15)"}`,
        }}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-3 text-[#4a9eff]" />
        <div className="text-sm text-[#D7E2EA]/80">
          {isDragActive
            ? "Drop files to upload"
            : "Drag & drop images, videos, or PDFs here, or click to browse"}
        </div>
        <div className="text-xs text-[#D7E2EA]/40 mt-1">
          Images auto-compress to WebP. Videos auto-generate a poster.
        </div>
      </div>
      {jobs.length > 0 && (
        <div className="flex flex-col gap-2">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{
                background: "rgba(20,22,38,0.5)",
                border: "1px solid rgba(215,226,234,0.08)",
              }}
            >
              <div className="text-xs text-[#D7E2EA]/70 flex-1 truncate">{j.name}</div>
              {j.status === "error" ? (
                <div className="text-xs text-red-400">{j.error}</div>
              ) : (
                <>
                  <div className="w-32 h-1.5 rounded-full bg-[#D7E2EA]/10 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${j.progress}%`,
                        background: "linear-gradient(90deg, #4a9eff, #7621B0)",
                      }}
                    />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-[#D7E2EA]/50 w-12 text-right">
                    {j.status === "done" ? "Done" : `${j.progress}%`}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

async function getImageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = URL.createObjectURL(file);
  });
}

async function getVideoMeta(
  file: File,
): Promise<{ w: number; h: number; duration: number; poster: File | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      let poster: File | null = null;
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.85));
        if (blob) poster = new File([blob], "poster.webp", { type: "image/webp" });
      }
      resolve({ w: video.videoWidth, h: video.videoHeight, duration: video.duration, poster });
    };
    video.onerror = () => resolve({ w: 0, h: 0, duration: 0, poster: null });
  });
}

/* ============ SETTINGS ============ */

function SettingsPanel() {
  const list = useServerFn(listShowcase);
  const update = useServerFn(updateSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["showcase"], queryFn: () => list() });
  const settings = data?.settings ?? {
    layout: "grid",
    featured_projects_first: true,
    featured_certs_first: true,
  };
  const mut = useMutation({
    mutationFn: (patch: Partial<typeof settings>) => update({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["showcase"] }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-3xl p-6"
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
          border: "1px solid rgba(215,226,234,0.08)",
        }}
      >
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60 mb-4">
          Showcase Layout
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["grid", "carousel", "masonry", "featured"] as const).map((l) => {
            const active = settings.layout === l;
            return (
              <button
                key={l}
                onClick={() => mut.mutate({ layout: l })}
                className="p-4 rounded-2xl text-sm uppercase tracking-widest transition"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(74,158,255,0.2), rgba(118,33,176,0.2))"
                    : "rgba(215,226,234,0.04)",
                  color: active ? "#fff" : "rgba(215,226,234,0.7)",
                  border: `1px solid ${active ? "rgba(74,158,255,0.4)" : "rgba(215,226,234,0.1)"}`,
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
      <div
        className="rounded-3xl p-6 flex flex-col gap-3"
        style={{
          background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
          border: "1px solid rgba(215,226,234,0.08)",
        }}
      >
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">Order</div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.featured_projects_first}
            onChange={(e) => mut.mutate({ featured_projects_first: e.target.checked })}
            className="w-4 h-4 accent-[#4a9eff]"
          />
          <span className="text-sm text-[#D7E2EA]/80">Featured projects first</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.featured_certs_first}
            onChange={(e) => mut.mutate({ featured_certs_first: e.target.checked })}
            className="w-4 h-4 accent-[#4a9eff]"
          />
          <span className="text-sm text-[#D7E2EA]/80">Featured certifications first</span>
        </label>
      </div>
    </div>
  );
}
