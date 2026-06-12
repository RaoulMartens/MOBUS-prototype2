# MOBUS Design System

**Project:** MOBUS Ecosysteem  
**Team:** Team on the Move — C7 HAN  
**Purpose:** A practical design file for adapting the MOBUS prototype into a consistent growth-based tabletop experience.

---

## 1. Design Philosophy

MOBUS is not a tool for storing ideas.  
MOBUS is an environment where ideas grow.

The user is not simply making notes. The user is:

- planting
- exploring
- feeding
- connecting
- growing
- harvesting

The interface should therefore feel less like software management and more like a shared creative ecosystem.

### Core principle

> Do not make users understand software logic. Let them understand growth.

---

## 2. Growth Taxonomy

Use this taxonomy consistently across the prototype.

| Growth term | System meaning | User action |
|---|---|---|
| Zaad | New idea | Plant idea |
| Spruit | First elaboration | Describe idea |
| Plant | Enriched idea | Expand idea |
| Kluit | Connected ideas | Group / connect ideas |
| Wortelnetwerk | Patterns and insights | Discover relations |
| Voeding | AI input | Receive pattern, relation, chance or question |
| Snoeien | Remove | Remove idea |
| Compost | Parked ideas | Temporarily put aside |
| Oogst | Result | Export / share session result |

---

## 3. Language Rules

Avoid classic software words. Use growth language instead.

| Avoid | Use instead |
|---|---|
| Nieuw idee | Plant idee |
| Bewerken | Verzorgen |
| Verwijderen | Snoeien |
| Archiveren | Parkeren |
| Clusteren | Verbinden |
| Cluster / groep | Kluit |
| AI suggestie | Voeding |
| Nudge | Voeding |
| Exporteren | Oogsten |
| Sessieresultaat | Oogst |
| Sessie afronden | Oogsten |
| Resultaten mailen | Oogst mailen |
| Annuleren | Terug naar canvas |

### Tone of voice

- Calm
- Short
- Human
- Non-technical
- Suggestive, not commanding

### AI / Voeding copy examples

Use:

- “Mogelijke verbinding gevonden”
- “Dit patroon komt vaker terug”
- “Wil je dit idee voeden?”
- “Deze ideeën lijken naar elkaar toe te groeien”

Avoid:

- “Wij raden aan…”
- “AI suggestie”
- “Klik hier om te clusteren”
- “Voer actie uit”

---

## 4. Interaction Principles

### 4.1 Groei boven beheer

The interface should not feel like a file, card or dashboard system. Ideas should feel alive.

Ideas can:

- grow
- breathe
- connect
- change
- move to compost
- become part of a kluit
- be harvested

### 4.2 AI voedt, niet stuurt

MOBUS should not behave like an assistant giving commands. It should act as a quiet partner that feeds the creative process.

The user remains in control.

### 4.3 Eén focus tegelijk

The tabletop exists in a physical room. It should not feel like a busy dashboard.

Maximum per user:

- one primary action visible at a time
- one focus area visible at a time

### 4.4 Direct manipulation

Users should understand actions through the physical mental model of a tabletop.

Examples:

- turn an idea over to reverse it
- stretch an idea to exaggerate it
- move an idea into another context zone
- connect ideas with root-like lines
- park ideas at the edge as compost

---

## 5. Main Components

| Component name | Meaning | Prototype implementation |
|---|---|---|
| Groei Canvas | Main workspace where ideas live | Tabletop area |
| Zaad Zaaier | Input point for new ideas | Plus button / plant idea control |
| Voedings Pulse | Subtle AI intervention | Nudge chip / pattern suggestion |
| Wortelverbinding | Relation between ideas | Root-like connection line |
| Compost bak | Parked ideas outside active thinking | Edge area / archive zone |
| Oogsten scherm | End-of-session output | Summary / harvest screen |

---

## 6. Object Model

### Zaad

A first thought.

Visual characteristics:

- small
- simple
- one sentence
- light neutral surface
- organic rounded shape

### Spruit

A first elaboration of an idea.

Contains:

- short title
- optional description
- more visible structure than a seed

### Plant

An enriched idea.

Can contain:

- description
- insights
- relations
- context tags

### Kluit

A connected group of ideas.

Visual characteristics:

- compact organic container
- slightly stronger accent
- contains multiple seeds/plants
- can be opened and closed

### Wortelverbinding

A relationship between ideas.

Visual characteristics:

- subtle organic line
- low opacity
- root-like movement
- should sit visually behind idea objects

### Compost

Parked ideas.

Rules:

- not deleted
- not active
- visually lower contrast
- placed at the edge of the canvas

### Voeding

MOBUS input.

Can be:

