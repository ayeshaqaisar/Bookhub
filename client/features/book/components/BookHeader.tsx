import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BookHeaderProps {
  title: string;
  author: string;
  coverUrl: string;
  genre?: string;
  ageGroup?: string;
  isFavorite: boolean;
  isTogglingFavorite: boolean;
  onFavoriteClick: () => void;
  isLoggedIn: boolean;
}

export function BookHeader({
  title,
  author,
  coverUrl,
  genre,
  ageGroup,
  isFavorite,
  isTogglingFavorite,
  onFavoriteClick,
  isLoggedIn,
}: BookHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Book Cover */}
          <div className="md:col-span-1">
            <img
              src={coverUrl}
              alt={title}
              className="w-full h-auto rounded-lg shadow-xl object-cover"
            />
          </div>

          {/* Book Info */}
          <div className="md:col-span-2">
            <h1 className="text-4xl font-bold mb-2 text-foreground">{title}</h1>
            <p className="text-xl text-muted-foreground mb-6">by {author}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {genre && <Badge variant="secondary">{genre}</Badge>}
              {ageGroup && <Badge variant="outline">Ages {ageGroup}+</Badge>}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
              variant={isFavorite ? 'default' : 'outline'}
              size="lg"
              onClick={onFavoriteClick}
              disabled={isTogglingFavorite || !isLoggedIn}
                className="gap-2"
              backhcolour="black"
            >
                <Heart
                  className="h-5 w-5"
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
                {isFavorite ? 'Favorited' : 'Add to Favorites'}
              </Button>

              {!isLoggedIn && (
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In to Favorite
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
