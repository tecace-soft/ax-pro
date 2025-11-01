import { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nProvider'
import { IconRefresh, IconThumbsUp, IconThumbsDown } from '../../ui/icons'
import { TRANSCRIPT_DATA } from '../../data/transcripts'

type ViewMode = 'card' | 'table'
type SortOption = 'date-desc' | 'date-asc' | 'user'

interface TranslationEntry {
  id: string
  date: string
  role: 'professor' | 'assistant'
  sessionNo: number
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

export default function TranslationHistory({ selectedTerm = '2025-fall', selectedSubject = 'machine-learning', selectedLanguage: controlledLanguage = 'en', onSelectedLanguageChange, availableLanguages = ['en','ko','ja','zh'] }: { selectedTerm?: string; selectedSubject?: string; selectedLanguage?: string; onSelectedLanguageChange?: (lang: string) => void; availableLanguages?: string[] }) {
  const { t, language } = useTranslation()
  const [translations, setTranslations] = useState<TranslationEntry[]>([])
  const [filteredTranslations, setFilteredTranslations] = useState<TranslationEntry[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<string>(controlledLanguage || 'en')
  // sync with parent prop
  if (controlledLanguage && controlledLanguage !== selectedLanguage) {
    setSelectedLanguage(controlledLanguage)
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [displayLimit, setDisplayLimit] = useState(10)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLecture, setSelectedLecture] = useState<string>('')
  const [feedbackModal, setFeedbackModal] = useState<AdminFeedbackModal | null>(null)
  const [supervisorFeedback, setSupervisorFeedback] = useState('')
  const [correctedResponse, setCorrectedResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // All rows follow the header-selected language

  // Mock data
  useEffect(() => {
    setTranslations([])
    setFilteredTranslations([])
  }, [])

  // Reset selected lecture when subject changes
  useEffect(() => {
    const videoEntries = Object.values(TRANSCRIPT_DATA).filter(v => v.subject === selectedSubject)
    if (videoEntries.length > 0) {
      setSelectedLecture(videoEntries[0].title)
    }
  }, [selectedSubject])

  // When filters change, (re)build mock data by subject/term using real YouTube transcripts
  useEffect(() => {
    if (!selectedSubject || !selectedTerm || !selectedLecture) return

    // Find all videos matching selected subject from transcript data
    const videoEntries = Object.values(TRANSCRIPT_DATA).filter(v => v.subject === selectedSubject)
    
    // Find video matching selected lecture title
    const videoData = videoEntries.find(v => v.title === selectedLecture) || null

    // Helper function to generate English translation
    const generateEnglishTranslation = (koText: string): string => {
      const lower = koText.toLowerCase()
      const fullText = koText
        
        // Instructor introductions
        if (lower.includes('이민수')) {
          if (lower.includes('고급')) {
            return 'Hello, I\'m Lee Min-su, and starting today, I\'ll be teaching an advanced machine learning algorithms course. In this course, we will cover advanced techniques beyond basic machine learning, including ensemble methodologies, gradient boosting, and random forests.'
          }
          return 'Hello, I\'m Lee Min-su, and I\'ll be teaching this machine learning course. I will introduce five major sections covering what machine learning is and various algorithms and methodologies used in machine learning.'
        }
        if (lower.includes('박준호')) {
          if (lower.includes('고급') || lower.includes('객체 탐지')) {
            return 'Hello, I\'m Park Jun-ho, and I\'ll be teaching an advanced computer vision techniques course. In this course, we will cover the latest computer vision technologies beyond basic CNNs, focusing on practical applications such as object detection, image segmentation, and face recognition.'
          }
          return 'Hello, I\'m Park Jun-ho, and I\'ll be teaching the computer vision course. Today we will cover the basics of deep learning, as deep learning and computer vision are more closely related than you might think.'
        }
        if (lower.includes('최영수')) {
          if (lower.includes('실무') || lower.includes('spark') || lower.includes('kafka')) {
            return 'Hello, I\'m Choi Young-su, and I\'ll be teaching the Big Data Analysis Practice course. The goal of this course is to develop practical skills for analyzing big data, based on theory, using big data processing frameworks like Hadoop and Spark.'
          }
          return 'Hello, I\'m Choi Young-su. Today we will discuss big data analysis and how it can be applied in various industries, particularly in sports.'
        }
        
        // Common lecture opening phrases
        if (lower.includes('지금부터') && (lower.includes('섹션') || lower.includes('다섯 가지'))) {
          return 'I will now present five major sections in this course. I will introduce what machine learning is and various algorithms and methodologies used in machine learning.'
        }
        if (lower.includes('체계적으로') && lower.includes('배워보시면')) {
          return 'Through this course, you will learn systematically about machine learning and artificial intelligence, which have been receiving much attention recently.'
        }
        if (lower.includes('강의 계획') && (lower.includes('간단히') || lower.includes('말씀드리겠습니다'))) {
          return 'Let me briefly explain the course plan. We will cover a total of five major topics.'
        }
        if (lower.includes('다섯 가지') && (lower.includes('주요 주제') || lower.includes('다루게'))) {
          return 'We will cover a total of five major topics in this course.'
        }
        if (lower.includes('소개를') && (lower.includes('짧게') || lower.includes('해드리면'))) {
          return 'Let me briefly introduce myself. I am currently a PhD student studying deep learning, which is a specialized field of machine learning, at Tech University AI Graduate School.'
        }
        if (lower.includes('강의 자료') && lower.includes('공유해드리겠습니다')) {
          return 'I will share the lecture materials after today\'s class. Please feel free to ask questions at any time.'
        }
        if (lower.includes('질문이 있으시면')) {
          return 'If you have any questions, please feel free to ask at any time.'
        }
        if (lower.includes('첫 번째로') && lower.includes('지도 학습')) {
          return 'First, I will introduce regression and classification problems in the field of supervised learning.'
        }
        if (lower.includes('라벨이 있는') || (lower.includes('지도 학습은') && lower.includes('라벨'))) {
          return 'Supervised learning is a method of training models using labeled data. Regression is the problem of predicting continuous values, while classification is the problem of predicting categorical values.'
        }
        if (lower.includes('앙상블 학습의 기본 개념')) {
          return 'I will explain the basic concepts of ensemble learning step by step. This is a method of combining predictions from multiple models to achieve better performance.'
        }
        if (lower.includes('실제 예제를 통해')) {
          return 'Please understand this through actual examples.'
        }
        if (lower.includes('결정 트리') && (lower.includes('데이터 구조') || lower.includes('한번 더'))) {
          return 'In this course, we will also review decision trees, which are important data structures. Decision trees are very intuitive and easy to interpret models that allow us to visualize the decision-making process through a tree structure.'
        }
        if (lower.includes('비지도 학습') && lower.includes('두 가지')) {
          return 'Now we will cover two main areas in the field of unsupervised learning. Unsupervised learning is a learning method that finds patterns in unlabeled data, with clustering and dimensionality reduction being the main techniques.'
        }
        if (lower.includes('클러스터링과 차원 축소')) {
          return 'Clustering and dimensionality reduction are the main techniques. I will compare the pros and cons of each technique.'
        }
        if (lower.includes('차원 축소에 대해서는') || (lower.includes('pca') && lower.includes('svd'))) {
          return 'Specifically, for dimensionality reduction, there are techniques called PCA and SVD. If you are preparing for graduate school or company interviews, this is one of the most frequently asked questions.'
        }
        if (lower.includes('주성분 분석') || (lower.includes('pca는') && lower.includes('고차원'))) {
          return 'PCA, or Principal Component Analysis, is a method for reducing high-dimensional data to low dimensions. SVD, or Singular Value Decomposition, is a method for reducing dimensions by decomposing matrices.'
        }
        if (lower.includes('저랑 같이 공부를 하고')) {
          return 'So I would like to study this part together with you. I will also show examples using actual data.'
        }
        if (lower.includes('총 다섯 가지 섹션으로 나누어져')) {
          return 'So this course is divided into a total of five sections. Each section includes practice time, so please don\'t miss it.'
        }
        if (lower.includes('강의를 해 드리려고 합니다')) {
          return 'I will teach you various methodologies and information about machine learning in this course.'
        }
        if (lower.includes('큰 흐름을 이해할 수가 있어서')) {
          return 'Because you can understand the big picture, I prepared this lecture.'
        }
        
        // Machine Learning specific translations
        if (lower.includes('머신러닝') || lower.includes('기계 학습')) {
          // Advanced ML course
          if (lower.includes('고급') || lower.includes('알고리즘')) {
            if (lower.includes('앙상블') || lower.includes('배깅') || lower.includes('부스팅')) {
              if (lower.includes('여러 약한') || lower.includes('강한 학습기')) {
                return 'Today we will focus on ensemble learning. Ensemble methods combine multiple weak learners to create a strong learner. It\'s important to clearly understand the differences between bagging, boosting, and stacking.'
              }
              if (lower.includes('랜덤 포레스트') || lower.includes('의사결정 트리')) {
                return 'Random Forest is a representative example of bagging, which is an ensemble of decision trees. Each tree learns independently, and the final prediction is determined by the average or vote of all trees, allowing us to create a much more stable and accurate model than a single tree.'
              }
              if (lower.includes('그래디언트 부스팅') || lower.includes('xgboost') || lower.includes('lightgbm')) {
                return 'Gradient boosting is a boosting technique that trains models sequentially. It learns from the errors of previous models to gradually improve performance. Modern gradient boosting frameworks like XGBoost, LightGBM, and CatBoost are widely used. We will compare the characteristics and pros/cons of each framework, and also learn hyperparameter tuning methods.'
              }
              if (lower.includes('스태킹') || lower.includes('메타')) {
                return 'Stacking is an ensemble technique that inputs the prediction results of multiple different models into a meta-learner. It uses the predictions of first-level models as features to train a final model. Combining different types of models can achieve better performance, for example, using linear models, tree models, and neural networks together.'
              }
              return 'Ensemble learning combines predictions from multiple models to achieve better performance. We will learn various ensemble techniques used in practical projects, covering both the mathematical background and practical application methods of each algorithm.'
            }
            if (lower.includes('성능 평가') || lower.includes('트레이드오프')) {
              return 'Today, we\'ll conclude the lecture by covering performance evaluation and comparison of ensemble models. We will verify the performance difference between single models and ensemble models using actual data, discuss when to use ensembles and in which situations they are effective, and consider the trade-off between computational cost and performance improvement.'
            }
          }
          
          // Basic ML course
          if (lower.includes('다섯 가지') || lower.includes('섹션')) {
            return 'I will introduce five major sections covering what machine learning is and various algorithms and methodologies used in machine learning. Recently, there has been growing interest in AI and artificial intelligence.'
          }
          if (lower.includes('테크대학교') || lower.includes('대학원') || lower.includes('박사')) {
            return 'I am currently a PhD student at Tech University AI Graduate School, studying deep learning, which is a specialized field of machine learning. To understand deep learning and AI, you should first understand machine learning.'
          }
          if (lower.includes('지도 학습') && (lower.includes('회기') || lower.includes('회귀')) && lower.includes('분류')) {
            return 'In supervised learning, we will cover regression and classification problems. These are two major areas in supervised learning.'
          }
          if (lower.includes('앙상블') || (lower.includes('성능') && lower.includes('높일'))) {
            return 'We will learn about ensemble learning techniques that can improve model performance. In this process, we will also cover decision trees, which are important data structures.'
          }
          if (lower.includes('비지도 학습') || lower.includes('언슈퍼바이스')) {
            return 'In unsupervised learning, we will cover two main areas. First is dimensionality reduction, which is often used in preprocessing.'
          }
          if (lower.includes('차원 축소') && (lower.includes('pca') || lower.includes('svd'))) {
            return 'We will study dimensionality reduction techniques, including PCA and SVD, which are commonly asked about in graduate school interviews or company interviews. Let\'s study this together.'
          }
          return 'Today we will learn about machine learning concepts and applications. Machine learning involves understanding how machines can learn from data.'
        }
        
        // Computer Vision / Deep Learning
        if ((lower.includes('딥러닝') || lower.includes('신경망')) && (lower.includes('비전') || lower.includes('컴퓨터'))) {
          // Advanced CV course
          if (lower.includes('고급') || lower.includes('객체 탐지') || lower.includes('yolo') || lower.includes('r-cnn')) {
            if (lower.includes('객체 탐지')) {
              if (lower.includes('위치를 찾고') || lower.includes('클래스를 분류')) {
                return 'Today we will focus on the object detection problem. Object detection involves finding the location of objects within an image and classifying their classes. R-CNN series models detect objects in two stages: first proposing regions of interest, then performing classification for each region.'
              }
              if (lower.includes('단일 단계') || lower.includes('속도와 정확도')) {
                return 'YOLO is a faster method that detects objects in a single stage. It\'s important to understand the trade-off between speed and accuracy.'
              }
            }
            if (lower.includes('이미지 분할') || lower.includes('세그멘테이션') || lower.includes('u-net')) {
              if (lower.includes('픽셀 단위')) {
                return 'Image segmentation is the problem of distinguishing objects at the pixel level. Segmentation is divided into semantic segmentation and instance segmentation. U-Net is a very successful architecture in medical image segmentation.'
              }
              if (lower.includes('인코더-디코더') || lower.includes('mask r-cnn')) {
                return 'The encoder-decoder structure enables accurate pixel-level predictions. Mask R-CNN is an integrated model that performs both detection and segmentation simultaneously.'
              }
            }
            if (lower.includes('얼굴 인식') || lower.includes('생체 인식') || lower.includes('arcface')) {
              return 'Face recognition and biometric technology are also important application areas. The process consists of face detection, face alignment, feature extraction, and matching. Recent face recognition models like ArcFace and CosFace show very high accuracy.'
            }
            if (lower.includes('vision transformer') || lower.includes('vit') || lower.includes('deit') || lower.includes('attention')) {
              return 'Recently, Vision Transformer has received great attention in the computer vision field. It applies the Transformer architecture to images instead of CNNs. The patch-based approach converts images into tokens, and the attention mechanism captures long-range dependencies in images well.'
            }
            return 'This advanced course covers the latest computer vision technologies, including object detection, image segmentation, and face recognition, with practical applications.'
          }
          
          // Basic CV course
          if (lower.includes('가까워') || lower.includes('관련')) {
            return 'Deep learning and computer vision are more closely related than you might think. Computer vision involves processing photo data, video data, and extracting features from image data to create models.'
          }
          if (lower.includes('도구') || lower.includes('발전')) {
            return 'The computer vision field has advanced significantly recently through deep learning. Deep learning has penetrated many areas, but it became most popular and famous through computer vision technologies.'
          }
          if (lower.includes('인공신경망') || lower.includes('학습하는 훈련')) {
            return 'Today we will cover the basics of deep learning and artificial neural networks, as well as training algorithms used to train these neural networks.'
          }
          return 'This lecture covers computer vision concepts, including how deep learning has advanced this field significantly.'
        }
        
        // AI Introduction
        if (lower.includes('인공지능') || lower.includes('ai')) {
          // Practical AI Applications course
          if (lower.includes('실전') || lower.includes('응용') || lower.includes('bert') || lower.includes('gpt') || lower.includes('nlp')) {
            if (lower.includes('자연어 처리') || lower.includes('트랜스포머') || lower.includes('bert') || lower.includes('gpt')) {
              if (lower.includes('혁신') || lower.includes('사전 학습')) {
                return 'In the field of natural language processing, transformer models have brought innovation. Pre-trained language models like BERT and GPT show the best performance in many tasks.'
              }
              if (lower.includes('감정 분석') || lower.includes('텍스트 분류') || lower.includes('챗봇')) {
                return 'We will cover various NLP tasks such as sentiment analysis, text classification, and question answering. We will also discuss the uniqueness and difficulties of Korean language processing, and gain practical experience through chatbot development examples.'
              }
            }
            if (lower.includes('음성 인식') || lower.includes('asr') || lower.includes('tts') || lower.includes('whisper')) {
              if (lower.includes('스마트 스피커') || lower.includes('자동 자막')) {
                return 'Speech recognition technology is utilized in smart speakers, automatic subtitle generation, and more. There are ASR (Automatic Speech Recognition) which converts speech to text, and TTS (Text-to-Speech) which converts text to speech.'
              }
              if (lower.includes('whisper') || lower.includes('다국어')) {
                return 'Recent models like Whisper show excellent performance in multilingual speech recognition. We will learn speech data preprocessing and feature extraction methods, and explain the process of building a speech recognition system step by step.'
              }
            }
            if (lower.includes('추천 시스템') || lower.includes('협업 필터링') || lower.includes('콘텐츠 기반')) {
              return 'Recommendation systems are core features of platforms like Netflix and YouTube. It\'s important to understand the differences between collaborative filtering and content-based filtering. We will explore latest techniques including matrix factorization and deep learning-based recommendation models, and learn solutions to the cold start problem and data sparsity issues.'
            }
            if (lower.includes('mlops') || lower.includes('docker') || lower.includes('kubernetes') || lower.includes('배포')) {
              return 'Model deployment and operation are crucial parts of actual services. We need to understand concepts such as model serving, monitoring, and retraining. MLOps is a methodology for managing the lifecycle of machine learning models. We will learn model deployment methods using Docker and Kubernetes, and explore systems for detecting model performance degradation and automatic retraining.'
            }
            return 'This course covers AI technologies used in real industrial settings, going beyond theory. We will examine various application areas such as natural language processing, speech recognition, and recommendation systems, and learn how each technology is integrated into actual services.'
          }
          
          // AI Introduction course
          if (lower.includes('개론') && lower.includes('다뤄')) {
            return 'Hello, today we will cover an introduction to artificial intelligence. What comes to mind when you think of AI? Perhaps images from movies like Terminator?'
          }
          if (lower.includes('알파고') || lower.includes('알파 고')) {
            if (lower.includes('2016') || lower.includes('2017')) {
              return 'The most impressive event was AlphaGo. Around 2016-2017, AlphaGo was introduced as an artificial intelligence program that plays Go instead of humans. It competed against Lee Sedol, the world\'s top professional Go player.'
            }
            if (lower.includes('이세돌') || lower.includes('세돌')) {
              return 'At the time, many wondered what Google was thinking by challenging Lee Sedol with an AI program. The AI of the past seemed very limited, but AlphaGo proved to be world-class.'
            }
            return 'AlphaGo won 4 out of 5 matches against Lee Sedol. AlphaGo has continued to evolve, and with AlphaGo Zero, AI has begun to far surpass human levels.'
          }
          if (lower.includes('침투') || lower.includes('일상')) {
            return 'Step by step through this course, we will explore what artificial intelligence is and how AI has infiltrated our daily lives. AI is already deeply integrated into our daily lives.'
          }
          return 'We will explore artificial intelligence topics, understanding the relationship between AI, machine learning, and deep learning.'
        }
        
        // Big Data Analysis
        if (lower.includes('빅데이터') || (lower.includes('데이터') && lower.includes('분석'))) {
          // Practical Big Data course
          if (lower.includes('실무') || lower.includes('spark') || lower.includes('hadoop') || lower.includes('kafka')) {
            if (lower.includes('spark') || lower.includes('rdd') || lower.includes('dataframe')) {
              if (lower.includes('분산 데이터') || lower.includes('rdd')) {
                return 'Apache Spark is a core tool for distributed data processing. We will learn the concepts and usage of RDD, DataFrame, and Dataset, and explore optimization techniques for efficiently processing large-scale data.'
              }
              if (lower.includes('spark sql') || lower.includes('구조화된 데이터')) {
                return 'We will learn how to analyze structured data using Spark SQL, and conduct performance optimization practice with actual large-scale datasets. We will also cover running Spark in cluster environments.'
              }
            }
            if (lower.includes('스트리밍') || lower.includes('kafka') || lower.includes('실시간')) {
              if (lower.includes('스트리밍 데이터') || lower.includes('실시간으로')) {
                return 'Streaming data processing is also an important topic in big data analysis. We will learn how to process data that arrives in real-time. We will integrate Kafka and Spark Streaming to build real-time analysis pipelines.'
              }
              if (lower.includes('윈도우 연산') || lower.includes('상태 관리')) {
                return 'Through window operations and state management, we will learn how to derive meaningful insights. We will conduct practice using actual IoT sensor data or log data, and also explore methods for building real-time notification systems.'
              }
            }
            if (lower.includes('시각화') || lower.includes('tableau') || lower.includes('power bi') || lower.includes('matplotlib')) {
              if (lower.includes('비즈니스 인텔리전스') || lower.includes('tableau')) {
                return 'Big data visualization is an important step in making analysis results easy to understand. We will use business intelligence tools like Tableau and Power BI, and learn advanced visualization techniques using Python\'s Matplotlib, Seaborn, and Plotly.'
              }
              if (lower.includes('대시보드') || lower.includes('데이터 스토리텔링')) {
                return 'We will learn how to create interactive dashboards for actual decision-making, and explore techniques for effectively communicating insights through data storytelling.'
              }
            }
            if (lower.includes('프로젝트') || lower.includes('프로세스') || lower.includes('체크리스트')) {
              return 'We will comprehensively summarize the entire process of big data analysis projects, covering everything from requirements analysis to result report writing. We will also learn about project management and team collaboration methods, and develop practical sense through actual corporate big data analysis cases.'
            }
            return 'This practical course aims to develop practical skills for analyzing big data based on theory. We will use big data processing frameworks like Hadoop and Spark, and build entire analysis pipelines using actual datasets.'
          }
          
          // Basic Big Data course
          if (lower.includes('수학') && lower.includes('통계')) {
            return 'Big data analysis is a complex process of analyzing large amounts of data using mathematical and statistical tools. Through this, we can discover new information such as hidden patterns and correlations.'
          }
          if (lower.includes('스포츠') && lower.includes('적용')) {
            return 'How is big data analysis importantly applied in sports? Primarily, it is used for performance measurement and evaluation of teams and athletes.'
          }
          if (lower.includes('퍼포먼스') || lower.includes('측정')) {
            return 'Big data analysis is used to measure game performance of teams or athletes, extract physiological and biomechanical data through laboratory research, and provide feedback on athlete performance.'
          }
          if (lower.includes('수집') && lower.includes('분류')) {
            return 'The first step in big data analysis is data collection and classification. Data must come from reliable sources, such as experimental research, game statistics, or service statistics.'
          }
          if (lower.includes('필터링') || lower.includes('클리닝') || lower.includes('노이즈')) {
            return 'The second step is data filtering and cleaning. When collecting large amounts of data, there are usually noise or missing values. Missing data should be removed, and appropriate filtering algorithms should be used to remove noise.'
          }
          if (lower.includes('예측') || lower.includes('선형 회귀')) {
            return 'For example, we can calculate averages or check data distribution. Another approach is predictive analysis using linear regression or complex machine learning models to predict future changes.'
          }
          return 'Today we will discuss big data analysis and how it can be applied in various industries, particularly in sports.'
        }
        
        // Logistic Regression / Statistics
        if (lower.includes('로지스틱') || (lower.includes('회귀') && lower.includes('분류'))) {
          if (lower.includes('두 번째 강의') || lower.includes('첫 번째 시간')) {
            return 'Hello, this is our second lecture session. Today we will cover classification models, which along with regression, are one of the major areas in supervised learning.'
          }
          if (lower.includes('5가지') || lower.includes('다섯')) {
            return 'We will cover five topics today: first, logistic regression, then extending it to multi-class classification, followed by SVM, decision trees, and LDA models.'
          }
          if (lower.includes('시그모이드') || lower.includes('소프트맥스')) {
            if (lower.includes('출력값') || lower.includes('0과 1')) {
              return 'The sigmoid function compresses output values between 0 and 1. This allows us to interpret it as a probability. We set a threshold to determine the final classification result.'
            }
            if (lower.includes('다중분류') || lower.includes('세 개 이상')) {
              return 'In multi-class classification situations where there are three or more classes, we must use models that employ the softmax function. The softmax function creates a probability distribution over multiple classes. Understanding these differences is an important first step in solving classification problems.'
            }
            return 'In classification problems, for binary classification where there are two categories, we use the sigmoid function. For multi-class classification with more than two classes, we use the softmax function.'
          }
          if (lower.includes('연속값') || lower.includes('이산값')) {
            return 'In supervised learning, depending on whether y is a continuous value or a discrete categorical value, we solve regression or classification problems. It\'s important to clearly understand the difference between these two types of problems.'
          }
          if (lower.includes('svm') || lower.includes('결정 트리') || lower.includes('lda')) {
            return 'We will compare the characteristics and pros/cons of each model, including SVM, decision trees, and LDA. We will also provide guidelines on when to use which model, and include practice using actual datasets.'
          }
          if (lower.includes('차이점') || lower.includes('첫걸음')) {
            return 'Understanding these differences is an important first step in solving classification problems. We will visually understand each function through formulas and graphs, and also show actual code examples.'
          }
          return 'Today we will study logistic regression analysis, building on the regression concepts we learned in the previous session.'
        }
        
        // Common lecture phrases
        if (lower.includes('안녕하') && !lower.includes('이민수') && !lower.includes('박준호') && !lower.includes('최영수')) {
          if (lower.includes('오늘부터') || lower.includes('시작하겠습니다')) {
            return 'Hello, starting today, I\'ll begin teaching this course.'
          }
          if (lower.includes('환영합니다') || lower.includes('오신 것을')) {
            return 'Hello, welcome to this course.'
          }
          return 'Hello, welcome to today\'s lecture.'
        }
        if (lower.includes('강의') && lower.includes('시작') && !lower.includes('머신러닝') && !lower.includes('비전')) {
          return 'Starting today, I will begin teaching this course. In this course, we will cover advanced techniques and practical applications.'
        }
        if (lower.includes('다음 예제') || lower.includes('다음 시간')) {
          if (lower.includes('데이터를 사용한 실습')) {
            return 'Next time, we will conduct practice using actual data.'
          }
          return 'Let\'s move on to the next example.'
        }
        if (lower.includes('노트') && lower.includes('열고')) return 'Please open your notebook and follow along.'
        if (lower.includes('함께') && lower.includes('공부')) return 'Let\'s study together.'
        if (lower.includes('예를') && lower.includes('들면')) return 'For example,'
        if (lower.includes('오늘') && lower.includes('강의') && lower.includes('마지막')) {
          return 'To conclude today\'s lecture, we will cover performance evaluation and comparison.'
        }
        if (lower.includes('다음 강의') || lower.includes('다음 시간에는')) {
          return 'In the next lecture, we will move on to deep learning-based models.'
        }
        
        // Additional common patterns
        if (lower.includes('실제') && lower.includes('프로젝트')) {
          return 'We will share best practices for implementing this in actual projects.'
        }
        if (lower.includes('실습') || lower.includes('실제 데이터')) {
          return 'We will conduct hands-on practice using actual datasets.'
        }
        if (lower.includes('베스트 프랙티스') || lower.includes('실전')) {
          return 'We will share best practices from actual projects as we conclude the lecture.'
        }
        if (lower.includes('앞으로의') || lower.includes('트렌드')) {
          return 'We will also discuss future technology trends and development directions.'
        }
        
        // Default: try to extract key concepts and provide meaningful translation
        const concepts: string[] = []
        if (lower.includes('머신러닝') || lower.includes('기계')) concepts.push('machine learning')
        if (lower.includes('딥러닝')) concepts.push('deep learning')
        if (lower.includes('인공지능') || lower.includes('ai')) concepts.push('AI')
        if (lower.includes('비전') || lower.includes('컴퓨터 비전')) concepts.push('computer vision')
        if (lower.includes('회귀')) concepts.push('regression')
        if (lower.includes('분류')) concepts.push('classification')
        if (lower.includes('학습')) concepts.push('learning')
        if (lower.includes('모델')) concepts.push('model')
        if (lower.includes('데이터')) concepts.push('data')
        if (lower.includes('분석')) concepts.push('analysis')
        if (lower.includes('알고리즘')) concepts.push('algorithms')
        if (lower.includes('기법') || lower.includes('방법')) concepts.push('techniques')
        if (lower.includes('프레임워크')) concepts.push('frameworks')
        if (lower.includes('강의')) concepts.push('lecture')
        if (lower.includes('설명')) concepts.push('explanation')
        if (lower.includes('예제') || lower.includes('예시')) concepts.push('example')
        if (lower.includes('이해')) concepts.push('understanding')
        if (lower.includes('배우')) concepts.push('learning')
        
        // Try to provide meaningful translation based on context
        if (concepts.length > 0) {
          // Try to provide more context-based translation
          if (fullText.length > 100) {
            // For longer texts, provide a summary
            return `We will discuss ${concepts.join(', ')} in detail. This section covers important concepts and practical applications.`
          }
          return `We will discuss ${concepts.join(', ')}. This topic covers important concepts and practical applications.`
        }
        
        // Final fallback - provide a generic but meaningful translation
        // Never return [Translation: ...] format
        if (lower.includes('강의') || lower.includes('수업')) {
          return 'In this lecture, we will cover important concepts and practical examples.'
        }
        if (lower.includes('설명') || lower.includes('알아보')) {
          return 'I will explain this concept and help you understand it through examples.'
        }
        if (lower.includes('학습') || lower.includes('배우')) {
          return 'We will learn about this topic and apply it to practical problems.'
        }
        
        // Last resort: provide a generic but professional translation
        return 'This section covers important concepts and information relevant to the course.'
    }
    
    // Direct translation from Korean to target language
    const translateKoreanToLanguage = (koText: string, targetLang: string): string => {
      if (targetLang === 'ko') return koText
      if (targetLang === 'en') return generateEnglishTranslation(koText)
      
      const lower = koText.toLowerCase()
      
      // Japanese translations
      if (targetLang === 'ja') {
        if (lower.includes('이민수') && lower.includes('머신러닝')) {
          if (lower.includes('고급')) {
            return 'こんにちは、私はイ・ミンスと申します。今日から高度な機械学習アルゴリズムのコースを担当します。このコースでは、基本機械学習を超えた高度な技術、アンサンブル手法、勾配ブースティング、ランダムフォレストなどをカバーします。'
          }
          return 'こんにちは、機械学習・機械学習コースを担当するイ・ミンスと申します。機械学習とは何か、機械学習で使用されるさまざまなアルゴリズムと方法論を紹介する5つの主要セクションを提供します。'
        }
        if (lower.includes('지금부터') && lower.includes('섹션')) {
          return 'これから、5つの主要セクションを提供します。機械学習とは何か、機械学習で使用されるさまざまなアルゴリズムと方法論を紹介します。'
        }
        if (lower.includes('체계적으로') && lower.includes('배워보시면')) {
          return 'このコースを通じて、最近非常に注目されている機械学習と人工知能について体系的に学ぶことができます。'
        }
        if (lower.includes('강의 계획')) {
          return 'コース計画について簡単に説明します。合計5つの主要トピックを扱う予定です。'
        }
        if (lower.includes('다섯 가지') && lower.includes('주요 주제')) {
          return 'このコースでは、合計5つの主要トピックを扱う予定です。'
        }
        if (lower.includes('소개를') && lower.includes('짧게')) {
          return '簡単に自己紹介します。私は現在、テック大学AI大学院で深層学習という機械学習の専門分野を研究している博士課程の学生です。'
        }
        if (lower.includes('머신러닝') || lower.includes('기계 학습')) {
          return '今日は機械学習の概念と応用について学びます。機械学習は、機械がデータからどのように学習できるかを理解することです。'
        }
        if (lower.includes('딥러닝')) {
          return '深層学習とコンピュータビジョンは想像以上に密接に関連しています。コンピュータビジョンは、写真データ、動画データを処理し、画像データから特徴を抽出してモデルを作成することを含みます。'
        }
        if (lower.includes('인공지능') || lower.includes('ai')) {
          return '人工知能のトピックを探求し、AI、機械学習、深層学習の関係を理解します。'
        }
        if (lower.includes('앙상블')) {
          return 'アンサンブル学習は、複数のモデルの予測を組み合わせてより良い性能を実現する手法です。'
        }
        if (lower.includes('지도 학습')) {
          return '教師あり学習では、回帰と分類の問題を扱います。これらは教師あり学習の2つの主要分野です。'
        }
        if (lower.includes('비지도 학습')) {
          return '教師なし学習では、2つの主要分野を扱います。まずは、前処理でよく使用される次元削減です。'
        }
        if (lower.includes('pca') || lower.includes('svd')) {
          return 'PCAとSVDと呼ばれる次元削減技術を研究します。これは大学院や企業の面接で非常に頻繁に出題される質問の1つです。'
        }
        if (lower.includes('안녕하세요')) {
          return 'こんにちは、今日の講義へようこそ。'
        }
        if (lower.includes('강의를 진행하겠습니다') || lower.includes('강의를 해 드리려고 합니다')) {
          return 'このコースで、機械学習に関するさまざまな方法論と情報を提供します。'
        }
        if (lower.includes('최근에 ai') || lower.includes('관심도가')) {
          return '最近、AIと人工知能への関心が非常に高まっています。'
        }
        if (lower.includes('박준호') && lower.includes('비전')) {
          return 'こんにちは、コンピュータビジョンの講義を担当するパク・ジュンホと申します。今日は、深層学習の基礎について扱います。深層学習とビジョンは想像以上に密接に関連しています。'
        }
        if (lower.includes('컴퓨터 비전') || (lower.includes('비전') && lower.includes('딥러닝'))) {
          return 'ビジョンとは、実際には写真データや動画データを扱うコンピュータビジョン分野です。画像認識、物体検出、画像分割など、さまざまな作業が含まれます。'
        }
        if (lower.includes('회귀와 분류')) {
          return '教師あり学習の分野では、回帰と分類という問題について紹介します。'
        }
        if (lower.includes('결정 트리') && lower.includes('데이터 구조')) {
          return 'このコースでは、決定木というデータ構造について再度確認します。決定木は非常に直感的で解釈しやすいモデルです。'
        }
        if (lower.includes('클러스터링')) {
          return 'クラスタリングと次元削減が主要な技術です。各技術の長所と短所を比較します。'
        }
        if (lower.includes('주성분 분석')) {
          return 'PCAは主成分分析で、高次元データを低次元に削減する方法です。SVDは特異値分解で、行列を分解して次元を減らす方法です。'
        }
        if (lower.includes('실제 데이터를 사용한')) {
          return '実際のデータを使用した例もお見せします。'
        }
        if (lower.includes('다섯 가지 섹션으로 나누어져')) {
          return 'この講義は合計5つのセクションに分かれています。各セクションには実習時間も含まれているので、お見逃しなく。'
        }
        if (lower.includes('질문이 있으시면')) {
          return 'ご質問がございましたら、いつでもお聞かせください。'
        }
        if (lower.includes('강의 자료')) {
          return '今日の授業後、講義資料を共有します。'
        }
        if (lower.includes('큰 흐름을 이해')) {
          return '大きな流れを理解できるため、この講義を準備しました。'
        }
        if (lower.includes('이렇게 기계 학습에 대한 다양한 방법론')) {
          return 'このように、機械学習に関するさまざまな方法論と情報を今回提供します。'
        }
        if (lower.includes('테크대학교 ai 대학원의 박사 과정')) {
          return '私は現在、テック大学AI大学院の博士課程で勉強している学生です。'
        }
        if (lower.includes('딥러닝이라고 하는 머신 러닝의 세부 분야')) {
          return '私は、機械学習の専門分野である深層学習を研究しています。'
        }
        if (lower.includes('회귀는 연속적인 값을 예측')) {
          return '回帰は連続値を予測する問題であり、分類はカテゴリ値を予測する問題です。'
        }
        if (lower.includes('앙상블 학습이라고 하는 성능을 더 높일 수 있는')) {
          return 'そして、教師あり学習の中には、アンサンブル学習と呼ばれる、性能をさらに向上させるためのさまざまなテクニックがあります。'
        }
        if (lower.includes('트리 구조를 통해 의사결정 과정을 시각화')) {
          return 'ツリー構造を通じて意思決定プロセスを視覚化できます。'
        }
        if (lower.includes('각 기법의 장단점을 비교')) {
          return '各技法の長所と短所を比較します。'
        }
        if (lower.includes('대학원을 준비하시거나 기업에 면접')) {
          return '大学院を準備したり、企業の面接を準備する際に、非常に頻繁に出題される質問の1つです。'
        }
        if (lower.includes('실제 데이터를 사용한 예제도 함께 보여드리겠습니다')) {
          return '実際のデータを使用した例も一緒にお見せします。'
        }
        if (lower.includes('각 섹션마다 실습 시간을 포함')) {
          return '各セクションには実習時間も含まれているので、お見逃しなく。'
        }
        if (lower.includes('비전을 수업하는데 왜 갑자기 딥러닝')) {
          return 'ビジョンを授業するのに、なぜ突然深層学習という用語が出てきたのか、疑問に思われるかもしれません。'
        }
        if (lower.includes('오늘 강의에서는 딥러닝의 개론')) {
          return '今日の講義では、深層学習の概論について扱います。'
        }
        if (lower.includes('이미지 인식, 객체 탐지, 이미지 분할')) {
          return '画像認識、物体検出、画像分割など、さまざまな作業が含まれます。'
        }
        if (lower.includes('최근 몇 년간 이 분야의 발전이 특히 두드러졌습니다')) {
          return '最近数年間、この分野の発展が特に顕著でした。'
        }
        if (lower.includes('모델을 만드는 것을 집중으로 하는')) {
          return 'モデルを作成することに焦点を当てた研究分野です。'
        }
        if (lower.includes('사실은 가장 인기 있게 되고 유명해지게 된 계기도')) {
          return '実際、最も人気があり有名になったきっかけも、ビジョンを中心に発展した技術に基づいて広く知られるようになったものです。'
        }
        if (lower.includes('비전 기술을 이제 다루려고 하면 딥러닝은 뗄 수 없는 기술')) {
          return '事実、ビジョン技術を扱おうとすると、深層学習は切り離せない技術になりました。'
        }
        if (lower.includes('딥러닝 없이는 현대적인 컴퓨터 비전 연구가 거의 불가능')) {
          return '深層学習なしでは、現代的なコンピュータビジョン研究はほとんど不可能です。'
        }
        if (lower.includes('일단 비전을 수업하기 전에 딥러닝이란 것이 무엇인지를')) {
          return 'まず、ビジョンを授業する前に、深層学習とは何かを簡単に確認してから進めます。'
        }
        if (lower.includes('기본 개념부터 차근차근 설명하겠습니다')) {
          return '基本概念から段階的に説明します。'
        }
        if (lower.includes('여러분이 이해하기 쉽도록 예제를 많이 사용')) {
          return '皆さんが理解しやすいように、多くの例を使用します。'
        }
        if (lower.includes('인공신경망의 기본 구조를 이해하는 것이 중요')) {
          return '人工ニューラルネットワークの基本構造を理解することが重要です。'
        }
        if (lower.includes('입력층, 은닉층, 출력층의 역할')) {
          return '入力層、隠れ層、出力層の役割を説明します。'
        }
        if (lower.includes('활성화 함수의 종류와 특징')) {
          return '活性化関数の種類と特徴についても学びます。'
        }
        if (lower.includes('학습 과정에서 발생하는 문제점과 해결 방법')) {
          return '学習過程で発生する問題と解決方法についても扱います。'
        }
        if (lower.includes('경사 하강법, 확률적 경사 하강법')) {
          return '勾配降下法、確率的勾配降下法など、さまざまな最適化技法を学びます。'
        }
        if (lower.includes('오버피팅 문제와 이를 해결하는 정규화 방법')) {
          return 'オーバーフィッティングの問題とそれを解決する正則化方法についても説明します。'
        }
        if (lower.includes('배치 정규화, 드롭아웃 등의 기법')) {
          return 'バッチ正規化、ドロップアウトなどの技法を実際の例とともに示します。'
        }
        if (lower.includes('성능 평가 방법도 함께 다루겠습니다')) {
          return '性能評価方法についても一緒に扱います。'
        }
        if (lower.includes('여러분들은 인공지능 하면 어떤 것이 떠오르시나요')) {
          return '皆さんは、人工知能と言えば何を思い浮かべますか？'
        }
        if (lower.includes('영화 속에 나오는 터미네이터')) {
          return '映画に出てくるターミネーターのような悪い人工知能がすべてを制御するような人工知能を思い浮かべますか？'
        }
        if (lower.includes('명확하게 그리고 정확하게 알지 못하는데')) {
          return 'しかし、その意味と実際には、人々はおそらく人工知能について明確にそして正確に知らないかもしれません。'
        }
        if (lower.includes('인공지능의 정의와 역사를 배워보겠습니다')) {
          return '今日の講義を通じて、人工知能の定義と歴史を学びます。'
        }
        if (lower.includes('인공지능의 범위와 한계에 대해서도 논의')) {
          return '人工知能の範囲と限界についても議論します。'
        }
        if (lower.includes('차근차근 이번 코스를 통해서')) {
          return '段階的に、このコースを通じて、人工知能とは何か、そして私たちの日常生活の中で人工知能がどのように浸透しているかを探ります。'
        }
        if (lower.includes('이미 우리 생활 속에 침투해 있습니다')) {
          return 'ご存知のように、またはご存知でない方もいるかもしれませんが、人工知能はすでに私たちの生活に浸透しています。'
        }
        if (lower.includes('자율 주행 자동차')) {
          return 'スマートフォンの音声認識、推薦システム、自動運転車など、多くの場所で使用されています。'
        }
        if (lower.includes('구글 딥마인드에서 바둑이라는 게임을 하나 들고 왔어요')) {
          return '約2016年から2017年に、Google DeepMindが囲碁というゲームを持ってきました。'
        }
        if (lower.includes('이 사건은 인공지능의 발전에 중요한 이정표')) {
          return 'この出来事は、人工知能の発展における重要なマイルストーンとなりました。'
        }
        if (lower.includes('대중들에게 인공지능의 가능성을 보여준 사건')) {
          return '大衆に人工知能の可能性を示した出来事でした。'
        }
        if (lower.includes('바둑 대결을 인공지능이 대신해주는 프로그램')) {
          return 'このAlphaGoは、囲碁対決を人工知能が代わりに行うプログラムでした。'
        }
        if (lower.includes('당시 세계 최고 수준의 프로기사 이세돌 9단')) {
          return '当時、世界最高レベルのプロ棋士である李世乭九段との対局を人工知能が展開します。'
        }
        if (lower.includes('핸드폰 게임이나 당시에는 컴퓨터 게임으로 했던 바둑 게임 봇')) {
          return '私たちがよく携帯電話ゲームや当時のコンピュータゲームで遊んだ囲碁ゲームボットを考えると、非常にレベルが低かったのですが。'
        }
        if (lower.includes('알파고는 완전히 다른 수준이었습니다')) {
          return 'AlphaGoは完全に異なるレベルでした。'
        }
        if (lower.includes('이 대국은 전 세계의 관심을 끌었습니다')) {
          return 'この対局は世界中の関心を集めました。'
        }
        if (lower.includes('인공지능이 인간 전문가를 능가할 수 있다는 것을 증명')) {
          return '人工知能が人間の専門家を超えることができることを証明した出来事でした。'
        }
        if (lower.includes('과연 이 게임 프로그램을 구글이 무엇을 믿고')) {
          return '果たして、Googleはこのゲームプログラムを何を信じて李世乭九段に人工知能プログラムで挑戦するのか、本当に疑問でした。'
        }
        if (lower.includes('스타크래프트 같은 게임 속에 있는 인공지능 봇')) {
          return 'いくつかの人々になじみのある、スタークラフトのようなゲームの中にある人工知能ボットを想像したときは、非常に簡単だろうと予想しましたが。'
        }
        if (lower.includes('정말 옛날 이야기였습니다')) {
          return '本当に昔の話でした。'
        }
        if (lower.includes('알파고의 승리는 많은 사람들에게 충격을 주었습니다')) {
          return 'AlphaGoの勝利は多くの人々に衝撃を与えました。'
        }
        if (lower.includes('인공지능의 발전 속도가 예상을 뛰어넘었습니다')) {
          return '人工知能の発展速度が予想をはるかに超えました。'
        }
        if (lower.includes('이후 알파고 제로가 등장하면서 학습 방식에 혁신')) {
          return 'その後、AlphaGo Zeroが登場し、学習方法に革新が起こりました。'
        }
        if (lower.includes('그리고 지금 수준에 와서 알파고는 더욱 더 진화')) {
          return 'そして、現在のレベルに来て、AlphaGoはさらに進化しました。'
        }
        if (lower.includes('다른 이제 내가 이미 이때 알파고 제로라는 것이 등장')) {
          return 'その後、すでにAlphaGo Zeroというものが登場しましたが。'
        }
        if (lower.includes('그때는 이미 인간의 레벨을 훨씬 뛰어넘어')) {
          return 'その時はすでに人間のレベルをはるかに超えて人工知能が登場し始めました。'
        }
        if (lower.includes('이는 인공지능 학습 방식의 패러다임 전환')) {
          return 'これは人工知能学習方法のパラダイム転換を意味しました。'
        }
        if (lower.includes('미래 인공지능의 방향을 제시하는 중요한 사례')) {
          return '未来の人工知能の方向を示す重要な事例になりました。'
        }
        // Generic fallback for Japanese - use English translation as last resort
        const enFallback = generateEnglishTranslation(koText)
        const cleanEn = enFallback.replace(/^\[Translation:\s*/, '').replace(/\s*\.\.\.\]$/, '').replace(/\]$/, '').trim()
        // Provide Japanese context note
        return `[日本語翻訳] ${cleanEn}`
      }
      
      // Chinese translations
      if (targetLang === 'zh') {
        if (lower.includes('이민수') && lower.includes('머신러닝')) {
          if (lower.includes('고급')) {
            return '你好，我是李民洙，从今天开始，我将教授高级机器学习算法课程。在本课程中，我们将涵盖超越基本机器学习的高级技术，包括集成方法、梯度提升和随机森林。'
          }
          return '你好，我是李民洙，负责这门机器学习课程。我将提供五个主要部分，介绍什么是机器学习，以及机器学习中使用的各种算法和方法论。'
        }
        if (lower.includes('지금부터') && lower.includes('섹션')) {
          return '从现在开始，我将提供五个主要部分。我将介绍什么是机器学习，以及机器学习中使用的各种算法和方法论。'
        }
        if (lower.includes('체계적으로')) {
          return '通过本课程，您将系统地学习最近受到广泛关注的机器学习和人工智能。'
        }
        if (lower.includes('강의 계획')) {
          return '让我简要说明课程计划。我们将涵盖总共五个主要主题。'
        }
        if (lower.includes('소개를') && lower.includes('짧게')) {
          return '让我简单介绍一下自己。我目前在科技大学人工智能研究生院攻读博士学位，研究深度学习，这是机器学习的一个专门领域。'
        }
        if (lower.includes('첫 번째로는 지도 학습')) {
          return '首先，我将介绍监督学习领域中的回归和分类问题。'
        }
        if (lower.includes('지도 학습은 라벨이 있는 데이터')) {
          return '监督学习是使用带标签的数据来训练模型的方法。回归是预测连续值的问题，而分类是预测分类值的问题。'
        }
        if (lower.includes('앙상블 학습')) {
          return '我将逐步解释集成学习的基本概念。这是组合多个模型的预测以获得更好性能的方法。'
        }
        if (lower.includes('결정 트리')) {
          return '在本课程中，我们还将回顾决策树，这是重要的数据结构。决策树是非常直观且易于解释的模型。'
        }
        if (lower.includes('비지도 학습')) {
          return '现在我们将涵盖无监督学习领域的两个主要方面。无监督学习是在无标签数据中找到模式的学习方法，聚类和降维是主要技术。'
        }
        if (lower.includes('pca') || lower.includes('svd')) {
          return '特别是对于降维，有称为PCA和SVD的技术。如果您准备研究生院或公司面试，这是最常出现的问题之一。'
        }
        if (lower.includes('주성분 분석')) {
          return 'PCA是主成分分析，是一种将高维数据降维到低维的方法。SVD是奇异值分解，是通过分解矩阵来降低维度的方法。'
        }
        if (lower.includes('박준호') && lower.includes('비전')) {
          return '你好，我是朴俊浩，将负责计算机视觉课程。今天我们将介绍深度学习的基础，因为深度学习和计算机视觉的关系比您想象的更密切。'
        }
        if (lower.includes('딥러닝과 비전은')) {
          return '深度学习和计算机视觉比您想象的更密切。'
        }
        if (lower.includes('사진 데이터를 다루고')) {
          return '视觉实际上是处理照片数据和视频数据的计算机视觉领域。它包括图像识别、对象检测、图像分割等各种任务。'
        }
        if (lower.includes('인공지능 개론')) {
          return '你好，今天我们将介绍人工智能概论。'
        }
        if (lower.includes('인공지능 하면 어떤 것이 떠오르시나요')) {
          return '当您想到人工智能时，会想到什么？也许像《终结者》这样的电影中的图像？'
        }
        if (lower.includes('알파고')) {
          if (lower.includes('2016') || lower.includes('2017')) {
            return '最令人印象深刻的事件是AlphaGo。大约在2016-2017年，AlphaGo被引入作为一个替代人类下围棋的人工智能程序。它与世界顶级职业围棋棋手李世石进行了比赛。'
          }
          if (lower.includes('이세돌')) {
            return 'AlphaGo在五场比赛中以4比1战胜了李世石。'
          }
          return 'AlphaGo继续发展，随着AlphaGo Zero的出现，人工智能开始远远超越人类水平。'
        }
        if (lower.includes('머신러닝')) {
          return '今天我们将学习机器学习的概念和应用。机器学习涉及理解机器如何从数据中学习。'
        }
        if (lower.includes('딥러닝')) {
          return '深度学习和计算机视觉的关系比您想象的更密切。计算机视觉涉及处理照片数据、视频数据，以及从图像数据中提取特征来创建模型。'
        }
        // Generic fallback for Chinese
        return '本部分涵盖与课程相关的重要概念和信息。'
      }
      
      // Spanish translations
      if (targetLang === 'es') {
        if (lower.includes('이민수') && lower.includes('머신러닝')) {
          return 'Hola, soy Lee Min-su, y estaré enseñando este curso de aprendizaje automático. Presentaré cinco secciones principales que cubren qué es el aprendizaje automático y varios algoritmos y metodologías utilizados en el aprendizaje automático.'
        }
        if (lower.includes('머신러닝')) {
          return 'Hoy aprenderemos sobre los conceptos y aplicaciones del aprendizaje automático. El aprendizaje automático implica comprender cómo las máquinas pueden aprender de los datos.'
        }
        // Generic fallback for Spanish
        return 'Esta sección cubre conceptos e información importantes relevantes para el curso.'
      }
      
      // French translations
      if (targetLang === 'fr') {
        if (lower.includes('이민수') && lower.includes('머신러닝')) {
          if (lower.includes('고급')) {
            return 'Bonjour, je suis Lee Min-su, et à partir d\'aujourd\'hui, j\'enseignerai un cours sur les algorithmes d\'apprentissage automatique avancés. Dans ce cours, nous couvrirons des techniques avancées au-delà de l\'apprentissage automatique de base, y compris les méthodologies d\'ensemble, le gradient boosting et les forêts aléatoires.'
          }
          return 'Bonjour, je suis Lee Min-su, et j\'enseignerai ce cours d\'apprentissage automatique. Je présenterai cinq sections majeures couvrant ce qu\'est l\'apprentissage automatique et divers algorithmes et méthodologies utilisés dans l\'apprentissage automatique.'
        }
        if (lower.includes('지금부터') && lower.includes('섹션')) {
          return 'Je vais maintenant présenter cinq sections majeures dans ce cours. Je présenterai ce qu\'est l\'apprentissage automatique et divers algorithmes et méthodologies utilisés dans l\'apprentissage automatique.'
        }
        if (lower.includes('체계적으로') && lower.includes('배워보시면')) {
          return 'Grâce à ce cours, vous apprendrez systématiquement sur l\'apprentissage automatique et l\'intelligence artificielle, qui ont reçu beaucoup d\'attention récemment.'
        }
        if (lower.includes('강의 계획')) {
          return 'Laissez-moi expliquer brièvement le plan du cours. Nous couvrirons un total de cinq sujets principaux.'
        }
        if (lower.includes('소개를') && lower.includes('짧게')) {
          return 'Laissez-moi me présenter brièvement. Je suis actuellement étudiant en doctorat étudiant l\'apprentissage profond, qui est un domaine spécialisé de l\'apprentissage automatique, à l\'École supérieure d\'IA de l\'Université Tech.'
        }
        if (lower.includes('딥러닝이라고 하는 머신 러닝의 세부 분야')) {
          return 'J\'étudie l\'apprentissage profond, qui est un domaine spécialisé de l\'apprentissage automatique.'
        }
        if (lower.includes('딥러닝과 인공지능을 이해하기 위해서는')) {
          return 'Pour comprendre l\'apprentissage profond et l\'intelligence artificielle, vous devez d\'abord comprendre l\'apprentissage automatique.'
        }
        if (lower.includes('첫 번째로는 지도 학습')) {
          return 'Premièrement, je présenterai les problèmes de régression et de classification dans le domaine de l\'apprentissage supervisé.'
        }
        if (lower.includes('지도 학습은 라벨이 있는 데이터')) {
          return 'L\'apprentissage supervisé est une méthode d\'entraînement de modèles en utilisant des données étiquetées. La régression est le problème de prédiction de valeurs continues, tandis que la classification est le problème de prédiction de valeurs catégorielles.'
        }
        if (lower.includes('앙상블 학습의 기본 개념부터')) {
          return 'J\'expliquerai les concepts de base de l\'apprentissage d\'ensemble étape par étape. C\'est une méthode de combinaison des prédictions de plusieurs modèles pour obtenir de meilleures performances.'
        }
        if (lower.includes('여러 모델의 예측을 결합하여')) {
          return 'C\'est une méthode de combinaison des prédictions de plusieurs modèles pour obtenir de meilleures performances.'
        }
        if (lower.includes('결정 트리라고 하는 데이터 구조')) {
          return 'Dans ce cours, nous réviserons également les arbres de décision, qui sont des structures de données importantes. Les arbres de décision sont des modèles très intuitifs et faciles à interpréter.'
        }
        if (lower.includes('비지도 학습은 라벨이 없는 데이터')) {
          return 'L\'apprentissage non supervisé est une méthode d\'apprentissage qui trouve des motifs dans des données non étiquetées, le clustering et la réduction de dimensionnalité étant les principales techniques.'
        }
        if (lower.includes('클러스터링과 차원 축소가 주요 기법')) {
          return 'Le clustering et la réduction de dimensionnalité sont les principales techniques. Je comparerai les avantages et les inconvénients de chaque technique.'
        }
        if (lower.includes('차원 축소에 대해서는 pca와 svd')) {
          return 'Spécifiquement, pour la réduction de dimensionnalité, il existe des techniques appelées PCA et SVD. Si vous préparez une école supérieure ou des entretiens d\'entreprise, c\'est l\'une des questions les plus fréquemment posées.'
        }
        if (lower.includes('pca는 주성분 분석으로')) {
          return 'Le PCA, ou analyse en composantes principales, est une méthode pour réduire les données de haute dimension à faible dimension. Le SVD, ou décomposition en valeurs singulières, est une méthode pour réduire les dimensions en décomposant les matrices.'
        }
        if (lower.includes('박준호') && lower.includes('비전')) {
          return 'Bonjour, je suis Park Jun-ho, et j\'enseignerai le cours de vision par ordinateur. Aujourd\'hui, nous couvrirons les bases de l\'apprentissage profond, car l\'apprentissage profond et la vision par ordinateur sont plus étroitement liés que vous ne le pensez.'
        }
        if (lower.includes('비전을 수업하는데 왜 갑자기 딥러닝')) {
          return 'Vous vous demandez peut-être pourquoi le terme d\'apprentissage profond apparaît soudainement alors que nous enseignons la vision.'
        }
        if (lower.includes('딥러닝과 비전은 생각보다 많이 가까워져')) {
          return 'L\'apprentissage profond et la vision sont plus étroitement liés que vous ne le pensez.'
        }
        if (lower.includes('사진 데이터를 다루고 비디오 데이터를 다루는')) {
          return 'La vision est en fait le domaine de la vision par ordinateur qui traite des données photo et des données vidéo. Il comprend diverses tâches telles que la reconnaissance d\'images, la détection d\'objets et la segmentation d\'images.'
        }
        if (lower.includes('이미지 데이터들 속에서 특징을 캡처')) {
          return 'Il joue un rôle dans la capture et l\'extraction de caractéristiques à partir des données d\'images. C\'est un domaine de recherche axé sur la création de modèles.'
        }
        if (lower.includes('딥러닝이라는 도구를 통해서 굉장히 많이 발전')) {
          return 'Ce domaine de la vision a considérablement progressé récemment grâce à l\'apprentissage profond.'
        }
        if (lower.includes('cnn') || lower.includes('합성곱 신경망')) {
          return 'Les CNN, c\'est-à-dire les réseaux de neurones convolutionnels, jouent un rôle clé dans la vision par ordinateur.'
        }
        if (lower.includes('인공지능 개론에 대해서 다뤄 보려고 합니다')) {
          return 'Bonjour, aujourd\'hui nous allons couvrir une introduction à l\'intelligence artificielle.'
        }
        if (lower.includes('인공지능 하면 어떤 것이 떠오르시나요')) {
          return 'Qu\'est-ce qui vous vient à l\'esprit quand vous pensez à l\'intelligence artificielle?'
        }
        if (lower.includes('터미네이터 속에 그런 악한 인공지능')) {
          return 'Peut-être des images de films comme Terminator?'
        }
        if (lower.includes('인공지능이란 단어는 굉장히 친숙합니다')) {
          return 'En fait, le mot intelligence artificielle est très familier.'
        }
        if (lower.includes('일상 생활 속에서는 어떻게 인공지능들이 침투')) {
          return 'Explorons étape par étape ce qu\'est l\'intelligence artificielle et comment l\'IA a infiltré notre vie quotidienne. L\'IA est déjà profondément intégrée dans notre vie quotidienne.'
        }
        if (lower.includes('스마트폰 음성 인식') || lower.includes('추천 시스템')) {
          return 'Elle est utilisée dans de nombreux endroits tels que la reconnaissance vocale des smartphones, les systèmes de recommandation et les voitures autonomes.'
        }
        if (lower.includes('알파고 2016년 2017년')) {
          return 'L\'événement le plus impressionnant était AlphaGo. Vers 2016-2017, AlphaGo a été introduit comme un programme d\'intelligence artificielle qui joue au Go à la place des humains.'
        }
        if (lower.includes('이세돌 9단과의 대국')) {
          return 'Il a concouru contre Lee Sedol, le meilleur joueur de Go professionnel au monde.'
        }
        if (lower.includes('강화 학습과 몬테카를로 트리 탐색')) {
          return 'Il a utilisé des techniques telles que l\'apprentissage par renforcement et la recherche d\'arbre Monte Carlo.'
        }
        if (lower.includes('알파고는 이세돌 9단을 5번 대국 중에서 4번을 이겼고')) {
          return 'AlphaGo a remporté 4 victoires sur 5 matchs contre Lee Sedol.'
        }
        if (lower.includes('알파고 제로는 인간의 기보 없이 스스로 학습')) {
          return 'AlphaGo Zero a appris par lui-même sans parties humaines.'
        }
        if (lower.includes('머신러닝')) {
          return 'Aujourd\'hui, nous apprendrons les concepts et applications de l\'apprentissage automatique.'
        }
        if (lower.includes('딥러닝')) {
          return 'Aujourd\'hui, nous couvrirons les bases de l\'apprentissage profond et des réseaux de neurones artificiels, ainsi que les algorithmes d\'entraînement utilisés pour entraîner ces réseaux de neurones.'
        }
        if (lower.includes('인공지능') || lower.includes('ai')) {
          return 'Nous explorerons les sujets de l\'intelligence artificielle, en comprenant la relation entre l\'IA, l\'apprentissage automatique et l\'apprentissage profond.'
        }
        // Generic fallback for French
        return 'Cette section couvre des concepts et des informations importants pertinents pour le cours.'
      }
      
      // Portuguese translations
      if (targetLang === 'pt') {
        if (lower.includes('머신러닝')) {
          return 'Hoje aprenderemos sobre os conceitos e aplicações do aprendizado de máquina. O aprendizado de máquina envolve entender como as máquinas podem aprender com os dados.'
        }
        // Generic fallback for Portuguese
        return 'Esta seção cobre conceitos e informações importantes relevantes para o curso.'
      }
      
      // Russian translations
      if (targetLang === 'ru') {
        if (lower.includes('머신러닝')) {
          return 'Сегодня мы изучим концепции и приложения машинного обучения. Машинное обучение включает понимание того, как машины могут обучаться на данных.'
        }
        // Generic fallback for Russian
        return 'В этом разделе рассматриваются важные концепции и информация, относящиеся к курсу.'
      }
      
      // For other languages not covered, return English translation
      return generateEnglishTranslation(koText)
    }

    // Enhanced translation with more comprehensive patterns based on actual transcript content
    const generateSimpleTranslation = (koText: string, lang: string): string => {
      // Direct translation from Korean to target language
      return translateKoreanToLanguage(koText, lang)
    }

    // availableLanguages comes from sidebar for current subject; always include English and Korean
    const getTargets = () => Array.from(new Set(['en','ko', ...availableLanguages]))

    const makeEntry = (koText: string, sessionNo: number, idx: number): TranslationEntry => {
      const date = new Date('2025-10-27T14:00:00Z')
      date.setMinutes(date.getMinutes() + idx * 3)
      const dateStr = date.toISOString().replace('T', ' ').slice(0, 19)
      
      // Original text should be pure Korean from transcript (no translations mixed in)
      const originalLang = 'ko'
      const originalText = koText // Keep original Korean text as-is from transcript

      // Generate translations for all target languages
      const targets = getTargets()
      const translationsSubset = targets.map(l => ({ 
        language: l, 
        text: generateSimpleTranslation(koText, l) 
      }))

      // role distribution: mostly professor
      const role: 'professor' | 'assistant' = Math.random() < 0.85 ? 'professor' : 'assistant'

      const base: TranslationEntry = {
        id: `${sessionNo}-${idx + 1}`,
        date: dateStr,
        role,
        sessionNo,
        originalText,
        originalLanguage: originalLang,
        translations: translationsSubset
      }

      // Pre-seed some rows with admin feedback (about 35%)
      if (Math.random() < 0.35) {
        const verdict: 'good' | 'bad' = Math.random() < 0.8 ? 'good' : 'bad'
        base.adminFeedback = {
          verdict,
          feedbackText: verdict === 'good' ? '좋습니다. 계속 진행하세요.' : '표현을 더 간결하게 수정해주세요.',
          correctedResponse: verdict === 'bad' ? '수정 예시: 핵심만 간단히 전달합니다.' : undefined
        }
      }

      return base
    }

    // Build entries from transcript data if available
    let newData: TranslationEntry[] = []
    if (videoData) {
      // Use actual transcript segments
      const allSegments: Array<{ text: string; session: number }> = []
      videoData.sessions.forEach(session => {
        session.segments.forEach(segment => {
          allSegments.push({ text: segment, session: session.session })
        })
      })
      
      newData = allSegments.map((segment, idx) => 
        makeEntry(segment.text, segment.session, idx)
      )
    } else {
      // Fallback to simple mock data if no transcript found
      const fallbackTexts = [
        '다음 예제로 넘어가 보겠습니다.',
        '노트를 열고 함께 따라와 주세요.',
        '효과적으로 배우는 가장 좋은 방법은 연습입니다.'
      ]
      newData = Array.from({ length: 30 }).map((_, i) => 
        makeEntry(fallbackTexts[i % fallbackTexts.length], (i % 5) + 1, i)
      )
    }

    setTranslations(newData)
    // No session filter - show all sessions for selected lecture
    setFilteredTranslations(newData)
  }, [selectedSubject, selectedTerm, selectedLanguage, availableLanguages, selectedLecture])

  // When filters change, keep data but reapply sorting/filtering later if needed
  useEffect(() => {
    if (translations.length === 0) return
    setFilteredTranslations(translations)
  }, [selectedTerm, selectedSubject, translations])

  const languageNames: Record<string, string> = language === 'en'
    ? {
      ko: 'Korean',
      en: 'English',
      ja: 'Japanese',
      zh: 'Mandarin Chinese',
      es: 'Spanish',
      hi: 'Hindi',
      fr: 'French',
      ar: 'Arabic',
      pt: 'Portuguese',
      ru: 'Russian'
    }
    : {
      ko: '한국어',
      en: 'English',
      ja: '日本語',
      zh: '中文 (Mandarin Chinese)',
      es: 'Español',
      hi: 'हिन्दी',
      fr: 'Français',
      ar: 'العربية',
      pt: 'Português',
      ru: 'Русский'
    }

  const getTranslationForLanguage = (entry: TranslationEntry, lang: string) => {
    // Exact language already in original
    if (entry.originalLanguage === lang) {
      return { language: lang, text: entry.originalText }
    }
    // Find existing translation
    const found = entry.translations.find(t => t.language === lang)
    if (found) return found
    // Fallback: derive from English (or original if English)
    const englishBase = entry.originalLanguage === 'en'
      ? entry.originalText
      : (entry.translations.find(t => t.language === 'en')?.text || entry.originalText)
    const label = languageNames[lang] || lang
    return { language: lang, text: `${englishBase} (${label})` }
  }

  // Ensure selectedLanguage is part of availableLanguages
  useEffect(() => {
    if (!availableLanguages.includes(selectedLanguage)) {
      const next = availableLanguages.includes('en') ? 'en' : (availableLanguages[0] || 'en')
      setSelectedLanguage(next)
      onSelectedLanguageChange && onSelectedLanguageChange(next)
    }
  }, [availableLanguages])

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
    const translation = getTranslationForLanguage(entry, selectedLanguage)
    
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
      const rowLang = selectedLanguage
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
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {t('translation.title')} ({translations.length})
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(59,230,255,0.15)', color: '#a8e9ff', border: '1px solid rgba(59,230,255,0.35)', borderRadius: '12px' }}>
              {(() => {
                const map: Record<string, { en: string; ko: string }> = {
                  'machine-learning': { en: 'Machine Learning', ko: '머신러닝' },
                  'computer-vision': { en: 'Computer Vision', ko: '컴퓨터 비전' },
                  'ai-introduction': { en: 'Artificial Intelligence', ko: '인공지능' },
                  'big-data-analysis': { en: 'Big Data', ko: '빅데이터' },
                  'logistic-regression': { en: 'Statistics', ko: '통계' }
                }
                const subjectLabel = map[selectedSubject] || { en: selectedSubject, ko: selectedSubject }
                return language === 'en' ? subjectLabel.en : subjectLabel.ko
              })()}
            </span>
            <span style={{ fontSize: '12px', padding: '4px 8px', background: 'rgba(37,99,235,0.15)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.35)', borderRadius: '12px' }}>
              {(() => {
                const [y, s] = selectedTerm.split('-')
                const sm: Record<string, string> = language === 'en'
                  ? { spring: 'Spring', summer: 'Summer', fall: 'Fall', winter: 'Winter' }
                  : { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' }
                return `${y} ${sm[s] || s}`
              })()}
            </span>
          </div>
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
        {/* Lecture selector */}
        {(() => {
          const videoEntries = Object.values(TRANSCRIPT_DATA).filter(v => v.subject === selectedSubject)
          const lectureTitles = videoEntries.map(v => v.title)
          
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>{language === 'en' ? 'Lecture' : '강의명'}</span>
              <select
                value={selectedLecture}
                onChange={(e) => setSelectedLecture(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--admin-card-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              >
                {lectureTitles.length > 0 ? (
                  lectureTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))
                ) : (
                  <option value="">{language === 'en' ? 'No lectures' : '강의 없음'}</option>
                )}
              </select>
            </div>
          )
        })()}

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
          <option value="date-desc">{language === 'en' ? 'Newest' : '최신순'}</option>
          <option value="date-asc">{language === 'en' ? 'Oldest' : '과거순'}</option>
          <option value="user">{language === 'en' ? 'By user' : '사용자 순'}</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder={language === 'en' ? 'Search...' : '검색...'}
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
            {language === 'en' ? 'Export' : '내보내기'}
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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 600, width: 200 }}>{t('translation.columns.meta')}</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 700, background: 'rgba(59,230,255,0.12)', width: 'calc((100% - 200px)/2)' }}>{t('translation.columns.original')}</th>
              <th style={{ padding: '12px', textAlign: 'left', color: 'var(--admin-text-muted)', fontWeight: 700, background: 'rgba(37,99,235,0.12)', width: 'calc((100% - 200px)/2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                  <span>{t('translation.columns.translation')}</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value)
                      onSelectedLanguageChange && onSelectedLanguageChange(e.target.value)
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
                    {Array.from(new Set(availableLanguages)).map((lng) => (
                      <option key={lng} value={lng}>
                        {lng === 'en' && '🇺🇸 '}{lng === 'ko' && '🇰🇷 '}{lng === 'ja' && '🇯🇵 '}{lng === 'zh' && '🇨🇳 '}{lng === 'es' && '🇪🇸 '}{lng === 'hi' && '🇮🇳 '}{lng === 'fr' && '🇫🇷 '}{lng === 'ar' && '🇸🇦 '}{lng === 'pt' && '🇵🇹 '}{lng === 'ru' && '🇷🇺 '}
                        {languageNames[lng] || lng}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTranslations.slice(0, displayLimit).map((entry) => {
              const rowLang = selectedLanguage
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
                  <td style={{ padding: '12px', color: 'var(--admin-text)', whiteSpace: 'nowrap', width: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>{entry.date}</span>
                      {/* Session label removed for more space */}
                      {entry.adminFeedback ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {entry.adminFeedback.verdict === 'good' ? (
                            <IconThumbsUp size={16} color="#00e3a5" />
                          ) : (
                            <IconThumbsDown size={16} color="#ff6b6b" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFeedbackClick(entry, entry.adminFeedback!.verdict); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--admin-primary)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            {t('translation.feedback.edit')}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFeedbackClick(entry, 'good'); }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                            title="Good"
                          >
                            <IconThumbsUp size={16} color="#00e3a5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFeedbackClick(entry, 'bad'); }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                            title="Bad"
                          >
                            <IconThumbsDown size={16} color="#ff6b6b" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--admin-text)', width: 'calc((100% - 200px)/2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-border)', borderRadius: '4px', color: 'var(--admin-text-muted)', flexShrink: 0 }}>
                        {languageNames[entry.originalLanguage] || entry.originalLanguage}
                      </span>
                      <span 
                        style={{ 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          display: 'block',
                          minWidth: 0
                        }}
                        title={entry.originalText}
                      >
                        {entry.originalText}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', background: 'rgba(37,99,235,0.10)', width: 'calc((100% - 200px)/2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--admin-primary)', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--admin-primary)', color: 'white', borderRadius: '4px', flexShrink: 0 }}>
                          {languageNames[rowLang] || rowLang}
                        </span>
                        <span 
                          style={{ 
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            display: 'block',
                            minWidth: 0
                          }}
                          title={translation?.text || '-'}
                        >
                          {translation?.text || '-'}
                        </span>
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
            {t('adminFeedback.loadMore')} ({translations.length - displayLimit} {t('adminFeedback.remaining')})
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
          background: 'rgba(4, 18, 32, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--admin-bg)',
            border: '1px solid var(--admin-border)',
            borderRadius: '8px',
            width: 'min(720px, 96vw)',
            padding: '20px 20px 16px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
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
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                원문:
              </p>
              <div style={{
                padding: '10px 12px',
                background: 'rgba(9, 14, 34, 0.55)',
                border: '1px solid var(--admin-border)',
                borderRadius: '6px'
              }}>
                <p style={{ fontSize: '14px', color: 'var(--admin-text)' }}>
                  {feedbackModal.originalText}
                </p>
              </div>
            </div>
            
            {/* Translated Text */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: '8px' }}>
                번역:
              </p>
              <div style={{
                padding: '10px 12px',
                background: 'rgba(9, 14, 34, 0.55)',
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
                  minHeight: '80px',
                  padding: '10px 12px',
                  background: 'rgba(9, 14, 34, 0.65)',
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
                  minHeight: '100px',
                  padding: '10px 12px',
                  background: 'rgba(9, 14, 34, 0.65)',
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
                  background: 'var(--admin-primary)',
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
