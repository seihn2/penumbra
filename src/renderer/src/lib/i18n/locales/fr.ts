import type { TranslationSchema } from './zh'

const fr: TranslationSchema = {
  header: {
    appName: "Assistant d'Entretien",
    practiceMode: 'Mode Pratique',
    settings: 'Paramètres',
    help: 'Aide',
    controlCenter: 'Centre de contrôle',
    close: 'Fermer',
    back: 'Retour',
    newConversation: 'Nouvelle conversation',
    export: 'Exporter la conversation',
    exported: 'Conversation exportée',
    transcriptionOn: 'Transcription active',
    transcriptionOff: 'Transcription désactivée',
    transcriptionStartHint: 'Appuyez sur {{key}} pour démarrer la transcription',
    transcriptionStopHint: 'Appuyez sur {{key}} pour arrêter la transcription'
  },
  workbench: {
    title: "Atelier d'Analyse de Problèmes",
    titleGeneral: 'Assistant IA',
    recommended: 'Recommandé',
    statusAnswerReady: 'Réponse Prête',
    statusContextCaptured: 'Contexte Capturé',
    statusWaiting: 'En Attente de Capture',
    screenshotTimeline: 'Chronologie des Captures',
    solutionOutput: 'Solution',
    chars: '{{count}} caractères',
    empty: 'Vide',
    copy: 'Copier',
    copied: 'Copié dans le presse-papiers',
    copyCodeOnly: 'Copier le code seul',
    copiedCode: 'Code copié',
    copyLatestDone: 'Code de la dernière réponse copié',
    copyLatestEmpty: 'Aucune réponse à copier pour le moment',
    copyLatestFailed: 'Échec de la copie, veuillez réessayer',
    screenshotArchived: "Capture d'écran (images non conservées dans l'historique)",
    emptyAnswerTitle: 'En attente du contexte du problème',
    emptyAnswerDesc:
      'Après la capture du problème, la réponse, la complexité et les cas limites apparaîtront ici.',
    noScreenshotTitle: 'Pas encore de capture',
    noScreenshotDesc: "Appuyez sur le raccourci pour capturer l'écran",
    startTitle: 'Démarrer une conversation',
    startDesc:
      'Capturez une capture, saisissez une question ci-dessous, ou démarrez la transcription vocale.',
    startScreenshotHint: 'Appuyez sur ce raccourci pour faire une capture',
    errorTitle: 'Échec de la requête API',
    errorHint: 'Vérifiez la configuration du service de modèle, la connexion réseau, ou réessayez.',
    retry: 'Réessayer',
    openScreenSettings: "Ouvrir les réglages d'enregistrement d'écran",
    sendFailed:
      "Échec de l'envoi — vérifiez qu'une clé API est définie et que vous êtes sur l'écran principal"
  },
  statusBar: {
    generating: 'Génération...',
    stopGeneration: 'Arrêter',
    appendScreenshot: 'Ajouter une capture',
    newConversation: 'Nouvelle conversation',
    askFollowUp: 'Question de suivi',
    disableMousePassthrough: 'Désactiver le passage de souris'
  },
  followUp: {
    placeholder: 'Saisissez votre question, Ctrl+Entrée pour envoyer...',
    composerPlaceholder: 'Saisissez un suivi, Entrée pour envoyer, Maj+Entrée pour nouvelle ligne',
    startPlaceholder: 'Saisissez une question pour démarrer, ou capturez via raccourci…',
    cancel: 'Annuler',
    submit: 'Envoyer',
    imeWarning:
      "⚠️ La fenêtre de candidats de la méthode de saisie n'est pas couverte par le mode furtif et peut apparaître dans un enregistrement d'écran. Préférez le collage ou la saisie en anglais."
  },
  prerequisites: {
    welcome: 'Bienvenue dans Penumbra',
    intro: "Veuillez d'abord configurer un fournisseur LLM, comme",
    siliconflow: 'SiliconFlow',
    introMid: 'ou',
    introEnd: '.',
    apiBaseUrl: 'URL de base API',
    apiBaseUrlHelper: "L'URL de base API de SiliconFlow ou d'un autre fournisseur proxy",
    apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
    apiKey: 'Clé API',
    apiKeyPlaceholder: 'Saisir la clé API',
    start: 'Commencer',
    moreSettings: 'Plus de paramètres'
  },
  selfCheck: {
    title: "Vérification avant l'entretien",
    intro:
      "Vérifiez en un clic que la vision + streaming IA, la capture, l'audio, les raccourcis et le réseau sont prêts.",
    run: 'Lancer la vérification',
    rerun: 'Relancer',
    running: 'Vérification…',
    blocking: "À corriger d'abord : {{item}}",
    checks: {
      ai: 'Vision IA + streaming',
      network: 'Latence réseau',
      screenshot: 'Autorisation et résultat de capture',
      asr: 'Connexion de reconnaissance vocale',
      shortcuts: 'Raccourcis clés enregistrés',
      dependencies: 'Dépendances des fonctions'
    },
    status: {
      pass: 'OK',
      warn: 'Attention',
      fail: 'Échec',
      skip: 'Non configuré'
    },
    readiness: {
      ready: "Prêt — vous pouvez commencer l'entretien",
      degraded: 'Dégradé — certaines fonctions limitées',
      unusable: "Inutilisable — résolvez d'abord l'élément bloquant"
    }
  },
  soak: {
    title: 'Référence qualité',
    intro:
      'Échantillonne périodiquement la mémoire, la connexion et la transcription pendant une longue session ; évalue réussite / dégradé / échec.',
    start: "Démarrer l'échantillonnage",
    stop: "Arrêter l'échantillonnage",
    refresh: 'Actualiser le rapport',
    sampling: 'Échantillonnage',
    samples: '{{count}} échantillons',
    verdict: {
      pass: 'Réussite',
      degraded: 'Dégradé',
      fail: 'Échec'
    }
  },
  egress: {
    title: 'Données sortantes',
    note: 'Enregistre uniquement le domaine de destination et la catégorie de données — jamais le contenu.'
  },
  provenance: {
    analyze: 'Analyse de crédibilité',
    title: 'Analyse de crédibilité de la réponse',
    analyzing: 'Analyse de la provenance des affirmations…',
    empty: 'Impossible d’extraire des affirmations ; réessayez plus tard.',
    kind: {
      'problem-text': 'Énoncé du problème',
      'user-constraint': 'Contrainte confirmée',
      'known-fact': 'Fait connu',
      assumption: 'Hypothèse du modèle',
      'ai-inference': 'Inférence du modèle',
      unconfirmed: 'Non confirmé'
    }
  },
  blocks: {
    open: 'Copier par section',
    title: 'Copier par section',
    preamble: 'Intro'
  },
  revisionDiff: {
    open: 'Comparer à la version précédente',
    title: 'Différence avec la réponse précédente',
    unchanged: 'Inchangé',
    changed: 'Modifié',
    added: 'Ajouté',
    removed: 'Supprimé',
    empty: 'Les deux réponses sont identiques'
  },
  blockType: {
    'question-summary': 'Résumé du problème',
    clarifications: 'Clarifications',
    'core-conclusion': 'Conclusion clé',
    plan: 'Approche',
    code: 'Code',
    complexity: 'Complexité',
    tests: 'Tests',
    risks: 'Risques',
    'spoken-version': 'Version orale'
  },
  questionType: {
    coding: 'Programmation',
    'system-design': 'Conception système',
    sql: 'SQL',
    behavioral: 'Comportemental',
    debugging: 'Débogage'
  },
  scaffold: {
    title: 'Cadre de réponse',
    optional: 'Optionnel',
    coding: {
      clarify: 'Clarifier entrées, sorties, contraintes',
      examples: 'Dérouler un exemple concret',
      'brute-force': "Donner d'abord la solution naïve",
      optimize: 'Optimiser vers la complexité cible',
      complexity: 'Indiquer la complexité temps / espace',
      code: 'Écrire le code',
      tests: 'Ajouter cas limites et tests'
    },
    'system-design': {
      requirements: 'Clarifier besoins fonctionnels / non fonctionnels',
      scale: "Estimer l'échelle (QPS / stockage)",
      api: "Définir l'API principale",
      'high-level': "Esquisser l'architecture globale",
      'data-model': 'Concevoir le modèle de données',
      bottlenecks: "Identifier goulots et points d'extension",
      tradeoffs: 'Discuter des compromis'
    },
    sql: {
      schema: 'Confirmer le schéma des tables',
      'target-columns': 'Identifier les colonnes à retourner',
      joins: 'Déterminer les jointures',
      'filter-aggregate': 'Filtrer et agréger',
      'edge-cases': 'Gérer NULL / doublons',
      verify: 'Vérifier le résultat'
    },
    behavioral: {
      situation: 'Situation',
      task: 'Tâche',
      action: 'Action',
      result: 'Résultat',
      reflection: 'Recul et enseignements'
    },
    debugging: {
      reproduce: 'Reproduire de façon fiable',
      narrow: 'Restreindre le périmètre',
      hypothesis: 'Formuler une hypothèse',
      verify: "Vérifier l'hypothèse",
      fix: 'Corriger',
      prevent: 'Prévenir la récurrence'
    }
  },
  brief: {
    title: 'Brief d’opportunité',
    intro:
      'Collez les exigences du poste ; combinées à votre profil, elles génèrent les priorités, projets à raconter et questions à poser pour cet entretien.',
    noProfile:
      'Aucun profil — ajoutez votre stack et vos projets dans Paramètres → Mémoire pour de meilleurs résultats.',
    jobTitle: 'Intitulé du poste',
    company: 'Entreprise',
    mustHave: 'Indispensables',
    niceToHave: 'Atouts',
    keywords: 'Mots-clés',
    listHint: 'séparés par virgule ou saut de ligne',
    generate: 'Générer le brief',
    emptyRight: 'Remplissez les exigences puis générez',
    focusAreas: 'Points prioritaires',
    projectsToTell: 'Projets à raconter',
    keyMetrics: 'Métriques clés',
    deepDives: 'Approfondissements',
    likelyFollowUps: 'Relances probables',
    behavioral: 'Matériel comportemental',
    questionsToAsk: 'Questions à poser',
    risks: 'Risques et lacunes'
  },
  mock: {
    title: 'Entretien simulé',
    intro:
      'Choisissez un mode, un axe et une difficulté ; l’intervieweur IA pose des questions et approfondit. Le mode entraînement affiche une note et des conseils.',
    mode: 'Mode',
    modePractice: 'Entraînement (note visible)',
    modeFormal: 'Formel (note masquée)',
    track: 'Axe',
    track_behavioral: 'Comportemental',
    'track_system-design': 'Conception système',
    track_coding: 'Programmation',
    difficulty: 'Difficulté',
    diff_easy: 'Facile',
    diff_medium: 'Moyen',
    diff_hard: 'Difficile',
    start: 'Démarrer l’entretien simulé',
    reset: 'Recommencer',
    qIndex: 'Q{{n}}',
    thinking: 'L’intervieweur réfléchit…',
    answerPlaceholder: 'Saisissez votre réponse ici…',
    submit: 'Envoyer et continuer',
    score: 'Note {{total}}/5',
    scoreHidden: 'Note masquée en mode formel'
  },
  coach: {
    title: "Assistant d'entretien en direct",
    subtitle: 'Transcription en direct · Points de réponse IA',
    recording: 'Enregistrement…',
    speaker: 'Locuteur',
    language: 'Langue',
    confidence: 'Confiance',
    speakingShare: 'Part de parole',
    lowShareHint: 'Vous parlez relativement peu — développez et prenez plus les devants',
    liveTranscript: 'Transcription en direct',
    waitingVoice: "En attente d'entrée vocale...",
    liveTranslation: 'Traduction IA en direct',
    translateTo: 'vers {{lang}}',
    suggestions: 'Suggestions',
    aiAssist: 'Assistance IA en direct',
    askAi: "Demander à l'IA",
    aiAssistLoading: 'Génération des points de réponse…',
    aiAssistEmpty:
      "Les points de réponse apparaissent automatiquement après la question du recruteur ; ou appuyez sur « Demander à l'IA ».",
    topicSummary: 'Résumé des sujets',
    exportTranscript: "Exporter le compte rendu d'entretien",
    exported: "Compte rendu d'entretien exporté",
    dragHint: 'Glisser pour déplacer',
    collapse: 'Réduire',
    expand: 'Développer',
    resizeHint: 'Glisser pour redimensionner le panneau',
    speakerInterviewer: 'Recruteur',
    speakerCandidate: 'Candidat',
    speakerUnknown: 'Inconnu',
    copyPoints: 'Copier les points',
    pointsCopied: 'Copié',
    prevPoint: 'Précédent',
    nextPoint: 'Suivant',
    pointIndex: '{{current}}/{{total}}',
    clearSession: 'Effacer la session',
    memoryFound: '{{count}} information(s) à ajouter à votre profil',
    memorySaveAll: 'Tout enregistrer',
    memorySaveOne: 'Enregistrer au profil',
    memoryDismiss: 'Ignorer',
    memorySaved: '{{count}} élément(s) enregistré(s) dans la mémoire personnelle',
    tab: {
      now: 'Maintenant',
      transcript: 'Transcription',
      history: 'Historique',
      later: 'Plus tard'
    },
    phase: {
      idle: 'En veille',
      listening: 'Écoute du recruteur',
      preparing: 'Question reçue, préparation',
      ready: 'Points de réponse prêts',
      recordingAnswer: 'Enregistrement de votre réponse',
      audioInterrupted: 'Audio interrompu — action requise'
    },
    debrief: {
      open: 'Débrief',
      title: 'Débrief d’entretien',
      close: 'Fermer',
      duration: 'Durée',
      questions: 'Questions',
      answerRate: 'Complétude',
      unanswered: 'Questions sans réponse',
      improvements: 'Points à améliorer',
      plan: 'Prochaine pratique',
      empty: 'Aucune Q&R enregistrée pour cette session'
    }
  },
  transcription: {
    waitingVoice: "En attente d'entrée vocale...",
    noKey: "Veuillez d'abord configurer la clé API DashScope dans les paramètres",
    starting: 'Démarrage de la transcription…',
    sourceSystem: 'Audio système',
    sourceMic: 'Microphone',
    sysAudioMacHint:
      "macOS ne peut pas capturer l'audio système (le recruteur) directement — installez le périphérique virtuel BlackHole et sélectionnez-le dans les réglages",
    sysAudioPermission:
      "Audio système refusé : autorisez Penumbra dans Réglages Système → Confidentialité et sécurité → Enregistrement de l'écran, puis quittez complètement et rouvrez l'app (BlackHole inutile)",
    partialStart: 'Certaines sources ont échoué ; transcription démarrée avec la source disponible',
    audioAllLost:
      'Toutes les sources audio sont déconnectées — vérifiez les autorisations ou le périphérique',
    audioSourceLost: '{{source}} déconnectée ; transcription poursuivie avec l’autre source',
    diagChunks:
      '{{count}} fragments audio reçus (un nombre qui augmente indique une capture en cours)',
    startBtn: 'Démarrer la transcription',
    stopBtn: 'Arrêter la transcription',
    restart: 'Redémarrer la transcription',
    startFailed: "Échec du démarrage de la transcription, vérifiez l'autorisation audio système",
    noAudioTrack:
      "Aucun audio capturé — activez « Partager l'audio du système/de l'onglet » lors du partage",
    askWithThis: 'Demander avec cette transcription',
    startWithThis: 'Démarrer avec cette transcription',
    askNoConversation: "Capturez d'abord une capture pour démarrer une conversation",
    asked: 'Question posée avec la transcription',
    copyText: 'Copier la transcription',
    textCopied: 'Copié',
    errDisconnected: 'La reconnaissance vocale a été déconnectée, veuillez réessayer',
    errTranslate: 'La traduction en direct a échoué, veuillez réessayer plus tard',
    errTimeout: 'Délai de connexion de la reconnaissance vocale dépassé, vérifiez votre réseau',
    errAuth:
      'Clé de reconnaissance vocale invalide ou expirée — vérifiez votre clé API DashScope dans les Réglages',
    errQuota:
      'Quota de reconnaissance vocale épuisé ou compte débiteur — vérifiez votre solde sur la console DashScope'
  },
  settings: {
    title: 'Paramètres',
    heroTitle: 'Configurer les modèles, la voix et le flux',
    localOnly: 'Local Uniquement',
    connError: {
      timeout: 'Délai de connexion dépassé, vérifiez le réseau ou la Base URL',
      auth: 'Clé API invalide ou non autorisée',
      forbidden: 'Accès interdit (403)',
      notFound: 'Point de terminaison introuvable, vérifiez la Base URL',
      network: 'Échec de la connexion réseau, vérifiez le réseau ou la Base URL',
      quota: 'Quota épuisé ou compte débiteur — vérifiez le solde de votre compte',
      unknown: 'Erreur inconnue'
    },
    model: {
      title: 'Service de Modèle',
      desc: 'Configurez un service de modèle compatible OpenAI pour la résolution, les suivis et la traduction.',
      baseUrlDesc:
        'ex. https://api.siliconflow.cn/v1 ; laissez vide pour utiliser le point de terminaison OpenAI par défaut.',
      baseUrlPlaceholder: 'Optionnel, par défaut API OpenAI',
      presetPlaceholder: 'Choisir un fournisseur',
      apiKeyPlaceholder: 'Saisir la clé API',
      modelLabel: 'Modèle de réponse',
      modelDesc:
        'Commencez par les modèles courants du fournisseur. Après saisie de la clé, les modèles du compte sont chargés automatiquement. Choisissez un modèle Vision pour les captures.',
      selectModel: 'Choisir un modèle...',
      searchOrCreate: 'Tapez pour rechercher ou créer...',
      noResult: 'Aucun résultat',
      create: 'Créer « {{name}} »',
      customTag: 'Perso',
      recommendedTag: 'Recommandé',
      visionTag: 'Vision',
      textOnlyTag: 'Texte seul',
      commonGroup: 'Courants pour ce fournisseur',
      accountGroup: 'Disponibles avec cette clé',
      customGroup: 'Ajoutés manuellement',
      deleteCustom: 'Supprimer le modèle perso',
      testConnection: 'Tester la connexion',
      testConnectionDesc:
        'Envoie une requête minimale avec la configuration actuelle pour confirmer que le modèle fonctionne.',
      testOk: 'Modèle connecté',
      testFail: 'Échec de la connexion : {{error}}',
      refresh: 'Recharger les modèles du compte',
      fetching: 'Chargement des modèles disponibles pour cette clé…',
      fetched: '{{count}} modèles chargés depuis le compte.',
      fetchHint: 'Les modèles du compte se chargent automatiquement après saisie de la clé.',
      fetchAutoFailed:
        'Impossible de charger les modèles du compte. Utilisez actualiser pour réessayer.',
      catalogUpdated: 'Liste courante mise à jour le {{date}}.',
      fetchOk: '{{count}} modèles du compte chargés',
      fetchFail: 'Échec du chargement des modèles : {{error}}'
    },
    voice: {
      title: "Voix & Assistant d'Entretien",
      desc: 'ASR en temps réel, séparation des locuteurs à double source, suivi des étapes et suggestions.',
      dashscopeKey: 'Clé API DashScope',
      dashscopeKeyDesc:
        'Utilisée pour la reconnaissance vocale en temps réel Alibaba Cloud Model Studio.',
      dashscopeKeyPlaceholder: 'Saisir la clé API DashScope',
      asrModel: 'Modèle de reconnaissance vocale',
      asrModelDesc:
        "Qwen-Audio 3.0 est recommandé. Qwen3 ASR utilise un protocole Realtime distinct que l'application sélectionne automatiquement.",
      asrModelDefault: 'recommandé',
      asrModelWarn:
        'Ce modèle est conservé pour compatibilité. Préférez Qwen-Audio 3.0 pour une nouvelle configuration.',
      micDevice: "Périphérique d'entrée audio",
      micDeviceDesc:
        "Choisissez le microphone à capturer. Pour transcrire l'audio système (recruteur), installez un périphérique virtuel comme BlackHole et sélectionnez-le ici.",
      micDeviceDefault: 'Microphone par défaut du système',
      micDeviceRefresh: 'Actualiser la liste des périphériques',
      testConnection: 'Tester la connexion',
      testConnectionDesc:
        'Effectue une connexion avec la clé et le modèle actuels pour confirmer que la reconnaissance vocale fonctionne.',
      testOk: 'Reconnaissance vocale connectée',
      testFail: 'Échec de la connexion : {{error}}',
      coachEnabled: "Assistant d'Entraînement",
      coachEnabledDesc:
        "Détecte le locuteur et l'étape de l'entretien à partir de la transcription et propose des réponses structurées.",
      realtimeAssist: 'Assistance IA en direct',
      realtimeAssistDesc:
        "Appelle automatiquement l'IA pour des points de réponse après la question du recruteur (consomme plus de tokens ; peut être désactivé ou déclenché via « Demander à l'IA »).",
      proactiveAssist: 'Coaching proactif en direct',
      proactiveAssistDesc:
        "Sans question ni touche — toutes les ~20s, des suggestions proactives selon le fil de la conversation : vos projets du CV, techniques SOTA pertinentes, points de réponse et bonnes questions à poser (consomme le plus de tokens ; idéal pour s'entraîner).",
      memoryDistill: 'Extraire la mémoire de la conversation',
      memoryDistillDesc:
        "Pendant l'entretien, l'IA repère les projets/compétences que vous mentionnez et les distille périodiquement en candidats pour votre profil. Rien n'est enregistré sans votre confirmation.",
      assistDebounce: "Délai de déclenchement de l'assistance",
      assistDebounceDesc:
        "Temps d'attente après que le recruteur a fini de parler avant de déclencher l'assistance IA ; plus court est plus rapide, plus long économise des tokens.",
      dualSource: 'Séparation des locuteurs à double source',
      dualSourceDesc:
        "L'audio système est marqué recruteur, le micro candidat. Sur macOS, le premier démarrage demande l'autorisation d'enregistrement de l'écran — activez cette application dans Réglages Système → Confidentialité et sécurité → Enregistrement de l'écran, puis quittez complètement et rouvrez (BlackHole inutile). Si le recruteur n'est toujours pas capté, installez le périphérique virtuel BlackHole et sélectionnez-le ci-dessus.",
      transcriptionLang: 'Langue de transcription',
      transcriptionLangDesc:
        'Choisir une langue améliore la précision. Utilisez le préréglage bilingue pour les entretiens mixtes chinois-anglais, ou la détection automatique.',
      autoDetect: 'Détection Auto',
      bilingualZhEn: 'Chinois + Anglais',
      diarizationMode: 'Mode de Séparation des Locuteurs',
      diarizationModeDesc:
        'La double source utilise les tags audio ; le mode provider est réservé au futur ASR de diarisation.',
      heuristic: 'Heuristique',
      providerLabel: 'Tags ASR Provider'
    },
    strategy: {
      title: 'Stratégie de Traduction & Réponse',
      appMode: "Mode d'Utilisation",
      appModeDesc:
        'Le mode algorithme donne code + complexité + cas limites ; le mode général répond à tout sans format de code imposé.',
      modeAlgorithm: 'Mode Algorithme',
      modeGeneral: 'Mode Général',
      desc: 'Contrôlez la traduction IA en direct et le prompt de résolution.',
      translation: 'Traduction IA en direct',
      translationDesc: 'Appelle le modèle IA actuel pour traduire après chaque phrase transcrite.',
      translationTargetLang: 'Langue cible de traduction',
      translationTargetLangDesc: 'Utilise la clé API et le modèle du service de modèle.',
      customPrompt: 'Prompt Personnalisé',
      customPromptDesc: 'Une fois activé, remplace le prompt de résolution par défaut.',
      customPromptPlaceholder: 'Saisir un prompt personnalisé...',
      outputStyle: 'Style de Sortie',
      outputStyleDesc: 'Choisissez un style prédéfini pour la sortie de la solution IA.',
      presetDefault: 'Analyse Complète',
      presetConcise: 'Concis',
      presetCodeOnly: 'Code Uniquement',
      presetInterview: "Explication d'Entretien",
      codeLanguage: 'Langage de Programmation',
      codeLanguageDesc: 'Désactivé lorsque un prompt personnalisé est activé.',
      langSelect: 'Choisir une langue...',
      langSearch: 'Rechercher ou ajouter une langue...',
      langNoResult: 'Aucune langue trouvée',
      langCreate: 'Ajouter « {{name}} »'
    },
    appearance: {
      title: 'Apparence',
      desc: "Contrôlez séparément l'opacité globale, du fond et du texte.",
      accentColor: "Couleur d'accent",
      accentColorDesc: "Personnalisez la couleur d'accent — boutons, surbrillances et indices.",
      accentColorCustom: 'Couleur personnalisée',
      accentLowContrast:
        'Cette couleur d’accent a un faible contraste sur le fond sombre ({{ratio}}:1) et peut être difficile à lire',
      overallOpacity: 'Opacité Globale',
      overallOpacityDesc: 'Ajuste toute la fenêtre (fond, texte, bordure) ensemble.',
      windowOpacity: 'Opacité de la Fenêtre',
      windowOpacityDesc:
        'Fond/panneaux uniquement. À pleine transparence, le texte flotte sur la fenêtre.',
      textOpacity: 'Opacité du Texte',
      textOpacityDesc: 'Texte uniquement, le fond reste inchangé.',
      transparent: 'Transparent',
      opaque: 'Opaque',
      uiLanguage: "Langue de l'Interface",
      uiLanguageDesc: "Changez la langue d'affichage de l'application.",
      reduceMotion: 'Réduire les animations',
      reduceMotionDesc:
        "Atténue les animations de l'interface pour moins de distractions en entretien.",
      motion: {
        system: 'Suivre le système',
        reduce: 'Toujours réduire',
        full: 'Toujours complet'
      },
      answerFontSize: 'Taille du Texte des Réponses',
      answerFontSizeDesc: 'Ajustez la taille du texte de la solution pour une meilleure lisibilité.'
    },
    storage: {
      title: 'Stockage',
      desc: 'Contrôlez si les captures sont enregistrées localement.',
      autoSave: 'Enregistrer les captures localement',
      autoSaveDesc: 'Une fois activé, chaque capture est enregistrée dans le dossier choisi.',
      saveDir: "Dossier d'enregistrement",
      saveDirDesc:
        'La boîte de dialogue peut être masquée par la fenêtre toujours au premier plan.',
      selectDir: 'Cliquez pour choisir un dossier',
      defaultDir: 'Par défaut : Images/Penumbra',
      screenshotDisplay: 'Écran de capture',
      screenshotDisplayDesc: 'Avec plusieurs moniteurs, choisissez quel écran capturer.',
      screenshotDisplayPrimary: 'Écran principal'
    },
    shortcuts: {
      title: 'Raccourcis',
      desc: "Les raccourcis globaux ne fonctionnent que sur l'interface principale.",
      resetDefaults: 'Réinitialiser les raccourcis',
      resetSuccess: 'Raccourcis réinitialisés',
      recording: 'Appuyez sur le nouveau raccourci...',
      conflict: 'Ce raccourci est déjà utilisé, choisissez-en un autre',
      failed: "Échec de l'enregistrement (conflit possible avec un raccourci système)"
    },
    memory: {
      title: 'Mémoire Personnelle',
      desc: 'Ajoutez votre contexte ; il sert à adapter les solutions à votre profil.',
      label: 'Contexte',
      placeholder:
        "ex. 3 ans de backend, surtout Go et systèmes distribués, en préparation d'un entretien backend…",
      importFile: 'Importer un fichier',
      clear: 'Effacer',
      imported: 'Document importé',
      importEmpty:
        "Impossible d'extraire du texte du fichier (un PDF scanné peut ne pas avoir de couche de texte)",
      hint: 'Prend en charge les fichiers .txt / .md / .pdf (stockés localement uniquement, jamais envoyés à des tiers).',
      profiles: 'Profils',
      addProfile: 'Nouveau profil',
      deleteProfile: 'Supprimer le profil',
      newProfileName: 'Nouveau profil',
      unnamedProfile: 'Sans nom',
      profileNamePlaceholder: 'Nom du profil, ex. « Postes backend »',
      fieldTargetRole: 'Poste visé',
      fieldTargetRolePlaceholder: 'ex. Ingénieur backend chez ByteDance',
      fieldTechStack: 'Stack technique',
      fieldTechStackPlaceholder: 'ex. Go, Kubernetes, PostgreSQL, gRPC',
      fieldProjects: 'Projets',
      fieldProjectsPlaceholder: 'Projets clés et résultats que vous voulez montrer au recruteur',
      fieldHighlights: 'Points à mettre en avant',
      fieldHighlightsPlaceholder:
        'ex. piloté un système à des millions de QPS, contributions open-source',
      fieldAvoid: 'À éviter',
      fieldAvoidPlaceholder: 'Sujets ou expériences que vous préférez ne pas approfondir',
      fieldFreeform: 'Autres notes',
      fieldFreeformPlaceholder: 'Toute autre information libre',
      preview: 'Contenu effectif',
      previewDesc: "C'est le texte exact ajouté au prompt IA (depuis le profil actif).",
      previewEmpty: '(Le profil actif est vide — remplissez les champs ci-dessus pour le voir ici)'
    },
    privacy: {
      title: 'Confidentialité & Sécurité',
      desc: "Configuration locale, permissions et options d'affichage.",
      note: "Les captures et l'audio ne sont envoyés qu'au service de modèle/ASR que vous configurez. Utilisez votre propre clé API et nettoyez régulièrement les captures locales.",
      secretStorage: 'État du stockage des secrets',
      secretCount:
        '{{count}}/2 clés configurées. Les clés sont stockées par le processus principal, pas dans le localStorage du renderer.',
      verifyNote:
        "Vérification : DevTools → Application → Local Storage → interview-coder-settings, confirmez l'absence des champs apiKey / dashscopeApiKey.",
      contentProtection: "Furtivité au partage d'écran",
      contentProtectionDesc:
        "Activé, la fenêtre est invisible à l'enregistrement/capture/partage de réunion (fonction clé de l'app). Désactivez temporairement si vous ne voyez pas la fenêtre après activation.",
      contentProtectionWarn:
        "Furtivité au partage d'écran activée. Si la fenêtre disparaît, appuyez sur ⌥0 pour la réinitialiser.",
      stealthOn: "Furtivité de partage d'écran activée",
      stealthOff: "Furtivité de partage d'écran désactivée",
      hideDock: "Masquer l'icône du Dock",
      hideDockDesc:
        'Une fois activé, masque du Dock et de Cmd+Tab ; la fenêtre ne peut être appelée que par raccourci.'
    }
  },
  help: {
    title: "Centre d'Aide",
    heroTitle: 'Démarrage rapide & FAQ',
    practiceMode: 'Mode Pratique',
    introTitle: 'Introduction',
    introBefore:
      "Bienvenue dans Penumbra ! Pour les tests de code et entretiens, il capture l'écran, l'analyse et propose des solutions. Consultez le projet ",
    introAfter: " pour plus d'aide (configuration furtive, clé API, etc.).",
    feature1: "Capturez l'écran via un raccourci et générez des solutions.",
    feature2:
      "La fenêtre se masque automatiquement pendant le partage d'écran (invisible aux autres ; certaines apps de réunion nécessitent une configuration).",
    feature3:
      'La fenêtre reste au premier plan, semi-transparente, et garde le curseur en place pour ne jamais faire perdre le focus à la page sous-jacente.',
    step1Title: '1. Démarrer une conversation',
    step1Desc: 'Capture, saisie en bas, ou transcription vocale pour démarrer.',
    step2Title: '2. Voir les résultats',
    step2Desc: "Le contenu s'affiche en conversation ; copiez, relancez ou consultez l'historique.",
    asrTitle: 'Entretien vocal en direct (ASR)',
    asrDesc:
      "Transcrivez l'examinateur en temps réel, puis lancez une conversation ou obtenez des points de réponse IA en un clic.",
    asrStep1Title: '1. Configurer le service vocal',
    asrStep1Desc:
      "Dans Paramètres → Voix et assistant d'entretien, saisissez votre clé API DashScope et cliquez sur « Tester la connexion » pour vérifier.",
    asrStep2Title: '2. Lancer la transcription',
    asrStep2Desc:
      "Appuyez sur le raccourci de transcription pour démarrer. La première fois, une invite de partage d'écran s'affiche : cochez bien « Partager l'audio système / de l'onglet », sinon le son système n'est pas capté.",
    asrStep3Title: '3. Distinguer les locuteurs (double source)',
    asrStep3Desc:
      "Avec la double source activée, l'audio système est étiqueté « Examinateur » et le micro « Moi », ce qui facilite le suivi du dialogue.",
    asrStep4Title: "4. Utiliser l'assistance IA",
    asrStep4Desc:
      "Les boutons de la barre de transcription permettent de « lancer une conversation / relancer » avec la voix captée. Avec « Assistance IA en direct » activée, les questions de l'examinateur génèrent automatiquement des points de réponse. Le panneau Assistant d'entretien affiche la chronologie de la conversation, les points IA et le résumé des sujets, et permet d'exporter le compte rendu d'entretien.",
    keyFeatures: 'Fonctions principales :',
    quickStart: 'Démarrage Rapide',
    shortcutsTitle: 'Raccourcis',
    shortcutsDesc:
      "Les raccourcis sont le principal moyen d'utiliser l'app ; personnalisez-les dans les Paramètres.",
    faqTitle: 'FAQ',
    contactTitle: 'Contacter le Support',
    contactDesc: 'Si vous rencontrez des problèmes ou avez des suggestions, contactez-nous via :',
    contactGithubPrefix: 'Soumettez bugs et demandes de fonctionnalités sur ',
    contactGithubSuffix: '',
    faq: {
      q1: 'Comment faire une capture ?',
      a1: "Appuyez sur {{key}} pour capturer l'écran actuel ; la capture apparaît automatiquement dans l'app.",
      q2: 'Et si le problème dépasse un écran ?',
      a2: 'Appuyez sur {{key}} pour ajouter une capture à la conversation actuelle et générer une solution.',
      q3: "Les autres voient-ils l'app pendant le partage d'écran ?",
      a3: 'La fenêtre se masque automatiquement pendant le partage (invisible pour les autres), mais certaines apps de réunion nécessitent une configuration. Testez avec votre machine + app réelles avant.',
      q4: 'Le curseur change-t-il au survol de la fenêtre ?',
      a4: "Il y a une bascule de passage de souris. Activée, la fenêtre ignore la souris et s'opère via raccourcis ; la bascule est {{key}}, l'état s'affiche en bas à droite.",
      q5: "Qu'est-ce que la transcription vocale ?",
      a5: "Elle transcrit en temps réel le recruteur ou l'énoncé lu pour aider l'IA. Configurez la clé API DashScope dans les paramètres, puis {{key}} pour démarrer/suspendre ; la transcription est jointe automatiquement à la capture.",
      q6: 'Puis-je effacer la transcription seule ?',
      a6: "Oui. Appuyez sur {{key}} pour effacer la transcription actuelle ; le texte effacé n'est pas envoyé à l'IA, et les captures effacent aussi la transcription existante.",
      q7: "Aucun son / l'audio système n'est pas capturé, que faire ?",
      a7: "Au démarrage de la transcription, le système affiche une demande de partage d'écran — vous devez cocher « Partager l'audio du système/de l'onglet », sinon l'autre voix n'est pas captée. Vérifiez aussi qu'une clé API DashScope est définie et que « Tester la connexion » réussit.",
      q8: 'Comment distinguer le recruteur de moi-même ?',
      a8: "Activez « Séparation des locuteurs à double source » dans les paramètres : l'audio système est marqué recruteur et le micro candidat, à la fois dans la transcription et dans le contexte envoyé à l'IA.",
      q9: "Pourquoi les points de réponse de l'IA n'apparaissent-ils pas automatiquement ?",
      a9: "Activez « Assistance IA en direct » dans les paramètres ; elle ne se déclenche automatiquement que lorsque les propos du recruteur ressemblent à une question. Vous pouvez aussi appuyer sur « Demander à l'IA » dans le panneau.",
      q10: 'Les projets/compétences mentionnés en entretien peuvent-ils être enregistrés automatiquement dans mon profil ?',
      a10: "Oui. Activez « Extraire la mémoire de la conversation » dans Paramètres → Voix et assistant d'entretien. L'IA distille les projets, la stack technique, etc. que vous mentionnez en candidats affichés en haut du panneau vocal ; ils ne sont écrits dans le profil actif qu'après votre confirmation (par élément ou en bloc) — jamais enregistrés automatiquement."
    }
  },
  update: {
    available: 'Une nouvelle version est disponible',
    availableVersion: 'Version {{version}} disponible',
    download: 'Télécharger la mise à jour',
    later: 'Plus tard',
    downloading: 'Téléchargement… {{percent}}%',
    ready: 'Mise à jour prête',
    restart: 'Redémarrer maintenant',
    error: 'Échec de la mise à jour, réessayez plus tard'
  },
  shortcutCategory: {
    'Window Management': 'Gestion des Fenêtres',
    'Screenshot & AI': 'Capture & IA',
    Navigation: 'Navigation',
    'Window Movement': 'Déplacement de Fenêtre'
  },
  shortcut: {
    hideOrShowMainWindow: { label: 'Masquer/Afficher la fenêtre' },
    resetWindow: {
      label: 'Réinitialiser la fenêtre',
      desc: 'À presser quand la fenêtre est invisible pour la recentrer, la rendre opaque et l’afficher'
    },
    ignoreOrEnableMouse: {
      label: 'Passage de souris',
      desc: 'Une fois activé, les clics traversent la fenêtre vers ce qui est derrière'
    },
    toggleContentProtection: {
      label: "Basculer la furtivité de partage d'écran",
      desc: "Une touche pour activer/désactiver l'invisibilité lors de l'enregistrement/partage"
    },
    increaseOverallOpacity: {
      label: "Augmenter l'opacité globale",
      desc: 'Rend toute la fenêtre plus opaque'
    },
    decreaseOverallOpacity: {
      label: "Diminuer l'opacité globale",
      desc: 'Rend toute la fenêtre plus transparente'
    },
    increaseWindowOpacity: {
      label: "Augmenter l'opacité de la fenêtre",
      desc: 'Rend le fond de la fenêtre plus opaque'
    },
    decreaseWindowOpacity: {
      label: "Diminuer l'opacité de la fenêtre",
      desc: 'Rend le fond plus transparent (texte conservé)'
    },
    increaseTextOpacity: { label: "Augmenter l'opacité du texte", desc: 'Rend le texte plus net' },
    decreaseTextOpacity: {
      label: "Diminuer l'opacité du texte",
      desc: 'Rend le texte plus transparent'
    },
    takeScreenshot: {
      label: 'Capture',
      desc: 'Capturer et générer une solution (nouvelle conversation)'
    },
    appendScreenshot: {
      label: 'Ajouter une capture',
      desc: 'Ajouter une capture à la conversation actuelle, utile pour les longs problèmes'
    },
    stopSolutionStream: {
      label: 'Arrêter la génération',
      desc: 'Interrompre la solution en cours de génération'
    },
    toggleTranscription: {
      label: 'Transcription vocale',
      desc: 'Démarrer/suspendre la transcription en temps réel'
    },
    clearTranscription: {
      label: 'Effacer la transcription',
      desc: "Effacer le texte transcrit (non envoyé à l'IA)"
    },
    copyLatestAnswer: {
      label: 'Copier le code de la dernière réponse',
      desc: 'Copier le bloc de code de la dernière réponse (ou tout le texte sinon) — collage sans souris pendant les entretiens'
    },
    pageUp: { label: 'Défiler vers le haut' },
    pageDown: { label: 'Défiler vers le bas' },
    moveMainWindowUp: { label: 'Déplacer la fenêtre vers le haut' },
    moveMainWindowDown: { label: 'Déplacer la fenêtre vers le bas' },
    moveMainWindowLeft: { label: 'Déplacer la fenêtre vers la gauche' },
    moveMainWindowRight: { label: 'Déplacer la fenêtre vers la droite' }
  },
  history: {
    title: 'Historique',
    empty: 'Aucune conversation passée',
    delete: 'Supprimer',
    searchPlaceholder: 'Rechercher des sessions…'
  }
}

export default fr
