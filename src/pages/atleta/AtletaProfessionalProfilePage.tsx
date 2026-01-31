import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTransition } from '@/components/common/PageTransition';
import { PageLoader } from '@/components/common/PageLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Euro, 
  Wifi, 
  Calendar, 
  Award,
  Stethoscope,
  Apple,
  Clock,
  CheckCircle2,
  Phone,
  Mail
} from 'lucide-react';

export default function AtletaProfessionalProfilePage() {
  const { professionalId } = useParams<{ professionalId: string }>();
  const navigate = useNavigate();

  const { data: professional, isLoading } = useQuery({
    queryKey: ['professional-profile', professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('id', professionalId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!professionalId
  });

  if (isLoading) return <PageLoader />;
  if (!professional) return <div className="p-4 text-center text-app-muted-foreground">Professionista non trovato</div>;

  const Icon = professional.profession_type === 'nutrizionista' ? Apple : Stethoscope;
  const professionLabel = professional.profession_type === 'nutrizionista' ? 'Nutrizionista' : 'Fisioterapista';
  const professionColor = professional.profession_type === 'nutrizionista' ? 'text-green-400' : 'text-blue-400';

  return (
    <PageTransition>
      <div className="min-h-screen bg-app-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-app-background/95 backdrop-blur-sm border-b border-app-border">
          <div className="flex items-center gap-3 p-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="text-app-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-app-foreground">Profilo {professionLabel}</h1>
          </div>
        </div>

        {/* Profile Header */}
        <div className="p-4 pb-0">
          <Card className="bg-gradient-to-br from-app-card to-app-muted border-app-border overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-app-accent/20">
                    <AvatarImage src={professional.avatar_url || undefined} />
                    <AvatarFallback className="bg-app-muted text-app-foreground text-2xl">
                      {(professional.first_name?.[0] || '') + (professional.last_name?.[0] || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 p-2 bg-app-card rounded-full border-2 border-app-background ${professionColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-app-foreground">
                    {professional.first_name} {professional.last_name}
                  </h2>
                  <p className={`text-sm font-medium ${professionColor}`}>{professionLabel}</p>
                  
                  {/* Rating */}
                  {professional.rating_avg && professional.rating_avg > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-5 w-5 fill-app-accent text-app-accent" />
                      <span className="font-semibold text-app-foreground">{Number(professional.rating_avg).toFixed(1)}</span>
                      <span className="text-app-muted-foreground">({professional.review_count} recensioni)</span>
                    </div>
                  )}
                  
                  {/* Location */}
                  {professional.location_city && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-app-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{professional.location_city}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <Card className="bg-app-card border-app-border">
            <CardContent className="p-3 text-center">
              <Euro className="h-5 w-5 mx-auto text-app-accent mb-1" />
              <p className="text-lg font-bold text-app-foreground">
                {professional.hourly_rate ? `€${professional.hourly_rate}` : '-'}
              </p>
              <p className="text-xs text-app-muted-foreground">all'ora</p>
            </CardContent>
          </Card>
          
          <Card className="bg-app-card border-app-border">
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-app-accent mb-1" />
              <p className="text-lg font-bold text-app-foreground">
                {professional.experience_years || 0}
              </p>
              <p className="text-xs text-app-muted-foreground">anni exp.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-app-card border-app-border">
            <CardContent className="p-3 text-center">
              <Award className="h-5 w-5 mx-auto text-app-accent mb-1" />
              <p className="text-lg font-bold text-app-foreground">
                {professional.certifications?.length || 0}
              </p>
              <p className="text-xs text-app-muted-foreground">certificazioni</p>
            </CardContent>
          </Card>
        </div>

        {/* Modalità */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {professional.offers_in_person && (
              <Badge className="bg-app-accent/10 text-app-accent border-app-accent/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                In presenza
              </Badge>
            )}
            {professional.offers_online && (
          <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20">
            <Wifi className="h-3 w-3 mr-1" />
            Online
          </Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        {professional.bio && (
          <div className="px-4 pb-4">
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-app-foreground mb-2">Chi sono</h3>
                <p className="text-sm text-app-muted-foreground leading-relaxed">
                  {professional.bio}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Specializzazioni */}
        {professional.specializations && professional.specializations.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-app-foreground mb-3">Specializzazioni</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.specializations.map((spec: string, i: number) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="bg-app-muted text-app-foreground"
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Certificazioni */}
        {professional.certifications && professional.certifications.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="bg-app-card border-app-border">
              <CardContent className="p-4">
                <h3 className="font-semibold text-app-foreground mb-3">Certificazioni</h3>
                <div className="space-y-2">
                  {professional.certifications.map((cert: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-app-muted-foreground">
                      <Award className="h-4 w-4 text-app-accent flex-shrink-0" />
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA Contatta */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-app-background via-app-background to-transparent">
          <Button 
            className="w-full bg-app-accent text-app-accent-foreground hover:bg-app-accent/90 h-12 text-base font-semibold"
            onClick={() => {
              // TODO: Implementare contatto diretto
            }}
          >
            <Phone className="h-5 w-5 mr-2" />
            Contatta {professionLabel}
          </Button>
        </div>

        {/* Spacer per il bottone fisso */}
        <div className="h-32" />
      </div>
    </PageTransition>
  );
}
