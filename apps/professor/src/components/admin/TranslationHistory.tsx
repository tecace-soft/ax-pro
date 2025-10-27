import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'

type ViewMode = 'card' | 'table'
type SortOption = 'date-desc' | 'date-asc' | 'user'

interface TranslationEntry {
  id: string
  date: string
  userId: string
  sessionId: string
  originalText: string
  originalLanguage: string
  translations: {
    language: string
    text: string
  }[]
  userFeedback?: string
  adminFeedback?: {
    verdict: 'good' | 'bad'
    feedbackText?: string
    correctedResponse?: string
  }
}

interface AdminFeedbackModal {
  entryId: string
  originalText: string
  translatedText: string
  verdict: 'good' | 'bad'
  existingFeedback?: TranslationEntry['adminFeedback']
}

export default function TranslationHistory() {
  const { t } = useTranslation()
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [filteredTranslations, setFilteredTranslations] = useState<TranslationEntry[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isLoading, setIsLoading] = useState(false)
  const [filterLanguage, setFilterLanguage] = useState<string>('all')
  const [rowSelectedLanguages, setRowSelectedLanguages] = useState<Record<string, string>>({})
  const [feedbackModal, setFeedbackModal] = useState<AdminFeedbackModal | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState('')
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get language for a specific row
  const getLanguageForRow = (rowId: string) => {
    return rowSelectedLanguages[rowId] || selectedLanguage
  }

  // Update language for a specific row
  const setLanguageForRow = (rowId: string, lang: string) => {
    setRowSelectedLanguages(prev => ({
      ...prev,
      [rowId]: lang
    }))
  }

  // Mock data
  useEffect(() => {
    const mockData: TranslationEntry[] = [
      {
        id: '1',
        date: '2025-10-27 14:30:15',
        userId: 'user001',
        sessionId: 'session_001',
        originalText: '오늘은 머신러닝의 기초에 대해 배우겠습니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Today we will learn about the basics of machine learning.' },
          { language: 'ja', text: '今日は機械学習の基礎について学びます。' },
          { language: 'zh', text: '今天我们将学习机器学习的基础知识。' }
        ]
      },
      {
        id: '2',
        date: '2025-10-27 14:32:45',
        userId: 'user002',
        sessionId: 'session_002',
        originalText: '이 알고리즘은 데이터의 패턴을 학습합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'This algorithm learns patterns from the data.' },
          { language: 'ja', text: 'このアルゴリズムはデータからパターンを学習します。' },
          { language: 'zh', text: '该算法从数据中学习模式。' }
        ]
      },
      {
        id: '3',
        date: '2025-10-27 14:35:20',
        userId: 'user003',
        sessionId: 'session_003',
        originalText: 'The model performance improves with more training data.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '더 많은 학습 데이터로 모델 성능이 향상됩니다.' },
          { language: 'ja', text: 'より多くのトレーニングデータでモデルのパフォーマンスが向上します。' },
          { language: 'zh', text: '更多训练数据会提高模型性能。' }
        ]
      },
      {
        id: '4',
        date: '2025-10-27 14:28:10',
        userId: 'professor_001',
        sessionId: 'session_004',
        originalText: '딥러닝은 신경망을 여러 층으로 쌓아서 복잡한 패턴을 학습하는 기법입니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Deep learning is a technique that learns complex patterns by stacking neural networks in multiple layers.' },
          { language: 'ja', text: '深層学習は、ニューラルネットワークを複数層に積み重ねて複雑なパターンを学習する技術です。' },
          { language: 'zh', text: '深度学习是通过堆叠多层神经网络来学习复杂模式的技术。' }
        ]
      },
      {
        id: '5',
        date: '2025-10-27 14:25:45',
        userId: 'student_102',
        sessionId: 'session_005',
        originalText: 'What is the difference between supervised and unsupervised learning?',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '지도 학습과 비지도 학습의 차이점은 무엇인가요?' },
          { language: 'ja', text: '教師あり学習と教師なし学習の違いは何ですか？' },
          { language: 'zh', text: '监督学习和无监督学习有什么区别？' }
        ]
      },
      {
        id: '6',
        date: '2025-10-27 14:23:20',
        userId: 'student_103',
        sessionId: 'session_006',
        originalText: 'Convolutional neural networks are particularly effective for image recognition tasks.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '합성곱 신경망은 이미지 인식 작업에 특히 효과적입니다.' },
          { language: 'ja', text: '畳み込みニューラルネットワークは画像認識タスクに特に効果的です。' },
          { language: 'zh', text: '卷积神经网络在图像识别任务中特别有效。' }
        ]
      },
      {
        id: '7',
        date: '2025-10-27 14:20:15',
        userId: 'user001',
        sessionId: 'session_007',
        originalText: '정규화는 과적합을 방지하는 중요한 기법입니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Regularization is an important technique to prevent overfitting.' },
          { language: 'ja', text: '正則化は過学習を防ぐための重要な技術です。' },
          { language: 'zh', text: '正则化是防止过拟合的重要技术。' }
        ],
        adminFeedback: { verdict: 'good' }
      },
      {
        id: '8',
        date: '2025-10-27 14:18:30',
        userId: 'student_104',
        sessionId: 'session_008',
        originalText: 'Attention mechanisms allow models to focus on relevant parts of the input.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '어텐션 메커니즘은 모델이 입력의 관련 부분에 집중할 수 있게 해줍니다.' },
          { language: 'ja', text: 'アテンションメカニズムは、モデルが入力の関連部分に焦点を当てることを可能にします。' },
          { language: 'zh', text: '注意力机制使模型能够专注于输入的相关部分。' }
        ]
      },
      {
        id: '9',
        date: '2025-10-27 14:15:45',
        userId: 'user002',
        sessionId: 'session_009',
        originalText: 'Transformer 아키텍처는 자연어 처리 분야에서 혁신을 가져왔습니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Transformer architecture has brought innovation to the field of natural language processing.' },
          { language: 'ja', text: 'Transformerアーキテクチャは自然言語処理分野に革新をもたらしました。' },
          { language: 'zh', text: 'Transformer架构为自然语言处理领域带来了创新。' }
        ],
        adminFeedback: { verdict: 'bad', feedbackText: 'Translation could be more concise' }
      },
      {
        id: '10',
        date: '2025-10-27 14:12:20',
        userId: 'student_105',
        sessionId: 'session_010',
        originalText: 'Batch normalization stabilizes training and accelerates convergence.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '배치 정규화는 훈련을 안정화시키고 수렴을 가속화합니다.' },
          { language: 'ja', text: 'バッチ正規化はトレーニングを安定させ、収束を加速します。' },
          { language: 'zh', text: '批量归一化稳定训练并加速收敛。' }
        ]
      },
      {
        id: '11',
        date: '2025-10-27 14:10:10',
        userId: 'student_106',
        sessionId: 'session_011',
        originalText: 'Gradient descent is an optimization algorithm used to minimize loss functions.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '경사 하강법은 손실 함수를 최소화하는 데 사용되는 최적화 알고리즘입니다.' },
          { language: 'ja', text: '勾配降下法は損失関数を最小化するために使用される最適化アルゴリズムです。' },
          { language: 'zh', text: '梯度下降是一种用于最小化损失函数的优化算法。' }
        ]
      },
      {
        id: '12',
        date: '2025-10-27 14:08:00',
        userId: 'user003',
        sessionId: 'session_012',
        originalText: '하이퍼파라미터 튜닝은 모델 성능을 최적화하는 핵심 과정입니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Hyperparameter tuning is a crucial process for optimizing model performance.' },
          { language: 'ja', text: 'ハイパーパラメータの調整は、モデルのパフォーマンスを最適化するための重要なプロセスです。' },
          { language: 'zh', text: '超参数调优是优化模型性能的关键过程。' }
        ]
      },
      {
        id: '13',
        date: '2025-10-27 14:05:30',
        userId: 'professor_001',
        sessionId: 'session_013',
        originalText: '재현성을 위해 실험 결과를 신중하게 기록해야 합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Results must be carefully documented to ensure reproducibility.' },
          { language: 'ja', text: '再現性のために実験結果を慎重に記録する必要があります。' },
          { language: 'zh', text: '为了重现性，必须仔细记录实验结果。' }
        ],
        adminFeedback: { verdict: 'good' }
      },
      {
        id: '14',
        date: '2025-10-27 14:02:15',
        userId: 'student_107',
        sessionId: 'session_014',
        originalText: 'Transfer learning leverages pre-trained models to improve performance on new tasks.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '전이 학습은 사전 훈련된 모델을 활용하여 새로운 작업에서 성능을 향상시킵니다.' },
          { language: 'ja', text: '転移学習は、事前に訓練されたモデルを活用して、新しいタスクで性能を向上させます。' },
          { language: 'zh', text: '迁移学习利用预训练模型来提高新任务的性能。' }
        ]
      },
      {
        id: '15',
        date: '2025-10-27 13:59:45',
        userId: 'student_108',
        sessionId: 'session_015',
        originalText: 'Data augmentation techniques can help increase the diversity of training data.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '데이터 증강 기술은 훈련 데이터의 다양성을 증가시키는 데 도움이 될 수 있습니다.' },
          { language: 'ja', text: 'データ拡張技術は、トレーニングデータの多様性を増やすのに役立ちます。' },
          { language: 'zh', text: '数据增强技术可以帮助增加训练数据的多样性。' }
        ]
      },
      {
        id: '16',
        date: '2025-10-27 13:56:20',
        userId: 'user001',
        sessionId: 'session_016',
        originalText: '드롭아웃은 랜덤하게 뉴런을 비활성화하여 과적합을 방지합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Dropout randomly deactivates neurons to prevent overfitting.' },
          { language: 'ja', text: 'ドロップアウトはニューロンをランダムに無効化して過学習を防ぎます。' },
          { language: 'zh', text: 'Dropout随机停用神经元以防止过拟合。' }
        ],
        adminFeedback: { verdict: 'bad', correctedResponse: 'Dropout randomly deactivates some neurons during training to prevent overfitting.' }
      },
      {
        id: '17',
        date: '2025-10-27 13:53:10',
        userId: 'student_109',
        sessionId: 'session_017',
        originalText: 'Cross-validation helps evaluate model performance more reliably.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '교차 검증은 모델 성능을 더 신뢰성 있게 평가하는 데 도움이 됩니다.' },
          { language: 'ja', text: '交差検証は、モデルのパフォーマンスをより信頼性高く評価するのに役立ちます。' },
          { language: 'zh', text: '交叉验证有助于更可靠地评估模型性能。' }
        ]
      },
      {
        id: '18',
        date: '2025-10-27 13:50:00',
        userId: 'student_110',
        sessionId: 'session_018',
        originalText: 'Feature engineering is crucial for machine learning model success.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '특성 공학은 머신러닝 모델의 성공에 중요합니다.' },
          { language: 'ja', text: '特徴量エンジニアリングは機械学習モデルの成功に重要です。' },
          { language: 'zh', text: '特征工程对机器学习模型的成功至关重要。' }
        ]
      },
      {
        id: '19',
        date: '2025-10-27 13:47:30',
        userId: 'professor_001',
        sessionId: 'session_019',
        originalText: '앙상블 방법은 여러 모델을 결합하여 예측 성능을 향상시킵니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Ensemble methods improve prediction performance by combining multiple models.' },
          { language: 'ja', text: 'アンサンブル手法は複数のモデルを組み合わせて予測性能を向上させます。' },
          { language: 'zh', text: '集成方法通过组合多个模型来提高预测性能。' }
        ]
      },
      {
        id: '20',
        date: '2025-10-27 13:44:15',
        userId: 'student_111',
        sessionId: 'session_020',
        originalText: 'Hyperparameters control the learning process but are not learned from data.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '하이퍼파라미터는 학습 과정을 제어하지만 데이터에서 학습되지 않습니다.' },
          { language: 'ja', text: 'ハイパーパラメータは学習プロセスを制御しますが、データから学習されません。' },
          { language: 'zh', text: '超参数控制学习过程，但不会从数据中学习。' }
        ],
        adminFeedback: { verdict: 'good' }
      },
      {
        id: '21',
        date: '2025-10-27 13:41:00',
        userId: 'user002',
        sessionId: 'session_021',
        originalText: '조기 종료는 과적합을 방지하기 위한 실용적인 기법입니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Early stopping is a practical technique to prevent overfitting.' },
          { language: 'ja', text: '早期停止は過学習を防ぐための実践的な技術です。' },
          { language: 'zh', text: '早停是一种防止过拟合的实用技术。' }
        ]
      },
      {
        id: '22',
        date: '2025-10-27 13:38:45',
        userId: 'student_112',
        sessionId: 'session_022',
        originalText: 'Natural language processing enables computers to understand human language.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '자연어 처리 기술은 컴퓨터가 인간의 언어를 이해할 수 있게 합니다.' },
          { language: 'ja', text: '自然言語処理は、コンピュータが人間の言語を理解できるようにします。' },
          { language: 'zh', text: '自然语言处理使计算机能够理解人类语言。' }
        ]
      },
      {
        id: '23',
        date: '2025-10-27 13:35:20',
        userId: 'student_113',
        sessionId: 'session_023',
        originalText: 'Computer vision allows machines to interpret and analyze visual information.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '컴퓨터 비전은 기계가 시각적 정보를 해석하고 분석할 수 있게 합니다.' },
          { language: 'ja', text: 'コンピュータビジョンは、機械が視覚情報を解釈し分析することを可能にします。' },
          { language: 'zh', text: '计算机视觉使机器能够解释和分析视觉信息。' }
        ]
      },
      {
        id: '24',
        date: '2025-10-27 13:32:10',
        userId: 'user003',
        sessionId: 'session_024',
        originalText: '강화 학습은 에이전트가 환경과 상호작용하며 학습합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Reinforcement learning involves an agent learning through interaction with its environment.' },
          { language: 'ja', text: '強化学習は、エージェントが環境と相互作用しながら学習します。' },
          { language: 'zh', text: '强化学习是智能体通过与环境互动来学习。' }
        ]
      },
      {
        id: '25',
        date: '2025-10-27 13:28:45',
        userId: 'professor_001',
        sessionId: 'session_025',
        originalText: 'GAN 생성적 적대 신경망은 두 네트워크가 서로 경쟁하며 학습합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'GAN generative adversarial networks involve two networks competing and learning from each other.' },
          { language: 'ja', text: 'GAN生成敵対ネットワークは、2つのネットワークが競い合い、互いに学習します。' },
          { language: 'zh', text: 'GAN生成对抗网络涉及两个网络相互竞争和学习。' }
        ],
        adminFeedback: { verdict: 'good' }
      },
      {
        id: '26',
        date: '2025-10-27 13:25:30',
        userId: 'student_114',
        sessionId: 'session_026',
        originalText: 'Model interpretability is important for understanding AI decisions.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '모델 해석 가능성은 AI 결정을 이해하는 데 중요합니다.' },
          { language: 'ja', text: 'モデルの解釈可能性は、AIの決定を理解するために重要です。' },
          { language: 'zh', text: '模型可解释性对于理解AI决策很重要。' }
        ]
      },
      {
        id: '27',
        date: '2025-10-27 13:22:15',
        userId: 'student_115',
        sessionId: 'session_027',
        originalText: 'Ethical considerations are crucial when deploying AI systems.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: 'AI 시스템을 배포할 때 윤리적 고려사항이 중요합니다.' },
          { language: 'ja', text: 'AIシステムを展開する際、倫理的配慮が重要です。' },
          { language: 'zh', text: '部署AI系统时，伦理考虑至关重要。' }
        ]
      },
      {
        id: '28',
        date: '2025-10-27 13:19:00',
        userId: 'user001',
        sessionId: 'session_028',
        originalText: '편향된 데이터셋은 모델의 공정성에 영향을 줄 수 있습니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Biased datasets can impact the fairness of models.' },
          { language: 'ja', text: '偏ったデータセットはモデルの公平性に影響を与える可能性があります。' },
          { language: 'zh', text: '有偏见的数据集可能会影响模型的公平性。' }
        ],
        adminFeedback: { verdict: 'bad', feedbackText: 'Translation lacks precision', correctedResponse: 'Biased datasets can negatively impact model fairness and lead to discriminatory outcomes.' }
      },
      {
        id: '29',
        date: '2025-10-27 13:15:45',
        userId: 'student_116',
        sessionId: 'session_029',
        originalText: 'Explainable AI techniques help build trust in machine learning systems.',
        originalLanguage: 'en',
        translations: [
          { language: 'ko', text: '설명 가능한 AI 기법은 머신러닝 시스템에 대한 신뢰를 구축하는 데 도움이 됩니다.' },
          { language: 'ja', text: '説明可能なAI技術は、機械学習システムへの信頼を構築するのに役立ちます。' },
          { language: 'zh', text: '可解释的AI技术有助于建立对机器学习系统的信任。' }
        ]
      },
      {
        id: '30',
        date: '2025-10-27 13:12:30',
        userId: 'professor_001',
        sessionId: 'session_030',
        originalText: '머신러닝 모델의 배포는 신중한 계획이 필요합니다.',
        originalLanguage: 'ko',
        translations: [
          { language: 'en', text: 'Deploying machine learning models requires careful planning.' },
          { language: 'ja', text: '機械学習モデルの展開には慎重な計画が必要です。' },
          { language: 'zh', text: '部署机器学习模型需要谨慎规划。' }
        ]
      }
    ]
    setTranslations(mockData)
    setFilteredTranslations(mockData)
  }, [])

  const languageNames: Record<string, string> = {
    'ko': '한국어',
    'en': 'English',
    'ja': '日本語',
    'zh': '中文 (Mandarin Chinese)',
    'es': 'Español',
    'hi': 'हिन्दी',
    'fr': 'Français',
    'ar': 'العربية',
    'pt': 'Português',
    'ru': 'Русский'
  }

  const getTranslationForLanguage = (entry: TranslationEntry, lang: string) => {
    if (entry.originalLanguage === lang) {
      return { language: lang, text: entry.originalText }
    }
    return entry.translations.find(t => t.language === lang)
  }

  const exportData = (format: 'CSV' | 'JSON') => {
    if (format === 'CSV') {
      // CSV export logic
      const csv = 'Original,Translation\n' + translations.map(t => 
        `${t.originalText},${getTranslationForLanguage(t, selectedLanguage)?.text || ''}`
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'translations.csv'
      a.click()
    }
  }

  const handleFeedbackClick = (entry: TranslationEntry, verdict: 'good' | 'bad') => {
    const rowLang = getLanguageForRow(entry.id)
    const translation = getTranslationForLanguage(entry, rowLang)
    
    setFeedbackModal({
      entryId: entry.id,
      originalText: entry.originalText,
      translatedText: translation?.text || '',
      verdict,
      existingFeedback: entry.adminFeedback
    })
    
    if (entry.adminFeedback) {
      setSupervisorFeedback(entry.adminFeedback.feedbackText || '')
      setCorrectedResponse(entry.adminFeedback.correctedResponse || '')
    } else {
      setSupervisorFeedback('')
      setCorrectedResponse('')
    }
  }

  const handleAdminFeedbackClick = (entry: TranslationEntry) => {
    if (entry.adminFeedback) {
      const rowLang = getLanguageForRow(entry.id)
      const translation = getTranslationForLanguage(entry, rowLang)
      
      setSupervisorFeedback(entry.adminFeedback.feedbackText || '')
      setCorrectedResponse(entry.adminFeedback.correctedResponse || '')
      setFeedbackModal({
        entryId: entry.id,
        originalText: entry.originalText,
        translatedText: translation?.text || '',
        verdict: entry.adminFeedback.verdict,
        existingFeedback: entry.adminFeedback
      })
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackModal) return
    
    if (feedbackModal.verdict === 'bad' && !supervisorFeedback && !correctedResponse) {
      alert('For negative feedback, please provide either supervisor feedback or corrected response.')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Update local state
      setTranslations(prev => prev.map(t => {
        if (t.id === feedbackModal.entryId) {
          return {
            ...t,
            adminFeedback: {
              verdict: feedbackModal.verdict,
              feedbackText: supervisorFeedback || undefined,
              correctedResponse: correctedResponse || undefined
            }
          }
        }
        return t
      }))
      
      setFeedbackModal(null)
      setSupervisorFeedback('')
      setCorrectedResponse('')
      
      alert('Admin feedback submitted successfully!')
    } catch (error) {
      console.error('Failed to submit admin feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelFeedback = () => {
    setFeedbackModal(null)
    setSupervisorFeedback('')
    setCorrectedResponse('')
  }

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>번역 기록</h2>
          <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>Recent Translations ({translations.length})</div>
        </div>
        <button
          onClick={() => {}}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--admin-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconRefresh size={20} />
        </button>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '16px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* View Mode */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--admin-card-bg)', borderRadius: '6px', padding: '4px' }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 12px',
              background: viewMode === 'table' ? 'var(--admin-primary)' : 'transparent',
              color: viewMode === 'table' ? 'white' : 'var(--admin-text)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            목록
          </button>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="date-desc">최신순</option>
          <option value="date-asc">과거순</option>
          <option value="user">사용자 순</option>
        </select>

        {/* Filter by Original Language */}
        <select
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="all">모든 언어</option>
          <option value="en">원문: English</option>
          <option value="zh">원문: Mandarin Chinese</option>
          <option value="es">원문: Spanish</option>
          <option value="hi">원문: Hindi</option>
          <option value="fr">원문: French</option>
          <option value="ar">원문: Arabic</option>
          <option value="pt">원문: Portuguese</option>
          <option value="ru">원문: Russian</option>
          <option value="ko">원문: Korean</option>
          <option value="ja">원문: Japanese</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--admin-card-bg)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '6px',
            fontSize: '14px',
            flex: 1,
            minWidth: '200px'
          }}
        />

        {/* Export */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            onChange={(e) => exportData(e.target.value as 'CSV' | 'JSON')}
            style={{
              padding: '8px 12px',
              background: 'var(--admin-card-bg)',
              color: 'var(--admin-text)',
              border: '1px solid var(--admin-border)',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            <option>CSV</option>
            <option>JSON</option>
          </select>
          <button
            onClick={() => exportData('CSV')}
            style={{
              padding: '8px 16px',
              background: 'var(--admin-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ 
        background: 'var(--admin-card-bg)', 
        borderRadius: '8px', 
        border: '1px solid var(--admin-border)',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>날짜</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>사용자 ID</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>세션 ID</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>원문</th>
              <th style={{ padding: '12px', textAlign: 'center', color: 'var(--admin-text-muted)', fontWeight: 600 }}>Admin</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <span>번역</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value)
                      // Apply to all rows
                      const allRows = filteredTranslations.slice(0, displayLimit).reduce((acc, entry) => {
                        acc[entry.id] = e.target.value
                        return acc
                      }, {} as Record<string, string>)
                      setRowSelectedLanguages(allRows)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--admin-card-bg)',
                      color: 'var(--admin-text)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="zh">🇨🇳 Mandarin Chinese</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="hi">🇮🇳 Hindi</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="ar">🇸🇦 Arabic</option>
                    <option value="pt">🇵🇹 Portuguese</option>
                    <option value="ru">🇷🇺 Russian</option>
                    <option value="ko">🇰🇷 Korean</option>
                    <option value="ja">🇯🇵 Japanese</option>
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.slice(0, displayLimit).map((entry) => {
              const rowLang = getLanguageForRow(entry.id)
              const translation = getTranslationForLanguage(entry, rowLang)
              return (
                <tr 
                  key={entry.id}
                  style={{ 
                    borderBottom: '1px solid var(--admin-border)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>{entry.date}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>{entry.userId}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text-muted)' }}>{entry.sessionId}</td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-border)', borderRadius: '4px', color: 'var(--admin-text-muted)' }}>
                        {languageNames[entry.originalLanguage] || entry.originalLanguage}
                      </span>
                      <span>{entry.originalText}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {entry.adminFeedback ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {entry.adminFeedback.verdict === 'good' ? (
                          <IconThumbsUp size={16} style={{ color: 'var(--admin-success)' }} />
                        ) : (
                          <IconThumbsDown size={16} style={{ color: 'var(--admin-danger)' }} />
                        )}
                        <button
                          onClick={() => handleAdminFeedbackClick(entry)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: 'var(--admin-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleFeedbackClick(entry, 'good')}
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Good"
                        >
                          <IconThumbsUp size={14} style={{ color: 'var(--admin-success)' }} />
                        </button>
                        <button
                          onClick={() => handleFeedbackClick(entry, 'bad')}
                          style={{
                            padding: '4px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Bad"
                        >
                          <IconThumbsDown size={14} style={{ color: 'var(--admin-danger)' }} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={rowLang}
                        onChange={(e) => setLanguageForRow(entry.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '4px 8px',
                          background: 'var(--admin-card-bg)',
                          color: 'var(--admin-text)',
                          border: '1px solid var(--admin-border)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="en">🇺🇸 English</option>
                        <option value="zh">🇨🇳 Mandarin Chinese</option>
                        <option value="es">🇪🇸 Spanish</option>
                        <option value="hi">🇮🇳 Hindi</option>
                        <option value="fr">🇫🇷 French</option>
                        <option value="ar">🇸🇦 Arabic</option>
                        <option value="pt">🇵🇹 Portuguese</option>
                        <option value="ru">🇷🇺 Russian</option>
                        <option value="ko">🇰🇷 Korean</option>
                        <option value="ja">🇯🇵 Japanese</option>
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--admin-primary)', flex: 1 }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-primary)', color: 'white', borderRadius: '4px' }}>
                          {languageNames[rowLang] || rowLang}
                        </span>
                        <span>{translation?.text || '-'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {translations.length > displayLimit && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setDisplayLimit(displayLimit + 10)}
            style={{
              padding: '12px 24px',
              background: 'var(--admin-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Load More ({translations.length - displayLimit} remaining)
          </button>
        </div>
      )}

      {/* Admin Feedback Modal */}
      {feedbackModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--admin-card-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--admin-text)' }}>
                Admin Feedback {feedbackModal.verdict === 'good' ? '👍' : '👎'}
              </h3>
              <button
                onClick={handleCancelFeedback}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--admin-text-secondary)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            {/* Original Text */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                원문:
              </p>
              <div style={{
                padding: '12px',
                background: 'rgba(9, 14, 34, 0.4)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--admin-text)' }}>
                  {feedbackModal.originalText}
                </p>
              </div>
            </div>
            
            {/* Translated Text */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                번역:
              </p>
              <div style={{
                padding: '12px',
                background: 'rgba(9, 14, 34, 0.4)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--admin-text)' }}>
                  {feedbackModal.translatedText}
                </p>
              </div>
            </div>
            
            {/* Supervisor Feedback */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--admin-text)' }}>
                Supervisor Feedback:
              </label>
              <textarea
                value={supervisorFeedback}
                onChange={(e) => setSupervisorFeedback(e.target.value)}
                placeholder="Explain what was wrong with this translation..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '12px',
                  background: 'rgba(9, 14, 34, 0.6)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            {/* Corrected Response */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--admin-text)' }}>
                Corrected Translation:
              </label>
              <textarea
                value={correctedResponse}
                onChange={(e) => setCorrectedResponse(e.target.value)}
                placeholder="Enter the corrected translation..."
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  background: 'rgba(9, 14, 34, 0.6)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={handleCancelFeedback}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--admin-border)',
                  color: 'var(--admin-text)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                  color: '#041220',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
