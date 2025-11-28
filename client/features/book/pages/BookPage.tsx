import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookReaderEnhanced } from "@/components/BookReaderEnhanced";
import { PdfViewer } from "@/components/PdfViewer";
import { DbBookChat } from "@/components/DbBookChat";
import { CharacterChat } from "@/components/CharacterChat";
import { LoginPromptDialog } from "@/components/LoginPromptDialog";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;


import {
  Star,
  BookOpen,
  Play,
  MessageCircle,
  Users,
  Calendar,
  Hash,
  FileText,
  Heart,
  Wand2,
  HelpCircle,
  Baby,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Zap,
  X,
  MoreHorizontal,
  Send
} from "lucide-react";
import type { DbBook } from "@/types/db";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, Link } from "react-router-dom";
import { generateChapterTipCards } from "@/lib/parentTips";
import { fetchBookReviews, fetchUserBookReview, createBookReview, updateBookReview, deleteBookReview, type BookReview } from "@/lib/reviews";
import { toggleFavorite as toggleFavoriteAPI } from "@/lib/favorites";
import { useToast } from "@/hooks/use-toast";

const MAX_SUMMARY_WORDS = 200;
const truncateWords = (text: string, maxWords = MAX_SUMMARY_WORDS) => {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ") + "…";
};

