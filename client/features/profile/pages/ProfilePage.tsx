import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  Save, 
  X, 
  BookOpen, 
  Heart, 
  Clock,
  Star,
  Upload,
  Settings,
  LogOut,
  TrendingUp
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchFavorites } from "@/lib/favorites";

export function Profile() {
  const { user, logout, updateProfile, readingProgress, favoriteBooks, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    age: "",
    contact: "",
    avatar: ""
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [apiFavoriteBooks, setApiFavoriteBooks] = useState<any[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
    if (user) {
      setEditData({
        name: user.name,
        age: user.age?.toString() || "",
        contact: user.contact || "",
        avatar: user.avatar || ""
      });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;

      setIsFavoritesLoading(true);
      try {
        const favorites = await fetchFavorites();
        setApiFavoriteBooks(favorites);
      } catch (error) {
        console.error('Failed to fetch favorite books:', error);
      } finally {
        setIsFavoritesLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSuccess("");
    
    try {
      await updateProfile({
        name: editData.name,
        age: editData.age ? parseInt(editData.age) : undefined,
        contact: editData.contact || undefined,
        avatar: editData.avatar || undefined
      });
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const readingStats = {
    totalBooks: readingProgress.length,
    totalProgress: readingProgress.reduce((sum, book) => sum + book.progress, 0),
    avgProgress: readingProgress.length > 0 ? Math.round(readingProgress.reduce((sum, book) => sum + book.progress, 0) / readingProgress.length) : 0,
    favoriteCount: apiFavoriteBooks.length
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={isEditing ? editData.avatar : user.avatar} alt={user.name} />
                  <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Label htmlFor="profile-upload" className="absolute -bottom-2 -right-2 cursor-pointer">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90">
                      <Upload className="h-4 w-4" />
                    </div>
                  </Label>
                )}
                <Input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        className="max-w-md"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 max-w-md">
                      <div>
                        <Label htmlFor="edit-age">Age</Label>
                        <Input
                          id="edit-age"
                          type="number"
                          value={editData.age}
                          onChange={(e) => setEditData(prev => ({ ...prev, age: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-contact">Phone</Label>
                        <Input
                          id="edit-contact"
                          value={editData.contact}
                          onChange={(e) => setEditData(prev => ({ ...prev, contact: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{user.name}</h1>
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.age && (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{user.age} years old</span>
                        </div>
                      )}
                      {user.contact && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{user.contact}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} disabled={saveLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {saveLoading ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{readingStats.totalBooks}</div>
            <p className="text-sm text-muted-foreground">Books Reading</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{readingStats.avgProgress}%</div>
            <p className="text-sm text-muted-foreground">Avg Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{readingStats.favoriteCount}</div>
            <p className="text-sm text-muted-foreground">Favorites</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {readingProgress.reduce((sum, book) => sum + book.currentChapter, 0)}
            </div>
            <p className="text-sm text-muted-foreground">Chapters Read</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="continue-reading" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="continue-reading">Continue Reading</TabsTrigger>
          <TabsTrigger value="favorites">My Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="continue-reading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Continue Reading
              </CardTitle>
              <CardDescription>
                Pick up where you left off
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const booksInProgress = readingProgress.filter(book => book.progress > 0);
                return booksInProgress.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {booksInProgress.map((book) => (
                      <Card key={book.bookId} className="group hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex space-x-4">
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="w-16 h-24 object-cover rounded"
                            />
                            <div className="flex-1 space-y-2">
                              <h3 className="font-semibold text-sm">{book.title}</h3>
                              <p className="text-xs text-muted-foreground">by {book.author}</p>

                              <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span>Progress</span>
                                  <span>{book.progress}%</span>
                                </div>
                                <Progress value={book.progress} className="h-2" />

                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Current Page: {book.currentChapter}</span>
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date(book.lastRead).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <Link to={`/book/${book.bookId}`} className="block">
                                <Button size="sm" className="w-full">
                                  Continue Reading
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No books in progress</h3>
                    <p className="text-muted-foreground mb-4">
                      Start reading a book to see your progress here
                    </p>
                    <Link to="/library">
                      <Button>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Browse Library
                      </Button>
                    </Link>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                My Favorites
              </CardTitle>
              <CardDescription>
                Books you've marked as favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFavoritesLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading favorites...</p>
                </div>
              ) : apiFavoriteBooks.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apiFavoriteBooks.map((fav: any) => (
                    <Card key={fav.book_id} className="group hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex space-x-4">
                          <img
                            src={fav.booksdetails?.cover_url || "/placeholder.svg"}
                            alt={fav.booksdetails?.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-sm">{fav.booksdetails?.title}</h3>
                            <p className="text-xs text-muted-foreground">by {fav.booksdetails?.author}</p>

                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 fill-red-500 text-red-500" />
                                Favorited
                              </span>
                              <span>{new Date(fav.updated_at).toLocaleDateString()}</span>
                            </div>

                            <Link to={`/book/${fav.book_id}`} className="block">
                              <Button size="sm" variant="outline" className="w-full">
                                View Book
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Mark books as favorites to see them here
                  </p>
                  <Link to="/library">
                    <Button>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Discover Books
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Profile;
