# Variables d'environnement Vercel (chargeo-web)

Mise à jour : 13/10/2026 (Phase 4, bascule)

| Variable | Environnement | Rôle |
| --- | --- | --- |
| CLICKUP_API_KEY | Production + Preview | Clé API ClickUp |
| CLICKUP_LIST_QUALIFICATION_ID | Production + Preview | Liste Qualification (Études) de production, lue **uniquement en production** |
| CLICKUP_LIST_QUALIFICATION_TEST_ID | Preview seul | Liste 🧪 Qualification TEST (1200630000008489), lue en preview par /api/contact et /api/chantiers |
| CLICKUP_LIST_PLANNING_ID | (optionnelle) | Liste Planning Chantiers, repli 901520038258 |
| CLICKUP_SAV_LIST_ID | Production + Preview | Liste Tickets SAV |
| COSTRUCTOR_API_KEY | Production + Preview | Clé API Costructor |
| NEXT_PUBLIC_GTM_ID | Production + Preview | Google Tag Manager |
| CRON_SECRET | Production (secret) | Clé du contrôle quotidien /api/cron/quotidien et de l'installation de la sonnette ClickUp (?action=installer&cle=...). Ajoutée le 13/10/2026 |
| VERCEL_AUTOMATION_BYPASS_SECRET | Système (Preview) | Jeton « Protection Bypass for Automation » (note « Webhooks ClickUp »), créé le 12/10/2026 pour la sonnette sur les previews |

## Règle de sécurité

En preview, si `CLICKUP_LIST_QUALIFICATION_TEST_ID` manque, /api/contact et /api/chantiers **refusent** de fonctionner : un test ne peut jamais écrire dans la vraie Qualification.

Une variable ajoutée ou modifiée dans Vercel ne s'applique qu'au **prochain déploiement**.
