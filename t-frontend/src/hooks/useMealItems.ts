"use client";

import { useCallback, useState } from "react";
import { createEmptyItem, type FoodItemFormValues } from "@/lib/validation/mealForm";
import { createEmptyMicroRow, type MicronutrientRow } from "@/lib/validation/micronutrientRows";

export type ItemChanges = Partial<Omit<FoodItemFormValues, "id" | "microRows">>;
export type MicroRowChanges = Partial<Omit<MicronutrientRow, "id">>;

export interface UseMealItemsResult {
  items: FoodItemFormValues[];
  addItem: () => void;
  removeItem: (itemId: string) => void;
  updateItem: (itemId: string, changes: ItemChanges) => void;
  /** Swaps every item, as when a photo draft or pasted JSON fills the form. */
  replaceItems: (items: FoodItemFormValues[]) => void;
  addMicroRow: (itemId: string, name?: string) => void;
  updateMicroRow: (itemId: string, rowId: string, changes: MicroRowChanges) => void;
  removeMicroRow: (itemId: string, rowId: string) => void;
}

/** Owns the meal form's items and each item's micronutrient rows. The form always keeps at least one item. */
export function useMealItems(initialItems?: FoodItemFormValues[]): UseMealItemsResult {
  const [items, setItems] = useState<FoodItemFormValues[]>(() =>
    initialItems && initialItems.length > 0 ? initialItems : [createEmptyItem()]
  );

  const mapItem = useCallback((itemId: string, change: (item: FoodItemFormValues) => FoodItemFormValues) => {
    setItems((current) => current.map((item) => (item.id === itemId ? change(item) : item)));
  }, []);

  const addItem = useCallback(() => setItems((current) => [...current, createEmptyItem()]), []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => (current.length === 1 ? [createEmptyItem()] : current.filter((item) => item.id !== itemId)));
  }, []);

  const updateItem = useCallback(
    (itemId: string, changes: ItemChanges) => mapItem(itemId, (item) => ({ ...item, ...changes })),
    [mapItem]
  );

  const replaceItems = useCallback((next: FoodItemFormValues[]) => {
    setItems(next.length > 0 ? next : [createEmptyItem()]);
  }, []);

  const addMicroRow = useCallback(
    (itemId: string, name = "") =>
      mapItem(itemId, (item) => {
        // A quick-add pill fills the first blank row before adding another.
        const blankIndex = item.microRows.findIndex((row) => !row.name.trim() && !row.amount.trim());
        if (name && blankIndex !== -1) {
          return { ...item, microRows: item.microRows.map((row, index) => (index === blankIndex ? { ...row, name } : row)) };
        }
        return { ...item, microRows: [...item.microRows, { ...createEmptyMicroRow(), name }] };
      }),
    [mapItem]
  );

  const updateMicroRow = useCallback(
    (itemId: string, rowId: string, changes: MicroRowChanges) =>
      mapItem(itemId, (item) => ({
        ...item,
        microRows: item.microRows.map((row) => (row.id === rowId ? { ...row, ...changes } : row)),
      })),
    [mapItem]
  );

  const removeMicroRow = useCallback(
    (itemId: string, rowId: string) =>
      mapItem(itemId, (item) => ({ ...item, microRows: item.microRows.filter((row) => row.id !== rowId) })),
    [mapItem]
  );

  return { items, addItem, removeItem, updateItem, replaceItems, addMicroRow, updateMicroRow, removeMicroRow };
}
