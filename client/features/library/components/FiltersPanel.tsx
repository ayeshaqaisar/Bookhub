import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, X } from 'lucide-react';

interface FiltersPanelProps {
  genres: string[];
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
  onClearGenres: () => void;
}

export function FiltersPanel({
  genres,
  selectedGenres,
  onGenreToggle,
  onClearGenres,
}: FiltersPanelProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {/* Genre Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ChevronDown className="h-4 w-4" />
            Genres
            {selectedGenres.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedGenres.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Filter by genre</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearGenres}
              disabled={selectedGenres.length === 0}
              className="h-6"
            >
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          </div>
          <div className="max-h-64 overflow-auto space-y-2 pr-2">
            {genres.map((genre) => (
              <label
                key={genre}
                className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground transition-colors"
              >
                <Checkbox
                  checked={selectedGenres.includes(genre)}
                  onCheckedChange={() => onGenreToggle(genre)}
                />
                <span>{genre}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Genre Tags */}
      {selectedGenres.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => onGenreToggle(genre)}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              {genre}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
