import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BookProgress, FavoriteBook, BookHighlight, BookNote } from "@shared/mock-data";
import * as apiClient from "@/services/api-client";
import { saveSession, loadSession, clearSession, getAccessToken, isTokenExpired, updateAccessToken } from "@/lib/token-storage";
import { upsertReadingProgress, fetchUserReadingProgress } from "@/lib/readingProgress";

export type AuthProviderType = "email" | "google";

export interface User {
  id: string;
  name: string;
  email: string;
  provider: AuthProviderType;
  joinDate: string;
  avatar?: string;
  age?: number;
  contact?: string;
  userRole?: 'user' | 'admin';
}

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
};

type UpdateProfilePayload = Partial<Pick<User, "name" | "age" | "contact" | "avatar">>;

type ReadingProgressSyncPayload = {
  bookId: string;
  status?: "reading" | "completed" | "paused";
  currentPage?: number;
  percentComplete?: number;
  lastPosition?: Record<string, unknown> | null;
  bookmarks?: unknown[] | null;
  lastReadAt?: string;
  isFavourite?: boolean;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ userDetailsStored: boolean; userDetailsError?: string }>;
  logout: () => Promise<void>;
  updateProfile: (userData: UpdateProfilePayload) => Promise<void>;
  readingProgress: BookProgress[];
  favoriteBooks: FavoriteBook[];
  highlights: BookHighlight[];
  notes: BookNote[];
  updateReadingProgress: (
    bookId: string,
    progress: number,
    chapter: number,
    metadata?: Partial<Pick<BookProgress, "title" | "author" | "coverUrl" | "totalChapters">> & {
      status?: "reading" | "completed" | "paused";
      currentPage?: number;
      isFavourite?: boolean;
    },
    options?: { sync?: boolean },
  ) => void;
  addToFavorites: (book: Omit<FavoriteBook, "addedDate">) => void;
  removeFromFavorites: (bookId: string) => void;
  isBookFavorite: (bookId: string) => boolean;
  getBookProgress: (bookId: string) => BookProgress | null;
  addHighlight: (highlight: Omit<BookHighlight, "id" | "createdAt">) => string;
  removeHighlight: (highlightId: string) => void;
  getHighlights: (bookId: string, chapterNumber?: number) => BookHighlight[];
  addNote: (note: Omit<BookNote, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (noteId: string, content: string) => void;
  removeNote: (noteId: string) => void;
  getNotes: (bookId: string, chapterNumber?: number) => BookNote[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isBrowser = typeof window !== "undefined";

const getStorageKeys = (userId: string) => ({
  progress: `bookhub_${userId}_reading_progress`,
  favorites: `bookhub_${userId}_favorites`,
  highlights: `bookhub_${userId}_highlights`,
  notes: `bookhub_${userId}_notes`,
});

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function fetchUserProfileFromAPI(userId: string): Promise<{ full_name?: string; age?: number; phone?: string; user_role?: string } | null> {
  try {
    const response = await fetch(`/api/v1/users/${userId}/profile`, {
      headers: {
        'Authorization': `Bearer ${getAccessToken() || ''}`,
      },
    });
    if (!response.ok) {
      console.warn(`Failed to fetch user profile: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch user profile from API', error);
    return null;
  }
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error("Failed to read from storage", error);
    return fallback;
  }
}

function persistToStorage(key: string, value: unknown) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to persist to storage", error);
  }
}

function mapSupabaseUser(userData: {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}, profileData?: { full_name?: string; age?: number; phone?: string; user_role?: string }): User {
  const metadata = userData.user_metadata ?? {};
  const provider: AuthProviderType = metadata?.provider === "google" ? "google" : "email";
  const email = userData.email ?? "";

  const nameFromMetadata =
    typeof metadata.name === "string" && metadata.name.trim().length > 0
      ? metadata.name.trim()
      : typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : email.includes("@")
      ? email.split("@")[0]
      : "Reader";

  const avatar =
    (typeof metadata.avatar === "string" && metadata.avatar) ||
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    undefined;

  const parsedAge = profileData?.age
    ? profileData.age
    : typeof metadata.age === "number"
    ? metadata.age
    : typeof metadata.age === "string" && metadata.age.trim().length > 0
    ? Number(metadata.age)
    : undefined;

  const age = typeof parsedAge === "number" && !Number.isNaN(parsedAge) ? parsedAge : undefined;

  const contact = profileData?.phone
    ? profileData.phone
    : typeof metadata.contact === "string" && metadata.contact.trim().length > 0
    ? metadata.contact.trim()
    : typeof metadata.phone === "string" && metadata.phone.trim().length > 0
    ? metadata.phone.trim()
    : undefined;

  const userRole = profileData?.user_role as 'user' | 'admin' | undefined;

  return {
    id: userData.id,
    name: nameFromMetadata,
    email,
    provider,
    joinDate: new Date().toISOString().slice(0, 10),
    avatar,
    age,
    contact,
    userRole,
  };
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState<BookProgress[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBook[]>([]);
  const [highlights, setHighlights] = useState<BookHighlight[]>([]);
  const [notes, setNotes] = useState<BookNote[]>([]);

  useEffect(() => {
    let isMounted = true;

    const applySession = async (userData: { id: string; email: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!isMounted) return;
      if (userData) {
        let profileData = null;
        try {
          profileData = await fetchUserProfileFromAPI(userData.id);
        } catch (error) {
          console.warn('Failed to fetch user profile', error);
        }

        const mapped = mapSupabaseUser(userData, profileData || undefined);
        setUser(mapped);
        if (isBrowser) {
          const keys = getStorageKeys(mapped.id);

          // Load reading progress - only fetch from API if user is authenticated
          if (userData.id) {
            // Try to fetch merged books with progress first
            await fetchAndPopulateBooksWithProgress(userData.id);
          } else {
            setReadingProgress(readFromStorage(keys.progress, []));
            setFavoriteBooks(readFromStorage(keys.favorites, []));
          }

          setHighlights(readFromStorage(keys.highlights, []));
          setNotes(readFromStorage(keys.notes, []));
        }
      } else {
        // User logged out
        if (isBrowser) {
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.startsWith('bookhub_')) {
              localStorage.removeItem(key);
            }
          });
        }
        setUser(null);
        setReadingProgress([]);
        setFavoriteBooks([]);
        setHighlights([]);
        setNotes([]);
      }
    };

    const initialize = async () => {
      try {
        // Check if we have a stored session
        const storedSession = loadSession();

        if (storedSession) {
          // Check if token is expired
          if (storedSession.expiresAt && isTokenExpired(storedSession.expiresAt)) {
            console.log('Stored token is expired, clearing session');
            clearSession();
            await applySession(null);
          } else {
            // Try to get session from server using stored token
            try {
              const sessionResponse = await fetch('/api/v1/auth/session', {
                headers: {
                  'Authorization': `Bearer ${storedSession.accessToken}`,
                },
              });

              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                if (sessionData.success && sessionData.data?.session) {
                  const sessionUser = sessionData.data.session.user;
                  await applySession(sessionUser);
                } else {
                  clearSession();
                  await applySession(null);
                }
              } else {
                clearSession();
                await applySession(null);
              }
            } catch (error) {
              console.warn('Failed to validate session with server', error);
              clearSession();
              await applySession(null);
            }
          }
        } else {
          await applySession(null);
        }
      } catch (error) {
        console.error("Auth initialization error", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.loginUser(email, password);

      // API returns { session: { access_token, user, ... } }
      if (response && response.session && response.session.user) {
        const session = response.session;

        // Save session to storage FIRST - other functions depend on this
        saveSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined),
          userId: session.user.id,
        });

        console.log('Session saved, user ID:', session.user.id);

        // Apply user session - this needs token to be already saved
        await applySessionData(session.user);

        console.log('User session applied');
      } else {
        throw new Error('Invalid session data received from server');
      }
    } catch (error) {
      console.error('Login failed', error);
      clearSession();
      throw error instanceof Error ? error : new Error("Unable to sign in with email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Google OAuth is typically handled via redirect
      // For now, show a message that this requires special setup
      throw new Error("Google OAuth requires special backend configuration. Please use email/password login.");
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unable to sign in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ name, email, password, phone, avatar }: RegisterPayload) => {
    setIsLoading(true);
    try {
      const result = await apiClient.registerUser(email, password, name, phone, avatar);

      if (result) {
        console.log('User registered successfully. Please check your email to verify.');
        return { userDetailsStored: true };
      }

      return { userDetailsStored: false, userDetailsError: 'Registration failed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create account. Please try again.";
      return { userDetailsStored: false, userDetailsError: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      try {
        await apiClient.logoutUser();
      } catch (error) {
        console.warn('Logout API call failed, but continuing with local cleanup', error);
      }

      clearSession();
      setUser(null);
      setReadingProgress([]);
      setFavoriteBooks([]);
      setHighlights([]);
      setNotes([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to sign out.";
      console.error('Logout failed:', errorMessage);
      throw error instanceof Error ? error : new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: UpdateProfilePayload) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // For now, just update local state
      // In a real implementation, you'd call an API endpoint to update the server
      setUser((previous) => (previous ? { ...previous, ...userData } : previous));
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unable to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const applySessionData = async (sessionUser: { id: string; email: string; user_metadata?: Record<string, unknown> }) => {
    console.log('applySessionData called with user:', sessionUser.id);
    let profileData = null;
    try {
      profileData = await fetchUserProfileFromAPI(sessionUser.id);
      console.log('User profile fetched successfully:', profileData);
    } catch (error) {
      console.warn('Failed to fetch user profile', error);
    }

    const mapped = mapSupabaseUser(sessionUser, profileData || undefined);
    console.log('User mapped:', mapped);
    setUser(mapped);

    if (isBrowser) {
      const keys = getStorageKeys(mapped.id);
      try {
        await fetchAndPopulateBooksWithProgress(mapped.id);
        console.log('Books with progress fetched');
      } catch (error) {
        console.warn('Failed to fetch books with progress', error);
      }
      setHighlights(readFromStorage(keys.highlights, []));
      setNotes(readFromStorage(keys.notes, []));
    }
  };

  const fetchAndPopulateBooksWithProgress = useCallback(
    async (userId: string) => {
      if (!isBrowser) return;

      try {
        console.log('Fetching books with progress from API', { userId });
        const booksWithProgress = await apiClient.fetchBooksWithProgress(userId);

        const mappedProgress: BookProgress[] = booksWithProgress.map((book: any) => {
          const progress = book.readingProgress || {};

          return {
            bookId: book.id,
            title: book.title || "Unknown Book",
            author: book.author || "Unknown Author",
            coverUrl: book.cover_url || "/placeholder.svg",
            totalChapters: 0,
            progress: progress.percent_complete || 0,
            currentChapter: progress.current_page || 0,
            lastRead: progress.last_read_at ? progress.last_read_at.split('T')[0] : new Date().toISOString().split('T')[0],
          };
        });

        const favorites: FavoriteBook[] = booksWithProgress
          .filter((book: any) => book.is_favourite === true)
          .map((book: any) => ({
            id: book.id,
            bookId: book.id,
            user_id: userId,
            book_id: book.id,
            is_favourite: true,
            percent_complete: book.readingProgress?.percent_complete || 0,
            status: book.readingProgress?.status || 'reading',
            created_at: book.readingProgress?.created_at || new Date().toISOString(),
            updated_at: book.readingProgress?.updated_at || new Date().toISOString(),
            addedDate: book.readingProgress?.last_read_at ? book.readingProgress.last_read_at.split('T')[0] : new Date().toISOString().split('T')[0],
          }));

        setReadingProgress(mappedProgress);
        setFavoriteBooks(favorites);

        const keys = getStorageKeys(userId);
        persistToStorage(keys.progress, mappedProgress);
        persistToStorage(keys.favorites, favorites);

        console.log('Successfully populated books with progress', {
          userId,
          progressCount: mappedProgress.length,
          favoriteCount: favorites.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to fetch books with progress: ${errorMessage}. Falling back to API reading progress fetch.`, {
          error,
          userId,
        });

        try {
          const apiProgress = await fetchUserReadingProgress();
          const mappedProgress: BookProgress[] = apiProgress.map((progress: any) => {
            const bookDetails = progress.booksdetails || {};

            return {
              bookId: progress.book_id,
              title: bookDetails.title || "Unknown Book",
              author: bookDetails.author || "Unknown Author",
              coverUrl: bookDetails.cover_url || "/placeholder.svg",
              totalChapters: 0,
              progress: progress.percent_complete || 0,
              currentChapter: progress.current_page || 0,
              lastRead: progress.last_read_at ? progress.last_read_at.split('T')[0] : new Date().toISOString().split('T')[0],
            };
          });

          setReadingProgress(mappedProgress);
          const keys = getStorageKeys(userId);
          persistToStorage(keys.progress, mappedProgress);
        } catch (fallbackError) {
          console.error('Fallback API call also failed', fallbackError);
        }
      }
    },
    []
  );

  const persistReadingProgress = useCallback(
    async (payload: ReadingProgressSyncPayload) => {
      if (!user) return;
      try {
        const { percentComplete, ...rest } = payload;
        const normalizedPercent =
          typeof percentComplete === "number" && Number.isFinite(percentComplete)
            ? Math.max(0, Math.min(100, Number(percentComplete.toFixed(2))))
            : undefined;

        await upsertReadingProgress({
          userId: user.id,
          ...rest,
          percentComplete: normalizedPercent,
        });
      } catch (error) {
        console.error("Failed to sync reading progress", error);
      }
    },
    [user],
  );

  const updateReadingProgress = (
    bookId: string,
    progress: number,
    chapter: number,
    metadata?: Partial<Pick<BookProgress, "title" | "author" | "coverUrl" | "totalChapters">> & {
      status?: "reading" | "completed" | "paused";
      currentPage?: number;
      isFavourite?: boolean;
    },
    options?: { sync?: boolean },
  ) => {
    if (!user) return;

    const staticBookData: Record<string, { title: string; author: string; coverUrl: string; totalChapters: number }> = {
      "the-great-adventure": {
        title: "The Great Adventure",
        author: "Jane Smith",
        coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop",
        totalChapters: 12,
      },
      "magical-forest-friends": {
        title: "Magical Forest Friends",
        author: "Emma Green",
        coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=450&fit=crop",
        totalChapters: 6,
      },
      "history-of-science": {
        title: "History of Science",
        author: "Dr. Martin",
        coverUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=450&fit=crop",
        totalChapters: 10,
      },
    };

    const base = staticBookData[bookId as keyof typeof staticBookData];
    const normalizedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
    const lastReadIso = new Date().toISOString();

    const passedTotal = metadata?.totalChapters && metadata.totalChapters > 0 ? metadata.totalChapters : undefined;
    const details = {
      title: metadata?.title ?? base?.title ?? "Untitled Book",
      author: metadata?.author ?? base?.author ?? "Unknown Author",
      coverUrl: metadata?.coverUrl ?? base?.coverUrl ?? "/placeholder.svg",
      totalChapters: passedTotal ?? base?.totalChapters ?? Math.max(chapter, 1),
    };

    const currentChapter = metadata?.currentPage && metadata.currentPage > 0 ? metadata.currentPage : chapter;

    const newProgress: BookProgress = {
      bookId,
      ...details,
      progress: normalizedProgress,
      currentChapter,
      lastRead: lastReadIso.split("T")[0],
    };

    setReadingProgress((previous) => {
      const existingIndex = previous.findIndex((item) => item.bookId === bookId);
      const updated = existingIndex >= 0 ? previous.map((item, index) => (index === existingIndex ? newProgress : item)) : [...previous, newProgress];
      if (user && isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.progress, updated);
      }
      return updated;
    });

    const shouldSync = options?.sync === true;
    if (shouldSync) {
      void persistReadingProgress({
        bookId,
        percentComplete: normalizedProgress,
        currentPage: currentChapter,
        status: metadata?.status ?? (normalizedProgress >= 99 ? "completed" : "reading"),
        isFavourite: metadata?.isFavourite,
        lastReadAt: lastReadIso,
      });
    }
  };

  const addToFavorites = (book: Omit<FavoriteBook, "addedDate">) => {
    if (!user) return;
    const newFavorite: FavoriteBook = { ...book, addedDate: new Date().toISOString().split("T")[0] };
    setFavoriteBooks((previous) => {
      const updated = [...previous, newFavorite];
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.favorites, updated);
      }
      return updated;
    });

    const existing = readingProgress.find((item) => item.bookId === book.bookId);
    void persistReadingProgress({
      bookId: book.bookId,
      isFavourite: true,
      percentComplete: existing?.progress,
      currentPage: existing?.currentChapter,
    });
  };

  const removeFromFavorites = (bookId: string) => {
    if (!user) return;
    setFavoriteBooks((previous) => {
      const updated = previous.filter((book) => book.bookId !== bookId);
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.favorites, updated);
      }
      return updated;
    });

    const existing = readingProgress.find((item) => item.bookId === bookId);
    void persistReadingProgress({
      bookId,
      isFavourite: false,
      percentComplete: existing?.progress,
      currentPage: existing?.currentChapter,
    });
  };

  const isBookFavorite = (bookId: string) => favoriteBooks.some((book) => book.bookId === bookId);

  const getBookProgress = (bookId: string) => readingProgress.find((progress) => progress.bookId === bookId) ?? null;

  const addHighlight = (highlightData: Omit<BookHighlight, "id" | "createdAt">): string => {
    if (!user) return "";
    const newHighlight: BookHighlight = {
      ...highlightData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setHighlights((previous) => {
      const updated = [...previous, newHighlight];
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.highlights, updated);
      }
      return updated;
    });
    return newHighlight.id;
  };

  const removeHighlight = (highlightId: string) => {
    if (!user) return;
    setHighlights((previous) => {
      const updated = previous.filter((highlight) => highlight.id !== highlightId);
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.highlights, updated);
      }
      return updated;
    });
  };

  const getHighlights = (bookId: string, chapterNumber?: number) =>
    highlights.filter((highlight) =>
      highlight.bookId === bookId && (chapterNumber === undefined || highlight.chapterNumber === chapterNumber)
    );

  const addNote = (noteData: Omit<BookNote, "id" | "createdAt" | "updatedAt">): string => {
    if (!user) return "";
    const timestamp = new Date().toISOString();
    const newNote: BookNote = {
      ...noteData,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setNotes((previous) => {
      const updated = [...previous, newNote];
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.notes, updated);
      }
      return updated;
    });
    return newNote.id;
  };

  const updateNote = (noteId: string, content: string) => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    setNotes((previous) => {
      const updated = previous.map((note) =>
        note.id === noteId ? { ...note, content, updatedAt: timestamp } : note
      );
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.notes, updated);
      }
      return updated;
    });
  };

  const removeNote = (noteId: string) => {
    if (!user) return;
    setNotes((previous) => {
      const updated = previous.filter((note) => note.id !== noteId);
      if (isBrowser) {
        const keys = getStorageKeys(user.id);
        persistToStorage(keys.notes, updated);
      }
      return updated;
    });
  };

  const getNotes = (bookId: string, chapterNumber?: number) =>
    notes.filter((note) => note.bookId === bookId && (chapterNumber === undefined || note.chapterNumber === chapterNumber));

  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    readingProgress,
    favoriteBooks,
    highlights,
    notes,
    updateReadingProgress,
    addToFavorites,
    removeFromFavorites,
    isBookFavorite,
    getBookProgress,
    addHighlight,
    removeHighlight,
    getHighlights,
    addNote,
    updateNote,
    removeNote,
    getNotes,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
