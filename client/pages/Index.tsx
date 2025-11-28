import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, MessageCircle, Users, GraduationCap, Wand2, Heart, Star, Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const features = [
    {
      icon: Wand2,
      title: "Fiction Magic",
      description: "Chat with characters, explore alternate scenarios, and dive deep into rich storylines",
      color: "fiction",
      category: "Fiction"
    },
    {
      icon: GraduationCap,
      title: "Smart Learning",
      description: "Ask our Q&A tutor that cites directly from non-fiction books for accurate answers",
      color: "nonfiction",
      category: "Non-Fiction"
    },
    {
      icon: Users,
      title: "Family Friendly",
      description: "Curated children's section with character interaction and parental guidance tips",
      color: "children",
      category: "Children's"
    }
  ];

  const benefits = [
    "Chapter-wise summaries for quick understanding",
    "Interactive highlights and annotations",
    "Read-along text with audio support",
    "Character-based conversations",
    "Alternate scenario exploration",
    "Educational Q&A assistance"
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-background via-background to-primary/5 py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2">
              Interactive Reading Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Welcome to <span className="text-primary">BookHub</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Transform your reading experience with interactive summaries, character conversations, 
              and intelligent Q&A across fiction, non-fiction, and children's books.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/library">
                <Button size="lg" className="px-8 py-6 text-lg">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Explore Library
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                  <Play className="h-5 w-5 mr-2" />
                  Start Reading
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Three Unique Reading Experiences
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Each category offers specialized features designed to enhance your reading journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-xl bg-${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`h-8 w-8 text-${feature.color}-foreground`} />
                    </div>
                    <Badge variant="secondary" className="w-fit mb-2">
                      {feature.category}
                    </Badge>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-muted/30 py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Why Choose BookHub?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We've reimagined reading with cutting-edge features that make books more engaging, 
                interactive, and educational than ever before.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Star className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-fiction/10 border-fiction/20">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 text-fiction mx-auto mb-4" />
                  <h3 className="font-semibold text-fiction mb-2">Character Chat</h3>
                  <p className="text-sm text-muted-foreground">
                    Talk to your favorite characters
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-nonfiction/10 border-nonfiction/20">
                <CardContent className="p-6 text-center">
                  <GraduationCap className="h-12 w-12 text-nonfiction mx-auto mb-4" />
                  <h3 className="font-semibold text-nonfiction mb-2">Smart Q&A</h3>
                  <p className="text-sm text-muted-foreground">
                    Get answers with citations
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-children/10 border-children/20">
                <CardContent className="p-6 text-center">
                  <Heart className="h-12 w-12 text-children mx-auto mb-4" />
                  <h3 className="font-semibold text-children mb-2">Family Safe</h3>
                  <p className="text-sm text-muted-foreground">
                    Curated content for kids
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="font-semibold text-accent mb-2">Rich Summaries</h3>
                  <p className="text-sm text-muted-foreground">
                    Chapter-wise breakdowns
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Transform Your Reading?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of readers experiencing books like never before. 
                Start your interactive reading journey today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/library">
                  <Button size="lg" className="px-8 py-6 text-lg">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Browse Library
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
