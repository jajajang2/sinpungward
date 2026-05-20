import { Extension, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import tippy, { Instance } from "tippy.js";
import SlashCommandList, { SlashItem } from "./SlashCommandList";

export const slashItems: SlashItem[] = [
  // 제목
  { group: "제목", title: "제목1", icon: "H1", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run() },
  { group: "제목", title: "제목2", icon: "H2", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run() },
  { group: "제목", title: "제목3", icon: "H3", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run() },
  // 기본 블록
  { group: "기본 블록", title: "인용", icon: "❝", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { group: "기본 블록", title: "번호 매기기 목록", icon: "1.", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { group: "기본 블록", title: "글머리 기호 목록", icon: "•", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { group: "기본 블록", title: "체크리스트", icon: "☑", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
  { group: "기본 블록", title: "본문", icon: "T", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
  { group: "기본 블록", title: "코드 블록", icon: "</>", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { group: "기본 블록", title: "구분선", icon: "—", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  // 고급
  { group: "고급", title: "표", icon: "⊞", command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  {
    group: "고급", title: "링크", icon: "🔗",
    command: ({ editor, range }) => {
      const url = window.prompt("링크 URL을 입력하세요");
      if (!url) { editor.chain().focus().deleteRange(range).run(); return; }
      const text = window.prompt("링크 텍스트 (선택)") || url;
      editor.chain().focus().deleteRange(range).insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a> `).run();
    },
  },
  // 미디어
  {
    group: "미디어", title: "이미지", icon: "🖼",
    command: ({ editor, range }) => {
      const url = window.prompt("이미지 URL을 입력하세요");
      if (url) editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      else editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    group: "미디어", title: "비디오", icon: "▶",
    command: ({ editor, range }) => {
      const url = window.prompt("비디오 URL (.mp4 등)을 입력하세요");
      if (url) editor.chain().focus().deleteRange(range).insertContent({ type: "video", attrs: { src: url } }).run();
      else editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    group: "미디어", title: "오디오", icon: "♪",
    command: ({ editor, range }) => {
      const url = window.prompt("오디오 URL (.mp3 등)을 입력하세요");
      if (url) editor.chain().focus().deleteRange(range).insertContent({ type: "audio", attrs: { src: url } }).run();
      else editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    group: "미디어", title: "파일", icon: "📎",
    command: ({ editor, range }) => {
      const url = window.prompt("파일 URL을 입력하세요");
      if (!url) { editor.chain().focus().deleteRange(range).run(); return; }
      const name = window.prompt("파일 이름 (선택)") || url.split("/").pop() || "파일";
      editor.chain().focus().deleteRange(range).insertContent({ type: "fileLink", attrs: { href: url, name } }).run();
    },
  },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) =>
          slashItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())).slice(0, 20),
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: Instance[] = [];
          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashCommandList, { props, editor: props.editor });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => {
              component?.updateProps(props);
              if (!props.clientRect) return;
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return (component?.ref as any)?.onKeyDown?.(props) ?? false;
            },
            onExit: () => {
              popup[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