- pattern
- relation
- chance
- question
- new direction

Rules:

- subtle pulse
- no modal unless necessary
- user can accept or skip

### Oogst

Session result.

Shows:

- planted ideas
- kluiten
- root connections
- used voeding
- growth path
- sharing options

---

## 7. Session Flow

Use growth language for all visible steps.

| Step | Name | Meaning |
|---|---|---|
| 1 | Ontwaken | Bus detects presence; light comes up; table activates |
| 2 | Ervaring kiezen | User chooses creative mode |
| 3 | Planten | Users create seeds / ideas |
| 4 | Groeien | Users enrich, move, scale, rotate and connect ideas |
| 5 | Ontdekken | Patterns become visible; new directions appear |
| 6 | Oogsten | Main output is bundled |
| 7 | Delen | QR-code, mail or link |
| 8 | Afronden | Garden closes; harvest is saved |

### Example flow copy

**Ontwaken**  
“MOBUS ontwaakt”  
“Start een creatieve groeisessie”

**Planten**  
“Plant een idee”  
“Wat wil je laten groeien?”

**Voeding**  
“Mogelijke verbinding gevonden”  
“Wil je dit idee voeden?”

**Oogsten**  
“Oogst”  
“Jullie belangrijkste ideeën, verbindingen en groeipad zijn gebundeld.”

**Afronden**  
“De oogst is opgeslagen.”

---

## 8. Visual Direction

The visual style should be **Biophilic Abstract**.

Use:

- root structures
- growth directions
- organic lines
- cell structures
- mycelium-like networks
- warm neutral surfaces
- soft green accents
- rounded organic forms
- soft depth and shadows

Avoid literal nature visuals:

- no grass
- no flowers
- no trees as UI elements
- no childish garden-app style

The result should feel:

- innovative
- intelligent
- calm
- creative
- spatial
- organic

---

## 9. Design Tokens

Use CSS variables so the prototype can be restyled consistently.

```css
:root {
  --color-bg: #f5f2ea;
  --color-surface: #fffdf7;
  --color-surface-soft: #eee9dc;
  --color-text: #35401f;
  --color-text-muted: #6f735d;

  --color-primary-green: #4c5a2a;
  --color-sage: #9a9f55;
  --color-root: rgba(76, 90, 42, 0.35);
  --color-nutrient: #d9c89f;
  --color-compost: #b8b2a1;
  --color-harvest: #718238;

  --radius-sm: 12px;
  --radius-md: 24px;
  --radius-lg: 36px;
  --radius-organic: 48% 52% 44% 56% / 55% 45% 55% 45%;

  --shadow-soft: 0 12px 32px rgba(53, 64, 31, 0.12);
  --shadow-floating: 0 18px 48px rgba(53, 64, 31, 0.18);

  --motion-fast: 180ms;
  --motion-normal: 320ms;
  --motion-slow: 600ms;
}
```

### Color roles

| Object | Color role |
|---|---|
| Zaad | Light neutral color |
| Kluit | Primary accent color |
| Wortelnetwerk | Connection / AI color |
| Voeding | Soft pulse color |
| Compost | Muted color |
| Oogst | Success / harvest color |

---

## 10. Motion Principles

| Action | Motion principle |
|---|---|
| New ideas | Grow from a point |
| Connecting | Root animation |
| AI insights / Voeding | Soft pulse |
| Parking | Sink or drift toward the edge |
| Harvesting | Zoom out to total overview |

### Motion rules

- Motion should explain state change.
- Motion should stay subtle.
- Avoid cartoon-like bounce.
- Prefer transform and opacity.
- Keep the interface calm.

---

## 11. Nudge / Voeding Interaction Models

Every Voeding interaction should use a physical tabletop mental model.

### Verbinden

Mental model: ideas grow roots toward each other.

Behavior:

- show a root-like line between related ideas
- allow the user to connect or skip
- never auto-connect without confirmation

### Botsen

Mental model: two ideas collide.

Behavior:

- move two ideas toward each other
- show subtle tension between them
- ask: “Wat schuurt hier?”

### Omkeren

Mental model: turn a card over.

Behavior:

- flip the existing idea with a 3D turn effect
- front side keeps original idea
- back side shows opposite idea
- user can flip back

### Vergroten

Mental model: stretch or zoom into an idea.

Behavior:

- idea grows larger
- show “10x” or “extreme variant”
- ask: “Wat als dit idee 10x sterker was?”

### Verplaatsen

Mental model: place an object in another context.

Behavior:

- show a temporary context zone
- user moves idea into it
- idea receives a context tag

### Stilte forceren

Mental model: focus mode / hourglass.

Behavior:

