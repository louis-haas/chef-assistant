import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function convertUnits(text: string): string {
  const lines = text.split('\n');
  const convertedLines = lines.map(line => {
    // Check if line contains ingredient format (name|quantity|unit)
    if (line.includes('|')) {
      const parts = line.split('|');
      if (parts.length === 3) {
        let [name, quantity, unit] = parts;
        const numValue = parseFloat(quantity);
        
        if (!isNaN(numValue)) {
          // Convert volume units to mL
          if (unit.trim().toLowerCase() === 'l') {
            quantity = String(numValue * 1000);
            unit = 'mL';
          } else if (unit.trim().toLowerCase() === 'dl') {
            quantity = String(numValue * 100);
            unit = 'mL';
          } else if (unit.trim().toLowerCase() === 'cl') {
            quantity = String(numValue * 10);
            unit = 'mL';
          }
          // Convert weight units to g
          else if (unit.trim().toLowerCase() === 'kg') {
            quantity = String(numValue * 1000);
            unit = 'g';
          }
        }
        
        return `${name}|${quantity}|${unit}`;
      }
    }
    return line;
  });
  
  return convertedLines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeText, recipeUrl, recipeImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let contentToProcess = recipeText;
    let imageData = null;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Si une image est fournie
    if (recipeImage) {
      console.log('Processing recipe from image');
      console.log('Image data length:', recipeImage.length);
      imageData = recipeImage; // base64 image data
    }
    // Si une URL est fournie, scraper la page
    else if (recipeUrl) {
      try {
        console.log('Fetching recipe from URL:', recipeUrl);
        const response = await fetch(recipeUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.status}`);
        }
        const html = await response.text();
        
        // Extraire le texte visible du HTML (simple extraction)
        contentToProcess = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log('Extracted text length:', contentToProcess.length);
      } catch (error) {
        console.error('Error fetching URL:', error);
        throw new Error('Impossible de récupérer le contenu de l\'URL');
      }
    }

    const systemPrompt = `Tu es un assistant culinaire expert qui extrait les informations d'une recette à partir d'un texte libre, d'une page web ou d'une photo de recette.

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

    // Construire le message utilisateur en fonction du type d'entrée
    let userMessage;
    if (imageData) {
      // Pour une image, envoyer l'image et demander l'extraction
      userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extrais toutes les informations de cette recette visible dans l\'image.'
          },
          {
            type: 'image_url',
            image_url: {
              url: imageData
            }
          }
        ]
      };
    } else {
      // Pour du texte ou une URL, envoyer le texte
      userMessage = {
        role: 'user',
        content: contentToProcess
      };
    }

    console.log('Sending request to AI API with model: google/gemini-2.5-pro');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage
        ],
      }),
    });

    console.log('AI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error response:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Paiement requis. Veuillez ajouter des crédits à votre espace de travail.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: 'Le service AI est temporairement indisponible. Veuillez réessayer dans quelques instants.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Erreur de l'API AI (${response.status}): ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI API response data:', JSON.stringify(data).substring(0, 500));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid AI API response structure:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Format de réponse invalide de l\'API AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let parsedText = data.choices[0].message.content;

    // Convert units in ingredients
    parsedText = convertUnits(parsedText);

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
