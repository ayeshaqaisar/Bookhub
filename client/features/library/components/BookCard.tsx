import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, MessageCircle, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  description?: string | null;
  genre?: string | null;
  age_group: string;
  cover_url?: string | null;
  category: 'fiction' | 'nonfiction' | 'children';
}

interface BookCardProps {
  book: BookCardData;
  hasChatFeature: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (bookId: string) => void;
  isTogglingFavorite?: boolean;
}

export function BookCard({ book, hasChatFeature, isFavorite = false, onToggleFavorite, isTogglingFavorite = false }: BookCardProps) {

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Book Cover */}
            <div className="mb-4">
              <img
                src={book.cover_url || '/placeholder.svg'}
                alt={book.title}
                className="w-full h-48 object-cover rounded-md"
              />
            </div>

            {/* Title */}
            <Link to={`/book/${book.id}`}>
              <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors cursor-pointer">
                {book.title}
              </CardTitle>
            </Link>

            {/* Author */}
            <p className="text-sm text-muted-foreground mb-2">by {book.author}</p>

            {/* Description */}
            {book.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {book.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {book.genre && (
            <Badge variant="secondary" className="text-xs">
              {book.genre}
            </Badge>
          )}
          {book.age_group && (
            <Badge variant="outline" className="text-xs">
              Ages {book.age_group}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Action Buttons */}
      <CardContent>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Link to={`/book/${book.id}`} className="flex-1">
              <Button className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
            {onToggleFavorite && (
              <Button
                className={`${isFavorite ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-white border text-black-700 hover:bg-accent'}`}
                size="icon"
                onClick={() => onToggleFavorite(book.id)}
                disabled={isTogglingFavorite}
                title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            )}
            {hasChatFeature && (
              <Link to={`/book/${book.id}`}>
                <Button variant="outline" size="icon">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
