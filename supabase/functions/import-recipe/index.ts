import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeText } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Tu es un assistant culinaire expert qui extrait les informations d'une recette à partir d'un texte libre.

RÈGLES IMPORTANTES:
- Extraire le titre de la recette
- Extraire une courte description (si disponible)
- Extraire les ingrédients au format "nom|quantité|unité" (un par ligne)
- NE PAS inclure sel, poivre et eau dans les ingrédients
- Utiliser des noms GÉNÉRIQUES pour les ingrédients (exemple: "huile d'olive" au lieu de "huile d'olive extra vierge")
- NE PAS inclure la façon de couper ou préparer dans le nom (pas de "émincé", "en dés")
- Unités acceptées: g, mL, cc (cuillère à café), cs (cuillère à soupe), ou vide
- Extraire les instructions étape par étape
- Extraire le temps de préparation (si disponible)
- Extraire le temps de cuisson (si disponible)
- Extraire le nombre de portions (si disponible)

Format de réponse EXACT à utiliser (utiliser les pipes | pour séparer):
TITRE: [titre de la recette]
DESCRIPTION: [description courte ou "N/A"]
INGRÉDIENTS:
[nom|quantité|unité]
[nom|quantité|unité]
INSTRUCTIONS: [instructions complètes avec deux retours à la ligne entre chaque étape]
TEMPS_PREP: [temps ou "N/A"]
TEMPS_CUISSON: [temps ou "N/A"]
PORTIONS: [nombre ou "N/A"]

IMPORTANT: Dans les INSTRUCTIONS, séparer chaque étape par deux retours à la ligne pour une meilleure lisibilité.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: recipeText }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsedText = data.choices[0].message.content;

    console.log('Parsed recipe:', parsedText);

    return new Response(
      JSON.stringify({ parsedRecipe: parsedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in import-recipe function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
