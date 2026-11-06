import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import React from "react";

export function SelectField({
  value,
  onValueChange,
  options,
  label,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className={cn("w-full", className)}>
        {options.find((option) => option.value === value)?.icon}
        <SelectValue
          placeholder={label}
          data-initial={
            options
              .find((option) => option.value === value)
              ?.label[0]?.toUpperCase() || "+"
          }
        />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className={
          options.some((option) => option.icon)
            ? "site-picker-options"
            : undefined
        }
      >
        <>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon}
              {option.label}
            </SelectItem>
          ))}
        </>
      </SelectContent>
    </Select>
  );
}
