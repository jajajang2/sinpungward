import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useMemo } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface Props {
  content: string;
}

/**
 * Renders meeting content. New records store BlockNote JSON; legacy records
 * store plain text or HTML and are rendered as-is.
 */
export default function BlockNoteReadOnly({ content }: Props) {
  const parsed = useMemo(() => {
    if (!content) return null;
    try {
      const j = JSON.parse(content);
      if (Array.isArray(j) && j.length > 0) return j;
    } catch {
      // fall through
    }
    return null;
  }, [content]);

  const editor = useCreateBlockNote({
    initialContent: (parsed ?? undefined) as any,
  });

  if (!parsed) {
    // Legacy fallback – render as HTML/text
    return (
      <div
        className="meeting-editor prose prose-sm max-w-none whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="blocknote-wrapper">
      <BlockNoteView editor={editor} editable={false} theme="light" />
    </div>
  );
}
