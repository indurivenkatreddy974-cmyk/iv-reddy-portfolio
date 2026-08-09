"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  User,
  FileText,
  FolderKanban,
  Briefcase,
  GraduationCap,
  Activity,
  Cpu,
  Mail,
  Image as ImgIcon,
  Shield,
  LogOut,
  Eye,
  RotateCcw,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Link2,
} from "lucide-react";
import { ShowcaseManager } from "./ShowcaseManager";
import { BlockchainManager } from "./BlockchainManager";
import {
  useContent,
  newId,
  type Project,
  type Internship,
  type Education,
  type Certification,
  type TimelineItem,
} from "@/lib/content-store";
import { useAdminAuth, getAccessLog, type AccessLogEntry } from "@/lib/admin-auth";
import { useCloudStatus, type SaveStatus } from "@/lib/cloud-content";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TabKey =
  | "showcase"
  | "blockchain"
  | "hero"
  | "about"
  | "projects"
  | "internships"
  | "education"
  | "certifications"
  | "timeline"
  | "tech"
  | "contact"
  | "media"
  | "log";

const TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "showcase", label: "Media & Showcase", icon: Sparkles },
  { key: "blockchain", label: "Blockchain", icon: Link2 },
  { key: "hero", label: "Hero", icon: User },
  { key: "about", label: "About", icon: FileText },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "internships", label: "Internships", icon: Briefcase },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "certifications", label: "Certifications", icon: Shield },
  { key: "timeline", label: "Timeline", icon: Activity },
  { key: "tech", label: "Tech Stack", icon: Cpu },
  { key: "contact", label: "Contact", icon: Mail },
  { key: "media", label: "Media", icon: ImgIcon },
  { key: "log", label: "Access Log", icon: Shield },
];

