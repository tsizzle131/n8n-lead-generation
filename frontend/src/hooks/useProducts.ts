import { useQuery } from '@tanstack/react-query';

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  product_url?: string;
  value_proposition?: string;
  target_audience?: string;
  industry?: string;
  messaging_tone?: string;
  product_features?: string[] | null;
  product_examples?: string[] | null;
  custom_icebreaker_prompt?: string;
  target_categories?: string[] | null;
  category_matching_keywords?: string[] | null;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  product_analyzed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function useProducts(organizationId: string | null) {
  return useQuery({
    queryKey: ['products', organizationId],
    queryFn: async (): Promise<Product[]> => {
      if (!organizationId) {
        return [];
      }

      const response = await fetch(`/organizations/${organizationId}/products`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      return data.products || [];
    },
    enabled: !!organizationId, // Only run query if we have an organization ID
    staleTime: 60000, // Consider data fresh for 1 minute
  });
}
