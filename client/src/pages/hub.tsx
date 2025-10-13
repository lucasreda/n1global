import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ExternalLink, Calendar, Pin, TrendingUp } from "lucide-react";
import { authenticatedApiRequest } from "@/lib/auth";

// Type definitions
interface Announcement {
  id: string;
  title: string;
  description?: string;
  content: string;
  type: 'update' | 'tip' | 'maintenance' | 'promo';
  publishedAt: string;
  isPinned: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export default function Hub() {
  // Pagination states for announcements
  const [announcementsCurrentPage, setAnnouncementsCurrentPage] = useState(1);
  const announcementsPerPage = 5;

  // Fetch announcements (limited to 6 for news layout)
  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const response = await authenticatedApiRequest("GET", "/api/announcements?limit=6");
      return response.json();
    },
  });

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'tip': return '💡';
      case 'maintenance': return '🔧';
      case 'promo': return '🎁';
      default: return '📢';
    }
  };

  const getAnnouncementBadge = (type: string) => {
    const badges = {
      'update': { label: 'Atualização', variant: 'default' as const },
      'tip': { label: 'Dica', variant: 'secondary' as const },
      'maintenance': { label: 'Manutenção', variant: 'destructive' as const },
      'promo': { label: 'Promoção', variant: 'outline' as const },
    };
    return badges[type as keyof typeof badges] || badges.update;
  };

  // Pagination logic for announcements
  const totalAnnouncements = announcementsData?.data?.length || 0;
  const totalAnnouncementPages = Math.ceil(totalAnnouncements / announcementsPerPage);
  
  const paginatedAnnouncements = announcementsData?.data?.slice(
    (announcementsCurrentPage - 1) * announcementsPerPage,
    announcementsCurrentPage * announcementsPerPage
  ) || [];

  const handleAnnouncementPageChange = (page: number) => {
    setAnnouncementsCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-hub-title">N1 Hub</h1>
          <p className="text-muted-foreground" data-testid="text-hub-description">
            Descubra novos produtos e fique por dentro das últimas novidades
          </p>
        </div>
      </div>

      {/* Novidades Section - News Layout */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Últimas Novidades</h2>
          </div>
          <p className="text-muted-foreground">Fique por dentro das atualizações e dicas mais recentes</p>
        </div>
        
        {announcementsLoading ? (
          <div className="space-y-6">
            {/* First row: 2 cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="h-64">
                  <CardContent className="p-0 h-full flex">
                    <div className="w-32 h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="flex-1 p-4">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-full mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* Second row: 3 cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i + 2} className="h-48">
                  <CardContent className="p-0 h-full flex">
                    <div className="w-24 h-full">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="flex-1 p-4">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : paginatedAnnouncements && paginatedAnnouncements.length > 0 ? (
          <>
            <div className="space-y-6">
              {/* First row: 2 cards, 50/50 */}
              {paginatedAnnouncements.slice(0, 2).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedAnnouncements.slice(0, 2).map((announcement: Announcement) => {
                    const cardClass = "h-64";

                    return (
                      <Card 
                        key={announcement.id} 
                        className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`} 
                        data-testid={`card-announcement-${announcement.id}`}
                      >
                        <CardContent className="p-0 h-full flex">
                          {/* Image or placeholder - Left side */}
                          <div className="w-32 h-full relative overflow-hidden flex-shrink-0">
                            {announcement.imageUrl ? (
                              <img 
                                src={announcement.imageUrl} 
                                alt={announcement.title}
                                className="w-full h-full object-cover"
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              />
                            ) : (
                              <div 
                                className={`w-full h-full bg-gradient-to-r ${
                                  announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                                  announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                                  announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                                  'from-green-400 to-green-600'
                                } flex items-center justify-center`}
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              >
                                <div className="text-white text-xl">
                                  {getAnnouncementIcon(announcement.type)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Content - Right side */}
                          <div className="flex-1 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                                {getAnnouncementBadge(announcement.type).label}
                              </Badge>
                              {announcement.isPinned && (
                                <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                                  <Pin className="w-3 h-3 mr-1" />
                                  Fixado
                                </Badge>
                              )}
                            </div>
                          
                            <h3 className="font-semibold mb-2 line-clamp-2 text-base" data-testid={`text-announcement-title-${announcement.id}`}>
                              {announcement.title}
                            </h3>
                            
                            <p className="text-muted-foreground flex-1 line-clamp-4 text-sm" data-testid={`text-announcement-description-${announcement.id}`}>
                              {announcement.description || ''}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                }) : 'N/A'}
                              </span>
                              {announcement.ctaLabel && announcement.ctaUrl && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-announcement-cta-${announcement.id}`}>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {announcement.ctaLabel}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Second row: remaining cards, up to 3 */}
              {paginatedAnnouncements.slice(2).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedAnnouncements.slice(2).map((announcement: Announcement) => {
                    const cardClass = "h-48";

                    return (
                      <Card 
                        key={announcement.id} 
                        className={`${cardClass} overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`} 
                        data-testid={`card-announcement-${announcement.id}`}
                      >
                        <CardContent className="p-0 h-full flex">
                          {/* Image or placeholder - Left side */}
                          <div className="w-24 h-full relative overflow-hidden flex-shrink-0">
                            {announcement.imageUrl ? (
                              <img 
                                src={announcement.imageUrl} 
                                alt={announcement.title}
                                className="w-full h-full object-cover"
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              />
                            ) : (
                              <div 
                                className={`w-full h-full bg-gradient-to-r ${
                                  announcement.type === 'update' ? 'from-blue-400 to-blue-600' :
                                  announcement.type === 'tip' ? 'from-yellow-400 to-yellow-600' :
                                  announcement.type === 'maintenance' ? 'from-red-400 to-red-600' :
                                  'from-green-400 to-green-600'
                                } flex items-center justify-center`}
                                style={{
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px',
                                  clipPath: 'polygon(0 0, 85% 0, 100% 100%, 0 100%)'
                                }}
                              >
                                <div className="text-white text-xl">
                                  {getAnnouncementIcon(announcement.type)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Content - Right side */}
                          <div className="flex-1 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge {...getAnnouncementBadge(announcement.type)} data-testid={`badge-announcement-type-${announcement.id}`}>
                                {getAnnouncementBadge(announcement.type).label}
                              </Badge>
                              {announcement.isPinned && (
                                <Badge variant="secondary" data-testid={`badge-announcement-pinned-${announcement.id}`}>
                                  <Pin className="w-3 h-3 mr-1" />
                                  Fixado
                                </Badge>
                              )}
                            </div>
                          
                            <h3 className="font-semibold mb-2 line-clamp-2 text-base" data-testid={`text-announcement-title-${announcement.id}`}>
                              {announcement.title}
                            </h3>
                            
                            <p className="text-muted-foreground flex-1 line-clamp-3 text-sm" data-testid={`text-announcement-description-${announcement.id}`}>
                              {announcement.description || ''}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-muted-foreground flex items-center" data-testid={`text-announcement-date-${announcement.id}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('pt-BR', { 
                                  day: 'numeric', 
                                  month: 'short' 
                                }) : 'N/A'}
                              </span>
                              {announcement.ctaLabel && announcement.ctaUrl && (
                                <Button variant="ghost" size="sm" className="h-6 text-xs" data-testid={`button-announcement-cta-${announcement.id}`}>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  {announcement.ctaLabel}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Announcements Pagination */}
            {totalAnnouncementPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAnnouncementPageChange(announcementsCurrentPage - 1)}
                    disabled={announcementsCurrentPage === 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 w-8 h-8 p-0"
                    data-testid="button-prev-announcements"
                  >
                    ←
                  </Button>
                  
                  {[...Array(totalAnnouncementPages)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={announcementsCurrentPage === i + 1 ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleAnnouncementPageChange(i + 1)}
                      className={`w-8 h-8 p-0 text-xs ${
                        announcementsCurrentPage === i + 1 
                          ? '' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`button-announcement-page-${i + 1}`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAnnouncementPageChange(announcementsCurrentPage + 1)}
                    disabled={announcementsCurrentPage === totalAnnouncementPages}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 w-8 h-8 p-0"
                    data-testid="button-next-announcements"
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground" data-testid="text-no-announcements">
              Nenhuma novidade disponível
            </p>
          </div>
        )}
      </div>

    </div>
  );
}