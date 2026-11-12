# 🎤 PITCH ARENA 2026 — Tirages indépendants (version 2)

Application ludique et interactive pour répartir les présentations des **4 et 7 décembre 2026**. Elle fonctionne **sans serveur, sans compte et sans connexion Internet** : HTML + CSS + JavaScript + quatre illustrations SVG locales.

## 🚀 Utilisation dans la classe

1. **Décompressez** le ZIP et ouvrez **`index.html`** dans un navigateur récent (Chrome, Edge, Firefox ou Safari).
2. Choisissez **GROUPE 1010** ou **GROUPE 1020** dans les deux cartes situées en haut. Vous pouvez choisir l'un ou l'autre en premier, selon le cours où vous réalisez le tirage.
3. L'application affiche la **première plage chronologique du groupe actif**. Demandez à la classe si une équipe la souhaite.
4. Si oui, cliquez sur son nom puis sur **Confirmer cette équipe**. Sinon, cliquez sur **Lancer le tirage au sort** : une animation révèle l'équipe gagnante parmi celles de **ce même groupe** qui n'ont pas encore été placées.
5. Le calendrier passe au créneau suivant de **ce groupe uniquement**. Quand il ne reste plus d'équipe, les plages résiduelles de ce groupe deviennent automatiquement **Libres**.
6. À la fin, cliquez sur **🖨 Imprimer le résultat de ce groupe** pour imprimer ou sauvegarder en PDF **uniquement les 6 plages de ce groupe**. Vous pouvez aussi utiliser **CSV du groupe** pour Excel.
7. Au prochain cours, **sur le même navigateur et le même ordinateur**, rouvrez le fichier, sélectionnez l'autre groupe et recommencez. Le premier horaire reste enregistré.

**Important :** l'affichage, les tirages, l'annulation et la réinitialisation sont **séparés pour chaque groupe**. Une équipe du 1010 ne peut **jamais** être attribuée à une plage du 1020, ni l'inverse.

## 🗓️ Horaire exact (3 plages de 25 minutes par cours)

| Groupe | Cours 1 | Plages | Cours 2 | Plages |
|---|---|---|---|---|
| **1010** (5 équipes) | Vendredi 4 décembre, 12 h 10 | 12 h 10–12 h 35 ; 12 h 35–13 h ; 13 h–13 h 25 | Lundi 7 décembre, 8 h 10 | 8 h 10–8 h 35 ; 8 h 35–9 h ; 9 h–9 h 25 |
| **1020** (6 équipes) | Vendredi 4 décembre, 8 h 10 | 8 h 10–8 h 35 ; 8 h 35–9 h ; 9 h–9 h 25 | Lundi 7 décembre, 12 h 10 | 12 h 10–12 h 35 ; 12 h 35–13 h ; 13 h–13 h 25 |

La liste comprend **11 équipes** : cinq dans le 1010, dont **1010-Équipe LAN**, et six dans le 1020, dont **Los Analistas**. Il y a **12 plages** en tout : **1 libre** (groupe 1010) lorsque les deux tirages sont terminés.

## 🎮 Fonctionnalités

- **Sélecteur de groupe** avec avancement indépendant et signalétique graphique.
- Équipes filtrées strictement par groupe et tirage uniforme parmi celles encore disponibles.
- Volontariat, roulette animée, confettis, jauges de progression, calendrier interactif et illustrations SVG.
- **Sauvegarde automatique** de chaque groupe dans le même navigateur, même si vous changez de groupe en cours de route.
- **Annulation du dernier choix du groupe actif** ; l'autre groupe ne change pas.
- **Réinitialisation du groupe actif uniquement**, après confirmation ; l'autre groupe reste intact.
- **Impression spécifique au groupe actif**, avec deux cours, six plages et identification des attributions (volontaire, tirage, libre, à venir).
- **Export CSV spécifique au groupe actif**, format UTF-8 avec point-virgule pour Excel.
- Mode projection, interface adaptée aux écrans mobiles, respect du réglage « Réduire les animations ».

## 💾 Sauvegarde et conseils

Les résultats sont stockés **localement dans le navigateur** via `localStorage` : ils ne sont envoyés à aucun serveur. Pour retrouver vos tirages au deuxième cours, utilisez le **même fichier et le même navigateur** sur **le même ordinateur**, sans effacer les données du navigateur.

En navigation privée ou en cas de suppression des données du site, les résultats peuvent être perdus. **Imprimez les horaires ou exportez un CSV après chaque groupe pour conserver une copie**. Le fichier CSV permet de consulter l'horaire dans Excel ; il n'existe pas de fonction de réimportation dans cette version.

## 📦 Fichiers du ZIP

- `index.html` — interface.
- `style.css` — styles, animations, responsive et feuille d'impression.
- `app.js` — groupes, calendrier, tirages, contrôles et stockage.
- `images/scene-pitch.svg` — microphone et scène de présentation.
- `images/groupe-1010.svg` — illustration du groupe 1010.
- `images/groupe-1020.svg` — illustration du groupe 1020.
- `images/trophee.svg` — décoration de célébration.
- `README.md` — mini-guide.

**Aucune bibliothèque externe.** Ne supprimez pas le dossier `images` et conservez les fichiers ensemble dans le même dossier décompressé.
