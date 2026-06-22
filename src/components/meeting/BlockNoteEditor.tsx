import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { locales } from "@blocknote/core/locales";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

/**
 * Parses stored content. We persist BlockNote documents as a JSON string in the
 * existing `content` text column. Legacy rows are plain text (or HTML) and are
 * shown as a single paragraph block on first edit. BlockNote 0.51 internally
 * normalizes 0.15-era JSON when fed via initialContent.
 */
function parseInitialContent(value: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // not JSON – treat as legacy plain text / HTML
  }
  const text = value.replace(/<[^>]+>/g, "").trim();
  if (!text) return undefined;
  return [
    {
      type: "paragraph",
      content: text,
    },
  ];
}

export default function BlockNoteEditorView({ value, onChange, className }: Props) {
  const initialContent = useMemo(() => parseInitialContent(value), []); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useCreateBlockNote({
    initialContent: initialContent as any,
    tables: {
      headers: true,
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
    },
  });

  useEffect(() => {
    if (!editor) return;
    const sub = editor.onChange(() => {
      onChange(JSON.stringify(editor.document));
    });
    return () => {
      if (typeof sub === "function") (sub as any)();
      else if (sub && typeof (sub as any).unsubscribe === "function") (sub as any).unsubscribe();
    };
  }, [editor, onChange]);

  return (
    <div className={cn("blocknote-wrapper bg-background", className)}>
      <BlockNoteView editor={editor} theme="light" />
    </div>
  );
}
