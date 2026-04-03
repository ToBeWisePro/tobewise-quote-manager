"use client";
import React from "react";

export type InputType = "text" | "textarea" | "url" | "array";

export interface FieldConfig {
  name: string;
  label: string;
  type: InputType;
  placeholder?: string;
}

interface DynamicFormProps<T extends Record<string, unknown>> {
  data: T;
  setData: (d: T) => void;
  fields: FieldConfig[];
}

export default function DynamicForm<T extends Record<string, unknown>>({
  data,
  setData,
  fields,
}: DynamicFormProps<T>) {
  const handleChange = <K extends keyof T>(name: K, value: T[K]) => {
    setData({ ...data, [name]: value });
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => {
        const key = field.name as keyof T;
        const value = data[key] ?? "";
        const helperText =
          field.type === "textarea"
            ? "Keep this readable and scannable."
            : field.type === "array"
              ? "Separate items with commas."
              : field.type === "url"
                ? "Paste a full URL."
                : "Edit the value directly.";

        switch (field.type) {
          case "textarea":
            return (
              <div key={field.name} className="dashboard-field-group md:col-span-2">
                <label htmlFor={field.name} className="dashboard-label">
                  {field.label}
                </label>
                <textarea
                  id={field.name}
                  value={value as string}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(key, e.target.value as T[keyof T])}
                  className="textarea textarea-bordered min-h-[180px] w-full text-slate-800"
                />
                <p className="dashboard-hint">{helperText}</p>
              </div>
            );
          case "array":
            return (
              <div key={field.name} className="dashboard-field-group">
                <label htmlFor={field.name} className="dashboard-label">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  type="text"
                  value={(value as string[]).join(", ")}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    handleChange(
                      key,
                      e.target.value.split(",").map((s) => s.trim()) as T[keyof T],
                    )
                  }
                  className="input input-bordered w-full text-slate-800"
                />
                <p className="dashboard-hint">{helperText}</p>
              </div>
            );
          default:
            return (
              <div key={field.name} className="dashboard-field-group">
                <label htmlFor={field.name} className="dashboard-label">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  type={field.type}
                  value={value as string}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(key, e.target.value as T[keyof T])}
                  className="input input-bordered w-full text-slate-800"
                />
                <p className="dashboard-hint">{helperText}</p>
              </div>
            );
        }
      })}
    </div>
  );
}
