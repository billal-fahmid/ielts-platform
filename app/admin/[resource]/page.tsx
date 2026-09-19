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

export default function AdminResourcePage() {
  const params = useParams<{ resource: string }>();
  const resourceKey = params.resource;
  const meta = resourceMeta[resourceKey];
  const { push } = useToast();

  const [items, setItems] = useState<any[] | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);

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
      push("Could not delete", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{meta.label}</h1>
          <p className="mt-1 text-sm text-ink-soft">{items?.length ?? 0} total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        {items === null ? (
          <div className="p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={Inbox} title={`No ${meta.label.toLowerCase()} yet`} description="Create the first one to get started." action={<Button onClick={openCreate}>Create</Button>} />
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
                      {String(item[c] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(item)} className="rounded-md p-1.5 text-ink-soft hover:bg-primary-soft hover:text-primary">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(item)} className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
  initial,
  saving,
  onCancel,
  onSave,
}: {
  title: string;
  fields: FieldConfig[];
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
      } else if (f.type === "number") {
        payload[f.key] = values[f.key] === "" ? undefined : Number(values[f.key]);
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
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" || f.type === "json-list" ? (
                <Textarea rows={f.type === "json-list" ? 4 : 3} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
              ) : f.type === "select" ? (
                <Select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                  <option value="">Select...</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : f.type === "checkbox" ? (
                <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 accent-primary" />
              ) : (
                <Input type={f.type === "number" ? "number" : "text"} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
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
