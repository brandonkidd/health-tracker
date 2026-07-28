"use client";

import { FormEvent, useState } from "react";
import { ptDateKey } from "@/lib/health/date";
import { useProgressPhotos } from "@/hooks/use-progress-photos";
import { Card, EmptyState, Field, SectionHeader, StatusBadge } from "./ui";

export function PhotoTimeline() {
  const { photos, ready, addPhoto, removePhoto } = useProgressPhotos();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const data = new FormData(event.currentTarget);
    await addPhoto({
      date: String(data.get("date")),
      stage: String(data.get("stage")),
      weight: data.get("weight") ? Number(data.get("weight")) : undefined,
      view: String(data.get("view")) as "front" | "side" | "back",
      blob: file,
    });
    setFile(null);
    setOpen(false);
  }

  return (
    <Card>
      <SectionHeader
        eyebrow="Private visual record"
        title="Progress photo timeline"
        action={
          <button className="hc-button hc-button-secondary" onClick={() => setOpen(!open)}>
            Add photo
          </button>
        }
      />
      <div className="hc-privacy-note">
        <span>⌁</span>
        <div>
          <strong>Stored only in this browser</strong>
          <small>Photos do not enter cloud sync or JSON backups. Deleting browser site data removes them.</small>
        </div>
      </div>

      {open && (
        <form className="hc-photo-form" onSubmit={submit}>
          <Field label="Photo">
            <input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Date">
            <input required name="date" type="date" defaultValue={ptDateKey()} />
          </Field>
          <Field label="Stage">
            <select name="stage" defaultValue="Now">
              <option>Now</option>
              <option>Cut · 180</option>
              <option>Cut · 170</option>
              <option>Build · 175</option>
              <option>Build · 185</option>
            </select>
          </Field>
          <Field label="View">
            <select name="view" defaultValue="front">
              <option value="front">Front</option>
              <option value="side">Side</option>
              <option value="back">Back</option>
            </select>
          </Field>
          <Field label="Weight (lb)">
            <input name="weight" type="number" step="0.1" />
          </Field>
          <button className="hc-button" type="submit" disabled={!file}>Save privately</button>
        </form>
      )}

      {!ready ? (
        <EmptyState>Opening your private photo library…</EmptyState>
      ) : photos.length ? (
        <div className="hc-photo-strip">
          {photos.map((photo) => (
            <article className="hc-photo-card" key={photo.id}>
              {/* IndexedDB object URLs are intentionally rendered with a native image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`${photo.stage} ${photo.view} progress on ${photo.date}`} />
              <div>
                <span>{photo.stage}</span>
                <strong>{photo.weight ? `${photo.weight} lb` : photo.view}</strong>
                <small>{photo.date} · {photo.view}</small>
              </div>
              <button onClick={() => void removePhoto(photo.id)} aria-label={`Delete ${photo.stage} photo`}>×</button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>
          Add consistent front, side, and back photos in the same lighting and distance. Your actual timeline will sit beside the stylized projection model.
        </EmptyState>
      )}
      <p className="hc-disclaimer">Projected models are illustrative. Progress photos and measured scans are the visual record of what actually changed.</p>
    </Card>
  );
}
