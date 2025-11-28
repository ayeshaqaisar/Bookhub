import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Clock, CheckCircle, AlertCircle, Book, X, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function Admin() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [genre, setGenre] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [uploadedBooks, setUploadedBooks] = useState<UploadedBook[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [adminBooks, setAdminBooks] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [bookFetchError, setBookFetchError] = useState<string | null>(null);

  // Authorization check - redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || user.userRole !== 'admin')) {
      navigate('/profile', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    fetchAdminBooks();
  }, []);

  const fetchAdminBooks = async () => {
    setIsLoadingBooks(true);
    setBookFetchError(null);
    try {
      const response = await fetch('/api/v1/admin/books');
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to fetch books');
      }
      const data = await response.json();
      setAdminBooks(data.data || []);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load book status';
      setBookFetchError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const allBooks = adminBooks.length > 0 ? adminBooks : [ ...uploadedBooks];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const MAX_PDF_MB = 50;
  const MAX_IMG_MB = 10;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_PDF_MB) {
      toast({ title: "File too large", description: `Max PDF size is ${MAX_PDF_MB} MB`, variant: "destructive" });
      event.currentTarget.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleCoverSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_IMG_MB) {
      toast({ title: "Image too large", description: `Max image size is ${MAX_IMG_MB} MB`, variant: "destructive" });
      event.currentTarget.value = "";
      setCoverFile(null);
      return;
    }
    setCoverFile(file);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    const isChildren = bookCategory === 'Children';
    const hasAgeGroup = ageGroup && ageGroup.trim().length > 0;
    return Boolean(
      bookTitle.trim() &&
      bookAuthor.trim() &&
      bookCategory &&
      selectedFile &&
      coverFile &&
      (!isChildren || hasAgeGroup)
    );
  };

  const handleFileUpload = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields and select a file.');
      return;
    }

    setShowUploadDialog(true);
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) return 95; // keep some room until actual upload completes
        return prev + Math.random() * 15 + 5;
      });
    }, 300);

    try {
      if (!selectedFile) throw new Error('No file selected');
      if (!coverFile) throw new Error('No cover selected');

      const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mapCategory = (cat: string) => {
        const c = cat.toLowerCase();
        if (c.includes('non')) return 'nonfiction';
        if (c.includes('child')) return 'children';
        return 'fiction';
      };

      const pdfBase64 = await fileToDataUrl(selectedFile);
      const coverBase64 = await fileToDataUrl(coverFile);

      const payload = {
        title: bookTitle,
        author: bookAuthor,
        category: mapCategory(bookCategory),
        age_group: ageGroup || '18+',
        description: bookDescription || '',
        genre: genre || '',
        pdfBase64,
        coverBase64,
      };

      const resp = await fetch('/api/v1/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        const baseMsg = (data && (data.error || data.message)) || resp.statusText || 'Upload failed';
        const details = data && (data.details || data.error_description);
        const msg = details ? `${baseMsg}: ${details}` : baseMsg;
        throw new Error(msg);
      }

      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);

      const newBook: UploadedBook = {
        id: Date.now(),
        title: bookTitle,
        author: bookAuthor,
        category: bookCategory,
        status: 'processing',
        uploadDate: new Date().toISOString().split('T')[0],
        progress: 0,
        chapters: Math.floor(Math.random() * 15) + 5,
        fileName: selectedFile.name,
      };

      setUploadedBooks((prev) => [newBook, ...prev]);

      setBookTitle('');
      setBookAuthor('');
      setBookCategory('');
          setAgeGroup('');
          setGenre('');
          setBookDescription('');
      setSelectedFile(null);
      setCoverFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';

      setTimeout(() => {
        setShowUploadDialog(false);
      }, 1500);
    } catch (err: any) {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);

      const errorBook: UploadedBook = {
        id: Date.now(),
        title: bookTitle,
        author: bookAuthor,
        category: bookCategory,
        status: 'error',
        uploadDate: new Date().toISOString().split('T')[0],
        progress: 0,
        chapters: 0,
        fileName: selectedFile?.name,
      };
      setUploadedBooks((prev) => [errorBook, ...prev]);

      setUploadError(err?.message || 'Unknown error');
      toast({ title: "Upload failed", description: err?.message || 'Unknown error', variant: "destructive" });
    }
  };

  const resetForm = () => {
    setBookTitle('');
    setBookAuthor('');
    setBookCategory('');
          setAgeGroup('');
          setGenre('');
          setBookDescription('');
    setSelectedFile(null);
    setCoverFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  // Show loading state while checking authorization
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Manage book uploads and monitor processing status
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Book</TabsTrigger>
          <TabsTrigger value="status">Book Status</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Upload New Book
              </CardTitle>
              <CardDescription>
                Upload a new book to the BookHub platform for processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Book Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter book title"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      placeholder="Enter author name"
                      value={bookAuthor}
                      onChange={(e) => setBookAuthor(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={bookCategory}
                      onValueChange={(val) => {
                        setBookCategory(val);
                        if (val === 'Fiction' || val === 'Non-Fiction') {
                          setAgeGroup('18+');
                        } else if (val === 'Children') {
                          setAgeGroup('');
                        } else {
                          setAgeGroup('');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fiction">Fiction</SelectItem>
                        <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                        <SelectItem value="Children">Children's Books</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ageGroup">Age Group {bookCategory === 'Children' ? '*' : ''}</Label>
                    <Select
                      value={ageGroup}
                      onValueChange={setAgeGroup}
                      disabled={!bookCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={bookCategory === 'Children' ? 'Select age group' : 'Select age group (default 18+)'} />
                      </SelectTrigger>
                      <SelectContent>
                        {bookCategory !== 'Children' && (
                          <SelectItem value="18+">18+</SelectItem>
                        )}
                        <SelectItem value="5-7">5-7</SelectItem>
                        <SelectItem value="8-12">8-12</SelectItem>
                        <SelectItem value="12-15">12-15</SelectItem>
                        <SelectItem value="16-18">16-18</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="genre">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fantasy">Fantasy</SelectItem>
                        <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                        <SelectItem value="Mystery">Mystery</SelectItem>
                        <SelectItem value="Thriller">Thriller</SelectItem>
                        <SelectItem value="Romance">Romance</SelectItem>
                        <SelectItem value="Historical">Historical</SelectItem>
                        <SelectItem value="Horror">Horror</SelectItem>
                        <SelectItem value="Biography">Biography</SelectItem>
                        <SelectItem value="Self-Help">Self-Help</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Young Adult">Young Adult</SelectItem>
                        <SelectItem value="Children">Children</SelectItem>
                        <SelectItem value="Poetry">Poetry</SelectItem>
                        <SelectItem value="Graphic Novel">Graphic Novel</SelectItem>
                        <SelectItem value="Adventure">Adventure</SelectItem>
                        <SelectItem value="Philosophy">Philosophy</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter book description"
                      rows={3}
                      value={bookDescription}
                      onChange={(e) => setBookDescription(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Book File *</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedFile ? (
                          <span className="font-medium text-foreground">
                            Selected: {selectedFile.name}
                          </span>
                        ) : (
                          `Select your book file (PDF). Max ${MAX_PDF_MB} MB`
                        )}
                      </p>
                      <Button variant="outline" onClick={handleChooseFile}>
                        <Upload className="h-4 w-4 mr-2" />
                        {selectedFile ? 'Change File' : 'Choose File'}
                      </Button>
                      {selectedFile && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          File size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Cover Image *</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverSelect}
                        className="hidden"
                      />
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {coverFile ? (
                          <span className="font-medium text-foreground">Selected: {coverFile.name}</span>
                        ) : (
                          'Select cover image (JPG/PNG)'
                        )}
                      </p>
                      <Button variant="outline" onClick={() => coverInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {coverFile ? 'Change Cover' : `Choose Cover (Max ${MAX_IMG_MB} MB)`}
                      </Button>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                  Reset Form
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={isUploading || !validateForm()}
                  className="min-w-[120px]"
                >
                  {isUploading ? "Uploading..." : "Upload Book"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center">
                  <Book className="h-5 w-5 mr-2" />
                  Book Processing Status
                </CardTitle>
                <CardDescription>
                  Monitor the status of uploaded books and their processing progress
                </CardDescription>
              </div>
              <Button
                onClick={fetchAdminBooks}
                disabled={isLoadingBooks}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingBooks ? 'animate-spin' : ''}`} />
                {isLoadingBooks ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent>
              {bookFetchError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {bookFetchError}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book Details</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBooks.map((book) => {
                    const status = book.processing_status || book.status || 'unknown';
                    const progress = book.processing_progress ? parseInt(book.processing_progress) : (book.progress || 0);
                    const uploadDate = book.created_at || book.uploadDate;
                    const chapters = book.chapters || '—';

                    return (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              by {book.author} • {chapters} chapters
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{book.category || 'unknown'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(status)}
                            <Badge
                              variant="secondary"
                              className={getStatusColor(status)}
                            >
                              {status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="w-16" />
                            <span className="text-xs text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {uploadDate ? new Date(uploadDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Status Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => { setShowUploadDialog(open); if (!open) { setUploadError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {isUploading ? (
                <Upload className="h-5 w-5 mr-2 text-blue-600" />
              ) : uploadError ? (
                <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              )}
              {isUploading ? 'Your book is uploading...' : uploadError ? 'Upload failed' : 'Upload Complete!'}
            </DialogTitle>
            <DialogDescription>
              {isUploading
                ? 'Please wait while we process your book upload. This may take a few moments.'
                : uploadError
                  ? `We couldn't upload your book. ${uploadError}`
                  : 'Your book has been successfully uploaded and is now being processed. You can check the status in the Book Status tab.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedFile && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">{bookTitle}</p>
                <p className="text-xs text-muted-foreground">by {bookAuthor}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  File: {selectedFile.name}
                </p>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {!isUploading && (
              <div className="flex justify-center">
                {uploadError ? (
                  <Button variant="destructive" onClick={() => setShowUploadDialog(false)} className="min-w-[100px]">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                ) : (
                  <Button onClick={() => setShowUploadDialog(false)} className="min-w-[100px]">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