export function AdminShell() {
  const [tab, setTab] = useState<TabKey>("showcase");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const lock = useAdminAuth((s) => s.signOut);
  const reset = useContent((s) => s.reset);

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "#0a0a0a", color: "#D7E2EA" }}
    >
      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(215,226,234,0.08)" }}
      >
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="text-xs uppercase tracking-widest"
        >
          Menu
        </button>
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/70">IV · Atelier</div>
        <button
          onClick={() => {
            lock();
            navigate({ to: "/" });
          }}
          aria-label="Exit"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "block" : "hidden"} md:block md:w-64 md:shrink-0 border-r flex-col`}
        style={{
          background: "linear-gradient(180deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
          borderColor: "rgba(215,226,234,0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="hidden md:flex items-center gap-3 px-6 py-6">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
          >
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">IV · Atelier</div>
            <div className="text-sm font-medium">Control Room</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSidebarOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition group"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(74,158,255,0.18), rgba(118,33,176,0.18))"
                    : "transparent",
                  border: active ? "1px solid rgba(74,158,255,0.3)" : "1px solid transparent",
                  color: active ? "#fff" : "rgba(215,226,234,0.7)",
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto px-3 pb-4 flex flex-col gap-2">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest text-[#D7E2EA]/70 hover:text-[#D7E2EA] hover:bg-[#D7E2EA]/5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Site
          </button>
          <button
            onClick={() => {
              if (confirm("Reset all content to defaults?")) reset();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest text-[#D7E2EA]/70 hover:text-[#D7E2EA] hover:bg-[#D7E2EA]/5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Content
          </button>
          <button
            onClick={() => {
              lock();
              navigate({ to: "/" });
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest text-[#D7E2EA]/70 hover:text-red-400"
          >
            <LogOut className="w-3.5 h-3.5" /> Lock & Exit
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-5 md:p-10 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
            transition={{ duration: 0.35 }}
            className="max-w-3xl mx-auto"
          >
            <TabPanel tab={tab} />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function TabPanel({ tab }: { tab: TabKey }) {
  switch (tab) {
    case "showcase":
      return <ShowcaseManager />;
    case "blockchain":
      return <BlockchainManager />;
    case "hero":
      return <HeroEditor />;
    case "about":
      return <AboutEditor />;
    case "projects":
      return <ProjectsEditor />;
    case "internships":
      return <InternshipsEditor />;
    case "education":
      return <EducationEditor />;
    case "certifications":
      return <CertificationsEditor />;
    case "timeline":
      return <TimelineEditor />;
    case "tech":
      return <TechEditor />;
    case "contact":
      return <ContactEditor />;
    case "media":
      return <MediaEditor />;
    case "log":
      return <AccessLogPanel />;
  }
}

/* ===================== Primitives ===================== */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-3xl p-6 md:p-8 mb-6"
      style={{
        background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
        border: "1px solid rgba(215,226,234,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60 mb-5">{title}</div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({
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

/* ===================== Editors ===================== */

function SaveBadge({ section }: { section: "hero" | "about" | "contact" }) {
  const status = useCloudStatus((s) => s.status[section]);
  const err = useCloudStatus((s) => s.lastError[section]);
  const hydrated = useCloudStatus((s) => s.hydrated);
  const map: Record<SaveStatus, { label: string; icon: React.ReactNode; color: string }> = {
    idle: {
      label: hydrated ? "Synced" : "Loading…",
      icon: <Cloud className="w-3 h-3" />,
      color: "rgba(215,226,234,0.5)",
    },
    dirty: { label: "Unsaved changes", icon: <Cloud className="w-3 h-3" />, color: "#f59e0b" },
    saving: {
      label: "Saving…",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      color: "#4a9eff",
    },
    saved: { label: "Saved", icon: <Check className="w-3 h-3" />, color: "#34d399" },
    error: {
      label: err ? `Error: ${err}` : "Save failed",
      icon: <CloudOff className="w-3 h-3" />,
      color: "#f87171",
    },
  };
  const cur = map[status];
  return (
    <div
      className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] mb-3"
      style={{ color: cur.color }}
    >
      {cur.icon}
      <span>{cur.label}</span>
    </div>
  );
}

function HeroEditor() {
  const hero = useContent((s) => s.hero);
  const patch = useContent((s) => s.patch);
  return (
    <Card title="Hero Section">
      <SaveBadge section="hero" />
      <Field
        label="Role Label"
        value={hero.roleLabel}
        onChange={(v) => patch("hero", { roleLabel: v })}
      />
      <Field label="Name" value={hero.name} onChange={(v) => patch("hero", { name: v })} />
      <Field label="Heading" value={hero.heading} onChange={(v) => patch("hero", { heading: v })} />
      <Field
        label="Tagline"
        value={hero.tagline}
        onChange={(v) => patch("hero", { tagline: v })}
        multiline
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="CTA 1 Label"
          value={hero.cta1.label}
          onChange={(v) => patch("hero", { cta1: { ...hero.cta1, label: v } })}
        />
        <Field
          label="CTA 1 Link"
          value={hero.cta1.href}
          onChange={(v) => patch("hero", { cta1: { ...hero.cta1, href: v } })}
        />
        <Field
          label="CTA 2 Label"
          value={hero.cta2.label}
          onChange={(v) => patch("hero", { cta2: { ...hero.cta2, label: v } })}
        />
        <Field
          label="CTA 2 Link"
          value={hero.cta2.href}
          onChange={(v) => patch("hero", { cta2: { ...hero.cta2, href: v } })}
        />
        <Field
          label="CTA 3 Label"
          value={hero.cta3.label}
          onChange={(v) => patch("hero", { cta3: { ...hero.cta3, label: v } })}
        />
        <Field
          label="CTA 3 Link"
          value={hero.cta3.href}
          onChange={(v) => patch("hero", { cta3: { ...hero.cta3, href: v } })}
        />
      </div>
      <Field
        label="Portrait Image URL"
        value={hero.portraitUrl}
        onChange={(v) => patch("hero", { portraitUrl: v })}
      />
    </Card>
  );
}

function AboutEditor() {
  const about = useContent((s) => s.about);
  const patch = useContent((s) => s.patch);
  return (
    <Card title="About Section">
      <SaveBadge section="about" />
      <Field
        label="Heading"
        value={about.heading}
        onChange={(v) => patch("about", { heading: v })}
      />
      <Field
        label="Body"
        value={about.body}
        onChange={(v) => patch("about", { body: v })}
        multiline
      />
    </Card>
  );
}

/* Sortable wrapper */
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (h: { listeners: ReturnType<typeof useSortable>["listeners"] }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners })}
    </div>
  );
}

function useDnd<T extends { id: string }>(items: T[], onReorder: (next: T[]) => void) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, oldIdx, newIdx));
  };
  return { sensors, onDragEnd };
}

function ProjectsEditor() {
  const projects = useContent((s) => s.projects);
  const setKey = useContent((s) => s.set);
  const { sensors, onDragEnd } = useDnd(projects, (next) => setKey("projects", next));

  const update = (id: string, patch: Partial<Project>) => {
    setKey(
      "projects",
      projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };
  const remove = (id: string) =>
    setKey(
      "projects",
      projects.filter((p) => p.id !== id),
    );
  const add = () =>
    setKey("projects", [
      ...projects,
      {
        id: newId(),
        n: String(projects.length + 1).padStart(2, "0"),
        type: "Personal",
        name: "New Project",
        desc: "",
        liveUrl: "",
        githubUrl: "",
        tech: [],
        imgs: ["", "", ""],
        videoUrl: "",
        posterUrl: "",
      },
    ]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">
          Projects · drag to reorder
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((p) => (
            <SortableItem key={p.id} id={p.id}>
              {({ listeners }) => (
                <div
                  className="rounded-3xl p-5 md:p-6 mb-4"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      {...listeners}
                      className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">
                      {p.n} · {p.name}
                    </div>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-[#D7E2EA]/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Number" value={p.n} onChange={(v) => update(p.id, { n: v })} />
                    <Field
                      label="Type"
                      value={p.type}
                      onChange={(v) => update(p.id, { type: v })}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <Field
                      label="Name"
                      value={p.name}
                      onChange={(v) => update(p.id, { name: v })}
                    />
                    <Field
                      label="Description"
                      value={p.desc}
                      onChange={(v) => update(p.id, { desc: v })}
                      multiline
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field
                        label="Live URL"
                        value={p.liveUrl}
                        onChange={(v) => update(p.id, { liveUrl: v })}
                      />
                      <Field
                        label="GitHub URL"
                        value={p.githubUrl}
                        onChange={(v) => update(p.id, { githubUrl: v })}
                      />
                    </div>
                    <Field
                      label="Tech (comma-separated)"
                      value={p.tech.join(", ")}
                      onChange={(v) =>
                        update(p.id, {
                          tech: v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <div
                      className="rounded-2xl p-4 flex flex-col gap-3"
                      style={{
                        background: "rgba(215,226,234,0.03)",
                        border: "1px solid rgba(215,226,234,0.08)",
                      }}
                    >
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-[#4a9eff] mb-2">
                          Project media
                        </div>
                        <p className="text-sm text-[#D7E2EA]/60 leading-relaxed">
                          Keep three images for the gallery, and add an optional demo video with
                          poster if you want motion inside the project card.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field
                          label="Project Video URL (optional)"
                          value={p.videoUrl ?? ""}
                          onChange={(v) => update(p.id, { videoUrl: v })}
                        />
                        <Field
                          label="Video Poster URL (optional)"
                          value={p.posterUrl ?? ""}
                          onChange={(v) => update(p.id, { posterUrl: v })}
                        />
                      </div>
                    </div>
                    {([0, 1, 2] as const).map((i) => (
                      <Field
                        key={i}
                        label={`Image ${i + 1} URL`}
                        value={p.imgs[i]}
                        onChange={(v) => {
                          const next: [string, string, string] = [...p.imgs] as [
                            string,
                            string,
                            string,
                          ];
                          next[i] = v;
                          update(p.id, { imgs: next });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

function InternshipsEditor() {
  const items = useContent((s) => s.internships);
  const setKey = useContent((s) => s.set);
  const { sensors, onDragEnd } = useDnd(items, (next) => setKey("internships", next));
  const update = (id: string, patch: Partial<Internship>) =>
    setKey(
      "internships",
      items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const remove = (id: string) =>
    setKey(
      "internships",
      items.filter((p) => p.id !== id),
    );
  const add = () =>
    setKey("internships", [
      ...items,
      {
        id: newId(),
        company: "Company",
        role: "Role",
        duration: "Year — Year",
        contributions: "",
        logoUrl: "",
        skills: [],
        certificateUrl: "",
        offerLetterUrl: "",
      },
    ]);
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">Internships</div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((i) => (
            <SortableItem key={i.id} id={i.id}>
              {({ listeners }) => (
                <div
                  className="rounded-3xl p-5 md:p-6 mb-4"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      {...listeners}
                      className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">
                      {i.company}
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-[#D7E2EA]/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field
                      label="Company / Organization"
                      value={i.company}
                      onChange={(v) => update(i.id, { company: v })}
                    />
                    <Field
                      label="Role"
                      value={i.role}
                      onChange={(v) => update(i.id, { role: v })}
                    />
                    <Field
                      label="Duration"
                      value={i.duration}
                      onChange={(v) => update(i.id, { duration: v })}
                    />
                    <Field
                      label="Logo URL"
                      value={i.logoUrl ?? ""}
                      onChange={(v) => update(i.id, { logoUrl: v })}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/40">
                      Use uploaded document paths like /api/public/m/portfolio/your-file.pdf for
                      best preview and download speed.
                    </div>
                    <Field
                      label="Description"
                      value={i.contributions}
                      onChange={(v) => update(i.id, { contributions: v })}
                      multiline
                    />
                    <Field
                      label="Skills / Technologies (comma-separated)"
                      value={(i.skills ?? []).join(", ")}
                      onChange={(v) =>
                        update(i.id, {
                          skills: v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field
                        label="Certificate PDF URL"
                        value={i.certificateUrl ?? ""}
                        onChange={(v) => update(i.id, { certificateUrl: v })}
                      />
                      <Field
                        label="Offer Letter PDF URL"
                        value={i.offerLetterUrl ?? ""}
                        onChange={(v) => update(i.id, { offerLetterUrl: v })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

function EducationEditor() {
  const items = useContent((s) => s.educations);
  const setKey = useContent((s) => s.set);
  const { sensors, onDragEnd } = useDnd(items, (next) => setKey("educations", next));
  const update = (id: string, patch: Partial<Education>) =>
    setKey(
      "educations",
      items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const remove = (id: string) =>
    setKey(
      "educations",
      items.filter((p) => p.id !== id),
    );
  const add = () =>
    setKey("educations", [
      ...items,
      {
        id: newId(),
        degree: "Degree",
        institution: "Institution",
        year: "Year",
        percentage: "",
        description: "",
      },
    ]);
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">Education</div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((i) => (
            <SortableItem key={i.id} id={i.id}>
              {({ listeners }) => (
                <div
                  className="rounded-3xl p-5 md:p-6 mb-4"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      {...listeners}
                      className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">
                      {i.degree}
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-[#D7E2EA]/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field
                      label="Qualification"
                      value={i.degree}
                      onChange={(v) => update(i.id, { degree: v })}
                    />
                    <Field
                      label="Institution"
                      value={i.institution}
                      onChange={(v) => update(i.id, { institution: v })}
                    />
                    <Field
                      label="Year"
                      value={i.year}
                      onChange={(v) => update(i.id, { year: v })}
                    />
                    <Field
                      label="Percentage (e.g. 77.83%)"
                      value={i.percentage ?? ""}
                      onChange={(v) => update(i.id, { percentage: v })}
                    />
                  </div>
                  <div className="mt-3">
                    <Field
                      label="Description"
                      value={i.description}
                      onChange={(v) => update(i.id, { description: v })}
                      multiline
                    />
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

function CertificationsEditor() {
  const items = useContent((s) => s.certifications);
  const setKey = useContent((s) => s.set);
  const { sensors, onDragEnd } = useDnd(items, (next) => setKey("certifications", next));
  const update = (id: string, patch: Partial<Certification>) =>
    setKey(
      "certifications",
      items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const remove = (id: string) =>
    setKey(
      "certifications",
      items.filter((p) => p.id !== id),
    );
  const add = () =>
    setKey("certifications", [
      ...items,
      {
        id: newId(),
        name: "New Certificate",
        issuer: "Issuing Organization",
        issueDate: "",
        pdfUrl: "",
        previewUrl: "",
        verifyUrl: "",
      },
    ]);
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">Certifications</div>
          <div className="text-[10px] text-[#D7E2EA]/40 mt-1">
            Paste a public PDF URL or use a /api/public/m/... path uploaded via Showcase → Media
            Library.
          </div>
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((i) => (
            <SortableItem key={i.id} id={i.id}>
              {({ listeners }) => (
                <div
                  className="rounded-3xl p-5 md:p-6 mb-4"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      {...listeners}
                      className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">
                      {i.name}
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-[#D7E2EA]/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field
                      label="Certificate Name"
                      value={i.name}
                      onChange={(v) => update(i.id, { name: v })}
                    />
                    <Field
                      label="Issuing Organization"
                      value={i.issuer}
                      onChange={(v) => update(i.id, { issuer: v })}
                    />
                    <Field
                      label="Issue Date"
                      value={i.issueDate}
                      onChange={(v) => update(i.id, { issueDate: v })}
                    />
                    <Field
                      label="Verification Link (optional)"
                      value={i.verifyUrl ?? ""}
                      onChange={(v) => update(i.id, { verifyUrl: v })}
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[#D7E2EA]/40">
                      Add a direct PDF or image document URL. Leave verification link empty unless
                      it opens the real issuer page.
                    </div>
                    <Field
                      label="Certificate File URL"
                      value={i.pdfUrl}
                      onChange={(v) => update(i.id, { pdfUrl: v })}
                    />
                    <Field
                      label="Preview Image URL (optional)"
                      value={i.previewUrl ?? ""}
                      onChange={(v) => update(i.id, { previewUrl: v })}
                    />
                  </div>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

function TimelineEditor() {
  const items = useContent((s) => s.timeline);
  const setKey = useContent((s) => s.set);
  const { sensors, onDragEnd } = useDnd(items, (next) => setKey("timeline", next));
  const update = (id: string, patch: Partial<TimelineItem>) =>
    setKey(
      "timeline",
      items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const remove = (id: string) =>
    setKey(
      "timeline",
      items.filter((p) => p.id !== id),
    );
  const add = () => setKey("timeline", [...items, { id: newId(), title: "Stage", desc: "" }]);
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-[0.3em] text-[#D7E2EA]/60">Timeline</div>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs uppercase tracking-widest px-4 py-2 rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((i) => (
            <SortableItem key={i.id} id={i.id}>
              {({ listeners }) => (
                <div
                  className="rounded-2xl p-5 mb-3"
                  style={{
                    background: "linear-gradient(160deg, rgba(20,22,38,0.7), rgba(12,12,12,0.7))",
                    border: "1px solid rgba(215,226,234,0.1)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      {...listeners}
                      className="cursor-grab text-[#D7E2EA]/40 hover:text-[#D7E2EA]"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <input
                      value={i.title}
                      onChange={(e) => update(i.id, { title: e.target.value })}
                      className="flex-1 bg-transparent text-sm text-[#D7E2EA] px-3 py-2 rounded-lg border focus:outline-none"
                      style={{ borderColor: "rgba(215,226,234,0.15)" }}
                    />
                    <button
                      onClick={() => remove(i.id)}
                      className="text-[#D7E2EA]/40 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={i.desc}
                    onChange={(e) => update(i.id, { desc: e.target.value })}
                    rows={2}
                    className="w-full bg-transparent text-sm text-[#D7E2EA] px-3 py-2 rounded-lg border focus:outline-none resize-y"
                    style={{ borderColor: "rgba(215,226,234,0.15)" }}
                  />
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </>
  );
}

function TechEditor() {
  const stack = useContent((s) => s.techStack);
  const setKey = useContent((s) => s.set);
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v) return;
    setKey("techStack", [...stack, v]);
    setInput("");
  };
  const remove = (i: number) =>
    setKey(
      "techStack",
      stack.filter((_, idx) => idx !== i),
    );
  return (
    <Card title="Tech Stack">
      <div className="flex flex-wrap gap-2">
        {stack.map((t, i) => (
          <span
            key={t + i}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest border"
            style={{ borderColor: "rgba(215,226,234,0.2)" }}
          >
            {t}
            <button onClick={() => remove(i)} className="text-[#D7E2EA]/50 hover:text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add skill…"
          className="flex-1 bg-transparent text-sm px-4 py-3 rounded-xl border focus:outline-none"
          style={{ borderColor: "rgba(215,226,234,0.15)" }}
        />
        <button
          type="submit"
          className="px-5 rounded-xl text-xs uppercase tracking-widest text-white"
          style={{ background: "linear-gradient(135deg, #4a9eff, #7621B0)" }}
        >
          Add
        </button>
      </form>
    </Card>
  );
}

function ContactEditor() {
  const contact = useContent((s) => s.contact);
  const patch = useContent((s) => s.patch);
  return (
    <Card title="Contact Section">
      <SaveBadge section="contact" />
      <Field
        label="Heading"
        value={contact.heading}
        onChange={(v) => patch("contact", { heading: v })}
      />
      <Field
        label="Subtitle"
        value={contact.subtitle}
        onChange={(v) => patch("contact", { subtitle: v })}
        multiline
      />
      <Field label="Email" value={contact.email} onChange={(v) => patch("contact", { email: v })} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Primary CTA"
          value={contact.primaryCta}
          onChange={(v) => patch("contact", { primaryCta: v })}
        />
        <Field
          label="Secondary CTA"
          value={contact.secondaryCta}
          onChange={(v) => patch("contact", { secondaryCta: v })}
        />
      </div>
    </Card>
  );
}

function MediaEditor() {
  const media = useContent((s) => s.media);
  const patch = useContent((s) => s.patch);

  const uploadAs =
    (key: "profilePhoto" | "resumeUrl") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => patch("media", { [key]: r.result as string });
      r.readAsDataURL(f);
    };

  return (
    <Card title="Media Library">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">
          Profile Photo
        </span>
        {media.profilePhoto && (
          <img src={media.profilePhoto} alt="" className="w-32 h-32 rounded-2xl object-cover" />
        )}
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={uploadAs("profilePhoto")}
            className="text-xs text-[#D7E2EA]/70"
          />
          {media.profilePhoto && (
            <button
              onClick={() => patch("media", { profilePhoto: "" })}
              className="text-xs text-red-400 underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#D7E2EA]/60">
          Resume (PDF)
        </span>
        {media.resumeUrl && (
          <a
            href={media.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#4a9eff] underline truncate"
          >
            View resume
          </a>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={uploadAs("resumeUrl")}
            className="text-xs text-[#D7E2EA]/70"
          />
          {media.resumeUrl && (
            <button
              onClick={() => patch("media", { resumeUrl: "" })}
              className="text-xs text-red-400 underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[#D7E2EA]/40 mt-4">
        Files are stored locally in this browser. For cross-device persistence, enable Lovable
        Cloud.
      </p>
    </Card>
  );
}

function AccessLogPanel() {
  const [log, setLog] = useState<AccessLogEntry[]>([]);
  useEffect(() => {
    setLog(getAccessLog());
  }, []);
  return (
    <Card title="Admin Access Log">
      {log.length === 0 ? (
        <p className="text-sm text-[#D7E2EA]/50">No access events recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {log.map((l, i) => (
            <li
              key={i}
              className="text-xs text-[#D7E2EA]/70 flex flex-col gap-0.5 p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="text-[#D7E2EA]">{new Date(l.time).toLocaleString()}</span>
              <span className="opacity-60 truncate">{l.userAgent}</span>
              <span className="opacity-60">{l.platform}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
