import type { TranslationSchema } from './zh'

const ko: TranslationSchema = {
  header: {
    appName: 'Penumbra',
    practiceMode: '연습 모드',
    settings: '설정',
    help: '도움말',
    controlCenter: '제어 센터',
    close: '닫기',
    back: '뒤로',
    newConversation: '새 대화',
    export: '대화 내보내기',
    exported: '대화를 내보냈습니다',
    transcriptionOn: '전사 진행 중',
    transcriptionOff: '전사 꺼짐',
    transcriptionStartHint: '{{key}} 키로 전사 시작',
    transcriptionStopHint: '{{key}} 키로 전사 중지'
  },
  workbench: {
    title: '문제 분석 워크벤치',
    titleGeneral: 'AI 어시스턴트',
    recommended: '추천',
    statusAnswerReady: '답변 완료',
    statusContextCaptured: '컨텍스트 캡처됨',
    statusWaiting: '스크린샷 대기 중',
    screenshotTimeline: '스크린샷 타임라인',
    solutionOutput: '풀이 출력',
    chars: '{{count}}자',
    empty: '비어 있음',
    copy: '복사',
    copied: '클립보드에 복사되었습니다',
    copyCodeOnly: '코드만 복사',
    copiedCode: '코드를 복사했습니다',
    copyLatestDone: '최신 답변 코드를 복사했습니다',
    copyLatestEmpty: '복사할 답변이 아직 없습니다',
    copyLatestFailed: '복사 실패, 다시 시도하세요',
    screenshotArchived: '스크린샷 (기록에 이미지는 저장되지 않음)',
    emptyAnswerTitle: '문제 컨텍스트 대기 중',
    emptyAnswerDesc: '문제 영역을 캡처하면 답변, 복잡도, 엣지 케이스가 여기에 스트리밍됩니다.',
    noScreenshotTitle: '아직 스크린샷이 없습니다',
    noScreenshotDesc: '단축키를 눌러 화면을 캡처하여 분석하세요',
    startTitle: '대화 시작',
    startDesc: '스크린샷, 아래 입력, 또는 음성 전사로 대화를 시작할 수 있습니다.',
    startScreenshotHint: '이 단축키를 눌러 스크린샷 촬영',
    errorTitle: 'API 요청 실패',
    errorHint: '모델 서비스 설정과 네트워크 연결을 확인하거나 나중에 다시 시도하세요.',
    retry: '다시 시도',
    openScreenSettings: '화면 기록 설정 열기',
    sendFailed: '전송 실패 — API Key가 설정되어 있고 메인 화면인지 확인하세요'
  },
  statusBar: {
    generating: '생성 중...',
    stopGeneration: '중지',
    appendScreenshot: '스크린샷 추가',
    newConversation: '새 대화',
    askFollowUp: '추가 질문',
    disableMousePassthrough: '마우스 통과 해제'
  },
  followUp: {
    placeholder: '추가 질문을 입력하고 Ctrl+Enter 로 제출...',
    composerPlaceholder: '추가 질문 입력, Enter 로 전송, Shift+Enter 줄바꿈',
    startPlaceholder: '질문을 입력해 시작하거나 단축키로 캡처…',
    cancel: '취소',
    submit: '제출',
    imeWarning:
      '⚠️ 입력기 후보 창은 스텔스 보호 대상이 아니며 화면 녹화에 표시될 수 있습니다. 붙여넣기나 영어 입력을 권장합니다.'
  },
  prerequisites: {
    welcome: 'Penumbra에 오신 것을 환영합니다',
    intro: '먼저 LLM 제공자를 설정하세요. 예를 들어',
    siliconflow: 'SiliconFlow',
    introMid: '또는',
    introEnd: '등.',
    apiBaseUrl: 'API Base URL',
    apiBaseUrlHelper: 'SiliconFlow 등 프록시 제공자의 API Base URL',
    apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'API Key 입력',
    start: '시작하기',
    moreSettings: '추가 설정'
  },
  selfCheck: {
    title: '면접 전 점검',
    intro: 'AI 이미지 인식+스트리밍, 스크린샷, 음성, 단축키, 네트워크를 원클릭으로 점검합니다.',
    run: '점검 시작',
    rerun: '다시 점검',
    running: '점검 중…',
    blocking: '우선 해결: {{item}}',
    checks: {
      ai: 'AI 이미지 인식+스트리밍',
      network: '네트워크 응답 속도',
      screenshot: '스크린샷 권한 및 결과',
      asr: '음성 인식 연결',
      shortcuts: '주요 단축키 등록',
      dependencies: '기능 종속성'
    },
    status: {
      pass: '정상',
      warn: '주의',
      fail: '실패',
      skip: '미설정'
    },
    readiness: {
      ready: '준비 완료 — 면접을 시작할 수 있습니다',
      degraded: '일부 기능 제한',
      unusable: '사용 불가 — 차단 항목을 먼저 해결하세요'
    }
  },
  soak: {
    title: '품질 벤치마크',
    intro:
      '긴 세션 동안 메모리·연결·전사 상태를 주기적으로 샘플링하여 통과 / 저하 / 실패를 평가합니다.',
    start: '샘플링 시작',
    stop: '샘플링 중지',
    refresh: '보고서 새로고침',
    sampling: '샘플링 중',
    samples: '샘플 {{count}}개',
    verdict: {
      pass: '통과',
      degraded: '저하',
      fail: '실패'
    }
  },
  egress: {
    title: '데이터 전송',
    note: '전송 대상 도메인과 데이터 종류만 기록하며 본문 내용은 포함하지 않습니다.'
  },
  provenance: {
    analyze: '신뢰도 분석',
    title: '답변 신뢰도 분석',
    analyzing: '주장 출처를 분석 중…',
    empty: '주장을 파싱하지 못했습니다. 나중에 다시 시도하세요.',
    kind: {
      'problem-text': '문제 원문',
      'user-constraint': '사용자 확인 제약',
      'known-fact': '알려진 사실',
      assumption: '모델 가정',
      'ai-inference': '모델 추론',
      unconfirmed: '미확인'
    }
  },
  blocks: {
    open: '섹션별 복사',
    title: '섹션별 복사',
    preamble: '서두'
  },
  revisionDiff: {
    open: '이전 버전과 비교',
    title: '이전 답변과 비교',
    unchanged: '변경 없음',
    changed: '변경됨',
    added: '추가',
    removed: '삭제',
    empty: '두 답변이 동일합니다'
  },
  blockType: {
    'question-summary': '문제 요약',
    clarifications: '전제 확인',
    'core-conclusion': '핵심 결론',
    plan: '접근',
    code: '코드',
    complexity: '복잡도',
    tests: '테스트',
    risks: '리스크',
    'spoken-version': '구두 버전'
  },
  questionType: {
    coding: '코딩',
    'system-design': '시스템 설계',
    sql: 'SQL',
    behavioral: '인성 면접',
    debugging: '디버깅'
  },
  scaffold: {
    title: '답변 프레임',
    optional: '선택',
    coding: {
      clarify: '입출력과 제약 확인',
      examples: '구체적 예시 따라가기',
      'brute-force': '우선 무차별 해법',
      optimize: '목표 복잡도까지 최적화',
      complexity: '시간/공간 복잡도 설명',
      code: '코드 작성',
      tests: '경계와 테스트 추가'
    },
    'system-design': {
      requirements: '기능/비기능 요구사항 정리',
      scale: '규모 추정 (QPS/스토리지)',
      api: '핵심 API 정의',
      'high-level': '고수준 아키텍처 스케치',
      'data-model': '데이터 모델 설계',
      bottlenecks: '병목과 확장 지점 파악',
      tradeoffs: '트레이드오프 논의'
    },
    sql: {
      schema: '테이블 구조 확인',
      'target-columns': '반환할 열 명확화',
      joins: '조인 결정',
      'filter-aggregate': '필터링과 집계',
      'edge-cases': 'NULL/중복 등 경계 처리',
      verify: '결과 검증'
    },
    behavioral: {
      situation: '상황(Situation)',
      task: '과제(Task)',
      action: '행동(Action)',
      result: '결과(Result)',
      reflection: '회고와 배움'
    },
    debugging: {
      reproduce: '안정적으로 재현',
      narrow: '범위 좁히기',
      hypothesis: '가설 수립',
      verify: '가설 검증',
      fix: '수정',
      prevent: '재발 방지'
    }
  },
  brief: {
    title: '기회 브리프',
    intro:
      '채용 요건을 붙여넣으면 프로필과 결합해 이번 면접의 핵심, 말할 프로젝트, 역질문을 생성합니다.',
    noProfile:
      '프로필이 없습니다. 설정 → 메모리에서 기술 스택과 프로젝트를 추가하면 더 정확해집니다.',
    jobTitle: '직무',
    company: '회사',
    mustHave: '필수 요건',
    niceToHave: '우대 사항',
    keywords: '키워드',
    listHint: '쉼표 또는 줄바꿈 구분',
    generate: '브리프 생성',
    emptyRight: '요건을 입력한 뒤 생성하세요',
    focusAreas: '핵심 매칭',
    projectsToTell: '말할 프로젝트',
    keyMetrics: '핵심 지표',
    deepDives: '깊이 있게 다룰 기술',
    likelyFollowUps: '예상 추가 질문',
    behavioral: '인성 면접 소재',
    questionsToAsk: '역질문',
    risks: '리스크와 약점'
  },
  mock: {
    title: '모의 면접',
    intro:
      '모드·방향·난이도를 선택하면 AI 면접관이 연속으로 질문하고 파고듭니다. 연습 모드는 점수와 피드백을 보여줍니다.',
    mode: '모드',
    modePractice: '연습(점수 표시)',
    modeFormal: '실전(점수 숨김)',
    track: '방향',
    track_behavioral: '인성 면접',
    'track_system-design': '시스템 설계',
    track_coding: '코딩',
    difficulty: '난이도',
    diff_easy: '쉬움',
    diff_medium: '보통',
    diff_hard: '어려움',
    start: '모의 면접 시작',
    reset: '다시 시작',
    qIndex: '{{n}}번 문제',
    thinking: 'AI 면접관이 생각 중…',
    answerPlaceholder: '여기에 답변을 입력하세요…',
    submit: '제출하고 계속',
    score: '점수 {{total}}/5',
    scoreHidden: '실전 모드에서는 점수를 표시하지 않습니다'
  },
  coach: {
    title: '실시간 면접 어시스턴트',
    subtitle: '실시간 받아쓰기 · AI 답변 포인트',
    recording: '녹음 중…',
    speaker: '화자',
    language: '언어',
    confidence: '신뢰도',
    speakingShare: '발언 비율',
    lowShareHint: '발언이 다소 적습니다. 생각을 더 펼치고 적극적으로 설명해 보세요',
    liveTranscript: '실시간 대화',
    waitingVoice: '음성 입력 대기 중...',
    liveTranslation: 'AI 실시간 번역',
    translateTo: '{{lang}}(으)로',
    suggestions: '답변 제안',
    aiAssist: 'AI 실시간 지원',
    askAi: 'AI에 도움 요청',
    detectedQuestion: '감지한 새 질문',
    detectedQuestionWaiting: '이 질문의 답변 포인트를 준비하는 중…',
    aiAssistLoading: '답변 포인트 생성 중…',
    aiAssistEmpty:
      '면접관이 질문하면 답변 포인트가 자동으로 표시됩니다. "AI에 도움 요청"도 가능합니다.',
    assist: {
      opening: '먼저 할 말',
      path: '답변 흐름',
      evidence: '프로젝트 근거',
      followUp: '예상 꼬리질문',
      avoid: '주의할 점',
      kind: {
        project: '프로젝트 심층 질문',
        behavioral: '경험·행동 질문',
        'system-design': '시스템 설계',
        algorithm: '알고리즘',
        concept: '개념·원리',
        general: '종합 질문'
      }
    },
    topicSummary: '주제 요약',
    exportTranscript: '면접 기록 내보내기',
    exported: '면접 기록을 내보냈습니다',
    dragHint: '드래그하여 이동',
    collapse: '접기',
    expand: '펼치기',
    resizeHint: '드래그하여 패널 너비 조정',
    speakerInterviewer: '면접관',
    speakerCandidate: '지원자',
    speakerUnknown: '알 수 없음',
    copyPoints: '요점 복사',
    pointsCopied: '복사됨',
    rememberAnswerPolicy: '다음에도 이 표현 사용',
    answerPolicyRemembered: '이 표현 저장됨',
    answerPolicySaved: '저장했습니다. 비슷한 질문에서는 이 표현을 우선 사용합니다.',
    answerPolicySaveFailed: '저장하지 못했습니다: {{error}}',
    answerPolicyConflict: '비슷한 질문에 이미 저장된 표현이 있습니다',
    answerPolicyPrevious: '현재 저장된 표현',
    answerPolicyKeepPrevious: '기존 표현 유지',
    answerPolicyReplace: '현재 답변으로 교체',
    rememberSpokenAnswer: '방금 말한 답변 기억',
    spokenAnswerTitle: '실제 답변 경로 확인',
    spokenAnswerDesc:
      '방금 답변한 내용의 전사입니다. 인식 오류를 수정한 뒤 비슷한 질문의 답변 표현으로 저장하세요.',
    saveSpokenAnswer: '내 답변 저장',
    prevPoint: '이전',
    nextPoint: '다음',
    pointIndex: '{{current}}/{{total}}',
    clearSession: '기록 지우기',
    memoryFound: '프로필에 추가할 수 있는 정보 {{count}}건을 찾았습니다',
    memorySaveAll: '모두 저장',
    memorySaveOne: '프로필에 저장',
    memoryDismiss: '무시',
    memorySaved: '개인 메모리에 {{count}}건 저장했습니다',
    tab: {
      now: '지금',
      transcript: '원문',
      history: '기록',
      later: '나중에'
    },
    phase: {
      idle: '대기 중',
      listening: '면접관 말을 듣는 중',
      preparing: '질문 수신, 준비 중',
      ready: '답변 포인트 준비 완료',
      recordingAnswer: '답변을 기록하는 중',
      audioInterrupted: '오디오 중단 — 조치 필요'
    },
    debrief: {
      open: '면접 리뷰',
      title: '면접 리뷰',
      close: '닫기',
      duration: '소요 시간',
      questions: '질문 수',
      answerRate: '완료율',
      unanswered: '답하지 못한 질문',
      improvements: '개선할 점',
      plan: '다음 연습',
      empty: '이 세션에는 아직 리뷰할 질의응답이 없습니다'
    }
  },
  transcription: {
    waitingVoice: '음성 입력 대기 중...',
    noKey: '먼저 설정에서 DashScope(百炼) API Key를 구성하세요',
    starting: '음성 전사를 시작하는 중…',
    sourceSystem: '시스템 오디오',
    sourceMic: '마이크',
    sysAudioMacHint:
      'macOS는 시스템 오디오(면접관)를 직접 캡처할 수 없습니다. BlackHole 가상 장치를 설치하고 설정에서 선택하세요',
    sysAudioPermission:
      '시스템 오디오가 거부되었습니다: 「시스템 설정 → 개인정보 보호 및 보안 → 화면 기록」에서 Penumbra를 허용한 뒤 앱을 완전히 종료하고 다시 여세요 (BlackHole 불필요)',
    partialStart: '일부 소스 시작에 실패했습니다. 사용 가능한 소스로 전사를 시작했습니다',
    audioAllLost: '모든 오디오 소스가 끊겼습니다. 권한이나 장치를 확인하세요',
    audioSourceLost: '{{source}}이(가) 끊겼습니다. 다른 소스로 전사를 계속합니다',
    diagChunks: '{{count}}개의 오디오 청크 수신(숫자가 올라가면 오디오를 캡처 중)',
    startBtn: '음성 전사 시작',
    stopBtn: '전사 중지',
    restart: '음성 전사 다시 시작',
    startFailed: '음성 전사 시작에 실패했습니다. 시스템 오디오 권한을 확인하세요',
    noAudioTrack: '오디오가 캡처되지 않았습니다. 공유 시 "시스템/탭 오디오 공유"를 활성화하세요',
    askWithThis: '이 전사로 추가 질문',
    startWithThis: '이 음성으로 대화 시작',
    askNoConversation: '먼저 스크린샷으로 대화를 시작하세요',
    asked: '전사 내용으로 추가 질문했습니다',
    copyText: '전사 복사',
    textCopied: '복사되었습니다',
    errDisconnected: '음성 인식 연결이 끊겼습니다. 다시 시도해 주세요',
    errTranslate: '실시간 번역에 실패했습니다. 잠시 후 다시 시도해 주세요',
    errTimeout: '음성 인식 연결 시간이 초과되었습니다. 네트워크를 확인해 주세요',
    errAuth: '음성 인식 키가 잘못되었거나 만료되었습니다. 설정에서 DashScope API 키를 확인하세요',
    errQuota: '음성 인식 잔액이 부족하거나 계정이 연체되었습니다. 바이롄 콘솔에서 잔액을 확인하세요'
  },
  settings: {
    title: '설정',
    heroTitle: '모델, 음성, 워크플로 설정',
    localOnly: '로컬 전용',
    connError: {
      timeout: '연결 시간이 초과되었습니다. 네트워크 또는 Base URL을 확인하세요',
      auth: 'API Key가 유효하지 않거나 권한이 없습니다',
      forbidden: '접근이 거부되었습니다 (403)',
      notFound: '엔드포인트를 찾을 수 없습니다. Base URL을 확인하세요',
      network: '네트워크 연결에 실패했습니다. 네트워크 또는 Base URL을 확인하세요',
      quota: '잔액이 부족하거나 계정이 연체되었습니다. 계정 잔액을 확인하세요',
      unknown: '알 수 없는 오류'
    },
    model: {
      title: '모델 서비스',
      desc: 'OpenAI 호환 모델 서비스를 설정하여 풀이, 추가 질문, 실시간 번역에 사용합니다.',
      profile: '서비스 프로필',
      profileDesc: '엔드포인트, 모델, 계정 모델 목록, 암호화 Key를 프로필별로 분리합니다.',
      profileName: '프로필 이름',
      profileNameDesc: 'OpenAI, DeepSeek, 사내 게이트웨이처럼 구분하기 쉬운 이름을 사용하세요.',
      addProfile: '서비스 프로필 추가',
      deleteProfile: '현재 프로필 삭제',
      deleteProfileConfirm: '“{{name}}” 프로필과 저장된 Key를 삭제할까요?',
      profileAdded: '답변 서비스 프로필을 추가했습니다',
      profileDeleted: '답변 서비스 프로필을 삭제했습니다',
      baseUrlDesc:
        '예: https://api.siliconflow.cn/v1. 비워두면 기본 OpenAI 호환 주소를 사용합니다.',
      baseUrlPlaceholder: '비워둘 수 있음, 기본값은 OpenAI API',
      presetPlaceholder: '제공자 선택',
      protocolLabel: 'API 프로토콜',
      protocolDesc:
        '자동 모드는 제공업체에 맞는 방식을 우선 사용하고, 답변 출력 전에 미지원이 확인될 때만 전환합니다.',
      protocolAuto: '자동(권장)',
      protocolResponses: 'Responses API',
      protocolChat: 'Chat Completions',
      protocolAnthropic: 'Anthropic Messages',
      apiKeyPlaceholder: 'API Key 입력',
      apiKeyReplacePlaceholder: '저장된 Key를 교체할 새 Key 입력',
      keyStored: '암호화 저장됨 ····{{suffix}}. 원본 Key는 앱 설정에 저장되지 않습니다.',
      keyNotStored: '이 프로필에는 저장된 Key가 없습니다.',
      saveKey: 'Key 저장',
      replaceKey: 'Key 교체',
      deleteKey: 'Key 삭제',
      keySaved: 'Key를 암호화하여 저장했습니다',
      keySaveFail: '시스템 보안 저장소에 Key를 저장하지 못했습니다.',
      keyDeleted: 'Key를 삭제했습니다',
      modelLabel: '답변 모델',
      modelDesc:
        '먼저 현재 제공자의 자주 쓰는 모델을 보여 줍니다. Key 입력 후 계정에서 사용 가능한 모델을 자동으로 불러옵니다. 스크린샷에는 비전 모델을 선택하세요.',
      selectModel: '모델 선택...',
      searchOrCreate: '입력하여 검색 또는 생성...',
      noResult: '결과 없음',
      create: '"{{name}}" 생성',
      customTag: '커스텀',
      recommendedTag: '추천',
      visionTag: '이미지 지원',
      textOnlyTag: '텍스트 전용',
      commonGroup: '현재 제공자 인기 모델',
      accountGroup: '이 Key에서 사용 가능',
      customGroup: '직접 추가',
      deleteCustom: '커스텀 모델 삭제',
      testConnection: '연결 테스트',
      testConnectionDesc: '현재 설정으로 최소 요청을 보내 모델 사용 가능 여부를 확인합니다.',
      testOk: '모델 연결됨',
      testFail: '연결 실패: {{error}}',
      refresh: '계정 모델 다시 불러오기',
      fetching: '이 Key에서 사용 가능한 모델을 불러오는 중…',
      fetched: '계정 모델 {{count}}개를 업데이트했습니다.',
      cached: '계정 모델 {{count}}개가 캐시되어 있습니다. 새로고침을 눌렀을 때만 다시 불러옵니다.',
      fetchHint: '필요할 때 새로고침 버튼을 눌러 계정 모델을 불러오세요.',
      fetchFailed: '불러오지 못했습니다. 새로고침을 눌러 다시 시도하세요.',
      fetchOk: '계정 모델 {{count}}개를 불러왔습니다',
      fetchFail: '모델 불러오기 실패: {{error}}'
    },
    voice: {
      title: '음성 및 면접 어시스턴트',
      desc: '실시간 ASR, 듀얼 소스 화자 분리, 단계 인식, 답변 제안.',
      dashscopeKey: 'DashScope API Key',
      dashscopeKeyDesc: 'Alibaba Cloud Model Studio 실시간 음성 인식에 사용됩니다.',
      dashscopeKeyPlaceholder: 'DashScope API Key 입력',
      asrModel: '음성 인식 모델',
      asrModelDesc:
        'Qwen-Audio 3.0을 권장합니다. Qwen3 ASR은 별도 Realtime 프로토콜을 사용하며 앱이 자동으로 선택합니다.',
      asrModelDefault: '권장',
      asrModelWarn: '이 모델은 이전 설정 호환용입니다. 새 설정에는 Qwen-Audio 3.0을 권장합니다.',
      micDevice: '오디오 입력 장치',
      micDeviceDesc:
        '어떤 마이크로 캡처할지 선택합니다. 면접관 음성(시스템 오디오)을 전사하려면 BlackHole 같은 가상 장치를 설치한 뒤 여기서 선택하세요.',
      micDeviceDefault: '시스템 기본 마이크',
      micDeviceRefresh: '장치 목록 새로고침',
      testConnection: '연결 테스트',
      testConnectionDesc: '현재 키와 모델로 핸드셰이크하여 음성 인식 가능 여부를 확인합니다.',
      testOk: '음성 인식 연결됨',
      testFail: '연결 실패: {{error}}',
      coachEnabled: '면접 연습 어시스턴트',
      coachEnabledDesc:
        '실시간 전사로 화자와 면접 단계를 판단하고 구조화된 답변 제안을 제공합니다.',
      realtimeAssist: '새 질문 감지 및 답변 힌트 생성',
      realtimeAssistDesc:
        '면접관의 새 질문을 계속 감지하고 말이 끝나면 답변 포인트를 자동 생성합니다(토큰 소모가 많으며 "AI에 도움 요청"으로 수동 실행할 수도 있습니다).',
      proactiveAssist: '능동형 실시간 코칭',
      proactiveAssistDesc:
        '질문이나 키 입력 없이 약 20초마다 대화 흐름에 따라 먼저 제안합니다: 이력서 프로젝트, 관련 SOTA 기술, 답변 요점, 되물을 좋은 질문(토큰 소모가 가장 많음; 연습 시 권장).',
      memoryDistill: '대화에서 메모리 자동 추출',
      memoryDistillDesc:
        '면접 중 AI가 언급한 프로젝트/기술을 주목해 정기적으로 프로필에 추가할 후보로 추출합니다. 저장 전 확인이 필요하며 자동으로 기록되지 않습니다.',
      assistDebounce: '지원 트리거 지연',
      assistDebounceDesc:
        '면접관이 말을 마친 후 AI 지원을 실행하기까지의 대기 시간. 짧게 하면 더 빠르고, 길게 하면 토큰을 절약합니다.',
      dualSource: '듀얼 소스 화자 분리',
      dualSourceDesc:
        '시스템 오디오는 면접관, 마이크는 지원자로 표시합니다. macOS에서는 처음 시작할 때 화면 기록 권한을 요청합니다. 「시스템 설정 → 개인정보 보호 및 보안 → 화면 기록」에서 본 앱을 켠 뒤 완전히 종료했다가 다시 여세요(BlackHole 불필요). 그래도 면접관 소리가 잡히지 않으면 BlackHole 가상 장치를 설치하고 위에서 선택하세요.',
      transcriptionLang: '전사 언어',
      transcriptionLangDesc:
        '언어를 지정하면 인식 정확도가 향상됩니다. 중국어와 영어가 섞인 면접에는 이중 언어 프리셋을 사용할 수 있습니다.',
      autoDetect: '자동 감지',
      bilingualZhEn: '중국어 + 영어',
      diarizationMode: '화자 분리 모드',
      diarizationModeDesc:
        '듀얼 소스는 오디오 태그를 직접 사용합니다. provider 모드는 향후 diarization ASR 용입니다.',
      heuristic: '휴리스틱',
      providerLabel: 'ASR Provider 태그'
    },
    strategy: {
      title: '번역 및 답변 전략',
      appMode: '사용 모드',
      appModeDesc:
        '알고리즘 모드는 코드+복잡도+엣지케이스를 제공하고, 일반 모드는 코드 형식을 강제하지 않고 무엇이든 답변합니다.',
      modeAlgorithm: '알고리즘 모드',
      modeGeneral: '일반 모드',
      desc: 'AI 실시간 번역과 풀이 프롬프트를 제어합니다.',
      translation: 'AI 실시간 번역',
      translationDesc: '각 문장의 전사가 끝날 때마다 현재 AI 모델로 번역합니다.',
      translationTargetLang: '번역 대상 언어',
      translationTargetLangDesc: '모델 서비스의 API Key와 모델을 사용합니다.',
      customPrompt: '커스텀 프롬프트',
      customPromptDesc: '활성화하면 기본 코딩 풀이 프롬프트를 덮어씁니다.',
      customPromptPlaceholder: '커스텀 프롬프트 입력...',
      outputStyle: '출력 스타일',
      outputStyleDesc: 'AI 풀이 출력의 스타일 프리셋을 선택합니다.',
      presetDefault: '상세 분석',
      presetConcise: '간결',
      presetCodeOnly: '코드만',
      presetInterview: '면접 설명',
      codeLanguage: '프로그래밍 언어',
      codeLanguageDesc: '커스텀 프롬프트 활성화 시 이 옵션은 비활성화됩니다.',
      langSelect: '언어 선택...',
      langSearch: '언어 검색 또는 추가...',
      langNoResult: '언어를 찾을 수 없습니다',
      langCreate: '"{{name}}" 추가'
    },
    appearance: {
      title: '외관',
      desc: 'UI 글자 크기, 창 제어 버튼, 네 가지 불투명도를 조절합니다.',
      accentColor: '강조 색상',
      accentColorDesc: 'UI 강조 색상을 사용자 지정 — 버튼, 강조, 힌트에 적용됩니다.',
      accentColorCustom: '사용자 지정 색상',
      accentLowContrast:
        '이 강조 색상은 어두운 배경에서 대비가 낮아({{ratio}}:1) 읽기 어려울 수 있습니다',
      overallOpacity: '전체 불투명도',
      overallOpacityDesc: '창 전체(배경, 텍스트, 테두리)를 함께 조절합니다.',
      windowOpacity: '창 불투명도',
      windowOpacityDesc: '배경/패널만 조절. 완전 투명 시 텍스트가 투명한 창 위에 뜹니다.',
      textOpacity: '텍스트 불투명도',
      textOpacityDesc: '텍스트만 조절하며 배경에는 영향을 주지 않습니다.',
      iconOpacity: '아이콘 불투명도',
      iconOpacityDesc:
        '버튼과 상태 아이콘만 조절하며 텍스트, 배경, 스크린샷에는 영향을 주지 않습니다.',
      transparent: '투명',
      opaque: '불투명',
      uiLanguage: '인터페이스 언어',
      uiLanguageDesc: '앱 인터페이스 표시 언어를 전환합니다.',
      zeroUiMode: '0 UI 일반 텍스트 모드',
      zeroUiModeDesc:
        '모든 컨트롤과 스크린샷을 숨기고 AI 답변만 서식 있는 텍스트로 표시합니다. 전역 단축키로 언제든 전환할 수 있습니다.',
      zeroUiEnabled: '0 UI 일반 텍스트 모드가 켜졌습니다',
      zeroUiDisabled: '0 UI 일반 텍스트 모드가 꺼졌습니다',
      zeroUiBackdrop: '0 UI 배경 맞춤',
      zeroUiBackdropDesc:
        '오버레이 뒤 실제 화면에 맞춰 두 대의 카메라 환경에서도 읽기 쉽고 눈에 덜 띄게 합니다.',
      zeroUiBackdrops: {
        dark: '뒤가 어두움 (밝은 글자)',
        light: '뒤가 밝음 (어두운 글자)'
      },
      uiFontSize: '인터페이스 글자 크기',
      uiFontSizeDesc: '탐색, 설정, 일반 UI 텍스트를 조절하며 답변 글자는 별도로 설정합니다.',
      codeBlockTheme: '코드 블록 스타일',
      codeBlockThemeDesc:
        '코드 영역 대비를 선택합니다. 부드러운 모드는 눈에 띄는 검은 배경을 피합니다.',
      codeTheme: {
        soft: '부드럽게(권장)',
        light: '밝게',
        dark: '어둡게'
      },
      trafficLightMode: '창 제어 버튼',
      trafficLightModeDesc: '평소에는 숨기고 포인터가 왼쪽 위에 있을 때만 표시합니다.',
      trafficLights: {
        hover: '가리킬 때 표시(권장)',
        always: '항상 표시',
        hidden: '항상 숨기기'
      },
      reduceMotion: '모션 줄이기',
      reduceMotionDesc: '인터페이스 애니메이션을 줄여 면접 중 방해를 줄입니다.',
      motion: {
        system: '시스템 따름',
        reduce: '항상 줄이기',
        full: '항상 전체'
      },
      answerFontSize: '답변 글자 크기',
      answerFontSizeDesc: '풀이 출력 영역의 글자 크기를 조절하여 면접 시 가독성을 높입니다.'
    },
    storage: {
      title: '저장',
      desc: '스크린샷을 로컬에 저장할지 제어합니다.',
      autoSave: '스크린샷 로컬 저장',
      autoSaveDesc: '활성화하면 모든 스크린샷이 지정한 폴더에 저장됩니다.',
      saveDir: '저장 폴더',
      saveDirDesc: '선택 대화상자가 최상위 창에 가려질 수 있습니다.',
      selectDir: '클릭하여 폴더 선택',
      defaultDir: '기본값: 사진/Penumbra',
      screenshotDisplay: '스크린샷 디스플레이',
      screenshotDisplayDesc: '여러 모니터가 있을 때 캡처할 화면을 선택합니다.',
      screenshotDisplayPrimary: '기본 디스플레이'
    },
    shortcuts: {
      title: '단축키',
      desc: '전역 단축키는 메인 화면에서만 작동합니다.',
      resetDefaults: '기본 단축키 재설정',
      resetSuccess: '단축키를 기본값으로 재설정했습니다',
      recording: '새 단축키를 누르세요...',
      conflict: '이미 사용 중인 단축키입니다. 다른 것을 선택하세요',
      failed: '등록 실패 (시스템 단축키와 충돌 가능)'
    },
    memory: {
      title: '개인 메모',
      desc: '배경 정보를 입력하면 풀이 시 컨텍스트로 사용되어 더 맞춤화된 답변을 제공합니다.',
      label: '배경 정보',
      placeholder: '예: 백엔드 개발 3년, 주로 Go와 분산 시스템, 백엔드 면접 준비 중…',
      importFile: '파일 가져오기',
      clear: '지우기',
      imported: '자료를 가져왔습니다',
      importEmpty:
        '파일에서 텍스트를 추출하지 못했습니다(스캔한 PDF는 텍스트 레이어가 없을 수 있습니다)',
      hint: '.txt / .md / .pdf 파일 가져오기 지원 (로컬에만 저장되며 제3자에게 업로드되지 않습니다).',
      profiles: '프로필',
      addProfile: '새 프로필',
      deleteProfile: '프로필 삭제',
      newProfileName: '새 프로필',
      unnamedProfile: '이름 없음',
      profileNamePlaceholder: '프로필 이름 (예: 백엔드 지원)',
      fieldTargetRole: '목표 직무',
      fieldTargetRolePlaceholder: '예: ByteDance 백엔드 엔지니어',
      fieldTechStack: '기술 스택',
      fieldTechStackPlaceholder: '예: Go, Kubernetes, PostgreSQL, gRPC',
      fieldProjects: '프로젝트 경험',
      fieldProjectsPlaceholder: '면접관에게 알리고 싶은 핵심 프로젝트와 성과',
      fieldHighlights: '강조할 점',
      fieldHighlightsPlaceholder: '예: 수백만 QPS 시스템 주도, 오픈소스 기여 등',
      fieldAvoid: '피하고 싶은 주제',
      fieldAvoidPlaceholder: '깊이 질문받고 싶지 않은 분야나 경험',
      fieldFreeform: '기타 메모',
      fieldFreeformPlaceholder: '기타 자유 입력',
      preview: '현재 적용 내용',
      previewDesc: 'AI 프롬프트에 실제로 추가되는 텍스트입니다 (현재 프로필 기준).',
      previewEmpty: '(현재 프로필이 비어 있습니다. 위 항목을 입력하면 여기에 표시됩니다)'
    },
    projectKnowledge: {
      title: '프로젝트 지식',
      desc: '직접 구현한 코드와 확인한 답변 표현을 실제 답변에 반영합니다.',
      sourcesTitle: '로컬 코드 저장소',
      sourcesDesc: '소스, 테스트, 문서를 색인하고 현재 질문과 관련된 조각만 검색합니다.',
      import: '저장소 추가',
      loading: '프로젝트 지식을 불러오는 중…',
      emptyProjects:
        '아직 프로젝트가 없습니다. 로컬 코드 폴더를 선택하면 실제 구현을 근거로 답변합니다.',
      projectStats: '파일 {{files}}개 · 조각 {{chunks}}개',
      sourceGraphStats: '심볼 {{symbols}}개 · 소스 관계 {{relations}}개 분석',
      updatedAt: '{{time}} 업데이트',
      reindex: '다시 색인',
      remove: '제거',
      importSuccess: '프로젝트 색인 완료',
      reindexSuccess: '프로젝트 색인 업데이트됨',
      removeSuccess: '프로젝트 색인 제거됨',
      actionFailed: '작업 실패: {{error}}',
      policiesTitle: '확인한 답변 표현',
      policiesDesc:
        '실시간 도움에서 확인한 표현입니다. 비슷한 질문에서 우선 재사용해 답변 일관성을 유지합니다.',
      emptyPolicies:
        '확인한 표현이 아직 없습니다. 유용한 답변에서 “다음에도 이 표현 사용”을 선택하세요.',
      edit: '편집',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
      saved: '답변 표현을 저장했습니다',
      deleted: '답변 표현을 삭제했습니다',
      required: '질문과 답변을 모두 입력해야 합니다',
      removeConfirm: '로컬 색인만 제거하며 소스 코드는 삭제하지 않습니다. 계속할까요?',
      deletePolicyConfirm: '비슷한 질문에서 이 표현을 더 이상 사용하지 않습니다. 계속할까요?',
      materials: {
        title: '이력서, 채팅, 프로젝트 자료',
        desc: '이력서 배경, 사용자 표현, 프로젝트 사실, 참고 설계로 나누어 색인하고 관련 부분만 검색합니다.',
        import: '자료 추가',
        imported: '자료 색인을 완료했습니다',
        reindexed: '자료 색인을 업데이트했습니다',
        removed: '자료 색인을 제거했습니다',
        removeConfirm: '로컬 색인만 제거하고 원본 파일은 삭제하지 않습니다. 계속할까요?',
        stats: '조각 {{chunks}}개 · {{time}} 업데이트',
        empty:
          'PDF, Markdown, TXT, JSON 형식의 이력서, 채팅 내보내기, 프로젝트 문서를 추가할 수 있습니다.'
      },
      external: {
        title: '외부 지식 API',
        desc: '기존 지식베이스를 연결하고 프로젝트 사실, 이력서 배경, 사용자 표현, 참고 설계를 구분합니다.',
        add: 'API 연결',
        name: '소스 이름',
        namePlaceholder: '예: 프로젝트 문서',
        role: '근거 역할',
        endpoint: '검색 엔드포인트',
        protocol: 'API 프로토콜',
        auth: '인증 방식',
        apiKey: 'API Key',
        keyPlaceholder: '지식 API Key 입력',
        keyKeepPlaceholder: '비워 두면 기존 Key 유지',
        headerName: '인증 Header',
        namespace: '공간 / 프로젝트 ID',
        namespacePlaceholder: '선택 사항',
        timeout: '실시간 제한 시간(ms)',
        advanced: '고급 필드 매핑',
        queryField: '질문 필드',
        limitField: '개수 필드',
        namespaceField: '공간 필드',
        useInInterview: '면접 중 이 소스 사용',
        save: '소스 저장',
        required: '소스 이름과 엔드포인트가 필요합니다',
        saved: '지식 API를 저장했습니다',
        enabled: '지식 소스를 켰습니다',
        disabled: '지식 소스를 껐습니다',
        test: '연결 테스트',
        testSuccess: '연결 성공, 근거 {{count}}개 반환',
        testFailed: '연결 실패: {{error}}',
        deleteConfirm: '이 소스에 저장된 API Key도 삭제합니다. 계속할까요?',
        deleted: '지식 소스와 Key를 삭제했습니다',
        empty: '외부 소스가 없습니다. Dify 또는 일반 JSON 검색 API를 연결할 수 있습니다.',
        noKeyNeeded: 'Key 불필요',
        keySaved: 'Key 저장됨 ····{{suffix}}',
        keyMissing: 'Key 없음',
        lastTestOk: '{{time}} 성공 · {{count}}개',
        lastTestFailed: '{{time}} 실패',
        roles: {
          'project-fact': '프로젝트 사실',
          'candidate-profile': '이력서 배경',
          'user-voice': '사용자 표현',
          reference: '참고 설계'
        },
        protocols: {
          'generic-json': '일반 JSON 검색',
          dify: 'Dify 지식베이스'
        },
        authTypes: {
          none: '인증 없음',
          bearer: 'Bearer Token',
          'x-api-key': 'X-API-Key',
          'custom-header': '사용자 정의 Header'
        }
      },
      privacyNote:
        '색인은 이 기기에 저장됩니다. 현재 질문과 관련된 소량의 조각만 설정한 답변 모델로 전송합니다.'
    },
    privacy: {
      title: '개인정보 및 보안',
      desc: '로컬 설정, 권한, 플랫폼 표시 옵션.',
      note: '스크린샷과 오디오는 설정한 모델/ASR 서비스로만 전송됩니다. 본인의 API Key를 사용하고 로컬 스크린샷을 정기적으로 정리하는 것을 권장합니다.',
      secretStorage: '시크릿 저장 상태',
      secretCount:
        '{{count}}/2개의 키가 설정됨. 키는 메인 프로세스에 저장되며 renderer localStorage에 기록되지 않습니다.',
      verifyNote:
        '로컬 확인: DevTools → Application → Local Storage → interview-coder-settings 에서 apiKey / dashscopeApiKey 필드가 없는지 확인하세요.',
      contentProtection: '화면 공유 스텔스',
      contentProtectionDesc:
        '켜면 화면 녹화/캡처/회의 공유에 창이 보이지 않습니다(앱의 핵심 기능). 켠 뒤 창이 보이지 않으면 일시적으로 끄세요.',
      contentProtectionWarn: '화면 공유 스텔스를 켰습니다. 창이 사라지면 ⌥0 으로 재설정하세요.',
      stealthOn: '화면 공유 스텔스 켜짐',
      stealthOff: '화면 공유 스텔스 꺼짐',
      hideDock: 'Dock 아이콘 숨기기',
      hideDockDesc:
        '활성화하면 Dock과 Cmd+Tab에 표시되지 않으며 옆의 단축키로 다시 표시할 수 있습니다.',
      dockHidden: 'Dock 아이콘을 숨겼습니다',
      dockShown: 'Dock 아이콘을 표시했습니다'
    }
  },
  help: {
    title: '도움말 센터',
    heroTitle: '빠른 시작 및 자주 묻는 질문',
    practiceMode: '연습 모드',
    introTitle: '소개',
    introBefore:
      'Penumbra에 오신 것을 환영합니다! 코딩 테스트와 면접을 위해 화면 캡처·분석·풀이 제안을 돕습니다. 자세한 내용은 ',
    introAfter: ' 를 참고하세요(스텔스 설정, API Key 등).',
    feature1: '단축키로 화면을 캡처하고 풀이를 생성합니다.',
    feature2: '화면 공유 중 창이 자동으로 숨겨집니다(상대에게 안 보임, 일부 회의 앱은 설정 필요).',
    feature3:
      '창은 반투명으로 항상 위에 고정되며 커서가 제자리에 머물러 원본 페이지의 포커스를 빼앗지 않습니다.',
    step1Title: '1. 대화 시작',
    step1Desc: '스크린샷, 하단 입력, 또는 음성 전사로 대화를 시작할 수 있습니다.',
    step2Title: '2. 결과 보기',
    step2Desc: '내용이 대화 형식으로 실시간 표시되며, 복사·추가 질문·기록 확인이 가능합니다.',
    asrTitle: '실시간 음성 면접(ASR)',
    asrDesc:
      '면접관의 말을 실시간으로 받아쓰고, 한 번의 클릭으로 대화를 시작하거나 AI 답변 포인트를 받을 수 있습니다.',
    asrStep1Title: '1. 음성 서비스 설정',
    asrStep1Desc:
      '「설정 → 음성 및 면접 어시스턴트」에서 DashScope(바이롄) API 키를 입력하고 「연결 테스트」로 정상 작동을 확인하세요.',
    asrStep2Title: '2. 받아쓰기 시작',
    asrStep2Desc:
      '받아쓰기 단축키로 시작합니다. 처음에는 화면 공유 권한 창이 뜨므로 「시스템 / 탭 오디오 공유」를 반드시 선택하세요. 선택하지 않으면 시스템 소리가 캡처되지 않습니다.',
    asrStep3Title: '3. 화자 구분(이중 음원)',
    asrStep3Desc:
      '이중 음원을 켜면 시스템 오디오는 「면접관」, 마이크는 「나」로 표시되어 대화를 따라가기 쉽습니다.',
    asrStep4Title: '4. AI 어시스트 활용',
    asrStep4Desc:
      '받아쓰기 바 오른쪽 버튼으로 해당 음성으로 「대화 시작 / 추가 질문」을 할 수 있습니다. 「실시간 AI 어시스트」를 켜면 면접관의 질문에 대한 답변 포인트가 자동 생성됩니다. 면접 어시스턴트 패널에서 대화 타임라인·AI 포인트·주제 요약을 확인하고 면접 기록을 내보낼 수 있습니다.',
    keyFeatures: '주요 기능:',
    quickStart: '빠른 시작',
    shortcutsTitle: '단축키',
    shortcutsDesc: '단축키는 앱을 조작하는 주요 방법이며 설정에서 사용자 지정할 수 있습니다.',
    faqTitle: '자주 묻는 질문',
    contactTitle: '지원 문의',
    contactDesc: '문제가 있거나 제안이 있으면 아래로 연락하세요:',
    contactGithubPrefix: '',
    contactGithubSuffix: ' 에서 버그 신고와 기능 요청을 제출하세요',
    faq: {
      q1: '스크린샷은 어떻게 찍나요?',
      a1: '{{key}} 를 누르면 현재 화면을 캡처하며, 앱에 자동으로 표시됩니다.',
      q2: '문제가 한 화면을 넘으면 어떻게 하나요?',
      a2: '{{key}} 를 누르면 현재 대화에 스크린샷을 추가하고 풀이를 생성합니다.',
      q3: '화면 공유 중에 상대가 앱을 볼 수 있나요?',
      a3: '화면 공유 중에는 창이 자동으로 숨겨집니다(상대에게 안 보임). 일부 회의 앱은 설정이 필요할 수 있으니, 사용 전 실제 기기+회의 앱으로 테스트하세요.',
      q4: '창에 커서를 올리면 바뀌나요?',
      a4: '마우스 통과 토글이 있습니다. 켜면 창이 마우스를 무시하고 단축키로 조작합니다. 토글은 {{key}}, 상태는 우측 하단에 표시됩니다.',
      q5: '음성 전사는 무엇이며 어떻게 쓰나요?',
      a5: '면접관 음성이나 문제 낭독을 실시간으로 텍스트화해 AI를 돕습니다. 설정에서 DashScope API Key를 구성한 뒤 {{key}} 로 시작/일시정지하며, 전사는 스크린샷 시 자동 첨부됩니다.',
      q6: '전사 텍스트만 지울 수 있나요?',
      a6: '네. {{key}} 로 현재 전사를 지울 수 있으며, 지운 텍스트는 AI로 전송되지 않고 스크린샷 시에도 기존 전사가 지워집니다.',
      q7: '소리가 안 들리거나 시스템 음을 못 잡으면?',
      a7: '전사를 시작하면 화면 공유 권한 창이 뜹니다. "시스템/탭 오디오 공유"를 반드시 체크해야 상대 소리를 잡을 수 있습니다. 설정에서 DashScope API Key를 입력하고 "연결 테스트"가 통과하는지도 확인하세요.',
      q8: '면접관과 내 말을 어떻게 구분하나요?',
      a8: '설정에서 "듀얼 소스 화자 분리"를 켜면 시스템 음은 면접관, 마이크는 나로 태그되어 전사와 AI에 보내는 맥락 모두에 화자가 표시됩니다.',
      q9: 'AI 답변 포인트가 자동으로 안 나오는 이유는?',
      a9: '설정에서 "AI 실시간 지원"을 켜야 합니다. 면접관의 말이 질문처럼 보일 때만 자동 실행되며, 패널의 "AI에 도움 요청"으로 수동 생성할 수도 있습니다.',
      q10: '면접 중 말한 프로젝트/기술이 자동으로 프로필에 저장되나요?',
      a10: '네. 설정→음성 및 면접 어시스턴트에서 "대화에서 메모리 자동 추출"을 켜면 AI가 말한 프로젝트, 기술 스택 등을 추출해 음성 패널 상단에 후보로 표시합니다. 직접(개별 또는 전체) 확인한 후에만 현재 프로필에 기록되며 자동 저장되지 않습니다.'
    }
  },
  update: {
    available: '새 버전이 있습니다',
    availableVersion: '버전 {{version}} 사용 가능',
    download: '업데이트 다운로드',
    later: '나중에',
    downloading: '다운로드 중… {{percent}}%',
    ready: '업데이트 준비 완료',
    restart: '지금 다시 시작',
    error: '업데이트 실패, 나중에 다시 시도하세요'
  },
  shortcutCategory: {
    'Window Management': '창 관리',
    'Screenshot & AI': '스크린샷 및 AI',
    Navigation: '내비게이션',
    'Window Movement': '창 이동'
  },
  shortcut: {
    hideOrShowMainWindow: { label: '창 숨기기/표시' },
    resetWindow: {
      label: '창 재설정',
      desc: '창이 보이지 않을 때 누르면 중앙·불투명·표시 상태로 강제 복구합니다'
    },
    ignoreOrEnableMouse: {
      label: '마우스 통과',
      desc: '활성화하면 클릭이 창을 통과하여 뒤쪽 내용에 전달됩니다'
    },
    newConversation: {
      label: '새 대화',
      desc: '현재 대화를 지우고 입력창에 커서를 놓습니다'
    },
    focusComposer: {
      label: '입력창 포커스',
      desc: '창을 표시하고 마우스 통과를 해제한 뒤 바로 입력합니다'
    },
    toggleContentProtection: {
      label: '화면 공유 스텔스 전환',
      desc: '녹화·공유 시 창 숨김을 한 키로 켜고 끄기'
    },
    toggleZeroUiMode: {
      label: '0 UI 일반 텍스트 전환',
      desc: '전체 UI를 숨기거나 복원하고 AI 답변만 서식 있는 텍스트로 표시'
    },
    toggleDockIcon: {
      label: 'Dock 아이콘 숨기기/표시',
      desc: 'Penumbra를 Dock과 Cmd+Tab에 표시할지 전환'
    },
    increaseOverallOpacity: { label: '전체 불투명도 높이기', desc: '창 전체를 더 불투명하게' },
    decreaseOverallOpacity: { label: '전체 불투명도 낮추기', desc: '창 전체를 더 투명하게' },
    increaseWindowOpacity: { label: '창 불투명도 높이기', desc: '창 배경을 더 불투명하게' },
    decreaseWindowOpacity: {
      label: '창 불투명도 낮추기',
      desc: '창 배경을 더 투명하게 (텍스트 유지)'
    },
    increaseTextOpacity: { label: '텍스트 불투명도 높이기', desc: '콘텐츠 텍스트를 선명하게' },
    decreaseTextOpacity: { label: '텍스트 불투명도 낮추기', desc: '콘텐츠 텍스트를 투명하게' },
    increaseIconOpacity: { label: '아이콘 불투명도 높이기', desc: '버튼과 상태 아이콘을 선명하게' },
    decreaseIconOpacity: { label: '아이콘 불투명도 낮추기', desc: '버튼과 상태 아이콘을 투명하게' },
    takeScreenshot: { label: '스크린샷', desc: '캡처하여 풀이 생성 (새 대화 시작)' },
    appendScreenshot: {
      label: '스크린샷 추가',
      desc: '현재 대화에 스크린샷 추가. 긴 문제에 유용합니다'
    },
    stopSolutionStream: { label: '생성 중지', desc: '생성 중인 풀이를 중단합니다' },
    toggleTranscription: { label: '음성 전사', desc: '실시간 음성 전사 시작/일시정지' },
    clearTranscription: {
      label: '전사 텍스트 지우기',
      desc: '전사된 텍스트 지우기 (AI에 전송되지 않음)'
    },
    copyLatestAnswer: {
      label: '최신 답변 코드 복사',
      desc: '최신 답변의 코드 블록(없으면 전체 텍스트)을 복사 — 면접 중 마우스 없이 붙여넣기'
    },
    pageUp: { label: '위로 스크롤' },
    pageDown: { label: '아래로 스크롤' },
    moveMainWindowUp: { label: '창 위로 이동' },
    moveMainWindowDown: { label: '창 아래로 이동' },
    moveMainWindowLeft: { label: '창 왼쪽으로 이동' },
    moveMainWindowRight: { label: '창 오른쪽으로 이동' }
  },
  history: {
    title: '기록',
    empty: '아직 지난 대화가 없습니다',
    delete: '삭제',
    searchPlaceholder: '세션 검색…'
  }
}

export default ko
