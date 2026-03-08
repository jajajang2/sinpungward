import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const AddMemberDialog = ({ open, onClose, onSaved }: AddMemberDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    gender: '',
    birth_date: '',
    phone: '',
    email: '',
    occupation: '',
    address: '',
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: '필수 입력', description: '이름을 입력해주세요.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('members').insert({
      name: form.name.trim(),
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      phone: form.phone || null,
      email: form.email || null,
      occupation: form.occupation || null,
      address: form.address || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: '저장 오류', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '저장 완료', description: `${form.name} 회원이 추가되었습니다.` });
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>회원 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>이름 <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" />
            </div>
            <div className="space-y-1.5">
              <Label>성별</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="남">남</SelectItem>
                  <SelectItem value="여">여</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>생년월일</Label>
              <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>휴대폰</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>직업</Label>
              <Input value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} placeholder="직업" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>이메일</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>주소</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="주소를 입력하세요" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
