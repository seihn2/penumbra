import type { TranslationSchema } from './zh'

const en: TranslationSchema = {
  header: {
    appName: 'Penumbra',
    practiceMode: 'Practice Mode',
    settings: 'Settings',
    help: 'Help',
    controlCenter: 'Control center',
    close: 'Close',
    back: 'Back',
    newConversation: 'New Conversation',
    export: 'Export Conversation',
    exported: 'Conversation exported',
    transcriptionOn: 'Transcription on',
    transcriptionOff: 'Transcription off',
    transcriptionStartHint: 'Press {{key}} to start transcription',
    transcriptionStopHint: 'Press {{key}} to stop transcription'
  },
  workbench: {
    title: 'Problem Analysis Workbench',
    titleGeneral: 'AI Assistant',
    recommended: 'Recommended',
    statusAnswerReady: 'Answer Ready',
    statusContextCaptured: 'Context Captured',
    statusWaiting: 'Waiting for Capture',
    screenshotTimeline: 'Screenshot Timeline',
    solutionOutput: 'Solution',
    chars: '{{count}} chars',
    empty: 'Empty',
    copy: 'Copy',
    copied: 'Copied to clipboard',
    copyCodeOnly: 'Copy code only',
    copiedCode: 'Code copied',
    copyLatestDone: 'Latest answer code copied',
    copyLatestEmpty: 'No answer to copy yet',
    copyLatestFailed: 'Copy failed, please retry',
    screenshotArchived: 'Screenshot (images not kept in history)',
    emptyAnswerTitle: 'Waiting for Problem Context',
    emptyAnswerDesc:
      'After capturing the problem, the answer, complexity and edge cases will stream here.',
    noScreenshotTitle: 'No Screenshot Yet',
    noScreenshotDesc: 'Press the shortcut to capture the screen for analysis',
    startTitle: 'Start a conversation',
    startDesc: 'Capture a screenshot, type a question below, or start voice transcription.',
    startScreenshotHint: 'Press this shortcut to take a screenshot',
    errorTitle: 'API Request Failed',
    errorHint: 'Check the model service config, network connectivity, or retry later.',
    retry: 'Retry',
    openScreenSettings: 'Open Screen Recording Settings',
    sendFailed: 'Send failed — make sure an API key is set and you are on the main screen'
  },
  statusBar: {
    generating: 'Generating...',
    stopGeneration: 'Stop',
    appendScreenshot: 'Append Screenshot',
    newConversation: 'New Conversation',
    askFollowUp: 'Ask Follow-up',
    disableMousePassthrough: 'Disable Mouse Passthrough'
  },
  followUp: {
    placeholder: 'Type your follow-up, press Ctrl+Enter to submit...',
    composerPlaceholder: 'Type a follow-up, Enter to send, Shift+Enter for newline',
    startPlaceholder: 'Type a question to start, or screenshot via shortcut…',
    cancel: 'Cancel',
    submit: 'Submit',
    imeWarning:
      '⚠️ The input-method candidate popup is not covered by stealth and may show in a screen recording. Prefer pasting or English input.'
  },
  prerequisites: {
    welcome: 'Welcome to Penumbra',
    intro: 'Please configure an LLM provider first, such as',
    siliconflow: 'SiliconFlow',
    introMid: 'or',
    introEnd: '.',
    apiBaseUrl: 'API Base URL',
    apiBaseUrlHelper: 'The API Base URL of SiliconFlow or another proxy provider',
    apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter API Key',
    start: 'Get Started',
    moreSettings: 'More Settings'
  },
  selfCheck: {
    title: 'Pre-Interview Check',
    intro:
      'One click to verify AI vision + streaming, screenshot, audio, shortcuts, and network are ready.',
    run: 'Run Check',
    rerun: 'Run Again',
    running: 'Checking…',
    blocking: 'Fix first: {{item}}',
    checks: {
      ai: 'AI vision + streaming',
      network: 'Network latency',
      screenshot: 'Screenshot permission & result',
      asr: 'Speech recognition connection',
      shortcuts: 'Key shortcuts registered',
      dependencies: 'Feature dependencies'
    },
    status: {
      pass: 'OK',
      warn: 'Warning',
      fail: 'Failed',
      skip: 'Not configured'
    },
    readiness: {
      ready: 'Ready — you can start the interview',
      degraded: 'Degraded — some features limited',
      unusable: 'Unusable — resolve the blocking item first'
    }
  },
  soak: {
    title: 'Quality benchmark',
    intro:
      'Periodically samples memory, connection, and transcription health during a long session; evaluates pass / degraded / fail.',
    start: 'Start sampling',
    stop: 'Stop sampling',
    refresh: 'Refresh report',
    sampling: 'Sampling',
    samples: '{{count}} samples',
    verdict: {
      pass: 'Pass',
      degraded: 'Degraded',
      fail: 'Fail'
    }
  },
  egress: {
    title: 'Data egress',
    note: 'Records only destination domain and data category — never payload content.'
  },
  provenance: {
    analyze: 'Credibility analysis',
    title: 'Answer credibility analysis',
    analyzing: 'Analyzing claim provenance…',
    empty: 'Could not parse any claims; try again later.',
    kind: {
      'problem-text': 'Problem text',
      'user-constraint': 'User-confirmed constraint',
      'known-fact': 'Known fact',
      assumption: 'Model assumption',
      'ai-inference': 'Model inference',
      unconfirmed: 'Unconfirmed'
    }
  },
  blocks: {
    open: 'Copy by section',
    title: 'Copy by section',
    preamble: 'Intro'
  },
  revisionDiff: {
    open: 'Diff vs previous',
    title: 'Diff against previous answer',
    unchanged: 'Unchanged',
    changed: 'Changed',
    added: 'Added',
    removed: 'Removed',
    empty: 'The two answers are identical'
  },
  blockType: {
    'question-summary': 'Question summary',
    clarifications: 'Clarifications',
    'core-conclusion': 'Core conclusion',
    plan: 'Approach',
    code: 'Code',
    complexity: 'Complexity',
    tests: 'Tests',
    risks: 'Risks',
    'spoken-version': 'Spoken version'
  },
  questionType: {
    coding: 'Coding',
    'system-design': 'System design',
    sql: 'SQL',
    behavioral: 'Behavioral',
    debugging: 'Debugging'
  },
  scaffold: {
    title: 'Answer framework',
    optional: 'Optional',
    coding: {
      clarify: 'Clarify inputs, outputs, constraints',
      examples: 'Walk a concrete example',
      'brute-force': 'State the brute-force solution',
      optimize: 'Optimize to the target complexity',
      complexity: 'State time / space complexity',
      code: 'Write the code',
      tests: 'Add edge cases and tests'
    },
    'system-design': {
      requirements: 'Clarify functional / non-functional needs',
      scale: 'Estimate scale (QPS / storage)',
      api: 'Define the core API',
      'high-level': 'Sketch the high-level architecture',
      'data-model': 'Design the data model',
      bottlenecks: 'Identify bottlenecks and scaling points',
      tradeoffs: 'Discuss trade-offs'
    },
    sql: {
      schema: 'Confirm the table schema',
      'target-columns': 'Identify the columns to return',
      joins: 'Determine the joins',
      'filter-aggregate': 'Filter and aggregate',
      'edge-cases': 'Handle NULL / dedup edge cases',
      verify: 'Verify the result'
    },
    behavioral: {
      situation: 'Situation',
      task: 'Task',
      action: 'Action',
      result: 'Result',
      reflection: 'Reflection and takeaways'
    },
    debugging: {
      reproduce: 'Reproduce reliably',
      narrow: 'Narrow the scope',
      hypothesis: 'Form a hypothesis',
      verify: 'Verify the hypothesis',
      fix: 'Fix it',
      prevent: 'Prevent recurrence'
    }
  },
  brief: {
    title: 'Opportunity brief',
    intro:
      'Paste the job requirements; combined with your profile, generate this interview’s focus, projects to tell, and questions to ask.',
    noProfile:
      'No profile yet — add your tech stack and projects under Settings → Memory for better results.',
    jobTitle: 'Job title',
    company: 'Company',
    mustHave: 'Must-have',
    niceToHave: 'Nice-to-have',
    keywords: 'Keywords',
    listHint: 'comma or newline separated',
    generate: 'Generate brief',
    emptyRight: 'Fill in the requirements, then generate',
    focusAreas: 'Focus areas',
    projectsToTell: 'Projects to tell',
    keyMetrics: 'Key metrics',
    deepDives: 'Deep dives',
    likelyFollowUps: 'Likely follow-ups',
    behavioral: 'Behavioral material',
    questionsToAsk: 'Questions to ask',
    risks: 'Risks & gaps'
  },
  mock: {
    title: 'Mock interview',
    intro:
      'Pick a mode, track and difficulty; the AI interviewer asks and drills down. Practice mode shows a score and feedback.',
    mode: 'Mode',
    modePractice: 'Practice (show score)',
    modeFormal: 'Formal (hide score)',
    track: 'Track',
    track_behavioral: 'Behavioral',
    'track_system-design': 'System design',
    track_coding: 'Coding',
    difficulty: 'Difficulty',
    diff_easy: 'Easy',
    diff_medium: 'Medium',
    diff_hard: 'Hard',
    start: 'Start mock interview',
    reset: 'Restart',
    qIndex: 'Q{{n}}',
    thinking: 'Interviewer is thinking…',
    answerPlaceholder: 'Type your answer here…',
    submit: 'Submit & continue',
    score: 'Score {{total}}/5',
    scoreHidden: 'Score hidden in formal mode'
  },
  coach: {
    title: 'Live Interview Assistant',
    subtitle: 'Live transcription · AI answer points',
    recording: 'Recording…',
    speaker: 'Speaker',
    language: 'Language',
    confidence: 'Confidence',
    speakingShare: 'Speaking share',
    lowShareHint: "You're speaking relatively little — try elaborating and driving more",
    liveTranscript: 'Live Transcript',
    waitingVoice: 'Waiting for voice input...',
    liveTranslation: 'AI Live Translation',
    translateTo: 'to {{lang}}',
    suggestions: 'Suggestions',
    aiAssist: 'Live AI Assist',
    askAi: 'Ask AI',
    detectedQuestion: 'Detected question',
    detectedQuestionWaiting: 'Preparing answer points for this question…',
    aiAssistLoading: 'Generating answer points…',
    aiAssistEmpty:
      'Answer points appear automatically after the interviewer asks; or tap "Ask AI".',
    assist: {
      opening: 'Say this first',
      path: 'Answer path',
      evidence: 'Project evidence',
      followUp: 'Likely follow-ups',
      avoid: 'Avoid',
      kind: {
        project: 'Project deep dive',
        behavioral: 'Behavioral',
        'system-design': 'System design',
        algorithm: 'Algorithm',
        concept: 'Concept',
        general: 'General'
      }
    },
    topicSummary: 'Topic Summary',
    exportTranscript: 'Export interview record',
    exported: 'Interview record exported',
    dragHint: 'Drag to reposition',
    collapse: 'Collapse',
    expand: 'Expand',
    resizeHint: 'Drag to resize panel',
    speakerInterviewer: 'Interviewer',
    speakerCandidate: 'Candidate',
    speakerUnknown: 'Unknown',
    copyPoints: 'Copy points',
    pointsCopied: 'Copied',
    rememberAnswerPolicy: 'Use this wording next time',
    answerPolicyRemembered: 'Wording saved',
    answerPolicySaved: 'Saved. Similar questions will use this wording first.',
    answerPolicySaveFailed: 'Could not save: {{error}}',
    answerPolicyConflict: 'A similar question already has approved wording',
    answerPolicyPrevious: 'Currently saved wording',
    answerPolicyKeepPrevious: 'Keep previous',
    answerPolicyReplace: 'Replace with this answer',
    rememberSpokenAnswer: 'Remember what I just said',
    spokenAnswerTitle: 'Confirm my actual answer path',
    spokenAnswerDesc:
      'This is your transcribed answer. Fix any ASR errors, then save it as the preferred wording for similar questions.',
    saveSpokenAnswer: 'Save my answer',
    prevPoint: 'Previous',
    nextPoint: 'Next',
    pointIndex: '{{current}}/{{total}}',
    clearSession: 'Clear session',
    memoryFound: 'Found {{count}} fact(s) you can add to your profile',
    memorySaveAll: 'Save all',
    memorySaveOne: 'Save to profile',
    memoryDismiss: 'Dismiss',
    memorySaved: 'Saved {{count}} item(s) to personal memory',
    tab: {
      now: 'Now',
      transcript: 'Transcript',
      history: 'History',
      later: 'Later'
    },
    phase: {
      idle: 'Standby',
      listening: 'Listening to interviewer',
      preparing: 'Question received, preparing',
      ready: 'Answer points ready',
      recordingAnswer: 'Recording your answer',
      audioInterrupted: 'Audio interrupted — needs attention'
    },
    debrief: {
      open: 'Debrief',
      title: 'Interview Debrief',
      close: 'Close',
      duration: 'Duration',
      questions: 'Questions',
      answerRate: 'Completion',
      unanswered: 'Unanswered questions',
      improvements: 'Areas to improve',
      plan: 'Next practice',
      empty: 'No Q&A recorded for this session yet'
    }
  },
  transcription: {
    waitingVoice: 'Waiting for voice input...',
    noKey: 'Please configure the DashScope API Key in settings first',
    starting: 'Starting transcription…',
    sourceSystem: 'System audio',
    sourceMic: 'Microphone',
    sysAudioMacHint:
      "macOS can't capture system audio (the interviewer) directly — install the BlackHole virtual device and select it in settings",
    sysAudioPermission:
      'System audio denied: grant Penumbra under System Settings → Privacy & Security → Screen Recording, then fully quit and reopen the app (no BlackHole needed)',
    partialStart: 'Some sources failed; transcription started with the available one',
    audioAllLost: 'All audio sources disconnected — check permissions or device',
    audioSourceLost: '{{source}} disconnected; still transcribing from the other source',
    diagChunks: '{{count}} audio chunks received (a rising number means audio is being captured)',
    startBtn: 'Start transcription',
    stopBtn: 'Stop transcription',
    restart: 'Restart transcription',
    startFailed: 'Failed to start transcription, please check system audio permission',
    noAudioTrack: 'No audio captured — enable "Share system/tab audio" when sharing',
    askWithThis: 'Ask with this transcript',
    startWithThis: 'Start with this transcript',
    askNoConversation: 'Capture a screenshot to start a conversation first',
    asked: 'Asked using the transcript',
    copyText: 'Copy transcript',
    textCopied: 'Copied',
    errDisconnected: 'Speech recognition disconnected, please try again',
    errTranslate: 'Live translation failed, please try again later',
    errTimeout: 'Speech recognition timed out, check your network and retry',
    errAuth:
      'Speech recognition key is invalid or expired — check your DashScope API key in Settings',
    errQuota:
      'Speech recognition quota exhausted or account in arrears — check your balance on the DashScope console'
  },
  settings: {
    title: 'Settings',
    heroTitle: 'Configure models, voice and workflow',
    localOnly: 'Local Only',
    connError: {
      timeout: 'Connection timed out, check your network or Base URL',
      auth: 'Invalid or unauthorized API key',
      forbidden: 'Access forbidden (403)',
      notFound: 'Endpoint not found, check the Base URL',
      network: 'Network connection failed, check your network or Base URL',
      quota: 'Quota exhausted or account in arrears — check your account balance',
      unknown: 'Unknown error'
    },
    model: {
      title: 'Model Service',
      desc: 'Configure an OpenAI-compatible model service for solving, follow-ups and live translation.',
      profile: 'Service Profile',
      profileDesc:
        'Each profile keeps its endpoint, model, account model cache, and encrypted key separate.',
      profileName: 'Profile Name',
      profileNameDesc: 'Use a recognizable name such as OpenAI, DeepSeek, or Company Gateway.',
      addProfile: 'Add service profile',
      deleteProfile: 'Delete current profile',
      deleteProfileConfirm: 'Delete “{{name}}” and its saved key?',
      profileAdded: 'Answer service profile added',
      profileDeleted: 'Answer service profile deleted',
      baseUrlDesc:
        'e.g. https://api.siliconflow.cn/v1; leave empty to use the default OpenAI-compatible endpoint.',
      baseUrlPlaceholder: 'Optional, defaults to OpenAI API',
      presetPlaceholder: 'Pick a provider',
      protocolLabel: 'API Protocol',
      protocolDesc:
        'Auto picks the best default for the provider and only switches before any answer text is emitted.',
      protocolAuto: 'Auto (recommended)',
      protocolResponses: 'Responses API',
      protocolChat: 'Chat Completions',
      protocolAnthropic: 'Anthropic Messages',
      apiKeyPlaceholder: 'Enter API Key',
      apiKeyReplacePlaceholder: 'Enter a new key to replace the saved key',
      keyStored: 'Encrypted key saved ····{{suffix}}. The raw key is not stored in app settings.',
      keyNotStored: 'No key is saved for this profile.',
      saveKey: 'Save Key',
      replaceKey: 'Replace Key',
      deleteKey: 'Delete Key',
      keySaved: 'Key encrypted and saved',
      keySaveFail: 'Could not save the key in system secure storage.',
      keyDeleted: 'Key deleted',
      modelLabel: 'Answer model',
      modelDesc:
        'Start with common models for this provider. After you enter a key, account models load automatically. Use a Vision model for screenshots.',
      selectModel: 'Select model...',
      searchOrCreate: 'Type to search or create...',
      noResult: 'No results',
      create: 'Create "{{name}}"',
      customTag: 'Custom',
      recommendedTag: 'Recommended',
      visionTag: 'Vision',
      textOnlyTag: 'Text only',
      commonGroup: 'Common for this provider',
      accountGroup: 'Available to this key',
      customGroup: 'Manually added',
      deleteCustom: 'Delete custom model',
      testConnection: 'Test Connection',
      testConnectionDesc:
        'Send a minimal request with the current config to confirm the model works.',
      testOk: 'Model connected',
      testFail: 'Connection failed: {{error}}',
      refresh: 'Reload account models',
      fetching: 'Loading models available to this key…',
      fetched: 'Updated {{count}} account models.',
      cached: '{{count}} account models cached; they reload only when you click refresh.',
      fetchHint: 'Click refresh when you want to load account models.',
      fetchFailed: 'Could not load account models. Click refresh to retry.',
      fetchOk: 'Loaded {{count}} account models',
      fetchFail: 'Failed to load models: {{error}}'
    },
    voice: {
      title: 'Voice & Interview Assistant',
      desc: 'Real-time ASR, dual-source speaker separation, stage awareness and answer suggestions.',
      dashscopeKey: 'DashScope API Key',
      dashscopeKeyDesc: 'Used for Alibaba Cloud Model Studio real-time speech recognition.',
      dashscopeKeyPlaceholder: 'Enter DashScope API Key',
      asrModel: 'Speech Recognition Model',
      asrModelDesc:
        'Qwen-Audio 3.0 is recommended. Qwen3 ASR uses a separate Realtime protocol that the app selects automatically.',
      asrModelDefault: 'recommended',
      asrModelWarn: 'This model is kept for compatibility. Prefer Qwen-Audio 3.0 for new setups.',
      micDevice: 'Audio Input Device',
      micDeviceDesc:
        'Choose which microphone to capture. To transcribe the interviewer (system audio), install a virtual device like BlackHole and select it here.',
      micDeviceDefault: 'System default microphone',
      micDeviceRefresh: 'Refresh device list',
      testConnection: 'Test Connection',
      testConnectionDesc: 'Run a handshake with the current key and model to confirm ASR works.',
      testOk: 'Speech recognition connected',
      testFail: 'Connection failed: {{error}}',
      coachEnabled: 'Interview Practice Assistant',
      coachEnabledDesc:
        'Detects speaker and interview stage from live transcription and gives structured answer suggestions.',
      realtimeAssist: 'Detect New Questions and Generate Answer Prompts',
      realtimeAssistDesc:
        'Continuously detects new interviewer questions and generates answer points after they finish speaking (uses more tokens; you can also trigger it with "Ask AI").',
      proactiveAssist: 'Proactive Live Coaching',
      proactiveAssistDesc:
        'No question or keypress needed — every ~20s it proactively suggests, based on where the conversation is going: your résumé projects, relevant SOTA tech, answer points and good questions to ask back (uses the most tokens; best for practice).',
      memoryDistill: 'Distill memory from conversation',
      memoryDistillDesc:
        'During the interview, the AI notes projects/skills you mention and periodically distills them into candidates for your profile. Nothing is saved without your confirmation.',
      assistDebounce: 'Assist Trigger Delay',
      assistDebounceDesc:
        'How long to wait after the interviewer stops before triggering AI assist; shorter is faster, longer saves tokens.',
      dualSource: 'Dual-source Speaker Separation',
      dualSourceDesc:
        'System audio is tagged as interviewer, microphone as candidate. On macOS the first start prompts for Screen Recording — grant this app under System Settings → Privacy & Security → Screen Recording, then fully quit and reopen (no BlackHole needed). If the interviewer still is not picked up, install the BlackHole virtual device and select it above.',
      transcriptionLang: 'Transcription Language',
      transcriptionLangDesc:
        'Picking a language improves recognition accuracy. Use the bilingual preset for mixed Chinese-English interviews, or choose auto-detect.',
      autoDetect: 'Auto Detect',
      bilingualZhEn: 'Chinese + English',
      diarizationMode: 'Speaker Separation Mode',
      diarizationModeDesc:
        'Dual-source uses audio tags directly; provider mode is reserved for future diarization ASR.',
      heuristic: 'Heuristic',
      providerLabel: 'ASR Provider Tags'
    },
    strategy: {
      title: 'Translation & Answer Strategy',
      appMode: 'Usage Mode',
      appModeDesc:
        'Algorithm mode gives code + complexity + edge cases; general mode answers anything without forcing a code format.',
      modeAlgorithm: 'Algorithm Mode',
      modeGeneral: 'General Mode',
      desc: 'Control AI live translation and the solving prompt.',
      translation: 'AI Live Translation',
      translationDesc: 'Calls the current AI model to translate after each transcribed sentence.',
      translationTargetLang: 'Translation Target Language',
      translationTargetLangDesc: 'Uses the API Key and model from the model service.',
      customPrompt: 'Custom Prompt',
      customPromptDesc: 'When enabled, overrides the default coding-solution prompt.',
      customPromptPlaceholder: 'Enter custom prompt...',
      outputStyle: 'Output Style',
      outputStyleDesc: 'Choose a preset style for the AI solution output.',
      presetDefault: 'Full Analysis',
      presetConcise: 'Concise',
      presetCodeOnly: 'Code Only',
      presetInterview: 'Interview Walkthrough',
      codeLanguage: 'Programming Language',
      codeLanguageDesc: 'Disabled when a custom prompt is enabled.',
      langSelect: 'Select language...',
      langSearch: 'Search or add language...',
      langNoResult: 'No language found',
      langCreate: 'Add "{{name}}"'
    },
    appearance: {
      title: 'Appearance',
      desc: 'Adjust interface text, window controls and four independent opacity layers.',
      accentColor: 'Accent color',
      accentColorDesc: 'Customize the UI accent — affects buttons, highlights and hints.',
      accentColorCustom: 'Custom color',
      accentLowContrast:
        'This accent has low contrast on the dark background ({{ratio}}:1) and may be hard to read',
      overallOpacity: 'Overall Opacity',
      overallOpacityDesc: 'Adjusts the whole window (background, text, border) together.',
      windowOpacity: 'Window Opacity',
      windowOpacityDesc: 'Background/panels only. At fully transparent, text floats on the window.',
      textOpacity: 'Text Opacity',
      textOpacityDesc: 'Text only, background unaffected.',
      iconOpacity: 'Icon Opacity',
      iconOpacityDesc:
        'Buttons and status icons only; text, backgrounds and screenshots stay unchanged.',
      transparent: 'Transparent',
      opaque: 'Opaque',
      uiLanguage: 'Interface Language',
      uiLanguageDesc: 'Switch the language of the application interface.',
      zeroUiMode: '0 UI Plain Text Mode',
      zeroUiModeDesc:
        'Hide every control and screenshot; show only AI replies as preformatted text. Use the global shortcut to toggle it anytime.',
      zeroUiEnabled: '0 UI plain text mode enabled',
      zeroUiDisabled: '0 UI plain text mode disabled',
      zeroUiBackdrop: '0 UI Backdrop',
      zeroUiBackdropDesc:
        'Match the real content behind the overlay for a readable but discreet dual-camera setup.',
      zeroUiBackdrops: {
        dark: 'Dark content behind (light text)',
        light: 'Light content behind (dark text)'
      },
      uiFontSize: 'Interface Font Size',
      uiFontSizeDesc: 'Adjust navigation, settings and general UI text; answers stay independent.',
      codeBlockTheme: 'Code Block Style',
      codeBlockThemeDesc:
        'Choose the code surface contrast; Soft avoids a conspicuous pure-black block.',
      codeTheme: {
        soft: 'Soft (recommended)',
        light: 'Light',
        dark: 'Dark'
      },
      trafficLightMode: 'Window Controls',
      trafficLightModeDesc:
        'Keep macOS controls out of sight until the pointer reaches the top-left corner.',
      trafficLights: {
        hover: 'Show on hover (recommended)',
        always: 'Always show',
        hidden: 'Always hide'
      },
      reduceMotion: 'Reduce motion',
      reduceMotionDesc: 'Tone down interface animations for fewer distractions during interviews.',
      motion: {
        system: 'Follow system',
        reduce: 'Always reduce',
        full: 'Always full'
      },
      answerFontSize: 'Answer Font Size',
      answerFontSizeDesc: 'Adjust the text size of the solution output for readability.'
    },
    storage: {
      title: 'Storage',
      desc: 'Control whether screenshots are saved locally.',
      autoSave: 'Save Screenshots Locally',
      autoSaveDesc: 'When enabled, every screenshot is saved to the chosen directory.',
      saveDir: 'Save Directory',
      saveDirDesc: 'The picker dialog may be hidden behind the always-on-top window.',
      selectDir: 'Click to choose a directory',
      defaultDir: 'Default: Pictures/Penumbra',
      screenshotDisplay: 'Screenshot display',
      screenshotDisplayDesc: 'With multiple monitors, choose which screen to capture.',
      screenshotDisplayPrimary: 'Primary display'
    },
    shortcuts: {
      title: 'Shortcuts',
      desc: 'Global shortcuts only work on the main interface.',
      resetDefaults: 'Reset Default Shortcuts',
      resetSuccess: 'Shortcuts reset to defaults',
      recording: 'Press the new shortcut...',
      conflict: 'That shortcut is already in use, pick another',
      failed: 'Registration failed (may conflict with a system shortcut)'
    },
    memory: {
      title: 'Personal Memory',
      desc: 'Add your background; it is used as context to tailor the solutions to you.',
      label: 'Background',
      placeholder:
        'e.g. 3 years of backend experience, mainly Go and distributed systems, preparing for a backend interview…',
      importFile: 'Import File',
      clear: 'Clear',
      imported: 'Material imported',
      importEmpty:
        'No text could be extracted from the file (a scanned PDF may have no text layer)',
      hint: 'Supports importing .txt / .md / .pdf files (stored locally only, never uploaded to third parties).',
      profiles: 'Profiles',
      addProfile: 'New profile',
      deleteProfile: 'Delete profile',
      newProfileName: 'New profile',
      unnamedProfile: 'Unnamed',
      profileNamePlaceholder: 'Profile name, e.g. "Backend roles"',
      fieldTargetRole: 'Target role',
      fieldTargetRolePlaceholder: 'e.g. Backend Engineer at ByteDance',
      fieldTechStack: 'Tech stack',
      fieldTechStackPlaceholder: 'e.g. Go, Kubernetes, PostgreSQL, gRPC',
      fieldProjects: 'Projects',
      fieldProjectsPlaceholder: 'Key projects and outcomes you want the interviewer to know',
      fieldHighlights: 'Highlights to emphasize',
      fieldHighlightsPlaceholder: 'e.g. led a system at millions of QPS, open-source work',
      fieldAvoid: 'Prefer to avoid',
      fieldAvoidPlaceholder: 'Topics or experiences you would rather not be probed on',
      fieldFreeform: 'Other notes',
      fieldFreeformPlaceholder: 'Any other free-form background',
      preview: 'Effective content',
      previewDesc: 'This is the exact text appended to the AI prompt (from the active profile).',
      previewEmpty: '(The active profile is empty — fill the fields above to see it here)'
    },
    projectKnowledge: {
      title: 'Project Knowledge',
      desc: 'Ground answers in code you actually built and wording you explicitly approved.',
      sourcesTitle: 'Local repositories',
      sourcesDesc:
        'Index source, tests, and docs; retrieve only snippets relevant to the current question.',
      import: 'Add repository',
      loading: 'Loading project knowledge…',
      emptyProjects:
        'No project added yet. Select a local repository to ground project answers in real implementation details.',
      projectStats: '{{files}} files · {{chunks}} snippets',
      sourceGraphStats: '{{symbols}} symbols · {{relations}} source relationships mapped',
      updatedAt: 'Updated {{time}}',
      reindex: 'Reindex',
      remove: 'Remove',
      importSuccess: 'Project indexed',
      reindexSuccess: 'Project index updated',
      removeSuccess: 'Project index removed',
      actionFailed: 'Action failed: {{error}}',
      policiesTitle: 'Approved answer wording',
      policiesDesc:
        'Wording you approved from live assistance. Similar questions reuse it to stay consistent.',
      emptyPolicies:
        'No wording approved yet. On a useful live answer, choose “Use this wording next time”.',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      saved: 'Answer wording saved',
      deleted: 'Answer wording deleted',
      required: 'Question and answer are both required',
      removeConfirm: 'This removes only the local index, not your source code. Continue?',
      deletePolicyConfirm: 'Similar questions will stop using this wording. Continue?',
      materials: {
        title: 'Résumé, chats, and project materials',
        desc: 'Chunk and label files as résumé context, user voice, project facts, or references; retrieve only relevant passages.',
        import: 'Add material',
        imported: 'Material indexed',
        reindexed: 'Material index updated',
        removed: 'Material index removed',
        removeConfirm: 'This removes only the local index, not the original file. Continue?',
        stats: '{{chunks}} snippets · updated {{time}}',
        empty: 'Add PDF, Markdown, TXT, or JSON résumés, chat exports, and project documents.'
      },
      external: {
        title: 'External Knowledge API',
        desc: 'Connect an existing knowledge base and declare whether it contains project facts, résumé context, user voice, or reference designs.',
        add: 'Connect API',
        name: 'Source name',
        namePlaceholder: 'e.g. Project documentation',
        role: 'Evidence role',
        endpoint: 'Retrieval endpoint',
        protocol: 'API protocol',
        auth: 'Authentication',
        apiKey: 'API Key',
        keyPlaceholder: 'Enter the knowledge API key',
        keyKeepPlaceholder: 'Leave blank to keep the saved key',
        headerName: 'Authentication header',
        namespace: 'Space / project ID',
        namespacePlaceholder: 'Optional',
        timeout: 'Live timeout (ms)',
        advanced: 'Advanced field mapping',
        queryField: 'Query field',
        limitField: 'Limit field',
        namespaceField: 'Namespace field',
        useInInterview: 'Use this source during interviews',
        save: 'Save source',
        required: 'Source name and endpoint are required',
        saved: 'Knowledge API saved',
        enabled: 'Knowledge source enabled',
        disabled: 'Knowledge source disabled',
        test: 'Test connection',
        testSuccess: 'Connected and received {{count}} evidence item(s)',
        testFailed: 'Connection failed: {{error}}',
        deleteConfirm: 'This also deletes the API key stored for this source. Continue?',
        deleted: 'Knowledge source and key deleted',
        empty: 'No external source yet. Connect Dify or a generic JSON retrieval API.',
        noKeyNeeded: 'No key required',
        keySaved: 'Key saved ····{{suffix}}',
        keyMissing: 'Key missing',
        lastTestOk: 'Passed {{time}} · {{count}} item(s)',
        lastTestFailed: 'Failed {{time}}',
        roles: {
          'project-fact': 'Project facts',
          'candidate-profile': 'Résumé context',
          'user-voice': 'User voice',
          reference: 'Reference design'
        },
        protocols: {
          'generic-json': 'Generic JSON retrieval',
          dify: 'Dify knowledge base'
        },
        authTypes: {
          none: 'No authentication',
          bearer: 'Bearer token',
          'x-api-key': 'X-API-Key',
          'custom-header': 'Custom header'
        }
      },
      privacyNote:
        'The index stays on this device. Only a few snippets relevant to the current question are sent to your configured answer model.'
    },
    privacy: {
      title: 'Privacy & Security',
      desc: 'Local config, permissions and platform display options.',
      note: 'Screenshots and audio are only sent to the model/ASR service you configure. Use your own API Key and clean up local screenshots regularly.',
      secretStorage: 'Secret Storage Status',
      secretCount:
        '{{count}}/2 keys configured. Keys are stored by the main process, not in renderer localStorage.',
      verifyNote:
        'Verify: DevTools → Application → Local Storage → interview-coder-settings, confirm no apiKey / dashscopeApiKey fields.',
      contentProtection: 'Screen-share stealth',
      contentProtectionDesc:
        'When on, the window is invisible to screen recording/capture/meeting share (the app’s core feature). Turn off temporarily if you can’t see the window after enabling.',
      contentProtectionWarn:
        'Screen-share stealth is on. If the window disappears, press ⌥0 to reset it.',
      stealthOn: 'Screen-share stealth on',
      stealthOff: 'Screen-share stealth off',
      hideDock: 'Hide Dock Icon',
      hideDockDesc:
        'When enabled, hides from the Dock and Cmd+Tab; use the shortcut beside it to restore the icon.',
      dockHidden: 'Dock icon hidden',
      dockShown: 'Dock icon shown'
    }
  },
  help: {
    title: 'Help Center',
    heroTitle: 'Getting Started & FAQ',
    practiceMode: 'Practice Mode',
    introTitle: 'Introduction',
    introBefore:
      'Welcome to Penumbra! For coding tests and interviews, it helps you capture the screen, analyze it and suggest solutions. Visit the project ',
    introAfter: ' for more help (stealth config, API Key, etc.).',
    feature1: 'Capture the screen via shortcut and generate solutions.',
    feature2:
      'The window auto-hides during screen sharing (invisible to others; some meeting apps may need configuration).',
    feature3:
      'The window stays on top, semi-transparent, and keeps your cursor in place so the underlying page never loses focus.',
    step1Title: '1. Start a conversation',
    step1Desc:
      'Capture a screenshot, type a question at the bottom, or start voice transcription to begin.',
    step2Title: '2. See results',
    step2Desc: 'Content streams as a conversation; copy, follow up, or revisit history any time.',
    asrTitle: 'Live Voice Interview (ASR)',
    asrDesc:
      'Transcribe the interviewer in real time, then start a conversation or get AI answer points in one click.',
    asrStep1Title: '1. Configure the voice service',
    asrStep1Desc:
      'In Settings → Voice & Interview Assistant, enter your DashScope API key and click "Test connection" to confirm it works.',
    asrStep2Title: '2. Start transcribing',
    asrStep2Desc:
      'Press the transcription shortcut to start. The first time, a screen-share prompt appears — be sure to check "Share system / tab audio", otherwise system sound is not captured.',
    asrStep3Title: '3. Tell speakers apart (dual source)',
    asrStep3Desc:
      'With dual source on, system audio is labeled "Interviewer" and the microphone is labeled "Me", making the dialogue easy to follow.',
    asrStep4Title: '4. Use AI assist',
    asrStep4Desc:
      'The buttons on the transcription bar let you "start a conversation / follow up" with the captured speech. With "Live AI assist" on, interviewer questions automatically generate answer points. The Interview Assistant panel shows the conversation timeline, AI points, and topic summary, and can export the interview record.',
    keyFeatures: 'Key Features:',
    quickStart: 'Quick Start',
    shortcutsTitle: 'Shortcuts',
    shortcutsDesc:
      'Shortcuts are the main way to operate the app; you can customize them in Settings.',
    faqTitle: 'FAQ',
    contactTitle: 'Contact Support',
    contactDesc: 'If you run into issues or have suggestions, reach us via:',
    contactGithubPrefix: 'Submit bug reports and feature requests on ',
    contactGithubSuffix: '',
    faq: {
      q1: 'How do I take a screenshot?',
      a1: 'Press {{key}} to capture the current screen; the screenshot shows up in the app automatically.',
      q2: 'What if the problem spans more than one screen?',
      a2: 'Press {{key}} to append another screenshot to the current conversation and generate a solution.',
      q3: 'Can others see the app while screen-sharing?',
      a3: 'The window auto-hides during screen sharing (invisible to others), but some meeting apps may need configuration. Test with your actual machine + meeting app before relying on it.',
      q4: 'Does the cursor change when hovering the window?',
      a4: 'There is a mouse-passthrough toggle. When on, the window ignores the mouse and you operate it via shortcuts; the toggle is {{key}}, and the current state shows at the bottom-right.',
      q5: 'What is voice transcription and how do I use it?',
      a5: 'It transcribes the interviewer or read-aloud problem in real time to help the AI. Configure the DashScope API Key in settings, then press {{key}} to start/pause; the transcript is attached automatically when you screenshot.',
      q6: 'Can I clear the transcript separately?',
      a6: 'Yes. Press {{key}} to clear the current transcript; cleared text is not sent to the AI, and screenshots also clear existing transcript.',
      q7: 'No audio / system sound is not captured — what do I do?',
      a7: 'When transcription starts, the OS shows a screen-share prompt — you must tick "Share system/tab audio", otherwise the other side is not captured. Also confirm a DashScope API key is set and "Test Connection" passes.',
      q8: 'How do I tell the interviewer and myself apart?',
      a8: 'Enable "Dual-source speaker separation" in settings: system audio is labeled interviewer and the microphone is labeled you, both in the transcript and in the context sent to the AI.',
      q9: 'Why do the AI answer points not appear automatically?',
      a9: 'Enable "Live AI Assist" in settings; it only auto-triggers when the interviewer\'s speech looks like a question. You can also tap "Ask AI" in the panel to generate manually.',
      q10: 'Can projects/skills I mention in the interview be saved to my profile automatically?',
      a10: 'Yes. Turn on "Distill memory from conversation" in Settings → Voice & Interview Assistant. The AI distills projects, tech stack, etc. you mention into candidates shown atop the voice panel; they\'re written to the active profile only after you confirm (per item or all) — never saved automatically.'
    }
  },
  update: {
    available: 'A new version is available',
    availableVersion: 'Version {{version}} is available',
    download: 'Download update',
    later: 'Later',
    downloading: 'Downloading… {{percent}}%',
    ready: 'Update ready',
    restart: 'Restart now',
    error: 'Update failed, please try again later'
  },
  shortcutCategory: {
    'Window Management': 'Window Management',
    'Screenshot & AI': 'Screenshot & AI',
    Navigation: 'Navigation',
    'Window Movement': 'Window Movement'
  },
  shortcut: {
    hideOrShowMainWindow: { label: 'Hide/Show Window' },
    resetWindow: {
      label: 'Reset Window',
      desc: 'Press when the window is invisible to force it centered, opaque and shown'
    },
    ignoreOrEnableMouse: {
      label: 'Mouse Passthrough',
      desc: 'When enabled, clicks pass through the window to whatever is behind it'
    },
    newConversation: {
      label: 'New Conversation',
      desc: 'Clear the current conversation and place the cursor in the composer'
    },
    focusComposer: {
      label: 'Focus Composer',
      desc: 'Reveal the window, disable mouse passthrough, and start typing'
    },
    toggleContentProtection: {
      label: 'Toggle Screen-Share Stealth',
      desc: 'One key to turn window invisibility for recording/sharing on or off'
    },
    toggleZeroUiMode: {
      label: 'Toggle 0 UI Plain Text',
      desc: 'Hide or restore all UI and show only AI replies as preformatted text'
    },
    toggleDockIcon: {
      label: 'Hide/Show Dock Icon',
      desc: 'Toggle whether Penumbra appears in the Dock and Cmd+Tab'
    },
    increaseOverallOpacity: {
      label: 'Increase Overall Opacity',
      desc: 'Make the whole window more opaque'
    },
    decreaseOverallOpacity: {
      label: 'Decrease Overall Opacity',
      desc: 'Make the whole window more transparent'
    },
    increaseWindowOpacity: {
      label: 'Increase Window Opacity',
      desc: 'Make the window background more opaque'
    },
    decreaseWindowOpacity: {
      label: 'Decrease Window Opacity',
      desc: 'Make the window background more transparent (text kept)'
    },
    increaseTextOpacity: { label: 'Increase Text Opacity', desc: 'Make content text clearer' },
    decreaseTextOpacity: {
      label: 'Decrease Text Opacity',
      desc: 'Make content text more transparent'
    },
    increaseIconOpacity: {
      label: 'Increase Icon Opacity',
      desc: 'Make buttons and status icons clearer'
    },
    decreaseIconOpacity: {
      label: 'Decrease Icon Opacity',
      desc: 'Make buttons and status icons more transparent'
    },
    takeScreenshot: {
      label: 'Screenshot',
      desc: 'Capture and generate a solution (starts a new conversation)'
    },
    appendScreenshot: {
      label: 'Append Screenshot',
      desc: 'Append a screenshot to the current conversation, useful for long problems'
    },
    stopSolutionStream: {
      label: 'Stop Generation',
      desc: 'Interrupt the solution currently being generated'
    },
    toggleTranscription: {
      label: 'Voice Transcription',
      desc: 'Start/pause real-time voice transcription'
    },
    clearTranscription: {
      label: 'Clear Transcript',
      desc: 'Clear transcribed text (not submitted to AI)'
    },
    copyLatestAnswer: {
      label: 'Copy Latest Answer Code',
      desc: "Copy the latest answer's code block (or full text if none) — hands-free paste during interviews"
    },
    pageUp: { label: 'Scroll Up' },
    pageDown: { label: 'Scroll Down' },
    moveMainWindowUp: { label: 'Move Window Up' },
    moveMainWindowDown: { label: 'Move Window Down' },
    moveMainWindowLeft: { label: 'Move Window Left' },
    moveMainWindowRight: { label: 'Move Window Right' }
  },
  history: {
    title: 'History',
    empty: 'No past conversations yet',
    delete: 'Delete',
    searchPlaceholder: 'Search sessions…'
  }
}

export default en
