# Werkend prototype — MOBUS

Deze map bevat de werkende code van het interactieve MOBUS-prototype.  
Het prototype is onderdeel van het overdrachtspakket en laat zien hoe de ontworpen tafelinteractie, interface states en sessieflow technisch zijn uitgewerkt.

## Doel van deze map

Deze code is bedoeld om het prototype te kunnen openen, testen, aanpassen en verder door te ontwikkelen.  
De map maakt de digitale werking van MOBUS overdraagbaar voor docenten, teamleden of toekomstige ontwerpers/ontwikkelaars.

## Wat zit hierin?

In deze map staat de code voor het interactieve prototype, waaronder:

- de interface van het tafelscherm;
- digitale idee-tokens;
- interacties zoals verplaatsen, verbinden en groeperen;
- visuele feedback en nudges;
- sessie- en prototype states;
- styling en componenten die horen bij de MOBUS-ervaring.

## Rol binnen het ontwerp

Het prototype onderzoekt hoe gebruikers op een digitale touchtafel met ideeën kunnen werken.  
De focus ligt niet op een volledig productiesysteem, maar op het ervaarbaar maken van de kerninteracties:

- ideeën plaatsen;
- ideeën verplaatsen;
- verbanden ontdekken;
- ideeën combineren;
- nieuwe contexten verkennen;
- samenwerken rond één gedeeld tafelscherm.

## Prototype-status

Dit is een werkend ontwerp- en ervaringsprototype.  
Dat betekent dat de belangrijkste interacties en visuele states zijn uitgewerkt om de gebruikservaring te kunnen testen en presenteren.

Niet alles is bedoeld als definitieve technische implementatie. Sommige onderdelen zijn bewust vereenvoudigd om de ontwerpwerking snel en duidelijk te kunnen demonstreren.

## Gebruik

Open de projectmap in een code-editor en volg de installatie- of startcommando’s van het gebruikte framework.  
Controleer hiervoor indien aanwezig de bestanden zoals `package.json`, `vite.config.js`, `src/` of vergelijkbare projectbestanden.

Algemene werkwijze:

```bash
npm install
npm run dev
```

Daarna opent het prototype meestal lokaal via een adres zoals:

```bash
http://localhost:5173
```

## Belangrijk bij doorontwikkeling

Let bij verdere ontwikkeling vooral op:

- behoud van de rustige, natuurlijke visuele stijl;
- duidelijke feedback bij elke interactie;
- leesbaarheid vanaf meerdere kanten van de tafel;
- zo min mogelijk afleiding tijdens creatieve samenwerking;
- subtiele AI-suggesties die de gebruiker niet dwingen;
- consistente states voor empty, active, loading, suggestion en result.

## Opmerking

Deze map hoort bij het MOBUS-overdrachtspakket.  
Voor de ontwerpkeuzes, onderbouwing, user flow en interactieprincipes wordt verwezen naar de andere onderdelen van het overdrachtspakket.
