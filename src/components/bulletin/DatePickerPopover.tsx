import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Props {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
}

function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export default function DatePickerPopover({ value, onChange, className }: Props) {
  const date = parseDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-md px-1 py-1 text-left hover:bg-muted/60 transition-colors",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 shrink-0 opacity-60" />
          <span>{format(date, "yyyy'년' M'월' d'일'")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(format(d, "yyyy-MM-dd"))}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
