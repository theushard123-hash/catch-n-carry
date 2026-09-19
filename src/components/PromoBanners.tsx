import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

type Banner = Tables<"banners">;

function isVisible(b: Banner, customerType: "atacado" | "varejo") {
  const today = new Date().toISOString().slice(0, 10);
  if (b.customer_type && b.customer_type !== customerType) return false;
  if (b.starts_at && b.starts_at > today) return false;
  if (b.ends_at && b.ends_at < today) return false;
  return true;
}

export function PromoBanners({ customerType }: { customerType: "atacado" | "varejo" }) {
  const q = useQuery({
    queryKey: ["banners", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Banner[];
    },
  });

  if (q.isLoading) return <Skeleton className="mb-6 h-48 w-full rounded-2xl" />;

  const banners = (q.data ?? []).filter((b) => isVisible(b, customerType));
  if (banners.length === 0) return null;

  return (
    <div className="mb-6">
      <Carousel opts={{ loop: banners.length > 1 }} className="w-full">
        <CarouselContent>
          {banners.map((b) => {
            const inner = (
              <div className="relative overflow-hidden rounded-2xl border bg-card shadow-soft">
                <img
                  src={b.image_url}
                  alt={b.title || "Novidade Trapiche Pescados"}
                  className="h-48 w-full object-cover sm:h-64"
                  loading="lazy"
                />
                {(b.title || b.description) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent p-5">
                    {b.title && (
                      <h3 className="font-display text-xl font-bold text-primary-foreground">{b.title}</h3>
                    )}
                    {b.description && (
                      <p className="mt-1 max-w-2xl text-sm text-primary-foreground/85">{b.description}</p>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <CarouselItem key={b.id}>
                {b.link_url ? (
                  <a href={b.link_url} target="_blank" rel="noreferrer noopener" className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-3" />
            <CarouselNext className="right-3" />
          </>
        )}
      </Carousel>
    </div>
  );
}
