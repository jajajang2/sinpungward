import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface ExcelRow {
  이름?: string;
  성별?: string;
  나이?: number;
  생년월일?: string | number;
  전화번호?: string | number;
  이메일?: string;
  비고?: string;
}

const ExcelImportDialog = ({ open, onClose, onImported }: ExcelImportDialogProps) => {
  const { toast } = useToast();
  const [preview, setPreview] = useState<ExcelRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);
      setPreview(rows.slice(0, 10));
    };
    reader.readAsArrayBuffer(file);
  };

  const parseDate = (val: string | number | undefined): string | null => {
    if (!val) return null;
    if (typeof val === 'number') {
      // Excel serial date
      const date = XLSX.SSF.parse_date_code(val);
      return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
    const str = String(val).replace(/[년월]/g, '-').replace(/일/g, '').replace(/\./g, '-').trim();
    return str || null;
  };

  const handleImport = async () => {
    if (!fileRef.current?.files?.[0]) return;
    setImporting(true);
    const file = fileRef.current.files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

      const records = rows
        .filter(r => r.이름)
        .map(r => ({
          name: String(r.이름 || '').trim(),
          gender: r.성별 === '남' || r.성별 === '여' ? r.성별 : null,
          birth_date: parseDate(r.생년월일),
          phone: r.전화번호 ? String(r.전화번호) : null,
          email: r.이메일 || null,
          notes: r.비고 || null,
        }));

      const { error } = await supabase.from('members').insert(records);
      setImporting(false);
      if (error) {
        toast({ title: '가져오기 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '가져오기 완료', description: `${records.length}명의 회원이 추가되었습니다.` });
        onImported();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Excel 가져오기</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format guide */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              엑셀 파일 형식 안내
            </div>
            <p className="text-muted-foreground text-xs mb-2">첫 번째 행은 반드시 아래 열 이름을 포함해야 합니다:</p>
            <div className="flex flex-wrap gap-1.5">
              {['이름', '성별', '나이', '생년월일', '전화번호', '이메일', '비고'].map(col => (
                <span key={col} className={`px-2 py-0.5 rounded text-xs font-medium ${col === '이름' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>{col}</span>
              ))}
            </div>
          </div>

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            {fileName ? (
              <p className="font-medium text-sm text-foreground">{fileName}</p>
            ) : (
              <>
                <p className="font-medium text-sm text-foreground">Excel 파일을 클릭해서 선택하세요</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls 파일 지원</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-foreground">미리보기 (최대 10행)</p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-[hsl(var(--table-header))]">
                      {Object.keys(preview[0]).map(k => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-foreground">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-muted-foreground">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleImport} disabled={!preview.length || importing}>
            <Upload className="w-4 h-4 mr-1.5" />
            {importing ? '가져오는 중...' : '가져오기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelImportDialog;
