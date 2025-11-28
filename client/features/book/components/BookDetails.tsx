import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

interface BookDetailsProps {
  description: string;
  genres: string[];
  ageGroup?: string;
  publisher?: string;
  publicationYear?: number;
  totalChapters: number;
  chapters?: Array<{
    number: number;
    title: string;
    description?: string;
  }>;
}

export function BookDetails({
  description,
  genres = [],
  ageGroup,
  publisher,
  publicationYear,
  totalChapters,
  chapters = [],
}: BookDetailsProps) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>About This Book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">{description}</p>

          {/* Metadata Grid */}
          <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-3">Book Information</h4>
              <div className="space-y-2 text-sm">
                {publisher && (
                  <div>
                    <span className="text-muted-foreground">Publisher:</span>{' '}
                    <span className="font-medium">{publisher}</span>
                  </div>
                )}
                {publicationYear && (
                  <div>
                    <span className="text-muted-foreground">Published:</span>{' '}
                    <span className="font-medium">{publicationYear}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Chapters:</span>{' '}
                  <span className="font-medium">{totalChapters}</span>
                </div>
                {ageGroup && (
                  <div>
                    <span className="text-muted-foreground">Recommended Age:</span>{' '}
                    <Badge variant="outline" className="ml-1">Ages {ageGroup}+</Badge>
                  </div>
                )}
              </div>
            </div>

            {genres.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-3">Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chapters Section */}
      {chapters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chapters</CardTitle>
            <CardDescription>Browse the book's chapters</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {chapters.map((chapter) => (
                <AccordionItem
                  key={`chapter-${chapter.number}`}
                  value={`chapter-${chapter.number}`}
                >
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-3 w-full text-left">
                      <span className="text-sm font-semibold text-muted-foreground min-w-fit">
                        Chapter {chapter.number}
                      </span>
                      <span className="font-medium">{chapter.title}</span>
                    </span>
                  </AccordionTrigger>
                  {chapter.description && (
                    <AccordionContent className="text-muted-foreground">
                      {chapter.description}
                    </AccordionContent>
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
