import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Menu,
  X,
  Home,
  Type,
  Sun,
  Moon,
  Highlighter,
  StickyNote,
  Trash2,
  Edit,
  Save,
  Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mockBooks, getBookChapters, type BookData } from "@shared/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface BookReaderProps {
  bookId: string;
  onClose: () => void;
}

export function BookReaderEnhanced({ bookId, onClose }: BookReaderProps) {
  const { 
    user, 
    updateReadingProgress, 
    addHighlight, 
    removeHighlight, 
    getHighlights,
    addNote,
    updateNote,
    removeNote,
    getNotes
  } = useAuth();
  
  const book = mockBooks[bookId];
  const chapters = book ? getBookChapters(bookId, book.chapterSummaries) : [];
  
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [isDark, setIsDark] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  const currentChapter = chapters[currentChapterIndex];
  const progress = ((currentChapterIndex + 1) / chapters.length) * 100;
  const chapterHighlights = user ? getHighlights(bookId, currentChapter?.number) : [];
  const chapterNotes = user ? getNotes(bookId, currentChapter?.number) : [];

  // Track reading time
  useEffect(() => {
    const timer = setInterval(() => {
      setReadingTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update reading progress when user is logged in
  useEffect(() => {
    if (user && book) {
      const totalChapters = (book.chapterSummaries?.length ?? chapters.length ?? 0) || 1;
      updateReadingProgress(
        bookId,
        progress,
        currentChapterIndex + 1,
        {
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          totalChapters,
          currentPage: currentChapterIndex + 1,
        },
        { sync: false },
      );
    }
  }, [currentChapterIndex, user, book, bookId, progress, chapters.length, updateReadingProgress]);

  if (!book || !currentChapter) {
    return <div>Book not found</div>;
  }

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setIsMenuOpen(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFontSize = () => {
    setFontSize(prev => prev === 16 ? 20 : prev === 20 ? 24 : 16);
  };

  // Text selection and highlighting
  const handleTextSelection = () => {
    if (!user) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);

      // Calculate the actual position in the chapter text
      const contentElement = document.querySelector('.chapter-content');
      if (contentElement) {
        const textContent = contentElement.textContent || '';
        const beforeRange = document.createRange();
        beforeRange.setStart(contentElement, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const startIndex = beforeRange.toString().length;
        const endIndex = startIndex + selectedText.length;

        // Use light yellow as default highlight color
        const highlightColor = '#fef08a'; // Light yellow

        addHighlight({
          bookId,
          chapterNumber: currentChapter.number,
          text: selectedText,
          startIndex,
          endIndex,
          color: highlightColor
        });
      }

      selection.removeAllRanges();
    }
  };

  // Notes functionality
  const addNewNote = () => {
    if (!newNoteContent.trim() || !user || !currentChapter) return;

    addNote({
      bookId,
      chapterNumber: currentChapter.number,
      content: newNoteContent
    });
    
    setNewNoteContent('');
  };

  const startEditingNote = (noteId: string, currentContent: string) => {
    setEditingNoteId(noteId);
    setEditNoteContent(currentContent);
  };

  const saveEditedNote = () => {
    if (editingNoteId && editNoteContent.trim()) {
      updateNote(editingNoteId, editNoteContent);
      setEditingNoteId(null);
      setEditNoteContent('');
    }
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  // Render text with highlights
  const renderTextWithHighlights = (text: string) => {
    const highlightText = (content: string) => {
      if (!user || chapterHighlights.length === 0) {
        return content;
      }

      let highlightedContent = content;

      // Sort highlights by length (longest first) to avoid nested replacement issues
      const sortedHighlights = chapterHighlights
        .filter(h => content.includes(h.text))
        .sort((a, b) => b.text.length - a.text.length);

      sortedHighlights.forEach((highlight) => {
        const regex = new RegExp(`(${highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
        highlightedContent = highlightedContent.replace(regex,
          `<mark style="background-color: #fef08a; border-radius: 3px; padding: 2px 4px; cursor: pointer; border-bottom: 2px solid #eab308;" data-highlight-id="${highlight.id}" title="Click to manage highlight">$1</mark>`
        );
      });

      return highlightedContent;
    };

    return (
      <div
        onMouseUp={handleTextSelection}
        className="select-text cursor-text chapter-content"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'MARK' && target.dataset.highlightId) {
            const highlightId = target.dataset.highlightId;
            const highlight = chapterHighlights.find(h => h.id === highlightId);
            if (highlight && window.confirm(`Remove highlight: "${highlight.text}"?`)) {
              removeHighlight(highlightId);
            }
          }
        }}
      >
        {text.split('\n\n').map((paragraph, index) => (
          <p
            key={index}
            className="mb-6 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightText(paragraph) }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm truncate max-w-[200px]">{book.title}</h1>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-xs text-muted-foreground hidden sm:block">
              Reading: {formatTime(readingTime)}
            </div>
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotesPanel(!showNotesPanel)}
                className={showNotesPanel ? "bg-muted" : ""}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={toggleFontSize}>
              <Type className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsDark(!isDark)}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Chapter {currentChapter.number}: {currentChapter.title}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Table of Contents Sidebar */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-10 lg:hidden" 
              onClick={() => setIsMenuOpen(false)}
            />
            <div className={`
              ${isMenuOpen ? 'fixed lg:relative' : 'hidden'} 
              top-0 left-0 w-80 h-full border-r z-20
              ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} 
              p-4 lg:block
            `}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Table of Contents</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div className="space-y-2">
                  {chapters.map((chapter, index) => (
                    <Button
                      key={chapter.number}
                      variant={index === currentChapterIndex ? "default" : "ghost"}
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => goToChapter(index)}
                    >
                      <div>
                        <div className="font-medium">Chapter {chapter.number}</div>
                        <div className="text-xs opacity-70 line-clamp-2">{chapter.title}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Reading Content */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {/* Chapter Header */}
                <div className="mb-8">
                  <Badge variant="outline" className="mb-2">
                    Chapter {currentChapter.number}
                  </Badge>
                  <h1 className="text-2xl font-bold mb-4">{currentChapter.title}</h1>
                  <Separator />
                </div>

                {/* Reading Stats */}
                <div className="mb-6 p-4 rounded-lg bg-muted/50">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>📖 ~{Math.ceil(currentChapter.content.split(' ').length / 200)} min read</span>
                    <span>📄 {currentChapter.content.split(' ').length} words</span>
                    <span>⏱️ Reading time: {formatTime(readingTime)}</span>
                    {user && (
                      <>
                        <span>🖍️ {chapterHighlights.length} highlights</span>
                        <span>📝 {chapterNotes.length} notes</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Reading Instructions */}
                {user && (
                  <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Reading Tips:</strong> Select any text to highlight it automatically. Use the notes panel to add your thoughts and insights.
                    </p>
                  </div>
                )}

                {/* Chapter Content */}
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  {renderTextWithHighlights(currentChapter.content)}
                </div>

                {/* Chapter Navigation */}
                <div className="mt-12 pt-8 border-t">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={goToPreviousChapter}
                      disabled={currentChapterIndex === 0}
                      className="flex items-center w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous Chapter
                    </Button>

                    <div className="text-center order-first sm:order-none">
                      <div className="text-sm text-muted-foreground">
                        Chapter {currentChapter.number} of {chapters.length}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(progress)}% complete
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={goToNextChapter}
                      disabled={currentChapterIndex === chapters.length - 1}
                      className="flex items-center w-full sm:w-auto"
                    >
                      Next Chapter
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* End of Book */}
                {currentChapterIndex === chapters.length - 1 && (
                  <Card className="mt-8">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Congratulations!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        You've finished reading "{book.title}" by {book.author}. 
                        {user && ` Your reading time: ${formatTime(readingTime)}`}
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={onClose}>Return to Book Page</Button>
                        <Button variant="outline" onClick={() => setCurrentChapterIndex(0)}>
                          Read Again
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Notes Panel */}
          {user && showNotesPanel && (
            <div className={`w-80 border-l ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Chapter Notes</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowNotesPanel(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Add New Note */}
              <div className="space-y-3 mb-4">
                <Textarea
                  placeholder="Add a note about this chapter..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={addNewNote} 
                  disabled={!newNoteContent.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              <Separator className="mb-4" />

              {/* Existing Notes */}
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-3">
                  {chapterNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No notes yet. Start by adding your first note above.
                    </p>
                  ) : (
                    chapterNotes.map((note) => (
                      <Card key={note.id} className="p-3">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editNoteContent}
                              onChange={(e) => setEditNoteContent(e.target.value)}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button onClick={saveEditedNote} size="sm">
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button onClick={cancelEditingNote} variant="outline" size="sm">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm mb-2">{note.content}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingNote(note.id, note.content)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeNote(note.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Highlights Section */}
              {chapterHighlights.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-medium mb-3">Chapter Highlights</h3>
                  <div className="space-y-2">
                    {chapterHighlights.map((highlight) => (
                      <Card key={highlight.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Highlighted text:</p>
                            <p 
                              className="text-sm p-1 rounded" 
                              style={{ backgroundColor: highlight.color + '40' }}
                            >
                              "{highlight.text}"
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeHighlight(highlight.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
