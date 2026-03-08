import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

// Processed row for display and insert
interface ProcessedRow {
  이름: string;
  성별: string;
  나이: string;
  생년월일: string;
  전화번호: string;
  이메일: string;
  비고: string;
  // raw values for DB insert
  _name: string;
  _gender: string | null;
  _birth_date: string | null;
  _phone: string | null;
  _email: string | null;
  _notes: string | null;
}

/** Excel 시리얼 숫자 → YYYY-MM-DD */
function excelDateToString(serial: number): string {
  const date = XLSX.SSF.parse_date_code(serial);
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

/** 날짜 값 파싱 (숫자 시리얼 / 문자열 / Date 객체 모두 처리) */
function parseDate(val: unknown): string | null {
  if (!val && val !== 0) return null;

  // JS Date object (cellDates: true 옵션 사용 시)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }

  // Excel serial number
  if (typeof val === 'number') {
    try {
      return excelDateToString(val);
    } catch {
      return null;
    }
  }

  // String: "1986-01-21", "1986.01.21", "1986년 1월 21일" 등
  if (typeof val === 'string') {
    const cleaned = val
      .replace(/년\s*/g, '-')
      .replace(/월\s*/g, '-')
      .replace(/일/g, '')
      .replace(/\./g, '-')
      .trim();

    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

    // Try parsing
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  return null;
}

/** 전화번호를 문자열로 변환 (숫자형으로 저장된 경우 처리) */
function parsePhone(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  // 숫자만 있는 경우 010으로 시작하도록 처리
  return str;
}

/** Raw XLSX row → ProcessedRow */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processRow(raw: Record<string, any>): ProcessedRow {
  const name   = String(raw['이름']   || '').trim();
  const gender = String(raw['성별']   || '').trim();
  const birth  = parseDate(raw['생년월일']);
  const phone  = parsePhone(raw['전화번호']);
  const email  = String(raw['이메일'] || '').trim() || null;
  const notes  = String(raw['비고']   || '').trim() || null;

  return {
    이름:   name,
    성별:   gender || '-',
    나이:   raw['나이'] != null ? String(raw['나이']) : '-',
    생년월일: birth || String(raw['생년월일'] || '-'),
    전화번호: phone || '-',
    이메일:  email || '-',
    비고:   notes || '-',
    _name:       name,
    _gender:     gender === '남' || gender === '여' ? gender : null,
    _birth_date: birth,
    _phone:      phone,
    _email:      email,
    _notes:      notes,
  };
}

const COLUMNS: (keyof Pick<ProcessedRow, '이름'|'성별'|'나이'|'생년월일'|'전화번호'|'이메일'|'비고'>)[] =
  ['이름', '성별', '나이', '생년월일', '전화번호', '이메일', '비고'];

const ExcelImportDialog = ({ open, onClose, onImported }: ExcelImportDialogProps) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const readWorkbook = (file: File, callback: (wb: XLSX.WorkBook) => void) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      // cellDates: true → 날짜 셀을 JS Date 로 파싱
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      callback(wb);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    readWorkbook(file, (wb) => {
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const processed = rawRows.filter(r => r['이름']).map(processRow);
      setTotalCount(processed.length);
      setRows(processed.slice(0, 10));
    });
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);

    readWorkbook(file, async (wb) => {
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const records = rawRows
        .filter(r => r['이름'])
        .map(r => {
          const p = processRow(r);
          return {
            name:       p._name,
            gender:     p._gender,
            birth_date: p._birth_date,
            phone:      p._phone,
            email:      p._email,
            notes:      p._notes,
          };
        });

      const { error } = await supabase.from('members').insert(records);
      setImporting(false);
      if (error) {
        toast({ title: '가져오기 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '가져오기 완료', description: `${records.length}명의 회원이 추가되었습니다.` });
        onImported();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Excel 가져오기</DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Format guide */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              엑셀 파일 형식 안내
            </div>
            <p className="text-muted-foreground text-xs mb-2">첫 번째 행은 반드시 아래 열 이름을 포함해야 합니다:</p>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.map(col => (
                <span key={col} className={`px-2 py-0.5 rounded text-xs font-medium ${col === '이름' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>{col}</span>
              ))}
            </div>
          </div>

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="font-medium text-sm text-foreground">{fileName}</p>
                {totalCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {totalCount}명
                  </span>
                )}
              </div>
            ) : (
              <>
                <p className="font-medium text-sm text-foreground">Excel 파일을 클릭해서 선택하세요</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls 파일 지원</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-foreground">
                미리보기 (최대 10행 / 전체 {totalCount}명)
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-[hsl(var(--table-header))]">
                      {COLUMNS.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-t border-border ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                        {COLUMNS.map(col => (
                          <td key={col} className="px-3 py-1.5 text-foreground whitespace-nowrap">
                            {row[col] === '-'
                              ? <span className="text-muted-foreground/40">-</span>
                              : row[col]
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleImport} disabled={!rows.length || importing}>
            <Upload className="w-4 h-4 mr-1.5" />
            {importing ? `가져오는 중...` : `${totalCount}명 가져오기`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelImportDialog;
