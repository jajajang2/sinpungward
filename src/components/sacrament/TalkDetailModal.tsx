import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialTopic: string;
  initialContent: string;
  onSave: (topic: string, content: string) => Promise<void> | void;
}

export default function TalkDetailModal({ open, onOpenChange, title, initialTopic, initialContent, onSave }: Props) {
  const [topic, setTopic] = useState(initialTopic);
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (open) {
      setTopic(initialTopic);
      setContent(initialContent);
    }
  }, [open, initialTopic, initialContent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" mobileVariant="fullscreen">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">주제</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="말씀 주제" />
          </div>
          <div>
            <Label className="text-xs">내용</Label>
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="말씀 내용" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            onClick={async () => {
              await onSave(topic, content);
              onOpenChange(false);
            }}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
