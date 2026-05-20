import { Node, mergeAttributes } from "@tiptap/core";

export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "controls",
        class: "my-2 w-full rounded-md border border-border bg-black",
      }),
    ];
  },
});

export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "audio[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "audio",
      mergeAttributes(HTMLAttributes, {
        controls: "controls",
        class: "my-2 w-full",
      }),
    ];
  },
});

export const FileLink = Node.create({
  name: "fileLink",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      href: { default: "#" },
      name: { default: "파일" },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-file]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-file": "true",
        target: "_blank",
        rel: "noopener noreferrer",
        class:
          "my-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-primary hover:bg-muted",
      }),
      ["span", {}, `📎 ${HTMLAttributes.name ?? "파일"}`],
    ];
  },
});
