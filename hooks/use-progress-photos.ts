"use client";

import { useCallback, useEffect, useState } from "react";

const DB_NAME = "bodyfi-private-photos";
const STORE_NAME = "photos";

export interface ProgressPhoto {
  id: string;
  date: string;
  stage: string;
  weight?: number;
  view: "front" | "side" | "back";
  blob: Blob;
  url: string;
}

interface StoredPhoto extends Omit<ProgressPhoto, "url"> {}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredPhotos(): Promise<StoredPhoto[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredPhoto[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function writePhoto(photo: StoredPhoto): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(photo);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

async function deletePhoto(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function withUrls(photos: StoredPhoto[]): ProgressPhoto[] {
  return photos
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((photo) => ({ ...photo, url: URL.createObjectURL(photo.blob) }));
}

export function useProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void readStoredPhotos()
      .then((stored) => {
        if (active) setPhotos(withUrls(stored));
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const addPhoto = useCallback(
    async (input: Omit<StoredPhoto, "id">) => {
      const stored: StoredPhoto = { ...input, id: crypto.randomUUID() };
      await writePhoto(stored);
      setPhotos((current) =>
        [...current, { ...stored, url: URL.createObjectURL(stored.blob) }].sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
    },
    []
  );

  const removePhoto = useCallback(async (id: string) => {
    await deletePhoto(id);
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((photo) => photo.id !== id);
    });
  }, []);

  return { photos, ready, addPhoto, removePhoto };
}
