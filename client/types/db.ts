export interface DbBook {
  id: string;
  title: string;
  author: string;
  category: "fiction" | "nonfiction" | "children";
  age_group: string | null;
  description: string | null;
  genre: string | null;
  cover_url: string | null;
  file_url: string | null;
  created_at: string;
  has_characters?: boolean;
}
