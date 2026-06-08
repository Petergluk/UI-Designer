export const PROMPTS = {
  dynamicPlaceholders: 'Generate 20 creative, short, diverse UI component prompts (e.g. "bioluminescent task list"). Return ONLY a raw JSON array of strings. IP SAFEGUARD: Avoid referencing specific famous artists, movies, or brands.',
  
  generateVariations: (prompt: string) => `
You are a master UI/UX designer. Generate 3 RADICAL CONCEPTUAL VARIATIONS of the following design prompt: "${prompt}".

**STRICT IP SAFEGUARD:**
No names of artists. 
Instead, describe the *Physicality* and *Material Logic* of the UI.

**CREATIVE GUIDANCE (Use these as EXAMPLES of how to describe style, but INVENT YOUR OWN):**
1. Example: "Asymmetrical Primary Grid" (Heavy black strokes, rectilinear structure, flat primary pigments, high-contrast white space).
2. Example: "Suspended Kinetic Mobile" (Delicate wire-thin connections, floating organic primary shapes, slow-motion balance, white-void background).
3. Example: "Grainy Risograph Press" (Overprinted translucent inks, dithered grain textures, monochromatic color depth, raw paper substrate).
4. Example: "Volumetric Spectral Fluid" (Generative morphing gradients, soft-focus diffusion, bioluminescent light sources, spectral chromatic aberration).

**YOUR TASK:**
For EACH variation:
- Invent a unique design persona name based on a NEW physical metaphor.
- Rewrite the prompt to fully adopt that metaphor's visual language.
- Generate high-fidelity HTML/CSS.

Return a raw JSON array of exact 3 objects, like this:
[
  { "name": "Persona Name 1", "html": "..." },
  { "name": "Persona Name 2", "html": "..." },
  { "name": "Persona Name 3", "html": "..." }
]
`.trim(),

  generateDesignMd: (html: string) => `
You are an expert UI Architect. Analyze the following HTML/CSS code and reverse-engineer a comprehensive DESIGN.md file that tells 'Stitch with Google' (an AI UI generator) how to reproduce this exact design system.

Structure the DESIGN.md into the following sections:
- Values: Over-arching design principles and constraints.
- Colors: Main colors, backgrounds, text colors, and borders (using hex or rgb values).
- Typography: Font families, font weights, and letter spacing.
- Spacing & Layout: Grids, paddings, margins, flexbox patterns.
- Specific Elements: Buttons, inputs, borders, effects (shadows, ripples).
- CSS conventions: Classes or standard rules applied.

Keep it structured in Markdown syntax. Only output the raw markdown string. Do NOT wrap it in a code block.

HTML to analyze:
\`\`\`html
${html}
\`\`\`
`.trim(),

  refineComponent: (input: string, styleInstruction: string, previousHtml: string) => `
You are Flash UI. The user wants to iterate on an existing UI component.

**USER REQUEST:** "${input}"

**CONCEPTUAL DIRECTION FOR THIS VARIATION:** ${styleInstruction}

**VISUAL EXECUTION RULES:**
1. **Materiality**: Use the specified metaphor to drive every CSS choice. (e.g. if Risograph, use \`feTurbulence\` for grain and \`mix-blend-mode: multiply\` for ink layering).
2. **Typography**: Use high-quality web fonts. Pair a bold sans-serif with a refined monospace for data.
3. **Motion**: Include subtle, high-performance CSS/JS animations.
4. **IP SAFEGUARD**: No artist names or trademarks. 

**PREVIOUS HTML TO MODIFY:**
\`\`\`html
${previousHtml}
\`\`\`

Based on the previous HTML, apply the user request and the new conceptual direction.
Return ONLY RAW FULL HTML. No markdown fences.
`.trim(),

  createComponent: (input: string, styleInstruction: string) => `
You are Flash UI. Create a stunning, high-fidelity UI component for: "${input}".

**CONCEPTUAL DIRECTION: ${styleInstruction}**

**VISUAL EXECUTION RULES:**
1. **Materiality**: Use the specified metaphor to drive every CSS choice. (e.g. if Risograph, use \`feTurbulence\` for grain and \`mix-blend-mode: multiply\` for ink layering).
2. **Typography**: Use high-quality web fonts. Pair a bold sans-serif with a refined monospace for data.
3. **Motion**: Include subtle, high-performance CSS/JS animations (hover transitions, entry reveals).
4. **IP SAFEGUARD**: No artist names or trademarks. 
5. **Layout**: Be bold with negative space and hierarchy. Avoid generic cards.

Return ONLY RAW HTML. No markdown fences.
`.trim(),
};
