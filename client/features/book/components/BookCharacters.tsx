import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  shortDescription?: string | null;
  persona?: string | null;
  exampleResponses?: string[] | null;
}

interface BookCharactersProps {
  characters: Character[];
  loading: boolean;
  error?: string;
  onSelectCharacter?: (character: Character) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function CharacterSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export function BookCharacters({
  characters,
  loading,
  error,
  onSelectCharacter,
}: BookCharactersProps) {
  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Meet the Characters</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CharacterSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Meet the Characters</h2>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (characters.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Meet the Characters</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((character) => (
          <Card key={character.id} className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className={`h-12 w-12 border-2 ${getAvatarColor(character.name)}`}>
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${character.name}`} />
                  <AvatarFallback className={getAvatarColor(character.name)}>
                    {getInitials(character.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{character.name}</CardTitle>
                  {character.shortDescription && (
                    <CardDescription className="text-xs line-clamp-1">
                      {character.shortDescription}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {character.persona && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {character.persona}
                </p>
              )}

              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => onSelectCharacter?.(character)}
              >
                <MessageCircle className="h-4 w-4" />
                Start Chat
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
