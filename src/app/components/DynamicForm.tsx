"use client";
import React from "react";

export type InputType = "text" | "textarea" | "url" | "array";

export interface FieldConfig {
  name: string;
  label: string;
  type: InputType;
  placeholder?: string;
}

interface DynamicFormProps<T extends Record<string, any>> {
  data: T;
  setData: (d: T) => void;
  fields: FieldConfig[];
}

export default function DynamicForm<T extends Record<string, any>>({
  data,
  setData,
  fields,
}: DynamicFormProps<T>) {
  const handleChange = (name: string, value: any) => {
    setData({ ...data, [name]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = data[field.name] ?? "";
        switch (field.type) {
          case "textarea":
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <label htmlFor={field.name} className="font-medium text-gray-700">
                  {field.label}
                </label>
                <textarea
                  id={field.name}
                  value={value as string}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="textarea textarea-bordered w-full text-gray-800 min-h-[100px]"
                />
              </div>
            );
          case "array":
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <label htmlFor={field.name} className="font-medium text-gray-700">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  type="text"
                  value={(value as string[]).join(", ")}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    handleChange(
                      field.name,
                      e.target.value.split(",").map((s) => s.trim()),
                    )
                  }
                  className="input input-bordered w-full text-gray-800"
                />
              </div>
            );
          default:
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <label htmlFor={field.name} className="font-medium text-gray-700">
                  {field.label}
                </label>
                <input
                  id={field.name}
                  type={field.type}
                  value={value as string}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="input input-bordered w-full text-gray-800"
                />
              </div>
            );
        }
      })}
    </div>
  );
}
