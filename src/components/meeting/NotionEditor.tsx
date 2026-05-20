import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Indent,
  Outdent,
  Type,
  ChevronDown,
  Palette,
} from "lucide-react";
import { SlashCommand } from "./SlashCommand";
import { Video, Audio, FileLink } from "./MediaNodes";

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

const COLORS = ["#000000", "#374151", "#6B7280", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

export default function NotionEditor({
  value,
  onChange,
  placeholder = "텍스트를 입력하거나 /를 입력하여 명령을 입력하세요.",
  className,
}: Props) {
  const [bubble, setBubble] = useState<{ top: number; left: number; visible: boolean }>({ top: 0, left: 0, visible: false });
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      SlashCommand,
      Video,
      Audio,
      FileLink,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from === to || !containerRef.current) {
        setBubble((b) => ({ ...b, visible: false }));
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const rect = containerRef.current.getBoundingClientRect();
      const top = Math.min(start.top, end.top) - rect.top - 48;
      const left = (start.left + end.left) / 2 - rect.left;
      setBubble({ top: Math.max(0, top), left, visible: true });
    },
    onBlur: () => {
      setTimeout(() => setBubble((b) => ({ ...b, visible: false })), 150);
    },
    editorProps: {
      attributes: {
        class: "meeting-editor min-h-[420px] px-5 py-4 focus:outline-none prose prose-sm max-w-none",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const currentTypeLabel = editor.isActive("heading", { level: 1 })
    ? "제목1"
    : editor.isActive("heading", { level: 2 })
    ? "제목2"
    : editor.isActive("heading", { level: 3 })
    ? "제목3"
    : editor.isActive("blockquote")
    ? "인용"
    : "본문";

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-background cursor-text", className)}
      onClick={() => editor.commands.focus()}
    >
      {bubble.visible && (
        <div
          className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover px-1.5 py-1 shadow-lg"
          style={{ top: bubble.top, left: bubble.left, transform: "translateX(-50%)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Type dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowTypeMenu((v) => !v); setShowColorMenu(false); }}
              className="inline-flex h-8 items-center gap-1 rounded px-2 text-sm hover:bg-muted"
            >
              <Type className="h-3.5 w-3.5" />
              <span>{currentTypeLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTypeMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 w-32 rounded-md border border-border bg-popover py-1 shadow-md">
                {[
                  { label: "본문", run: () => editor.chain().focus().setParagraph().run() },
                  { label: "제목1", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
                  { label: "제목2", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
                  { label: "제목3", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
                  { label: "인용", run: () => editor.chain().focus().toggleBlockquote().run() },
                ].map((o) => (
                  <button key={o.label} onClick={() => { o.run(); setShowTypeMenu(false); }} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted">
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="mx-1 h-5 w-px bg-border" />

          <BubbleBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </BubbleBtn>

          <span className="mx-1 h-5 w-px bg-border" />

          <BubbleBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            <AlignLeft className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
            <AlignCenter className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
            <AlignRight className="h-3.5 w-3.5" />
          </BubbleBtn>

          <span className="mx-1 h-5 w-px bg-border" />

          <div className="relative">
            <BubbleBtn onClick={() => { setShowColorMenu((v) => !v); setShowTypeMenu(false); }}>
              <Palette className="h-3.5 w-3.5" />
            </BubbleBtn>
            {showColorMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-border bg-popover p-2 shadow-md">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { editor.chain().focus().setColor(c).run(); setShowColorMenu(false); }}
                    className="h-5 w-5 rounded-full border border-border"
                    style={{ background: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <BubbleBtn onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
            <Indent className="h-3.5 w-3.5" />
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().liftListItem("listItem").run()}>
            <Outdent className="h-3.5 w-3.5" />
          </BubbleBtn>

          <BubbleBtn
            onClick={() => {
              const url = window.prompt("링크 URL을 입력하세요");
              if (url) editor.chain().focus().setLink({ href: url }).run();
              else editor.chain().focus().unsetLink().run();
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
          </BubbleBtn>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function BubbleBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn("inline-flex h-8 w-8 items-center justify-center rounded text-sm transition-colors", active ? "bg-foreground text-background" : "hover:bg-muted")}
    >
      {children}
    </button>
  );
}