export function Book() {
  const { bookId } = useParams<{ bookId: string }>();
  const { user, getBookProgress, updateReadingProgress, isBookFavorite, addToFavorites, removeFromFavorites } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<typeof dbCharacters[0] | null>(null);
  const [question, setQuestion] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [scenarioConversation, setScenarioConversation] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
    type: 'user' | 'assistant';
  }>>([]);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const isLoggedIn = !!user;
  const bookProgress = bookId ? getBookProgress(bookId) : null;
  const readingProgress = bookProgress?.progress || 0;
  const isFavorite = bookId ? isBookFavorite(bookId) : false;

  const book = null;

  const [dbBook, setDbBook] = useState<DbBook | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(() => !book);
  const [dbError, setDbError] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [chunks, setChunks] = useState<Array<{ id: string; chapter_number: number | null; chapter_heading: string | null; content: string }>>([]);
  const [dbQaOpen, setDbQaOpen] = useState(false);
  const [pendingChatQuestion, setPendingChatQuestion] = useState<string | null>(null);
  const [dbActiveTab, setDbActiveTab] = useState<'summary' | 'qa'>('summary');
  const [dbReviews, setDbReviews] = useState<BookReview[]>([]);
  const [userReview, setUserReview] = useState<BookReview | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [dbRating, setDbRating] = useState<number>(0);
  const [dbReviewText, setDbReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [dbCharacters, setDbCharacters] = useState<Array<{ id: string; name: string; short_description: string | null; persona: string | null; example_responses: string[] | null }>>([]);
  const [dbCharactersLoading, setDbCharactersLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptAction, setLoginPromptAction] = useState<'read' | 'chat' | 'qa'>('read');

  const handleOpenDbPdf = useCallback(() => {
    if (!dbBook || !dbBook.file_url) {
      console.warn("No PDF available for this book");
      return;
    }

    if (!user) {
      setLoginPromptAction('read');
      setShowLoginPrompt(true);
      return;
    }

    const estimatedChapters = chunks.length > 0 ? chunks.length : 1;
    const existing = bookProgress ?? null;
    updateReadingProgress(
      dbBook.id,
      existing?.progress ?? 0,
      existing?.currentChapter ?? 1,
      {
        title: dbBook.title,
        author: dbBook.author,
        coverUrl: dbBook.cover_url || "/placeholder.svg",
        totalChapters: estimatedChapters,
      },
      { sync: true },
    );

    setIsPdfViewerOpen(true);
  }, [dbBook, user, chunks.length, bookProgress, updateReadingProgress]);

  useEffect(() => {
    if (book || !bookId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingDb(true);
        const resp = await fetch(`${BACKEND_URL}/api/v1/books/${bookId}`);
        const result = await resp.json();
        if (!resp.ok) throw new Error((result && (result.error?.message || result.message)) || resp.statusText);
        const bookData = result.data || result;
        if (alive) {
          setDbBook(bookData as DbBook);
          if (bookData.chunks && Array.isArray(bookData.chunks)) {
            setChunks(bookData.chunks);
          }
        }
      } catch (e: any) {
        if (alive) setDbError(e?.message || "Failed to load book");
      } finally {
        if (alive) setLoadingDb(false);
      }
    })();
    return () => { alive = false; };
  }, [book, bookId]);

  useEffect(() => {
    if (!dbBook) return;
    let alive = true;
    (async () => {
      try {
        setDbCharactersLoading(true);
        const resp = await fetch(`${BACKEND_URL}/api/v1/books/${dbBook.id}/characters`);
        const result = await resp.json();
        const charactersData = result.data || result;
        if (resp.ok && alive) setDbCharacters(Array.isArray(charactersData) ? charactersData : []);
      } catch (error) {
        console.error("Failed to fetch characters:", error);
        if (alive) setDbCharacters([]);
      } finally {
        if (alive) setDbCharactersLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [dbBook?.id]);

  useEffect(() => {
    if (!dbBook?.id) return;

    const loadReviews = async () => {
      try {
        const allReviews = await fetchBookReviews(dbBook.id);
        setDbReviews(allReviews);

        if (user?.id) {
          const review = await fetchUserBookReview(dbBook.id);
          if (review) {
            setUserReview(review);
            setDbRating(review.rating);
            setDbReviewText(review.comment || '');
            setIsEditingReview(false);
          }
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
      }
    };

    loadReviews();
  }, [dbBook?.id, user?.id]);

  const submitDbReview = async () => {
    if (!user) {
      setLoginPromptAction('read');
      setShowLoginPrompt(true);
      return;
    }

    if (!dbBook?.id || !dbRating || !dbReviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      if (userReview) {
        const updated = await updateBookReview(dbBook.id, userReview.id, {
          rating: dbRating,
          comment: dbReviewText.trim(),
        });
        setUserReview(updated);

        setDbReviews(dbReviews.map(r => r.id === updated.id ? updated : r));
        setIsEditingReview(false);
      } else {
        const created = await createBookReview(dbBook.id, {
          rating: dbRating,
          comment: dbReviewText.trim(),
        });
        setUserReview(created);

        setDbReviews([created, ...dbReviews]);
      }

      setDbRating(0);
      setDbReviewText('');
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      if (error?.response?.data?.error?.message) {
        alert(error.response.data.error.message);
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !dbBook?.id) return;

    if (!confirm('Are you sure you want to delete your review?')) return;

    setIsSubmittingReview(true);
    try {
      await deleteBookReview(dbBook.id, userReview.id);

      setDbReviews(dbReviews.filter(r => r.id !== userReview.id));
      setUserReview(null);
      setDbRating(0);
      setDbReviewText('');
      setIsEditingReview(false);
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('Failed to delete review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const startConversation = (character: typeof dbCharacters[0]) => {
    if (!character || !character.name) return;

    if (!user) {
      setLoginPromptAction('chat');
      setShowLoginPrompt(true);
      return;
    }

    setSelectedCharacter(character);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fiction': return 'fiction';
      case 'nonfiction': return 'nonfiction';
      case 'children': return 'children';
      default: return 'primary';
    }
  };

  const toggleChapter = (chapterNumber: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterNumber)) {
      newExpanded.delete(chapterNumber);
    } else {
      newExpanded.add(chapterNumber);
    }
    setExpandedChapters(newExpanded);
  };

  const getDefaultTab = () => {
    switch (book?.category) {
      case 'fiction': return 'characters';
      case 'nonfiction': return 'qa';
      case 'children': return 'characters';
      default: return 'summary';
    }
  };

  const sendScenarioMessage = () => {
    const chatMessage = "";
    if (!chatMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'You',
      message: chatMessage,
      timestamp: new Date(),
      type: 'user' as const
    };

    setScenarioConversation(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const responses = [
        "That's a creative alternative! This change would fundamentally alter the story's trajectory. We'd see different character growth, new alliances, and perhaps even a different ending to the entire saga."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'Story Assistant',
        message: randomResponse,
        timestamp: new Date(),
        type: 'assistant' as const
      };

      setScenarioConversation(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 2000 + Math.random() * 1000);
  };

  const startScenarioChat = () => {
    setScenarioOpen(true);

    if (scenarioConversation.length === 0) {
      const greeting = {
        id: Date.now().toString(),
        sender: 'Story Assistant',
        message: "Hello! I'm here to help you explore alternative scenarios for this story. What 'what if' situation would you like to explore? You can describe any change you'd like to make to the plot, character decisions, or story events!",
        timestamp: new Date(),
        type: 'assistant' as const
      };
      setScenarioConversation([greeting]);
    }
  };

  const getScenarioStarters = () => [
    "What if Zara had kept the magical artifact for herself?",
    "What if the villain had offered to join forces with the heroes?"
  ];

  const handleStartReading = () => {
    setIsReaderOpen(true);
    if (user && bookId && book) {
      updateReadingProgress(
        bookId,
        5,
        1,
        {
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          totalChapters: book.chapters,
        },
        { sync: true },
      );
    }
  };

  const handleContinueReading = () => {
    setIsReaderOpen(true);
    if (user && bookId && book && bookProgress) {
      updateReadingProgress(
        bookId,
        bookProgress.progress,
        bookProgress.currentChapter,
        {
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          totalChapters: book.chapters,
        },
        { sync: true },
      );
    }
  };

  const handleOpenReader = () => {
    setIsReaderOpen(true);
  };

  const toggleFavorite = async () => {
    if (!bookId || !user) return;

    setIsTogglingFavorite(true);
    try {
      // Determine current favorite status based on book type (mock or db)
      const currentFavoriteStatus = book ? isFavorite : isBookFavorite(bookId);

      await toggleFavoriteAPI(bookId, !currentFavoriteStatus);

      if (currentFavoriteStatus) {
        removeFromFavorites(bookId);
      } else {
        if (book) {
          addToFavorites({
            bookId,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            category: book.category
          });
        } else if (dbBook) {
          addToFavorites({
            bookId: dbBook.id,
            title: dbBook.title,
            author: dbBook.author,
            coverUrl: dbBook.cover_url || "/placeholder.svg",
            category: dbBook.category
          });
        }
      }

      const message = currentFavoriteStatus ? 'Removed from favorites' : 'Added to favorites';
      toast({
        title: 'Success',
        description: message,
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
      });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  if (!book && (loadingDb || (!dbBook && !dbError))) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading book...</p>
      </div>
    );
  }

  if (!book && dbError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Error</h1>
        <p className="text-muted-foreground">{dbError}</p>
      </div>
    );
  }


  if (!book && dbBook) {
    const isNonFiction = dbBook.category === 'nonfiction';
    const isFiction = dbBook.category === 'fiction';
    const isChildren = dbBook.category === 'children';

    // Get user progress and favorite status from AuthContext
    const dbBookProgress = getBookProgress(dbBook.id);
    const dbBookProgressPercent = dbBookProgress?.progress || 0;
    const isDbBookFavorite = isBookFavorite(dbBook.id);

    const grouped = chunks.reduce((acc: Record<string, { heading: string; texts: string[] }>, c) => {
      const heading = (c.chapter_heading || '').trim();
      const hasNumber = typeof c.chapter_number === 'number' && !Number.isNaN(c.chapter_number);
      const key = heading || (hasNumber ? `num:${c.chapter_number}` : 'uncategorized');
      const title = heading || (hasNumber ? `Chapter ${c.chapter_number}` : 'Uncategorized');
      acc[key] ||= { heading: title, texts: [] };
      acc[key].texts.push(c.content);
      return acc;
    }, {});

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <img
                  src={dbBook.cover_url || "/placeholder.svg"}
                  alt={dbBook.title}
                  className="w-full max-w-sm mx-auto rounded-lg shadow-lg mb-6"
                />
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">{dbBook.title}</h1>
                    <p className="text-lg text-muted-foreground">by {dbBook.author}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dbBook.genre && <Badge variant="secondary">{dbBook.genre}</Badge>}
                    {dbBook.age_group && <Badge variant="outline">Ages {dbBook.age_group}</Badge>}
                    {isDbBookFavorite && <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Favorited</Badge>}
                  </div>

                  {dbBookProgressPercent > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-muted-foreground">Your Progress</p>
                        <p className="text-sm font-semibold text-foreground">{Math.round(dbBookProgressPercent)}%</p>
                      </div>
                      <Progress value={dbBookProgressPercent} className="h-2" />
                    </div>
                  )}

                  {dbBook.file_url && (
                    <Button className="w-full" onClick={handleOpenDbPdf}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      {dbBookProgressPercent > 0 ? 'Continue Reading' : 'Start Reading'}
                    </Button>
                  )}
                  <Button
                    className={`w-full ${isDbBookFavorite ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-white text-black-700 border border-input hover:bg-accent'}`}
                    onClick={toggleFavorite}
                    disabled={isTogglingFavorite || !isLoggedIn}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isDbBookFavorite ? 'fill-current' : ''}`} />
                    {isDbBookFavorite ? 'Added to Favorites' : 'Add to Favorites'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About This Book</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{dbBook.description || ""}</p>
              </CardContent>
            </Card>

            {(isFiction || isChildren) && dbCharacters.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Meet the Characters
                  </CardTitle>
                  <CardDescription>
                    Click on any character to start an immersive conversation and discover their unique personality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dbCharacters.filter(c => c && c.name).map((character) => (
                      <Card
                        key={character.id}
                        className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50"
                        onClick={() => {
                          startConversation(character);
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="relative mb-4">
                            <Avatar className="w-20 h-20 mx-auto ring-4 ring-primary/20 group-hover:ring-primary/50 transition-all">
                              <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">{(character.name && character.name[0]) || '?'}</AvatarFallback>
                            </Avatar>
                           
                          </div>
                          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{character.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{character.short_description || "A character from this book"}</p>

                          <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startConversation(character);
                              }}
                            >
                              Start Chat
                            </Button>
                            
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(isNonFiction || isChildren) && (
              <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <Badge className="mb-2" variant="secondary">Interactive</Badge>
                      <CardTitle className="text-2xl">Q&A Tutor</CardTitle>
                      <CardDescription>Ask questions and get answers with citations from this book.</CardDescription>
                    </div>
                    <Button size="lg" onClick={() => {
                      if (!user) {
                        setLoginPromptAction('qa');
                        setShowLoginPrompt(true);
                      } else {
                        setDbQaOpen(true);
                      }
                    }}>
                      <MessageCircle className="h-4 w-4 mr-2" /> Start Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">Try a suggested prompt:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Explain the key concepts' ,
                      'List 3 takeaways from this book'
                    ].map((p, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (!user) {
                            setLoginPromptAction('qa');
                            setShowLoginPrompt(true);
                          } else {
                            setPendingChatQuestion(p);
                            setDbQaOpen(true);
                          }
                        }}
                        className="text-xs rounded-full border px-3 py-1 hover:bg-muted"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={dbActiveTab} onValueChange={(v) => setDbActiveTab(v as any)} className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
              {(() => {
                const entries = Object.entries(grouped);
                const data = entries.length > 0
                  ? entries.map(([key, val]) => ({ id: String(key), title: val.heading || `Chapter ${key}`, text: val.texts.join(" ") }))
                  : [
                    { id: '1', title: 'Chapter 1', text: 'This chapter introduces the key concepts and sets the foundation for understanding the core ideas.' },
                    { id: '2', title: 'Chapter 2', text: 'Builds on the basics with practical examples and contextual explanations that make learning easier.' },
                    { id: '3', title: 'Chapter 3', text: 'Explores advanced topics, connecting them back to the main thesis for a cohesive overview.' },
                  ];
                return (
                  <Accordion type="single" collapsible>
                    {data.map((c) => (
                      <AccordionItem key={c.id} value={c.id}>
                        <AccordionTrigger className="text-base">{c.title}</AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{truncateWords(c.text)}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                );
              })()}
            </TabsContent>
          </Tabs>

            {isChildren && (
              <Card className="w-full mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Parent Tips & Guidance
                  </CardTitle>
                  <CardDescription>
                    Helpful suggestions for supporting your child's learning with each chapter
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const entries = Object.entries(grouped);
                    const chapterCount = entries.length > 0 ? entries.length : 3;
                    const chapterTips = generateChapterTipCards(chapterCount, book?.parentTips, book?.chapterSummaries);

                    return (
                      <Accordion type="single" collapsible className="w-full">
                        {chapterTips.map((item) => (
                          <AccordionItem key={item.id} value={item.id} className="border-l-4 border-l-primary/30">
                            <AccordionTrigger className="hover:bg-muted px-4 py-3 rounded-sm transition-colors">
                              <div className="flex items-center gap-3 text-left">
                                <div className="bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm">
                                  {item.chapter}
                                </div>
                                <span className="font-semibold text-foreground">{item.title}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 py-4 rounded-sm">
                              <div className="space-y-3">
                                <div className="flex gap-2">
                                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                  <p className="text-sm text-foreground leading-relaxed">{item.tip}</p>
                                </div>
                                {item.discussion && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground font-semibold mb-2">💡 Discussion Question:</p>
                                    <p className="text-xs text-muted-foreground italic">{item.discussion}</p>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card className="w-full mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Reader Reviews
                </CardTitle>
                <CardDescription>
                  {userReview && !isEditingReview ? 'You have already reviewed this book' : 'Share your thoughts about this book'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {user && !userReview && (
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="font-semibold">Write a Review</h3>
                    <div>
                      <p className="text-sm font-semibold mb-2">Your Rating</p>
                      <div className="flex items-center gap-2">
                        {[1,2,3,4,5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setDbRating(n)}
                            disabled={isSubmittingReview}
                            className="transition-colors"
                          >
                            <Star
                              size={24}
                              className={`cursor-pointer ${
                                dbRating >= n
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 hover:text-yellow-200'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Your Review (optional)</p>
                      <Textarea
                        placeholder="Share your thoughts about this book..."
                        value={dbReviewText}
                        onChange={(e) => setDbReviewText(e.target.value)}
                        disabled={isSubmittingReview}
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={submitDbReview}
                      disabled={!dbRating || isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Saving...' : 'Submit Review'}
                    </Button>
                  </div>
                )}

                {isEditingReview && userReview && (
                  <div className="space-y-4 pb-6 border-b bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold">Edit Your Review</h3>
                    <div>
                      <p className="text-sm font-semibold mb-2">Rating</p>
                      <div className="flex items-center gap-2">
                        {[1,2,3,4,5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setDbRating(n)}
                            disabled={isSubmittingReview}
                            className="transition-colors"
                          >
                            <Star
                              size={24}
                              className={`cursor-pointer ${
                                dbRating >= n
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 hover:text-yellow-200'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Review</p>
                      <Textarea
                        placeholder="Update your review..."
                        value={dbReviewText}
                        onChange={(e) => setDbReviewText(e.target.value)}
                        disabled={isSubmittingReview}
                        rows={4}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={submitDbReview}
                        disabled={!dbRating || isSubmittingReview}
                      >
                        {isSubmittingReview ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingReview(false);
                          if (userReview) {
                            setDbRating(userReview.rating);
                            setDbReviewText(userReview.comment || '');
                          }
                        }}
                        disabled={isSubmittingReview}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {!user && (
                  <p className="text-sm text-muted-foreground italic py-4">
                    Please log in to leave a review
                  </p>
                )}

                <div className="space-y-4">
                  <p className="text-sm font-semibold">
                    {dbReviews.length} {dbReviews.length === 1 ? 'Review' : 'Reviews'}
                  </p>
                  {dbReviews.length === 0 && (
                    <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                  )}
                  {dbReviews.map((r) => (
                    <Card
                      key={r.id}
                      className={`${
                        userReview?.id === r.id
                          ? 'border-2 border-primary bg-primary/5'
                          : 'bg-muted/50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {userReview?.id === r.id ? 'Your Review' : 'Anonymous Reviewer'}
                              </p>
                              {userReview?.id === r.id && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(r.created_at).toLocaleDateString()}
                              {r.updated_at !== r.created_at && ' • (edited)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((n) => (
                              <Star
                                key={n}
                                size={16}
                                className={`${
                                  r.rating >= n
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {r.comment && (
                          <p className="text-sm text-foreground mb-4">{r.comment}</p>
                        )}

                        {userReview?.id === r.id && (
                          <div className="flex items-center gap-2 pt-3 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingReview(true);
                                setDbRating(r.rating);
                                setDbReviewText(r.comment || '');
                              }}
                              disabled={isSubmittingReview}
                            >
                              <MessageSquare size={14} className="mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleDeleteReview}
                              disabled={isSubmittingReview}
                            >
                              <X size={14} className="mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DbBookChat
          book={dbBook}
          open={dbQaOpen}
          onOpenChange={setDbQaOpen}
          pendingQuestion={pendingChatQuestion}
          onPendingQuestionHandled={() => setPendingChatQuestion(null)}
        />

        <CharacterChat
          book={dbBook}
          character={selectedCharacter}
          open={selectedCharacter !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCharacter(null);
            }
          }}
        />

        {dbBook.file_url && (
          <PdfViewer
            src={dbBook.file_url}
            title={dbBook.title}
            open={isPdfViewerOpen}
            onOpenChange={setIsPdfViewerOpen}
            onClose={({ page, percentComplete }) => {
              if (!user || !dbBook) return;
              updateReadingProgress(
                dbBook.id,
                percentComplete,
                page,
                {
                  title: dbBook.title,
                  author: dbBook.author,
                  coverUrl: dbBook.cover_url || "/placeholder.svg",
                  totalChapters: chunks.length || 1,
                  currentPage: page,
                },
                { sync: true },
              );
            }}
          />
        )}

        <LoginPromptDialog
          isOpen={showLoginPrompt}
          onOpenChange={setShowLoginPrompt}
          title="Login Required"
          description={
            loginPromptAction === 'read'
              ? "Log in to your BookHub account to start reading and track your progress."
              : loginPromptAction === 'chat'
              ? "Log in to your BookHub account to chat with characters from this book."
              : "Log in to your BookHub account to ask questions and get answers with our Q&A Tutor."
          }
          actionLabel={
            loginPromptAction === 'read'
              ? "Start Reading"
              : loginPromptAction === 'chat'
              ? "Chat with Characters"
              : "Use Q&A Tutor"
          }
        />
      </div>
    );
  }
}

export default Book;
