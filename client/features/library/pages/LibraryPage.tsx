import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Wand2, GraduationCap, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useAuth } from '@/contexts/AuthContext';
import { useBooksList } from '@/features/book/hooks/useBooksList';
import { useLibrary } from '@/features/library/hooks/useLibrary';
import { SearchBar } from '@/features/library/components/SearchBar';
import { FiltersPanel } from '@/features/library/components/FiltersPanel';
import { CategorySection, type Category } from '@/features/library/components/CategorySection';
import { BooksGrid } from '@/features/library/components/BooksGrid';
import type { BookCardData } from '@/features/library/components/BookCard';
import { toggleFavorite as toggleFavoriteAPI } from '@/lib/favorites';
import { useToast } from '@/hooks/use-toast';

export function LibraryPage() {
  // Hooks
  const { books, loading, error } = useBooksList();
  const { getUniqueGenres, actionFilterBooks } = useLibrary();
  const { user, isBookFavorite, addToFavorites, removeFromFavorites } = useAuth();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<string | null>(null);

  // Computed values
  const allGenres = useMemo(() => getUniqueGenres(books), [books, getUniqueGenres]);

  const categories: Category[] = useMemo(
    () => [
      {
        id: 'fiction',
        title: 'Fiction',
        description: 'Chat with characters, explore alternate scenarios, and dive into rich lore',
        icon: Wand2,
        color: 'purple',
        books: actionFilterBooks(
          books.filter((b) => b.category === 'fiction'),
          searchQuery,
          selectedGenres
        ),
      },
      {
        id: 'nonfiction',
        title: 'Non-Fiction',
        description: 'Ask our Q&A tutor that cites directly from the book',
        icon: GraduationCap,
        color: 'blue',
        books: actionFilterBooks(
          books.filter((b) => b.category === 'nonfiction'),
          searchQuery,
          selectedGenres
        ),
      },
      {
        id: 'children',
        title: "Children's Books",
        description: 'Curated section with character interaction, Q&A, and parental tips',
        icon: Users,
        color: 'green',
        books: actionFilterBooks(
          books.filter((b) => b.category === 'children'),
          searchQuery,
          selectedGenres
        ),
      },
    ],
    [books, searchQuery, selectedGenres, actionFilterBooks]
  );

  // Event handlers
  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleClearGenres = () => setSelectedGenres([]);

  const handleToggleFavorite = async (bookId: string) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add books to favorites',
      });
      return;
    }

    setIsTogglingFavorite(bookId);
    try {
      const isFavorite = isBookFavorite(bookId);
      await toggleFavoriteAPI(bookId, !isFavorite);

      if (isFavorite) {
        removeFromFavorites(bookId);
        toast({
          title: 'Removed',
          description: 'Removed from favorites',
        });
      } else {
        const book = books.find(b => b.id === bookId);
        if (book) {
          addToFavorites({
            bookId,
            title: book.title,
            author: book.author,
            coverUrl: book.cover_url || '/placeholder.svg',
            category: book.category
          });
          toast({
            title: 'Added',
            description: 'Added to favorites',
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
      });
    } finally {
      setIsTogglingFavorite(null);
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">BookHub Library</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Explore our collection of interactive books across fiction, non-fiction, and children's
              categories
            </p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search books, authors, or topics..."
            />

            <FiltersPanel
              genres={allGenres}
              selectedGenres={selectedGenres}
              onGenreToggle={handleGenreToggle}
              onClearGenres={handleClearGenres}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs for Categories */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all">All Books</TabsTrigger>
            <TabsTrigger value="fiction">Fiction</TabsTrigger>
            <TabsTrigger value="nonfiction">Non-Fiction</TabsTrigger>
            <TabsTrigger value="children">Children's</TabsTrigger>
          </TabsList>

          {/* All Books Tab */}
          <TabsContent value="all" className="space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              categories.map((category) => (
                <CategorySection
                  key={category.id}
                  category={category}
                  getFavoriteState={isBookFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  isTogglingFavorite={isTogglingFavorite}
                />
              ))
            )}
          </TabsContent>

          {/* Category Tabs */}
          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-48 rounded-md" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <BooksGrid
                  books={category.books}
                  hasChatFeature={category.id === 'fiction' || category.id === 'children'}
                  isLoading={loading}
                  emptyMessage={`No ${category.title.toLowerCase()} books found matching your filters`}
                  getFavoriteState={isBookFavorite}
                  onToggleFavorite={handleToggleFavorite}
                  isTogglingFavorite={isTogglingFavorite}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default LibraryPage;
