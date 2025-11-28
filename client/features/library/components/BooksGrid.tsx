import { BookCard, type BookCardData } from './BookCard';

interface BooksGridProps {
  books: BookCardData[];
  hasChatFeature?: boolean;
  emptyMessage?: string;
  isLoading?: boolean;
  getFavoriteState?: (bookId: string) => boolean;
  onToggleFavorite?: (bookId: string) => void;
  isTogglingFavorite?: string | null;
}

export function BooksGrid({
  books,
  hasChatFeature = false,
  emptyMessage = 'No books found',
  isLoading = false,
  getFavoriteState,
  onToggleFavorite,
  isTogglingFavorite,
}: BooksGridProps) {
  if (isLoading) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Loading books...
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-12">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {books.map((book) => (
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
  );
}
