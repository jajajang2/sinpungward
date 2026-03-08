import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Camera, Trash2, Upload } from "lucide-react";

interface PhotoUploadProps {
  memberId: string;
  currentPhotoUrl?: string | null;
  memberName: string;
  gender?: string;
  onPhotoUpdated: (url: string | null) => void;
}

const PhotoUpload = ({ memberId, currentPhotoUrl, memberName, gender, onPhotoUpdated }: PhotoUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: '이미지 파일만 업로드 가능합니다.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: '파일 크기는 5MB 이하여야 합니다.', variant: 'destructive' });
      return;
    }

    setUploading(true);

    // Delete old photo if exists
    if (currentPhotoUrl) {
      const oldPath = currentPhotoUrl.split('/member-photos/')[1];
      if (oldPath) {
        await supabase.storage.from('member-photos').remove([oldPath]);
      }
    }

    const ext = file.name.split('.').pop();
    const filePath = `${memberId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: '업로드 실패', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('member-photos')
      .getPublicUrl(filePath);

    await supabase.from('members').update({ photo_url: publicUrl }).eq('id', memberId);
    onPhotoUpdated(publicUrl);
    toast({ title: '사진이 업로드되었습니다.' });
    setUploading(false);

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!currentPhotoUrl) return;
    if (!confirm('사진을 삭제하시겠습니까?')) return;

    const oldPath = currentPhotoUrl.split('/member-photos/')[1];
    if (oldPath) {
      await supabase.storage.from('member-photos').remove([oldPath]);
    }
    await supabase.from('members').update({ photo_url: null }).eq('id', memberId);
    onPhotoUpdated(null);
    toast({ title: '사진이 삭제되었습니다.' });
  };

  const initials = memberName.charAt(0);
  const isFemale = gender === '여';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Photo circle */}
      <div className="relative group">
        <div className={`w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md flex items-center justify-center ${
          isFemale ? 'bg-pink-100' : 'bg-blue-100'
        }`}>
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt={memberName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={`text-3xl font-bold ${isFemale ? 'text-pink-400' : 'text-blue-400'}`}>
              {initials}
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-accent"
        >
          <Upload className="w-3 h-3" />
          {uploading ? '업로드 중...' : '사진 업로드'}
        </button>
        {currentPhotoUrl && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors px-2 py-1 rounded-md hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" />
            삭제
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

export default PhotoUpload;
