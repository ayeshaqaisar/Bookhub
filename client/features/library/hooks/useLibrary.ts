import { useMemo } from 'react';
import type { BookCardData } from '../components/BookCard';

export interface UseLibraryReturn {
  // Data
  allGenres: string[];

  // Filter functions
  actionToggleGenre: (genre: string) => void;
  actionClearGenres: () => void;
  actionFilterBooks: (books: BookCardData[], query: string, genres: string[]) => BookCardData[];

  // State needed (caller should manage)
  // - searchQuery: string
  // - selectedGenres: string[]
}

export function useLibrary() {
  /**
   * Extracts unique genres from books array
   */
  const getUniqueGenres = (books: BookCardData[] | null | undefined): string[] => {
    if (!books || books.length === 0) return []; 
    const genreSet = new Set<string>();
    books.forEach((book) => {
      if (book.genre) {
        genreSet.add(book.genre);
      }
    });
    return Array.from(genreSet).sort((a, b) => a.localeCompare(b));
  };

  /**
   * Filters books by search query and selected genres
   */
  const actionFilterBooks = (
    books: BookCardData[],
    query: string,
    selectedGenres: string[]
  ): BookCardData[] => {
    const q = query.trim().toLowerCase();

    return books.filter((book) => {
      // Match search query
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.genre ? book.genre.toLowerCase().includes(q) : false) ||
        (book.description ? book.description.toLowerCase().includes(q) : false);

      // Match selected genres
      const matchesGenres =
        selectedGenres.length === 0 || (book.genre ? selectedGenres.includes(book.genre) : false);

      return matchesQuery && matchesGenres;
    });
  };

  return {
    getUniqueGenres,
    actionFilterBooks,
  };
}
