# Nexus-ops — Positionnement pour un PFE chez Santerne Bretagne

Ce document relie le projet Nexus-ops (déjà réalisé et fonctionnel) aux livrables
attendus par l'offre de Projet de Fin d'Études chez Santerne Bretagne (groupe VINCI
Energies, ~50 collaborateurs, réseaux électriques, éclairage public, transition
énergétique). Il se veut factuel : chaque chiffre est soit mesuré dans le code, soit
explicitement étiqueté comme projection.

## 1. Positionnement

**Ce qu'est Nexus-ops.** Nexus-ops est une application qui transforme un document
opérationnel (devis fournisseur, demande d'achat, rapport d'intervention, rapport de
maintenance, compte rendu de réunion) en travail actionnable, revu et approuvé par un
humain. Le flux est le suivant : upload du document → classification et extraction de
champs typés par LLM → écran de revue où un opérateur corrige les champs → **porte
d'approbation humaine** (managérial) → création d'une tâche départementale → livraison
de l'événement à un webhook n8n. Quatre briques techniques structurent le système :

- une **machine à états LangGraph** (nœuds : extraction, contrôle qualité, revue,
  approbation, livraison) avec **checkpoints PostgreSQL**, ce qui permet de reprendre
  un workflow interrompu à l'état exact où il s'est arrêté ;
- un **copilot RAG avec citations** : il ne répond qu'à partir des documents approuvés
  accessibles dans le périmètre de rôle de l'utilisateur, et cite systématiquement la
  source (fichier + extrait + score) sur laquelle repose chaque réponse ;
- une **livraison n8n signée HMAC** (secret partagé, en-tête de signature), avec
  traçabilité des tentatives, statut par livraison et reprise manuelle en cas d'échec ;
- une **revue de document comparée** : les corrections de l'opérateur créent une
  nouvelle révision (l'extraction IA d'origine est conservée), et chaque action
  significative est enregistrée dans un journal d'audit.

**Pourquoi ce projet sert doublement la candidature.** Premièrement, il constitue un
**projet concret déjà réalisé**, conforme aux qualificatifs que l'offre recherche : c'est
à la fois un agent IA multi-nœuds (LangGraph), un chatbot métier avec citations (RAG),
une application intégrant un LLM (extraction documentaire), un workflow n8n signé, un
outil d'analyse documentaire et un assistant métier à porte d'approbation. Deuxièmement,
il sert de **template méthodologique pour le PFE** : la démarche
**observer → cartographier → prototyper → mesurer → gouverner** a été exécutée une fois
de bout en bout sur une entreprise fictive, avec ses irrégularités, ses documents types
et ses flux. Pendant le PFE, la même démarche sera rejouée sur les processus réels de
Santerne Bretagne — cette fois avec des utilisateurs réels, des volumes réels et des
mesures réelles plutôt que des projections.

## 2. Correspondance avec les livrables attendus

L'offre demande six livrables. Le tableau suivant indique honnêtement ce que Nexus-ops
apporte déjà et ce que le PFE devra construire. Deux points sont volontairement
transparents : la **cartographie des processus réels de Santerne** et le **test avec des
utilisateurs réels** se produisent *pendant* le PFE, pas avant. Nexus-ops démontre que
le prototypage et la mesure peuvent être rapides ; il ne remplace pas l'observation
terrain.

