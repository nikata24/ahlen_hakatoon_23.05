import type { Place } from './types';

export const AHLEN_PLACES: Place[] = [
  {
    id: 'art_museum',
    name: 'Kunstmuseum Ahlen',
    category: 'culture',
    ageSuitability: { youth: 3, adults: 5, seniors: 5 },
    budget: 2,
    timeOfDay: ['morning', 'afternoon'],
    rating: 4.6,
    userRatingsTotal: 114,
    address: 'Museumsplatz 1, 59227 Ahlen',
    coordinates: { lat: 51.763520, lng: 7.889390 },
    description: 'Известный художественный музей, в котором представлена коллекция современного искусства. Он расположен в великолепной исторической вилле с современной футуристической пристройкой.',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Прекрасное сочетание классической виллы и футуристической архитектуры. Интересные временные выставки!',
      'Лучшее культурное место в городе. Сотрудники очень приветливые и профессиональные.',
      'Очень стильное и вдохновляющее пространство. Обязательно к посещению!'
    ]
  },
  {
    id: 'schuhfabrik',
    name: 'Bürgerzentrum Schuhfabrik e.V.',
    category: 'nightlife',
    ageSuitability: { youth: 5, adults: 5, seniors: 4 },
    budget: 1,
    timeOfDay: ['afternoon', 'evening', 'night'],
    rating: 4.5,
    userRatingsTotal: 489,
    address: 'Königstraße 7, 59227 Ahlen',
    coordinates: { lat: 51.760770, lng: 7.894100 },
    description: 'Легендарный культурный центр в здании бывшей обувной фабрики. Здесь находится культовый паб, летний пивной сад, проводятся живые концерты, показы кино и вечеринки.',
    imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Лучшее заведение в городе для концертов и недорогих напитков! Атмосфера свободы и творчества.',
      'Отличный пивной сад под открытым небом летом. Очень вкусная и недорогая пицца.',
      'Уникальный культурный центр, где всегда происходит что-то интересное. Местный дух Алена.'
    ]
  },
  {
    id: 'berliner_park',
    name: 'Berliner Park',
    category: 'relax',
    ageSuitability: { youth: 4, adults: 4, seniors: 5 },
    budget: 1,
    timeOfDay: ['morning', 'afternoon', 'evening'],
    rating: 4.4,
    userRatingsTotal: 320,
    address: 'Berliner Park, 59227 Ahlen',
    coordinates: { lat: 51.758060, lng: 7.902260 },
    description: 'Самый большой и живописный зеленый парк в Алене. Красивые вековые деревья, ухоженные пешеходные дорожки вдоль реки Верзе, детские площадки, пруд с утками и зоны для отдыха.',
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Замечательное место для прогулок всей семьей или утренних пробежек. Чисто и зелено.',
      'Очень красивые розы цветут в летний период. Есть тихие лавочки у пруда, где можно почитать.',
      'Хорошие детские площадки и просторные поляны для отдыха. Спокойный уголок природы.'
    ]
  },
  {
    id: 'ginos_restaurant',
    name: 'Restaurant & Cafe "Gino\'s"',
    category: 'culinary',
    ageSuitability: { youth: 4, adults: 5, seniors: 5 },
    budget: 2,
    timeOfDay: ['afternoon', 'evening'],
    rating: 4.7,
    userRatingsTotal: 612,
    address: 'Oststraße 45, 59227 Ahlen',
    coordinates: { lat: 51.762880, lng: 7.891120 },
    description: 'Высоко оцененный итальянский ресторан в пешеходной зоне Алена. Аутентичная пицца из каменной печи, свежая домашняя паста, отличные морепродукты и нежнейшее мороженое.',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Потрясающая итальянская кухня! Самая вкусная пицца в округе и отличный персонал.',
      'Уютная терраса в центре города. Паста с морепродуктами просто великолепна.',
      'Быстрое обслуживание, огромные порции и всегда свежие ингредиенты. Очень рекомендую!'
    ]
  },
  {
    id: 'marktplatz_shopping',
    name: 'Ahlener Marktplatz & Pedestrian Zone',
    category: 'shopping',
    ageSuitability: { youth: 4, adults: 4, seniors: 4 },
    budget: 2,
    timeOfDay: ['morning', 'afternoon'],
    rating: 4.2,
    userRatingsTotal: 180,
    address: 'Marktplatz, 59227 Ahlen',
    coordinates: { lat: 51.762280, lng: 7.892690 },
    description: 'Центральная рыночная площадь и прилегающая торговая пешеходная зона (Oststraße). Окружена историческими фахверковыми домами, магазинами одежды, пекарнями и бутиками.',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Особенно интересно бывать здесь по базарным дням (среда и суббота), когда привозят свежие фермерские продукты.',
      'Красивая старинная атмосфера, много уютных кафе, где можно выпить кофе с булочкой.',
      'Хорошая прогулочная зона с магазинами одежды и сувениров.'
    ]
  },
  {
    id: 'zeche_westfalen',
    name: 'Zechengelände Zeche Westfalen',
    category: 'relax',
    ageSuitability: { youth: 4, adults: 5, seniors: 4 },
    budget: 1,
    timeOfDay: ['morning', 'afternoon', 'evening'],
    rating: 4.6,
    userRatingsTotal: 412,
    address: 'Zeche Westfalen 1, 59229 Ahlen',
    coordinates: { lat: 51.748500, lng: 7.925500 },
    description: 'Впечатляющий объект индустриального наследия бывшей угольной шахты «Вестфален». Символ Алена с сохранившимися монументальными подъемными башнями, парком скалолазания и зонами прогулок.',
    imageUrl: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Потрясающий памятник индустриальной эпохи! Очень атмосферное место для фотосессий.',
      'Большая территория для прогулок, есть классная вышка для скалолазания и зоны отдыха.',
      'Часть истории города, бережно превращенная в современный культурный объект.'
    ]
  },
  {
    id: 'splendid_restaurant',
    name: 'Restaurant "Splendid"',
    category: 'culinary',
    ageSuitability: { youth: 3, adults: 5, seniors: 5 },
    budget: 3,
    timeOfDay: ['evening'],
    rating: 4.8,
    userRatingsTotal: 245,
    address: 'Nordstraße 12, 59227 Ahlen',
    coordinates: { lat: 51.764500, lng: 7.891200 },
    description: 'Элегантный ресторан премиум-класса, предлагающий блюда высокой немецкой и европейской кухни, сезонные деликатесы и богатую винную карту в изысканной атмосфере.',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Высочайший уровень гастрономии! Невероятные стейки и безупречный сервис.',
      'Очень стильный интерьер, идеально подходящий для особых случаев или романтического ужина.',
      'Дорого, но абсолютно оправдывает каждую копейку. Шеф-повар — настоящий мастер.'
    ]
  },
  {
    id: 'langst_oase',
    name: 'Langst-Oase & Langstsee',
    category: 'relax',
    ageSuitability: { youth: 5, adults: 4, seniors: 5 },
    budget: 1,
    timeOfDay: ['morning', 'afternoon'],
    rating: 4.5,
    userRatingsTotal: 530,
    address: 'Langstweg 70, 59227 Ahlen',
    coordinates: { lat: 51.768100, lng: 7.915200 },
    description: 'Великолепная зона отдыха у озера Лангст. Включает открытый бассейн под открытым небом, площадки для пляжного волейбола, поле для мини-гольфа и зеленые лужайки для загара.',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Лучшее место для плавания и загара летом в Алене! Огромная ухоженная территория.',
      'Прекрасные волейбольные площадки и мини-гольф. Вода в бассейнах чистая и освежающая.',
      'Отличное место для активного отдыха с друзьями или расслабления у озера.'
    ]
  },
  {
    id: 'loom_bar',
    name: 'Cocktailbar "Loom"',
    category: 'nightlife',
    ageSuitability: { youth: 5, adults: 5, seniors: 3 },
    budget: 2,
    timeOfDay: ['evening', 'night'],
    rating: 4.6,
    userRatingsTotal: 189,
    address: 'Weststraße 10, 59227 Ahlen',
    coordinates: { lat: 51.762100, lng: 7.889500 },
    description: 'Стильный современный коктейль-бар с неоновым освещением, мягкими диванами и широчайшим выбором классических и фирменных коктейлей от профессиональных барменов.',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Потрясающие коктейли! Бармены знают свое дело на 100%. Очень крутой интерьер.',
      'Музыка на высоте, отличный неоновый свет, суперская атмосфера для тусовки в субботу.',
      'Огромное коктейльное меню. Приемлемые цены и классный контингент.'
    ]
  },
  {
    id: 'cinema_center',
    name: 'Ahlener Kinocenter',
    category: 'culture',
    ageSuitability: { youth: 5, adults: 4, seniors: 4 },
    budget: 2,
    timeOfDay: ['afternoon', 'evening', 'night'],
    rating: 4.3,
    userRatingsTotal: 312,
    address: 'Kappenberger Damm 2, 59227 Ahlen',
    coordinates: { lat: 51.758800, lng: 7.891400 },
    description: 'Уютный городской кинотеатр, показывающий последние кинопремьеры и артхаусные фильмы. Удобные кресла, современный 3D-звук и всегда свежий карамельный попкорн.',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
    reviews: [
      'Уютный ламповый кинотеатр. Отличный звук в главном зале.',
      'Самый вкусный сладкий попкорн в округе! Очень чисто и комфортно.',
      'Персонал всегда вежливый, приятно ходить сюда на премьеры фильмов.'
    ]
  }
];
