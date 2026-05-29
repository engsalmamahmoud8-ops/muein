import { supabase } from "@/integrations/supabase/client";

export type NoteWithAuthor = {
  id: string;
  request_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: { full_name: string | null } | null;
};

export async function fetchNotesWithAuthors(requestId: string): Promise<NoteWithAuthor[]> {
  const { data: notes } = await supabase
    .from("request_notes")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at");
  const list = notes ?? [];
  if (list.length === 0) return [];
  const ids = [...new Set(list.map(n => n.author_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  const map = new Map((profiles ?? []).map(p => [p.id as string, p as { id: string; full_name: string | null }]));
  return list.map(n => ({ ...n, author: map.get(n.author_id) ? { full_name: map.get(n.author_id)!.full_name } : null }));
}