- 30 seconds of arranging only
- no typing or editing
- dragging, rotating and scaling remain active
- copy: “Alleen ordenen. Niet typen.”

---

## 12. Harvest Screen

The harvest screen replaces the generic session result screen.

### Title

Use:

```text
Oogst
```

Subtitle:

```text
Jullie belangrijkste ideeën, verbindingen en groeipad zijn gebundeld.
```

### Labels

| Avoid | Use |
|---|---|
| Totaal ideeën | Geplante ideeën |
| Clusters gevormd | Kluiten gevormd |
| Losse ideeën | Losse zaden |
| Nudges bekeken | Voeding gebruikt |
| Conclusie | Groeipad |
| Toegepaste nudges | Gebruikte voeding |
| Overgeslagen nudges | Niet gebruikte voeding |
| Activiteiten & verbindingen | Wortelverbindingen |

### Primary action

Use:

```text
Oogst mailen
```

### Secondary action

Use:

```text
Terug naar canvas
```

### Email modal

Title:

```text
Wil je de oogst toegestuurd krijgen?
```

Input placeholder:

```text
Vul hier je e-mail in…
```

Primary button:

```text
Versturen
```

Secondary button:

```text
Nee, bedankt
```

Success state:

```text
De oogst is verzonden naar [email].
```

End state:

```text
De oogst is opgeslagen.
```

---

## 13. Prototype Implementation Checklist

Use this checklist when adapting the current prototype.

### Language

- [ ] Replace software language with growth language.
- [ ] Rename summary screen to Oogst.
- [ ] Rename nudges to Voeding where visible.
- [ ] Rename clusters/groups to Kluiten where visible.
- [ ] Rename delete to Snoeien.
- [ ] Rename archive to Parkeren / Compost.

### Visuals

- [ ] Apply warm neutral background.
- [ ] Use deep olive text.
- [ ] Use muted sage accents.
- [ ] Make idea objects organic and seed-like.
- [ ] Make connections root-like.
- [ ] Avoid literal garden visuals.

### Motion

- [ ] New ideas grow from a point.
- [ ] Connections grow like roots.
- [ ] Voeding appears with soft pulse.
- [ ] Parked ideas drift to edge.
- [ ] Harvest screen zooms out to overview.

### Functionality to keep intact

- [ ] Create idea
- [ ] Edit / care for idea
- [ ] Delete / prune idea
- [ ] Drag idea
- [ ] Resize idea
- [ ] Rotate idea
- [ ] Connect ideas
- [ ] Use Voeding interactions
- [ ] Open Oogst screen
- [ ] Mail Oogst

---

## 14. Agent Implementation Prompt

Use this prompt when asking an agentic coding tool to adapt the prototype.

```text
Important:
Do not rebuild existing token interactions, nudges, gestures, session flow or summary logic.
Only adapt the existing MOBUS prototype to this MOBUS Design System markdown file.

Goal:
Refactor the prototype so it visually and linguistically matches the MOBUS Growth Ecosystem design system.

Apply:
- Growth Taxonomy: Zaad > Spruit > Plant > Kluit > Wortelnetwerk > Voeding > Compost > Oogsten
- Avoid software language.
- Use growth language throughout visible UI.
- Make AI feel like Voeding, not an assistant.
- Make the interface calm, warm, organic and biophilic abstract.
- Keep one primary action and one focus area visible at a time.
- Use root-like connections, soft pulses and organic shapes.
- Do not use literal grass, flowers or trees as UI elements.

Rename visible UI:
- Nieuw idee → Plant idee
- Bewerken → Verzorgen
- Verwijderen → Snoeien
- Archiveren → Parkeren
- Clusteren → Verbinden
- Cluster / groep → Kluit
- AI suggestie / Nudge → Voeding
- Exporteren → Oogsten
- Sessieresultaat → Oogst
- Sessie afronden → Oogsten
- Resultaten mailen → Oogst mailen
- Annuleren → Terug naar canvas

Restyle using CSS variables:
- warm off-white background
- deep olive green text
- muted sage accents
- soft organic surfaces
- subtle root-like connection lines
- low-noise visual hierarchy

Update motion:
- new ideas grow from a point
- connections animate like roots
- AI/Voeding uses a soft pulse
- parking drifts toward the edge
- harvesting zooms out to total overview

Keep all existing functionality working.

Definition of done:
The prototype no longer feels like a generic tabletop UI. It uses the MOBUS growth language consistently, feels warm and organic, and existing interactions still work.
```

---

## 15. Final Design Rule

If a UI decision feels too much like managing files, cards or software objects, translate it back into the growth metaphor.

Ask:

> Is the user managing ideas, or growing them?

MOBUS should always choose growing.
