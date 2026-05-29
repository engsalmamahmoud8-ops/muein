import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

export function ImageUploader({ value, onChange, bucket = "request-images", max = 5 }: {
  value: string[]; onChange: (urls: string[]) => void; bucket?: string; max?: number;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    if (value.length + files.length > max) { toast.error(`الحد الأقصى ${max} صور`); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} > 5MB`); continue; }
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file);
        if (error) { toast.error(error.message); continue; }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      onChange([...value, ...uploaded]);
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {value.map((u, i) => (
          <div key={u} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted">
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1 end-1 h-7 w-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center text-muted-foreground cursor-pointer">
            <Upload className="h-5 w-5 mb-1" />
            <span className="text-xs">{uploading ? "..." : "رفع"}</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => handleFiles(e.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}
