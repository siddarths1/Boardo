"use client";

import { useState } from "react";

type ProjectFormProps = {
  initialName?: string;
  initialOrder?: number;
  onSubmit: (data: { name: string; order?: number }) => Promise<void>;
  onCancel?: () => void;
};

export function ProjectForm({ initialName = "", initialOrder = 0, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initialName);
  const [order, setOrder] = useState(initialOrder);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), order });
      setName("");
      setOrder(0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-gray-700">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. General"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-48"
        />
      </div>
      <div>
        <label htmlFor="project-order" className="mb-1 block text-sm font-medium text-gray-700">
          Order
        </label>
        <input
          id="project-order"
          type="number"
          min={0}
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          className="block w-20 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : initialName ? "Update" : "Add project"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
