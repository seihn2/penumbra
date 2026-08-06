import type { TranslationSchema } from './zh'

const ja: TranslationSchema = {
  header: {
    appName: 'Penumbra',
    practiceMode: '練習モード',
    settings: '設定',
    help: 'ヘルプ',
    controlCenter: 'コントロールセンター',
    close: '閉じる',
    back: '戻る',
    newConversation: '新しい会話',
    export: '会話をエクスポート',
    exported: '会話をエクスポートしました',
    transcriptionOn: '文字起こし中',
    transcriptionOff: '文字起こしオフ',
    transcriptionStartHint: '{{key}} で文字起こしを開始',
    transcriptionStopHint: '{{key}} で文字起こしを停止'
  },
  workbench: {
    title: '問題分析ワークベンチ',
    titleGeneral: 'AI アシスタント',
    recommended: 'おすすめ',
    statusAnswerReady: '解答完了',
    statusContextCaptured: 'コンテキスト取得済み',
    statusWaiting: 'スクショ待機中',
    screenshotTimeline: 'スクリーンショット履歴',
    solutionOutput: '解答出力',
    chars: '{{count}} 文字',
    empty: '空',
    copy: 'コピー',
    copied: 'クリップボードにコピーしました',
    copyCodeOnly: 'コードのみコピー',
    copiedCode: 'コードをコピーしました',
    copyLatestDone: '最新の回答コードをコピーしました',
    copyLatestEmpty: 'コピーできる回答がまだありません',
    copyLatestFailed: 'コピーに失敗しました。再試行してください',
    screenshotArchived: 'スクリーンショット（履歴に画像は保存されません）',
    emptyAnswerTitle: '問題のコンテキスト待ち',
    emptyAnswerDesc: '問題領域をキャプチャすると、解答・計算量・エッジケースがここに表示されます。',
    noScreenshotTitle: 'まだスクリーンショットがありません',
    noScreenshotDesc: 'ショートカットを押して画面をキャプチャしてください',
    startTitle: '会話を始める',
    startDesc: 'スクリーンショット、下の入力、または音声転写から会話を開始できます。',
    startScreenshotHint: 'このショートカットでスクリーンショットを撮影',
    errorTitle: 'API リクエスト失敗',
    errorHint: 'モデルサービス設定やネットワーク接続を確認するか、後でやり直してください。',
    retry: '再試行',
    openScreenSettings: '画面収録の設定を開く',
    sendFailed: '送信に失敗しました。API Key を設定し、メイン画面で操作してください'
  },
  statusBar: {
    generating: '生成中...',
    stopGeneration: '停止',
    appendScreenshot: 'スクショ追加',
    newConversation: '新しい会話',
    askFollowUp: '追加質問',
    disableMousePassthrough: 'マウススルー解除'
  },
  followUp: {
    placeholder: '追加質問を入力し、Ctrl+Enter で送信...',
    composerPlaceholder: '追加質問を入力、Enter で送信、Shift+Enter で改行',
    startPlaceholder: '質問を入力して開始、またはショートカットでスクショ…',
    cancel: 'キャンセル',
    submit: '送信',
    imeWarning:
      '⚠️ 入力メソッドの変換候補ウィンドウはステルス保護の対象外で、画面録画に映る可能性があります。貼り付けか英語入力を推奨します。'
  },
  prerequisites: {
    welcome: 'Penumbra へようこそ',
    intro: 'まず LLM プロバイダーを設定してください。例えば',
    siliconflow: 'SiliconFlow',
    introMid: 'または',
    introEnd: 'など。',
    apiBaseUrl: 'API Base URL',
    apiBaseUrlHelper: 'SiliconFlow など代理プロバイダーの API Base URL',
    apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'API Key を入力',
    start: '開始する',
    moreSettings: '詳細設定'
  },
  selfCheck: {
    title: '面接前チェック',
    intro:
      'AIの画像認識＋ストリーミング、スクリーンショット、音声、ショートカット、ネットワークをワンクリックで確認。',
    run: 'チェック開始',
    rerun: '再チェック',
    running: 'チェック中…',
    blocking: '優先対応：{{item}}',
    checks: {
      ai: 'AI画像認識＋ストリーミング',
      network: 'ネットワーク応答速度',
      screenshot: 'スクリーンショット権限と結果',
      asr: '音声認識の接続',
      shortcuts: '主要ショートカットの登録',
      dependencies: '機能の依存関係'
    },
    status: {
      pass: '正常',
      warn: '注意',
      fail: '失敗',
      skip: '未設定'
    },
    readiness: {
      ready: '準備完了 — 面接を開始できます',
      degraded: '一部機能制限あり',
      unusable: '使用不可 — ブロック項目を先に解決してください'
    }
  },
  soak: {
    title: '品質ベンチマーク',
    intro:
      '長時間セッション中にメモリ・接続・文字起こしの健全性を定期サンプリングし、合格 / 劣化 / 失敗を評価します。',
    start: 'サンプリング開始',
    stop: 'サンプリング停止',
    refresh: 'レポート更新',
    sampling: 'サンプリング中',
    samples: 'サンプル {{count}} 件',
    verdict: {
      pass: '合格',
      degraded: '劣化',
      fail: '失敗'
    }
  },
  egress: {
    title: 'データ送信',
    note: '送信先ドメインとデータ種別のみ記録し、本文内容は含みません。'
  },
  provenance: {
    analyze: '信頼度分析',
    title: '回答の信頼度分析',
    analyzing: '論拠の出所を分析中…',
    empty: '論断を解析できませんでした。後でもう一度お試しください。',
    kind: {
      'problem-text': '問題文',
      'user-constraint': 'ユーザー確認済み制約',
      'known-fact': '既知の事実',
      assumption: 'モデルの仮定',
      'ai-inference': 'モデルの推論',
      unconfirmed: '未確認'
    }
  },
  blocks: {
    open: 'セクション単位でコピー',
    title: 'セクション単位でコピー',
    preamble: '冒頭'
  },
  revisionDiff: {
    open: '前の版と比較',
    title: '前の回答との差分',
    unchanged: '変更なし',
    changed: '変更あり',
    added: '追加',
    removed: '削除',
    empty: '2つの回答は同一です'
  },
  blockType: {
    'question-summary': '問題概要',
    clarifications: '前提の確認',
    'core-conclusion': '結論',
    plan: '方針',
    code: 'コード',
    complexity: '計算量',
    tests: 'テスト',
    risks: 'リスク',
    'spoken-version': '口頭版'
  },
  questionType: {
    coding: 'コーディング',
    'system-design': 'システム設計',
    sql: 'SQL',
    behavioral: '行動面接',
    debugging: 'デバッグ'
  },
  scaffold: {
    title: '回答フレーム',
    optional: '任意',
    coding: {
      clarify: '入出力と制約を確認',
      examples: '具体例をたどる',
      'brute-force': 'まず素朴な解法',
      optimize: '目標計算量まで最適化',
      complexity: '時間・空間計算量を述べる',
      code: 'コードを書く',
      tests: '境界とテストを追加'
    },
    'system-design': {
      requirements: '機能・非機能要件を整理',
      scale: '規模を見積もる（QPS/ストレージ）',
      api: '主要APIを定義',
      'high-level': '全体アーキテクチャを描く',
      'data-model': 'データモデルを設計',
      bottlenecks: 'ボトルネックと拡張点を特定',
      tradeoffs: 'トレードオフを検討'
    },
    sql: {
      schema: 'テーブル構造を確認',
      'target-columns': '取得する列を明確化',
      joins: '結合を決める',
      'filter-aggregate': '絞り込みと集計',
      'edge-cases': 'NULL/重複などの境界処理',
      verify: '結果を検証'
    },
    behavioral: {
      situation: '状況（Situation）',
      task: '課題（Task）',
      action: '行動（Action）',
      result: '結果（Result）',
      reflection: '振り返りと学び'
    },
    debugging: {
      reproduce: '安定して再現',
      narrow: '範囲を絞る',
      hypothesis: '仮説を立てる',
      verify: '仮説を検証',
      fix: '修正する',
      prevent: '再発を防ぐ'
    }
  },
  brief: {
    title: '面接ブリーフ',
    intro:
      '求人要件を貼り付けると、プロフィールと組み合わせて今回の面接の重点・話すプロジェクト・逆質問を生成します。',
    noProfile:
      'プロフィール未入力です。設定 → メモリで技術スタックとプロジェクトを追加すると精度が上がります。',
    jobTitle: '職種',
    company: '会社',
    mustHave: '必須要件',
    niceToHave: '歓迎要件',
    keywords: 'キーワード',
    listHint: 'カンマまたは改行区切り',
    generate: 'ブリーフ生成',
    emptyRight: '要件を入力して生成してください',
    focusAreas: '重点マッチ',
    projectsToTell: '話すべきプロジェクト',
    keyMetrics: '主要な数値',
    deepDives: '掘り下げ可能な技術',
    likelyFollowUps: '想定される追問',
    behavioral: '行動面接の素材',
    questionsToAsk: '逆質問',
    risks: 'リスクと弱点'
  },
  mock: {
    title: '模擬面接',
    intro:
      'モード・方向・難易度を選ぶと、AI 面接官が連続で質問・深掘りします。練習モードでは採点と助言を表示します。',
    mode: 'モード',
    modePractice: '練習（採点表示）',
    modeFormal: '本番（採点非表示）',
    track: '方向',
    track_behavioral: '行動面接',
    'track_system-design': 'システム設計',
    track_coding: 'コーディング',
    difficulty: '難易度',
    diff_easy: '易しい',
    diff_medium: '普通',
    diff_hard: '難しい',
    start: '模擬面接を開始',
    reset: 'やり直す',
    qIndex: '第 {{n}} 問',
    thinking: 'AI 面接官が考え中…',
    answerPlaceholder: 'ここに回答を入力…',
    submit: '送信して次へ',
    score: 'スコア {{total}}/5',
    scoreHidden: '本番モードでは採点を表示しません'
  },
  coach: {
    title: 'リアルタイム面接アシスタント',
    subtitle: 'リアルタイム文字起こし · AI 回答ポイント',
    recording: '録音中…',
    speaker: '話者',
    language: '言語',
    confidence: '信頼度',
    speakingShare: '発言の割合',
    lowShareHint: 'あなたの発言が少なめです。考えを広げ、積極的に説明しましょう',
    liveTranscript: 'リアルタイム会話',
    waitingVoice: '音声入力待ち...',
    liveTranslation: 'AI リアルタイム翻訳',
    translateTo: '{{lang}} へ',
    suggestions: '回答の提案',
    aiAssist: 'AI リアルタイム支援',
    askAi: 'AI に相談',
    aiAssistLoading: '回答ポイントを生成中…',
    aiAssistEmpty: '面接官の質問後に自動で回答ポイントを表示します。「AI に相談」も可能です。',
    topicSummary: 'トピック要約',
    exportTranscript: '面接記録をエクスポート',
    exported: '面接記録をエクスポートしました',
    dragHint: 'ドラッグして移動',
    collapse: '折りたたむ',
    expand: '展開',
    resizeHint: 'ドラッグでパネル幅を調整',
    speakerInterviewer: '面接官',
    speakerCandidate: '候補者',
    speakerUnknown: '不明',
    copyPoints: 'ポイントをコピー',
    pointsCopied: 'コピーしました',
    prevPoint: '前へ',
    nextPoint: '次へ',
    pointIndex: '{{current}}/{{total}} 件目',
    clearSession: '記録をクリア',
    memoryFound: 'プロフィールに追加できる情報が {{count}} 件見つかりました',
    memorySaveAll: 'すべて保存',
    memorySaveOne: 'プロフィールに保存',
    memoryDismiss: '無視',
    memorySaved: '{{count}} 件を個人メモリに保存しました',
    tab: {
      now: '現在',
      transcript: '原文',
      history: '履歴',
      later: '後で'
    },
    phase: {
      idle: '待機中',
      listening: '面接官の発言を聞いています',
      preparing: '質問を受信、準備中',
      ready: '回答ポイント準備完了',
      recordingAnswer: 'あなたの回答を記録中',
      audioInterrupted: '音声が中断、対応が必要'
    },
    debrief: {
      open: '面接の振り返り',
      title: '面接の振り返り',
      close: '閉じる',
      duration: '所要時間',
      questions: '質問数',
      answerRate: '完答率',
      unanswered: '答えきれなかった質問',
      improvements: '改善ポイント',
      plan: '次の練習',
      empty: 'このセッションにはまだ振り返れる質疑がありません'
    }
  },
  transcription: {
    waitingVoice: '音声入力待ち...',
    noKey: '先に設定で百錬プラットフォームの API Key を設定してください',
    starting: '音声転写を開始しています…',
    sourceSystem: 'システム音声',
    sourceMic: 'マイク',
    sysAudioMacHint:
      'macOS ではシステム音声(面接官)を直接取得できません。BlackHole 仮想デバイスを導入し設定で選択してください',
    sysAudioPermission:
      'システム音声が拒否されました：「システム設定 → プライバシーとセキュリティ → 画面収録」で Penumbra を許可し、アプリを完全に終了して再起動してください（BlackHole 不要）',
    partialStart: '一部の音源の開始に失敗しました。利用可能な音源で転写を開始しました',
    audioAllLost: 'すべての音源が切断されました。権限またはデバイスを確認してください',
    audioSourceLost: '{{source}}が切断されました。他の音源で転写を継続しています',
    diagChunks: '{{count}} 個の音声チャンクを受信(数字が増えていれば音声を取得中)',
    startBtn: '音声転写を開始',
    stopBtn: '転写を停止',
    restart: '音声転写を再開',
    startFailed: '音声転写の開始に失敗しました。システム音声の権限を確認してください',
    noAudioTrack:
      '音声が取得できませんでした。共有時に「システム音声/タブ音声を共有」を有効にしてください',
    askWithThis: 'この転写で追加質問',
    startWithThis: 'この音声で会話を開始',
    askNoConversation: '先にスクリーンショットで会話を開始してください',
    asked: '転写内容で追加質問しました',
    copyText: '転写をコピー',
    textCopied: 'コピーしました',
    errDisconnected: '音声認識の接続が切断されました。もう一度お試しください',
    errTranslate: 'リアルタイム翻訳に失敗しました。しばらくしてからお試しください',
    errTimeout: '音声認識の接続がタイムアウトしました。ネットワークを確認してください',
    errAuth: '音声認識キーが無効または期限切れです。設定で DashScope API キーを確認してください',
    errQuota: '音声認識の残高不足または未払いです。百錬コンソールで残高を確認してください'
  },
  settings: {
    title: '設定',
    heroTitle: 'モデル・音声・ワークフローを設定',
    localOnly: 'ローカルのみ',
    connError: {
      timeout: '接続がタイムアウトしました。ネットワークまたは Base URL を確認してください',
      auth: 'API Key が無効または未認可です',
      forbidden: 'アクセスが拒否されました（403）',
      notFound: 'エンドポイントが見つかりません。Base URL を確認してください',
      network: 'ネットワーク接続に失敗しました。ネットワークまたは Base URL を確認してください',
      quota: '残高不足または未払いです。アカウント残高を確認してください',
      unknown: '不明なエラー'
    },
    model: {
      title: 'モデルサービス',
      desc: 'OpenAI 互換のモデルサービスを設定し、解答・追加質問・翻訳に使用します。',
      baseUrlDesc:
        '例: https://api.siliconflow.cn/v1。空欄の場合は OpenAI 互換のデフォルトを使用。',
      baseUrlPlaceholder: '空欄可、デフォルトは OpenAI API',
      presetPlaceholder: 'プロバイダーを選択',
      apiKeyPlaceholder: 'API Key を入力',
      modelLabel: '回答モデル',
      modelDesc:
        'まずこのプロバイダーの定番モデルを表示します。Key 入力後、アカウントで利用可能なモデルを自動取得します。画像問題には「画像対応」を選んでください。',
      selectModel: 'モデルを選択...',
      searchOrCreate: '入力して検索または作成...',
      noResult: '結果がありません',
      create: '「{{name}}」を作成',
      customTag: 'カスタム',
      recommendedTag: 'おすすめ',
      visionTag: '画像対応',
      textOnlyTag: 'テキストのみ',
      commonGroup: 'このプロバイダーの定番',
      accountGroup: 'この Key で利用可能',
      customGroup: '手動追加',
      deleteCustom: 'カスタムモデルを削除',
      testConnection: '接続テスト',
      testConnectionDesc: '現在の設定で最小リクエストを送り、モデルが使えるか確認します。',
      testOk: 'モデルに接続できました',
      testFail: '接続に失敗しました：{{error}}',
      refresh: 'アカウントモデルを再取得',
      fetching: 'この Key で利用可能なモデルを取得中…',
      fetched: 'アカウントから {{count}} 個のモデルを取得しました。',
      fetchHint: 'Key を入力するとアカウントモデルを自動取得します。',
      fetchAutoFailed: '自動取得できませんでした。更新ボタンで再試行できます。',
      catalogUpdated: '定番リスト更新日: {{date}}。',
      fetchOk: '{{count}} 個のアカウントモデルを取得しました',
      fetchFail: 'モデルの取得に失敗しました：{{error}}'
    },
    voice: {
      title: '音声と面接アシスタント',
      desc: 'リアルタイム ASR、デュアルソース話者分離、段階認識、回答提案。',
      dashscopeKey: 'DashScope API Key',
      dashscopeKeyDesc: 'Alibaba Cloud Model Studio のリアルタイム音声認識に使用。',
      dashscopeKeyPlaceholder: 'DashScope API Key を入力',
      asrModel: '音声認識モデル',
      asrModelDesc:
        'Qwen-Audio 3.0 を推奨します。Qwen3 ASR は別の Realtime プロトコルを使用し、アプリが自動で切り替えます。',
      asrModelDefault: '推奨',
      asrModelWarn:
        'このモデルは互換性のために残されています。新規設定では Qwen-Audio 3.0 を推奨します。',
      micDevice: '音声入力デバイス',
      micDeviceDesc:
        'どのマイクで取り込むか選択します。面接官の音声(システム音声)を文字起こしするには、BlackHole などの仮想デバイスを導入してここで選択します。',
      micDeviceDefault: 'システム既定のマイク',
      micDeviceRefresh: 'デバイス一覧を更新',
      testConnection: '接続テスト',
      testConnectionDesc: '現在の Key とモデルでハンドシェイクし、音声認識が使えるか確認します。',
      testOk: '音声認識に接続できました',
      testFail: '接続に失敗しました：{{error}}',
      coachEnabled: '面接練習アシスタント',
      coachEnabledDesc:
        'リアルタイム文字起こしから話者と面接段階を判断し、構造化された回答提案を行います。',
      realtimeAssist: 'AI リアルタイム支援',
      realtimeAssistDesc:
        '面接官の質問後に自動で AI を呼び出し回答ポイントを生成します（トークン消費が多め。オフにでき、「AI に相談」で手動実行も可）。',
      proactiveAssist: '能動的リアルタイム支援',
      proactiveAssistDesc:
        '質問やキー操作なしで、約20秒ごとに会話の流れに応じて先回りで提示します：あなたの履歴書の項目、関連する SOTA 技術、回答ポイント、逆質問の候補（トークン消費が最も多め。練習時の利用がおすすめ）。',
      memoryDistill: '会話から記憶を自動抽出',
      memoryDistillDesc:
        '面接中、AI があなたの話したプロジェクト/スキルに注目し、定期的にプロフィールへの追加候補として抽出します。保存前に確認が必要で、自動では書き込みません。',
      assistDebounce: '支援トリガー遅延',
      assistDebounceDesc:
        '面接官が話し終えてから AI 支援を起動するまでの待機時間。短くすると速く、長くするとトークンを節約できます。',
      dualSource: 'デュアルソース話者分離',
      dualSourceDesc:
        'システム音声を面接官、マイクを候補者としてタグ付けします。macOS では初回起動時に画面収録の許可を求められます。「システム設定 → プライバシーとセキュリティ → 画面収録」で本アプリを有効にし、完全に終了して再起動してください（BlackHole は不要）。それでも面接官の声を拾えない場合は BlackHole 仮想デバイスを導入し、上で選択してください。',
      transcriptionLang: '文字起こし言語',
      transcriptionLangDesc:
        '言語を指定すると認識精度が向上します。中国語と英語が混在する面接ではバイリンガル設定を選択できます。',
      autoDetect: '自動検出',
      bilingualZhEn: '中国語 + 英語',
      diarizationMode: '話者分離モード',
      diarizationModeDesc:
        'デュアルソースは音源タグを直接使用。provider モードは将来の diarization ASR 用です。',
      heuristic: 'ヒューリスティック',
      providerLabel: 'ASR Provider タグ'
    },
    strategy: {
      title: '翻訳と回答戦略',
      appMode: '使用モード',
      appModeDesc:
        'アルゴリズムモードはコード+計算量+境界を提示。汎用モードはコード形式を強制せず何でも回答します。',
      modeAlgorithm: 'アルゴリズムモード',
      modeGeneral: '汎用モード',
      desc: 'AI リアルタイム翻訳と解答プロンプトを制御します。',
      translation: 'AI リアルタイム翻訳',
      translationDesc: '各文の文字起こし完了後、現在の AI モデルで翻訳します。',
      translationTargetLang: '翻訳先言語',
      translationTargetLangDesc: 'モデルサービスの API Key とモデルを使用します。',
      customPrompt: 'カスタムプロンプト',
      customPromptDesc: '有効にするとデフォルトの解答プロンプトを上書きします。',
      customPromptPlaceholder: 'カスタムプロンプトを入力...',
      outputStyle: '出力スタイル',
      outputStyleDesc: 'AI 解答出力のスタイルプリセットを選択します。',
      presetDefault: '詳細解説',
      presetConcise: '簡潔',
      presetCodeOnly: 'コードのみ',
      presetInterview: '面接解説',
      codeLanguage: 'プログラミング言語',
      codeLanguageDesc: 'カスタムプロンプト有効時はこの項目は無効です。',
      langSelect: '言語を選択...',
      langSearch: '言語を検索または追加...',
      langNoResult: '言語が見つかりません',
      langCreate: '「{{name}}」を追加'
    },
    appearance: {
      title: '外観',
      desc: '全体・ウィンドウ背景・文字の不透明度を個別に制御します。',
      accentColor: 'アクセントカラー',
      accentColorDesc: 'UI のアクセント色をカスタマイズ。ボタン・強調・ヒントに反映されます。',
      accentColorCustom: 'カスタムカラー',
      accentLowContrast:
        'このアクセント色は暗い背景でのコントラストが低く（{{ratio}}:1）、読みにくい可能性があります',
      overallOpacity: '全体の不透明度',
      overallOpacityDesc: 'ウィンドウ全体（背景・文字・枠）をまとめて調整します。',
      windowOpacity: 'ウィンドウ不透明度',
      windowOpacityDesc: '背景／パネルのみ。完全透明時は文字がウィンドウ上に浮きます。',
      textOpacity: '文字の不透明度',
      textOpacityDesc: '文字のみ。背景には影響しません。',
      transparent: '透明',
      opaque: '不透明',
      uiLanguage: '表示言語',
      uiLanguageDesc: 'アプリの表示言語を切り替えます。',
      reduceMotion: 'モーションを減らす',
      reduceMotionDesc: '画面のアニメーションを抑え、面接中の気が散るのを減らします。',
      motion: {
        system: 'システムに従う',
        reduce: '常に減らす',
        full: '常にフル'
      },
      answerFontSize: '解答の文字サイズ',
      answerFontSizeDesc: '解答出力の文字サイズを調整し、面接時に見やすくします。'
    },
    storage: {
      title: 'ストレージ',
      desc: 'スクリーンショットをローカル保存するかを制御します。',
      autoSave: 'スクショをローカル保存',
      autoSaveDesc: '有効にすると、各スクリーンショットが指定フォルダに保存されます。',
      saveDir: '保存先',
      saveDirDesc: '選択ダイアログが最前面ウィンドウに隠れる場合があります。',
      selectDir: 'クリックして保存先を選択',
      defaultDir: 'デフォルト: ピクチャ/Penumbra',
      screenshotDisplay: 'スクリーンショットのディスプレイ',
      screenshotDisplayDesc: '複数のモニターがある場合、キャプチャする画面を選択します。',
      screenshotDisplayPrimary: 'メインディスプレイ'
    },
    shortcuts: {
      title: 'ショートカット',
      desc: 'グローバルショートカットはメイン画面でのみ有効です。',
      resetDefaults: 'デフォルトに戻す',
      resetSuccess: 'ショートカットをデフォルトに戻しました',
      recording: '新しいショートカットを押してください...',
      conflict: 'このショートカットは既に使用されています。別のものを選んでください',
      failed: '登録に失敗しました（システムのショートカットと競合の可能性）'
    },
    memory: {
      title: '個人メモ',
      desc: '背景情報を入力すると、解答時のコンテキストとして使われ、より適した回答になります。',
      label: '背景情報',
      placeholder: '例：バックエンド開発3年、主に Go と分散システム、バックエンド面接の準備中…',
      importFile: 'ファイルを取り込む',
      clear: 'クリア',
      imported: '資料を取り込みました',
      importEmpty:
        'ファイルからテキストを抽出できませんでした（スキャンした PDF にはテキスト層がない場合があります）',
      hint: '.txt / .md / .pdf ファイルの取り込みに対応（ローカル保存のみ、第三者へのアップロードなし）。',
      profiles: 'プロフィール',
      addProfile: '新規プロフィール',
      deleteProfile: 'プロフィールを削除',
      newProfileName: '新規プロフィール',
      unnamedProfile: '未命名',
      profileNamePlaceholder: 'プロフィール名（例：バックエンド志望）',
      fieldTargetRole: '志望ポジション',
      fieldTargetRolePlaceholder: '例：ByteDance バックエンドエンジニア',
      fieldTechStack: '技術スタック',
      fieldTechStackPlaceholder: '例：Go、Kubernetes、PostgreSQL、gRPC',
      fieldProjects: 'プロジェクト経験',
      fieldProjectsPlaceholder: '面接官に伝えたい主要プロジェクトと成果',
      fieldHighlights: '強調したい点',
      fieldHighlightsPlaceholder: '例：数百万 QPS のシステムを主導、OSS 貢献など',
      fieldAvoid: '触れてほしくない点',
      fieldAvoidPlaceholder: '深掘りされたくない分野や経歴',
      fieldFreeform: 'その他補足',
      fieldFreeformPlaceholder: 'その他の自由記述',
      preview: '現在の有効内容',
      previewDesc: 'これが AI プロンプトに実際に追加されるテキストです（現在のプロフィールから）。',
      previewEmpty: '（現在のプロフィールは空です。上の項目を入力するとここに表示されます）'
    },
    privacy: {
      title: 'プライバシーとセキュリティ',
      desc: 'ローカル設定、権限、表示オプション。',
      note: 'スクリーンショットと音声は、設定したモデル／ASR サービスにのみ送信されます。自分の API Key を使用し、ローカルのスクリーンショットを定期的に整理することをお勧めします。',
      secretStorage: 'シークレット保存状態',
      secretCount:
        '{{count}}/2 個のキーを設定済み。キーはメインプロセスが保存し、renderer の localStorage には書き込まれません。',
      verifyNote:
        'ローカル確認：DevTools → Application → Local Storage → interview-coder-settings で apiKey / dashscopeApiKey フィールドがないことを確認。',
      contentProtection: '画面共有ステルス',
      contentProtectionDesc:
        'オンにすると、録画/スクショ/会議共有にウィンドウが映りません(本アプリの中核機能)。有効化後にウィンドウが見えない場合は一時的にオフにしてください。',
      contentProtectionWarn:
        '画面共有ステルスをオンにしました。ウィンドウが消えた場合は ⌥0 でリセットできます。',
      stealthOn: '画面共有ステルスをオン',
      stealthOff: '画面共有ステルスをオフ',
      hideDock: 'Dock アイコンを隠す',
      hideDockDesc: '有効にすると Dock と Cmd+Tab に表示されず、ショートカットでのみ呼び出せます。'
    }
  },
  help: {
    title: 'ヘルプセンター',
    heroTitle: 'クイックスタートとよくある質問',
    practiceMode: '練習モード',
    introTitle: '概要',
    introBefore:
      'Penumbra へようこそ！コーディングテストや面接向けに、画面キャプチャ・解析・解答提案を支援します。詳細は ',
    introAfter: ' をご覧ください（ステルス設定や API Key など）。',
    feature1: 'ショートカットで画面をキャプチャし、解答を生成します。',
    feature2:
      '画面共有中はウィンドウが自動的に隠れます（相手には見えない。一部の会議アプリは設定が必要）。',
    feature3:
      'ウィンドウは半透明で最前面に固定され、カーソルは元の位置に留まるため元のページのフォーカスを奪いません。',
    step1Title: '1. 会話を始める',
    step1Desc: 'スクリーンショット、下部の入力、または音声転写から会話を開始できます。',
    step2Title: '2. 結果を見る',
    step2Desc: '内容は会話形式でリアルタイム表示。コピー・追加質問・履歴の確認ができます。',
    asrTitle: 'リアルタイム音声面接（ASR）',
    asrDesc:
      '面接官の発言をリアルタイムで文字起こしし、ワンクリックで会話の開始や AI 回答ポイントの取得ができます。',
    asrStep1Title: '1. 音声サービスを設定',
    asrStep1Desc:
      '「設定 → 音声と面接アシスタント」で DashScope（百錬）API キーを入力し、「接続テスト」で動作を確認します。',
    asrStep2Title: '2. 文字起こしを開始',
    asrStep2Desc:
      '文字起こしのショートカットで開始します。初回は画面共有の許可が表示されるので、「システム音声 / タブの音声を共有」を必ずチェックしてください。チェックしないとシステム音が取得できません。',
    asrStep3Title: '3. 話者を区別（デュアルソース）',
    asrStep3Desc:
      'デュアルソースを有効にすると、システム音声は「面接官」、マイクは「私」とラベル付けされ、会話を追いやすくなります。',
    asrStep4Title: '4. AI アシストを活用',
    asrStep4Desc:
      '文字起こしバー右側のボタンで、その音声から「会話を開始 / 追加質問」できます。「リアルタイム AI アシスト」を有効にすると、面接官の質問に対して回答ポイントが自動生成されます。面接アシスタントパネルでは会話タイムライン・AI ポイント・トピック要約を確認でき、面接記録をエクスポートできます。',
    keyFeatures: '主な機能：',
    quickStart: 'クイックスタート',
    shortcutsTitle: 'ショートカット',
    shortcutsDesc: 'ショートカットは主な操作方法です。設定でカスタマイズできます。',
    faqTitle: 'よくある質問',
    contactTitle: 'サポートに連絡',
    contactDesc: '問題や提案がある場合は、以下の方法でご連絡ください：',
    contactGithubPrefix: '',
    contactGithubSuffix: ' でバグ報告や機能リクエストを送信してください',
    faq: {
      q1: 'スクリーンショットの撮り方は？',
      a1: '{{key}} を押すと現在の画面をキャプチャでき、アプリに自動表示されます。',
      q2: '問題が1画面を超える場合は？',
      a2: '{{key}} を押すと現在の会話にスクショを追加し、解答を生成します。',
      q3: '画面共有中に相手にアプリが見えますか？',
      a3: '画面共有中はウィンドウが自動的に隠れます（相手には見えない）が、一部の会議アプリでは設定が必要な場合があります。本番前に実機＋会議アプリでテストしてください。',
      q4: 'ウィンドウにカーソルを重ねると変化しますか？',
      a4: 'マウススルーの切替があります。オンにするとウィンドウはマウスを無視し、ショートカットで操作します。切替は {{key}}、状態は右下に表示されます。',
      q5: '音声転写とは？使い方は？',
      a5: '面接官の音声や問題の読み上げをリアルタイムで文字化し AI を補助します。設定で DashScope API Key を構成し、{{key}} で開始/一時停止。転写はスクショ時に自動添付されます。',
      q6: '転写テキストだけ消せますか？',
      a6: 'はい。{{key}} で現在の転写を消去できます。消去後は AI に送信されず、スクショ時にも既存の転写が消去されます。',
      q7: '音声が入らない / システム音が拾えない場合は？',
      a7: '転写開始時に画面共有の許可ダイアログが出ます。「システム音声/タブ音声を共有」に必ずチェックしないと相手の声を拾えません。設定で DashScope API Key を入力し「接続テスト」が通ることも確認してください。',
      q8: '面接官と自分の発言はどう区別しますか？',
      a8: '設定で「デュアルソース話者分離」を有効にすると、システム音声は面接官、マイクは自分としてタグ付けされ、転写と AI へ送る文脈の両方に話者が付きます。',
      q9: 'AI の回答ポイントが自動で出ないのはなぜ？',
      a9: '設定で「AI リアルタイム支援」を有効にしてください。面接官の発言が質問のように見える場合のみ自動起動します。パネルの「AI に相談」で手動生成も可能です。',
      q10: '面接中に話したプロジェクト/スキルは自動でプロフィールに保存されますか？',
      a10: 'はい。設定→音声と面接アシスタントで「会話から記憶を自動抽出」を有効にすると、AI が話したプロジェクトや技術スタックなどを抽出し、音声パネル上部に候補として表示します。あなたが（個別または一括で）確認した後にのみ現在のプロフィールへ書き込まれ、自動保存は行いません。'
    }
  },
  update: {
    available: '新しいバージョンがあります',
    availableVersion: 'バージョン {{version}} が利用可能です',
    download: '更新をダウンロード',
    later: '後で',
    downloading: 'ダウンロード中… {{percent}}%',
    ready: '更新の準備ができました',
    restart: '今すぐ再起動',
    error: '更新に失敗しました。後でもう一度お試しください'
  },
  shortcutCategory: {
    'Window Management': 'ウィンドウ管理',
    'Screenshot & AI': 'スクリーンショットと AI',
    Navigation: 'ナビゲーション',
    'Window Movement': 'ウィンドウ移動'
  },
  shortcut: {
    hideOrShowMainWindow: { label: 'ウィンドウの表示/非表示' },
    resetWindow: {
      label: 'ウィンドウをリセット',
      desc: 'ウィンドウが見えないときに押すと、中央・不透明・表示の状態に戻します'
    },
    ignoreOrEnableMouse: {
      label: 'マウススルー',
      desc: '有効にすると、クリックがウィンドウを透過して背後の内容に届きます'
    },
    toggleContentProtection: {
      label: '画面共有ステルスの切替',
      desc: '録画・共有時のウィンドウ不可視をワンキーで切替'
    },
    increaseOverallOpacity: {
      label: '全体の不透明度を上げる',
      desc: 'ウィンドウ全体を不透明にします'
    },
    decreaseOverallOpacity: {
      label: '全体の不透明度を下げる',
      desc: 'ウィンドウ全体を透明にします'
    },
    increaseWindowOpacity: {
      label: 'ウィンドウ不透明度を上げる',
      desc: 'ウィンドウ背景を不透明にします'
    },
    decreaseWindowOpacity: {
      label: 'ウィンドウ不透明度を下げる',
      desc: 'ウィンドウ背景を透明にします（文字は保持）'
    },
    increaseTextOpacity: {
      label: '文字の不透明度を上げる',
      desc: 'コンテンツの文字を見やすくします'
    },
    decreaseTextOpacity: {
      label: '文字の不透明度を下げる',
      desc: 'コンテンツの文字を透明にします'
    },
    takeScreenshot: {
      label: 'スクリーンショット',
      desc: 'キャプチャして解答を生成（新しい会話を開始）'
    },
    appendScreenshot: {
      label: 'スクショ追加',
      desc: '現在の会話にスクリーンショットを追加。長い問題に便利です'
    },
    stopSolutionStream: { label: '生成を停止', desc: '生成中の解答を中断します' },
    toggleTranscription: { label: '音声転写', desc: 'リアルタイム音声転写の開始/一時停止' },
    clearTranscription: {
      label: '転写テキストを消去',
      desc: '転写テキストを消去（AI には送信されません）'
    },
    copyLatestAnswer: {
      label: '最新回答コードをコピー',
      desc: '最新回答のコードブロック（なければ全文）をコピー — 面接中マウス不要で貼り付け'
    },
    pageUp: { label: '上にスクロール' },
    pageDown: { label: '下にスクロール' },
    moveMainWindowUp: { label: 'ウィンドウを上に移動' },
    moveMainWindowDown: { label: 'ウィンドウを下に移動' },
    moveMainWindowLeft: { label: 'ウィンドウを左に移動' },
    moveMainWindowRight: { label: 'ウィンドウを右に移動' }
  },
  history: {
    title: '履歴',
    empty: '過去の会話はまだありません',
    delete: '削除',
    searchPlaceholder: 'セッションを検索…'
  }
}

export default ja
