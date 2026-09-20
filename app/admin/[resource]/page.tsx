"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { resourceMeta, FieldConfig } from "@/lib/admin/field-config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, X, Inbox } from "lucide-react";
import { UploadButton } from "@/components/admin/upload-button";

/** Long labels (like a writing prompt) are cut so they fit a table cell or dropdown. */
function shorten(text: string, max = 60) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine;
}

/** The records a relation field can choose from, after applying its filter (e.g. only Task 1 prompts). */
function relationChoices(f: FieldConfig, relations: Record<string, any[]>) {
  const all = relations[f.relation!.resource] ?? [];
  const filter = f.relation!.filter;
  return filter ? all.filter((r) => r[filter.key] === filter.value) : all;
}

export default function AdminResourcePage() {
  const params = useParams<{ resource: string }>();
  const resourceKey = params.resource;
  const meta = resourceMeta[resourceKey];
  const { push } = useToast();

  const [items, setItems] = useState<any[] | null>(null);
  const [relations, setRelations] = useState<Record<string, any[]>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/admin/${resourceKey}`);
    const json = await res.json();
    setItems(res.ok ? json.items : []);
  };

  useEffect(() => {
    setItems(null);
    load();
    // Records that "relation" fields point to (e.g. a section's listening test), for dropdowns and list labels.
    setRelations({});
    (meta?.fields ?? [])
      .filter((f) => (f.type === "relation" || f.type === "relation-multi") && f.relation)
      .forEach(async (f) => {
        const target = f.relation!.resource;
        const res = await fetch(`/api/admin/${target}`);
        const json = await res.json().catch(() => ({ items: [] }));
        setRelations((r) => ({ ...r, [target]: res.ok ? json.items : [] }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);

  const cellText = (item: any, column: string) => {
    const field = meta?.fields.find((f) => f.key === column);
    const value = item[column];
    if (field?.type === "relation" && field.relation) {
      const target = relations[field.relation.resource]?.find((r) => r.id === value);
      return target ? shorten(String(target[field.relation.labelKey])) : "—";
    }
    if (field?.type === "relation-multi" && field.relation) {
      const labels = (Array.isArray(value) ? value : []).map((id: string) => {
        const target = relations[field.relation!.resource]?.find((r) => r.id === id);
        return target ? shorten(String(target[field.relation!.labelKey]), 28) : "?";
      });
      return labels.length ? labels.join(", ") : "—";
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (field?.type === "multi-select") return Array.isArray(value) && value.length ? `${value.length} selected` : "None";
    if (field?.type === "number" && value === null) return "Unlimited";
    return String(value ?? "—");
  };

  if (!meta) {
    return <EmptyState icon={Inbox} title="Unknown resource" description="This admin section doesn't exist." />;
  }

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (item: any) => {
    setEditing(item);
    setShowForm(true);
  };

  const save = async (data: Record<string, any>) => {
    setSaving(true);
    const url = editing ? `/api/admin/${resourceKey}/${editing.id}` : `/api/admin/${resourceKey}`;
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      push(json.error || "Could not save", "error");
      return;
    }
    push(editing ? "Updated" : "Created", "success");
    setShowForm(false);
    load();
  };

  const remove = async (item: any) => {
    if (!confirm(`Delete this ${meta.label.toLowerCase().slice(0, -1)}? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/${resourceKey}/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      push("Deleted", "success");
      load();
    } else {
      const json = await res.json().catch(() => ({}));
      push(json.error || "Could not delete", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{meta.label}</h1>
          <p className="mt-1 text-sm text-ink-soft">{items?.length ?? 0} total</p>
        </div>
        {meta.canCreate !== false && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New
          </Button>
        )}
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        {items === null ? (
          <div className="p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Inbox} title={`No ${meta.label.toLowerCase()} yet`} description="Create the first one to get started." action={meta.canCreate !== false ? <Button onClick={openCreate}>Create</Button> : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                {meta.listColumns.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">
                    {c}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-primary-soft/40">
                  {meta.listColumns.map((c) => (
                    <td key={c} className="max-w-[220px] truncate px-4 py-3 text-ink">
                      {cellText(item, c)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(item)} aria-label="Edit" className="rounded-md p-1.5 text-ink-soft hover:bg-primary-soft hover:text-primary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {meta.canDelete !== false && (
                        <button onClick={() => remove(item)} aria-label="Delete" className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showForm && (
        <ResourceFormModal
          title={editing ? `Edit ${meta.label.slice(0, -1)}` : `New ${meta.label.slice(0, -1)}`}
          fields={meta.fields}
          relations={relations}
          initial={editing}
          saving={saving}
          onCancel={() => setShowForm(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ResourceFormModal({
  title,
  fields,
  relations,
  initial,
  saving,
  onCancel,
  onSave,
}: {
  title: string;
  fields: FieldConfig[];
  relations: Record<string, any[]>;
  initial: any;
  saving: boolean;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "json-list") {
        v[f.key] = Array.isArray(initial?.[f.key]) ? initial[f.key].join("\n") : "";
      } else {
        v[f.key] = initial?.[f.key] ?? (f.type === "checkbox" ? false : "");
      }
    });
    return v;
  });

  const set = (key: string, val: any) => setValues((s) => ({ ...s, [key]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "json-list") {
        payload[f.key] = String(values[f.key] || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (f.readOnly) {
        // not sent
      } else if (f.type === "number") {
        payload[f.key] = values[f.key] === "" || values[f.key] === null ? (f.nullable ? null : undefined) : Number(values[f.key]);
      } else {
        payload[f.key] = values[f.key];
      }
    });
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button onClick={onCancel} className="text-ink-soft hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} group={f.type === "multi-select" || f.type === "relation-multi"}>
              {f.type === "textarea" || f.type === "json-list" ? (
                <Textarea rows={f.rows ?? (f.type === "json-list" ? 4 : 3)} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
              ) : f.type === "select" ? (
                <Select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                  <option value="">Select...</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : f.type === "relation" && f.relation ? (
                <Select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                  <option value="">Select...</option>
                  {relationChoices(f, relations).map((r) => (
                    <option key={r.id} value={r.id}>
                      {shorten(String(r[f.relation!.labelKey]))}
                    </option>
                  ))}
                </Select>
              ) : f.type === "relation-multi" && f.relation ? (
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border p-3">
                  {relationChoices(f, relations).length === 0 && <p className="text-xs text-ink-soft">Nothing to choose from yet.</p>}
                  {relationChoices(f, relations).map((r) => {
                    const checked = (values[f.key] as string[]).includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            set(f.key, e.target.checked ? [...values[f.key], r.id] : (values[f.key] as string[]).filter((x) => x !== r.id))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        {shorten(String(r[f.relation!.labelKey]))}
                      </label>
                    );
                  })}
                </div>
              ) : f.type === "multi-select" ? (
                <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                  {(f.options ?? []).map((o) => {
                    const checked = (values[f.key] as string[]).includes(o);
                    return (
                      <label key={o} className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => set(f.key, e.target.checked ? [...values[f.key], o] : (values[f.key] as string[]).filter((x) => x !== o))}
                          className="h-4 w-4 accent-primary"
                        />
                        {f.optionLabels?.[o] ?? o}
                      </label>
                    );
                  })}
                </div>
              ) : f.type === "checkbox" ? (
                <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-primary" />
              ) : (
                <>
                  <Input type={f.type === "number" ? "number" : "text"} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} readOnly={f.readOnly} disabled={f.readOnly} />
                  {f.upload && <UploadButton kinds={f.upload.kinds} visibility={f.upload.visibility} onUploaded={(url) => set(f.key, url)} />}
                </>
              )}
            </Field>
          ))}
          <div className="mt-2 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
