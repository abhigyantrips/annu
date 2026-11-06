import type { Dimension, Label, Site } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queries";

import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import { api } from "@/lib/api";
export function LabelSettings({
  site,
  initialDimension,
  onClose,
}: {
  site: Site;
  initialDimension: Dimension;
  onClose: () => void;
}) {
  const [dimension, setDimension] = useState(initialDimension),
    [name, setName] = useState(""),
    [values, setValues] = useState(""),
    [editing, setEditing] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const labelsQuery = useQuery({
    queryKey: ["labels", site.id],
    queryFn: ({ signal }) =>
      api<Label[]>(`/api/sites/${site.id}/labels`, undefined, "GET", signal),
  });
  const labels = labelsQuery.data ?? [];
  const load = async () => {
    await queryClient.invalidateQueries({ queryKey: ["labels", site.id] });
    await queryClient.invalidateQueries({
      queryKey: ["analytics", site.id, "report"],
    });
  };
  return (
    <Modal title="UTM Labels" onClose={onClose}>
      <p className="muted">
        Combine several raw UTM values under one readable label. Each dimension
        has its own labels.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(`/api/sites/${site.id}/labels`, {
              id: editing,
              dimension,
              name,
              values: values
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            });
            setName("");
            setValues("");
            setEditing(undefined);
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-2">
          <span className="text-sm font-medium">Dimension</span>
          <SelectField
            label="Dimension"
            value={dimension}
            disabled={!!editing}
            onValueChange={(value) => setDimension(value as Dimension)}
            options={["source", "medium", "campaign"].map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
          />
        </div>
        <label>
          Display Label
          <Input
            required
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="ABC WhatsApp Group"
          />
        </label>
        <label>
          Raw Values{" "}
          <span className="subtle">one per line · exact, case-sensitive</span>
          <Textarea
            required
            rows={4}
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder={"abc\nabc_group\nabc_grp"}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {editing && (
            <Button
              type="button"
              onClick={() => {
                setEditing(undefined);
                setName("");
                setValues("");
              }}
            >
              Cancel Edit
            </Button>
          )}
          <Button type="submit" variant="default" disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}{" "}
            {editing ? "Save Label" : "Add Label"}
          </Button>
        </div>
      </form>
      {labelsQuery.error && (
        <p role="alert" className="error">
          {labelsQuery.error.message}
          <Button onClick={() => void labelsQuery.refetch()}>Try Again</Button>
        </p>
      )}
      {labelsQuery.isPending && <p className="loading">Loading Labels…</p>}
      <div className="label-list">
        {labels
          .filter((l) => l.dimension === dimension)
          .map((l) => (
            <div key={l.id}>
              <Button
                variant="link"
                onClick={() => {
                  setEditing(l.id);
                  setName(l.name);
                  setValues(l.values.join("\n"));
                }}
              >
                <strong>{l.name}</strong>
                <small>{l.values.join(", ")}</small>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${l.name}`}
                onClick={async () => {
                  try {
                    await api(
                      `/api/sites/${site.id}/labels/${l.id}`,
                      undefined,
                      "DELETE",
                    );
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
      </div>
    </Modal>
  );
}