| Livrable attendu | Ce que Nexus-ops fournit déjà | Ce que le PFE ajoutera |
| --- | --- | --- |
| (1) Cartographie des processus et irritants | Un exemple de cartographie (5 types de documents, flux revue→approbation→tâche→livraison), les modèles de données et l'écran de revue comme illustration d'un irritant automatisable | Immersion chez Santerne, entretiens, cartographie des vrais processus (devis, chantiers, éclairage public, magasin, facturation) |
| (2) Inventaire priorisé des cas d'usage IA | Une méthode de priorisation déjà exercée (choix des 5 types de documents par fréquence × irritant) et les briques réutilisables (extraction, RAG, workflow, gouvernance) | Inventaire construit sur les processus réels, priorisé avec les managers de Santerne |
| (3) Estimation chiffrée des gains/coûts/risques | Une formule de projection documentée et appliquée (section 3 ci-dessous), un journal d'audit pour mesurer les temps réels | Mesures terrain : temps manuel mesuré, temps assisté mesuré après pilote, coûts LLM/infrastructure, risques identifiés |
| (4) Démonstrateurs fonctionnels testés avec les utilisateurs | Trois démonstrateurs fonctionnels (devis fournisseur, rapport d'intervention, compte rendu) exécutables en 10 minutes (runbook, section 5), couverts par 69 tests automatisés | Pilotes avec les utilisateurs réels de Santerne, itérations selon leurs retours, adaptation des types de documents aux gabarits réels de l'entreprise |
| (5) Portefeuille de projets + feuille de route 3 ans | Le portefeuille « Nexus-ops » comme premier projet documenté de bout en bout | Construction de la feuille de route à partir des priorités Santerne (éclairage public, transition énergétique, facturation) |
| (6) Recommandations gouvernance/sécurité/adoption | Une gouvernance déjà implémentée et argumentée : porte d'approbation humaine obligatoire, journal d'audit, périmètres de rôle, signature HMAC, checklist de durcissement production (`docs/production-hardening.md`) | Transposition à l'IT réelle de Santerne (authentification, hébergement, RGPD, conduite du changement, formation) |

## 3. Projection à l'échelle Santerne

**PROJECTION (méthode : (temps manuel − temps assisté) × volume annuel / 60)** — aucune
de ces valeurs n'est une mesure réelle. Les volumes et les temps sont des hypothèses
plausibles pour une entreprise de ~50 collaborateurs dans les réseaux électriques et
l'éclairage public ; ils devront être mesurés pendant le PFE.

### Trois flux de départ (ceux que Nexus-ops démontre déjà)

- **Devis fournisseurs** : ~20/mois, 25 min manuel → 5 min assisté = 20 min gagnées.
  20 × 20 × 12 / 60 = **80 h/an**.
- **Rapports d'intervention** : ~40/mois, 15 min manuel → 4 min assisté = 11 min gagnées.
  40 × 12 × 11 / 60 = **88 h/an**.
- **Comptes rendus de réunion / maintenance** : ~30/mois, 20 min manuel → 6 min assisté
  = 14 min gagnées. 30 × 12 × 14 / 60 = **84 h/an**.

**Sous-total ≈ 252 h/an** pour ces trois seuls flux (80 + 88 + 84).

### Flux candidats supplémentaires

| Flux | Volume/mois | Temps manuel | Temps assisté | Gagné/mois | Calcul | h/an |
| --- | --- | --- | --- | --- | --- | --- |
| Ressaisies devis fournisseur → facturation | 80 | 10 min | 2 min | 8 min | 80×12×8/60 | 128 |
| Demandes d'achat | 50 | 12 min | 4 min | 8 min | 50×12×8/60 | 80 |
| Éclairage public : constat de panne → ordre de travail | 45 | 15 min | 5 min | 10 min | 45×12×10/60 | 90 |
| Rapports de maintenance préventive | 35 | 18 min | 6 min | 12 min | 35×12×12/60 | 84 |
| Planification magasin (commandes matériel) | 25 | 20 min | 8 min | 12 min | 25×12×12/60 | 60 |
| Devis clients / avenants de chantier | 50 | 45 min | 15 min | 30 min | 50×12×30/60 | 300 |
| DT-DICT / attestations administratives | 12 | 30 min | 10 min | 20 min | 12×12×20/60 | 48 |

Sous-total flux supplémentaires : 128 + 80 + 90 + 84 + 60 + 300 + 48 = **790 h/an**.

### Total projeté

**PROJECTION (méthode : (temps manuel − temps assisté) × volume annuel / 60) — total ≈
1042 h/an** (252 + 790). Ce total est **explicitement une projection, pas un résultat
mesuré** : il se situe à la borne basse de la fourchette 1000–3000 h/an visée par
l'offre. Il ne prend en compte que sept flux ; la borne haute de la fourchette serait
atteinte si les volumes réels sont supérieurs aux hypothèses, si les temps assistés
baissent après itération, ou si d'autres flux s'ajoutent (rapports d'inspection
énergétique, synthèses de suivis de chantier, formalisation des relevés de comptage).
Pendant le PFE, chaque flux retenu fera l'objet d'une mesure terrain : temps manuel
chronométré avant pilote, temps assisté chronométré pendant, puis croisement avec le
journal d'audit de Nexus-ops pour vérifier les deux.

## 4. Écart Microsoft Power Platform

**Reconnaissance honnête de l'écart.** Santerne Bretagne appartient au groupe VINCI
Energies, où Microsoft Power Platform (Power Automate, Power Apps, Dataverse,
Copilot Studio) est un socle largement déployé. Nexus-ops n'utilise pas Power
Platform : il s'appuie sur n8n pour l'automatisation. C'est un écart réel, et il ne
faut pas le dissimuler — il faut l'assumer et le réduire pendant le PFE.

**Pourquoi ce choix est défendable pour une entité VINCI Energies.** n8n est
open-source et peut être auto-hébergé : la donnée (devis, rapports d'intervention,
données de chantier) reste dans l'infrastructure de l'entreprise, sans passer par un
cloud tiers. Pour une entité qui manipule des données de chantier et des données
personnelles de clients et d'abonnés, cette souveraineté de la donnée a un poids non
négligeable. Le coût de licence est maîtrisé (une seule instance auto-hébergée plutôt
que des licences par utilisateur/flux), ce qui est cohérent avec une PME de
~50 collaborateurs. Enfin, n8n est interopérable : il peut déclencher ou être
déclenché par des flux Power Automate, ce qui permet une coexistence pendant la
transition.

**Engagement pendant le PFE.** Une des premières tâches du PFE sera de cartographier
quelles automations relèvent de Power Platform (intégration à l'écosystème Microsoft
existant, licenciement déjà en place, besoin en connecteurs SaaS standards) et
quelles automations relèvent de n8n (souveraineté des données, logique métier
complexe, coût). Cette recommandation sera étayée par des critères explicites, pas
par une préférence technique.

**Pour situer les deux environnements :** un flux Power Automate fonctionne comme un
workflow n8n — déclencheurs, actions, connecteurs, étapes conditionnelles ; Power Apps
sert à construire l'interface de revue que Nexus-ops réalise en React ; Dataverse joue
le rôle de la base de données PostgreSQL dans Nexus-ops. Les deux approches sont
valides : le choix entre elles relève de la gouvernance, des licences et des
contraintes de sécurité, pas d'un débat de technophiles.

## 5. Cahier de démonstration (runbook)

Démonstration de bout en bout, exécutée en direct pendant l'entretien. Durée : ~10 min.

1. **Préparation (à faire avant l'entretien).** Enregistrer une capture d'écran de la
   démo complète : le réseau du lieu d'entretien peut bloquer les appels sortants vers
   l'API LLM (NVIDIA ou Google), et la démo doit tenir même sans réseau. Annoncer
   explicitement en début de démo : « N8N_WEBHOOK_URL reste vide pendant cet entretien
   → l'application est en mode mock : la livraison webhook est simulée, pas réelle. »
2. Copier `.env.example` vers `.env`.
3. Renseigner `NVIDIA_API_KEY` **ou** `GOOGLE_API_KEY` (l'un des deux suffit ; si
   aucune clé n'est disponible, laisser vide et annoncer le mode hors-ligne).
4. `docker compose up -d db` (PostgreSQL 17 + pgvector, port 5432).
5. `cd backend` puis `uv sync` (installation des dépendances).
6. `uv run alembic upgrade head` (migrations de schéma).
7. `uv run python -m app.seed` — **uniquement sur une base de démo jetable** : cette
   commande remplace les enregistrements existants par des données fictives.
8. `uv run uvicorn app.main:app --port 8000 --reload` (backend sur le port 8000).
9. Dans un second terminal : `cd frontend`, puis `npm install`, puis `npm run dev`.
10. Ouvrir l'application, se connecter avec un compte de démonstration.
11. **Upload du document de référence** : `examples/supplier-quote.txt`
    (référence DEMO-QUOTE-001).
12. **Upload des exemples français** : `examples/devis-fournisseur.txt`
    (DEMO-DEVIS-001) puis `examples/rapport-intervention.txt` (INT-2027-0042).
13. **Revue** : sur l'un des documents, corriger un champ extrait (par exemple le
    montant ou la date), puis enregistrer — la correction crée une nouvelle révision,
    l'extraction IA d'origine reste consultable.
14. **Approbation** : se reconnecter ou basculer sur un compte **manager**, approuver
    le document — c'est la porte d'approbation humaine du workflow.
15. **Livraison** : observer la création de la tâche départementale et, sur la page
    **Workflows**, le statut de la livraison (succès simulé en mode mock, ou réel si
    un webhook n8n est configuré).
16. **Copilot** : interroger le copilot sur `DEMO-QUOTE-001` ou `DEMO-DEVIS-001` et
    montrer la citation de source (fichier + extrait) qui appuie la réponse.
17. **Conclusion de la démo** : rappeler que le flux complet — document → extraction →
    revue humaine → approbation managériale → tâche → livraison tracée → copilot
    avec citations — s'exécute de bout en bout, et que ce même squelette servira de
    base aux pilotes Santerne pendant le PFE.

## 6. Honnêteté sur les limites

Ce projet a des limites réelles, et il est plus honnête de les nommer que de les
dissimuler. Aucune d'entre elles n'est un défaut caché : chacune est un chantier
explicitement prévu dans le PFE.

- **Pas encore de tests utilisateurs réels.** Le projet compte 69 tests automatisés
  backend et des scripts smoke navigateur (`scripts/ui-smoke.mjs`,
  `login-smoke.mjs`, `workflow-smoke.mjs`, `scene-smoke.mjs`), mais il n'a jamais été
  utilisé par des opérateurs de terrain. C'est l'objet de la phase 1 du PFE : tester
  avec les utilisateurs réels de Santerne et itérer.
- **Données fictives.** Tous les documents de démonstration, les comptes utilisateurs
  et les volumes sont fictifs. Les chiffres de la section 3 sont des projections, pas
  des mesures.
- **Interface actuellement en anglais.** L'UI n'est pas encore traduite en français.
  Les exemples de documents français sont en revanche déjà disponibles dans
  `examples/` (`devis-fournisseur.txt`, `rapport-intervention.txt`), et la traduction
  de l'UI est un chantier de court terme du PFE.
- **Appels LLM synchrones.** L'extraction lors de l'upload est synchrone et peut
  prendre ~1 à 2 minutes par document avec le modèle de raisonnement NVIDIA. C'est
  acceptable en démo et à une instance (voir `docs/production-hardening.md`), mais
  cela devra être rendu asynchrone avant un déploiement multi-utilisateurs.
