import { z } from "zod";

export const NicheDetectSchema = z.object({
  niche: z.string().min(1),
  subniches: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});

export type NicheDetect = z.infer<typeof NicheDetectSchema>;

export const ProductAnalysisSchema = z.object({
  aiCategory: z.string().min(1),
  score: z.number().int().min(0).max(100),
  status: z.enum(["good", "attention", "problem"]),
  suggestion: z.string().min(1),
  topFixes: z.array(z.string()).max(6).default([]),
  priceNotes: z.string().nullable().optional(),
  seoNotes: z.string().nullable().optional(),
});

export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;

export const MarketSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url().optional(),
});

export const MarketInsightSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  sources: z.array(MarketSourceSchema).default([]),
});

export const MarketReconSchema = z.object({
  painPoints: z.array(MarketInsightSchema).default([]),
  trends: z.array(MarketInsightSchema).default([]),
  opportunities: z.array(MarketInsightSchema).default([]),
});

export type MarketRecon = z.infer<typeof MarketReconSchema>;

export const ProductIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().min(1),
      longDescriptionSeo: z.string().min(1),
      recommendedPrice: z.number().finite().nonnegative(),
      estimatedMarginPercent: z.number().finite().min(0).max(100),
      tags: z.array(z.string()).default([]),
      productType: z.string().min(1),
      variants: z
        .array(
          z.object({
            optionName: z.string().min(1),
            values: z.array(z.string().min(1)).min(1),
          }),
        )
        .default([]),
    }),
  ),
});

export type ProductIdeas = z.infer<typeof ProductIdeasSchema>;

