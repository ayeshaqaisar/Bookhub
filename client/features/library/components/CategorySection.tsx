import { BookCard, type BookCardData } from './BookCard';
import { LucideIcon } from 'lucide-react';

export interface Category {
  id: 'fiction' | 'nonfiction' | 'children' | 'all';
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  books: BookCardData[];
}

interface CategorySectionProps {
  category: Category;
  emptyMessage?: string;
  getFavoriteState?: (bookId: string) => boolean;
  onToggleFavorite?: (bookId: string) => void;
  isTogglingFavorite?: string | null;
}

export function CategorySection({
  category,
  emptyMessage = 'No books found in this category',
  getFavoriteState,
  onToggleFavorite,
  isTogglingFavorite,
}: CategorySectionProps) {
  const Icon = category.icon;
  const hasChatFeature = category.id === 'fiction' || category.id === 'children';

  return (
    <div className="space-y-6">
      {/* Category Header */}
      <div className="flex items-center gap-4">
        <div
          className={`h-12 w-12 rounded-lg bg-${category.color} flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 text-${category.color}-foreground`} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{category.title}</h2>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
      </div>

      {/* Books Grid */}
      {category.books.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {category.books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              hasChatFeature={hasChatFeature}
              isFavorite={getFavoriteState ? getFavoriteState(book.id) : false}
              onToggleFavorite={onToggleFavorite}
              isTogglingFavorite={isTogglingFavorite === book.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
