import type { PuterModelId } from "~/ai/puter.client";

export type NicheDetectInputProduct = {
  title: string;
  productType?: string | null;
  tags?: string[] | null;
  price?: string | null;
};

export function promptDetectNiche(products: NicheDetectInputProduct[]) {
  return [
    "Analizza questi prodotti e identifica la nicchia principale con sottocategorie.",
    "Rispondi SOLO come JSON valido, senza testo extra.",
    "Schema JSON:",
    "{",
    '  "niche": "string",',
    '  "subniches": ["string"],',
    '  "confidence": 0-1,',
    '  "reasoning": "string breve"',
    "}",
    "",
    "Prodotti (riassunto):",
    JSON.stringify(products.slice(0, 80), null, 2),
  ].join("\n");
}

export function promptAnalyzeProduct(product: {
  title: string;
  description?: string | null;
  price?: string | null;
  stock?: number | null;
  productType?: string | null;
  tags?: string[] | null;
  niche?: string | null;
}) {
  return [
    "Sei Shelf Recon, un AI Store Intelligence Agent per merchant Shopify.",
    "Analizza il prodotto e trova problemi e opportunita': prezzo sbagliato, posizionamento, tag/SEO, varianti, bundle, upsell.",
    "Tono: amichevole, intelligente, un po' sarcastico (ma utile).",
    "Rispondi SOLO come JSON valido, senza testo extra.",
    "Schema JSON:",
    "{",
    '  "aiCategory": "string",',
    '  "score": 0-100,',
    '  "status": "good|attention|problem",',
    '  "suggestion": "string (1-2 frasi)",',
    '  "topFixes": ["string", "string", "string"],',
    '  "priceNotes": "string | null",',
    '  "seoNotes": "string | null"',
    "}",
    "",
    "Contesto prodotto:",
    JSON.stringify(product, null, 2),
  ].join("\n");
}

export function promptMarketRecon(niche: string) {
  return [
    `Trova le lamentele piu' comuni su Reddit e recensioni per la nicchia "${niche}".`,
    "Poi trova trend in crescita e opportunita' di prodotto correlate.",
    "Rispondi SOLO come JSON valido, senza testo extra.",
    "Schema JSON:",
    "{",
    '  "painPoints": [{"title":"string","detail":"string","sources":[{"title":"string","url":"string"}]}],',
    '  "trends": [{"title":"string","detail":"string","sources":[{"title":"string","url":"string"}]}],',
    '  "opportunities": [{"title":"string","detail":"string","sources":[{"title":"string","url":"string"}]}]',
    "}",
    "",
    "Note:",
    "- Dai priorita' a Reddit. Se citi, includi URL quando possibile.",
    "- Sii concreto: sintomi, parole chiave, esempi di frasi degli utenti (senza citazioni lunghe).",
  ].join("\n");
}

export function promptGenerateProductIdeas(args: { niche: string; seed?: string | null }) {
  const seedLine = args.seed ? `Seed insight: ${args.seed}` : "Seed insight: (none)";

  return [
    "Genera idee di nuovi prodotti per uno store Shopify.",
    "Devono essere realistiche (supply chain, materiali, prezzo), con varianti e tag.",
    "Rispondi SOLO come JSON valido, senza testo extra.",
    "Schema JSON:",
    "{",
    '  "ideas": [',
    "    {",
    '      "title": "string",',
    '      "longDescriptionSeo": "string",',
    '      "recommendedPrice": "number",',
    '      "estimatedMarginPercent": "number",',
    '      "tags": ["string"],',
    '      "productType": "string",',
    '      "variants": [{"optionName":"string","values":["string"]}]',
    "    }",
    "  ]",
    "}",
    "",
    `Niche: ${args.niche}`,
    seedLine,
  ].join("\n");
}

export function promptGenerateLandingHtml(args: { productTitle: string; productDescription: string }) {
  return [
    "Genera HTML completo per una landing page prodotto per Shopify.",
    "Struttura: hero, benefici, proof/risultati, confronto, FAQ, CTA, footer minimal.",
    "Usa un tone of voice energico e smart, con tocchi cyberpunk ma leggibile.",
    "IMPORTANTE: Restituisci SOLO HTML valido (un singolo documento), senza markdown, senza backticks.",
    "",
    `Prodotto: ${args.productTitle}`,
    "",
    "Descrizione prodotto (input):",
    args.productDescription,
  ].join("\n");
}

export const MODEL_FOR_NICHE: PuterModelId = "anthropic/claude-sonnet-4";
export const MODEL_FOR_PRODUCT_ANALYSIS: PuterModelId = "anthropic/claude-sonnet-4";
export const MODEL_FOR_MARKET_RECON: PuterModelId = "perplexity/sonar-pro";
export const MODEL_FOR_LANDING: PuterModelId = "openai/gpt-4o";
export const MODEL_FOR_CREATOR: PuterModelId = "anthropic/claude-sonnet-4";
