import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Play } from 'lucide-react';

interface BookMetadataProps {
  readingProgress: number;
  totalChapters: number;
  currentChapter: number;
  hasBookFile: boolean;
  isLoggedIn: boolean;
  onStartReading: () => void;
}

export function BookMetadata({
  readingProgress,
  totalChapters,
  currentChapter,
  hasBookFile,
  isLoggedIn,
  onStartReading,
}: BookMetadataProps) {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Reading Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Reading Progress</h3>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Chapter {currentChapter} of {totalChapters}</span>
                  <span className="font-semibold">{Math.round(readingProgress)}%</span>
                </div>
                <Progress value={readingProgress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reading Stats Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages Read</span>
                  <span className="font-semibold">{Math.round(readingProgress)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Chapter</span>
                  <span className="font-semibold">{currentChapter}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {hasBookFile && isLoggedIn ? (
                <>
                  <Button
                    onClick={onStartReading}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Play className="h-4 w-4" />
                    {readingProgress > 0 ? 'Continue Reading' : 'Start Reading'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {readingProgress > 0 
                      ? 'Resume from where you left off'
                      : 'Open the interactive reader'}
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {!isLoggedIn ? 'Sign in to read' : 'No book file available'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
