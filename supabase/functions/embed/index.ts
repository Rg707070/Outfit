// Edge Function: `embed`
// Computes multilingual sentence embeddings locally (Transformers.js, model
// Xenova/multilingual-e5-small -> 384 dims). Used by:
//   - the ingestion script, to embed catalog items (type: 'passage')
//   - the /api/catalog/search route handler, to embed the user query (type: 'query')
//
// Runs entirely inside our Supabase infra: no external embedding API at runtime.
// e5 models expect "query: " / "passage: " prefixes, which we add per `type`.
//
// NOTE: we pin @xenova/transformers v2 — it uses the onnxruntime-web (wasm)
// backend which is compatible with the Supabase Edge (Deno) runtime. v3's
// device auto-detection fails there ("Unsupported device: cpu").

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// We only ever load remote (HF Hub) models; no local model files in the bundle.
env.allowLocalModels = false;
env.useBrowserCache = false;

type EmbedRequest = {
  input: string | string[];
  type?: "query" | "passage";
};

// Lazily instantiate the pipeline once per isolate (kept warm across requests).
let extractorPromise: ReturnType<typeof pipeline> | null = null;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
      { quantized: true }, // smaller memory footprint in the edge runtime
    );
  }
  return extractorPromise;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { input, type = "query" } = (await req.json()) as EmbedRequest;
    const items = Array.isArray(input) ? input : [input];
    if (items.length === 0 || items.some((t) => typeof t !== "string")) {
      return new Response(
        JSON.stringify({ error: "`input` must be a string or string[]" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prefixed = items.map((t) => `${type}: ${t}`);
    const extractor = await getExtractor();
    const output = await extractor(prefixed, { pooling: "mean", normalize: true });
    const embeddings = output.tolist() as number[][];

    return new Response(JSON.stringify({ embeddings, dims: embeddings[0]?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
