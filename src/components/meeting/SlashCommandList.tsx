import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { cn } from "@/lib/utils";

export interface SlashItem {
  group: string;
  title: string;
  icon: string;
  command: (args: { editor: any; range: any }) => void;
}

interface Props {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashCommandList = forwardRef<unknown, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = (i: number) => {
    const item = items[i];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
        결과 없음
      </div>
    );
  }

  // group items in declaration order
  const groups: { name: string; items: { item: SlashItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    let g = groups.find((x) => x.name === item.group);
    if (!g) {
      g = { name: item.group, items: [] };
      groups.push(g);
    }
    g.items.push({ item, index });
  });

  return (
    <div className="max-h-[360px] w-[520px] overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
      {groups.map((g) => (
        <div key={g.name} className="mb-1">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{g.name}</div>
          <div className="grid grid-cols-3 gap-0.5">
            {g.items.map(({ item, index }) => (
              <button
                key={item.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(index);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selectedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background text-xs font-medium">
                  {item.icon}
                </span>
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
export default SlashCommandList;
