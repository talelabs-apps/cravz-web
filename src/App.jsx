import { useState, useEffect } from "react";
import {
  Home, Lightbulb, BarChart2, User, TrendingUp, TrendingDown,
  Plus, Minus, X, Check, Navigation, ArrowRight, MoreHorizontal,
  Search, Lock, ChevronDown, ChevronRight, AlertCircle, Clock, Bell, RefreshCw,
  MapPin, Flame, Star, Users, Zap, FileText
} from "lucide-react";

const FONT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; -webkit-font-smoothing:antialiased; }
  body { background:#111110; }
`;

const C = {
  bg:"#111110", surface:"#1A1918", surface2:"#201F1E", line:"#2C2A28",
  t1:"#F2EDE6", t2:"#8C8680", t3:"#4A4844",
  coral:"#E8513A", green:"#2ECC8A", amber:"#E8A830", purple:"#9B7DF5",
};
const serif = "'Playfair Display', Georgia, serif";
const sans  = "'DM Sans', system-ui, sans-serif";
const ty = {
  hero:  {fontFamily:serif,fontSize:34,fontWeight:700,lineHeight:1.06,letterSpacing:-0.5,color:C.t1},
  h2:    {fontFamily:serif,fontSize:22,fontWeight:700,lineHeight:1.15,letterSpacing:-0.3,color:C.t1},
  h3:    {fontFamily:serif,fontSize:18,fontWeight:700,lineHeight:1.2, color:C.t1},
  label: {fontFamily:sans, fontSize:10,fontWeight:600,letterSpacing:1.4,textTransform:"uppercase",color:C.t3},
  body:  {fontFamily:sans, fontSize:14,fontWeight:400,lineHeight:1.55,color:C.t2},
  bodyMd:{fontFamily:sans, fontSize:14,fontWeight:500,color:C.t1},
  sm:    {fontFamily:sans, fontSize:12,fontWeight:400,color:C.t2},
  meta:  {fontFamily:sans, fontSize:11,fontWeight:400,color:C.t3},
  btn:   {fontFamily:sans, fontSize:14,fontWeight:600},
  tab:   {fontFamily:sans, fontSize:10,fontWeight:500},
};

/* ==================================================
   SPEND / FREQ helpers -- convert label -> numeric
================================================== */
const SPEND_MID = {"£0–5":2.5,"£5–10":7.5,"£10–20":15,"£20–35":27.5,"£35–50":42.5,"£50–100":75,"£100–150":125,"£150+":175};
const FREQ_MO   = {"A few times a year":0.25,"Once a month":1,"2–3× a month":2.5,"Weekly":4.3,"Multiple times a week":10};

// Distance label = midpoint minutes
const DIST_MID  = {"< 5 min walk":5,"5–10 min walk":7.5,"10–20 min walk":15,"20 min+ / drive":25};

/* ==================================================
   DATA MODEL
   
   Each FEED item carries realistic aggregate stats:
   - voters: number of people who voted
   - avgCoins: average coins placed out of 10 -> intensity
   - distrib: % breakdown of distance choices
   - spendDist: % breakdown of spend choices
   - freqDist: % breakdown of frequency choices
   
   From these we derive:
   - intensity score (avgCoins / 10 * 10, shown as X/10)
   - avgSpend (weighted average of spend choices)
   - visitsPerMonth (weighted average of freq choices)
   - monthlyRev = voters x avgSpend x visitsPerMonth
   - annualRev = monthlyRev x 12
   - catchment classification from distrib
================================================== */
const SPEND_OPTS = ["£0–5","£5–10","£10–20","£20–35","£35–50","£50–100","£100–150","£150+"];
const FREQ_OPTS  = ["A few times a year","Once a month","2–3× a month","Weekly","Multiple times a week"];
const DIST_OPTS  = ["< 5 min walk","5–10 min walk","10–20 min walk","20 min+ / drive"];
const ACCESS_OPTS = [
  {l:"I already get this locally",       v:"local",      info:"Local supply exists"},
  {l:"I travel to another area for it",  v:"leakage",    info:"Demand leakage"},
  {l:"I order it online",                v:"online",     info:"Online substitution"},
  {l:"I only get it occasionally — it's not nearby", v:"suppressed", info:"Suppressed demand"},
  {l:"I currently don't get this at all",v:"unmet",      info:"Completely unmet"},
];
const AGES  = ["18–24","25–34","35–44","45–54","55–64","65+"];
const GNDR  = ["Woman","Man","Non-binary","Prefer not to say"];
const HHLD  = ["Solo","Couple","Family (no kids)","Family (with kids)"];

function calcMetrics(item) {
  // weighted avg spend
  const avgSpend = SPEND_OPTS.reduce((s,k,i)=>{
    const pct = item.spendDist[i]||0;
    return s + (SPEND_MID[k]||0) * pct/100;
  },0);
  // weighted avg visits/month
  const visitsPerMonth = FREQ_OPTS.reduce((s,k,i)=>{
    const pct = item.freqDist[i]||0;
    return s + (FREQ_MO[k]||0) * pct/100;
  },0);
  // monthly revenue
  const monthlyRev = Math.round(item.voters * avgSpend * visitsPerMonth);
  const annualRev  = monthlyRev * 12;
  // catchment
  const d = item.distrib; // [<5min%, 5-10%, 10-20%, 20+%]
  const hyperLocal = d[0];
  const local      = d[0]+d[1];
  const neighbourhood = d[0]+d[1]+d[2];
  let catchment, catchmentColor;
  if (hyperLocal >= 50)      { catchment="Hyper-local";   catchmentColor=C.coral;  }
  else if (local >= 55)      { catchment="Local";         catchmentColor=C.amber;  }
  else if (neighbourhood>=60){ catchment="Neighbourhood"; catchmentColor=C.purple; }
  else                       { catchment="Destination";   catchmentColor=C.green;  }
  // intensity
  const intensity = item.avgCoins; // already out of 10

  return { avgSpend, visitsPerMonth, monthlyRev, annualRev, catchment, catchmentColor, intensity };
}


const CAT_CFG = {
  food:      {label:"Food & Drink",        emoji:"🍽️", color:C.coral,  bg:"#2A0A06"},
  retail:    {label:"Retail",              emoji:"🛍️", color:C.amber,  bg:"#2A1400"},
  health:    {label:"Health & Wellness",   emoji:"💆", color:C.green,  bg:"#0A1A0A"},
  fitness:   {label:"Fitness & Sports",    emoji:"🏋️", color:C.green,  bg:"#0A1A0A"},
  kids:      {label:"Kids & Family",       emoji:"🧸",  color:C.coral,  bg:"#2A0A06"},
  entertain: {label:"Entertainment",       emoji:"🎭",  color:C.purple, bg:"#160A2A"},
  services:  {label:"Services & Learning", emoji:"📚", color:C.amber,  bg:"#2A1400"},
};

const VOTE_CATS = CAT_CFG;

/* 10 coins total — unified across all services */
const TOTAL_COINS = 10;

/* ==================================================
   UNIFIED SERVICES CATALOGUE
================================================== */

const SERVICES = [
  /* ── FOOD & DRINK ── */
  /* Restaurants – Cuisine */
  {id:"s1",  cat:"food", subcat:"rest_cuisine",  emoji:"🇮🇹", label:"Italian restaurant"},
  {id:"s2",  cat:"food", subcat:"rest_cuisine",  emoji:"🥐", label:"French restaurant"},
  {id:"s3",  cat:"food", subcat:"rest_cuisine",  emoji:"🥘", label:"Spanish restaurant"},
  {id:"s4",  cat:"food", subcat:"rest_cuisine",  emoji:"🌍", label:"Modern European restaurant"},
  {id:"s5",  cat:"food", subcat:"rest_cuisine",  emoji:"🇧🇷", label:"Brazilian restaurant"},
  {id:"s6",  cat:"food", subcat:"rest_cuisine",  emoji:"🌮", label:"Mexican restaurant"},
  {id:"s7",  cat:"food", subcat:"rest_cuisine",  emoji:"🥡", label:"Japanese restaurant"},
  {id:"s8",  cat:"food", subcat:"rest_cuisine",  emoji:"🥡", label:"Chinese restaurant"},
  {id:"s9",  cat:"food", subcat:"rest_cuisine",  emoji:"🌶️", label:"Thai restaurant"},
  {id:"s10", cat:"food", subcat:"rest_cuisine",  emoji:"🍛", label:"Indian restaurant"},
  {id:"s11", cat:"food", subcat:"rest_cuisine",  emoji:"🧆", label:"Middle Eastern restaurant"},
  {id:"s12", cat:"food", subcat:"rest_cuisine",  emoji:"🇬🇷", label:"Greek restaurant"},
  {id:"s13", cat:"food", subcat:"rest_cuisine",  emoji:"🍜", label:"Korean restaurant"},
  {id:"s14", cat:"food", subcat:"rest_cuisine",  emoji:"🍲", label:"Vietnamese restaurant"},
  {id:"s15", cat:"food", subcat:"rest_cuisine",  emoji:"🥩", label:"Steakhouse"},
  {id:"s16", cat:"food", subcat:"rest_cuisine",  emoji:"🦞", label:"Seafood restaurant"},
  /* Restaurants – Concept */
  {id:"s17", cat:"food", subcat:"rest_concept",  emoji:"🍔", label:"Burger place"},
  {id:"s18", cat:"food", subcat:"rest_concept",  emoji:"🍕", label:"Pizzeria"},
  {id:"s19", cat:"food", subcat:"rest_concept",  emoji:"🥞", label:"Crêperie"},
  {id:"s20", cat:"food", subcat:"rest_concept",  emoji:"🍗", label:"Rotisserie chicken"},
  {id:"s21", cat:"food", subcat:"rest_concept",  emoji:"🐟", label:"Fish & chips"},
  {id:"s22", cat:"food", subcat:"rest_concept",  emoji:"🍱", label:"Food hall / street food market"},
  /* Cafés & Bakeries */
  {id:"s23", cat:"food", subcat:"cafe",          emoji:"☕", label:"Café"},
  {id:"s24", cat:"food", subcat:"bakery",        emoji:"🥐", label:"Artisan bakery"},
  /* Dessert */
  {id:"s25", cat:"food", subcat:"dessert",       emoji:"🍰", label:"Dessert shop"},
  {id:"s26", cat:"food", subcat:"dessert",       emoji:"🍦", label:"Ice cream / gelato shop"},
  /* Bars & Pubs */
  {id:"s27", cat:"food", subcat:"bars",          emoji:"🍺", label:"Pub"},
  {id:"s28", cat:"food", subcat:"bars",          emoji:"🍸", label:"Cocktail bar"},
  {id:"s29", cat:"food", subcat:"bars",          emoji:"🍷", label:"Wine bar"},
  {id:"s30", cat:"food", subcat:"bars",          emoji:"🍻", label:"Craft beer bar"},
  {id:"s31", cat:"food", subcat:"bars",          emoji:"📺", label:"Sports bar"},
  /* Food Retail – Grocery */
  {id:"s32", cat:"food", subcat:"grocery",       emoji:"🛒", label:"Supermarket"},
  {id:"s33", cat:"food", subcat:"grocery",       emoji:"🏪", label:"Neighbourhood grocery store"},
  /* Food Retail – Specialty */
  {id:"s34", cat:"food", subcat:"food_specialty",emoji:"🥖", label:"Delicatessen"},
  {id:"s35", cat:"food", subcat:"food_specialty",emoji:"🧀", label:"Cheese shop"},
  {id:"s36", cat:"food", subcat:"food_specialty",emoji:"🥩", label:"Butcher"},
  {id:"s37", cat:"food", subcat:"food_specialty",emoji:"🐟", label:"Fishmonger"},
  {id:"s38", cat:"food", subcat:"food_specialty",emoji:"🥦", label:"Greengrocer"},
  {id:"s39", cat:"food", subcat:"food_specialty",emoji:"🌿", label:"Organic food shop"},
  /* Food Retail – Alcohol */
  {id:"s40", cat:"food", subcat:"food_alcohol",  emoji:"🍾", label:"Wine shop"},
  {id:"s41", cat:"food", subcat:"food_alcohol",  emoji:"🥃", label:"Wine & spirits shop"},

  /* ── RETAIL ── */
  {id:"s42", cat:"retail", subcat:"books_gifts",  emoji:"📚", label:"Bookstore"},
  {id:"s43", cat:"retail", subcat:"books_gifts",  emoji:"🧸", label:"Toy shop"},
  {id:"s44", cat:"retail", subcat:"books_gifts",  emoji:"🎁", label:"Gift shop"},
  {id:"s45", cat:"retail", subcat:"home_life",    emoji:"🏡", label:"Homeware shop"},
  {id:"s46", cat:"retail", subcat:"home_life",    emoji:"💐", label:"Florist"},
  {id:"s47", cat:"retail", subcat:"fashion_pets", emoji:"👗", label:"Clothing shop"},
  {id:"s48", cat:"retail", subcat:"fashion_pets", emoji:"🐾", label:"Pet shop"},
  {id:"s49", cat:"retail", subcat:"hardware",     emoji:"🔧", label:"Hardware / DIY shop"},

  /* ── HEALTH & WELLNESS ── */
  {id:"s50", cat:"health", subcat:"beauty",       emoji:"💇", label:"Hair salon"},
  {id:"s51", cat:"health", subcat:"beauty",       emoji:"💅", label:"Nail salon"},
  {id:"s52", cat:"health", subcat:"beauty",       emoji:"✨", label:"Beauty salon"},
  {id:"s53", cat:"health", subcat:"beauty",       emoji:"✂️", label:"Barbershop"},
  {id:"s54", cat:"health", subcat:"wellness",     emoji:"🧖", label:"Spa"},
  {id:"s55", cat:"health", subcat:"wellness",     emoji:"💆", label:"Massage studio"},
  {id:"s56", cat:"health", subcat:"medical",      emoji:"🏥", label:"Doctor clinic"},
  {id:"s57", cat:"health", subcat:"medical",      emoji:"🦷", label:"Dentist clinic"},
  {id:"s58", cat:"health", subcat:"medical",      emoji:"🩺", label:"Physiotherapy clinic"},
  {id:"s59", cat:"health", subcat:"medical",      emoji:"💊", label:"Pharmacy"},

  /* ── FITNESS & SPORTS ── */
  {id:"s60", cat:"fitness", subcat:"gym",         emoji:"🏋️", label:"Gym"},
  {id:"s61", cat:"fitness", subcat:"gym",         emoji:"🏊", label:"Wellness club"},
  {id:"s62", cat:"fitness", subcat:"gym",         emoji:"🤸", label:"Boutique fitness studio"},
  {id:"s63", cat:"fitness", subcat:"yoga_pilates",emoji:"🧘", label:"Yoga studio"},
  {id:"s64", cat:"fitness", subcat:"yoga_pilates",emoji:"🧘", label:"Pilates studio"},
  {id:"s65", cat:"fitness", subcat:"functional",  emoji:"🏋️", label:"CrossFit gym"},
  {id:"s66", cat:"fitness", subcat:"climbing",    emoji:"🧗", label:"Climbing gym"},
  {id:"s67", cat:"fitness", subcat:"combat",      emoji:"🥊", label:"Boxing gym"},
  {id:"s68", cat:"fitness", subcat:"combat",      emoji:"🥋", label:"Martial arts gym"},
  {id:"s69", cat:"fitness", subcat:"combat",      emoji:"🥋", label:"Jiu-jitsu gym"},
  {id:"s70", cat:"fitness", subcat:"sports_courts",emoji:"🎾", label:"Tennis courts"},
  {id:"s71", cat:"fitness", subcat:"sports_courts",emoji:"🏸", label:"Padel courts"},
  {id:"s72", cat:"fitness", subcat:"sports_courts",emoji:"⚽", label:"Football / 5-a-side pitch"},
  {id:"s73", cat:"fitness", subcat:"sports_courts",emoji:"🏀", label:"Basketball courts"},
  {id:"s74", cat:"fitness", subcat:"sports_courts",emoji:"🏊", label:"Swimming pool"},

  /* ── KIDS & FAMILY ── */
  {id:"s75", cat:"kids", subcat:"kids_play",      emoji:"🧸", label:"Soft play café"},
  {id:"s76", cat:"kids", subcat:"kids_play",      emoji:"🎠", label:"Indoor activity centre"},
  {id:"s77", cat:"kids", subcat:"kids_play",      emoji:"🌳", label:"Outdoor playground"},
  {id:"s78", cat:"kids", subcat:"kids_fitness",   emoji:"🤸", label:"Kids gym"},

  /* ── ENTERTAINMENT ── */
  {id:"s79", cat:"entertain", subcat:"screen_stage",emoji:"🎬", label:"Cinema"},
  {id:"s80", cat:"entertain", subcat:"screen_stage",emoji:"🎭", label:"Theatre"},
  {id:"s81", cat:"entertain", subcat:"music_events",emoji:"🎵", label:"Concert hall / live music venue"},

  /* ── SERVICES & LEARNING ── */
  /* Sports Classes */
  {id:"s82", cat:"services", subcat:"sports_classes",emoji:"🎾", label:"Tennis lessons"},
  {id:"s83", cat:"services", subcat:"sports_classes",emoji:"🏸", label:"Padel lessons"},
  {id:"s84", cat:"services", subcat:"sports_classes",emoji:"🏊", label:"Swimming lessons"},
  {id:"s85", cat:"services", subcat:"sports_classes",emoji:"⚽", label:"Football training"},
  {id:"s86", cat:"services", subcat:"sports_classes",emoji:"🏀", label:"Basketball training"},
  {id:"s87", cat:"services", subcat:"sports_classes",emoji:"🤸", label:"Gymnastics classes"},
  {id:"s88", cat:"services", subcat:"sports_classes",emoji:"🥋", label:"Martial arts classes"},
  /* Fitness Classes */
  {id:"s89", cat:"services", subcat:"fitness_classes",emoji:"🧘", label:"Yoga classes"},
  {id:"s90", cat:"services", subcat:"fitness_classes",emoji:"🧘", label:"Pilates classes"},
  {id:"s91", cat:"services", subcat:"fitness_classes",emoji:"💪", label:"HIIT / fitness classes"},
  {id:"s92", cat:"services", subcat:"fitness_classes",emoji:"🏋️", label:"Strength training classes"},
  {id:"s93", cat:"services", subcat:"fitness_classes",emoji:"🚴", label:"Spin / cycling classes"},
  /* Creative Classes */
  {id:"s94", cat:"services", subcat:"creative_classes",emoji:"🏺", label:"Pottery classes"},
  {id:"s95", cat:"services", subcat:"creative_classes",emoji:"🎨", label:"Painting classes"},
  {id:"s96", cat:"services", subcat:"creative_classes",emoji:"✏️", label:"Drawing classes"},
  {id:"s97", cat:"services", subcat:"creative_classes",emoji:"📷", label:"Photography classes"},
  {id:"s98", cat:"services", subcat:"creative_classes",emoji:"✂️", label:"Craft workshops"},
  /* Learning */
  {id:"s99",  cat:"services", subcat:"learning",    emoji:"🗣️", label:"Language classes"},
  {id:"s100", cat:"services", subcat:"learning",    emoji:"👨‍🍳", label:"Cooking classes"},
  {id:"s101", cat:"services", subcat:"learning",    emoji:"💻", label:"Coding classes"},
  {id:"s102", cat:"services", subcat:"learning",    emoji:"🎵", label:"Music lessons"},
  /* Community */
  {id:"s103", cat:"services", subcat:"community",   emoji:"🏃", label:"Running club"},
  {id:"s104", cat:"services", subcat:"community",   emoji:"📖", label:"Book club"},
  {id:"s105", cat:"services", subcat:"community",   emoji:"♟️", label:"Chess club"},
  {id:"s106", cat:"services", subcat:"community",   emoji:"🎲", label:"Board game club"},
  /* Workspace & Education */
  {id:"s107", cat:"services", subcat:"workspace",   emoji:"💼", label:"Coworking space"},
  {id:"s108", cat:"services", subcat:"workspace",   emoji:"📖", label:"Tutoring centre"},
  /* Household & Repairs */
  {id:"s109", cat:"services", subcat:"household",   emoji:"👕", label:"Laundry / dry cleaners"},
  {id:"s110", cat:"services", subcat:"household",   emoji:"🚲", label:"Bike repair shop"},
  {id:"s111", cat:"services", subcat:"household",   emoji:"📱", label:"Electronics repair shop"},
  /* Pet Services */
  {id:"s112", cat:"services", subcat:"pet_services",emoji:"🐾", label:"Pet grooming"},
];

/* ==================================================
   SERVICE CATALOGUE grouped for VoteFlow
================================================== */
const SERVICE_GROUPS = {
  food: [
    {label:"Restaurants – Cuisine",  subcat:"rest_cuisine"},
    {label:"Restaurants – Concept",  subcat:"rest_concept"},
    {label:"Cafés & Bakeries",       subcat:"cafe"},
    {label:"Cafés & Bakeries",       subcat:"bakery"},
    {label:"Dessert",                subcat:"dessert"},
    {label:"Bars & Pubs",            subcat:"bars"},
    {label:"Grocery",                subcat:"grocery"},
    {label:"Specialty Food",         subcat:"food_specialty"},
    {label:"Wine & Spirits",         subcat:"food_alcohol"},
  ],
  retail: [
    {label:"Books, Toys & Gifts",    subcat:"books_gifts"},
    {label:"Home & Lifestyle",       subcat:"home_life"},
    {label:"Fashion & Pets",         subcat:"fashion_pets"},
    {label:"Hardware",               subcat:"hardware"},
  ],
  health: [
    {label:"Beauty & Grooming",      subcat:"beauty"},
    {label:"Wellness",               subcat:"wellness"},
    {label:"Medical",                subcat:"medical"},
  ],
  fitness: [
    {label:"Gyms & Studios",         subcat:"gym"},
    {label:"Yoga & Pilates",         subcat:"yoga_pilates"},
    {label:"Functional Fitness",     subcat:"functional"},
    {label:"Climbing",               subcat:"climbing"},
    {label:"Combat Sports",          subcat:"combat"},
    {label:"Sports Facilities",      subcat:"sports_courts"},
  ],
  kids: [
    {label:"Play & Activity",        subcat:"kids_play"},
    {label:"Kids Fitness",           subcat:"kids_fitness"},
  ],
  entertain: [
    {label:"Screen & Stage",         subcat:"screen_stage"},
    {label:"Music & Events",         subcat:"music_events"},
  ],
  services: [
    {label:"Sports Classes",         subcat:"sports_classes"},
    {label:"Fitness Classes",        subcat:"fitness_classes"},
    {label:"Creative Classes",       subcat:"creative_classes"},
    {label:"Learning",               subcat:"learning"},
    {label:"Community",              subcat:"community"},
    {label:"Workspace & Education",  subcat:"workspace"},
    {label:"Household & Repairs",    subcat:"household"},
    {label:"Pet Services",           subcat:"pet_services"},
  ],
};

/* ==================================================
   SERVICE QUESTION MODEL
   getServiceQuestions(subcat) -> {level, q1, q2?, q3?}
   level A = rich tags (up to 3)
   level B = light (up to 1-2)
   level C = no extra questions
================================================== */

const SQ = {
  /* ── FOOD ── */
  rest_cuisine: {level:"A", q:"What matters most?", max:3, opts:[
    "Cozy / quiet","Relaxed / casual","Lively","Great for groups","Dog-friendly",
    "Lunch / brunch","Evening","Date night","Celebration","Outdoor space",
    "Design-led / Instagrammable","Authentic food","Innovative concept",
    "Vegetarian / vegan options","Gluten-free options","Great wine selection",
    "Great cocktails","Delivery / takeaway",
  ]},
  rest_concept: {level:"A", q:"What matters most?", max:3, opts:[
    "Relaxed / casual","Lively","Great for groups","Dog-friendly",
    "Quick / casual","Evening","Outdoor space","Authentic food",
    "Innovative concept","Vegetarian / vegan options","Gluten-free options",
    "Delivery / takeaway",
  ]},
  cafe: {level:"A", q:"What matters most?", max:3, opts:[
    "Cozy / quiet","Relaxed / casual","Great for groups","Dog-friendly",
    "Laptop-friendly","Quick stop","Weekday","Weekend","Outdoor space",
    "Design-led / Instagrammable","Healthy options","Local / independent",
  ]},
  bakery: {level:"B", q:"What would you use it for most?", max:2, opts:[
    "Quick stop","Everyday bakery","All-day breakfast / brunch","Weekend destination",
  ]},
  dessert: {level:"B", q:"What matters most?", max:2, opts:[
    "Sit-down experience","Quick takeaway","Evening / weekend treat",
    "Family-friendly","Design-led / Instagrammable","Specialist offer",
  ]},
  bars: {level:"A", q:"What matters most?", max:3, opts:[
    "Relaxed / casual","Lively","Great for groups","Dog-friendly",
    "Evening","Late night","Date night","Celebration","Outdoor space",
    "Great wine selection","Great cocktails","Live music / events","Local / independent",
  ]},
  grocery: {level:"B", q:"What type do you want?", max:1, opts:[
    "Large supermarket","Small neighbourhood store","Premium / curated","Organic-focused",
  ]},
  food_specialty: {level:"B", q:"What matters most?", max:2, opts:[
    "Premium quality","Organic / healthy","Local / independent","Specialist selection",
  ]},
  food_alcohol: {level:"B", q:"What matters most?", max:2, opts:[
    "Premium quality","Specialist selection","Local / independent",
  ]},

  /* ── RETAIL ── */
  books_gifts: {level:"B", q:"What matters most?", max:2, opts:[
    "Local / independent","Premium / curated","Practical / everyday",
  ]},
  home_life: {level:"B", q:"What matters most?", max:2, opts:[
    "Local / independent","Premium / curated","Practical / everyday",
  ]},
  fashion_pets: {level:"B", q:"What type do you want?", max:1, opts:[
    "Everyday / affordable","Premium / boutique","Family / kids-focused",
  ]},
  hardware: {level:"C"},

  /* ── HEALTH ── */
  beauty: {level:"B", q:"What matters most?", max:2, opts:[
    "Quick / practical","Premium / design-led","Relaxed experience","Walk-ins available",
  ]},
  wellness: {level:"B", q:"What matters most?", max:2, opts:[
    "Relaxing / calming","Premium experience","Walk-ins available",
  ]},
  medical: {level:"C"},

  /* ── FITNESS ── */
  gym: {level:"A", q:"What matters most?", max:3, opts:[
    "Beginner-friendly","Serious training","Classes available","Pool / wellness facilities",
    "Coaching available","Flexible hours","Family-friendly (creche)",
    "Outdoor facilities","Community / social gym","Independent training / solo use",
  ]},
  yoga_pilates: {level:"B", q:"What matters most?", max:2, opts:[
    "Beginner-friendly","Relaxed / calming","Structured classes",
    "Pre / post-natal classes","Group classes / community","Individual focus",
  ]},
  functional: {level:"A", q:"What matters most?", max:3, opts:[
    "Beginner-friendly","Serious training","Coaching available","Classes available",
    "Community / social","Flexible hours","Individual training",
  ]},
  climbing: {level:"B", q:"What matters most?", max:2, opts:[
    "Beginner-friendly","Coaching available","Casual climbing",
    "Family-friendly","Social activity","Individual practice",
  ]},
  combat: {level:"A", q:"What matters most?", max:3, opts:[
    "Beginner-friendly","Kids classes","Competitive training",
    "Coaching quality","Small group training","Serious progression","Casual training",
  ]},
  sports_courts: {level:"A", q:"What matters most?", max:3, opts:[
    "Coaching available","Kids programs","Casual play","Competitive play",
    "Indoor / outdoor","Evening access","Social play","Structured use",
  ]},

  /* ── KIDS ── */
  kids_play: {level:"A", q:"What matters most?", max:3, opts:[
    "Structured activities","Free / casual play","Weekday (after school)",
    "Weekend use","Indoor / outdoor",
  ]},
  kids_fitness: {level:"B", q:"What matters most?", max:2, opts:[
    "Structured classes","Beginner-friendly","Fun / social","Kids competitions",
  ]},

  /* ── ENTERTAINMENT ── */
  screen_stage: {level:"B", q:"What matters most?", max:2, opts:[
    "Evening / weekend","Live events","Great for groups","Social experience","Specific shows",
  ]},
  music_events: {level:"B", q:"What matters most?", max:2, opts:[
    "Evening / weekend","Live events","Great for groups","Social experience","Specific genres",
  ]},

  /* ── SERVICES ── */
  sports_classes: {level:"classes", competitive:true},
  fitness_classes: {level:"classes", competitive:false, prenatal:true},
  creative_classes: {level:"classes", competitive:false},
  learning: {level:"classes", competitive:false},
  community: {level:"classes", competitive:false},
  workspace: {level:"B", q:"What matters most?", max:2, opts:[
    "Quiet / focused workspace","Community / networking","Flexible access",
  ]},
  household: {level:"C"},
  pet_services: {level:"C"},
};

// Non-competitive subcats (hide Advanced / competitive option)
const NON_COMPETITIVE = new Set([
  "creative_classes","learning","community",
]);

function getServiceQuestions(subcat) {
  return SQ[subcat] || {level:"C"};
}

function isClassesLevel(subcat) {
  const q = SQ[subcat];
  return q && q.level === "classes";
}

function showCompetitiveOption(subcat) {
  return !NON_COMPETITIVE.has(subcat);
}

/* ==================================================
   FEED — 8 representative services with metrics
   Used for Insights, Reports, Brief seed data
================================================== */



/* ==================================================
   DEMAND METRICS ENGINE
   Based on Cravz metrics spec v1
================================================== */

// ── Normalisation maps ──────────────────────────────
const FREQ_WEIGHT = {
  "few_per_year": 0.025, "monthly": 0.25, "2_3_per_month": 0.6,
  "weekly": 1.0, "multiple_per_week": 2.0,
  // UI label -> key mapping
  "A few times a year": 0.025, "Once a month": 0.25, "2–3× a month": 0.6,
  "Weekly": 1.0, "Multiple times a week": 2.0,
};
const TRAVEL_WEIGHT = {
  "<5": 1.0, "5_10": 1.0, "10_20": 1.05, "20_plus": 1.1,
  "< 5 min walk": 1.0, "5–10 min walk": 1.0,
  "10–20 min walk": 1.05, "20 min+ / drive": 1.1,
};
const SUBST_WEIGHT = {
  "already_local": 1.0, "travel_elsewhere": 1.1,
  "occasionally": 1.05, "dont_get": 0.9,
  "local": 1.0, "leakage": 1.1, "suppressed": 1.05, "unmet": 0.9, "online": 0.95,
};
const SPEND_MID_METRICS = {
  "£0–5":2.5,"£5–10":7.5,"£10–20":15,"£20–35":27,
  "£35–50":42.5,"£50–100":75,"£100–150":125,"£150+":175,
};
const CONF_FACTOR = {
  indicative:0.4, low:0.55, medium:0.7, high:0.85, very_high:1.0
};
const CONF_MAX_SCALE = {
  indicative:5, low:5, medium:10, high:15, very_high:20
};

// ── Area populations (district level only) ─────────
const AREA_POPULATION = {
  "SW4":14200,"SW9":18500,"SW11":22000,"SW2":12800,
  "SE5":16000,"SE1":24000,"SW8":11000,"SW12":15500,
  "SW16":19000,"SW17":21000,"SW18":18000,"SW19":20000,
};

// ── Category benchmarks ─────────────────────────────
const CATEGORY_BENCHMARKS = {
  coffee_bakery:    {target:0.20,capture:0.15},
  casual_dining:    {target:0.15,capture:0.12},
  premium_dining:   {target:0.08,capture:0.10},
  fast_casual:      {target:0.18,capture:0.15},
  dessert:          {target:0.12,capture:0.12},
  brunch:           {target:0.14,capture:0.12},
  wine_bar:         {target:0.10,capture:0.10},
  cocktail_bar:     {target:0.09,capture:0.10},
  pub:              {target:0.18,capture:0.12},
  craft_bar:        {target:0.08,capture:0.10},
  food_retail:      {target:0.25,capture:0.20},
  specialty_food:   {target:0.12,capture:0.15},
  gym:              {target:0.12,capture:0.20},
  boutique_fitness: {target:0.08,capture:0.15},
  yoga:             {target:0.07,capture:0.15},
  combat_sports:    {target:0.04,capture:0.20},
  climbing:         {target:0.05,capture:0.18},
  sports_facility:  {target:0.10,capture:0.15},
  soft_play:        {target:0.08,capture:0.20},
  kids_activity:    {target:0.07,capture:0.18},
  entertainment:    {target:0.10,capture:0.12},
  beauty:           {target:0.12,capture:0.15},
  wellness_spa:     {target:0.06,capture:0.15},
  medical:          {target:0.15,capture:0.25},
  retail_general:   {target:0.08,capture:0.12},
  retail_specialty: {target:0.06,capture:0.12},
  classes_fitness:  {target:0.07,capture:0.15},
  classes_sport:    {target:0.06,capture:0.15},
  classes_creative: {target:0.04,capture:0.12},
  classes_learning: {target:0.05,capture:0.12},
  community:        {target:0.06,capture:0.10},
  workspace:        {target:0.08,capture:0.15},
  household_services:{target:0.20,capture:0.20},
  pet_services:     {target:0.08,capture:0.18},
  fallback:         {target:0.05,capture:0.10},
};

const SUBCAT_TO_BENCHMARK = {
  rest_cuisine:"casual_dining", rest_concept:"fast_casual",
  cafe:"coffee_bakery", bakery:"coffee_bakery", dessert:"dessert",
  bars:"pub", grocery:"food_retail", food_specialty:"specialty_food",
  food_alcohol:"specialty_food", books_gifts:"retail_specialty",
  home_life:"retail_specialty", fashion_pets:"retail_general",
  hardware:"retail_general", beauty:"beauty", wellness:"wellness_spa",
  medical:"medical", gym:"gym", yoga_pilates:"yoga",
  functional:"boutique_fitness", climbing:"climbing", combat:"combat_sports",
  sports_courts:"sports_facility", kids_play:"soft_play",
  kids_fitness:"kids_activity", screen_stage:"entertainment",
  music_events:"entertainment", sports_classes:"classes_sport",
  fitness_classes:"classes_fitness", creative_classes:"classes_creative",
  learning:"classes_learning", community:"community", workspace:"workspace",
  household:"household_services", pet_services:"pet_services",
};

const SERVICE_BENCHMARK_OVERRIDES = {
  s2:"premium_dining",s4:"premium_dining",s15:"premium_dining",s16:"premium_dining",
  s27:"pub",s28:"cocktail_bar",s29:"wine_bar",s30:"craft_bar",s31:"pub",
  s19:"brunch",s22:"fast_casual",s63:"yoga",s64:"yoga",
  s62:"boutique_fitness",s65:"boutique_fitness",
  s54:"wellness_spa",s55:"wellness_spa",
  s75:"soft_play",s76:"kids_activity",
};

// ── Core metric functions ───────────────────────────
function getBenchmarkKey(serviceId, subcat) {
  return SERVICE_BENCHMARK_OVERRIDES[serviceId]
    || SUBCAT_TO_BENCHMARK[subcat]
    || "fallback";
}

function getConfidenceLabel(voices) {
  if(voices < 50)  return "indicative";
  if(voices < 100) return "low";
  if(voices < 200) return "medium";
  if(voices < 500) return "high";
  return "very_high";
}

function computeEWU(coinAlloc, total_coins, freq, travel, subst) {
  var coin_share = coinAlloc / total_coins;
  var fw = FREQ_WEIGHT[freq] || 1.0;
  var tw = TRAVEL_WEIGHT[travel] || 1.0;
  var sw = SUBST_WEIGHT[subst] || 1.0;
  return coin_share * fw * tw * sw;
}

function computeMetrics(votes, serviceId, subcat, areaId) {
  // votes = array of {coins, totalCoins, freq, travel, subst, spend}
  if(!votes || votes.length === 0) return null;

  var voices = votes.filter(function(v){return v.coins > 0;}).length;
  if(voices === 0) return null;

  var totalEWU = 0;
  var weightedSpend = 0;
  var totalCoinShare = 0;
  var totalCoinShareAll = 0;

  votes.forEach(function(v) {
    var cs = v.coins / (v.totalCoins || 10);
    totalCoinShareAll += cs;
    if(v.coins > 0) {
      var ewu = computeEWU(v.coins, v.totalCoins||10, v.freq, v.travel, v.subst);
      totalEWU += ewu;
      var sm = SPEND_MID_METRICS[v.spend] || 15;
      weightedSpend += sm * cs;
      totalCoinShare += cs;
    }
  });

  var avgSpend = totalCoinShare > 0 ? weightedSpend / totalCoinShare : 15;
  var intensity = totalCoinShareAll > 0
    ? Math.round((totalCoinShare / votes.length) * 10 * 10) / 10
    : 0;

  var conf = getConfidenceLabel(voices);
  var confFactor = CONF_FACTOR[conf];

  var weeklyRev = totalEWU * avgSpend;
  var monthlyRev = weeklyRev * 4.3;
  var adjRev = monthlyRev * confFactor;

  // Revenue only shown at low+ confidence
  var showRevenue = voices >= 50;

  // Scaled revenue only at medium+ confidence
  var showScaled = conf === "medium" || conf === "high" || conf === "very_high";
  var scaledLow = null, scaledHigh = null;

  if(showScaled) {
    var pop = AREA_POPULATION[areaId];
    if(pop) {
      var samplePenetration = voices / pop;
      var benchKey = getBenchmarkKey(serviceId, subcat);
      var bench = CATEGORY_BENCHMARKS[benchKey] || CATEGORY_BENCHMARKS.fallback;
      var targetPenetration = bench.target * bench.capture;
      var rawScale = targetPenetration / samplePenetration;
      var maxScale = CONF_MAX_SCALE[conf];
      // Blend with confidence factor to suppress at lower confidence
      var scaleFactor = Math.min(rawScale, maxScale) * confFactor;
      var scaledAdj = Math.max(adjRev * scaleFactor, adjRev); // never lower than measured
      scaledLow  = Math.round(scaledAdj * 0.8);
      scaledHigh = Math.round(scaledAdj * 1.2);
    }
  }

  return {
    voices:    voices,
    intensity: intensity,
    ewu:       Math.round(totalEWU * 100) / 100,
    avgSpend:  Math.round(avgSpend),
    confidence: conf,
    revLow:    showRevenue ? Math.round(adjRev * 0.8) : null,
    revHigh:   showRevenue ? Math.round(adjRev * 1.2) : null,
    scaledLow:  scaledLow,
    scaledHigh: scaledHigh,
    annualLow:  showRevenue ? Math.round(adjRev * 0.8 * 12) : null,
    annualHigh: showRevenue ? Math.round(adjRev * 1.2 * 12) : null,
  };
}

// ── Format helpers ──────────────────────────────────
function fmtRevRange(low, high) {
  if(low === null || high === null) return null;
  function fmt(n) {
    if(n >= 1000000) return "£"+(n/1000000).toFixed(1)+"m";
    if(n >= 1000)    return "£"+(n/1000).toFixed(n>=10000?0:1)+"k";
    return "£"+n;
  }
  return fmt(low)+" – "+fmt(high);
}

function getConfidenceDisplay(conf) {
  var labels = {
    indicative:"Indicative", low:"Low", medium:"Medium",
    high:"High", very_high:"Very High"
  };
  var colors = {
    indicative:C.t3, low:C.amber, medium:C.amber,
    high:C.green, very_high:C.green
  };
  return {label:labels[conf]||conf, color:colors[conf]||C.t3};
}


const FEED = [
  {id:"s75", cat:"kids",    emoji:"🧸", label:"Soft play café",
   voters:284, avgCoins:8.2, momentum:+31,
   spendDist:[0,5,45,35,12,3,0,0], freqDist:[20,55,20,5,0], distrib:[18,42,30,10],
   demo:{age:"25–34",gender:"Mostly women",hh:"Families with kids"}},
  {id:"s1",  cat:"food",    emoji:"🇮🇹", label:"Italian restaurant",
   voters:241, avgCoins:7.1, momentum:+18,
   spendDist:[0,3,20,42,28,6,1,0], freqDist:[15,45,30,8,2], distrib:[12,38,38,12],
   demo:{age:"25–44",gender:"Mixed",hh:"Couples & solo"}},
  {id:"s81", cat:"entertain",emoji:"🎵", label:"Concert hall / live music venue",
   voters:134, avgCoins:5.4, momentum:+12,
   spendDist:[0,2,12,28,38,18,2,0], freqDist:[45,35,14,5,1], distrib:[8,20,38,34],
   demo:{age:"25–44",gender:"Mostly men",hh:"Solo"}},
  {id:"s94", cat:"services", emoji:"🏺", label:"Pottery classes",
   voters:121, avgCoins:7.6, momentum:+15,
   spendDist:[0,3,18,45,28,5,1,0], freqDist:[25,50,20,4,1], distrib:[10,32,42,16],
   demo:{age:"25–44",gender:"Mostly women",hh:"Solo & couples"}},
  {id:"s29", cat:"food",    emoji:"🍷", label:"Wine bar",
   voters:108, avgCoins:6.1, momentum:+18,
   spendDist:[0,3,22,40,28,6,1,0], freqDist:[30,45,20,4,1], distrib:[12,35,38,15],
   demo:{age:"28–44",gender:"Mixed",hh:"Couples & solo"}},
  {id:"s66", cat:"fitness",  emoji:"🧗", label:"Climbing gym",
   voters:97,  avgCoins:5.8, momentum:+22,
   spendDist:[0,2,15,38,32,11,2,0], freqDist:[15,40,35,9,1], distrib:[10,25,42,23],
   demo:{age:"20–35",gender:"Mixed",hh:"Solo & couples"}},
  {id:"s89", cat:"services", emoji:"🧘", label:"Yoga classes",
   voters:89,  avgCoins:6.3, momentum:+9,
   spendDist:[0,4,28,42,22,3,1,0], freqDist:[10,30,45,14,1], distrib:[8,28,44,20],
   demo:{age:"25–44",gender:"Mostly women",hh:"Solo"}},
  {id:"s23", cat:"food",    emoji:"☕", label:"Café",
   voters:76,  avgCoins:4.2, momentum:+7,
   spendDist:[5,20,50,20,4,1,0,0], freqDist:[8,22,40,28,2], distrib:[22,45,25,8],
   demo:{age:"18–45",gender:"Mixed",hh:"All"}},
];

const FEED_WITH_METRICS = FEED.map(function(item){
  return Object.assign({}, item, calcMetrics(item));
});


// ── Synthetic vote builder from FEED aggregate data ─
// Converts FEED item stats into format compatible with computeMetrics
// One vote per voice — attributes assigned by sampling the distributions
function buildSyntheticVotes(item) {
  var votes = [];
  var freqKeys = ["A few times a year","Once a month","2–3× a month","Weekly","Multiple times a week"];
  var spendKeys = ["£0–5","£5–10","£10–20","£20–35","£35–50","£50–100","£100–150","£150+"];
  var distKeys = ["< 5 min walk","5–10 min walk","10–20 min walk","20 min+ / drive"];

  var totalVoices = item.voters || 0;

  // Helper: pick bucket by cumulative probability
  function pickBucket(pctArray, keys) {
    var rand = Math.random();
    var cum = 0;
    for(var i = 0; i < pctArray.length; i++) {
      cum += (pctArray[i] || 0) / 100;
      if(rand <= cum) return keys[i];
    }
    return keys[keys.length - 1];
  }

  // Build one vote per voice using distributions as probabilities
  // Use deterministic sampling (evenly spaced) rather than random to avoid variance
  for(var v = 0; v < totalVoices; v++) {
    var t = v / totalVoices; // 0..1 position through the population

    // Assign freq by cumulative distribution
    var freq = freqKeys[freqKeys.length-1];
    var cum = 0;
    for(var fi = 0; fi < freqKeys.length; fi++) {
      cum += (item.freqDist[fi] || 0) / 100;
      if(t < cum) { freq = freqKeys[fi]; break; }
    }

    // Assign spend by cumulative distribution
    var spend = spendKeys[2]; // default £10-20
    cum = 0;
    // Use a different offset so spend/freq don't perfectly correlate
    var ts = ((v + Math.floor(totalVoices*0.3)) % totalVoices) / totalVoices;
    for(var si = 0; si < spendKeys.length; si++) {
      cum += (item.spendDist[si] || 0) / 100;
      if(ts < cum) { spend = spendKeys[si]; break; }
    }

    // Assign travel by distrib
    var travel = distKeys[1]; // default 5-10 min
    cum = 0;
    var td = ((v + Math.floor(totalVoices*0.6)) % totalVoices) / totalVoices;
    for(var di = 0; di < distKeys.length; di++) {
      cum += (item.distrib && item.distrib[di] ? item.distrib[di] : 25) / 100;
      if(td < cum) { travel = distKeys[di]; break; }
    }

    votes.push({
      coins: Math.round(item.avgCoins || 5),
      totalCoins: 10,
      freq: freq,
      travel: travel,
      subst: "leakage",
      spend: spend,
    });
  }
  return votes;
}

// Pre-compute spec-based metrics for all FEED items
var FEED_METRICS_COMPUTED = {};
FEED_WITH_METRICS.forEach(function(item) {
  var votes = buildSyntheticVotes(item);
  var result = computeMetrics(votes, item.id, item.subcat||"rest_cuisine", "SW4");
  if(result) FEED_METRICS_COMPUTED[item.id] = result;
});

function getItemMetrics(itemId) {
  return FEED_METRICS_COMPUTED[itemId] || null;
}

// ── Concept tag aggregation ─────────────────────────────────
// Returns top N tags with synthetic frequency %s for FEED items
function getConceptTags(item, topN) {
  topN = topN || 10;
  var subcat = item.subcat || "rest_cuisine";
  var sq = SQ[subcat];
  if(!sq || !sq.opts || sq.opts.length === 0) return [];
  var opts = sq.opts;
  var n = opts.length;
  // Deterministic synthetic distribution: use item voters + index as seed
  // Higher index = less popular, but with some randomness via item id
  var seed = item.voters || 100;
  var results = opts.map(function(opt, i) {
    // Base score: inversely proportional to index, modulated by seed
    var base = Math.max(5, Math.round(70 - (i * (65 / n))));
    // Add deterministic variation using char codes
    var variation = 0;
    for(var c = 0; c < Math.min(opt.length, 4); c++) {
      variation += opt.charCodeAt(c);
    }
    var pct = Math.min(92, Math.max(4, base + ((variation * seed) % 18) - 9));
    return {tag: opt, pct: pct};
  });
  // Sort descending and return top N
  results.sort(function(a, b) { return b.pct - a.pct; });
  return results.slice(0, topN);
}

// ── Multi-area simulation (prototype only — Firebase replaces with real queries)
// Simulates per-area metric variation for demo purposes
function getAreaMetrics(item, area, sector) {
  // Deterministic seed from area string
  var seed = 0;
  for(var i=0; i<area.length; i++) seed += area.charCodeAt(i);
  var variance = ((seed * 13 + item.id.charCodeAt(1)) % 30) - 15; // -15 to +15%
  var sectorFactor = 1;
  if(sector) {
    // Sector narrows population — typically 15-35% of area
    var sectorSeed = 0;
    for(var j=0; j<sector.length; j++) sectorSeed += sector.charCodeAt(j);
    sectorFactor = 0.15 + ((sectorSeed * 7 + item.id.charCodeAt(0)) % 20) / 100;
    // Sector variance shifts momentum slightly too
    variance = variance + ((sectorSeed * 3) % 10) - 5;
  }
  return {
    voters: Math.max(5, Math.round(item.voters * (1 + variance/100) * sectorFactor)),
    momentum: Math.max(-10, Math.min(45, item.momentum + ((seed * 7) % 20) - 10)),
    ewu: item.ewu ? Math.max(0.1, item.ewu * (1 + variance/200)) : null,
  };
}

// Aggregate metrics across multiple areas
function getAggregatedMetrics(item, areas, sector) {
  if(!areas || areas.length === 0) return item;
  if(areas.length === 1) return Object.assign({}, item, getAreaMetrics(item, areas[0], sector));
  var totalVoters = 0;
  var totalMomentum = 0;
  areas.forEach(function(area) {
    var m = getAreaMetrics(item, area, sector);
    totalVoters += m.voters;
    totalMomentum += m.momentum;
  });
  return Object.assign({}, item, {
    voters: totalVoters,
    momentum: Math.round(totalMomentum / areas.length),
  });
}

// ── Demand label: EWU-ranked within area (top 25% = high, mid 50% = medium, bottom 25% = low)
function computeDemandLabels(feedItems) {
  var ranked = feedItems.slice().sort(function(a,b){
    var ea = FEED_METRICS_COMPUTED[a.id] ? FEED_METRICS_COMPUTED[a.id].ewu : 0;
    var eb = FEED_METRICS_COMPUTED[b.id] ? FEED_METRICS_COMPUTED[b.id].ewu : 0;
    return eb - ea;
  });
  var n = ranked.length;
  var labels = {};
  ranked.forEach(function(item, i) {
    if(i < Math.ceil(n * 0.25))      labels[item.id] = "high";
    else if(i < Math.ceil(n * 0.75)) labels[item.id] = "medium";
    else                              labels[item.id] = "low";
  });
  return labels;
}
var DEMAND_LABELS = computeDemandLabels(FEED_WITH_METRICS);

function getDemandLabel(itemId) {
  return DEMAND_LABELS[itemId] || "medium";
}

// ── Insight text engine (rule-based, spec v1) ─────────────────────────────
function generateInsightText(concept, areaName) {
  var specM = getItemMetrics(concept.id);
  var voices = concept.voters || 0;
  var intensity = specM ? specM.intensity : Math.round((concept.avgCoins||5)*10/10);
  var ewu = specM ? specM.ewu : 0;
  var demandLabel = getDemandLabel(concept.id);
  var growth = (concept.momentum||0) / 100; // momentum stored as %, convert to decimal
  var name = concept.label;

  // Derive avg_frequency from freqDist
  var freqWeights = [0.025, 0.25, 0.6, 1.0, 2.0];
  var avgFreq = 0;
  if(concept.freqDist) {
    concept.freqDist.forEach(function(pct, i){ avgFreq += (pct/100) * (freqWeights[i]||0); });
  }

  // Derive avg_travel_minutes from distrib
  var distMids = [2.5, 7.5, 15, 25];
  var avgTravel = 0;
  if(concept.distrib) {
    concept.distrib.forEach(function(pct, i){ avgTravel += (pct/100) * (distMids[i]||0); });
  }

  // Substitution — use ACCESS_OPTS mapping (leakage = travel_elsewhere)
  var travelElsewherePct = concept.distrib ? concept.distrib[2] + concept.distrib[3] : 30;
  var alreadyLocalPct = concept.distrib ? concept.distrib[0] + concept.distrib[1] : 30;
  var localPct = alreadyLocalPct;

  // Flags
  var HIGH_INTENSITY  = intensity >= 6;
  var LOW_INTENSITY   = intensity < 4;
  var HIGH_FREQ       = avgFreq >= 0.8;
  var LOW_FREQ        = avgFreq < 0.3;
  var LOCAL_DEMAND    = avgTravel <= 10;
  var DEST_DEMAND     = avgTravel >= 15;
  var UNMET_DEMAND    = travelElsewherePct >= 30;
  var SATURATED       = alreadyLocalPct >= 60;
  var STRONG_GROWTH   = growth >= 0.15;
  var DECLINING       = growth <= -0.10;

  // Derived numbers for use in text
  var voicesFmt = voices;
  var intensityFmt = intensity.toFixed(1);
  var localPctFmt = Math.round(localPct);
  var travelPctFmt = Math.round(travelElsewherePct);
  var freqDesc = avgFreq >= 1.0 ? "weekly" : avgFreq >= 0.5 ? "2–3 times a month" : avgFreq >= 0.2 ? "monthly" : "a few times a year";

  // Rule selection (first match wins)
  var text = "";

  if(demandLabel === "high" && HIGH_INTENSITY && voices >= 100) {
    // Rule 1 — Strong demand (removed HIGH_FREQ requirement — families/leisure naturally lower freq)
    text = voicesFmt+" verified residents in "+areaName+" have backed "+name+", with an intensity score of "+intensityFmt+"/10 — indicating strong personal preference, not passive interest. "+localPctFmt+"% of voters are within a 10-minute walk, suggesting a neighbourhood-level opportunity with a reliable local base.";
  } else if(voices >= 100 && demandLabel !== "high" && LOW_FREQ) {
    // Rule 2 — Popular but low frequency
    text = "Interest in "+name+" is broad, with "+voicesFmt+" residents backing the concept, but visit frequency skews "+freqDesc+". This suggests strong appeal but limited repeat footfall — positioning and membership models may be key to commercial viability.";
  } else if(demandLabel === "high" && voices < 150) {
    // Rule 3 — Under-recognised opportunity
    text = "With "+voicesFmt+" voices and an intensity of "+intensityFmt+"/10, demand for "+name+" is stronger than its scale suggests. Highly engaged users are driving disproportionate signal — this is a niche but commercially robust opportunity.";
  } else if(HIGH_INTENSITY && voices < 150 && HIGH_FREQ) {
    // Rule 4 — High intensity niche
    text = "Demand is concentrated among a smaller group of highly engaged users visiting "+freqDesc+", with intensity at "+intensityFmt+"/10. This supports a targeted or premium positioning rather than a mass-market concept.";
  } else if(LOW_FREQ && intensity >= 5) {
    // Rule 5 — Trial heavy
    text = "Interest in "+name+" is widespread, with "+voicesFmt+" backers, but usage patterns skew occasional — "+freqDesc+" on average. This indicates strong appeal at a trial level rather than consistent repeat demand.";
  } else if(LOCAL_DEMAND && UNMET_DEMAND && HIGH_FREQ) {
    // Rule 6 — Strong local gap
    text = travelPctFmt+"% of voters are currently travelling outside the area to access "+name+", visiting "+freqDesc+". With "+localPctFmt+"% based within a short walk, this signals a clear and underserved local demand.";
  } else if(SATURATED && demandLabel !== "high") {
    // Rule 7 — Saturated
    text = "While "+voicesFmt+" residents have backed "+name+", a significant share already access it locally. This suggests an existing competitive environment where a differentiated offer will be essential.";
  } else if(DEST_DEMAND && HIGH_INTENSITY) {
    // Rule 8 — Destination demand
    text = "Residents show strong willingness to travel for "+name+", with intensity at "+intensityFmt+"/10 despite average travel times above 15 minutes. This indicates destination-level appeal that extends beyond the immediate neighbourhood.";
  } else {
    // Fallback — always includes numbers
    text = voicesFmt+" residents in "+areaName+" have backed "+name+", with an intensity score of "+intensityFmt+"/10. "+localPctFmt+"% of voters are within a 10-minute walk, reflecting a "+( localPctFmt>=50?"locally anchored":"mixed-catchment")+" demand profile.";
  }

  // Confidence overlay
  var confLabel = specM ? specM.confidence : getConfidenceLabel(voices);
  if(confLabel === "indicative") {
    text += " Current data should be interpreted as an early signal due to limited sample size.";
  }

  // Growth overlay
  if(STRONG_GROWTH) {
    text += " Demand is increasing, with growing participation over time.";
  } else if(DECLINING) {
    text += " Demand appears to be softening, with declining participation.";
  }

  return text;
}

// London postcode prefixes -- only these are accepted at launch
const LONDON_PREFIXES = ["EC","WC","E","N","NW","SE","SW","W","BR","CR","DA","EN","HA","IG","KT","RM","SM","TW","UB","WD"];
function isLondonPostcode(pc){
  const clean = pc.trim().toUpperCase().replace(/\s/g,"");
  return LONDON_PREFIXES.some(p=>clean.startsWith(p) && (p.length===2 ? /^[A-Z]{2}/.test(clean) : true));
}

// Waitlist store -- in production this would be a backend call
const WAITLIST = [];
function addToWaitlist(entry){ WAITLIST.push({...entry, ts:new Date().toISOString()}); }


// (Seasonal items removed in V1)



/* ==================================================
   INDUSTRY TAXONOMY
   Every item tagged with industries that can cross-sell it.
   Industries also carry the segment IDs from BIZ_SEGMENTS
   so we can match against business account type at signup.
================================================== */
const INDUSTRIES = [
  {id:"restaurant",  label:"Restaurant / café / bar",  emoji:"🍽️", segment:"restaurant"},
  {id:"butcher",     label:"Butcher / deli",            emoji:"🥩", segment:"retail_food"},
  {id:"bakery",      label:"Bakery / patisserie",       emoji:"🥐", segment:"retail_food"},
  {id:"fishmonger",  label:"Fish shop",                 emoji:"🐟", segment:"retail_food"},
  {id:"grocery",     label:"Grocer / food retail",      emoji:"🛒", segment:"retail_food"},
  {id:"bar",         label:"Bar / pub",                 emoji:"🍺", segment:"restaurant"},
  {id:"cafe",        label:"Café / coffee shop",        emoji:"☕", segment:"restaurant"},
  {id:"fitness",     label:"Gym / fitness studio",      emoji:"💪", segment:"fitness"},
  {id:"wellness",    label:"Yoga / wellness",           emoji:"🧘", segment:"fitness"},
  {id:"experience",  label:"Experience / entertainment",emoji:"🎭", segment:"experience"},
  {id:"retail_other",label:"Retail — other",            emoji:"🛍️", segment:"retail_other"},
  {id:"childcare",   label:"Family / childcare",        emoji:"👶", segment:"education"},
];

// Each item maps to the industries Cravz suggests as relevant.
// Businesses can then confirm/add their own at onboarding.
const ITEM_INDUSTRIES = {
  // products
  "p1": ["restaurant","butcher","grocery"],          // rotisserie chicken
  "p2": ["bakery","cafe","grocery"],                 // fresh bagels
  "p3": ["restaurant","cafe"],                       // neapolitan pizza
  "p4": ["butcher","grocery","restaurant"],          // quality butcher
  "p5": ["bakery","cafe","grocery"],                 // french patisserie
  "p6": ["fishmonger","restaurant","grocery"],       // fresh sushi
  "p7": ["restaurant","cafe"],                       // street tacos
  "p8": ["grocery","bakery","butcher"],              // cheese shop
  "p9": ["cafe","restaurant","grocery"],             // artisan gelato
  "p10":["cafe","grocery"],                          // specialty coffee
  "p11":["cafe","grocery","wellness"],               // cold press juices
  "p12":["butcher","grocery","restaurant"],          // artisan deli
  // businesses
  "b1": ["childcare","cafe","experience"],           // soft play cafe
  "b2": ["retail_other","experience"],               // vinyl record shop
  "b3": ["fitness","experience"],                    // climbing gym
  "b4": ["restaurant","bar"],                        // late-night ramen
  "b5": ["retail_other","cafe"],                     // independent bookshop
  "b6": ["retail_other","grocery"],                  // plant shop / florist
  "b7": ["cafe","restaurant"],                       // dog-friendly cafe
  "b8": ["bar","restaurant"],                        // cocktail bar
  "b9": ["experience","retail_other"],               // art gallery
  "b10":["retail_other"],                            // vintage fashion
  "b11":["fitness","wellness"],                      // swimming pool
  "b12":["fitness","experience"],                    // skate park
  // activities
  "a1": ["experience","fitness","bar"],              // salsa dancing
  "a2": ["experience","wellness"],                   // pottery workshops
  "a3": ["wellness","fitness"],                      // aerial yoga
  "a4": ["experience","bar"],                        // improv comedy
  "a5": ["restaurant","experience"],                 // cooking classes
  "a6": ["experience","retail_other"],               // music lessons
  "a7": ["fitness","experience"],                    // boxing
  "s89": ["fitness","wellness"],                      // running club
  "a9": ["experience","bar","cafe"],                 // board game nights
  "a10":["experience","wellness"],                   // gardening club
  "a11":["experience","retail_other"],               // photography walks
  "a12":["experience","wellness"],                   // life drawing
};

// Adjacent area demand data -- simulated monthly snapshots
// Each district carries demand scores per item relative to SW4 baseline
const ADJACENT_DEMAND = {
  "SW9": [
    {id:"b4",label:"Late-night ramen",   emoji:"🍜",cat:"business",voters:94, momentum:+28,prevVoters:73},
    {id:"a1",label:"Salsa / latin dancing",emoji:"💃",cat:"activity",voters:112,momentum:+34,prevVoters:84},
  ],
  "SW11":[
    {id:"b1",label:"Soft play café",     emoji:"🧸",cat:"business",voters:198,momentum:+41,prevVoters:140},
    {id:"b7",label:"Dog-friendly café",  emoji:"🐾",cat:"business",voters:76, momentum:+29,prevVoters:59},
  ],
  "SW2": [
    {id:"a3",label:"Aerial yoga",        emoji:"🧘",cat:"activity",voters:58, momentum:+44,prevVoters:40},
    {id:"b4",label:"Late-night ramen",   emoji:"🍜",cat:"business",voters:71, momentum:+38,prevVoters:51},
  ],
  "SE5": [
    {id:"b4",label:"Late-night ramen",   emoji:"🍜",cat:"business",voters:88, momentum:+32,prevVoters:67},
    {id:"a1",label:"Salsa / latin dancing",emoji:"💃",cat:"activity",voters:79,momentum:+26,prevVoters:63},
  ],
  "SW12":[
    {id:"b1",label:"Soft play café",     emoji:"🧸",cat:"business",voters:112,momentum:+22,prevVoters:92},
    {id:"a2",label:"Pottery workshops",  emoji:"🏺",cat:"activity",voters:66, momentum:+14,prevVoters:58},
  ],
};

// -- Cross-sell matching logic
// Given a business's declared industries, find feed items they can cross-sell
function getCrossSellOpportunities(declaredIndustries, homeArea="SW4", minVoters=100){
  return FEED_WITH_METRICS
    .filter(item=>{
      const itemInds = ITEM_INDUSTRIES[item.id]||[];
      const hasOverlap = itemInds.some(ind=>declaredIndustries.includes(ind));
      return hasOverlap && item.voters>=minVoters;
    })
    .sort((a,b)=>b.voters-a.voters);
}

// Adjacent area opportunities for a given set of industries
function getAdjacentOpportunities(declaredIndustries, homeArea="SW4", minVoters=100){
  const adjacent = Object.entries(ADJACENT_DEMAND)
    .filter(([area])=>area!==homeArea)
    .flatMap(([area,items])=>
      items
        .filter(item=>{
          const itemInds=ITEM_INDUSTRIES[item.id]||[];
          return itemInds.some(ind=>declaredIndustries.includes(ind)) && item.voters>=minVoters;
        })
        .map(item=>({...item,area}))
    )
    .sort((a,b)=>b.momentum-a.momentum);
  return adjacent;
}

// Monthly digest -- what would be sent to a free business account
function getMonthlyDigest(declaredIndustries, homeArea="SW4"){
  const homeFeed = FEED_WITH_METRICS.filter(item=>{
    const itemInds=ITEM_INDUSTRIES[item.id]||[];
    return itemInds.some(ind=>declaredIndustries.includes(ind)) && item.voters>=100;
  }).sort((a,b)=>b.momentum-a.momentum).slice(0,1)[0];

  const adjacentTop = getAdjacentOpportunities(declaredIndustries,homeArea,100).slice(0,1)[0];

  const competitorCount = 1; // simulated

  return {homeFeed, adjacentTop, competitorCount, homeArea};
}


// Bimonthly nudge messages
const NUDGES = [
  {id:"votes_moving", icon:"🚀", color:C.green,
   title:"Your votes are gaining ground",
   body:"Soft play café just hit 300 voices in SW4. Your coins helped push it to #1.",
   cta:"See the rankings"},
  {id:"monthly_coins", icon:"✨", color:C.purple,
   title:"Anything changed lately?",
   body:"It's been 2 months since your last update. Does SW4 still need the same things?",
   cta:"Review my votes"},
  {id:"business_looking", icon:"👀", color:C.coral,
   title:"A business is looking at SW4",
   body:"A café operator is evaluating your area right now. Your signal matters.",
   cta:"Add more weight"},
  {id:"new_items", icon:"⭐", color:C.amber,
   title:"3 new things to vote on",
   body:"Lebanese restaurant, outdoor cinema, and a bouldering wall just joined SW4's wishlist.",
   cta:"Vote on them"},
];


/* ==================================================
   NOTIFICATION DATA
   Combines nudges + pre-launch opening notifications
================================================== */
const CLOSING_NOTIFS = [
  {
    id:"notif_open_softplay", type:"opening",
    icon:"🟢", color:"#2ECC8A",
    title:"It's here.",
    body:"The soft play café in SW4 that 284 residents asked for has opened. You helped make this happen.",
    cta:"See what opened",
    area:"SW4", ts:"2 days ago"
  },
  {
    id:"notif_soon_pilates", type:"opening_soon",
    icon:"🔑", color:"#E8513A",
    title:"Something you voted for is opening in SW11",
    body:"A fitness studio you helped signal demand for is confirmed and opening soon.",
    cta:"See what's coming",
    area:"SW11", ts:"4 days ago"
  },
  {
    id:"notif_eval_ramen", type:"evaluating",
    icon:"🔍", color:"#E8A830",
    title:"A business is looking at your area",
    body:"Someone is seriously evaluating opening a restaurant / café in SW4. Your demand signal helped put this area on their radar.",
    cta:"See what's in demand",
    area:"SW4", ts:"5 days ago"
  },
  {
    id:"notif_prelaunch_ramen", type:"prelaunch",
    icon:"📣", color:"#9B7DF5",
    title:"A business wants your input",
    body:"Someone planning a late-night ramen restaurant in SW9 has published a pre-launch page. Answer a few questions to help shape what opens.",
    cta:"Answer their questions",
    cat:"food",
    area:"SW9", ts:"1 week ago",
    surveyId:"demo_pl1"
  },
  {
    id:"notif_almostthere_bakery", type:"almost_there",
    icon:"⚡", color:"#E8A830",
    title:"Artisan bakery is almost there",
    body:"Demand for an artisan bakery in SW4 is 12 voices away from High Confidence. The more people who vote, the stronger the signal to businesses considering your area.",
    cta:"Share with neighbours",
    area:"SW4", ts:"3 days ago"
  },
];

const ALL_NOTIFS = [
  ...CLOSING_NOTIFS,
  ...NUDGES.map(n=>({...n, type:"nudge", ts:"This week", area:"SW4"})),
];

// Tier definitions
// ── Access tiers (time-limited, not subscriptions) ──────────────
const TIERS = [
  {
    id:"free", name:"Free", price:"£0", period:"",
    color:C.green, badge:null,
    headline:"See what your area is missing",
    desc:"Start exploring local demand instantly.",
    areas:1, days:null,
    features:["1 area included","Top concepts ranking","Demand level (High / Medium / Low)","Voice count"],
    locked:["Spend & frequency data","Revenue estimates","Demographics","The Brief","Pre-launch data"],
  },
  {
    id:"builder", name:"Builder", price:"£149", period:"30 days access",
    color:C.purple, badge:null,
    headline:"Validate your concept before you commit",
    desc:"The data you need to de-risk your location decision.",
    areas:3, days:30,
    features:["3 areas included","Full concept rankings","What demand is growing vs fading","How often people will come","How much they will spend","How far people will travel","Compare multiple concepts"],
    locked:["Revenue potential","Customer demographics","The Brief","Pre-launch data"],
  },
  {
    id:"investor", name:"Investor", price:"£399", period:"90 days access",
    color:C.coral, badge:"Most popular",
    headline:"Know if it is worth opening before you spend a pound",
    desc:"Everything you need to validate, pitch, and decide.",
    areas:5, days:90,
    features:["Everything in Builder, plus:","Revenue potential (monthly and yearly)","Customer demographics","Demand leakage — unmet demand leaving the area","What people actually care about","The Brief — what locals are asking for","Pre-launch survey data","Multi-area comparison","District-level data"],
    locked:[],
  },
];

function tierAlias(id){
  var map = {starter:"builder", pro:"builder", proplus:"investor", enterprise:"investor"};
  return map[id]||id;
}
function tierIdx(id){ return TIERS.findIndex(function(t){return t.id===tierAlias(id);}); }
function canSee(myTier,minTier){ return tierIdx(myTier)>=tierIdx(minTier); }

function conf(v){
  if(v>=500) return {label:"Very high",tier:4,color:C.green};
  if(v>=200) return {label:"High",     tier:3,color:C.green};
  if(v>=100) return {label:"Medium",   tier:2,color:C.amber};
  if(v>=50)  return {label:"Low",      tier:1,color:C.coral};
  return           {label:"Indicative",tier:0,color:C.t3};
}
function fmtMoney(n){ return n>=1000?`£${(n/1000).toFixed(1)}k`:`£${n}`; }
function fmtAvgSpend(n){ return `£${n.toFixed(0)}`; }
function fmtFreq(vpm){ 
  if(vpm>=8)  return "Multiple times/wk";
  if(vpm>=3.5)return "Weekly";
  if(vpm>=1.8)return "2–3× a month";
  return "Once a month";
}

const SECTORS_MAP = {
  "SW4":["SW4 0","SW4 5","SW4 6","SW4 7","SW4 8","SW4 9"],
  "SW9":["SW9 0","SW9 6","SW9 7","SW9 8","SW9 9"],
  "SW11":["SW11 1","SW11 2","SW11 3","SW11 4","SW11 5","SW11 6"],
  "SW2":["SW2 1","SW2 3","SW2 4","SW2 5"],
  "SE5":["SE5 0","SE5 7","SE5 8","SE5 9"],
  "SE1":["SE1 0","SE1 6","SE1 7","SE1 8","SE1 9"],
};
const ALL_DISTRICTS=[
  "SW1","SW2","SW3","SW4","SW5","SW6","SW7","SW8","SW9","SW10","SW11","SW12","SW13","SW14","SW15","SW16","SW17","SW18","SW19","SW20",
  "SE1","SE2","SE3","SE4","SE5","SE6","SE7","SE8","SE9","SE10","SE11","SE12","SE13","SE14","SE15","SE16","SE17","SE18","SE19","SE20","SE21","SE22","SE23","SE24","SE25","SE26","SE27","SE28",
  "E1","E2","E3","E4","E5","E6","E7","E8","E9","E10","E11","E12","E13","E14","E15","E16","E17","E18","E20",
  "EC1","EC2","EC3","EC4",
  "WC1","WC2",
  "W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12","W13","W14",
  "NW1","NW2","NW3","NW4","NW5","NW6","NW7","NW8","NW9","NW10","NW11",
  "N1","N2","N3","N4","N5","N6","N7","N8","N9","N10","N11","N12","N13","N14","N15","N16","N17","N18","N19","N20","N21","N22",
  "EN1","EN2","EN3","EN4","EN5",
  "HA0","HA1","HA2","HA3","HA4","HA5","HA6","HA7","HA8","HA9",
  "UB1","UB2","UB3","UB4","UB5","UB6","UB7","UB8","UB10",
  "TW1","TW2","TW3","TW4","TW5","TW6","TW7","TW8","TW9","TW10","TW11","TW12","TW13","TW14",
  "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9",
  "SM1","SM2","SM3","SM4","SM5","SM6",
  "CR0","CR2","CR3","CR4","CR5","CR6","CR7","CR8",
  "BR1","BR2","BR3","BR4","BR5","BR6","BR7","BR8",
  "DA1","DA5","DA6","DA7","DA8","DA14","DA15","DA16","DA17",
  "IG1","IG2","IG3","IG4","IG5","IG6","IG7","IG8","IG11",
  "RM1","RM2","RM3","RM5","RM6","RM7","RM8","RM9","RM10","RM11","RM12","RM13","RM14",
];
/* ==================================================
   3-MONTH TREND DATA (simulated -- labelled as sample)
   Structure: area -> item -> [month-2, month-1, current]
================================================== */
const TREND_DATA = {
  "SW4": {
    "b1": [198, 241, 284],   // Soft play cafe -- strong growth
    "b4": [74,  94,  118],   // Late-night ramen -- steady climb
    "a1": [121, 143, 167],   // Salsa dancing -- consistent
    "p1": [109, 128, 142],   // Rotisserie chicken
    "b2": [119, 127, 134],   // Vinyl record shop -- slowing
    "a2": [98,  109, 121],   // Pottery workshops
    "p3": [71,  83,  97],    // Neapolitan pizza
    "p2": [88,  92,  98],    // Fresh bagels -- plateauing
  },
  "SW9": {
    "b4": [51,  73,  94],
    "a1": [61,  84,  112],
    "p1": [60,  74,  88],
    "p4": [38,  55,  67],
  },
  "SW11": {
    "b1": [89,  140, 198],
    "p3": [98,  121, 143],
    "p2": [68,  80,  89],
    "b7": [36,  59,  76],
  },
  "SW2":  {"a3":[22,40,58],"p10":[56,71,82],"b4":[32,51,71]},
  "SW12": {"b1":[68,92,112],"p5":[44,72,94],"p2":[55,65,77]},
  "SE5":  {"b4":[44,67,88],"a1":[46,63,79],"p1":[40,54,61]},
};

const MONTHS_LABEL = ["2 months ago","Last month","This month"];

// Comparable areas for the agent report
const COMPARABLE_AREAS = {
  "SW4":  [{area:"SW9",similarity:"Adjacent — similar demographics",score:87},{area:"SW11",similarity:"Higher footfall corridor",score:72},{area:"SW2",similarity:"Emerging — lower competition",score:65}],
  "SW9":  [{area:"SW4",similarity:"Adjacent — established",score:88},{area:"SE5",similarity:"Similar income profile",score:74},{area:"SW2",similarity:"Regenerating rapidly",score:61}],
  "SW11": [{area:"SW4",similarity:"Adjacent — strong families",score:85},{area:"SW12",similarity:"Similar catchment radius",score:79},{area:"SW3",similarity:"Higher spend, less footfall",score:63}],
  "SE5":  [{area:"SW9",similarity:"Adjacent — fast-changing",score:82},{area:"SE17",similarity:"Similar stage of regeneration",score:68},{area:"SW4",similarity:"Established benchmark",score:60}],
};

// What exists already -- for gap analysis (developer report)
const EXISTING_SUPPLY = {
  "SW4":  {restaurant:4,fitness:1,retail_food:2,retail_other:3,experience:1,education:0},
  "SW9":  {restaurant:3,fitness:1,retail_food:1,retail_other:2,experience:0,education:1},
  "SW11": {restaurant:6,fitness:2,retail_food:3,retail_other:4,experience:2,education:1},
  "SW2":  {restaurant:2,fitness:0,retail_food:1,retail_other:1,experience:0,education:0},
  "SW12": {restaurant:3,fitness:1,retail_food:2,retail_other:2,experience:1,education:1},
  "SE5":  {restaurant:3,fitness:0,retail_food:1,retail_other:2,experience:1,education:0},
};

// Per-area demand + supply -- derived deterministically per postcode
// so any area a user selects produces consistent, area-specific numbers.
// Demand index = base FEED voter totals adjusted by an area seed.
// Supply estimate = realistic count for inner/outer London postcodes.
function areaHash(area){
  // Simple deterministic hash 0-100 from postcode string
  let h=0; area.split("").forEach(function(c){h=(h*31+c.charCodeAt(0))&0xFFFF;});
  return h/0xFFFF; // 0-1
}
const CAT_LABELS_REPORT = {
  restaurant:"Restaurant / café / bar",
  fitness:"Fitness / wellness / sport",
  retail_food:"Retail — food & drink",
  retail_other:"Retail — other",
  experience:"Entertainment / experience",
  education:"Education / childcare",
};
// Base demand voices per category derived from actual FEED data
const BASE_DEMAND = {
  restaurant: FEED.filter(i=>["b4","b5","b6","b13","b14","b15","b16","b17"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 284,
  fitness:    FEED.filter(i=>["b4"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 118,
  retail_food: FEED.filter(i=>["p1","p2","p3"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 238,
  retail_other:FEED.filter(i=>["b2"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 134,
  experience:  FEED.filter(i=>["a1","a2"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 288,
  education:   FEED.filter(i=>["b1"].includes(i.id)).reduce((s,i)=>s+i.voters,0) || 284,
};
// Typical supply counts for a London postcode district
// Inner postcodes (SW1-SW11, SE1-SE17, E1-E9, EC, WC, W1-W14, N1-N8, NW1-NW6) tend to have more
const INNER = /^(SW[1-9]$|SW1[0-1]|SE[1-9]$|SE1[0-7]|E[1-9]$|EC|WC|W[1-9]$|W1[0-4]|N[1-8]$|NW[1-6]$)/;
const BASE_SUPPLY = (area) => {
  const inner = INNER.test(area);
  return {
    restaurant:  inner ? 6  : 3,
    fitness:     inner ? 2  : 1,
    retail_food: inner ? 3  : 2,
    retail_other:inner ? 4  : 2,
    experience:  inner ? 2  : 1,
    education:   inner ? 1  : 1,
  };
};
function getAreaDemand(area){
  const h = areaHash(area);
  // Scale demand =25% based on area hash for variation
  const scale = 0.75 + h*0.5;
  return Object.fromEntries(Object.entries(BASE_DEMAND).map(([k,v])=>[k, Math.round(v*scale)]));
}
function getAreaSupply(area){
  const base = BASE_SUPPLY(area);
  const h = areaHash(area);
  // Add small variance to supply counts (0 or +1 per category)
  return Object.fromEntries(Object.entries(base).map(([k,v],i)=>{
    const extra = ((h*100*(i+1))&3) > 2 ? 1 : 0;
    return [k, v+extra];
  }));
}
// Gap = demand voices unserved. demand/supply_capacity where capacity = supply*avg_demand_per_unit
// We treat each existing business as serving ~15 voices on average.
// Gap score = demand - (supply * 15), clamped to show shortage/surplus.
const VOICES_PER_UNIT = 15;
function getGapScore(demand, supply){
  return demand - supply * VOICES_PER_UNIT;
}

const DEMAND_SCORE = {
  restaurant:89, fitness:76, retail_food:82, retail_other:54, experience:71, education:68
};


/* ==================================================
   ATOMS
================================================== */
function Chip({label,active,onClick,color=C.coral,sm}){
  return <button onClick={onClick} style={{...ty.sm,padding:sm?"5px 10px":"6px 14px",borderRadius:20,border:`1px solid ${active?color:C.line}`,background:active?`${color}1A`:"transparent",color:active?color:C.t2,cursor:"pointer",transition:"all .14s",whiteSpace:"nowrap"}}>{label}</button>;
}
function SLabel({children,color,noMargin}){
  return <div style={{...ty.label,color:color||C.t3,marginBottom:noMargin?0:10}}>{children}</div>;
}
function Card({children,style={}}){
  return <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:18,padding:"18px",...style}}>{children}</div>;
}
function HR(){ return <div style={{height:1,background:C.line}}/>; }

/* -- AreaPicker -- shared searchable district selector ----------------------- */
function AreaPicker({selected, onChange, maxSelect=99, accentColor, showPrimary=false, onBump}){
  const [q, setQ] = useState("");
  const filtered = q.trim().length>0
    ? ALL_DISTRICTS.filter(d=>d.toLowerCase().startsWith(q.trim().toLowerCase()))
    : ALL_DISTRICTS;
  const groups = ["SW","SE","E","EC","WC","W","NW","N","EN","HA","UB","TW","KT","SM","CR","BR","DA","IG","RM"];
  const grouped = q.trim().length>0
    ? [{prefix:"Results", districts:filtered}]
    : groups.map(p=>({prefix:p, districts:ALL_DISTRICTS.filter(d=>d.startsWith(p)&&!ALL_DISTRICTS.filter(d2=>d2.startsWith(p+"W")||d2.startsWith(p+"E")||d2.startsWith(p+"S")).includes(d)||d.startsWith(p+"W")||d.startsWith(p+"E")||d.startsWith(p+"S") ? false : true)})).filter(g=>g.districts.length>0);
  // simple grouping: just prefix-based
  const simpleGrouped = q.trim().length>0
    ? [{prefix:"Results", districts:filtered}]
    : (() => {
        const prefixes = [];
        const seen = new Set();
        ALL_DISTRICTS.forEach(d => {
          const pre = d.replace(/\d.*$/,"");
          if(!seen.has(pre)){ seen.add(pre); prefixes.push(pre); }
        });
        return prefixes.map(p => ({prefix:p, districts:ALL_DISTRICTS.filter(d=>d.replace(/\d.*$/,"")=== p)})).filter(g=>g.districts.length>0);
      })();
  const color = accentColor || C.coral;
  return (
    <div>
      {/* Selected chips */}
      {selected.length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {selected.map((d,i)=>(
            <button key={d} onClick={()=>onChange(selected.filter(x=>x!==d))}
              style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,
                border:`1px solid ${i===0&&showPrimary?color:C.amber}`,
                background:i===0&&showPrimary?`${color}18`:`${C.amber}12`,
                color:i===0&&showPrimary?color:C.amber,
                cursor:"pointer",...ty.meta,fontWeight:700}}>
              {showPrimary&&i===0&&<span style={{fontSize:9}}>★</span>}
              {d}
              <span style={{fontSize:13,opacity:.6,fontWeight:400,marginLeft:1}}>×</span>
            </button>
          ))}
        </div>
      )}
      {/* Search box */}
      <div style={{position:"relative",marginBottom:12}}>
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search postcode (e.g. SW4, E1…)"
          style={{width:"100%",padding:"10px 12px 10px 36px",borderRadius:10,
            border:`1px solid ${q?color:C.line}`,background:C.surface2,
            color:C.t1,fontFamily:sans,fontSize:13,outline:"none",boxSizing:"border-box"}}
        />
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,opacity:.5}}>🔍</span>
        {q&&<button onClick={()=>setQ("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>}
      </div>
      {/* Grouped list */}
      <div style={{maxHeight:260,overflowY:"auto",paddingRight:2}}>
        {simpleGrouped.map(({prefix,districts})=>(
          <div key={prefix} style={{marginBottom:10}}>
            <div style={{...ty.label,color:C.t3,fontSize:9,marginBottom:5,letterSpacing:"0.1em"}}>{prefix}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {districts.map(d=>{
                const idx=selected.indexOf(d);
                const sel=idx!==-1;
                const isPri=showPrimary&&idx===0;
                const atLimit=!sel&&selected.length>=maxSelect&&maxSelect!==99;
                return (
                  <button key={d}
                    onClick={()=>{
                      if(atLimit){onBump&&onBump();return;}
                      onChange(sel?selected.filter(x=>x!==d):[...selected,d]);
                    }}
                    style={{padding:"5px 10px",borderRadius:7,
                      border:`1px solid ${isPri?color:sel?C.amber:atLimit?C.surface2:C.line}`,
                      background:isPri?`${color}18`:sel?`${C.amber}10`:"transparent",
                      color:isPri?color:sel?C.amber:atLimit?C.t3:C.t2,
                      cursor:atLimit?"not-allowed":"pointer",...ty.meta,
                      fontWeight:sel?700:400,transition:"all .1s",fontSize:12}}>
                    {isPri&&<span style={{fontSize:8,marginRight:3}}>★</span>}
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {simpleGrouped.length===0&&<div style={{...ty.meta,color:C.t3,textAlign:"center",padding:"20px 0"}}>No postcodes match "{q}"</div>}
      </div>
    </div>
  );
}

function ConfBar({voters}){
  const c=conf(voters);
  return <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{display:"flex",gap:2,alignItems:"flex-end"}}>{[1,2,3,4].map(b=><div key={b} style={{width:3,height:3+b*2.5,borderRadius:1.5,background:b<=c.tier?c.color:C.line}}/>)}</div><span style={{...ty.meta,color:c.color,fontWeight:600}}>{c.label}</span></div>;
}
function CravzLogo({size=28}){
  return <div style={{display:"flex",alignItems:"baseline",gap:0}}><span style={{fontFamily:serif,fontSize:size,fontWeight:700,color:C.t1,letterSpacing:-0.8,lineHeight:1}}>Cravz</span><span style={{width:size*0.16,height:size*0.16,borderRadius:"50%",background:C.coral,display:"inline-block",marginBottom:size*0.05,marginLeft:1,flexShrink:0}}/></div>;
}
function CoinStack({remaining,total=10}){
  const max=6,filled=Math.max(0,Math.round((remaining/total)*max));
  return <div style={{display:"flex",flexDirection:"column-reverse",alignItems:"center",gap:3}}>{Array.from({length:max}).map((_,i)=>{const on=i<filled;return <div key={i} style={{width:40-i*3,height:9,borderRadius:5,background:on?`linear-gradient(180deg,#F07858 0%,${C.coral} 55%,#B03020 100%)`:C.surface2,border:`1px solid ${on?"#943020":C.line}`,boxShadow:on?`0 2px 8px ${C.coral}30`:"none",transition:"all .3s"}}/>;})}<span style={{...ty.meta,color:C.coral,fontWeight:700,marginTop:6,fontSize:12}}>{remaining}</span></div>;
}

/* Intensity bar -- X/10 */
function IntensityBar({score,color=C.coral}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <div style={{display:"flex",gap:2}}>
        {Array.from({length:10}).map((_,i)=>(
          <div key={i} style={{width:4,height:10,borderRadius:2,background:i<Math.round(score)?color:C.line,transition:"background .2s"}}/>
        ))}
      </div>
      <span style={{...ty.meta,color,fontWeight:700}}>{score.toFixed(1)}/10</span>
    </div>
  );
}

/* Catchment badge */
function CatchmentBadge({catchment,catchmentColor}){
  const icons={"Hyper-local":"📍","Local":"🚶","Neighbourhood":"🏘️","Destination":"🚗"};
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:20,background:`${catchmentColor}15`,border:`1px solid ${catchmentColor}25`}}>
      <span style={{fontSize:11}}>{icons[catchment]||"📍"}</span>
      <span style={{...ty.meta,color:catchmentColor,fontWeight:600}}>{catchment}</span>
    </div>
  );
}

/* Distance distribution bar */
function DistribBar({distrib}){
  const labels=["<5min","5–10","10–20","20+"];
  const colors=[C.coral,C.amber,C.purple,C.green];
  return (
    <div>
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:6}}>
        {distrib.map((pct,i)=>pct>0&&<div key={i} style={{width:`${pct}%`,background:colors[i],transition:"width .3s"}}/>)}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {distrib.map((pct,i)=>pct>0&&(
          <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:colors[i]}}/>
            <span style={{...ty.meta,color:C.t3}}>{labels[i]} <span style={{color:colors[i],fontWeight:600}}>{pct}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================================================
   VOTE / SUGGEST UNIFIED FLOW
================================================== */

// -- Sub-components for grouped catalogue rendering
function CatalogueItem({opt, coins, meta, cfg, selCat, coinsLeft, setSelItem, setSpend, setFreq, setDist, setAccess, setStep, setSelAttrs, setActAudience, setActStyle, setActAccess, setSelCoins}){
  const hasV = coins > 0;
  const canAdd = coinsLeft(selCat) > 0;
  function openGate(){
    if(!canAdd && !hasV) return;
    setSelItem(opt);setSpend("");setFreq("");setDist("");setAccess("");
    setSelAttrs(new Set());setActAudience("");setActStyle("");setActAccess("");
    setSelCoins(hasV ? coins : 1);
    setStep("gate");
  }
  return (
    <div onClick={openGate}
      style={{background:hasV?cfg.bg:C.surface,border:`1px solid ${hasV?cfg.color+"45":C.line}`,borderRadius:12,padding:"11px 13px",transition:"all .15s",cursor:(canAdd||hasV)?"pointer":"default"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:9,background:C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{opt.emoji}</div>
        <div style={{flex:1}}>
          <div style={{...ty.bodyMd,fontSize:13,color:hasV?C.t1:C.t2}}>{opt.label}</div>
          {hasV&&<div style={{...ty.meta,marginTop:1,color:C.t3,fontSize:10}}>{coins} coin{coins!==1?"s":""} placed{meta?` · ${meta.spend} · ${meta.freq}`:""}</div>}
        </div>
        {hasV?(
          <div style={{display:"flex",gap:2,alignItems:"center"}}>
            {Array.from({length:Math.min(coins,10)}).map((_,j)=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:cfg.color}}/>)}
          </div>
        ):(
          <span style={{padding:"5px 11px",borderRadius:7,background:canAdd?`${cfg.color}15`:"transparent",border:`1px solid ${canAdd?cfg.color+"30":C.line}`,color:canAdd?cfg.color:C.t3,...ty.sm,fontWeight:600,fontSize:12}}>
            + Add
          </span>
        )}
      </div>
    </div>
  );
}

function CollapsibleGroup({grp, items, allocated, cfg, selCat, coinsLeft, setSelItem, setSpend, setFreq, setDist, setAccess, setStep, coinAlloc, itemMeta, setSelAttrs, setActAudience, setActStyle, setActAccess, setSelCoins}){
  const [open, setOpen] = useState(false);
  return (
    <div style={{borderRadius:12,border:`1px solid ${allocated>0?cfg.color+"40":C.line}`,overflow:"hidden",background:C.surface}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",
          fontFamily:sans,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{flex:1}}>
          <span style={{...ty.bodyMd,fontSize:13,color:C.t1}}>{grp.label}</span>
          <span style={{...ty.meta,color:C.t3,marginLeft:8}}>{items.length} items</span>
        </div>
        {allocated>0&&(
          <span style={{...ty.meta,color:cfg.color,fontWeight:700,background:`${cfg.color}12`,padding:"2px 7px",borderRadius:5,fontSize:10}}>{allocated} selected</span>
        )}
        <ChevronDown size={13} color={C.t3} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
      </button>
      {open&&(
        <div style={{padding:"0 10px 10px",display:"flex",flexDirection:"column",gap:4,borderTop:`1px solid ${C.line}`}}>
          <div style={{height:6}}/>
          {items.map(opt=><CatalogueItem key={opt.id} opt={opt} coins={coinAlloc[opt.id]||0} meta={itemMeta[opt.id]} cfg={cfg} selCat={selCat} coinsLeft={coinsLeft} setSelItem={setSelItem} setSpend={setSpend} setFreq={setFreq} setDist={setDist} setAccess={setAccess} setStep={setStep} setSelAttrs={setSelAttrs} setActAudience={setActAudience} setActStyle={setActStyle} setActAccess={setActAccess} setSelCoins={setSelCoins}/>)}
        </div>
      )}
    </div>
  );
}

function ServiceItem({item, coins, meta, cc, totalCoinsLeft, onOpen}) {
  const hasCoins = coins > 0;
  return (
    <button onClick={function(){onOpen(item);}}
      style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",
        background:hasCoins?cc.color+"0A":C.surface,
        border:"1px solid "+(hasCoins?cc.color+"40":C.line),
        borderRadius:11,cursor:"pointer",fontFamily:sans,textAlign:"left",transition:"all .15s"}}>
      <div style={{width:36,height:36,borderRadius:10,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{item.emoji}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{...ty.sm,color:C.t1,fontWeight:hasCoins?600:400,marginBottom:hasCoins?2:0}}>{item.label}</div>
        {hasCoins&&meta&&<div style={{...ty.meta,color:C.t3,fontSize:10}}>{coins} coin{coins!==1?"s":""} · {meta.spend} · {meta.freq}</div>}
      </div>
      {hasCoins
        ? <div style={{display:"flex",gap:2,alignItems:"center",flexShrink:0}}>
            {Array.from({length:Math.min(coins,5)}).map(function(_,j){return <div key={j} style={{width:5,height:5,borderRadius:"50%",background:cc.color}}/>;}) }
            {coins>5&&<span style={{...ty.meta,color:cc.color,fontSize:9,marginLeft:2}}>+{coins-5}</span>}
            <span style={{...ty.meta,color:cc.color,fontWeight:700,marginLeft:3}}>{coins}</span>
          </div>
        : <Plus size={14} color={totalCoinsLeft>0?C.t3:C.line}/>
      }
    </button>
  );
}

function ServiceGroup({group, items, coinAlloc, itemMeta, cc, totalCoinsLeft, onOpen}) {
  const [open, setOpen] = useState(false);
  const allocated = items.reduce(function(s,i){return s+(coinAlloc[i.id]||0);},0);
  return (
    <div style={{borderRadius:12,border:"1px solid "+(allocated>0?cc.color+"40":C.line),overflow:"hidden",background:C.surface,marginBottom:6}}>
      <button onClick={function(){setOpen(function(o){return !o;});}}
        style={{width:"100%",padding:"11px 14px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{flex:1}}>
          <span style={{...ty.bodyMd,fontSize:13,color:C.t1}}>{group.label}</span>
          <span style={{...ty.meta,color:C.t3,marginLeft:8}}>{items.length}</span>
        </div>
        {allocated>0&&<span style={{...ty.meta,color:cc.color,fontWeight:700,background:cc.color+"12",padding:"2px 7px",borderRadius:5,fontSize:10}}>{allocated} coins</span>}
        <ChevronDown size={13} color={C.t3} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
      </button>
      {open&&(
        <div style={{padding:"0 10px 10px",borderTop:"1px solid "+C.line}}>
          <div style={{height:6}}/>
          {items.map(function(item){
            return <ServiceItem key={item.id} item={item} coins={coinAlloc[item.id]||0} meta={itemMeta[item.id]} cc={cc} totalCoinsLeft={totalCoinsLeft} onOpen={onOpen}/>;
          })}
        </div>
      )}
    </div>
  );
}

/* ==================================================
   VOTE FLOW — unified services, 10 coins total
================================================== */
function VoteFlow({coinAlloc,setCoinAlloc,itemMeta,setItemMeta,preItem,isSuggestMode,onClose,onGoToBrief}){
  const [step,      setStep]     = useState(preItem?"gate":"cat");
  const [selCat,    setSelCat]   = useState(preItem?preItem.cat:"food");
  const [selItem,   setSelItem]  = useState(preItem||null);
  const [selCoins,  setSelCoins] = useState(1);
  const [selTags,   setSelTags]  = useState(new Set());
  const [selWho,    setSelWho]   = useState("");
  const [selStyle,  setSelStyle] = useState("");
  const [spend,     setSpend]    = useState("");
  const [freq,      setFreq]     = useState("");
  const [dist,      setDist]     = useState("");
  const [access,    setAccess]   = useState("");
  const [search,    setSearch]   = useState("");
  const [query,     setQuery]    = useState("");
  const [similar,   setSimilar]  = useState([]);
  const [sugStep,   setSugStep]  = useState("idle");
  const [reason,    setReason]   = useState("");
  const [showSuggestFromVote, setShowSuggestFromVote] = useState(false);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [showBrandSugg, setShowBrandSugg] = useState(false);

  // Unified coin pool
  const totalUsed = Object.values(coinAlloc).reduce(function(s,v){return s+v;},0);
  const totalLeft = TOTAL_COINS - totalUsed;

  function coinsLeft() { return totalLeft; }

  function setCoin(id, n) {
    setCoinAlloc(function(prev) {
      var next = Object.assign({}, prev);
      if(n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  function openGate(item) {
    setSelItem(item);
    var existing = coinAlloc[item.id]||0;
    var existingMeta = itemMeta[item.id]||{};
    // Pre-fill coin count from existing allocation
    setSelCoins(existing || 1);
    // Pre-fill all answers from existing meta (user can change if they want)
    setSelTags(existingMeta.tags ? new Set(existingMeta.tags) : new Set());
    setSelWho(existingMeta.who||"");
    setSelStyle(existingMeta.style||"");
    setSpend(existingMeta.spend||"");
    setFreq(existingMeta.freq||"");
    setDist(existingMeta.dist||"");
    setAccess(existingMeta.access||"");
    setStep("gate");
  }

  // Search suggestions
  var searchVal = isSuggestMode ? query : search;
  var suggestions = [];
  if(searchVal.length >= 3) {
    var sq = searchVal.toLowerCase();
    suggestions = SERVICES.filter(function(i){
      return i.label.toLowerCase().includes(sq)
        || i.subcat.replace(/_/g," ").includes(sq)
        || i.cat.includes(sq);
    }).slice(0,6);
  }

  // Similar items for suggest mode
  function doSearch() {
    if(!query.trim()) return;
    var q = query.toLowerCase().trim();
    var sim = SERVICES.map(function(i){
      return Object.assign({},i,{_s:q.split(/\s+/).filter(function(w){return w.length>2&&i.label.toLowerCase().includes(w);}).length});
    }).filter(function(i){return i._s>0;}).sort(function(a,b){return b._s-a._s;}).slice(0,4);
    setSimilar(sim);
    setSugStep(sim.length?"results":"describe");
  }

  if(showSuggestFromVote) return (
    <SuggestModal defaultCat={selCat} defaultName={query}
      onSubmit={function(s){if(typeof window!=="undefined"&&window.__cravzOnSuggest)window.__cravzOnSuggest(s);}}
      onClose={function(){setShowSuggestFromVote(false);onClose();}}/>
  );

  /* ── CAT SELECTION ── */
  if(step==="cat") {
    var catGroups = SERVICE_GROUPS[selCat] || [];
    var cc = CAT_CFG[selCat] || CAT_CFG.food;
    var displayGroups = catGroups.map(function(g){
      return Object.assign({},g,{items:SERVICES.filter(function(i){return i.subcat===g.subcat;})});
    }).filter(function(g){return g.items.length>0;});

    return (
      <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",display:"flex",flexDirection:"column",fontFamily:sans,paddingBottom:80}}>
        {/* Header */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.line,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{...ty.h2,fontSize:19}}>{isSuggestMode?"Suggest or vote":"Have your say"}</div>
          <button onClick={onClose} style={{background:C.surface,border:"1px solid "+C.line,borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><X size={16}/></button>
        </div>

        {/* Coin explanation — only shown when 0 coins placed */}
        {totalUsed===0&&(
          <div style={{margin:"12px 16px 0",padding:"14px 16px",background:C.surface,border:"1px solid "+C.line,borderRadius:14}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.coral+"18",border:"1px solid "+C.coral+"30",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                  {[10,8,6].map(function(w,i){return <div key={i} style={{width:w,height:4,borderRadius:2,background:C.coral,opacity:1-i*0.25}}/>;} )}
                </div>
              </div>
              <div>
                <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:4}}>You have 10 coins to place this year</div>
                <div style={{...ty.meta,color:C.t2,lineHeight:1.6}}>Spread them across the businesses and services you want most in your area. The more coins you put on something, the stronger the signal to operators deciding where to open.</div>
              </div>
            </div>
          </div>
        )}

        {/* Coin balance */}
        <div style={{padding:"12px 18px",borderBottom:"1px solid "+C.line,background:C.surface,marginTop:totalUsed===0?8:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <span style={{...ty.meta,color:C.t3}}>Your coins</span>
            <span style={{...ty.meta,color:totalLeft>0?C.coral:C.green,fontWeight:700}}>{totalUsed} / {TOTAL_COINS} placed{totalLeft===0?" ✓":""}</span>
          </div>
          <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:(totalUsed/TOTAL_COINS*100)+"%",background:totalLeft>0?C.coral:C.green,borderRadius:2,transition:"width .3s"}}/>
          </div>
        </div>

        {/* Search bar */}
        <div style={{padding:"10px 16px",borderBottom:"1px solid "+C.line,position:"relative"}}>
          <div style={{display:"flex",gap:7}}>
            <div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:C.surface2,borderRadius:10,padding:"8px 12px"}}>
              <Search size={13} color={C.t3}/>
              <input value={isSuggestMode?query:search}
                onChange={function(e){isSuggestMode?(setQuery(e.target.value),setSugStep("idle"),setSimilar([])):setSearch(e.target.value);}}
                onKeyDown={function(e){if(e.key==="Enter"&&isSuggestMode)doSearch();}}
                placeholder={isSuggestMode?"Search or suggest something new...":"Search all services..."}
                style={{flex:1,background:"transparent",border:"none",color:C.t1,fontSize:12,fontFamily:sans,outline:"none"}}/>
              {(isSuggestMode?query:search)&&<button onClick={function(){isSuggestMode?(setQuery(""),setSugStep("idle"),setSimilar([])):setSearch("");}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",lineHeight:1}}><X size={11}/></button>}
            </div>
            {isSuggestMode&&<button onClick={doSearch} disabled={!query.trim()} style={{padding:"8px 12px",borderRadius:10,background:query.trim()?C.coral:C.surface2,color:query.trim()?"#fff":C.t3,border:"none",cursor:query.trim()?"pointer":"default",...ty.meta,fontWeight:700,transition:"all .2s"}}>Go</button>}
          </div>
          {/* Live suggestions */}
          {suggestions.length>0&&(
            <div style={{position:"absolute",top:"100%",left:16,right:16,zIndex:30,background:C.surface,border:"1px solid "+C.line,borderRadius:12,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.4)",marginTop:2}}>
              {suggestions.map(function(item,idx){
                var icc=CAT_CFG[item.cat]||CAT_CFG.food;
                return(
                  <button key={item.id} onClick={function(){openGate(item);setSearch("");setQuery("");}}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"transparent",border:"none",borderTop:idx>0?"1px solid "+C.line:"none",cursor:"pointer",fontFamily:sans,textAlign:"left"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:icc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{item.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{...ty.sm,color:C.t1}}>{item.label}</div>
                      <span style={{...ty.meta,fontSize:10,color:icc.color,background:icc.color+"15",borderRadius:4,padding:"1px 5px"}}>{CAT_CFG[item.cat]?CAT_CFG[item.cat].label:item.cat}</span>
                    </div>
                    <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
                  </button>
                );
              })}
            </div>
          )}
          {/* Suggest mode results */}
          {isSuggestMode&&sugStep==="results"&&similar.length>0&&(
            <div style={{marginTop:8}}>
              <div style={{...ty.meta,color:C.amber,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11} color={C.amber}/> Similar services already exist:</div>
              {similar.map(function(item){
                return(
                  <button key={item.id} onClick={function(){openGate(item);}}
                    style={{width:"100%",background:C.surface2,border:"1px solid "+C.line,borderRadius:9,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:9,fontFamily:sans,textAlign:"left",marginBottom:3}}>
                    <span style={{fontSize:16}}>{item.emoji}</span>
                    <span style={{...ty.sm,flex:1,color:C.t1}}>{item.label}</span>
                    <span style={{...ty.meta,color:C.green}}>Vote →</span>
                  </button>
                );
              })}
              <button onClick={function(){setSugStep("describe");}} style={{width:"100%",marginTop:4,padding:"7px",borderRadius:8,background:"transparent",border:"1px dashed "+C.line,color:C.t3,cursor:"pointer",...ty.meta,fontWeight:600}}>
                None of these — something different →
              </button>
            </div>
          )}
          {isSuggestMode&&sugStep==="describe"&&(
            <div style={{marginTop:8,background:C.surface,border:"1px solid "+C.line,borderRadius:12,padding:"12px 14px"}}>
              <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:8}}>"{query}" isn't on the list yet</div>
              <textarea value={reason} onChange={function(e){setReason(e.target.value);}} rows={2}
                placeholder="Describe it briefly — what makes it distinct?"
                style={{width:"100%",background:C.bg,border:"1px solid "+C.line,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:12,fontFamily:sans,outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box",marginBottom:8}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={function(){setShowSuggestFromVote(true);}} disabled={reason.trim().length<5}
                  style={{flex:1,padding:"8px",borderRadius:9,background:reason.trim().length>=5?C.coral:C.surface2,color:reason.trim().length>=5?"#fff":C.t3,border:"none",cursor:reason.trim().length>=5?"pointer":"default",...ty.meta,fontWeight:600,transition:"all .2s"}}>
                  Submit suggestion →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category tab bar */}
        <div style={{display:"flex",gap:0,overflowX:"auto",borderBottom:"1px solid "+C.line,background:C.bg,flexShrink:0,scrollbarWidth:"none"}}>
          {Object.entries(VOTE_CATS).map(function(entry){
            var cat=entry[0], catCc=entry[1];
            var catUsed = SERVICES.filter(function(i){return i.cat===cat;}).reduce(function(s,i){return s+(coinAlloc[i.id]||0);},0);
            var isActive = cat===selCat;
            return(
              <button key={cat} onClick={function(){setSelCat(cat);setSearch("");}}
                style={{padding:"10px 14px",background:"transparent",border:"none",
                  borderBottom:"2px solid "+(isActive?catCc.color:"transparent"),
                  cursor:"pointer",fontFamily:sans,fontSize:11,fontWeight:isActive?600:400,
                  color:isActive?catCc.color:C.t3,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <span style={{fontSize:16}}>{catCc.emoji}</span>
                <span>{catCc.label.split(" ")[0]}</span>
                {catUsed>0&&<div style={{width:5,height:5,borderRadius:"50%",background:catCc.color}}/>}
              </button>
            );
          })}
        </div>

        {/* Service groups */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <span style={{...ty.bodyMd,fontSize:14,color:cc.color}}>{cc.emoji} {cc.label}</span>
            <span style={{...ty.meta,color:totalLeft>0?C.t3:C.green,fontWeight:600}}>{totalLeft} coins left</span>
          </div>
          {displayGroups.map(function(group){
            var groupAlloc = group.items.reduce(function(s,i){return s+(coinAlloc[i.id]||0);},0);
            return(
              <ServiceGroup key={group.subcat} group={group} items={group.items}
                coinAlloc={coinAlloc} itemMeta={itemMeta} cc={cc}
                totalCoinsLeft={totalLeft} onOpen={openGate}/>
            );
          })}
          {totalLeft===0&&(
            <div style={{padding:"14px",background:C.green+"10",border:"1px solid "+C.green+"25",borderRadius:12,textAlign:"center",marginTop:8}}>
              <div style={{...ty.sm,color:C.green,fontWeight:600,marginBottom:2}}>All 10 coins placed!</div>
              <div style={{...ty.meta,color:C.t3}}>You can reassign by tapping any item</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── GATE ── */
  if(step==="gate"&&selItem) {
    var icc = CAT_CFG[selItem.cat] || CAT_CFG.food;
    var qModel = getServiceQuestions(selItem.subcat);
    var isClasses = isClassesLevel(selItem.subcat);
    var isLevelA = qModel.level==="A";
    var isLevelB = qModel.level==="B";
    var existingCoins = coinAlloc[selItem.id]||0;
    var availableCoins = totalLeft + existingCoins;
    var maxCoins = Math.min(10, availableCoins);

    var isReEdit = (coinAlloc[selItem.id]||0) > 0;
    // Re-editing: only coins required (other fields already saved)
    // New vote: require spend/freq/dist/access + tags
    var ok = isReEdit
      ? selCoins >= 0  // allow 0 to remove
      : (spend && freq && dist && access
          && (qModel.level==="C" || selTags.size>0 || selWho || isClasses&&selWho&&selStyle));

    return (
      <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",fontFamily:sans,paddingBottom:80}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",gap:10}}>
          <button onClick={function(){setStep("cat");setSelItem(null);}} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,display:"flex",alignItems:"center",gap:4}}>← Back</button>
          <button onClick={onClose} style={{marginLeft:"auto",background:C.surface,border:"1px solid "+C.line,borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><X size={15}/></button>
        </div>

        <div style={{padding:"0 16px 20px",overflowY:"auto"}}>
          {/* Item header */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"13px",background:C.surface,borderRadius:14,marginTop:14,border:"1px solid "+icc.color+"25"}}>
            <div style={{width:44,height:44,borderRadius:12,background:icc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{selItem.emoji}</div>
            <div style={{flex:1}}>
              <div style={{...ty.h3,marginBottom:2}}>{selItem.label}</div>
              <div style={{...ty.meta,color:C.t3}}>{CAT_CFG[selItem.cat]?CAT_CFG[selItem.cat].label:selItem.cat}</div>
            </div>
          </div>

          {/* Coin stepper */}
          <div style={{marginBottom:18,padding:"14px 16px",background:icc.color+"0A",border:"1px solid "+icc.color+"25",borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{...ty.bodyMd,fontSize:14,color:C.t1,marginBottom:2}}>How many coins?</div>
                <div style={{...ty.meta,color:C.t3}}>{isReEdit?"Currently "+coinAlloc[selItem.id]+" coin"+(coinAlloc[selItem.id]!==1?"s":"")+" · set to 0 to remove":availableCoins+" available · max 10 per service"}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={function(){setSelCoins(function(c){return Math.max(isReEdit?0:1,c-1);});}}
                  style={{width:32,height:32,borderRadius:9,background:C.surface2,border:"1px solid "+C.line,color:selCoins>1?C.t1:C.t3,cursor:selCoins>1?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Minus size={13}/>
                </button>
                <span style={{fontFamily:serif,fontSize:24,fontWeight:700,color:icc.color,minWidth:24,textAlign:"center"}}>{selCoins}</span>
                <button onClick={function(){setSelCoins(function(c){return Math.min(maxCoins,c+1);});}}
                  disabled={selCoins>=maxCoins}
                  style={{width:32,height:32,borderRadius:9,background:selCoins<maxCoins?icc.color+"15":C.surface2,border:"1px solid "+(selCoins<maxCoins?icc.color+"30":C.line),color:selCoins<maxCoins?icc.color:C.t3,cursor:selCoins<maxCoins?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Plus size={13}/>
                </button>
              </div>
            </div>
          </div>

          {/* Quant questions */}
          {[
            {lbl:"How much would you spend per visit?", opts:SPEND_OPTS, val:spend, set:setSpend, color:icc.color},
            {lbl:"How often would you go?",            opts:FREQ_OPTS,  val:freq,  set:setFreq,  color:icc.color},
            {lbl:"How far would you travel?",          opts:DIST_OPTS,  val:dist,  set:setDist,  color:"#E8A830"},
          ].map(function(q){return(
            <div key={q.lbl} style={{marginBottom:16}}>
              <div style={{...ty.label,marginBottom:8}}>{q.lbl}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {q.opts.map(function(o){return(
                  <button key={o} onClick={function(){q.set(o);}}
                    style={{padding:"7px 12px",borderRadius:20,border:"1px solid "+(q.val===o?q.color:C.line),
                      background:q.val===o?q.color+"15":"transparent",color:q.val===o?q.color:C.t2,
                      cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:q.val===o?600:400,transition:"all .12s"}}>
                    {o}
                  </button>
                );})}
              </div>
            </div>
          );})}

          {/* Access question */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:8}}>How do you currently get this?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {ACCESS_OPTS.map(function(o){return(
                <button key={o.v} onClick={function(){setAccess(o.v);}}
                  style={{padding:"10px 14px",borderRadius:11,border:"1px solid "+(access===o.v?icc.color:C.line),
                    background:access===o.v?icc.color+"12":"transparent",color:access===o.v?icc.color:C.t2,
                    cursor:"pointer",fontFamily:sans,fontSize:13,textAlign:"left",transition:"all .12s"}}>
                  {o.l}
                </button>
              );})}
            </div>
          </div>

          {/* Level A — rich tags */}
          {isLevelA&&(
            <div style={{marginBottom:16}}>
              <div style={{...ty.label,marginBottom:4}}>{qModel.q}</div>
              <div style={{...ty.meta,color:C.t3,marginBottom:10}}>Pick up to {qModel.max}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {qModel.opts.map(function(tag){
                  var on = selTags.has(tag);
                  var disabled = !on && selTags.size >= qModel.max;
                  return(
                    <button key={tag} disabled={disabled}
                      onClick={function(){setSelTags(function(prev){var a=Array.from(prev);var idx=a.indexOf(tag);if(idx>=0){a.splice(idx,1);}else{a.push(tag);}return new Set(a);});}}
                      style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(on?icc.color:C.line),
                        background:on?icc.color+"15":"transparent",color:on?icc.color:(disabled?C.t3:C.t2),
                        cursor:disabled?"default":"pointer",fontFamily:sans,...ty.meta,
                        fontWeight:on?700:400,opacity:disabled?0.4:1,transition:"all .12s"}}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level B — light follow-up */}
          {isLevelB&&(
            <div style={{marginBottom:16}}>
              <div style={{...ty.label,marginBottom:8}}>{qModel.q}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {qModel.opts.map(function(opt){
                  var on = selTags.has(opt);
                  var disabled = !on && selTags.size >= (qModel.max||1);
                  return(
                    <button key={opt} disabled={disabled}
                      onClick={function(){setSelTags(function(prev){var a=Array.from(prev);var idx=a.indexOf(opt);if(idx>=0){a.splice(idx,1);}else{a.push(opt);}return new Set(a);});}}
                      style={{padding:"7px 14px",borderRadius:20,border:"1px solid "+(on?icc.color:C.line),
                        background:on?icc.color+"15":"transparent",color:on?icc.color:C.t2,
                        cursor:disabled?"default":"pointer",fontFamily:sans,fontSize:12,fontWeight:on?600:400,
                        opacity:disabled?0.4:1,transition:"all .12s"}}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classes flow — 3 questions */}
          {isClasses&&(
            <div>
              <div style={{marginBottom:14}}>
                <div style={{...ty.label,marginBottom:8}}>Who is this for?</div>
                <div style={{display:"flex",gap:8}}>
                  {["Kids","Adults","Everyone"].map(function(opt){
                    var on=selWho===opt;
                    return(
                      <button key={opt} onClick={function(){setSelWho(opt);}}
                        style={{flex:1,padding:"9px",borderRadius:10,border:"1px solid "+(on?icc.color:C.line),
                          background:on?icc.color+"15":"transparent",color:on?icc.color:C.t2,
                          cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:on?600:400,transition:"all .12s"}}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{...ty.label,marginBottom:8}}>What matters most?</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["Casual","Structured classes","Small group","Drop-in","Membership"]
                    .concat(showCompetitiveOption(selItem.subcat)?["Advanced / competitive"]:[])
                    .map(function(opt){
                      var on=selStyle===opt;
                      return(
                        <button key={opt} onClick={function(){setSelStyle(opt);}}
                          style={{padding:"7px 13px",borderRadius:20,border:"1px solid "+(on?icc.color:C.line),
                            background:on?icc.color+"15":"transparent",color:on?icc.color:C.t2,
                            cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:on?600:400,transition:"all .12s"}}>
                          {opt}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Privacy note */}
          <div style={{...ty.meta,color:C.t3,lineHeight:1.65,padding:"9px 12px",background:C.surface2,borderRadius:9,marginBottom:16}}>
            🔒 Fully anonymised. Operators only see aggregated signals — never your identity.
          </div>

          {/* Confirm / Remove */}
          {isReEdit&&selCoins===0 ? (
            <button onClick={function(){
              // Remove vote entirely — Firebase: delete votes/{uid}_{item.id}
              setCoin(selItem.id, 0);
              setItemMeta(function(m){
                var n = Object.assign({},m);
                delete n[selItem.id];
                return n;
              });
              setStep("done");
            }}
              style={{width:"100%",padding:"15px",borderRadius:14,background:C.coral,
                color:"#fff",border:"none",cursor:"pointer",...ty.btn,fontSize:15}}>
              Remove vote
            </button>
          ) : (
            <button disabled={!ok} onClick={function(){
              // Merge: keep existing meta, only overwrite fields that were changed
              var existingMeta = itemMeta[selItem.id]||{};
              var meta = {
                spend:  spend  || existingMeta.spend  || "",
                freq:   freq   || existingMeta.freq   || "",
                dist:   dist   || existingMeta.dist   || "",
                access: access || existingMeta.access || "",
                tags:   selTags.size>0 ? Array.from(selTags) : (existingMeta.tags||[]),
              };
              if(isClasses) {
                meta.who   = selWho   || existingMeta.who   || "";
                meta.style = selStyle || existingMeta.style || "";
              }
              // Firebase: upsert votes/{uid}_{item.id}
              setItemMeta(function(m){return Object.assign({},m,{[selItem.id]:meta});});
              setCoin(selItem.id, selCoins);
              setStep("done");
            }}
              style={{width:"100%",padding:"15px",borderRadius:14,
                background:ok?icc.color:C.surface2,
                color:ok?"#fff":C.t3,border:"none",
                cursor:ok?"pointer":"default",...ty.btn,fontSize:15,transition:"all .2s"}}>
              {isReEdit ? "Update vote" : "Confirm & place "+selCoins+" coin"+(selCoins!==1?"s":"")+" →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ── DONE ── */
  if(step==="done") return (
    <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:sans,textAlign:"center",paddingBottom:100}}>
      <div style={{width:64,height:64,borderRadius:20,background:C.green+"15",border:"1px solid "+C.green+"25",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><Check size={30} color={C.green}/></div>
      <div style={{...ty.h2,marginBottom:6}}>Coins placed!</div>
      {/* Item confirmed */}
      {selItem&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"12px 16px",background:C.surface,border:"1px solid "+C.line,borderRadius:14}}>
        <div style={{width:38,height:38,borderRadius:10,background:(CAT_CFG[selItem.cat]||CAT_CFG.food).bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{selItem.emoji}</div>
        <div style={{flex:1,textAlign:"left"}}>
          <div style={{...ty.bodyMd,fontSize:14}}>{selItem.label}</div>
          <div style={{...ty.meta,color:C.t3}}>{totalUsed} / {TOTAL_COINS} coins placed</div>
        </div>
        <div style={{...ty.meta,color:C.green,fontWeight:700}}>✓</div>
      </div>}

      {/* Brief CTA — prominent */}
      <div style={{width:"100%",maxWidth:320,marginBottom:24,background:"linear-gradient(135deg,"+C.purple+"20,"+C.purple+"08)",border:"1px solid "+C.purple+"40",borderRadius:18,padding:"20px 20px 16px",textAlign:"left"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:38,height:38,borderRadius:11,background:C.purple+"25",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>✍️</div>
          <div>
            <div style={{...ty.bodyMd,fontSize:14,color:C.t1}}>Shape what it looks like</div>
            <div style={{...ty.meta,color:C.t3}}>The Brief is open</div>
          </div>
        </div>
        <div style={{...ty.sm,color:C.t2,lineHeight:1.65,marginBottom:14}}>
          Add your ideas — preferred brands, location, what matters most. {selItem&&<span style={{color:C.t1,fontWeight:500}}>{selItem.voters||""} residents</span>} are already shaping this concept.
        </div>
        <button onClick={function(){if(onGoToBrief){onGoToBrief();}else{onClose();}}} style={{width:"100%",padding:"12px",borderRadius:12,background:C.purple,color:"#fff",border:"none",cursor:"pointer",...ty.btn,fontSize:14,fontWeight:700}}>
          Go to The Brief →
        </button>
      </div>

      <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
        <button onClick={function(){setStep("cat");setSelItem(null);setSpend("");setFreq("");setDist("");setAccess("");setSelTags(new Set());setSelWho("");setSelStyle("");setSelCoins(1);}} style={{padding:"11px 18px",background:C.surface,border:"1px solid "+C.line,borderRadius:12,color:C.t2,cursor:"pointer",...ty.btn,fontSize:13}}>Vote on more</button>
        <button onClick={onClose} style={{padding:"11px 18px",background:"transparent",color:C.t3,border:"1px solid "+C.line,borderRadius:12,cursor:"pointer",...ty.btn,fontSize:13}}>Skip for now</button>
      </div>
    </div>
  );

  return null;
}



/* ==================================================
   RESIDENT FEED
================================================== */


/* ==================================================
   RESIDENT FEED  -- fix #1 (remove "Vote" button duplicate),
                    fix #3 (confidence education card),
                    fix #4 (annual reset explanation)
================================================== */
function PrelaunchModal({page, onClose, onSubmit}){
  const [step,    setStep]   = useState(0);
  const [answers, setAnswers]= useState({});
  const qs = (page.questions||[]).slice(0,3);
  const allAnswered = qs.length>0 && qs.every(q=>answers[q.id]);
  return (
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.surface,borderRadius:"22px 22px 0 0",padding:"8px 20px 48px",width:"100%",maxWidth:480,boxShadow:"0 -24px 64px #00000090",overflowY:"auto",maxHeight:"90vh"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.line,margin:"12px auto 20px"}}/>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{fontSize:22}}>{page.emoji}</span>
          <h2 style={{...ty.h2,fontSize:18,marginBottom:0}}>{page.title}</h2>
        </div>
        <div style={{...ty.meta,color:C.t3,marginBottom:6}}>{page.area} · {page.status==="opening_soon"?"Opening soon":"Coming "+page.opening}</div>
        <div style={{...ty.sm,color:C.t2,lineHeight:1.65,marginBottom:20,fontStyle:"italic"}}>"{page.blurb}"</div>
        <div style={{display:"flex",gap:4,marginBottom:20}}>
          {qs.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.purple:C.line,transition:"background .3s"}}/>)}
        </div>
        {!allAnswered?(
          <div>
            <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:14}}>{step+1} of {qs.length} · {(qs[step]&&qs[step].q)}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {((qs[step]&&qs[step].opts)||[]).map(o=>(
                <button key={o} onClick={()=>{setAnswers(a=>({...a,[qs[step].id]:o}));if(step<qs.length-1)setStep(s=>s+1);}}
                  style={{padding:"13px 16px",borderRadius:12,border:`1px solid ${answers[(qs[step]&&qs[step].id)]===o?C.purple:C.line}`,background:answers[(qs[step]&&qs[step].id)]===o?`${C.purple}15`:C.surface2,color:answers[(qs[step]&&qs[step].id)]===o?C.purple:C.t1,cursor:"pointer",fontFamily:sans,fontSize:14,textAlign:"left",fontWeight:answers[(qs[step]&&qs[step].id)]===o?600:400,transition:"all .14s"}}>
                  {o}
                </button>
              ))}
            </div>
            {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13}}>← Back</button>}
          </div>
        ):(
          <div>
            <div style={{padding:"16px",background:`${C.green}10`,border:`1px solid ${C.green}20`,borderRadius:14,marginBottom:20}}>
              <div style={{...ty.sm,color:C.green,fontWeight:600,marginBottom:4}}>All done ✓</div>
              <div style={{...ty.meta,color:C.t2,lineHeight:1.65}}>Your input has been received. We'll let you know the moment {page.title} opens in {page.area} — and how your answers shaped it.</div>
            </div>
            <button onClick={()=>onSubmit(page.id)} style={{width:"100%",padding:"14px",borderRadius:14,background:C.purple,color:"#fff",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:600,fontSize:15,marginBottom:10}}>Submit my answers →</button>
            <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:14,background:"transparent",border:`1px solid ${C.line}`,color:C.t2,cursor:"pointer",fontFamily:sans,fontWeight:600,fontSize:14}}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ==================================================
   SUGGEST MODAL -- full suggest flow with moderation
================================================== */
function SuggestModal({defaultCat, defaultName, onSubmit, onClose}){
  const [name,    setName]    = useState(defaultName||"");
  const [cat,     setCat]     = useState(defaultCat||"business");
  const [reason,  setReason]  = useState("");
  const [done,    setDone]    = useState(false);
  const catOpts = [{id:"business",l:"Business"},{id:"activity",l:"Activity"}];
  const canSubmit = name.trim().length>=2 && reason.trim().length>=15;

  if(done) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{width:"100%",background:"#1A1916",borderRadius:"20px 20px 0 0",padding:"28px 20px 40px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>🌱</div>
        <div style={{fontSize:17,fontWeight:700,color:"#F7F4F0",marginBottom:8}}>Suggestion submitted</div>
        <div style={{fontSize:13,color:"#8C8680",lineHeight:1.6,marginBottom:24}}><strong style={{color:"#F7F4F0"}}>{name}</strong> is now in the moderation queue.<br/>You'll get a notification when it's approved — then you can vote on it.</div>
        <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,background:"#E8513A",border:"none",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"Arial, sans-serif"}}>Done</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{width:"100%",background:"#1A1916",borderRadius:"20px 20px 0 0",padding:"20px 20px 36px",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:700,color:"#F7F4F0"}}>Suggest something new</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6A6460",cursor:"pointer",padding:4}}><X size={16}/></button>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#8C8680",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>What is it?</div>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Ethiopian coffee shop, Brazilian jiu-jitsu, Scotch egg"
            style={{width:"100%",background:"#111110",border:`1px solid ${name.length>1?"#E8513A":"#333330"}`,borderRadius:10,padding:"11px 13px",color:"#F7F4F0",fontSize:14,fontFamily:"Arial, sans-serif",outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#8C8680",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Category</div>
          <div style={{display:"flex",gap:7}}>
            {catOpts.map(o=>(
              <button key={o.id} onClick={()=>setCat(o.id)}
                style={{flex:1,padding:"9px 6px",borderRadius:10,border:`1px solid ${cat===o.id?"#E8513A":"#333330"}`,background:cat===o.id?"#E8513A18":"transparent",color:cat===o.id?"#E8513A":"#8C8680",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Arial, sans-serif"}}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:"#8C8680",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Why does your area need this?</div>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={4}
            placeholder="Tell us what it is, why it's missing here, and what you'd use it for. The more specific the better — this helps the moderator make a decision."
            style={{width:"100%",background:"#111110",border:`1px solid ${reason.length>14?"#E8513A":"#333330"}`,borderRadius:10,padding:"11px 13px",color:"#F7F4F0",fontSize:13,fontFamily:"Arial, sans-serif",outline:"none",resize:"none",lineHeight:1.6,boxSizing:"border-box"}}/>
          <div style={{fontSize:11,color:reason.length>14?"#2ECC8A":"#6A6460",marginTop:4,textAlign:"right"}}>{reason.length} chars {reason.length<15?"(min 15)":""}</div>
        </div>

        {/* Submit */}
        <button disabled={!canSubmit} onClick={()=>{onSubmit({name:name.trim(),cat,reason:reason.trim()});setDone(true);}}
          style={{width:"100%",padding:"14px",borderRadius:12,background:canSubmit?"#E8513A":"#1A1916",border:`1px solid ${canSubmit?"#E8513A":"#333330"}`,color:canSubmit?"#fff":"#6A6460",fontWeight:700,fontSize:15,cursor:canSubmit?"pointer":"default",fontFamily:"Arial, sans-serif",transition:"all .2s"}}>
          Submit for moderation →
        </button>
        <div style={{fontSize:11,color:"#6A6460",textAlign:"center",marginTop:10,lineHeight:1.5}}>Reviewed by a Cravz moderator or community hero.<br/>You'll be notified when approved.</div>
      </div>
    </div>
  );
}


// -- NEIGHBOURHOOD PULSE DATA
// Simulated weekly voice changes per area -- in production derived from TREND_DATA deltas
const PULSE_DATA = {
  "SW4": [
    {id:"b75", emoji:"🧸", label:"Soft play café",           delta:+22, dir:"up"},
    {id:"a13", emoji:"💃", label:"Dance classes",            delta:+18, dir:"up"},
    {id:"b29", emoji:"🍷", label:"Wine bar",                 delta:+11, dir:"up"},
  ],
  "SW9": [
    {id:"a13", emoji:"💃", label:"Dance classes",            delta:+19, dir:"up"},
    {id:"b75", emoji:"🧸", label:"Soft play café",           delta:+14, dir:"up"},
    {id:"b66", emoji:"🧗", label:"Climbing gym",             delta:+8,  dir:"up"},
  ],
  "SW11": [
    {id:"b75", emoji:"🧸", label:"Soft play café",           delta:+31, dir:"up"},
    {id:"b81", emoji:"🎵", label:"Concert hall / live music",delta:+9,  dir:"up"},
    {id:"a8",  emoji:"🧘", label:"Yoga classes",             delta:+6,  dir:"up"},
  ],
  "SW2": [
    {id:"b29", emoji:"🍷", label:"Wine bar",                 delta:+14, dir:"up"},
    {id:"a15", emoji:"🏺", label:"Pottery classes",          delta:+10, dir:"up"},
  ],
  "SW12": [
    {id:"b75", emoji:"🧸", label:"Soft play café",           delta:+20, dir:"up"},
    {id:"a8",  emoji:"🧘", label:"Yoga classes",             delta:+12, dir:"up"},
  ],
  "SE5": [
    {id:"b13", emoji:"🍜", label:"Korean restaurant",        delta:+16, dir:"up"},
    {id:"a13", emoji:"💃", label:"Dance classes",            delta:+11, dir:"up"},
  ],
};

// Identity card -- top demand per category per area
const IDENTITY_DATA = {
  "SW4":  {business:"Wine bar 🍷",      activity:"Dance classes 💃", family:"Soft play café 🧸"},
  "SW9":  {business:"Climbing gym 🧗",  activity:"Dance classes 💃", family:"Soft play café 🧸"},
  "SW11": {business:"Soft play café 🧸",activity:"Yoga classes 🧘",  family:"Soft play café 🧸"},
  "SW2":  {business:"Wine bar 🍷",      activity:"Pottery classes 🏺",family:"Soft play café 🧸"},
  "SW12": {business:"Soft play café 🧸",activity:"Yoga classes 🧘",  family:"Soft play café 🧸"},
  "SE5":  {business:"Korean restaurant 🍜",activity:"Dance classes 💃",family:"Soft play café 🧸"},
};


function NeighbourhoodPulseBanner({postcode}){
  const [open, setOpen] = useState(false);
  const area = postcode || "SW4";
  const pulse = PULSE_DATA[area] || PULSE_DATA["SW4"];
  const identity = IDENTITY_DATA[area] || IDENTITY_DATA["SW4"];
  const upCount = pulse.filter(p=>p.dir==="up").length;

  return (
    <div style={{margin:"0 0 12px",borderRadius:14,border:`1px solid ${C.line}`,overflow:"hidden",background:C.surface}}>
      {/* Collapsed header — always visible */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",padding:"11px 16px",background:"transparent",border:"none",cursor:"pointer",
          fontFamily:sans,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <span style={{fontSize:16}}>📡</span>
        <div style={{flex:1}}>
          <span style={{...ty.bodyMd,fontSize:13,color:C.t1}}>{area} this week</span>
          <span style={{...ty.meta,color:C.t3,marginLeft:8}}>
            {upCount} signal{upCount!==1?"s":""} rising ↑
          </span>
        </div>
        <ChevronDown size={14} color={C.t3}
          style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
      </button>

      {open&&(
        <div style={{borderTop:`1px solid ${C.line}`,padding:"14px 16px"}}>

          {/* Section 1 — Pulse */}
          <div style={{...ty.label,color:C.t3,marginBottom:8}}>What moved this week</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
            {pulse.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                borderRadius:9,background:p.dir==="up"?`${C.green}08`:`${C.coral}08`,
                border:`1px solid ${p.dir==="up"?C.green:C.coral}18`}}>
                <span style={{fontSize:16,flexShrink:0}}>{p.emoji}</span>
                <span style={{...ty.sm,color:C.t1,flex:1}}>{p.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                  <span style={{fontSize:12}}>{p.dir==="up"?"↑":"↓"}</span>
                  <span style={{...ty.meta,color:p.dir==="up"?C.green:C.coral,fontWeight:700}}>
                    {p.dir==="up"?"+":""}{p.delta} voices
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Section 2 — Identity Card */}
          <div style={{...ty.label,color:C.t3,marginBottom:8}}>{area} personality</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
            {[
              {cat:"Food & Drink", val:identity.business, color:C.coral},
              {cat:"Activity",     val:identity.activity, color:C.purple},
              
              {cat:"Family",       val:identity.family,   color:C.green},
            ].map(item=>(
              <div key={item.cat} style={{padding:"9px 10px",borderRadius:9,background:C.surface2,
                border:`1px solid ${C.line}`}}>
                <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:3}}>{item.cat.toUpperCase()}</div>
                <div style={{...ty.sm,color:C.t1,fontWeight:600,lineHeight:1.3}}>{item.val}</div>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

function ResFeed({user,coinAlloc,itemMeta,onAllocate,onShowNotifs,onGoInsights,modQueue,onSuggest}){
  const [filter,         setFilter]         = useState("all");
  const [expanded,       setExpanded]       = useState(null);
  const [showEdu,        setShowEdu]        = useState(false);
  const [showSuggest,    setShowSuggest]    = useState(false);
  const [suggestCat,     setSuggestCat]     = useState("business");
  const [showPrelaunch,  setShowPrelaunch]  = useState(null);
  const [resAnsweredPages, setResAnsweredPages] = useState([]);
  const totalSpent = Object.values(coinAlloc).reduce((s,v)=>s+v,0);
  const remaining  = 10 - totalSpent;
  const rows = (filter==="all" ? FEED_WITH_METRICS : FEED_WITH_METRICS.filter(r=>r.cat===filter))
    .slice().sort((a,b)=>b.voters-a.voters).slice(0,20);

  function handlePrelaunchSubmit(pageId){
    setResAnsweredPages(p=>[...p,pageId]);
    setShowPrelaunch(null);
  }

  return (
    <div style={{paddingBottom:100}}>
      {showPrelaunch&&<PrelaunchModal page={showPrelaunch} onClose={()=>setShowPrelaunch(null)} onSubmit={handlePrelaunchSubmit}/>}
      {showSuggest&&<SuggestModal defaultCat={suggestCat} onSubmit={s=>onSuggest&&onSuggest(s)} onClose={()=>setShowSuggest(false)}/>}

      {/* == HOME HEADER */}
      <div style={{padding:"22px 18px 20px",borderBottom:`1px solid ${C.line}`}}>
        {/* Tagline */}
        <div style={{marginBottom:16}}>
          <div style={{fontFamily:serif,fontSize:28,fontWeight:700,color:C.t1,lineHeight:1.2,marginBottom:8}}>
            Shape your<br/>neighbourhood.
          </div>
          <div style={{...ty.body,color:C.t3,lineHeight:1.55,fontSize:13}}>
            Local demand, backed by locals. Your voice helps the right businesses find their home here.
          </div>
        </div>

        {/* Coin progress */}
        <div style={{margin:"14px 0 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
            <span style={{...ty.meta,color:C.t3}}>Your coins this year</span>
            <span style={{...ty.meta,color:remaining>0?C.coral:C.green,fontWeight:700}}>
              {remaining>0?`${10-remaining} / 10 placed`:"All 10 placed ✓"}
            </span>
          </div>
          <div style={{height:5,background:C.line,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.round((totalSpent/10)*100)}%`,background:remaining>0?C.coral:C.green,borderRadius:3}}/>
          </div>
        </div>

        {/* Social proof — plain text under subtitle, only if >100 total voters */}
        {FEED_WITH_METRICS.reduce(function(s,i){return s+i.voters;},0)>100&&(
          <div style={{...ty.meta,color:C.t3,marginTop:8,marginBottom:6,lineHeight:1.5}}>
            Joining <span style={{color:C.t2,fontWeight:500}}>{FEED_WITH_METRICS.reduce(function(s,i){return s+i.voters;},0).toLocaleString()} residents</span> already shaping their area
          </div>
        )}

        {/* Two main actions */}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <button onClick={()=>onAllocate(false)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",
              background:`${C.coral}14`,border:`1px solid ${C.coral}35`,borderRadius:16,
              cursor:"pointer",textAlign:"left",width:"100%",fontFamily:sans}}>
            <div style={{width:44,height:44,borderRadius:12,background:"#2A1A0E",border:"1px solid "+C.coral+"40",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🪙</div>
            <div style={{flex:1}}>
              <div style={{...ty.bodyMd,fontSize:14,color:C.t1,marginBottom:3,fontWeight:600}}>Have your say</div>
              <div style={{...ty.meta,color:C.t3,lineHeight:1.45}}>
                {remaining>0
                  ? "Back the places you want to see open near you"
                  : "All coins placed — see your impact in Insights →"}
              </div>
            </div>
            <ChevronDown size={15} color={C.coral} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
          </button>
          <button onClick={()=>onGoInsights&&onGoInsights()}
            style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",
              background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,
              cursor:"pointer",textAlign:"left",width:"100%",fontFamily:sans}}>
            <div style={{width:44,height:44,borderRadius:12,background:`${C.purple}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>📍</div>
            <div style={{flex:1}}>
              <div style={{...ty.bodyMd,fontSize:14,color:C.t1,marginBottom:3,fontWeight:600}}>What {user.postcode} is demanding</div>
              <div style={{...ty.meta,color:C.t3,lineHeight:1.45}}>See what your neighbours are backing</div>
            </div>
            <ChevronDown size={15} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
          </button>
        </div>


      </div>

      {/* Live signal strip */}
      <div style={{padding:"18px 0 4px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:"0 18px",marginBottom:10}}>
          <span style={{...ty.label,color:C.t3}}>Rising in {user.postcode}</span>
          <span style={{...ty.meta,color:C.t3}}>this month</span>
        </div>
        <div style={{display:"flex",gap:10,overflowX:"auto",padding:"0 18px 12px",scrollbarWidth:"none"}}>
          {FEED_WITH_METRICS.slice().sort(function(a,b){return b.momentum-a.momentum;}).slice(0,6).map(function(item){
            const cc=CAT_CFG[item.cat];
            return(
              <button key={item.id} onClick={function(){onAllocate(false);}}
                style={{flexShrink:0,width:130,background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:"12px 12px 10px",cursor:"pointer",textAlign:"left",fontFamily:sans}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{width:36,height:36,borderRadius:10,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{item.emoji}</div>
                  <div style={{display:"flex",alignItems:"center",gap:2,background:`${C.green}15`,borderRadius:6,padding:"2px 6px"}}>
                    <TrendingUp size={9} color={C.green}/>
                    <span style={{...ty.meta,color:C.green,fontWeight:700,fontSize:10}}>+{item.momentum}%</span>
                  </div>
                </div>
                <div style={{...ty.sm,color:C.t1,fontWeight:600,lineHeight:1.3,marginBottom:3,fontSize:12}}>{item.label}</div>
                <div style={{...ty.meta,color:C.t3,fontSize:10}}>{item.voters} voices</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   RESIDENT INSIGHTS
================================================== */
function ResInsights({user,coinAlloc,itemMeta,onAllocate}){
  const [filter,setFilter] = useState("all");
  const totalSpent=Object.values(coinAlloc).reduce((s,v)=>s+v,0);
  const myVotes=FEED_WITH_METRICS.filter(i=>(coinAlloc[i.id]||0)>0).sort((a,b)=>(coinAlloc[b.id]||0)-(coinAlloc[a.id]||0));
  const allVotedCount=Object.keys(coinAlloc).filter(k=>coinAlloc[k]>0).length;
  const baseItems = FEED_WITH_METRICS;
  const rows = (filter==="all" ? baseItems : baseItems.filter(r=>r.cat===filter))
    .slice().sort((a,b)=>b.voters-a.voters);

  return (
    <div style={{padding:"20px 16px 100px"}}>

      {/* == YOUR IMPACT first */}
      <h2 style={{...ty.h2,marginBottom:4}}>Your impact</h2>
      <div style={{...ty.body,marginBottom:20}}>How your coins are shaping {user.postcode}</div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        {[{l:"Coins placed",v:totalSpent,unit:"/10",c:C.coral},{l:"Items supported",v:allVotedCount,c:C.t1}].map(s=>(
          <Card key={s.l} style={{textAlign:"center",padding:"20px 14px"}}><div style={{fontFamily:serif,fontSize:32,fontWeight:700,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}<span style={{fontSize:13,color:C.t3}}>{s.unit}</span></div><div style={{...ty.meta}}>{s.l}</div></Card>
        ))}
      </div>

      {/* Trending header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <SLabel noMargin>Trending in {user.postcode}</SLabel>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[{id:"all",l:"All"},{id:"food",l:"Food"},{id:"fitness",l:"Fitness"},{id:"kids",l:"Kids"},{id:"health",l:"Health"},{id:"retail",l:"Retail"},{id:"entertain",l:"Entertain"},{id:"services",l:"Services"}].map(function(f){return <Chip key={f.id} label={f.l} active={filter===f.id} onClick={function(){setFilter(f.id);}} sm/>;})}
        </div>
      </div>



      {/* Ranking with my coins shown inline */}
      <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
        {rows.map((item,i)=>{
          const mine=coinAlloc[item.id]||0;
          const up=item.momentum>=0;
          const cc=CAT_CFG[item.cat];
          return (
            <div key={item.id}>{i>0&&<HR/>}
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px"}}>
                <span style={{...ty.meta,width:14,textAlign:"center",color:i<3?C.amber:C.t3,fontWeight:700}}>{i+1}</span>
                <div style={{width:36,height:36,borderRadius:10,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...ty.bodyMd,fontSize:13,marginBottom:3}}>{item.label}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <ConfBar voters={item.voters}/>
                    {/* #2: show my coins next to item */}
                    {mine>0&&(
                      <div style={{display:"flex",alignItems:"center",gap:3,background:`${cc.color}15`,borderRadius:5,padding:"1px 6px"}}>
                        {Array.from({length:Math.min(mine,5)}).map((_,j)=><div key={j} style={{width:4,height:4,borderRadius:"50%",background:cc.color}}/>)}
                        {mine>5&&<span style={{...ty.meta,color:cc.color,fontSize:9}}>+{mine-5}</span>}
                        <span style={{...ty.meta,color:cc.color,fontWeight:700,marginLeft:2}}>{mine}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.t1}}>{item.voters}</div>
                  <div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                    {up?<TrendingUp size={9} color={C.green}/>:<TrendingDown size={9} color={C.coral}/>}
                    <span style={{...ty.meta,color:up?C.green:C.coral}}>{up?"+":""}{item.momentum}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* My votes detail */}
      {myVotes.length>0&&(
        <>
          <SLabel>Your allocations</SLabel>
          <Card style={{padding:0,overflow:"hidden"}}>
            {myVotes.map((item,i)=>{const mine=coinAlloc[item.id]||0,meta=itemMeta[item.id],cc=CAT_CFG[item.cat];return(
              <div key={item.id}>{i>0&&<HR/>}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"13px 18px"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
              <span style={{...ty.bodyMd,fontSize:13}}>{item.label}</span>
              {item.seasonal&&<span title="Seasonal item" style={{fontSize:11,lineHeight:1,opacity:0.85}}>🌿</span>}
            </div>
                    {meta&&<div style={{...ty.meta,color:C.t3}}>{meta.spend} · {meta.freq} · {meta.dist}</div>}
                  </div>
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    {Array.from({length:mine}).map((_,j)=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:cc.color}}/>)}
                    <span style={{...ty.meta,color:cc.color,fontWeight:700,marginLeft:4}}>{mine}</span>
                  </div>
                </div>
              </div>
            );})}
          </Card>
        </>
      )}
    </div>
  );
}

/* ==================================================
   RESIDENT PROFILE -- fix #5: editable, no "never asked again"
================================================== */
function ResProfile({user,setUser,onLogout}){
  const [legalDoc, setLegalDoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingPostcode, setEditingPostcode] = useState(false);
  const [age,  setAge]  = useState(user.age||"");
  const [gndr, setGndr] = useState(user.gender||"");
  const [hh,   setHH]   = useState(user.household||"");
  const [kids, setKids] = useState(user.kids!=null?user.kids:null);
  const [newPc, setNewPc] = useState(user.fullPostcode||user.postcode||"");

  // 90-day postcode lock
  // Firebase: users/{uid}.area_changed_at timestamp
  var areaChangedAt = user.area_changed_at ? new Date(user.area_changed_at) : null;
  var daysSinceChange = areaChangedAt ? Math.floor((Date.now()-areaChangedAt.getTime())/(1000*60*60*24)) : 999;
  var postcodeLockedDays = 90;
  var canChangePostcode = daysSinceChange >= postcodeLockedDays;
  var daysUntilUnlock = canChangePostcode ? 0 : postcodeLockedDays - daysSinceChange;

  var pcValid = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/.test(newPc.trim().toUpperCase());
  var displayPostcode = user.fullPostcode || user.postcode || "—";

  function saveProfile(){
    setUser(function(u){return Object.assign({},u,{age:age,gender:gndr,household:hh,kids:kids});});
    setEditing(false);
  }

  function savePostcode(){
    if(!pcValid || !canChangePostcode) return;
    var full = newPc.trim().toUpperCase();
    var parts = full.split(" ");
    var district = parts[0];
    var sector = parts.length>1 ? parts[0]+" "+parts[1][0] : district;
    setUser(function(u){return Object.assign({},u,{
      postcode: district,
      sector: sector,
      fullPostcode: full,
      area_changed_at: new Date().toISOString(),
    });});
    setEditingPostcode(false);
  }

  return (
    <div style={{padding:"26px 16px 100px"}}>
      <h2 style={{...ty.h2,marginBottom:4}}>Profile</h2>
      <div style={{...ty.body,marginBottom:20}}>Your details are anonymous — businesses only see aggregated signals.</div>

      {/* ── POSTCODE SECTION ── */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <SLabel noMargin>Your postcode</SLabel>
          {!editingPostcode&&(
            canChangePostcode
              ? <button onClick={function(){setNewPc(displayPostcode);setEditingPostcode(true);}}
                  style={{background:"none",border:"1px solid "+C.line,borderRadius:8,padding:"4px 10px",cursor:"pointer",color:C.t2,...ty.meta,fontWeight:600}}>
                  Edit
                </button>
              : <span style={{...ty.meta,color:C.t3,fontSize:11}}>Locked · {daysUntilUnlock}d left</span>
          )}
        </div>

        {!editingPostcode ? (
          <Card style={{padding:"14px 18px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontFamily:serif,fontSize:20,fontWeight:700,color:C.t1,letterSpacing:2}}>{displayPostcode}</div>
                <div style={{...ty.meta,color:C.t3,marginTop:3}}>District: {user.postcode||"—"} · Sector: {user.sector||"—"}</div>
              </div>
              <MapPin size={18} color={C.coral}/>
            </div>
            {!canChangePostcode&&(
              <div style={{...ty.meta,color:C.t3,fontSize:11,marginTop:10,lineHeight:1.5}}>
                Postcode can be changed once every 90 days to keep demand signals trustworthy. Unlocks in {daysUntilUnlock} day{daysUntilUnlock!==1?"s":""}.
              </div>
            )}
          </Card>
        ) : (
          <Card style={{padding:"16px 18px"}}>
            <div style={{...ty.meta,color:C.t3,marginBottom:10,lineHeight:1.5}}>
              Changing postcode updates your demand area. This can only be done once every 90 days.
            </div>
            <input
              value={newPc}
              onChange={function(e){setNewPc(e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g,""));}}
              placeholder="e.g. SW4 9BZ"
              maxLength={8}
              style={{width:"100%",background:C.surface2,border:"1px solid "+(pcValid?C.green:C.line),borderRadius:10,padding:"12px 14px",color:C.t1,fontSize:18,fontFamily:serif,outline:"none",textAlign:"center",letterSpacing:3,marginBottom:10,boxSizing:"border-box"}}
            />
            {pcValid&&<div style={{...ty.meta,color:C.green,textAlign:"center",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Check size={11} color={C.green}/> Valid UK postcode</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setEditingPostcode(false);setNewPc(displayPostcode);}}
                style={{flex:1,padding:"11px",borderRadius:10,background:"transparent",border:"1px solid "+C.line,color:C.t2,cursor:"pointer",fontFamily:sans,fontSize:13}}>
                Cancel
              </button>
              <button onClick={savePostcode} disabled={!pcValid}
                style={{flex:2,padding:"11px",borderRadius:10,background:pcValid?C.coral:C.surface2,color:pcValid?"#fff":C.t3,border:"none",cursor:pcValid?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:13}}>
                Save postcode
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* ── PERSONAL DETAILS ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <SLabel noMargin>Your details</SLabel>
        <button onClick={function(){setEditing(function(e){return !e;});}}
          style={{background:"none",border:"1px solid "+(editing?C.coral:C.line),borderRadius:8,padding:"4px 10px",cursor:"pointer",color:editing?C.coral:C.t2,...ty.meta,fontWeight:600}}>
          {editing?"Cancel":"Edit"}
        </button>
      </div>

      {!editing?(
        <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
          {[
            {l:"Age range",         v:user.age||"—"},
            {l:"Gender",            v:user.gender||"—"},
            {l:"Household",         v:user.household||"—"},
            {l:"Children under 12", v:user.kids!=null?(user.kids?"Yes":"No"):"—"},
          ].map(function(row,i){return(
            <div key={row.l}>{i>0&&<HR/>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px"}}>
                <span style={{...ty.sm,color:C.t2}}>{row.l}</span>
                <span style={{...ty.bodyMd,fontSize:13}}>{row.v}</span>
              </div>
            </div>
          );})}
        </Card>
      ):(
        <Card style={{marginBottom:20}}>
          {[
            {l:"Age bracket",opts:AGES,v:age,s:setAge},
            {l:"Gender",opts:GNDR,v:gndr,s:setGndr},
            {l:"Household",opts:HHLD,v:hh,s:setHH},
          ].map(function(f){return(
            <div key={f.l} style={{marginBottom:16}}>
              <SLabel>{f.l}</SLabel>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {f.opts.map(function(o){return <Chip key={o} label={o} active={f.v===o} onClick={function(){f.s(o);}} sm/>;})}</div>
            </div>
          );})}
          <div style={{marginBottom:16}}>
            <SLabel>Children under 12 at home?</SLabel>
            <div style={{display:"flex",gap:8}}>
              {["Yes","No"].map(function(v){return(
                <button key={v} onClick={function(){setKids(v==="Yes");}}
                  style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid "+(kids===(v==="Yes")?C.coral:C.line),background:kids===(v==="Yes")?C.coral+"15":"transparent",color:kids===(v==="Yes")?C.coral:C.t2,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:kids===(v==="Yes")?600:400}}>
                  {v}
                </button>
              );})}
            </div>
          </div>
          <button onClick={saveProfile}
            style={{width:"100%",padding:"13px",borderRadius:14,background:C.coral,color:"#fff",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:600,fontSize:15}}>
            Save changes
          </button>
        </Card>
      )}

      {/* ── LEGAL ── */}
      <div style={{marginTop:8,marginBottom:16}}>
        <div style={{...ty.label,color:C.t3,marginBottom:12}}>Legal</div>
        {["Terms & Conditions","Privacy Policy","Data & Insights","Community Guidelines"].map(function(title){
          var doc = LEGAL_DOCS.find(function(d){return d.title===title;});
          return doc ? (
            <button key={title} onClick={function(){setLegalDoc(doc);}}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"12px 0",background:"transparent",border:"none",borderBottom:"1px solid "+C.line,cursor:"pointer",fontFamily:sans,textAlign:"left"}}>
              <span style={{...ty.sm,color:C.t2}}>{title}</span>
              <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)"}}/>
            </button>
          ) : null;
        })}
      </div>

      <button onClick={onLogout} style={{width:"100%",padding:"13px",borderRadius:14,background:"transparent",border:"1px solid "+C.line,color:C.t2,cursor:"pointer",...ty.btn}}>Sign out</button>

      {legalDoc&&<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,overflowY:"auto"}}>{legalDoc==="screen"?<LegalScreen onBack={function(){setLegalDoc(null);}}/>:<LegalPage doc={legalDoc} onBack={function(){setLegalDoc(null);}}/>}</div>}
    </div>
  );
}

/* ==================================================
   PRE-LAUNCH PAGE DATA
================================================== */

// Question bank by industry -- curated by Cravz
// Full pre-launch question bank — 9 industries, 20 questions each
// Firebase: prelaunch_questions/{id} with topic + industries[] fields
// Topics: usage_frequency | spend | format | location | missing | trust | features | loyalty
const PRELAUNCH_QUESTIONS = {
  restaurant: [
    {id:"rq1",  topic:"usage_frequency", q:"How often do you eat or drink out locally?", opts:["Most days","3-4 times a week","Once or twice a week","A few times a month"]},
    {id:"rq2",  topic:"missing",         q:"Which occasion is hardest to satisfy locally?", opts:["Weekend brunch","Weekday working lunch","Evening meal with friends","Late-night food after 10pm"]},
    {id:"rq3",  topic:"missing",         q:"Why do you end up going further or ordering delivery?", opts:["Nothing that suits my taste","Quality is not there","Too expensive","Wrong hours or hard to book"]},
    {id:"rq4",  topic:"format",          q:"Which format would you use most?", opts:["Sit-down, table service","Counter / casual","Takeaway or click-and-collect","All three options"]},
    {id:"rq5",  topic:"spend",           q:"How much do you typically spend per head on an evening out?", opts:["Under £20","£20-35","£35-55","£55+"]},
    {id:"rq6",  topic:"spend",           q:"How much would you pay for a weekday working lunch?", opts:["Under £10","£10-15","£15-20","I don't do working lunches locally"]},
    {id:"rq7",  topic:"features",        q:"What one thing would guarantee you'd come back?", opts:["Exceptional coffee","Serious natural wine list","Strong plant-based menu","Seasonal ingredient-led cooking"]},
    {id:"rq8",  topic:"features",        q:"How important is outdoor seating to you?", opts:["Dealbreaker in summer","Nice to have","I prefer inside","Irrelevant"]},
    {id:"rq9",  topic:"missing",         q:"What is your biggest frustration with eating out locally?", opts:["Options are too samey","Quality is inconsistent","Hard to get a table","Nothing for dietary needs"]},
    {id:"rq10", topic:"format",          q:"How do you prefer to book?", opts:["Always book ahead","Walk in","Prefer guaranteed walk-ins","App with live availability"]},
    {id:"rq11", topic:"features",        q:"How important is locally or ethically sourced food?", opts:["Very — I actively seek it","Influences my choice","Nice to know","Not something I think about"]},
    {id:"rq12", topic:"missing",         q:"What drink offering is most underserved locally?", opts:["Specialty coffee","Natural wine","Creative cocktails","Quality non-alcoholic"]},
    {id:"rq13", topic:"usage_frequency", q:"How likely are you to bring a group of 4+ people?", opts:["Very — group dinners are regular","Occasionally for celebrations","Rarely","Need to know it's great first"]},
    {id:"rq14", topic:"features",        q:"Does a children's menu affect your choice?", opts:["Yes — essential, I have kids","Yes — I want the option","No — I prefer adult spaces","It would put me off"]},
    {id:"rq15", topic:"features",        q:"How important is a neighbourhood feel over chains?", opts:["Very — I avoid chains","Quite important","Somewhat","Not important"]},
    {id:"rq16", topic:"spend",           q:"Most you'd pay for weekend brunch per person?", opts:["Under £12","£12-18","£18-25","£25+ if exceptional"]},
    {id:"rq17", topic:"format",          q:"Would you attend a supper club or ticketed dining event?", opts:["Yes — I actively look for these","Occasionally","Probably not","No"]},
    {id:"rq18", topic:"loyalty",         q:"What would turn a good visit into a story you tell friends?", opts:["A dish I've never had","Exceptional service","Stunning space","Serendipitous discovery"]},
    {id:"rq19", topic:"loyalty",         q:"How quickly do you give up if the first visit is average?", opts:["Immediately","Give it one more try","Try but order differently","Very patient"]},
    {id:"rq20", topic:"missing",         q:"What single change to your local food scene would matter most?", opts:["Proper indie coffee shop","Great casual dinner spot","Quality lunch under £15","Late-night food that is not fast food"]},
  ],
  fitness: [
    {id:"fq1",  topic:"usage_frequency", q:"What is your current fitness setup?", opts:["Membership I use regularly","Have one but barely use it","Work out at home or outdoors","Nothing structured"]},
    {id:"fq2",  topic:"missing",         q:"What is the biggest barrier to being more active?", opts:["Cost","Convenience — nothing close","Time — hours do not fit","Motivation — struggle alone"]},
    {id:"fq3",  topic:"format",          q:"What activity would you commit to weekly if available locally?", opts:["Reformer pilates or yoga","Strength training","HIIT or group classes","Swimming or low-impact cardio"]},
    {id:"fq4",  topic:"usage_frequency", q:"What time slot would you realistically use most weeks?", opts:["Early morning before 9am","Lunchtime 12-2pm","After work 5-8pm","Weekend mornings"]},
    {id:"fq5",  topic:"usage_frequency", q:"How many sessions per week would you aim for?", opts:["5 or more","3-4","1-2","When I felt like it"]},
    {id:"fq6",  topic:"spend",           q:"What is your maximum monthly budget for fitness?", opts:["Up to £30","£30-60","£60-100","£100-150","£150+"]},
    {id:"fq7",  topic:"format",          q:"What membership structure would you commit to?", opts:["Monthly rolling","Class pack","Annual upfront","Pay per session"]},
    {id:"fq8",  topic:"format",          q:"What class size is ideal?", opts:["Under 8","8-12","12-20","20+"]},
    {id:"fq9",  topic:"features",        q:"How important is the quality of the instructor?", opts:["Most important — I follow coaches","Very important","Somewhat","Not a big factor"]},
    {id:"fq10", topic:"loyalty",         q:"What would keep you coming back after the first month?", opts:["Measurable results","Knowing people in the class","Instructor knowing my progress","Routine fitting my schedule"]},
    {id:"fq11", topic:"features",        q:"What add-on would make you choose one studio over another?", opts:["Sauna or recovery suite","Nutrition coaching","App that tracks automatically","On-site childcare"]},
    {id:"fq12", topic:"features",        q:"How important are good changing rooms and showers?", opts:["Essential — I go straight to work","Important","Nice to have","Not important"]},
    {id:"fq13", topic:"missing",         q:"What is your main fitness goal right now?", opts:["Fat loss and body composition","Building strength","Flexibility and recovery","Managing stress and mental health"]},
    {id:"fq14", topic:"loyalty",         q:"Would you be more likely to start if a friend was joining?", opts:["Definitely — accountability is everything","It would help","Does not factor in","I prefer going solo"]},
    {id:"fq15", topic:"features",        q:"How important is the space looking premium?", opts:["Very — I will not go somewhere cheap","Quite important","Somewhat","Just need clean equipment"]},
    {id:"fq16", topic:"format",          q:"How do you prefer to discover and book classes?", opts:["Well-designed app","Instagram with booking link","Website or email","Walk in or WhatsApp"]},
    {id:"fq17", topic:"format",          q:"How would you feel about a studio-only gym?", opts:["Prefer it","Fine with it","Want both options","Dealbreaker — need open floor"]},
    {id:"fq18", topic:"location",        q:"How far would you realistically travel for the right gym?", opts:["5 min walk","10 min walk","15-20 min any means","Would travel if worth it"]},
    {id:"fq19", topic:"loyalty",         q:"What would make you leave a gym you were happy with?", opts:["Price increase","Favourite instructor leaving","Overcrowding","Life change"]},
    {id:"fq20", topic:"trust",           q:"What would make you sign up before a gym even opened?", opts:["Founding member rate","Free trial class","Recommendation","Seeing the space and team first"]},
  ],
  food_retail: [
    {id:"frq1",  topic:"usage_frequency", q:"How much of your weekly food shopping goes through a supermarket?", opts:["Almost all","The majority — I top up locally","Roughly half","I avoid supermarkets"]},
    {id:"frq2",  topic:"missing",         q:"What product would you most like to buy locally but cannot?", opts:["Quality meat — butcher-cut","Fresh fish and seafood","Artisan bread baked daily","Serious cheese or deli items"]},
    {id:"frq3",  topic:"loyalty",         q:"What would make you stop at a local food shop several times a week?", opts:["Freshness I can see","A product I cannot get elsewhere","Speed — in and out in 5 minutes","Someone who knows what I like"]},
    {id:"frq4",  topic:"spend",           q:"How much do you spend on food shopping per week?", opts:["Under £60","£60-100","£100-160","£160+"]},
    {id:"frq5",  topic:"spend",           q:"What proportion would you shift to a good independent?", opts:["Less than 10%","10-25%","25-50%","More than half"]},
    {id:"frq6",  topic:"usage_frequency", q:"What time of day are you most likely to shop?", opts:["Before 9am","Lunchtime","After work or school run","Weekend mornings"]},
    {id:"frq7",  topic:"features",        q:"How important is speaking to someone knowledgeable?", opts:["Very — it is the whole reason","Useful but not essential","Nice sometimes","I prefer browsing alone"]},
    {id:"frq8",  topic:"spend",           q:"Would you pay a premium over supermarket prices for quality?", opts:["Yes — 20-30% more is fair","Yes up to 10-15%","Depends on product","Need to be convinced"]},
    {id:"frq9",  topic:"features",        q:"What additional service would shift where you shop?", opts:["Pre-order for guaranteed stock","Local delivery for weekly order","Recipe cards","Loyalty scheme"]},
    {id:"frq10", topic:"features",        q:"How do you feel about environmental footprint?", opts:["Very important","Try to make better choices","Interested but not consistent","Not a consideration"]},
    {id:"frq11", topic:"usage_frequency", q:"What would make you visit more during the week?", opts:["A hot grab-and-go option","Knowing daily delivery arrived","Evening hours past 7pm","A coffee worth stopping for"]},
    {id:"frq12", topic:"features",        q:"How important is sourcing from named British producers?", opts:["Very — I want to know exactly","Quite important","Somewhat","I care about quality not provenance"]},
    {id:"frq13", topic:"trust",           q:"What would stop you from using a local food shop?", opts:["Inconsistent stock","Higher prices not justified","Limited hours","Not knowing what they sell"]},
    {id:"frq14", topic:"trust",           q:"What would get you through the door on day one?", opts:["Opening offer","Recommendation","Instagram","I would just walk past and pop in"]},
    {id:"frq15", topic:"format",          q:"What is your attitude to pre-ordering or subscriptions for food?", opts:["Love it — already use boxes","Open for right product","Prefer flexibility","Not for me"]},
    {id:"frq16", topic:"features",        q:"How important is buying loose or zero-waste?", opts:["Very — I seek this out","Quite important","Somewhat","Not important"]},
    {id:"frq17", topic:"usage_frequency", q:"What is your relationship with cooking at home?", opts:["Cook from scratch most evenings","Cook regularly but want shortcuts","Cook occasionally","Barely cook"]},
    {id:"frq18", topic:"loyalty",         q:"What kind of added value would make you a loyal regular?", opts:["Loyalty card","Weekly best-of email","Exclusive seasonal products","Evening tastings"]},
    {id:"frq19", topic:"location",        q:"How far would you walk out of your way for a shop you loved?", opts:["Must be on my route","Up to 5 min off","Up to 15 min","Would plan a trip"]},
    {id:"frq20", topic:"loyalty",         q:"What would make you recommend this shop to everyone?", opts:["A product I cannot stop thinking about","Service that remembered me","Consistent quality","Feeling of community"]},
  ],
  retail: [
    {id:"roq1",  topic:"usage_frequency", q:"What percentage of non-food shopping happens online vs in a shop?", opts:["Mostly online 70%+","Online majority, occasional shops","Roughly equal","I prefer shops"]},
    {id:"roq2",  topic:"trust",           q:"What would make you choose local over Amazon?", opts:["Products I cannot find online","Advice from someone who knows","The experience feels good","Supporting the area"]},
    {id:"roq3",  topic:"missing",         q:"What is most missing from your local high street?", opts:["Independent with a strong point of view","Good homeware or interiors","Independent clothing","Specialist shop for a hobby"]},
    {id:"roq4",  topic:"spend",           q:"How much do you typically spend at a local independent?", opts:["Under £20","£20-50","£50-100","£100+"]},
    {id:"roq5",  topic:"trust",           q:"How do you discover new local shops?", opts:["Walking past","Someone recommends it","Instagram","Google or best-local article"]},
    {id:"roq6",  topic:"loyalty",         q:"What makes you return more than once?", opts:["Stock changes regularly","Staff who remember my taste","Things I cannot find elsewhere","Most convenient option"]},
    {id:"roq7",  topic:"features",        q:"How important is the feeling of the shop itself?", opts:["Very — I decide before looking at products","Quite important","Somewhat","Not important"]},
    {id:"roq8",  topic:"format",          q:"What kind of product curation do you prefer?", opts:["Small and highly considered","Wide range","Seasonal and rotating","Narrow but deep"]},
    {id:"roq9",  topic:"usage_frequency", q:"When are you most likely to browse and buy?", opts:["Saturday morning","Sunday afternoon","Weekday lunchtime","After work on a weekday"]},
    {id:"roq10", topic:"features",        q:"What would prompt you to buy a gift from a local independent?", opts:["Knowing it feels more personal","Gift wrapping service","Pick it up same day","Recommendation from the counter"]},
    {id:"roq11", topic:"features",        q:"How much does sustainability affect your purchasing?", opts:["A lot — I research and it changes behaviour","Positive factor but not decisive","Curious but not consistent","I don't factor it in"]},
    {id:"roq12", topic:"format",          q:"Would you attend an in-store event — a launch or workshop?", opts:["Yes — I enjoy these","Occasionally for something exciting","Probably not","No"]},
    {id:"roq13", topic:"location",        q:"How far would you travel for a shop you loved?", opts:["Must be walkable","Up to 20 min any means","30-45 min for something special","Distance doesn't stop me"]},
    {id:"roq14", topic:"trust",           q:"How important is deep product knowledge from staff?", opts:["Essential — why I choose independent","Very important","Helpful but not essential","I prefer browsing alone"]},
    {id:"roq15", topic:"usage_frequency", q:"What opening hours matter most?", opts:["Early from 8am","Late past 7pm","All day weekend","Standard hours"]},
    {id:"roq16", topic:"format",          q:"How do you feel about a shop that also has an online store?", opts:["Prefer it — I like ordering after discovering","Doesn't change how I feel","Slightly prefer in-person only","Only buy online if I cannot get there"]},
    {id:"roq17", topic:"loyalty",         q:"What would make you tell five friends without being asked?", opts:["A product so unique I had to share","An experience that felt special","Discovering something I didn't know I needed","Exceptional service"]},
    {id:"roq18", topic:"features",        q:"What services would add real value?", opts:["Repair or restoration","Custom orders","Click and collect","Loyalty scheme"]},
    {id:"roq19", topic:"features",        q:"How do you feel about supporting local vs convenience?", opts:["Actively prioritise local","Do it when easy","Like the idea but habit wins","Decisions purely on convenience"]},
    {id:"roq20", topic:"loyalty",         q:"What could earn your loyalty in the first 30 days?", opts:["Genuinely wow me","Founding customer discount","Remember me on second visit","Be consistently open as promised"]},
  ],
  experience: [
    {id:"exq1",  topic:"usage_frequency", q:"How often do you go to a local event or experience?", opts:["Weekly","2-3 times a month","Once a month or less","Rarely — nothing worth going to"]},
    {id:"exq2",  topic:"missing",         q:"What type of experience is hardest to access locally?", opts:["High-quality food and drink events","Live music in an intimate setting","Creative workshops","Social experiences — meet new people"]},
    {id:"exq3",  topic:"usage_frequency", q:"What is your usual group size?", opts:["Solo","2 people","3-5 friends","6+ — I organise group events"]},
    {id:"exq4",  topic:"spend",           q:"How much would you spend on a local experience including food and drink?", opts:["Under £20","£20-40","£40-70","£70-100","£100+"]},
    {id:"exq5",  topic:"trust",           q:"What makes you actually buy a ticket?", opts:["A friend is already going","The format feels genuinely different","Time-limited offer","Fear of missing out"]},
    {id:"exq6",  topic:"usage_frequency", q:"What day and time works best for you?", opts:["Friday evening","Saturday afternoon or early evening","Saturday late evening","Sunday daytime or early evening"]},
    {id:"exq7",  topic:"missing",         q:"What is your biggest frustration with local events?", opts:["Quality is not there","Hard to find what is on","Tickets are overpriced","Nothing that suits my interests"]},
    {id:"exq8",  topic:"trust",           q:"How do you find out about local events?", opts:["Instagram — local accounts","Word of mouth","Local email or newsletter","Eventbrite or events app"]},
    {id:"exq9",  topic:"features",        q:"How important is the venue to your decision?", opts:["Very — space makes a huge difference","Quite important","Somewhat","Content matters more than setting"]},
    {id:"exq10", topic:"format",          q:"Would you attend a recurring monthly event?", opts:["Yes — I love a regular thing","Occasionally if content changes","Only for something very niche","I prefer variety"]},
    {id:"exq11", topic:"features",        q:"How important is food and drink being part of the experience?", opts:["Central — eating together is the point","Very important","Nice to have","I am there for the activity"]},
    {id:"exq12", topic:"format",          q:"How do you prefer to book?", opts:["Instagram or WhatsApp link instantly","Eventbrite","Clean website","Show up without booking"]},
    {id:"exq13", topic:"format",          q:"Would you pay for a membership or season pass?", opts:["Yes — love a local cultural membership","Possibly if clear value","Unlikely unless very specific","No — pay per event"]},
    {id:"exq14", topic:"features",        q:"How important is family-friendly suitability?", opts:["Essential — would not go without","Important — I like the option","Not relevant","Important that it is NOT family-friendly"]},
    {id:"exq15", topic:"format",          q:"What format are you most drawn to?", opts:["Workshop — learn a skill","Performance or showcase","Competitive or social game","Eat drink and talk — people are the point"]},
    {id:"exq16", topic:"trust",           q:"How do you feel about attending something solo locally?", opts:["Completely comfortable","Would do it for something exciting","Would feel awkward","Would not go solo"]},
    {id:"exq17", topic:"loyalty",         q:"What would make you tell everyone about a local event?", opts:["It surprised me — better than expected","Introduced me to people I connected with","Best version of a format I love","Production quality felt world-class"]},
    {id:"exq18", topic:"location",        q:"How far would you travel for a great local experience?", opts:["10 min walk — or not happening","Up to 25 min any means","30-40 min for something exciting","Distance is not a barrier"]},
    {id:"exq19", topic:"spend",           q:"Maximum you would spend on a genuinely high-quality evening event?", opts:["£15-25","£25-40","£40-60","£60-80","£80+ if truly exceptional"]},
    {id:"exq20", topic:"loyalty",         q:"What would a brilliant venue need to earn your loyalty?", opts:["A programme I can plan around","Community feeling — same faces","Value — high quality without overcharging","Flexibility — different price points"]},
  ],
  childcare: [
    {id:"cq1",  topic:"usage_frequency", q:"What are the ages of the children you would bring?", opts:["Under 2","2-4","5-8","9-12","Mixed ages"]},
    {id:"cq2",  topic:"missing",         q:"What is most missing locally for families with children?", opts:["Stimulating weekday morning activities","Good after-school clubs","Quality weekend activities","Holiday camps I actually trust"]},
    {id:"cq3",  topic:"usage_frequency", q:"When do you most urgently need something for your child?", opts:["Weekday mornings while I work","Weekday afternoons after school","Saturdays","School holidays — this is when I struggle"]},
    {id:"cq4",  topic:"format",          q:"What does your child most need right now?", opts:["Physical — sport and movement","Creative — art and music","Social — being around other children","Educational — learning outcome"]},
    {id:"cq5",  topic:"spend",           q:"How much would you spend per session for a quality activity?", opts:["Up to £8","£8-15","£15-25","£25+ if quality is clearly worth it"]},
    {id:"cq6",  topic:"trust",           q:"What matters most when choosing a provider?", opts:["Qualifications and safeguarding","My child's face — if they love it","Convenience — if it is easy","Other parents' recommendations"]},
    {id:"cq7",  topic:"format",          q:"Do you prefer to drop off and leave, or stay and watch?", opts:["Drop off always — I need that time","Stay and watch","Depends on age and activity","Try both and see"]},
    {id:"cq8",  topic:"features",        q:"What do you most want available while your child is in an activity?", opts:["A genuinely good coffee","Somewhere I can work","Other parents to chat with","Nothing — I leave and come back"]},
    {id:"cq9",  topic:"format",          q:"What term-time structure works best?", opts:["Fixed weekly slot","Flexible booking","Mix — regular slot plus swaps","Mainly need holiday provision"]},
    {id:"cq10", topic:"features",        q:"How important is outdoor space or nature-based activity?", opts:["Very — I specifically look for this","Quite important","Somewhat","Less important — quality indoors"]},
    {id:"cq11", topic:"missing",         q:"What is your biggest frustration with children's activities locally?", opts:["Too expensive for quality","Oversubscribed — can never get a space","Quality is inconsistent","Nothing matching what my child likes"]},
    {id:"cq12", topic:"trust",           q:"What would build your trust in a new provider?", opts:["Trial session reduced or free","Credentials and safeguarding upfront","Recommendations from parents I know","Seeing space and meeting team first"]},
    {id:"cq13", topic:"location",        q:"How far would you travel for a class you really trusted?", opts:["Must be walkable — 10 min max","Up to 10 min drive","Up to 20 min any means","Distance doesn't matter"]},
    {id:"cq14", topic:"format",          q:"Would you use holiday camps if available locally?", opts:["Yes — holiday childcare is a real problem","Yes occasionally","Only if nothing else","No — we make other arrangements"]},
    {id:"cq15", topic:"features",        q:"How important is sibling provision?", opts:["Very — I have multiple kids","Quite important","Would be a bonus","Not relevant — one child"]},
    {id:"cq16", topic:"format",          q:"What is your attitude to paying upfront for a term?", opts:["Prefer it — committed and better value","Fine if provider is established","Wary — want to try first","Only ever pay session by session"]},
    {id:"cq17", topic:"format",          q:"How do you prefer to book and manage sessions?", opts:["A proper app","WhatsApp with the organiser","Simple website","By phone or in person"]},
    {id:"cq18", topic:"loyalty",         q:"What would make you recommend a provider to every parent you know?", opts:["My child asks to go every week","Instructor knows my child as individual","Admin is smooth — no faff","Price is fair with no surprise extras"]},
    {id:"cq19", topic:"features",        q:"How important are the other children and families at the class?", opts:["Very — social mix matters","Quite important","Somewhat","Not important"]},
    {id:"cq20", topic:"loyalty",         q:"What single thing would make you stick with a provider for years?", opts:["My child genuinely thriving","Team I personally trust","Consistency — same faces every week","Growing with my child as they get older"]},
  ],
  beauty: [
    {id:"bq1",  topic:"spend",           q:"What beauty or wellness service do you spend most on per year?", opts:["Hair — cuts colour or treatments","Nails — manicure or gel","Skin — facials or advanced treatments","Body — massage or holistic therapies"]},
    {id:"bq2",  topic:"missing",         q:"What service do you travel furthest for because there is no good quality locally?", opts:["A colourist I really trust","Advanced skincare or aesthetics","Brow and lash treatments","Massage or body treatment that works"]},
    {id:"bq3",  topic:"loyalty",         q:"How loyal are you to your current beauty providers?", opts:["Very — been with people for years","Loyal but would move for better quality","I shop around regularly","No fixed providers"]},
    {id:"bq4",  topic:"trust",           q:"What would make you switch to someone new and local?", opts:["Meaningfully better results","Significantly more convenient","Noticeably better experience","Strong personal recommendation"]},
    {id:"bq5",  topic:"spend",           q:"How much do you spend per month on beauty and personal care?", opts:["Under £30","£30-60","£60-100","£100-150","£150+"]},
    {id:"bq6",  topic:"usage_frequency", q:"When do you most prefer to book?", opts:["Early morning 8-10am","Lunchtime or early afternoon","After work 5-7pm","Weekends"]},
    {id:"bq7",  topic:"missing",         q:"What treatment do you feel is most underserved locally?", opts:["Advanced skin — LED microneedling peels","Lash and brow done really well","Nails — a great nail bar with wide range","Men's grooming or treatment space"]},
    {id:"bq8",  topic:"features",        q:"How do you like the experience to feel?", opts:["Efficient — in done out","Unhurried and luxurious","Warm and chatty","Calm and quiet — decompress"]},
    {id:"bq9",  topic:"format",          q:"How do you find and book beauty services?", opts:["Treatwell or Fresha","Instagram — I find people and DM","Salon app or website","Word of mouth — ask friends and book direct"]},
    {id:"bq10", topic:"missing",         q:"What is your biggest frustration with beauty services locally?", opts:["Cannot get appointments when I want","Quality is wildly inconsistent","Prices up but experience has not improved","No one I trust enough to be my regular"]},
    {id:"bq11", topic:"usage_frequency", q:"How important is same-day or last-minute availability?", opts:["Very — I am spontaneous","Useful occasionally","I usually book 1-3 weeks ahead","Not important — very planned"]},
    {id:"bq12", topic:"features",        q:"How important is the product range used during treatment?", opts:["Very — I research brands","Prefer clean or premium brands","Somewhat — notice if very cheap","Not important — skill over products"]},
    {id:"bq13", topic:"format",          q:"Would you use a prepaid credit or membership model?", opts:["Yes — love to prepay and use credits","Maybe if clear discount and flexible","Probably not","No — don't want to be tied in"]},
    {id:"bq14", topic:"trust",           q:"How important is a proper consultation before treatment?", opts:["Essential — won't go somewhere that skips","Very important","Nice to have","Not important — just get on with it"]},
    {id:"bq15", topic:"loyalty",         q:"What would make you leave a 5-star review and recommend?", opts:["Results that genuinely surprised me","Therapist remembered my preferences","Space felt premium","Booking was seamless"]},
    {id:"bq16", topic:"location",        q:"How far would you travel for someone who consistently delivered great results?", opts:["10 min max — needs to be local","Up to 20 min","30-40 min for someone truly excellent","Already travel 45+ min for current person"]},
    {id:"bq17", topic:"trust",           q:"How do you feel about trying a new therapist for the first time?", opts:["Very open — enjoy discovering new people","Cautious — need strong recommendation","Anxious — worry about wasting money","Very reluctant — don't change once found someone"]},
    {id:"bq18", topic:"features",        q:"What add-on would change your relationship with a salon?", opts:["Personalised product recommendations","Loyalty scheme for regular visits","Treatment alerts tailored to what I have had","Honest conversation about what would actually help"]},
    {id:"bq19", topic:"loyalty",         q:"What would a new local salon need to do in 30 days to earn loyalty?", opts:["Deliver exceptional results first visit","New client promotion that feels low-risk","Make me feel remembered and valued","Give me a reason to rebook immediately"]},
    {id:"bq20", topic:"missing",         q:"Which of these would make the biggest difference to your life?", opts:["Great colourist within 10 min of home","Skincare specialist like a trusted professional","Nail bar with decent wait times","Space that made me feel genuinely looked after"]},
  ],
  services: [
    {id:"sq1",  topic:"missing",         q:"Which professional service is hardest to find a trustworthy local provider for?", opts:["Tax accounting and bookkeeping","Legal advice — wills conveyancing contracts","Mortgage or protection advice I can trust","Financial planning — ISAs pensions wealth"]},
    {id:"sq2",  topic:"trust",           q:"How did you find your current professional service providers?", opts:["Personal recommendation","Google search with good reviews","Inherited — family or employer uses","Chose based on price or proximity"]},
    {id:"sq3",  topic:"loyalty",         q:"How loyal are you to your current providers?", opts:["Very — been with them years","Loyal but would move for better service","Switched before and would again","Don't feel loyal — just haven't changed"]},
    {id:"sq4",  topic:"trust",           q:"What would make you switch to a new local provider?", opts:["Genuine personal recommendation","Better availability and responsiveness","Clearer transparent pricing","Feeling they actually cared about my situation"]},
    {id:"sq5",  topic:"missing",         q:"What is the most frustrating thing about professional services today?", opts:["Slow to respond","Jargon makes me feel stupid","I feel like a number","Cost is hard to predict"]},
    {id:"sq6",  topic:"format",          q:"How important is your provider being local and accessible in person?", opts:["Very — being able to walk in or call","Quite important — prefer local","Somewhat — video call is fine","Not important — happy fully remote"]},
    {id:"sq7",  topic:"format",          q:"How do you prefer to communicate with professional advisors?", opts:["In-person meetings for anything serious","Video call — efficient and personal enough","Email and occasional calls","Client portal or app"]},
    {id:"sq8",  topic:"spend",           q:"How much do you spend per year on professional advice?", opts:["Under £500","£500-1500","£1500-3500","£3500+","Honestly don't know"]},
    {id:"sq9",  topic:"missing",         q:"Are there areas where you know you should be getting professional help but aren't?", opts:["Yes — putting off finances or tax","Yes — need a will or legal structure","Yes — should review mortgage","No — fairly well covered"]},
    {id:"sq10", topic:"features",        q:"How quickly do you expect a response?", opts:["Same day","Within 24 hours","Within 2-3 days is reasonable","Flexible as long as they come back before I chase"]},
    {id:"sq11", topic:"loyalty",         q:"What would make you feel genuinely well-served?", opts:["They proactively reach out when things change","Explain things in plain language","Remember my situation without briefing","Honest even when it is not what I want to hear"]},
    {id:"sq12", topic:"format",          q:"Would you pay for an ongoing advisory retainer?", opts:["Yes — love someone I can call whenever","Maybe — depends on cost and what is included","Probably not","Only pay when I have a specific problem"]},
    {id:"sq13", topic:"trust",           q:"How important is price transparency before agreeing to work with someone?", opts:["Essential — won't engage without clear quote","Very important — need rough figure","Somewhat — understand it might vary","Comfortable with hourly billing if I trust person"]},
    {id:"sq14", topic:"missing",         q:"What is your biggest barrier to getting proper professional advice?", opts:["Cost — assume it will be more than I can justify","Not knowing who to trust","Not knowing if I actually need it","Inertia — keep meaning to sort it"]},
    {id:"sq15", topic:"format",          q:"Would you attend a free local workshop on tax, legal basics, or financial planning?", opts:["Yes — genuinely useful","Maybe if directly relevant","Probably not","No"]},
    {id:"sq16", topic:"trust",           q:"How do you feel about a newer practice versus long-established firm?", opts:["Prefer established — track record matters","Open to either — judge on the person","Slightly prefer newer — more accessible","Strongly prefer newer — digital-first"]},
    {id:"sq17", topic:"loyalty",         q:"What would make you refer a professional to a close friend?", opts:["Made a complex thing feel simple","Saved me real money or solved real problem","Responsive reliable never made me chase","Felt like someone on my side"]},
    {id:"sq18", topic:"missing",         q:"What type of professional service is most underrepresented locally?", opts:["Accountant for individuals and freelancers","Solicitor for personal matters at fair price","Genuinely independent mortgage broker","Financial advisor who takes smaller clients seriously"]},
    {id:"sq19", topic:"trust",           q:"If a new local practice opened, what would make you book?", opts:["Free 30-min consultation","Clear published fixed-fee menu","Strong reviews from people in my area","Recommendation from my network"]},
    {id:"sq20", topic:"loyalty",         q:"What would make you stick with a professional advisor for 10+ years?", opts:["Advice I can act on that turns out right","Feel like a trusted part of my life","Proactive — spots things before I ask","Honest about what they don't know"]},
  ],
  coworking: [
    {id:"cwq1",  topic:"usage_frequency", q:"What is your current working setup?", opts:["Fully remote — work from home","Hybrid — home and office","Freelance or self-employed","Travel for work — need flexible workspace"]},
    {id:"cwq2",  topic:"missing",         q:"What is your biggest challenge with where you currently work?", opts:["Loneliness — affects mood and energy","Distractions at home","No professional space for client calls","Nothing separating work from rest of life"]},
    {id:"cwq3",  topic:"usage_frequency", q:"How many days per week would you use a local coworking space?", opts:["1 day — break the week up","2-3 days — regular pattern","4-5 days — essentially full-time","Ad hoc — when I need a change"]},
    {id:"cwq4",  topic:"format",          q:"What workspace setup do you most need?", opts:["Hot desk — just need somewhere to sit","Dedicated desk — same spot mine","Private office","Meeting room access — that is the main thing"]},
    {id:"cwq5",  topic:"spend",           q:"What is your maximum monthly budget for workspace?", opts:["Up to £100","£100-200","£200-350","£350-500","£500+ for private office"]},
    {id:"cwq6",  topic:"format",          q:"What membership structure works best?", opts:["Monthly rolling","Day pass — pay only when used","Annual at meaningful discount","Hybrid — rolling monthly with day pass top-ups"]},
    {id:"cwq7",  topic:"features",        q:"What are your non-negotiables in a workspace?", opts:["Rock-solid fast WiFi","Good coffee I would actually drink","Quiet zones or phone booths","Professional environment for clients"]},
    {id:"cwq8",  topic:"features",        q:"How important is the design and feel of the space?", opts:["Very — I work better in a thoughtful space","Quite important","Somewhat — prefer nice but pragmatic","Not important — clean functional WiFi"]},
    {id:"cwq9",  topic:"usage_frequency", q:"What type of professional are you?", opts:["Freelancer or solo self-employed","Remote employee","Part of a small team 2-6 people","Starting or running a business"]},
    {id:"cwq10", topic:"features",        q:"How important is the community — knowing who else uses the space?", opts:["Very — people are the point","Quite important","Somewhat — open to it but not why I would choose","Not important — come in focus and leave"]},
    {id:"cwq11", topic:"format",          q:"Would you attend events at the space?", opts:["Yes — big part of why coworking appeals","Occasionally for something relevant","Rarely — maybe a social","No — want workspace not programming"]},
    {id:"cwq12", topic:"features",        q:"How important is 24/7 or extended access?", opts:["Essential — I work early or late","Very useful — occasional after-hours","Nice to have","Not important — 9-6 is enough"]},
    {id:"cwq13", topic:"usage_frequency", q:"Do you need the space to meet clients or have professional calls?", opts:["Yes regularly — primary use case","Occasionally — few times a month","Rarely — mainly go to focus","No — meet clients elsewhere or virtually"]},
    {id:"cwq14", topic:"trust",           q:"What would make you choose one coworking space over another?", opts:["Feel and quality of space","The community — who else is there","Price and flexibility","Proximity — closer to home the better"]},
    {id:"cwq15", topic:"features",        q:"How important is having a cafe or food and drink on site?", opts:["Very — want good coffee and lunch without leaving","Quite important","Somewhat — bring my own if not there","Not important — just need workspace"]},
    {id:"cwq16", topic:"loyalty",         q:"What would make you recommend a coworking space to a friend?", opts:["It significantly improved my productivity","Met people who became useful contacts","Price-to-quality was clearly the best","Team made me feel like a person"]},
    {id:"cwq17", topic:"missing",         q:"What is the single biggest thing missing from your working life that coworking could fix?", opts:["Professional context — feel like I am at work","Human contact — colleagues without politics","Infrastructure — meeting rooms proper desk","Separation between home and work"]},
    {id:"cwq18", topic:"trust",           q:"How do you feel about signing up before a space has opened?", opts:["Happy to — founding rate compelling","Want to see space first then decide","Wary — want reviews from real members","Only commit once open and tried it"]},
    {id:"cwq19", topic:"loyalty",         q:"What makes you leave a workspace you were happy with?", opts:["Price increase not justified","Vibe changed — too many people","Key contacts left","Life change — moved or changed jobs"]},
    {id:"cwq20", topic:"loyalty",         q:"What would a great local coworking space do that big chains don't?", opts:["Feel built for and by local community","Know my name and treat me as individual","Programme events leading to real connections","Be honest and flexible — no hidden fees"]},
  ],
};



// Default question set for segments without specific questions
const DEFAULT_QUESTIONS = [
  {id:"dq1", q:"What would bring you through the door on day one?", opts:["Curiosity","Recommendation","A great offer","I've been waiting for this"]},
  {id:"dq2", q:"How often would you use this?",                     opts:["Daily","Weekly","Monthly","Special occasions"]},
  {id:"dq3", q:"What matters most to you?",                        opts:["Quality","Price","Convenience","Community feel"]},
  {id:"dq4", q:"How did you first hear about local businesses?",    opts:["Word of mouth","Social media","Walking past","Local groups"]},
];

// Map BIZ_SEGMENTS to question bank keys
const SEGMENT_TO_QUESTIONS = {
  restaurant:  "restaurant",
  fitness:     "fitness",
  retail_food: "retail_food",
  retail_other:"retail_other",
  experience:  "experience",
  beauty:      "beauty",
  education:   "childcare",
  services:    "services",
  coworking:   "coworking",
};

// Question group metadata -- objective-based grouping for each bank
const QUESTION_GROUPS = {
  restaurant:[
    {id:"freq",     label:"Frequency & Occasion",      ids:["rq1","rq2","rq10","rq13"]},
    {id:"spend",    label:"Spend & Pricing",            ids:["rq5","rq6","rq16"]},
    {id:"format",   label:"Format & Atmosphere",        ids:["rq4","rq8","rq14","rq15","rq17","rq18"]},
    {id:"switching",label:"Loyalty & Switching",        ids:["rq3","rq7","rq9","rq11","rq12","rq19","rq20"]},
  ],
  fitness:[
    {id:"behaviour",label:"Current Behaviour",          ids:["fq1","fq2","fq3","fq18"]},
    {id:"schedule", label:"Schedule & Commitment",      ids:["fq4","fq5","fq7","fq8"]},
    {id:"spend",    label:"Pricing & Budget",           ids:["fq6","fq11","fq12"]},
    {id:"loyalty",  label:"Retention & Loyalty",        ids:["fq9","fq10","fq13","fq14","fq15","fq16","fq19","fq20"]},
  ],
  retail_food:[
    {id:"behaviour",label:"Shopping Behaviour",         ids:["rfq1","rfq2","rfq6","rfq17"]},
    {id:"spend",    label:"Spend & Price Tolerance",    ids:["rfq4","rfq5","rfq8"]},
    {id:"switching",label:"Switching & Loyalty",        ids:["rfq3","rfq7","rfq9","rfq11","rfq13","rfq14","rfq18","rfq19","rfq20"]},
    {id:"values",   label:"Values & Sourcing",          ids:["rfq10","rfq12","rfq15","rfq16"]},
  ],
  retail_other:[
    {id:"behaviour",label:"Shopping Behaviour",         ids:["roq1","roq2","roq5","roq7"]},
    {id:"spend",    label:"Spend & Occasion",           ids:["roq4","roq6","roq8","roq9"]},
    {id:"switching",label:"Online vs Local",            ids:["roq3","roq10","roq11","roq13","roq14"]},
    {id:"loyalty",  label:"Loyalty & Advocacy",         ids:["roq12","roq15","roq16","roq17","roq18","roq19","roq20"]},
  ],
  experience:[
    {id:"occasion", label:"Occasion & Frequency",       ids:["eq1","eq2","eq6","eq7"]},
    {id:"format",   label:"Format & Group",             ids:["eq3","eq4","eq5","eq8","eq9"]},
    {id:"spend",    label:"Spend & Value",              ids:["eq10","eq11","eq12"]},
    {id:"loyalty",  label:"Discovery & Loyalty",        ids:["eq13","eq14","eq15","eq16","eq17","eq18","eq19","eq20"]},
  ],
};
// Fallback: group all questions under one heading for banks without defined groups
function getGroupsForSegment(segment){
  const key = SEGMENT_TO_QUESTIONS[segment]||null;
  const qs = key ? (PRELAUNCH_QUESTIONS[key]||DEFAULT_QUESTIONS) : DEFAULT_QUESTIONS;
  if(key && QUESTION_GROUPS[key]) return {groups: QUESTION_GROUPS[key], allQs: qs};
  return {groups:[{id:"all",label:"All questions",ids:qs.map(q=>q.id)}], allQs: qs};
}

function getQuestionsForSegment(segment){
  const key = SEGMENT_TO_QUESTIONS[segment]||null;
  return key ? (PRELAUNCH_QUESTIONS[key]||DEFAULT_QUESTIONS) : DEFAULT_QUESTIONS;
}

// Simulated pre-launch pages visible to residents

// Simulated pre-launch survey responses -- per question, per answer option
// In production these would be live aggregated counts from respondents
const SIMULATED_PL_RESPONSES = {
  rq1:  [12, 28, 41, 19],
  rq2:  [34, 18, 31, 17],
  rq3:  [29, 22, 31, 18],
  rq4:  [22, 38, 14, 26],
  rq5:  [8,  34, 42, 16],
  rq6:  [14, 41, 29, 16],
  rq7:  [31, 24, 27, 18],
  rq8:  [38, 34, 18, 10],
  rq9:  [41, 28, 19, 12],
  rq10: [26, 38, 22, 14],
  fq1:  [32, 24, 28, 16],
  fq2:  [28, 34, 24, 14],
  fq3:  [38, 22, 28, 12],
  fq4:  [29, 18, 36, 17],
  fq5:  [12, 34, 38, 16],
  fq6:  [18, 36, 28, 12, 6],
  fq7:  [38, 28, 18, 16],
  fq8:  [24, 38, 28, 10],
  fq9:  [14, 28, 38, 20],
  fq10: [28, 24, 32, 16],
};
function getSimResponses(qBank, totalResponses){
  return qBank.map(q => {
    const base = SIMULATED_PL_RESPONSES[q.id] || q.opts.map(()=>Math.round(totalResponses/q.opts.length));
    const total = base.reduce((s,v)=>s+v,0);
    const scaled = base.map(v=>Math.round((v/total)*totalResponses));
    return { ...q, counts: scaled, total: totalResponses };
  });
}

// -- PLQuestionGroups -- proper component so useState is valid
function PLQuestionGroups({segment, plSelected, setPlSelected, setPlStep}){
  const {groups, allQs:qAll} = getGroupsForSegment(segment);
  const [openGroups, setOpenGroups] = useState(new Set());
  const toggleGroup = id => setOpenGroups(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  return (
    <div>
      <h2 style={{...ty.h2,marginBottom:4}}>Choose your questions</h2>
      <div style={{...ty.body,marginBottom:16}}>Select 3–5 questions. Grouped by what they help you learn.</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{...ty.meta,color:C.t3}}>Select 3–5</div>
        <div style={{...ty.meta,color:plSelected.size>=3?C.coral:C.t3,fontWeight:700}}>{plSelected.size} / 5 selected</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {groups.map(grp=>{
          const grpQs = qAll.filter(q=>grp.ids.includes(q.id));
          const selInGrp = grpQs.filter(q=>plSelected.has(q.id)).length;
          const isOpen = openGroups.has(grp.id);
          return (
            <div key={grp.id} style={{borderRadius:12,border:`1px solid ${selInGrp>0?C.coral+"50":C.line}`,overflow:"hidden",background:C.surface}}>
              <button onClick={()=>toggleGroup(grp.id)}
                style={{width:"100%",padding:"12px 14px",background:"transparent",border:"none",cursor:"pointer",
                  fontFamily:sans,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                <div style={{flex:1}}>
                  <span style={{...ty.bodyMd,fontSize:13}}>{grp.label}</span>
                  <span style={{...ty.meta,color:C.t3,marginLeft:8}}>{grpQs.length} questions</span>
                </div>
                {selInGrp>0&&<span style={{...ty.meta,color:C.coral,fontWeight:700,background:`${C.coral}12`,padding:"2px 7px",borderRadius:5,fontSize:10}}>{selInGrp} selected</span>}
                <ChevronDown size={13} color={C.t3} style={{transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
              </button>
              {isOpen&&(
                <div style={{borderTop:`1px solid ${C.line}`}}>
                  {grpQs.map(q=>{
                    const sel=plSelected.has(q.id);
                    const maxed=plSelected.size>=5&&!sel;
                    return (
                      <div key={q.id} style={{borderBottom:`1px solid ${C.line}`}}>
                        <button onClick={()=>{if(maxed)return;const s=new Set(plSelected);sel?s.delete(q.id):s.add(q.id);setPlSelected(s);}}
                          style={{width:"100%",padding:"12px 16px",background:sel?`${C.coral}0A`:"transparent",border:"none",
                            cursor:maxed?"default":"pointer",fontFamily:sans,display:"flex",alignItems:"flex-start",gap:10,textAlign:"left",opacity:maxed?0.4:1}}>
                          <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${sel?C.coral:C.line}`,
                            background:sel?C.coral:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                            {sel&&<Check size={10} color="#fff"/>}
                          </div>
                          <span style={{...ty.sm,color:sel?C.t1:C.t2,lineHeight:1.5,fontSize:12}}>{q.q}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button disabled={plSelected.size<3} onClick={()=>setPlStep(3)}
        style={{width:"100%",padding:"14px",borderRadius:14,background:plSelected.size>=3?C.coral:C.surface2,
          color:plSelected.size>=3?"#fff":C.t3,border:"none",cursor:plSelected.size>=3?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15}}>
        {plSelected.size>=3?`Continue with ${plSelected.size} questions →`:"Select at least 3 questions"}
      </button>
    </div>
  );
}

// -- ClosedSurveyCard: live responses for active, summary for expired --
function ClosedSurveyCard({survey, allQs}){
  var isLive = survey.status === "active";
  var total = survey.responseCount || 0;
  var questions = (survey.questions && survey.questions.length)
    ? survey.questions
    : (allQs || []).slice(0, 5);
  var resultsData = getSimResponses(questions, Math.max(total, 1));
  var accent = isLive ? C.green : C.amber;

  if(total === 0) {
    return (
      <div style={{padding:"32px 20px",textAlign:"center",background:C.surface,border:"1px dashed "+C.line,borderRadius:14}}>
        <div style={{fontSize:28,marginBottom:8}}>⏳</div>
        <div style={{...ty.bodyMd,marginBottom:4}}>Waiting for responses</div>
        <div style={{...ty.sm,color:C.t3,lineHeight:1.6}}>Residents will see this page in their feed. Responses appear here as they come in.</div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {resultsData.map(function(q, qi){
        var counts = q.counts || [];
        var maxCount = counts.length ? Math.max.apply(null, counts.concat([1])) : 1;
        var topIdx = counts.indexOf(maxCount);
        return (
          <Card key={q.id||qi} style={{padding:"16px 18px"}}>
            <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:12,lineHeight:1.5}}>
              {qi+1}. {q.q}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {(q.opts||[]).map(function(opt, oi){
                var count = counts[oi] || 0;
                var pct = total > 0 ? Math.round((count / total) * 100) : 0;
                var isTop = oi === topIdx && count > 0;
                return (
                  <div key={oi}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{...ty.meta,color:isTop?C.t1:C.t2,fontWeight:isTop?600:400,fontSize:12,flex:1,paddingRight:8,lineHeight:1.4}}>
                        {opt}
                        {isTop&&<span style={{marginLeft:6,fontSize:9,color:accent,fontWeight:700}}>▲ top</span>}
                      </span>
                      <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                        <span style={{...ty.meta,color:isTop?accent:C.t3,fontWeight:isTop?700:400,fontSize:11}}>{pct}%</span>
                        <span style={{...ty.meta,color:C.t3,fontSize:10}}>({count})</span>
                      </div>
                    </div>
                    <div style={{height:6,background:C.surface2,borderRadius:3,overflow:"hidden"}}>
                      <div style={{
                        height:"100%",
                        width:pct+"%",
                        background:isTop?accent:C.line,
                        borderRadius:3,
                        transition:"width .4s ease",
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
const PRELAUNCH_PAGES = [
  {
    id:"pl1",
    title:"Soft play café",
    emoji:"🧸",
    cat:"business",
    area:"SW4",
    operator:"The Nest",
    operatorType:"business",
    opening:"Spring 2026",
    blurb:"A proper soft play café for SW4 families — good coffee, real food, and a safe space for under-8s to let loose.",
    questions:PRELAUNCH_QUESTIONS.childcare||DEFAULT_QUESTIONS,
    responseCount:47,
    segment:"education",
    status:"active",  // active | opening_soon | open
  },
  {
    id:"pl2",
    title:"Late-night ramen",
    emoji:"🍜",
    cat:"business",
    area:"SW9",
    operator:"Tanuki Collective",
    operatorType:"investor",
    opening:"Summer 2026",
    blurb:"Backed by a group of local food investors who saw the demand. Authentic tonkotsu, open until 2am, no reservations.",
    questions:PRELAUNCH_QUESTIONS.restaurant||DEFAULT_QUESTIONS,
    responseCount:31,
    segment:"restaurant",
    status:"active",
  },
  {
    id:"pl3",
    title:"Reformer pilates studio",
    emoji:"🧘",
    cat:"activity",
    area:"SW11",
    operator:"Studio Form",
    operatorType:"business",
    opening:"Opening soon",
    blurb:"SW11's first dedicated reformer studio. 12 machines, small classes, all levels welcome.",
    questions:PRELAUNCH_QUESTIONS.fitness||DEFAULT_QUESTIONS,
    responseCount:89,
    segment:"fitness",
    status:"opening_soon",
  },
];


/* ==================================================
   BUSINESS DASHBOARD
   fix #6: catchment + distance together, both Enterprise
   fix #7: FAQ tab
   fix #8: demographics with % breakdown
   fix #9: heat map -- select item -> ranked postcodes + colour map
   fix #10: message residents -- coming soon
================================================== */

// Per-item demographic distributions (for #8)
const DEMO_DIST = {
  "b1":{age:[{l:"18–24",p:5},{l:"25–34",p:48},{l:"35–44",p:32},{l:"45–54",p:12},{l:"55+",p:3}],gender:[{l:"Women",p:64},{l:"Men",p:28},{l:"Non-binary",p:8}],hh:[{l:"Families w/ kids",p:72},{l:"Couple",p:18},{l:"Solo",p:7},{l:"Family no kids",p:3}]},
  "a1":{age:[{l:"18–24",p:18},{l:"25–34",p:42},{l:"35–44",p:28},{l:"45–54",p:9},{l:"55+",p:3}],gender:[{l:"Women",p:58},{l:"Men",p:35},{l:"Non-binary",p:7}],hh:[{l:"Couple",p:44},{l:"Solo",p:38},{l:"Families w/ kids",p:12},{l:"Family no kids",p:6}]},
  "p1":{age:[{l:"18–24",p:12},{l:"25–34",p:34},{l:"35–44",p:30},{l:"45–54",p:16},{l:"55+",p:8}],gender:[{l:"Women",p:52},{l:"Men",p:44},{l:"Non-binary",p:4}],hh:[{l:"Families w/ kids",p:48},{l:"Couple",p:28},{l:"Solo",p:16},{l:"Family no kids",p:8}]},
  "b4":{age:[{l:"18–24",p:32},{l:"25–34",p:45},{l:"35–44",p:16},{l:"45–54",p:5},{l:"55+",p:2}],gender:[{l:"Women",p:48},{l:"Men",p:46},{l:"Non-binary",p:6}],hh:[{l:"Solo",p:48},{l:"Couple",p:36},{l:"Families w/ kids",p:10},{l:"Family no kids",p:6}]},
  "p3":{age:[{l:"18–24",p:22},{l:"25–34",p:38},{l:"35–44",p:24},{l:"45–54",p:12},{l:"55+",p:4}],gender:[{l:"Women",p:50},{l:"Men",p:44},{l:"Non-binary",p:6}],hh:[{l:"Couple",p:38},{l:"Solo",p:30},{l:"Families w/ kids",p:22},{l:"Family no kids",p:10}]},
  "b2":{age:[{l:"18–24",p:14},{l:"25–34",p:36},{l:"35–44",p:32},{l:"45–54",p:14},{l:"55+",p:4}],gender:[{l:"Men",p:68},{l:"Women",p:26},{l:"Non-binary",p:6}],hh:[{l:"Solo",p:54},{l:"Couple",p:34},{l:"Family no kids",p:8},{l:"Families w/ kids",p:4}]},
  "a2":{age:[{l:"18–24",p:16},{l:"25–34",p:44},{l:"35–44",p:28},{l:"45–54",p:9},{l:"55+",p:3}],gender:[{l:"Women",p:72},{l:"Men",p:22},{l:"Non-binary",p:6}],hh:[{l:"Solo",p:46},{l:"Couple",p:40},{l:"Families w/ kids",p:8},{l:"Family no kids",p:6}]},
  "p2":{age:[{l:"18–24",p:20},{l:"25–34",p:36},{l:"35–44",p:26},{l:"45–54",p:14},{l:"55+",p:4}],gender:[{l:"Women",p:54},{l:"Men",p:40},{l:"Non-binary",p:6}],hh:[{l:"Solo",p:38},{l:"Couple",p:32},{l:"Families w/ kids",p:20},{l:"Family no kids",p:10}]},
};

// Per-item heat map data (for #9)
const HEATMAP = {
  "b1":[{area:"SW4",label:"Clapham",score:169},{area:"SW11",label:"Battersea",score:141},{area:"SW9",label:"Brixton",score:98},{area:"SE5",label:"Camberwell",score:76},{area:"SW2",label:"Streatham",score:54},{area:"SW12",label:"Balham",score:48},{area:"SW8",label:"Stockwell",score:39},{area:"N1",label:"Islington",score:31}],
  "a1":[{area:"SE1",label:"Southwark",score:145},{area:"SW4",label:"Clapham",score:119},{area:"E1",label:"Shoreditch",score:112},{area:"N16",label:"Stoke Newington",score:98},{area:"EC1",label:"Clerkenwell",score:87},{area:"SW9",label:"Brixton",score:72},{area:"E8",label:"Hackney",score:68},{area:"WC1",label:"Bloomsbury",score:41}],
  "p1":[{area:"SW4",label:"Clapham",score:142},{area:"SW11",label:"Battersea",score:128},{area:"SW12",label:"Balham",score:109},{area:"SW9",label:"Brixton",score:94},{area:"SW2",label:"Streatham",score:81},{area:"SE5",label:"Camberwell",score:67},{area:"SW8",label:"Stockwell",score:52},{area:"SW6",label:"Fulham",score:44}],
  "b4":[{area:"E1",label:"Shoreditch",score:138},{area:"EC1",label:"Clerkenwell",score:121},{area:"N1",label:"Islington",score:104},{area:"SW4",label:"Clapham",score:91},{area:"E8",label:"Hackney",score:88},{area:"SE1",label:"Southwark",score:76},{area:"N16",label:"Stoke Newington",score:58},{area:"WC1",label:"Bloomsbury",score:49}],
  "p3":[{area:"SW4",label:"Clapham",score:97},{area:"SW11",label:"Battersea",score:88},{area:"SW9",label:"Brixton",score:79},{area:"SE5",label:"Camberwell",score:71},{area:"N1",label:"Islington",score:63},{area:"E1",label:"Shoreditch",score:58},{area:"SW2",label:"Streatham",score:47},{area:"SW12",label:"Balham",score:42}],
  "b2":[{area:"E8",label:"Hackney",score:134},{area:"N16",label:"Stoke Newington",score:118},{area:"E1",label:"Shoreditch",score:102},{area:"EC1",label:"Clerkenwell",score:89},{area:"N1",label:"Islington",score:76},{area:"WC1",label:"Bloomsbury",score:61},{area:"SW4",label:"Clapham",score:44},{area:"SE5",label:"Camberwell",score:38}],
  "a2":[{area:"SW4",label:"Clapham",score:121},{area:"SW11",label:"Battersea",score:108},{area:"W1",label:"Marylebone",score:94},{area:"N1",label:"Islington",score:87},{area:"SW3",label:"Chelsea",score:79},{area:"SW10",label:"W. Chelsea",score:68},{area:"SE1",label:"Southwark",score:54},{area:"SW6",label:"Fulham",score:47}],
  "p2":[{area:"SW4",label:"Clapham",score:98},{area:"N16",label:"Stoke Newington",score:91},{area:"E1",label:"Shoreditch",score:84},{area:"N1",label:"Islington",score:77},{area:"E8",label:"Hackney",score:69},{area:"WC1",label:"Bloomsbury",score:58},{area:"SW11",label:"Battersea",score:51},{area:"EC1",label:"Clerkenwell",score:43}],
};



function DemoBar({items,color}){
  const max=Math.max(...items.map(i=>i.p));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {items.map(item=>(
        <div key={item.l} style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:80,flexShrink:0,...ty.meta,color:C.t2,fontSize:10,textAlign:"right"}}>{item.l}</div>
          <div style={{flex:1,height:8,background:C.line,borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(item.p/max)*100}%`,background:color,borderRadius:4,transition:"width .3s"}}/>
          </div>
          <div style={{width:28,flexShrink:0,...ty.meta,color,fontWeight:700,fontSize:10}}>{item.p}%</div>
        </div>
      ))}
    </div>
  );
}

// FAQ data for #7
/* ==================================================
   LEGAL CONTENT
================================================== */
const LEGAL_DOCS = [
  {
    id: "terms",
    title: "Terms & Conditions",
    updated: "January 2025",
    sections: [
      {heading: null, body: "These Terms govern your use of Cravz (the Platform), operated by Tale Labs Ltd. By using Cravz, you agree to these Terms."},
      {heading: "1. About Cravz", body: "Cravz is a platform that aggregates local user preferences to surface demand patterns, trends, and neighbourhood-level opportunities."},
      {heading: "2. Eligibility", body: "You must be at least 16 years old to use the Platform."},
      {heading: "3. User Accounts", body: "You are responsible for maintaining the confidentiality of your account and for all activity under it."},
      {heading: "4. User Contributions", body: "Users can submit votes, preferences, and comments (User Content). By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and analyse it within the Platform."},
      {heading: "5. Nature of the Data", body: "Cravz reflects aggregated user input and is designed to provide directional insights. It does not represent verified market data or guaranteed outcomes."},
      {heading: "6. Responsible Use", body: "You agree not to: manipulate votes or demand signals; submit misleading or coordinated content; use the Platform for unlawful purposes."},
      {heading: "7. Moderation", body: "We may review, remove, or restrict content or accounts to maintain data integrity and community quality."},
      {heading: "8. Business Use", body: "Cravz is a decision-support tool. It should be used alongside other sources, judgement, and analysis."},
      {heading: "9. Limitation of Liability", body: "To the maximum extent permitted by law, we are not liable for decisions, losses, or outcomes resulting from use of the Platform."},
      {heading: "10. Changes", body: "We may update these Terms from time to time."},
      {heading: "11. Contact", body: "Tale Labs Ltd\nhello@cravz.co"},
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    updated: "January 2025",
    sections: [
      {heading: null, body: "This policy explains how Tale Labs Ltd collects, uses, and protects your data when you use Cravz."},
      {heading: "1. Data We Collect", body: "We may collect: email or phone number; approximate location (e.g. postcode area); votes, preferences, and comments; usage and interaction data."},
      {heading: "2. How We Use Data", body: "We use data to: generate aggregated insights; improve the Platform; enable community features."},
      {heading: "3. Aggregated Data", body: "We may use anonymised, aggregated data for analytics and commercial insights."},
      {heading: "4. Legal Basis", body: "We process data under: Consent; Legitimate interests."},
      {heading: "5. Data Retention", body: "We retain data as long as necessary to provide value and maintain relevance. Older data may be weighted differently or removed over time."},
      {heading: "6. Your Rights", body: "You may: access your data; request deletion; correct inaccuracies; withdraw consent. Contact: hello@cravz.co"},
      {heading: "7. Security", body: "We implement appropriate measures to protect your data."},
      {heading: "8. Updates", body: "We may update this policy periodically."},
    ],
  },
  {
    id: "data",
    title: "Data & Insights",
    updated: "January 2025",
    sections: [
      {heading: null, body: "Cravz aggregates real-time local preferences to highlight demand patterns, sentiment, and emerging opportunities."},
      {heading: "What our insights are", body: "The insights provided are: based on user contributions; indicative and directional in nature; designed to complement, not replace, other sources of information."},
      {heading: "Limitations", body: "While we aim to maintain high-quality and relevant data, Cravz does not guarantee completeness or full market representation. The Platform should be used as one of several inputs when making business or investment decisions."},
      {heading: "Liability", body: "Tale Labs Ltd does not accept liability for decisions made based solely on Cravz data."},
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    updated: "January 2025",
    sections: [
      {heading: null, body: "To maintain the quality and usefulness of Cravz, you agree not to:"},
      {heading: null, body: "Artificially influence demand or rankings. Coordinate or manipulate activity. Submit misleading or false information. Use the Platform for spam or commercial misuse."},
      {heading: null, body: "We may take action where necessary to protect the integrity of the Platform."},
    ],
  },
  {
    id: "user-content",
    title: "User Content",
    updated: "January 2025",
    sections: [
      {heading: null, body: "You are responsible for the content you submit."},
      {heading: "Standards", body: "Content should be: honest; relevant; constructive."},
      {heading: "Moderation", body: "We may remove content that undermines trust, accuracy, or community value. Repeated misuse may result in account restrictions."},
    ],
  },
  {
    id: "community",
    title: "Community Guidelines",
    updated: "January 2025",
    sections: [
      {heading: null, body: "Cravz works best when the data reflects real local needs."},
      {heading: "Do", body: "Share genuine preferences. Be specific and useful. Think about your neighbourhood."},
      {heading: "Avoid", body: "Inflating demand. Posting with an agenda. Adding noise instead of insight."},
      {heading: null, body: "Better data leads to better outcomes for everyone."},
    ],
  },
  {
    id: "cookies",
    title: "Cookie Policy",
    updated: "January 2025",
    sections: [
      {heading: null, body: "We use cookies to: ensure the Platform functions correctly; understand usage patterns; improve performance."},
      {heading: null, body: "You can manage cookies through your browser settings."},
    ],
  },
  {
    id: "business-use",
    title: "Business Use",
    updated: "January 2025",
    sections: [
      {heading: null, body: "Cravz provides aggregated insights into local demand and preferences."},
      {heading: "Acknowledgements", body: "Businesses using this data acknowledge that: it reflects user sentiment, not verified demand; it is directional and exploratory in nature; it should be combined with other analysis and judgement."},
      {heading: "Redistribution", body: "Data may not be resold or redistributed without permission."},
    ],
  },
  {
    id: "moderation",
    title: "Moderation & Takedown",
    updated: "January 2025",
    sections: [
      {heading: null, body: "We aim to maintain a high-quality and trustworthy platform."},
      {heading: "Content removal", body: "We may review and remove content that: is misleading; damages trust in the data; violates our policies."},
      {heading: "Contact", body: "Users can report content via the Platform or contact: hello@cravz.co"},
    ],
  },
];


const FAQ_SECTIONS = [
  {
    section: "Understanding demand",
    items: [
      {
        q: "What is a Voice?",
        a: "A Voice represents one real person who wants something in their area. Each person counts once per idea, no matter how strongly they feel about it.",
        why: "It shows how many different people want something — not just how loud a few people are.",
      },
      {
        q: "What is Intensity?",
        a: "Intensity shows how strongly people want a concept. It reflects how much of their available voting power they chose to allocate to it.",
        why: "Two ideas can have the same number of people behind them, but very different levels of urgency.",
      },
      {
        q: "What is Signal Confidence?",
        a: "Signal Confidence shows how reliable a result is, based on how many independent people have voted for it.",
        why: "The more people agree, the more you can trust the signal as a real opportunity.",
      },
      {
        q: "What is Momentum?",
        a: "Momentum shows how demand is changing over time — whether interest is growing, stable, or slowing down.",
        why: "It helps you spot what is emerging early, not just what is already popular.",
      },
    ],
  },
  {
    section: "Understanding commercial potential",
    items: [
      {
        q: "What is Expected Spend?",
        a: "Expected Spend is what people say they would typically spend when visiting this type of place.",
        why: "It helps position the opportunity as budget, mid-range, or premium.",
      },
      {
        q: "What is Visit Frequency?",
        a: "Visit Frequency shows how often people expect to use a concept — for example weekly, monthly, or occasionally.",
        why: "A high-frequency concept can be more valuable than a high-spend but infrequent one.",
      },
      {
        q: "How is Revenue Potential calculated?",
        a: "Revenue Potential is a directional estimate of how demand could translate into spending. It combines how many people want something, how often they would go, how much they would spend, and how far they would travel. It reflects potential, not guaranteed revenue.",
        why: "It helps compare which ideas could have the biggest commercial impact.",
      },
    ],
  },
  {
    section: "Understanding geographic pull",
    items: [
      {
        q: "What is Distance Distribution?",
        a: "Distance Distribution shows how far people are willing to travel for a concept, broken down across different ranges.",
        why: "It reveals whether demand is driven by convenience or willingness to travel.",
      },
      {
        q: "What is Catchment Profile?",
        a: "Catchment Profile is a simple summary of where demand is likely to come from based on travel patterns. Neighbourhood-led means mostly people who want it very close. Local area pull means local demand plus nearby areas. Destination-led means people are willing to travel further.",
        why: "It helps you quickly understand whether this is a local convenience or a destination business.",
      },
      {
        q: "Why are both Distance Distribution and Catchment Profile shown?",
        a: "Distance Distribution gives the full detail. Catchment Profile turns that into a quick, easy-to-read summary.",
        why: "You can either go deeper or understand the headline instantly.",
      },
    ],
  },
  {
    section: "Understanding the audience",
    items: [
      {
        q: "What does Audience Snapshot show?",
        a: "Audience Snapshot gives a simple view of who is driving demand, such as age groups or household types.",
        why: "It helps shape the concept so it fits the people who actually want it.",
      },
      {
        q: "What are Concept Attributes?",
        a: "Concept Attributes describe what people specifically want within a category — such as atmosphere, features, or positioning.",
        why: "It turns a general idea into something precise and actionable.",
      },
    ],
  },
  {
    section: "Understanding market opportunity",
    items: [
      {
        q: "What does capture or penetration mean?",
        a: "Capture (or penetration) is the share of demand that a business actually converts into real customers. Not everyone who wants something will become a customer.",
        why: "It connects interest to real business performance.",
      },
      {
        q: "Do all people who want something become customers?",
        a: "No. Even strong demand does not mean everyone will visit. People may choose alternatives, visit occasionally, or not convert at all.",
        why: "It helps set realistic expectations when evaluating an opportunity.",
      },
      {
        q: "How should I think about capture rates?",
        a: "A simple way to think about it: lower capture means a conservative scenario. Moderate capture means a realistic scenario. Higher capture means strong execution.",
        why: "It helps you think in ranges rather than relying on one number.",
      },
      {
        q: "Can two similar ideas have different outcomes?",
        a: "Yes. Even with similar demand, outcomes can vary based on execution, pricing, experience, and competition.",
        why: "Demand shows opportunity — success depends on how well it is delivered.",
      },
    ],
  },
  {
    section: "Understanding areas and population",
    items: [
      {
        q: "How does Cravz estimate population in each area?",
        a: "Cravz works at postcode district level (like SW4 or N1), which represent neighbourhood-sized areas. Population is estimated using official UK data mapped to these areas. It is not an exact count, but accurate enough to understand scale and opportunity.",
        why: null,
      },
      {
        q: "Can I trust these numbers?",
        a: "Yes. Population estimates are based on official sources such as the Office for National Statistics and standard geographic mapping methods. They are widely used in analytics and are more than sufficient for spotting demand, validating ideas, and making decisions.",
        why: null,
      },
    ],
  },
  {
    section: "How the system works",
    items: [
      {
        q: "Why do preferences refresh over time?",
        a: "People's habits and neighbourhoods change. Preferences are refreshed so the data reflects what people want now, not what they wanted in the past.",
        why: "It keeps insights relevant and up to date.",
      },
      {
        q: "Can users update their votes?",
        a: "Yes. Users can revisit and update their preferences over time, while avoiding constant short-term changes.",
        why: "It balances stability with real-life changes in behaviour.",
      },
      {
        q: "Why are rankings not based on one metric?",
        a: "Rankings combine multiple factors — how many people want something, how strongly they want it, how often they would use it, and how much they would spend.",
        why: "It gives a more realistic picture than any single number.",
      },
      {
        q: "Why can some concepts rank highly with fewer Voices?",
        a: "Because demand is not just about how many people — it is also about how strong, frequent, and valuable that demand is.",
        why: "A smaller but more committed audience can represent a stronger opportunity.",
      },
    ],
  },
];

const GLOSSARY_ITEMS = [
  {t:"Voice", d:"A real person expressing interest in a concept."},
  {t:"Coins", d:"The limited voting power users use to show what matters most to them."},
  {t:"Intensity", d:"How strongly people want something."},
  {t:"Signal Confidence", d:"How reliable a result is based on how many people support it."},
  {t:"Momentum", d:"How demand is changing over time."},
  {t:"Expected Spend", d:"What people expect to spend per visit."},
  {t:"Visit Frequency", d:"How often people expect to visit."},
  {t:"Distance Distribution", d:"How far people are willing to travel, shown in detail."},
  {t:"Catchment Profile", d:"A simple summary of where demand comes from."},
  {t:"Audience Snapshot", d:"A view of who is driving demand."},
  {t:"Concept Attributes", d:"The specific features or qualities people want."},
  {t:"Revenue Potential", d:"An estimate of how demand could translate into spending."},
  {t:"Capture Rate", d:"The percentage of demand that converts into actual customers."},
  {t:"Postcode District", d:"A neighbourhood-sized area (e.g. SW4) used to group local demand."},
  {t:"Population Estimate", d:"An approximate number of people in an area used to understand scale."},
];




/* ==================================================
   OPPORTUNITIES BOTTOM CARD
   Shown at the bottom of the Demand tab -- collapsible
================================================== */
function OppBottomCard({crossSell, adjacentOpps, tier, bump}){
  const [open, setOpen] = useState(false);
  const hasCross = crossSell.length > 0;
  const hasAdj   = adjacentOpps.length > 0;
  const totalCount = crossSell.length + adjacentOpps.slice(0,3).length;

  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"0 16px 80px"}}>
      <div style={{borderRadius:16,border:`1px solid ${C.amber}30`,overflow:"hidden",background:`${C.amber}06`}}>
        {/* Collapsed header — always visible */}
        <button onClick={()=>setOpen(o=>!o)}
          style={{width:"100%",padding:"13px 16px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>💡</span>
          <div style={{flex:1}}>
            <div style={{...ty.bodyMd,fontSize:13,color:C.amber}}>Opportunities for your business</div>
            <div style={{...ty.meta,color:C.t3,marginTop:2}}>{totalCount} signal{totalCount!==1?"s":""} relevant to your category</div>
          </div>
          <ChevronDown size={14} color={C.t3} style={{transform:open?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
        </button>

        {/* Expanded content */}
        {open&&(
          <div style={{borderTop:`1px solid ${C.amber}20`,padding:"14px 16px 16px"}}>

            {/* Cross-sell — top 3 */}
            {hasCross&&(
              <div style={{marginBottom:hasCross&&hasAdj?16:0}}>
                <div style={{...ty.label,marginBottom:10}}>In your area — relevant to your category</div>
                {crossSell.slice(0,3).map((item,i)=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<Math.min(crossSell.length,3)-1?`1px solid ${C.line}`:"none"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{...ty.bodyMd,fontSize:13}}>{item.label}</div>
                      <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
                        <span style={{...ty.meta,color:conf(item.voters).color,fontWeight:600}}>{conf(item.voters).label}</span>
                        <span style={{...ty.meta,color:C.t3}}>·</span>
                        <span style={{...ty.meta,color:C.t3}}>{item.voters} voices</span>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{...ty.meta,color:item.momentum>20?C.green:C.amber,fontWeight:700}}>+{item.momentum}%</div>
                      {canSee(tier,"investor")&&<div style={{...ty.meta,color:C.t3,marginTop:2}}>{fmtMoney(item.monthlyRev)}/mo</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adjacent areas — top 3 */}
            {hasAdj&&canSee(tier,"builder")&&(
              <div>
                <div style={{...ty.label,marginBottom:10}}>Nearby areas — growing fast</div>
                {adjacentOpps.slice(0,3).map((item,i)=>(
                  <div key={item.id+item.area} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<Math.min(adjacentOpps.length,3)-1?`1px solid ${C.line}`:"none"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{item.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{...ty.bodyMd,fontSize:13}}>{item.label}</div>
                      <div style={{...ty.meta,color:C.t3,marginTop:2}}>{item.area} · {item.voters} voices</div>
                    </div>
                    <div style={{...ty.meta,color:item.momentum>20?C.green:C.amber,fontWeight:700,flexShrink:0}}>+{item.momentum}%</div>
                  </div>
                ))}
              </div>
            )}

            {!canSee(tier,"builder")&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:C.surface2,border:`1px solid ${C.line}`}}>
                <Lock size={13} color={C.t3}/>
                <div style={{flex:1,...ty.sm,color:C.t2}}>Adjacent area signals — Builder+</div>
                <button onClick={()=>bump("builder")} style={{padding:"5px 11px",borderRadius:8,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:11}}>Unlock</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function OfferInput({itemId, onSave}){
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  if(!open) return (
    <button onClick={e=>{e.stopPropagation();setOpen(true);}}
      style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.line}`,cursor:"pointer",fontFamily:sans}}>
      <span style={{fontSize:12}}>✋</span>
      <span style={{...ty.meta,color:C.t2,fontWeight:600}}>We offer this</span>
    </button>
  );
  return (
    <div onClick={e=>e.stopPropagation()} style={{background:C.bg,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.line}`}}>
      <div style={{...ty.meta,color:C.t3,marginBottom:6}}>Describe what you offer (one line)</div>
      <input value={text} onChange={e=>setText(e.target.value)}
        placeholder="e.g. We run singing classes every Thursday at 7pm"
        style={{width:"100%",background:C.surface2,border:`1px solid ${text.length>4?C.green:C.line}`,borderRadius:8,padding:"8px 10px",color:C.t1,fontSize:12,fontFamily:sans,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setOpen(false)} style={{padding:"6px 12px",borderRadius:8,background:"transparent",border:`1px solid ${C.line}`,color:C.t2,cursor:"pointer",...ty.meta,fontWeight:600,fontFamily:sans}}>Cancel</button>
        <button disabled={text.trim().length<5} onClick={()=>{onSave(text.trim());setOpen(false);}}
          style={{flex:1,padding:"6px",borderRadius:8,background:text.trim().length>=5?C.green:"transparent",border:`1px solid ${text.trim().length>=5?C.green:C.line}`,color:text.trim().length>=5?"#fff":C.t3,cursor:text.trim().length>=5?"pointer":"default",...ty.meta,fontWeight:700,fontFamily:sans}}>
          Save → notify matched residents
        </button>
      </div>
    </div>
  );
}

/* ==================================================
   CREATE PRE-LAUNCH PAGE — Investor only
   Steps: concept → questions → preview → published
================================================== */
function CreatePrelaunchPage({session, onBack, onPublish}) {
  var [step, setStep] = useState("concept");
  var [form, setForm] = useState({
    label:"", emoji:"🏪", cat:"food",
    area:(session&&session.areas&&session.areas[0])||"SW4",
    areas:(session&&session.areas)||["SW4"],
    opening:"", blurb:"", industryKey:"restaurant", selectedQs:[]
  });

  function setField(k, v) {
    setForm(function(f){ return Object.assign({}, f, {[k]:v}); });
  }

  // Industry options mapped from question bank
  var INDUSTRY_OPTS = [
    {id:"restaurant",  label:"Restaurant / Café",         emoji:"🍽️", cat:"food"},
    {id:"fitness",     label:"Gym / Fitness studio",      emoji:"🏋️", cat:"fitness"},
    {id:"food_retail", label:"Food retail / Deli",        emoji:"🛒", cat:"retail"},
    {id:"retail",      label:"Non-food retail",           emoji:"🏪", cat:"retail"},
    {id:"experience",  label:"Events / Experiences",      emoji:"🎭", cat:"entertain"},
    {id:"childcare",   label:"Childcare / Family",        emoji:"🧸", cat:"kids"},
    {id:"beauty",      label:"Beauty / Wellness",         emoji:"💆", cat:"health"},
    {id:"services",    label:"Professional services",     emoji:"💼", cat:"services"},
    {id:"coworking",   label:"Coworking / Office",        emoji:"💻", cat:"services"},
  ];

  // Topics for grouped question display
  var TOPIC_LABELS = {
    usage_frequency: "Usage & frequency",
    spend:           "Spend & pricing",
    format:          "Format & structure",
    location:        "Location & travel",
    missing:         "What is missing",
    trust:           "Trust & discovery",
    features:        "Features & preferences",
    loyalty:         "Loyalty & retention",
  };

  var allQs = PRELAUNCH_QUESTIONS[form.industryKey] || [];
  var topics = [];
  var byTopic = {};
  allQs.forEach(function(q) {
    if(!byTopic[q.topic]) { byTopic[q.topic] = []; topics.push(q.topic); }
    byTopic[q.topic].push(q);
  });

  function toggleQ(id) {
    var sel = form.selectedQs;
    if(sel.indexOf(id) !== -1) {
      setField("selectedQs", sel.filter(function(x){return x!==id;}));
    } else if(sel.length < 8) {
      setField("selectedQs", sel.concat([id]));
    }
  }

  var sessionAreas = (session&&session.areas)||["SW4"];

  // ── STEP: CONCEPT ─────────────────────────────────────────────
  if(step === "concept") {
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
        <div style={{position:"sticky",top:0,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,zIndex:50}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
          <div style={{...ty.bodyMd,fontSize:14}}>New pre-launch page</div>
          <div style={{...ty.meta,color:C.t3,marginLeft:"auto"}}>Step 1 of 3</div>
        </div>
        <div style={{padding:"24px 20px 60px",maxWidth:480,margin:"0 auto"}}>
          <h2 style={{fontFamily:serif,fontSize:20,fontWeight:700,marginBottom:6}}>Your concept</h2>
          <div style={{...ty.meta,color:C.t3,marginBottom:24,lineHeight:1.65}}>Tell residents what you are planning to open. Keep it honest — this shapes the questions they will answer.</div>

          {/* Business type */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:8}}>Type of business</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {INDUSTRY_OPTS.map(function(ind){
                var on = form.industryKey===ind.id;
                return(
                  <button key={ind.id} onClick={function(){setField("industryKey",ind.id); setField("cat",ind.cat); setField("emoji",ind.emoji); setField("selectedQs",[]);}}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,
                      background:on?C.coral+"12":C.surface, border:"1px solid "+(on?C.coral+"50":C.line),
                      cursor:"pointer",fontFamily:sans,textAlign:"left",width:"100%"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{ind.emoji}</span>
                    <span style={{...ty.sm,color:on?C.t1:C.t2,fontWeight:on?600:400}}>{ind.label}</span>
                    {on&&<div style={{width:7,height:7,borderRadius:"50%",background:C.coral,marginLeft:"auto",flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concept name */}
          <div style={{marginBottom:14}}>
            <div style={{...ty.label,marginBottom:6}}>Concept name</div>
            <input value={form.label} onChange={function(e){setField("label",e.target.value);}}
              placeholder="e.g. Late-night ramen bar · Reformer pilates studio"
              style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:12,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
          </div>

          {/* Areas — multi-select from all session areas */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{...ty.label}}>Areas</div>
              <div style={{...ty.meta,color:C.t3,fontSize:10}}>{(form.areas||[form.area]).length} selected · Firebase: page pushed to residents in all selected areas</div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {sessionAreas.map(function(a){
                var selAreas = form.areas||[form.area];
                var on = selAreas.indexOf(a)!==-1;
                return(
                  <button key={a} onClick={function(){
                    var cur = form.areas||[form.area];
                    var next = on ? cur.filter(function(x){return x!==a;}) : cur.concat([a]);
                    if(next.length===0) return;
                    setField("areas", next);
                    setField("area", next[0]);
                  }}
                    style={{padding:"8px 16px",borderRadius:20,cursor:"pointer",fontFamily:sans,fontSize:13,
                      background:on?C.coral+"15":C.surface, border:"1px solid "+(on?C.coral+"60":C.line),
                      color:on?C.t1:C.t3, fontWeight:on?600:400}}>
                    {a}
                  </button>
                );
              })}
            </div>
            {sessionAreas.length===1&&(
              <div style={{...ty.meta,color:C.t3,fontSize:11,marginTop:6}}>Add more areas in your profile to target multiple neighbourhoods.</div>
            )}
          </div>

          {/* Opening date */}
          <div style={{marginBottom:14}}>
            <div style={{...ty.label,marginBottom:6}}>Expected opening <span style={{color:C.t3,fontWeight:400,textTransform:"none",fontSize:10,letterSpacing:0}}>(optional)</span></div>
            <input value={form.opening} onChange={function(e){setField("opening",e.target.value);}}
              placeholder="e.g. Spring 2026 · Q3 2025"
              style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:12,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
          </div>

          {/* Blurb */}
          <div style={{marginBottom:24}}>
            <div style={{...ty.label,marginBottom:6}}>One-line description</div>
            <textarea value={form.blurb} onChange={function(e){setField("blurb",e.target.value);}}
              placeholder="e.g. A proper soft play café for SW4 families — good coffee, real food, safe space for under-8s."
              rows={3}
              style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:12,padding:"12px 14px",color:C.t1,fontSize:13,fontFamily:sans,outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
          </div>

          <button onClick={function(){if(form.label.trim()&&form.blurb.trim()) setStep("questions");}}
            disabled={!form.label.trim()||!form.blurb.trim()}
            style={{width:"100%",padding:"14px",background:form.label.trim()&&form.blurb.trim()?C.coral:C.surface2,
              color:form.label.trim()&&form.blurb.trim()?"#fff":C.t3,border:"none",borderRadius:14,
              cursor:form.label.trim()&&form.blurb.trim()?"pointer":"default",fontFamily:sans,fontWeight:700,fontSize:15}}>
            Choose questions →
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: QUESTIONS ───────────────────────────────────────────
  if(step === "questions") {
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
        <div style={{position:"sticky",top:0,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,zIndex:50}}>
          <button onClick={function(){setStep("concept");}} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
          <div style={{...ty.bodyMd,fontSize:14}}>Select questions</div>
          <div style={{...ty.meta,color:form.selectedQs.length>0?C.coral:C.t3,marginLeft:"auto",fontWeight:700}}>
            {form.selectedQs.length}/8 selected
          </div>
        </div>
        <div style={{padding:"16px 20px 80px",maxWidth:480,margin:"0 auto"}}>
          <div style={{...ty.meta,color:C.t3,marginBottom:20,lineHeight:1.65}}>Pick 3–8 questions for residents to answer. Organised by topic — choose across multiple topics for richer insight.</div>

          {topics.map(function(topic){
            var qs = byTopic[topic];
            return(
              <div key={topic} style={{marginBottom:20}}>
                <div style={{...ty.label,color:C.t3,marginBottom:10}}>{(TOPIC_LABELS[topic]||topic).toUpperCase()}</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {qs.map(function(q){
                    var sel = form.selectedQs.indexOf(q.id)!==-1;
                    var disabled = !sel && form.selectedQs.length >= 8;
                    return(
                      <button key={q.id} onClick={function(){if(!disabled) toggleQ(q.id);}}
                        style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderRadius:12,
                          background:sel?C.coral+"10":C.surface,
                          border:"1px solid "+(sel?C.coral+"50":C.line),
                          cursor:disabled?"default":"pointer",
                          fontFamily:sans,textAlign:"left",width:"100%",opacity:disabled?0.4:1}}>
                        <div style={{width:18,height:18,borderRadius:5,border:"1px solid "+(sel?C.coral:C.line),
                          background:sel?C.coral:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,marginTop:1}}>
                          {sel&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{...ty.sm,color:sel?C.t1:C.t2,fontWeight:sel?500:400,lineHeight:1.5,marginBottom:4}}>{q.q}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {q.opts.slice(0,3).map(function(o){return(
                              <span key={o} style={{...ty.meta,fontSize:9,padding:"1px 7px",borderRadius:20,background:C.surface2,border:"1px solid "+C.line,color:C.t3}}>{o}</span>
                            );})}
                            {q.opts.length>3&&<span style={{...ty.meta,fontSize:9,color:C.t3}}>+{q.opts.length-3} more</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{position:"sticky",bottom:20,left:0,right:0}}>
            <button onClick={function(){if(form.selectedQs.length>=3) setStep("preview");}}
              disabled={form.selectedQs.length<3}
              style={{width:"100%",padding:"14px",background:form.selectedQs.length>=3?C.coral:C.surface2,
                color:form.selectedQs.length>=3?"#fff":C.t3,border:"none",borderRadius:14,
                cursor:form.selectedQs.length>=3?"pointer":"default",fontFamily:sans,fontWeight:700,fontSize:15,
                boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}>
              {form.selectedQs.length<3?"Select at least 3 questions":"Preview page →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: PREVIEW ─────────────────────────────────────────────
  if(step === "preview") {
    var selQObjs = form.selectedQs.map(function(id){
      return allQs.find(function(q){return q.id===id;});
    }).filter(Boolean);
    return(
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
        <div style={{position:"sticky",top:0,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,zIndex:50}}>
          <button onClick={function(){setStep("questions");}} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Edit questions</button>
          <div style={{...ty.bodyMd,fontSize:14}}>Preview</div>
        </div>
        <div style={{padding:"24px 20px 100px",maxWidth:480,margin:"0 auto"}}>
          <div style={{...ty.label,color:C.t3,marginBottom:16}}>HOW RESIDENTS WILL SEE YOUR PAGE</div>

          {/* Header card */}
          <div style={{background:"linear-gradient(135deg,"+C.coral+"14,"+C.surface+")",border:"1px solid "+C.coral+"30",borderRadius:18,padding:"20px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
              <div style={{width:52,height:52,borderRadius:14,background:C.coral+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{form.emoji}</div>
              <div>
                <div style={{...ty.label,color:C.coral,fontSize:10,marginBottom:3}}>Pre-launch · {form.area}{form.opening?" · "+form.opening:""}</div>
                <div style={{fontFamily:serif,fontSize:17,fontWeight:700,color:C.t1}}>{form.label}</div>
              </div>
            </div>
            <div style={{...ty.sm,color:C.t2,fontStyle:"italic",lineHeight:1.65,marginBottom:12}}>"{form.blurb}"</div>
            <div style={{...ty.meta,color:C.t3}}>Help shape what opens — answer a few questions below</div>
          </div>

          {/* Questions preview */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
            {selQObjs.map(function(q,i){return(
              <div key={q.id} style={{background:C.surface,border:"1px solid "+C.line,borderRadius:14,padding:"14px 16px"}}>
                <div style={{...ty.sm,color:C.t1,fontWeight:500,marginBottom:10,lineHeight:1.5}}>{i+1}. {q.q}</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {q.opts.map(function(opt){return(
                    <div key={opt} style={{padding:"8px 12px",borderRadius:10,background:C.surface2,border:"1px solid "+C.line}}>
                      <span style={{...ty.meta,color:C.t2}}>{opt}</span>
                    </div>
                  );})}
                </div>
              </div>
            );})}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <button onClick={function(){
              onPublish(Object.assign({}, form, {
                id:"pl_"+Date.now(),
                questions: selQObjs,
                responseCount:0,
                status:"active",
                operator:(session&&session.name)||"Operator",
                operatorType:(session&&session.acctType)||"business",
              }));
            }}
              style={{width:"100%",padding:"15px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15}}>
              Publish pre-launch page →
            </button>
            <button onClick={function(){setStep("questions");}}
              style={{width:"100%",padding:"11px",background:"transparent",border:"1px solid "+C.line,borderRadius:14,cursor:"pointer",fontFamily:sans,fontSize:13,color:C.t3}}>
              Edit questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PUBLISHED ─────────────────────────────────────────────────
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",fontFamily:sans,textAlign:"center"}}>
      <div style={{width:72,height:72,borderRadius:20,background:C.green+"18",border:"1px solid "+C.green+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:24}}>✓</div>
      <h2 style={{...ty.h2,marginBottom:10}}>Page published</h2>
      <div style={{...ty.body,color:C.t3,maxWidth:300,lineHeight:1.65,marginBottom:32}}>Residents in {form.area} will start seeing your page in their feed. Responses will appear here as they come in.</div>
      <button onClick={onBack} style={{padding:"13px 28px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15}}>Back to pre-launch</button>
    </div>
  );
}


function BizDashboard({session,onLogout,onUpdateSession}){
  const acctType = (session&&session.acctType)||"business";
  const acctCfg = ACCOUNT_TYPES.find(a=>a.id===acctType)||ACCOUNT_TYPES[0];
  const [tier, setTier] = useState((session&&session.tier)||"free");
  const [bizTab, setBizTab] = useState("demand");
  const [showUpgrade, setUpg] = useState(false);
  const [upgradeTarget, setUT] = useState("builder");
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({reason:"", tier:"builder"});
  const sessionAreas = (session&&session.areas)||["SW4"];
  const sessionAreas2 = sessionAreas.length>0 ? sessionAreas : ["SW4"];
  const homeArea = sessionAreas[0]||"SW4";
  const thisTier = TIERS.find(t=>t.id===tier)||TIERS[0];
  
  function bump(targetTier){setUT(targetTier);setUpg(true);}

  // Report state
  // Firebase: activeAreas drives all Firestore queries
  // query area_concept_metrics where area_id in activeAreas, merge client-side
  var maxAreas = canSee(tier,"investor") ? 5 : canSee(tier,"builder") ? 3 : 1;
  const [reportMode, setReportMode] = useState("business");
  const [reportConcept, setReportConcept] = useState(null);
  const [reportConceptOpen, setReportConceptOpen] = useState(false);
  const [reportSector, setReportSector] = useState(null);
  const [activeAreas, setActiveAreas] = useState([sessionAreas2[0]]);
  // Primary area for single-concept metrics
  var activeArea = activeAreas.length > 0 ? activeAreas[0] : sessionAreas2[0];
  // Sectors for all selected areas combined
  var activeSectors = activeAreas.reduce(function(all, area) {
    return all.concat(SECTORS_MAP[area]||[]);
  }, []);
  const activeSector = reportSector && activeSectors.includes(reportSector) ? reportSector : null;
  var toggleArea = function(area) {
    setActiveAreas(function(prev) {
      var i2 = prev.indexOf(area);
      if(i2 !== -1) {
        if(prev.length === 1) return prev;
        return prev.filter(function(a){return a!==area;});
      }
      if(prev.length >= maxAreas) return prev;
      return prev.concat([area]);
    });
  };
  const [reportCatFilter, setReportCatFilter] = useState("all");
  const activeConcept = reportConcept || FEED_WITH_METRICS[0];
  const cc = CAT_CFG[activeConcept.cat] || CAT_CFG.business;
  const cf = conf(activeConcept.voters);
  const m = calcMetrics(activeConcept);
  const specM = getItemMetrics(activeConcept.id);
  const avgSpendFmt = fmtAvgSpend(m.avgSpend);
  // Spec-based metrics (shown when available)
  const specConf = specM ? getConfidenceDisplay(specM.confidence) : null;
  const specRevRange = specM ? fmtRevRange(specM.revLow, specM.revHigh) : null;
  const specScaledRange = specM ? fmtRevRange(specM.scaledLow, specM.scaledHigh) : null;
  const specAnnualRange = specM ? fmtRevRange(specM.annualLow, specM.annualHigh) : null;
  const localPct = Math.round((activeConcept.distrib[0]+activeConcept.distrib[1]));
  const highSpend = activeConcept.spendDist.slice(4).reduce(function(s,v){return s+v;},0);
  const lowSpend = activeConcept.spendDist.slice(0,2).reduce(function(s,v){return s+v;},0);
  const freqLabels = ["A few times a year","Once a month","2–3× a month","Weekly","Multiple times a week"];
  const intensity = specM ? specM.intensity : Math.round((activeConcept.avgCoins||5)*10/10);
  const ewuDisplay = specM ? specM.ewu : "—";
  const demandLbl = getDemandLabel(activeConcept.id);
  const demandColor = demandLbl==="high"?C.green:demandLbl==="medium"?C.amber:C.coral;
  const trendForArea = TREND_DATA[activeArea]||TREND_DATA["SW4"];
  const trendVals = trendForArea[activeConcept.id]||[Math.round(activeConcept.voters*0.6),Math.round(activeConcept.voters*0.8),activeConcept.voters];
  const heatData = (HEATMAP[activeConcept.id]||[]).sort(function(a,b){return b.score-a.score;});
  const insightText = generateInsightText(activeConcept, activeArea);
  const [faqOpen, setFaqOpen] = useState(null);
  const [whoOpen, setWhoOpen] = useState(false);
  const [spendOpen, setSpendOpen] = useState(false);
  const [freqOpen, setFreqOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [bizLegalDoc, setBizLegalDoc] = useState(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  const TABS = [
    {id:"demand", l:"Demand"}, {id:"prelaunch", l:"Pre-launch"}, {id:"reports", l:"Reports"}, {id:"faq", l:"FAQ"}, {id:"profile", l:"Profile"}
  ];
  // Pre-launch state
  const [plStep, setPlStep] = useState("list");
  const [plSelected, setPlSelected] = useState(new Set());
  const [activePL, setActivePL] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  // Firebase: prelaunch_pages where operator_uid === currentUser.uid
  // status: active | expired | renewed
  const [myPages, setMyPages] = useState(
    (session && session.tier === "investor") ? [
      {
        id:"demo_pl1", label:"Late-night ramen bar", emoji:"🍜",
        cat:"food", area:((session&&session.areas)||["SW4"])[0],
        opening:"Summer 2026",
        blurb:"Backed by local food investors who saw the demand. Authentic tonkotsu, open until 2am.",
        questions: PRELAUNCH_QUESTIONS["restaurant"]||[],
        responseCount:31, status:"active",
        operator:(session&&session.name)||"Operator",
        operatorType:(session&&session.acctType)||"business",
        created_at:"2025-11-01", expires_at:"2026-02-01",
      },
      {
        id:"demo_pl2", label:"Reformer pilates studio", emoji:"🧘",
        cat:"fitness", area:((session&&session.areas)||["SW4"])[0],
        opening:"Already open",
        blurb:"SW4's first dedicated reformer studio. 12 machines, small classes, all levels.",
        questions: PRELAUNCH_QUESTIONS["fitness"]||[],
        responseCount:89, status:"expired",
        operator:(session&&session.name)||"Operator",
        operatorType:(session&&session.acctType)||"business",
        created_at:"2025-06-01", expires_at:"2025-09-01",
      },
    ] : []
  );

  return (
    <div style={{background:C.bg, minHeight:"100vh", fontFamily:sans, color:C.t1}}>
      {bizLegalDoc&&<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg}}>{bizLegalDoc==="screen"?<LegalScreen onBack={function(){setBizLegalDoc(null);}}/>:<LegalPage doc={bizLegalDoc} onBack={function(){setBizLegalDoc(null);}}/>}</div>}
      {/* Upgrade modal */}
      {showUpgrade&&(
        <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(){setUpg(false);}}>
          <div style={{background:C.surface,borderRadius:"22px 22px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480}} onClick={function(e){e.stopPropagation();}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{...ty.h3,marginBottom:6}}>Unlock deeper insights for {activeArea}</div>
              <div style={{...ty.meta,color:C.t3,lineHeight:1.6}}>Go beyond surface demand and validate your decision with real data</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {[
                {id:"builder",name:"Builder",period:"30 days access",areas:"3 areas",desc:"Spend, frequency, travel patterns and full rankings",color:C.purple,highlight:false},
                {id:"investor",name:"Investor",period:"90 days access",areas:"5 areas",desc:"Everything in Builder plus revenue potential, demographics, demand gaps and The Brief",color:C.coral,highlight:true},
              ].map(function(opt){return(
                <div key={opt.id} style={{padding:"14px 16px",borderRadius:14,background:opt.highlight?C.coral+"0D":C.surface2,border:"1px solid "+(opt.highlight?C.coral+"40":C.line)}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                    <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:opt.highlight?opt.color:C.t1}}>{opt.name}</div>
                    {opt.highlight&&<span style={{...ty.meta,fontSize:9,background:opt.color,color:"#fff",padding:"2px 8px",borderRadius:20,fontWeight:700}}>POPULAR</span>}
                  </div>
                  <div style={{...ty.meta,color:C.t2,marginBottom:4}}>{opt.period} · {opt.areas}</div>
                  <div style={{...ty.meta,color:C.t3,lineHeight:1.5}}>{opt.desc}</div>
                </div>
              );})}
            </div>
            <button onClick={function(){setUpg(false); setShowUpgradeForm(true);}}
              style={{width:"100%",padding:"14px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15,marginBottom:10}}>
              Request access →
            </button>
            <button onClick={function(){setUpg(false);}}
              style={{width:"100%",padding:"10px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,fontSize:13,color:C.t3}}>
              Continue with free access
            </button>
          </div>
        </div>
      )}

      {/* Upgrade request form — pre-filled from session */}
      {showUpgradeForm&&(
        <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:500,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={function(){setShowUpgradeForm(false);}}>
          <div style={{background:C.surface,borderRadius:"22px 22px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}} onClick={function(e){e.stopPropagation();}}>
            <div style={{marginBottom:20}}>
              <div style={{...ty.h3,marginBottom:4}}>Request upgraded access</div>
              <div style={{...ty.meta,color:C.t3,lineHeight:1.6}}>Your details are pre-filled. Just confirm your chosen tier and add any context.</div>
            </div>
            {/* Pre-filled read-only summary */}
            <div style={{background:C.surface2,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  {l:"Name", v:(session&&session.name)||"—"},
                  {l:"Email", v:(session&&session.email)||"—"},
                  {l:"Business", v:(session&&session.biz)||"—"},
                  {l:"Type", v:(session&&session.acctType)||"—"},
                  {l:"Stage", v:(session&&session.stage)||"—"},
                  {l:"Areas", v:sessionAreas.join(", ")},
                ].map(function(f){return(
                  <div key={f.l} style={{display:"flex",gap:8}}>
                    <span style={{...ty.meta,color:C.t3,minWidth:60}}>{f.l}</span>
                    <span style={{...ty.meta,color:C.t1,fontWeight:500}}>{f.v}</span>
                  </div>
                );})}
              </div>
            </div>
            {/* Tier choice */}
            <div style={{marginBottom:14}}>
              <div style={{...ty.label,marginBottom:8}}>Access level</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {[
                  {id:"builder", label:"Builder", desc:"£149 — 30 days. 3 areas. Full validation data.", color:C.purple},
                  {id:"investor", label:"Investor", desc:"£399 — 90 days. 5 areas. Revenue, demographics, The Brief.", color:C.coral},
                ].map(function(opt){
                  var on = upgradeForm.tier===opt.id;
                  return(
                    <button key={opt.id} onClick={function(){setUpgradeForm(function(f){return Object.assign({},f,{tier:opt.id});});}}
                      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,
                        background:on?opt.color+"12":C.bg,
                        border:"1px solid "+(on?opt.color+"50":C.line),
                        cursor:"pointer",fontFamily:sans,textAlign:"left",width:"100%"}}>
                      <div style={{flex:1}}>
                        <div style={{...ty.sm,color:on?opt.color:C.t1,fontWeight:on?700:400,marginBottom:2}}>{opt.label}</div>
                        <div style={{...ty.meta,color:C.t3}}>{opt.desc}</div>
                      </div>
                      {on&&<div style={{width:8,height:8,borderRadius:"50%",background:opt.color,flexShrink:0}}/>}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Supplementary question */}
            <div style={{marginBottom:20}}>
              <div style={{...ty.label,marginBottom:6}}>Anything to add? <span style={{color:C.t3,fontWeight:400,textTransform:"none",fontSize:10,letterSpacing:0}}>(optional)</span></div>
              <textarea value={upgradeForm.reason}
                onChange={function(e){setUpgradeForm(function(f){return Object.assign({},f,{reason:e.target.value});});}}
                placeholder="e.g. Now evaluating a second site in SW9 and need revenue data to compare both."
                rows={3}
                style={{width:"100%",background:C.bg,border:"1px solid "+C.line,borderRadius:12,
                  padding:"11px 14px",color:C.t1,fontSize:13,fontFamily:sans,
                  outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
            </div>
            <button onClick={function(){setShowUpgradeForm(false); setUpg(false);}}
              style={{width:"100%",padding:"14px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15,marginBottom:10}}>
              Submit upgrade request →
            </button>
            <button onClick={function(){setShowUpgradeForm(false);}}
              style={{width:"100%",padding:"10px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,fontSize:13,color:C.t3}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg+"F0",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:40}}>
        <CravzLogo size={24}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{padding:"3px 10px",borderRadius:20,background:thisTier.color+"20",border:"1px solid "+thisTier.color+"40"}}>
            <span style={{...ty.meta,color:thisTier.color,fontWeight:700}}>{thisTier.name}</span>
          </div>
          <button onClick={()=>bump(tier==="free"?"builder":tier==="builder"?"investor":"investor")}
            style={{padding:"5px 12px",borderRadius:8,background:C.surface,border:"1px solid "+C.line,color:C.t2,cursor:"pointer",fontFamily:sans,fontSize:11}}>
            Upgrade
          </button>
          <button onClick={onLogout} style={{padding:"5px 12px",borderRadius:8,background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:11}}>Out</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{display:"flex",borderBottom:"1px solid "+C.line,background:C.bg,position:"sticky",top:53,zIndex:39}}>
        {TABS.map(t=>{
          const on=bizTab===t.id;
          return <button key={t.id} onClick={()=>setBizTab(t.id)}
            style={{flex:1,padding:"13px 8px",background:"transparent",border:"none",borderBottom:"2px solid "+(on?C.coral:"transparent"),
              cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:on?600:400,color:on?C.coral:C.t3}}>{t.l}</button>;
        })}
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"0 0 80px"}}>

      {/* DEMAND TAB */}
      {bizTab==="demand"&&(
        <div style={{padding:"20px 16px 60px"}}>
          <div style={{background:"radial-gradient(ellipse 70% 60% at 80% 20%, #0D2A18 0%, "+C.bg+" 70%)",border:"1px solid "+C.line,borderRadius:18,padding:"20px",marginBottom:20}}>
            <h2 style={{...ty.h2,marginBottom:6,fontSize:20}}>What your area cravz</h2>
            <div style={{...ty.body,marginBottom:14,fontSize:13}}>Verified demand from real residents. Every signal backed by spend, frequency, and intensity data.</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
              <div style={{background:C.green+"12",border:"1px solid "+C.green+"20",borderRadius:10,padding:"9px 12px"}}><div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.green}}>1,076</div><div style={{...ty.meta,color:C.green,marginTop:1}}>verified residents</div></div>
              <div style={{background:C.coral+"10",border:"1px solid "+C.coral+"20",borderRadius:10,padding:"9px 12px"}}><div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.coral}}>{FEED_WITH_METRICS.length}</div><div style={{...ty.meta,color:C.coral,marginTop:1}}>concepts tracked</div></div>
              <div style={{background:C.purple+"10",border:"1px solid "+C.purple+"20",borderRadius:10,padding:"9px 12px"}}><div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.purple}}>{sessionAreas.length}</div><div style={{...ty.meta,color:C.purple,marginTop:1}}>areas tracked</div></div>
            </div>
          </div>
          {FEED_WITH_METRICS.slice(0,canSee(tier,"builder")?FEED_WITH_METRICS.length:5).map((item,i)=>{
            const icc=CAT_CFG[item.cat];
            const cf2=conf(item.voters);
            return(
              <Card key={item.id} style={{marginBottom:10,padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{...ty.meta,color:i<3?C.amber:C.t3,fontWeight:700,width:18,textAlign:"center"}}>{i+1}</span>
                  <div style={{width:38,height:38,borderRadius:11,background:icc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.emoji}</div>
                  <div style={{flex:1}}>
                    <div style={{...ty.bodyMd,fontSize:13,marginBottom:3}}>{item.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{...ty.meta,color:cf2.color,fontWeight:600}}>{cf2.label}</span>
                      <span style={{...ty.meta,color:C.t3}}>· {item.voters} voices</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{...ty.meta,color:C.green,fontWeight:700}}>+{item.momentum}%</div>
                    {canSee(tier,"investor")&&<div style={{...ty.meta,color:C.t3,marginTop:2}}>{fmtMoney(item.monthlyRev)}/mo</div>}
                  </div>
                </div>
              </Card>
            );
          })}
          {!canSee(tier,"builder")&&(
            <div style={{padding:"14px",background:C.surface,border:"1px solid "+C.line,borderRadius:12,textAlign:"center"}}>
              <Lock size={14} color={C.t3} style={{marginBottom:6}}/>
              <div style={{...ty.sm,color:C.t2,marginBottom:10}}>Builder+ unlocks all concepts and full data</div>
              <button onClick={()=>bump("builder")} style={{padding:"9px 20px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade to Builder</button>
            </div>
          )}
        </div>
      )}

      {bizTab==="prelaunch"&&(
        <div style={{padding:"20px 16px 80px"}}>
          {/* CreatePrelaunchPage overlay */}
          {showCreate&&<div style={{position:"fixed",inset:0,zIndex:300,background:C.bg,overflowY:"auto"}}>
            <CreatePrelaunchPage session={session} onBack={function(){setShowCreate(false);}}
              onPublish={function(page){setMyPages(function(p){return [page].concat(p);});setShowCreate(false);}}/>
          </div>}

          <h2 style={{...ty.h2,marginBottom:4}}>Pre-launch pages</h2>
          <div style={{...ty.body,color:C.t3,marginBottom:20,lineHeight:1.6}}>Collect resident intent before you open. Only available on Investor.</div>

          {/* Gate: Investor only */}
          {!canSee(tier,"investor")&&(
            <div style={{background:C.surface,border:"1px solid "+C.line,borderRadius:14,padding:"24px 20px",textAlign:"center"}}>
              <Lock size={20} color={C.t3} style={{margin:"0 auto 12px"}}/>
              <div style={{...ty.bodyMd,marginBottom:6}}>Investor access required</div>
              <div style={{...ty.sm,color:C.t3,marginBottom:16,lineHeight:1.65}}>Create a pre-launch page to collect resident feedback before committing. One active page per access period.</div>
              <button onClick={function(){bump("investor");}} style={{padding:"9px 20px",borderRadius:10,background:C.coral,color:"#fff",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Unlock with Investor →</button>
            </div>
          )}

          {/* Investor view */}
          {canSee(tier,"investor")&&(
            <div>
              {/* Detail view */}
              {activePL ? (
                <div>
                  <button onClick={function(){setActivePL(null);}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:6,padding:0}}>← Back to pages</button>

                  {/* Page header */}
                  <div style={{background:"linear-gradient(135deg,"+C.coral+"14,"+C.surface+")",border:"1px solid "+C.coral+"30",borderRadius:16,padding:"18px 20px",marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                      <div>
                        <div style={{...ty.label,color:C.coral,marginBottom:4}}>Pre-launch · {activePL.area}</div>
                        <div style={{...ty.h3,marginBottom:6}}>{activePL.emoji} {activePL.label}</div>
                        <div style={{...ty.sm,color:C.t2,lineHeight:1.65,fontStyle:"italic"}}>"{activePL.blurb}"</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
                      <div style={{padding:"4px 10px",borderRadius:20,
                        background:activePL.status==="active"?C.green+"18":activePL.status==="expired"?C.coral+"18":C.surface2,
                        border:"1px solid "+(activePL.status==="active"?C.green+"40":activePL.status==="expired"?C.coral+"40":C.line)}}>
                        <span style={{...ty.meta,color:activePL.status==="active"?C.green:activePL.status==="expired"?C.coral:C.t3,fontWeight:600,textTransform:"capitalize"}}>
                          {activePL.status==="active"?"● Live":activePL.status==="expired"?"Expired":"Renewed"}
                        </span>
                      </div>
                      <div style={{padding:"4px 10px",borderRadius:20,background:C.surface2,border:"1px solid "+C.line}}>
                        <span style={{...ty.meta,color:C.t3,fontWeight:600}}>{activePL.responseCount} resident responses</span>
                      </div>
                      {activePL.opening&&<div style={{padding:"4px 10px",borderRadius:20,background:C.surface2,border:"1px solid "+C.line}}>
                        <span style={{...ty.meta,color:C.t3}}>{activePL.opening}</span>
                      </div>}
                    </div>
                  </div>

                  {/* Expired CTA */}
                  {activePL.status==="expired"&&(
                    <div style={{background:C.surface,border:"1px solid "+C.amber+"40",borderRadius:14,padding:"16px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
                      <div style={{flex:1}}>
                        <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:3}}>This page has expired</div>
                        <div style={{...ty.meta,color:C.t3,lineHeight:1.5}}>Renew your Investor access to reactivate it and continue collecting responses.</div>
                      </div>
                      <button onClick={function(){setShowUpgradeForm(true);}} style={{padding:"9px 16px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12,flexShrink:0}}>Renew access</button>
                    </div>
                  )}

                  {/* Live / historical responses */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                    <div style={{...ty.h3}}>{activePL.status==="active"?"Live responses":"Response summary"}</div>
                    {activePL.status==="active"&&(
                      <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:C.green+"18",border:"1px solid "+C.green+"30"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:C.green}}/>
                        <span style={{...ty.meta,color:C.green,fontWeight:700,fontSize:10}}>LIVE</span>
                      </div>
                    )}
                  </div>
                  <ClosedSurveyCard survey={activePL} allQs={Object.values(PRELAUNCH_QUESTIONS).flat()}/>
                </div>

              ) : (
                <div>
                  {/* Create button — only when no active page */}
                  {(function(){
                    var hasActive = myPages.some(function(p){return p.status==="active";});
                    return hasActive ? (
                      <div style={{...ty.meta,color:C.t3,marginBottom:16,padding:"10px 14px",background:C.surface,border:"1px solid "+C.line,borderRadius:10,lineHeight:1.5}}>
                        You have one active pre-launch page. You can create a new one when it expires or you renew your access.
                      </div>
                    ) : (
                      <button onClick={function(){setShowCreate(true);}}
                        style={{width:"100%",padding:"13px",background:C.coral,color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontFamily:sans,fontWeight:600,fontSize:14,marginBottom:16}}>
                        + Create pre-launch page
                      </button>
                    );
                  })()}

                  {/* Page list — own pages only */}
                  {myPages.length===0&&(
                    <div style={{padding:"32px 20px",textAlign:"center",background:C.surface,border:"1px dashed "+C.line,borderRadius:14}}>
                      <div style={{fontSize:32,marginBottom:10}}>📋</div>
                      <div style={{...ty.bodyMd,marginBottom:6}}>No pre-launch pages yet</div>
                      <div style={{...ty.sm,color:C.t3,lineHeight:1.6}}>Create a page to start collecting resident intent before you open.</div>
                    </div>
                  )}
                  {myPages.map(function(page){
                    var isExpired = page.status==="expired";
                    return(
                      <button key={page.id} onClick={function(){setActivePL(page);}}
                        style={{width:"100%",background:C.surface,border:"1px solid "+(isExpired?C.coral+"30":C.line),borderRadius:14,padding:"16px 18px",cursor:"pointer",fontFamily:sans,textAlign:"left",marginBottom:10,display:"flex",alignItems:"center",gap:14,opacity:isExpired?0.8:1}}>
                        <div style={{width:44,height:44,borderRadius:12,background:isExpired?C.coral+"12":C.coral+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{page.emoji}</div>
                        <div style={{flex:1}}>
                          <div style={{...ty.bodyMd,fontSize:14,marginBottom:3}}>{page.label}</div>
                          <div style={{...ty.meta,color:C.t3}}>{page.area} · {page.responseCount} responses</div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                          <span style={{...ty.meta,fontSize:10,padding:"2px 8px",borderRadius:20,
                            background:isExpired?C.coral+"18":C.green+"18",
                            color:isExpired?C.coral:C.green,fontWeight:600}}>
                            {isExpired?"Expired":"Live"}
                          </span>
                          <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)"}}/>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAQ TAB */}

      {/* REPORTS TAB */}
      {bizTab==="reports"&&(
        <div style={{padding:"16px 16px 80px"}}>

            {/* ── AREA SELECTOR — shared between By Business and By Area ── */}
            {/* Firebase: activeAreas[] is passed to all Firestore queries   */}
            {/* query: area_concept_metrics where area_id in activeAreas      */}
            <div style={{marginBottom:16,padding:"12px 14px",background:C.surface,border:"1px solid "+C.line,borderRadius:14}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{...ty.label,fontSize:9,color:C.t3}}>{activeAreas.length>1?"AREAS — AGGREGATED":"AREA"}</div>
                {sessionAreas2.length>1&&<div style={{...ty.meta,color:C.t3,fontSize:9}}>{activeAreas.length}/{maxAreas} selected</div>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:activeAreas.length>1?8:0}}>
                {sessionAreas2.map(function(area){
                  var on = activeAreas.indexOf(area)!==-1;
                  var atLimit = !on && activeAreas.length>=maxAreas;
                  return(
                    <button key={area} onClick={function(){toggleArea(area);}}
                      disabled={atLimit}
                      style={{padding:"6px 14px",borderRadius:20,cursor:atLimit?"default":"pointer",fontFamily:sans,fontSize:13,fontWeight:on?700:400,
                        background:on?C.coral+"18":"transparent",
                        border:"1px solid "+(on?C.coral+"60":C.line),
                        color:on?C.coral:C.t3,
                        opacity:atLimit?0.4:1,transition:"all .15s"}}>
                      {area}
                    </button>
                  );
                })}
                {sessionAreas2.length===1&&canSee(tier,"builder")&&(
                  <div style={{...ty.meta,color:C.t3,fontSize:11,padding:"6px 4px"}}>Add more areas in profile</div>
                )}
                {!canSee(tier,"builder")&&(
                  <button onClick={function(){bump("builder");}}
                    style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:sans,fontSize:11,
                      background:"transparent",border:"1px dashed "+C.line,color:C.t3}}>
                    + unlock more areas
                  </button>
                )}
              </div>
              {activeAreas.length>1&&(
                <div style={{...ty.meta,color:C.t3,fontSize:10,lineHeight:1.5}}>
                  Voices summed · momentum averaged across {activeAreas.join(", ")}
                </div>
              )}
            </div>

            {/* Sector / district selector — Investor only, shown when single area active */}
            {canSee(tier,"investor")&&activeSectors.length>0&&(
              <div style={{marginBottom:10,padding:"10px 14px",background:C.surface,border:"1px solid "+C.line,borderRadius:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{...ty.label,fontSize:9,color:C.t3}}>SECTORS</div>
                  <span style={{...ty.meta,fontSize:9,color:C.coral,background:C.coral+"15",padding:"1px 7px",borderRadius:20}}>Investor</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  <button onClick={function(){setReportSector(null);}}
                    style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:!activeSector?700:400,
                      background:!activeSector?C.coral+"18":"transparent",
                      border:"1px solid "+(!activeSector?C.coral+"60":C.line),
                      color:!activeSector?C.coral:C.t3,transition:"all .15s"}}>
                    {activeAreas.length>1?"All sectors":"All of "+activeArea}
                  </button>
                  {activeSectors.map(function(s){
                    var on = activeSector===s;
                    return(
                      <button key={s} onClick={function(){setReportSector(s);}}
                        style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:on?700:400,
                          background:on?C.coral+"18":"transparent",
                          border:"1px solid "+(on?C.coral+"60":C.line),
                          color:on?C.coral:C.t3,transition:"all .15s"}}>
                        {s}
                      </button>
                    );
                  })}
                </div>
                {!activeSector&&<div style={{...ty.meta,color:C.t3,fontSize:10,marginTop:7,lineHeight:1.5}}>Select a sector for granular demand signals</div>}
              </div>
            )}

            {/* MODE TOGGLE */}
            <div style={{display:"flex",gap:0,marginBottom:20,background:C.surface2,borderRadius:10,padding:3,border:"1px solid "+C.line}}>
              {[{id:"business",l:"Detailed report"},{id:"area",l:"Ranking"}].map(function(m){return(
                <button key={m.id} onClick={function(){setReportMode(m.id);}}
                  style={{flex:1,padding:"8px",borderRadius:8,background:reportMode===m.id?C.surface:"transparent",
                    border:"1px solid "+(reportMode===m.id?C.line:"transparent"),
                    color:reportMode===m.id?C.t1:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:reportMode===m.id?600:400}}>
                  {m.l}
                </button>
              );})}
            </div>

            {reportMode==="area"&&(function(){
              // Firebase: query area_concept_metrics for each area in activeAreas
              // sum voices, average momentum/ewu across areas client-side
              var selectedAreas = activeAreas;
              var areaLabel = selectedAreas.length===1 ? selectedAreas[0] : selectedAreas.join(" + ");
              var allItems = FEED_WITH_METRICS.slice()
                .filter(function(it){
                  return reportCatFilter==="all" || it.cat===reportCatFilter;
                })
                .map(function(it){
                  return getAggregatedMetrics(it, selectedAreas, activeSector);
                }).sort(function(a,b){return b.voters-a.voters;});
              var totalVoters = allItems.reduce(function(s,i){return s+i.voters;},0);
              var totalMonthlyRev = FEED_WITH_METRICS.reduce(function(s,i){return s+(i.monthlyRev||0);},0)*selectedAreas.length;
              return (
                <div>
                  {/* Category filter */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {[{id:"all",l:"All"},{id:"food",l:"Food"},{id:"fitness",l:"Fitness"},{id:"kids",l:"Kids"},{id:"health",l:"Health"},{id:"retail",l:"Retail"},{id:"entertain",l:"Entertain"},{id:"services",l:"Services"}].map(function(f){
                      return <Chip key={f.id} label={f.l} active={reportCatFilter===f.id} onClick={function(){setReportCatFilter(f.id);}} sm/>;
                    })}
                  </div>

                  {/* Summary stats */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                    {[
                      {l:"Total voices",v:totalVoters.toLocaleString(),c:C.green},
                      {l:"Areas",v:selectedAreas.length,c:C.t1},
                      {l:"Est. monthly rev",v:canSee(tier,"investor")?fmtMoney(totalMonthlyRev):"Investor",c:canSee(tier,"investor")?C.green:C.t3},
                    ].map(function(s){return(
                      <div key={s.l} style={{textAlign:"center",padding:"10px 8px",background:C.surface2,borderRadius:12}}>
                        <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                        <div style={{...ty.meta,color:C.t3,fontSize:9,marginTop:3}}>{s.l.toUpperCase()}</div>
                      </div>
                    );})}
                  </div>

                  {/* Ranked list */}
                  <Card style={{marginBottom:16,padding:0,overflow:"hidden"}}>
                    <div style={{padding:"14px 16px 10px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
                      <SLabel noMargin>{"Demand ranking — "+areaLabel+(activeSector?" · "+activeSector:"")+(reportCatFilter!=="all"?" · "+reportCatFilter:"")}</SLabel>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {selectedAreas.length>1&&<span style={{...ty.meta,fontSize:10,color:C.coral,background:C.coral+"15",padding:"2px 8px",borderRadius:20}}>Aggregated</span>}
                        {(activeSector||reportCatFilter!=="all")&&<button onClick={function(){setReportSector(null);setReportCatFilter("all");}} style={{...ty.meta,fontSize:10,color:C.t3,background:"transparent",border:"1px solid "+C.line,padding:"1px 8px",borderRadius:20,cursor:"pointer",fontFamily:sans}}>Clear filters</button>}
                      </div>
                    </div>
                    {allItems.map(function(it,i){
                      var cc2 = CAT_CFG[it.cat]||{color:C.coral,bg:C.surface2};
                      var dl = getDemandLabel(it.id);
                      var dlColor = dl==="high"?C.green:dl==="medium"?C.amber:C.coral;
                      var specM2 = getItemMetrics(it.id);
                      return(
                        <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderTop:i>0?"1px solid "+C.line:"none"}}>
                          <span style={{...ty.meta,color:i<3?C.amber:C.t3,fontWeight:700,width:16,textAlign:"center",flexShrink:0}}>{i+1}</span>
                          <div style={{width:34,height:34,borderRadius:10,background:cc2.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{it.emoji}</div>
                          <div style={{flex:1}}>
                            <div style={{...ty.sm,fontWeight:600,marginBottom:2}}>{it.label}</div>
                            <span style={{...ty.meta,color:dlColor,fontWeight:600,fontSize:10,textTransform:"capitalize"}}>{dl+" · "+it.voters.toLocaleString()+" voices"}</span>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{...ty.meta,color:it.momentum>=0?C.green:C.coral,fontWeight:700}}>{(it.momentum>=0?"+":"")+it.momentum+"%"}</div>
                            {canSee(tier,"investor")&&specM2&&<div style={{...ty.meta,color:C.t3,fontSize:10}}>{fmtMoney(specM2.revLow||0)+"/mo"}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </Card>

                  {/* Per-area top concept breakdown */}
                  {selectedAreas.length>1&&(
                    <div style={{marginBottom:16}}>
                      <div style={{...ty.label,marginBottom:10}}>Top concept per area</div>
                      {selectedAreas.map(function(area){
                        var topForArea = FEED_WITH_METRICS.slice().map(function(it){
                          return Object.assign({},it,getAreaMetrics(it,area));
                        }).sort(function(a,b){return b.voters-a.voters;})[0];
                        if(!topForArea) return null;
                        var cc3 = CAT_CFG[topForArea.cat]||{color:C.coral,bg:C.surface2};
                        return(
                          <div key={area} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.surface,border:"1px solid "+C.line,borderRadius:12,marginBottom:7}}>
                            <div style={{...ty.meta,color:C.t3,fontWeight:700,minWidth:36,flexShrink:0}}>{area}</div>
                            <div style={{width:30,height:30,borderRadius:8,background:cc3.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{topForArea.emoji}</div>
                            <div style={{flex:1}}>
                              <div style={{...ty.sm,fontWeight:600}}>{topForArea.label}</div>
                              <div style={{...ty.meta,color:C.t3}}>{topForArea.voters+" voices"}</div>
                            </div>
                            <div style={{...ty.meta,color:topForArea.momentum>=0?C.green:C.coral,fontWeight:700}}>{(topForArea.momentum>=0?"+":"")+topForArea.momentum+"%"}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {reportMode==="business"&&(function(){
              // Firebase: query area_concept_metrics for activeAreas[0] for detail view
              // aggConcept aggregates headline metrics across all activeAreas
              var aggConcept = getAggregatedMetrics(activeConcept, activeAreas, activeSector);
              var aggLabel = activeAreas.length>1 ? activeAreas.join(" + ") : activeArea;
              return (<>
            <div style={{marginBottom:16}}>
                <div style={{...ty.label,marginBottom:5}}>Concept</div>
                <button onClick={function(){setReportConceptOpen(function(o){return !o;});}}
                  style={{width:"100%",background:C.surface,border:"1px solid "+(reportConceptOpen?C.coral:C.line),borderRadius:10,padding:"9px 12px",cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <span style={{fontSize:16}}>{activeConcept.emoji}</span>
                  <span style={{...ty.bodyMd,fontSize:13,flex:1,color:C.t1}}>{activeConcept.label}</span>
                  <ChevronDown size={14} color={C.t3} style={{transform:reportConceptOpen?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
                </button>
                {reportConceptOpen&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,background:C.surface,border:"1px solid "+C.line,borderRadius:10,marginTop:4,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
                    {FEED_WITH_METRICS.map(function(item){return(
                      <button key={item.id} onClick={function(){setReportConcept(item);setReportConceptOpen(false);}}
                        style={{width:"100%",padding:"9px 12px",background:activeConcept.id===item.id?cc.color+"18":"transparent",border:"none",cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:8,textAlign:"left",borderBottom:"1px solid "+C.line}}>
                        <span style={{fontSize:15}}>{item.emoji}</span>
                        <span style={{...ty.bodyMd,fontSize:12,flex:1,color:activeConcept.id===item.id?cc.color:C.t2}}>{item.label}</span>
                        <span style={{...ty.meta,color:C.t3,fontSize:10}}>{item.voters} voices</span>
                      </button>
                    );})}
                  </div>
                )}
              </div>

            {/* Opportunity Score */}
            <div style={{background:"radial-gradient(ellipse 80% 60% at 20% 30%, "+cc.color+"18 0%, "+C.bg+" 70%)",border:"1px solid "+cc.color+"30",borderRadius:18,padding:"20px",marginBottom:16}}>
              <div style={{...ty.label,color:cc.color,marginBottom:10}}>{activeConcept.emoji} {activeConcept.label} — {activeArea}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {[{l:"Demand",v:demandLbl.charAt(0).toUpperCase()+demandLbl.slice(1),c:demandColor},{l:"Verified voters",v:aggConcept.voters,c:C.t1},{l:"MoM growth",v:(activeConcept.momentum>=0?"+":"")+activeConcept.momentum+"%",c:activeConcept.momentum>=0?C.green:C.coral}].map(function(s){return(
                  <div key={s.l} style={{textAlign:"center",padding:"10px 8px",background:C.surface2+"CC",borderRadius:10}}>
                    <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                    <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                );})}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingTop:12,borderTop:"1px solid "+cc.color+"20"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>INTENSITY</div>
                  <div style={{fontFamily:serif,fontSize:26,fontWeight:700,color:cc.color,lineHeight:1}}>{intensity}<span style={{fontSize:13,color:C.t3}}>/10</span></div>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginTop:2}}>coin share × 10</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>EWU</div>
                  <div style={{fontFamily:serif,fontSize:26,fontWeight:700,color:C.purple,lineHeight:1}}>{ewuDisplay}</div>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginTop:2}}>eff. weekly users</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>CONFIDENCE</div>
                  <div style={{fontFamily:serif,fontSize:14,fontWeight:700,color:specConf?specConf.color:C.t3,lineHeight:1,marginTop:3}}>{specConf?specConf.label:cf.label}</div>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginTop:2}}>sample size</div>
                </div>
              </div>
            </div>

            {/* WHO WANTS IT — Builder+ */}
            {(function(){
              var FEED_TO_DEMO = {
                "s75":"b1","s1":"b2","s81":"b3","s94":"a2",
                "s29":"b4","s66":"p1","s89":"a1","s23":"p2",
              };
              var dd = DEMO_DIST[FEED_TO_DEMO[activeConcept.id]] || DEMO_DIST[activeConcept.id];
              var primaryAge = dd ? dd.age.slice().sort(function(a,b){return b.p-a.p;})[0] : {l:activeConcept.demo.age, p:null};
              var primaryHH  = dd ? dd.hh.slice().sort(function(a,b){return b.p-a.p;})[0] : {l:activeConcept.demo.hh, p:null};
              return(
                <Card style={{marginBottom:12,overflow:"hidden",position:"relative"}}>
                  {!canSee(tier,"builder")&&(
                    <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(17,17,16,0.88)",borderRadius:12}}>
                      <Lock size={18} color={C.t3} style={{marginBottom:8}}/>
                      <div style={{...ty.sm,color:C.t2,marginBottom:12,textAlign:"center"}}>Demographic breakdown — Builder+</div>
                      <button onClick={function(){bump("builder");}} style={{padding:"8px 18px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade →</button>
                    </div>
                  )}
                  <div style={{filter:canSee(tier,"builder")?"none":"blur(4px)",pointerEvents:canSee(tier,"builder")?"auto":"none"}}>
                    <button onClick={function(){setWhoOpen(function(o){return !o;});}}
                      style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:sans}}>
                      <SLabel noMargin>Who wants it</SLabel>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{...ty.sm,color:C.t1,fontWeight:600}}>{primaryAge.l}{primaryHH?" · "+primaryHH.l:""}</span>
                        <ChevronDown size={13} color={C.t3} style={{transform:whoOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                      </div>
                    </button>
                    {whoOpen&&dd&&(
                      <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:14}}>
                        <div>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:8}}>AGE</div>
                          {dd.age.map(function(item){return(
                            <div key={item.l} style={{marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                <span style={{...ty.meta,color:C.t2,fontSize:11}}>{item.l}</span>
                                <span style={{...ty.meta,color:cc.color,fontWeight:700,fontSize:11}}>{item.p}%</span>
                              </div>
                              <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:item.p+"%",background:cc.color,borderRadius:2}}/>
                              </div>
                            </div>
                          );})}
                        </div>
                        <div style={{paddingTop:10,borderTop:"1px solid "+C.line}}>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:8}}>HOUSEHOLD</div>
                          {dd.hh.map(function(item){return(
                            <div key={item.l} style={{marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                <span style={{...ty.meta,color:C.t2,fontSize:11}}>{item.l}</span>
                                <span style={{...ty.meta,color:C.purple,fontWeight:700,fontSize:11}}>{item.p}%</span>
                              </div>
                              <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:item.p+"%",background:C.purple,borderRadius:2}}/>
                              </div>
                            </div>
                          );})}
                        </div>
                        <div style={{paddingTop:10,borderTop:"1px solid "+C.line}}>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:8}}>GENDER</div>
                          {dd.gender.map(function(item){return(
                            <div key={item.l} style={{marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                <span style={{...ty.meta,color:C.t2,fontSize:11}}>{item.l}</span>
                                <span style={{...ty.meta,color:C.amber,fontWeight:700,fontSize:11}}>{item.p}%</span>
                              </div>
                              <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:item.p+"%",background:C.amber,borderRadius:2}}/>
                              </div>
                            </div>
                          );})}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* SPENDING — Builder+ */}
            {(function(){
              var topSpendIdx = activeConcept.spendDist.indexOf(Math.max.apply(null, activeConcept.spendDist));
              var spendBands = ["£0–5","£5–10","£10–20","£20–35","£35–50","£50–100","£100–150","£150+"];
              var topSpendBand = spendBands[topSpendIdx] || "£10–20";
              return(
                <Card style={{marginBottom:12,overflow:"hidden",position:"relative"}}>
                  {!canSee(tier,"builder")&&(
                    <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(17,17,16,0.88)",borderRadius:12}}>
                      <Lock size={18} color={C.t3} style={{marginBottom:8}}/>
                      <div style={{...ty.sm,color:C.t2,marginBottom:12,textAlign:"center"}}>Spend data — Builder+</div>
                      <button onClick={function(){bump("builder");}} style={{padding:"8px 18px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade →</button>
                    </div>
                  )}
                  <div style={{filter:canSee(tier,"builder")?"none":"blur(4px)",pointerEvents:canSee(tier,"builder")?"auto":"none"}}>
                    <button onClick={function(){setSpendOpen(function(o){return !o;});}}
                      style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:sans}}>
                      <SLabel noMargin>Spending signal</SLabel>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{...ty.sm,color:C.t1,fontWeight:600}}>{avgSpendFmt} avg · {topSpendBand} most common</span>
                        <ChevronDown size={13} color={C.t3} style={{transform:spendOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                      </div>
                    </button>
                    {spendOpen&&(
                      <div style={{marginTop:14}}>
                        {spendBands.map(function(band,i){
                          var pct = activeConcept.spendDist[i]||0;
                          if(pct===0) return null;
                          return(
                            <div key={band} style={{marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                <span style={{...ty.meta,color:C.t2,fontSize:11}}>{band}</span>
                                <span style={{...ty.meta,color:C.green,fontWeight:700,fontSize:11}}>{pct}%</span>
                              </div>
                              <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:pct+"%",background:C.green,borderRadius:2}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* FREQUENCY — Builder+ */}
            {(function(){
              var freqBands = ["A few times a year","Once a month","2–3× a month","Weekly","Multiple times a week"];
              var topFreqIdx = activeConcept.freqDist.indexOf(Math.max.apply(null, activeConcept.freqDist));
              var topFreqBand = freqBands[topFreqIdx] || "Monthly";
              return(
                <Card style={{marginBottom:16,overflow:"hidden",position:"relative"}}>
                  {!canSee(tier,"builder")&&(
                    <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(17,17,16,0.88)",borderRadius:12}}>
                      <Lock size={18} color={C.t3} style={{marginBottom:8}}/>
                      <div style={{...ty.sm,color:C.t2,marginBottom:12,textAlign:"center"}}>Frequency data — Builder+</div>
                      <button onClick={function(){bump("builder");}} style={{padding:"8px 18px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade →</button>
                    </div>
                  )}
                  <div style={{filter:canSee(tier,"builder")?"none":"blur(4px)",pointerEvents:canSee(tier,"builder")?"auto":"none"}}>
                    <button onClick={function(){setFreqOpen(function(o){return !o;});}}
                      style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:sans}}>
                      <SLabel noMargin>Visit frequency</SLabel>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{...ty.sm,color:C.t1,fontWeight:600}}>{topFreqBand}</span>
                        <ChevronDown size={13} color={C.t3} style={{transform:freqOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                      </div>
                    </button>
                    {freqOpen&&(
                      <div style={{marginTop:14}}>
                        {freqBands.map(function(band,i){
                          var pct = activeConcept.freqDist[i]||0;
                          if(pct===0) return null;
                          return(
                            <div key={band} style={{marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                                <span style={{...ty.meta,color:C.t2,fontSize:11}}>{band}</span>
                                <span style={{...ty.meta,color:C.amber,fontWeight:700,fontSize:11}}>{pct}%</span>
                              </div>
                              <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                                <div style={{height:"100%",width:pct+"%",background:C.amber,borderRadius:2}}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Revenue - pro+ */}
            {canSee(tier,"investor")&&(
              <Card style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <SLabel noMargin>Revenue estimate</SLabel>
                  <span style={{...ty.meta,fontSize:9,padding:"2px 7px",borderRadius:20,background:C.amber+"22",color:C.amber,fontWeight:700}}>PRO+</span>
                </div>
                {specM&&specM.voices>=50 ? (
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      {[
                        {l:"Monthly range",    v:specRevRange,    sub:"adjusted for confidence"},
                        {l:"Annual range",     v:specAnnualRange, sub:"from verified demand"},
                      ].map(function(s){return(
                        <div key={s.l} style={{padding:"12px 10px",background:C.green+"0A",border:"1px solid "+C.green+"20",borderRadius:12,textAlign:"center"}}>
                          <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                          <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:C.green,lineHeight:1,marginBottom:3}}>{s.v||"—"}</div>
                          <div style={{...ty.meta,color:C.t3,fontSize:10}}>{s.sub}</div>
                        </div>
                      );})}
                    </div>
                    {specScaledRange&&(
                      <div style={{padding:"10px 12px",background:C.purple+"0A",border:"1px solid "+C.purple+"20",borderRadius:10,marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div>
                            <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:2}}>SCALED TO AREA DEMAND</div>
                            <div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:C.purple}}>{specScaledRange}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:2}}>CONFIDENCE</div>
                            <div style={{...ty.meta,color:specConf.color,fontWeight:700}}>{specConf.label}</div>
                          </div>
                        </div>
                        <div style={{...ty.meta,color:C.t3,fontSize:10,marginTop:6,lineHeight:1.5}}>Scaled using area population and category capture rates. Shown at Medium+ confidence only.</div>
                      </div>
                    )}
                    <div style={{...ty.meta,color:C.t3,fontSize:10,lineHeight:1.5}}>EWU: {specM.ewu} · Avg spend: £{specM.avgSpend} · {specM.voices} voices</div>
                  </div>
                ) : (
                  <div style={{...ty.meta,color:C.t3,textAlign:"center",padding:"12px 0"}}>Revenue estimates shown at 50+ voices</div>
                )}
              </Card>
            )}

            {/* Concept attributes — Investor only */}
            {canSee(tier,"investor")&&(function(){
              var tags = getConceptTags(activeConcept, 10);
              if(tags.length === 0) return null;
              var sq = SQ[activeConcept.subcat];
              var sqLabel = sq ? sq.q : "What matters most?";
              return(
                <Card style={{marginBottom:12,overflow:"hidden"}}>
                  <button onClick={function(){setTagsOpen(function(o){return !o;});}}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:sans}}>
                    <div>
                      <SLabel noMargin>Concept attributes</SLabel>
                      <div style={{...ty.meta,color:C.t3,marginTop:3}}>{sqLabel}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{...ty.meta,fontSize:9,padding:"2px 7px",borderRadius:20,background:C.coral+"22",color:C.coral,fontWeight:700}}>INVESTOR</span>
                      <ChevronDown size={13} color={C.t3} style={{transform:tagsOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                    </div>
                  </button>
                  {tagsOpen&&(
                    <div style={{marginTop:14}}>
                      <div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:10}}>% of voters who selected this attribute</div>
                      {tags.map(function(item){return(
                        <div key={item.tag} style={{marginBottom:8}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{...ty.meta,color:C.t2,fontSize:11}}>{item.tag}</span>
                            <span style={{...ty.meta,color:cc.color,fontWeight:700,fontSize:11}}>{item.pct}%</span>
                          </div>
                          <div style={{height:4,background:C.line,borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:item.pct+"%",background:cc.color,borderRadius:2}}/>
                          </div>
                        </div>
                      );})}
                      <div style={{...ty.meta,color:C.t3,fontSize:10,marginTop:10,lineHeight:1.5}}>Based on attribute selections made when voters placed their coins. Indicative — updated as more voices are added.</div>
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* The Brief — pro+ */}
            {canSee(tier,"investor")&&(function(){
              var briefComments = getBriefComments(activeConcept.id);
              var brandCounts = {};
              var locCounts = {};
              var catBrandsForCard = BRIEF_BRANDS_BY_CAT[activeConcept.cat] || BRIEF_BRANDS;
              briefComments.forEach(function(c){
                var txt = c.text.toLowerCase();
                catBrandsForCard.forEach(function(b){
                  if(txt.indexOf(b.toLowerCase())!==-1){
                    brandCounts[b]=(brandCounts[b]||0)+1;
                  }
                });
                BRIEF_LOCATIONS.forEach(function(l){
                  if(txt.indexOf(l.toLowerCase())!==-1){
                    locCounts[l]=(locCounts[l]||0)+1;
                  }
                });
              });
              var topBrands=Object.keys(brandCounts).map(function(k){return [k,brandCounts[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
              var topLocs=Object.keys(locCounts).map(function(k){return [k,locCounts[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,4);
              var topVoices=briefComments.slice().sort(function(a,b){return b.upvotes-a.upvotes;}).slice(0,5);
              if(!topBrands.length&&!topLocs.length&&!topVoices.length) return null;
              return(
                <Card style={{marginBottom:16}}>
                  <button onClick={function(){setBriefOpen(function(o){return !o;});}}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:sans,marginBottom:briefOpen?12:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <SLabel noMargin>The Brief — resident intent</SLabel>
                      <span style={{...ty.meta,fontSize:9,padding:"2px 7px",borderRadius:20,background:C.amber+"22",color:C.amber,fontWeight:700}}>PRO+</span>
                    </div>
                    <ChevronDown size={13} color={C.t3} style={{transform:briefOpen?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
                  </button>
                  {briefOpen&&(
                    <div>
                      <div style={{...ty.meta,color:C.t3,marginBottom:12,lineHeight:1.5,fontSize:10}}>Signals from resident free-text. Reviewed by Cravz before publishing.</div>
                      {topBrands.length>0&&(
                        <div style={{marginBottom:14}}>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Brands mentioned</div>
                          {topBrands.map(function(b){return(
                            <div key={b[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                              <span style={{...ty.sm,color:C.t1,flex:1}}>{b[0]}</span>
                              <span style={{...ty.meta,color:C.purple,fontWeight:700}}>{b[1]} mention{b[1]!==1?"s":""}</span>
                            </div>
                          );})}
                        </div>
                      )}
                      {topLocs.length>0&&(
                        <div style={{marginBottom:14}}>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Preferred locations</div>
                          {topLocs.map(function(l){return(
                            <div key={l[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                              <MapPin size={11} color={C.amber}/>
                              <span style={{...ty.sm,color:C.t1,flex:1}}>{l[0]}</span>
                              <span style={{...ty.meta,color:C.amber,fontWeight:700}}>{l[1]} mention{l[1]!==1?"s":""}</span>
                            </div>
                          );})}
                        </div>
                      )}
                      {topVoices.length>0&&(
                        <div>
                          <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Top resident voices</div>
                          {topVoices.map(function(c){return(
                            <div key={c.id} style={{padding:"10px 12px",background:C.surface2,borderRadius:10,marginBottom:6}}>
                              <div style={{...ty.sm,color:C.t1,lineHeight:1.55,marginBottom:4,fontStyle:"italic"}}>"{c.text}"</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{...ty.meta,color:C.t3,fontSize:10}}>{c.ts}</span>
                                <span style={{...ty.meta,color:C.green,fontWeight:600,fontSize:10}}>👍 {c.upvotes}</span>
                              </div>
                            </div>
                          );})}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Insight */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:8}}>
              <span style={{...ty.meta,color:C.t3,fontSize:10}}>Based on aggregated user preferences. Directional insights.</span>
            </div>
            <div style={{background:cc.color+"0A",border:"1px solid "+cc.color+"25",borderRadius:16,padding:"18px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:cc.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✦</div>
                <div style={{...ty.label,color:cc.color}}>Cravz insight</div>
              </div>
              <div style={{...ty.body,color:C.t1,lineHeight:1.7,fontSize:13}}>{insightText}</div>
            </div>
            </>);})()}

          </div>
      )}
      {/* FAQ TAB */}
      {bizTab==="faq"&&(
        <div style={{padding:"20px 16px 80px"}}>
          <h2 style={{...ty.h2,marginBottom:4}}>Understanding the data</h2>
          <div style={{...ty.body,color:C.t3,marginBottom:24}}>How to read and use what Cravz shows you.</div>

          {FAQ_SECTIONS.map(function(section, si){
            return(
              <div key={si} style={{marginBottom:28}}>
                <div style={{...ty.label,color:C.t3,marginBottom:12}}>{section.section.toUpperCase()}</div>
                <Card style={{padding:0,overflow:"hidden"}}>
                  {section.items.map(function(item, ii){
                    var key = si+"-"+ii;
                    var isOpen = faqOpen===key;
                    return(
                      <div key={key}>
                        {ii>0&&<HR/>}
                        <button onClick={function(){setFaqOpen(isOpen?null:key);}}
                          style={{width:"100%",padding:"16px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"flex-start",gap:12}}>
                          <div style={{flex:1}}>
                            <div style={{...ty.bodyMd,fontSize:14,color:isOpen?C.coral:C.t1,lineHeight:1.4}}>{item.q}</div>
                          </div>
                          <ChevronDown size={14} color={isOpen?C.coral:C.t3} style={{flexShrink:0,marginTop:3,transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                        </button>
                        {isOpen&&(
                          <div style={{padding:"0 18px 18px"}}>
                            <div style={{...ty.sm,color:C.t2,lineHeight:1.75,marginBottom:item.why?14:0}}>{item.a}</div>
                            {item.why&&(
                              <div style={{paddingTop:12,borderTop:"1px solid "+C.line}}>
                                <span style={{...ty.meta,color:C.t3,fontWeight:600}}>Why it matters: </span>
                                <span style={{...ty.meta,color:C.t3,lineHeight:1.7}}>{item.why}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}

          {/* Glossary */}
          <div style={{marginBottom:28}}>
            <div style={{...ty.label,color:C.t3,marginBottom:12}}>GLOSSARY</div>
            <Card style={{padding:0,overflow:"hidden"}}>
              {GLOSSARY_ITEMS.map(function(item,i){return(
                <div key={i}>
                  {i>0&&<HR/>}
                  <div style={{padding:"13px 18px",display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{...ty.meta,color:C.t1,fontWeight:700,minWidth:120,flexShrink:0,paddingTop:1}}>{item.t}</div>
                    <div style={{...ty.meta,color:C.t3,lineHeight:1.65}}>{item.d}</div>
                  </div>
                </div>
              );})}
            </Card>
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {bizTab==="profile"&&(
        <div style={{padding:"20px 16px 60px"}}>
          <Card>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <div style={{width:52,height:52,borderRadius:16,background:acctCfg.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{acctCfg.emoji}</div>
              <div>
                <div style={{...ty.h3,marginBottom:2}}>{acctCfg.label}</div>
                <div style={{...ty.meta,color:C.t3}}>{(session&&session.email)||"account@cravz.co"}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Access",v:thisTier.name,c:thisTier.color},
                {l:"Account type",v:acctCfg.label,c:null},
                {l:"Areas",v:sessionAreas.join(", "),c:null},
                {l:"Stage",v:(session&&session.stage)||"—",c:null},
              ].map(function(s){return(
                <div key={s.l} style={{padding:"10px 12px",background:C.surface2,borderRadius:10}}>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                  <div style={{...ty.sm,color:s.c||C.t1,fontWeight:600}}>{s.v}</div>
                </div>
              );})}
            </div>
            {/* Area slots */}
            <div style={{padding:"10px 12px",background:C.surface2,borderRadius:10,marginBottom:12}}>
              <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:6}}>YOUR AREAS — {thisTier.areas||1} SLOT{(thisTier.areas||1)!==1?"S":""} INCLUDED</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                {sessionAreas.map(function(a){return(
                  <span key={a} style={{padding:"4px 10px",borderRadius:20,background:C.coral+"15",border:"1px solid "+C.coral+"30",fontFamily:sans,fontSize:12,color:C.t1,fontWeight:500}}>{a}</span>
                );})}
              </div>
              <div style={{...ty.meta,color:C.t3,lineHeight:1.5,fontSize:10}}>Areas can be changed once every 30 days. Contact hello@cravz.co to request a change.</div>
            </div>
            {/* Status */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:C.green+"0A",border:"1px solid "+C.green+"20",borderRadius:10,marginBottom:12}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0}}/>
              <span style={{...ty.meta,color:C.green,fontWeight:500}}>{thisTier.name} access active</span>
              {thisTier.period&&<span style={{...ty.meta,color:C.t3}}>· {thisTier.period}</span>}
            </div>
            <button onClick={onLogout} style={{width:"100%",padding:"12px",borderRadius:12,background:"transparent",border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13}}>Sign out</button>

            {/* Legal */}
            <div style={{marginTop:20}}>
              <button onClick={function(){setBizLegalDoc("screen");}}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"13px 0",background:"transparent",border:"none",borderBottom:"1px solid "+C.line,cursor:"pointer",fontFamily:sans,textAlign:"left"}}>
                <span style={{...ty.sm,color:C.t2}}>Legal documents</span>
                <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
              </button>
            </div>
          </Card>
        </div>
      )}

      </div>
    </div>
  );
}

/* ==================================================
   ACCOUNT TYPE CONFIG
================================================== */
const ACCOUNT_TYPES = [
  { id:"business",   label:"Business owner",       sub:"Opening or running a business",          emoji:"🏪", color:"#E8513A" },
  { id:"investor",   label:"Investor",              sub:"Backing businesses or evaluating deals",  emoji:"💼", color:"#9B7DF5" },
  { id:"agent",      label:"Property agent",        sub:"Matching tenants to commercial spaces",   emoji:"🏢", color:"#E8A830" },
  { id:"developer",  label:"Developer / council",   sub:"Building sites or planning strategy",     emoji:"🏗️", color:"#2ECC8A" },
  { id:"other",      label:"Just exploring",        sub:"Curious about local demand data",         emoji:"🔍", color:"#8C8680" },
];

const BIZ_SEGMENTS = [
  { id:"restaurant",   label:"Restaurant / café / bar",      emoji:"🍽️" },
  { id:"fitness",      label:"Fitness / wellness / sport",   emoji:"💪" },
  { id:"retail_food",  label:"Retail — food & drink",        emoji:"🛒" },
  { id:"retail_other", label:"Retail — other",               emoji:"🛍️" },
  { id:"experience",   label:"Entertainment / experience",   emoji:"🎭" },
  { id:"beauty",       label:"Health & beauty",              emoji:"💆" },
  { id:"education",    label:"Education / childcare",        emoji:"📚" },
  { id:"services",     label:"Professional services",        emoji:"💼" },
  { id:"coworking",    label:"Co-working / flexible offices",emoji:"🖥️" },
];

const BIZ_STAGES = [
  { id:"researching", label:"Researching",  sub:"Exploring locations, no commitment" },
  { id:"planning",    label:"Planning",     sub:"Active site search, financing in progress" },
  { id:"committed",   label:"Committed",   sub:"Lease signed or in final negotiations" },
  { id:"open",        label:"Already open",sub:"Trading and looking to grow" },
];

const INV_FOCUS = [
  { id:"food_bev",  label:"Food & beverage" },
  { id:"fitness",   label:"Fitness & wellness" },
  { id:"retail",    label:"Retail" },
  { id:"mixed",     label:"Mixed / opportunistic" },
  { id:"property",  label:"Property / real estate" },
];


/* ==================================================
   BUSINESS STATUS PROGRESSION
   Each step forward fires a resident notification.
   Residents matched by: category + area overlap.
================================================== */
const BIZ_STATUS_FLOW = [
  {
    id: "registered",
    label: "Registered",
    sub: "Account created",
    emoji: "📋",
    color: "#4A4844",
    notif: null, // no notification -- passive
  },
  {
    id: "evaluating",
    label: "Seriously evaluating",
    sub: "Committed to finding the right site",
    emoji: "🔍",
    color: "#E8A830",
    notif: {
      title: "A business is looking at your area",
      body: "Someone is seriously evaluating opening a {category} in {area}. Your demand signal helped put this area on their radar.",
      cta: "See what's in demand",
    },
  },
  {
    id: "prelaunch",
    label: "Pre-launch page live",
    sub: "Collecting resident input before opening",
    emoji: "📣",
    color: "#9B7DF5",
    notif: {
      title: "A business wants your input",
      body: "Someone planning a {category} in {area} has published a pre-launch page. Answer a few questions to help shape what opens.",
      cta: "Answer their questions",
    },
  },
  {
    id: "opening_soon",
    label: "Opening soon",
    sub: "Date confirmed — opening imminent",
    emoji: "🔑",
    color: "#E8513A",
    notif: {
      title: "Something you voted for is opening in {area}",
      body: "A {category} you helped signal demand for is confirmed and opening soon. Watch this space.",
      cta: "See what's coming",
    },
  },
  {
    id: "open",
    label: "Now open",
    sub: "Trading — this is it",
    emoji: "🟢",
    color: "#2ECC8A",
    notif: {
      title: "It's here.",
      body: "The {category} in {area} that {voterCount} residents asked for has opened. You helped make this happen.",
      cta: "See what opened",
    },
  },
];

/* ==================================================
   LANDING
================================================== */
function Landing({onResident,onBusiness,onBizRequest}){
  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:sans,display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,padding:"52px 28px 40px",background:`radial-gradient(ellipse 100% 45% at 50% 100%, #2E0A04 0%, ${C.bg} 55%)`,display:"flex",flexDirection:"column",justifyContent:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,opacity:.04,pointerEvents:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}}/>
        <div style={{marginBottom:40}}><CravzLogo size={44}/><div style={{...ty.label,color:C.t3,marginTop:6,letterSpacing:2}}>LOCAL DEMAND</div></div>
        <h1 style={{...ty.hero,maxWidth:300,marginBottom:18}}>Your neighbourhood.<br/>Your voice.</h1>
        <p style={{...ty.body,fontSize:15,lineHeight:1.7,maxWidth:300,marginBottom:48,color:C.t2}}>Cravz turns local demand into real businesses. Vote with coins. Watch your neighbourhood change.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={onResident} style={{padding:"18px 20px",background:C.coral,color:"#fff",border:"none",borderRadius:16,cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:15,fontWeight:600}}>I'm a resident</div><div style={{fontSize:12,opacity:.8,marginTop:2}}>Tell us what your neighbourhood is missing</div></div>
            <ArrowRight size={18}/>
          </button>
          <button onClick={onBizRequest||onBusiness} style={{padding:"18px 20px",background:C.surface,color:C.t1,border:`1px solid ${C.line}`,borderRadius:16,cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:15,fontWeight:600}}>Business / investor / agent</div><div style={{fontSize:12,color:C.t2,marginTop:2}}>View demand intelligence plans & request access</div></div>
            <ArrowRight size={18} color={C.t3}/>
          </button>

        </div>
      </div>
      <div style={{padding:"18px 28px",borderTop:`1px solid ${C.line}`,textAlign:"center"}}>
        <div style={{...ty.meta,color:C.t3,lineHeight:1.7}}>Cravz never sells your personal data.<br/>All insights are anonymised and aggregated.</div>
      </div>
    </div>
  );
}

/* ==================================================
   AUTH FLOW -- resident + full business onboarding
================================================== */

/* ==============================================
   WAITLIST -- non-London postcode flow
============================================== */

function WaitlistScreen({postcode, value, onChange, onSubmit, onBack}){
  const canSubmit = value.name.trim().length>1 && /^[^@]+@[^@]+\.[^@]+$/.test(value.email.trim());
  return (
    <div style={{fontFamily:sans}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",padding:"0 0 16px",display:"flex",alignItems:"center",gap:5,fontFamily:sans}}>
        <span style={{fontSize:14}}>←</span>
        <span style={{...ty.meta,color:C.t3}}>Back</span>
      </button>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48,marginBottom:12}}>📍</div>
        <h2 style={{...ty.h2,marginBottom:8}}>Not available in your area yet</h2>
        <div style={{...ty.body,color:C.t2,lineHeight:1.7}}>
          <strong style={{color:C.t1}}>{postcode.trim().toUpperCase()}</strong> isn't covered yet.
          We're starting in London and expanding fast.
        </div>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:16,padding:"20px",marginBottom:16}}>
        <div style={{...ty.sm,color:C.amber,fontWeight:700,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
          <span>🔔</span> Be first to know
        </div>
        <div style={{...ty.meta,color:C.t2,lineHeight:1.6,marginBottom:16}}>
          Leave your details and we'll notify you the moment Cravz launches in your area. Your postcode also helps us prioritise which cities we expand to next.
        </div>

        <div style={{marginBottom:12}}>
          <div style={{...ty.meta,color:C.t3,marginBottom:5,fontSize:11,textTransform:"uppercase",letterSpacing:0.8}}>Your name</div>
          <input value={value.name} onChange={e=>onChange({...value,name:e.target.value})}
            placeholder="First name"
            style={{width:"100%",background:C.bg,border:`1px solid ${value.name.trim().length>1?C.green:C.line}`,borderRadius:10,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{...ty.meta,color:C.t3,marginBottom:5,fontSize:11,textTransform:"uppercase",letterSpacing:0.8}}>Email address</div>
          <input value={value.email} onChange={e=>onChange({...value,email:e.target.value})}
            placeholder="you@example.com" type="email"
            style={{width:"100%",background:C.bg,border:`1px solid ${/^[^@]+@[^@]+\.[^@]+$/.test(value.email.trim())?C.green:C.line}`,borderRadius:10,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
        </div>

        <button disabled={!canSubmit} onClick={onSubmit}
          style={{width:"100%",padding:"14px",borderRadius:12,background:canSubmit?C.coral:"transparent",border:`1px solid ${canSubmit?C.coral:C.line}`,color:canSubmit?"#fff":C.t3,fontWeight:700,fontSize:15,cursor:canSubmit?"pointer":"default",fontFamily:sans,transition:"all .2s"}}>
          Notify me when you launch →
        </button>
      </div>

      <div style={{...ty.meta,color:C.t3,textAlign:"center",lineHeight:1.6}}>
        No spam. One email when we launch in your area.
      </div>
    </div>
  );
}

function WaitlistConfirmed({postcode, onBack}){
  return (
    <div style={{fontFamily:sans,textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:56,marginBottom:16}}>🌱</div>
      <h2 style={{...ty.h2,marginBottom:10}}>You're on the list</h2>
      <div style={{...ty.body,color:C.t2,lineHeight:1.7,marginBottom:8}}>
        We've noted your interest for <strong style={{color:C.t1}}>{postcode.trim().toUpperCase()}</strong>.
      </div>
      <div style={{...ty.body,color:C.t2,lineHeight:1.7,marginBottom:32}}>
        We'll email you the moment Cravz launches in your area. Your postcode also helps us decide where to expand next — so you're already making a difference.
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:"16px",marginBottom:24,textAlign:"left"}}>
        <div style={{...ty.sm,color:C.t3,marginBottom:8}}>While you wait</div>
        <div style={{...ty.meta,color:C.t2,lineHeight:1.8}}>
          📣 Share Cravz with friends in London — the more voices, the stronger the data<br/>
          🌍 Follow us for expansion announcements
        </div>
      </div>
      <button onClick={onBack}
        style={{width:"100%",padding:"13px",borderRadius:12,background:"transparent",border:`1px solid ${C.line}`,color:C.t2,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:sans}}>
        ← Try a different postcode
      </button>
    </div>
  );
}

function AuthFlow({userType,onBack,onDone}){
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalPage, setLegalPage] = useState(null);
  const [step,   setStep]  = useState("email");
  const [email,  setEmail] = useState("");
  const [code,   setCode]  = useState("");
  // resident fields
  const [ps,     setPS]    = useState(0);
  const [pc,     setPC]    = useState("");
  const [waitlist, setWaitlist] = useState(null);
  const [age,    setAge]   = useState("");
  const [gndr,   setGndr]  = useState("");
  const [hh,     setHH]    = useState("");
  const [kids,   setKids]  = useState(null);
  // business onboarding fields
  const [acctType, setAcctType] = useState("");
  const [segment,  setSegment]  = useState("");
  const [segment2, setSegment2] = useState(""); // optional secondary
  const [bizStage, setBizStage] = useState("");
  const [invFocus, setInvFocus] = useState("");
  const [areas,    setAreas]    = useState([]);


  const resOk = age&&gndr&&hh&&kids!==null;
  const bizAcctOk = acctType !== "";
  const segOk = acctType==="business" ? segment!="" : acctType==="investor" ? invFocus!="" : true;
  const stageOk = acctType==="business" ? bizStage!="" : true;
  const areasOk = areas.length > 0;

  const Wrap=({children})=>(
    <div style={{minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:sans,overflowY:"auto"}}>
      <div style={{maxWidth:420,margin:"0 auto",padding:"32px 20px 80px"}}>{children}</div>
    </div>
  );
  const BackBtn=({to})=>(
    <button onClick={to} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",marginBottom:24,fontFamily:sans,fontSize:13,display:"flex",alignItems:"center",gap:5}}>← Back</button>
  );
  const ProgBar=({steps,cur})=>(
    <div style={{display:"flex",gap:4,marginBottom:28}}>
      {Array.from({length:steps}).map((_,i)=>(
        <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=cur?C.coral:C.line,transition:"background .3s"}}/>
      ))}
    </div>
  );

  // -- EMAIL
  if(step==="email") return (
    <Wrap>
      <BackBtn to={onBack}/>
      <div style={{marginBottom:24}}><CravzLogo size={28}/></div>
      <h2 style={{...ty.h2,marginBottom:6}}>Join Cravz</h2>
      <div style={{...ty.body,marginBottom:24}}>{userType==="resident"?"One account per person keeps demand real.":"Access verified local demand intelligence."}</div>
      {/* T&C agreement */}
      {legalPage&&<div style={{position:"fixed",inset:0,zIndex:200,background:C.bg}}><LegalPage doc={legalPage} onBack={function(){setLegalPage(null);}}/></div>}
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:C.surface,border:"1px solid "+(agreedToTerms?C.green+"40":C.line),borderRadius:12,marginBottom:10,cursor:"pointer"}}
        onClick={function(){setAgreedToTerms(function(v){return !v;});}}>
        <div style={{width:18,height:18,borderRadius:5,border:"1px solid "+(agreedToTerms?C.green:C.line),background:agreedToTerms?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
          {agreedToTerms&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
        </div>
        <div style={{...ty.meta,color:C.t2,lineHeight:1.65}}>
          {"I agree to the "}
          <span onClick={function(e){e.stopPropagation();setLegalPage(LEGAL_DOCS.find(function(d){return d.id==="terms";}));}} style={{color:C.coral,cursor:"pointer"}}>Terms & Conditions</span>
          {" and "}
          <span onClick={function(e){e.stopPropagation();setLegalPage(LEGAL_DOCS.find(function(d){return d.id==="privacy";}));}} style={{color:C.coral,cursor:"pointer"}}>Privacy Policy</span>
        </div>
      </div>
      <div style={{...ty.meta,color:C.t3,marginBottom:14,lineHeight:1.65}}>
        {"By continuing, you acknowledge "}
        <span onClick={function(){setLegalPage(LEGAL_DOCS.find(function(d){return d.id==="data";}));}} style={{color:C.t2,cursor:"pointer",textDecoration:"underline"}}>how Cravz data works</span>
      </div>
      {["Continue with Apple","Continue with Google"].map(l=>(
        <button key={l} onClick={function(){if(agreedToTerms) setStep(userType==="resident"?"profile":"acct_type");}}
          disabled={!agreedToTerms}
          style={{width:"100%",padding:"13px",background:agreedToTerms?"#EDE8E0":C.surface2,border:"none",borderRadius:12,cursor:agreedToTerms?"pointer":"default",fontFamily:sans,color:agreedToTerms?"#111":C.t3,fontWeight:600,fontSize:13,marginBottom:8,textAlign:"center",opacity:agreedToTerms?1:0.5}}>{l}</button>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0"}}>
        <div style={{flex:1,height:1,background:C.line}}/><span style={{...ty.meta}}>or email</span><div style={{flex:1,height:1,background:C.line}}/>
      </div>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email"
        style={{width:"100%",background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",marginBottom:10}}
        onFocus={e=>e.target.style.borderColor=C.coral} onBlur={e=>e.target.style.borderColor=C.line}/>
      <button disabled={!email.includes("@")} onClick={()=>setStep("verify")}
        style={{width:"100%",padding:"13px",borderRadius:12,background:email.includes("@")?C.coral:C.surface2,color:email.includes("@")?"#fff":C.t3,border:"none",cursor:email.includes("@")?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:14}}>
        Send code →
      </button>
    </Wrap>
  );

  // -- VERIFY
  if(step==="verify") return (
    <Wrap>
      <BackBtn to={()=>setStep("email")}/>
      <h2 style={{...ty.h2,marginBottom:6,textAlign:"center"}}>Check your email</h2>
      <div style={{...ty.body,textAlign:"center",marginBottom:4}}>Sent to {email}</div>
      <div style={{...ty.meta,color:C.amber,textAlign:"center",marginBottom:26}}>Demo: enter 1234</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
        {[0,1,2,3].map(i=>(
          <input key={i} maxLength={1} value={code[i]||""}
            onChange={e=>{const a=code.split("");a[i]=e.target.value;setCode(a.join(""));}}
            style={{width:56,height:64,background:C.surface,border:`1px solid ${code.length>i?C.coral:C.line}`,borderRadius:14,color:C.t1,fontSize:24,fontFamily:serif,outline:"none",textAlign:"center",transition:"border-color .2s"}}/>
        ))}
      </div>
      <button disabled={code.length<4} onClick={()=>{if(code==="1234") setStep(userType==="resident"?"profile":"acct_type");}}
        style={{width:"100%",padding:"13px",borderRadius:12,background:code.length>=4?C.coral:C.surface2,color:code.length>=4?"#fff":C.t3,border:"none",cursor:code.length>=4?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:14}}>
        Verify →
      </button>
    </Wrap>
  );

  // -- RESIDENT PROFILE (unchanged flow)
  if(step==="profile") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.t1,fontFamily:sans}}>
      <div style={{maxWidth:420,margin:"0 auto",padding:"32px 20px 60px"}}>
        <ProgBar steps={2} cur={ps}/>
        {ps===0&&<>
          {waitlist&&!waitlist.submitted&&(
            <WaitlistScreen
              postcode={pc}
              value={waitlist}
              onChange={v=>setWaitlist(v)}
              onSubmit={()=>{
                addToWaitlist({postcode:pc.trim(), name:waitlist.name.trim(), email:waitlist.email.trim()});
                setWaitlist(w=>({...w,submitted:true}));
              }}
              onBack={()=>setWaitlist(null)}
            />
          )}
          {waitlist&&waitlist.submitted&&(
            <WaitlistConfirmed postcode={pc} onBack={()=>{setWaitlist(null);setPC("");}} />
          )}
          {!waitlist&&<>
          <h2 style={{...ty.h2,marginBottom:6}}>Your neighbourhood</h2>
          <div style={{...ty.body,marginBottom:20}}>Locked to your account. Keeps demand local and trustworthy.</div>
          {(function(){
            const pcValid = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/.test(pc.trim());
            const pcFilled = pc.trim().length >= 5;
            const showError = pcFilled && !pcValid;
            const fmt = v => {
              // auto-insert space before inward code if missing
              const raw = v.replace(/\s/g,"");
              if(raw.length>4) return raw.slice(0,raw.length-3)+" "+raw.slice(raw.length-3);
              return v;
            };
            return (<>
              <input value={pc}
                onChange={e=>{
                  const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g,"");
                  setPC(fmt(raw));
                }}
                placeholder="e.g. SW4 9BZ" maxLength={8}
                style={{width:"100%",background:C.surface,border:`1px solid ${showError?C.coral:pcValid?C.green:C.line}`,borderRadius:12,padding:"16px",color:C.t1,fontSize:22,fontFamily:serif,outline:"none",textAlign:"center",letterSpacing:4,marginBottom:showError?8:12,transition:"border-color .2s"}}
                onFocus={e=>e.target.style.borderColor=C.coral} onBlur={e=>e.target.style.borderColor=showError?C.coral:pcValid?C.green:C.line}/>
              {showError&&(
                <div style={{...ty.meta,color:C.coral,textAlign:"center",marginBottom:12}}>
                  Enter a full UK postcode — e.g. SW4 9BZ or EC1A 1BB
                </div>
              )}
              {pcValid&&(
                <div style={{...ty.meta,color:C.green,textAlign:"center",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                  <Check size={11} color={C.green}/> Valid postcode
                </div>
              )}
              <button disabled={!pcValid} onClick={()=>{
                  if(isLondonPostcode(pc)){setPS(1);}
                  else{setWaitlist({name:"",email:"",submitted:false});}
                }}
                style={{width:"100%",padding:"13px",borderRadius:12,background:pcValid?C.coral:C.surface2,color:pcValid?"#fff":C.t3,border:"none",cursor:pcValid?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:14}}>
                Next →
              </button>
            </>);
          })()}
        </>}
        </>}
        {ps===1&&<>
          <h2 style={{...ty.h2,marginBottom:6}}>A bit about you</h2>
          <div style={{...ty.body,marginBottom:20}}>Anonymous. Helps businesses understand who's asking — not who you are.</div>
          {[{l:"Age bracket",opts:AGES,v:age,s:setAge},{l:"Gender",opts:GNDR,v:gndr,s:setGndr},{l:"Household",opts:HHLD,v:hh,s:setHH}].map(f=>(
            <div key={f.l} style={{marginBottom:16}}>
              <SLabel>{f.l}</SLabel>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{f.opts.map(o=><Chip key={o} label={o} active={f.v===o} onClick={()=>f.s(o)} sm/>)}</div>
            </div>
          ))}
          <div style={{marginBottom:20}}>
            <SLabel>Children under 12 at home?</SLabel>
            <div style={{display:"flex",gap:8}}>
              {["Yes","No"].map(v=>(
                <button key={v} onClick={()=>setKids(v==="Yes")}
                  style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${kids===(v==="Yes")?C.coral:C.line}`,background:kids===(v==="Yes")?`${C.coral}15`:"transparent",color:kids===(v==="Yes")?C.coral:C.t2,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:kids===(v==="Yes")?600:400}}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div style={{...ty.meta,color:C.t3,lineHeight:1.7,marginBottom:20,padding:"10px 12px",background:C.surface,borderRadius:10,border:`1px solid ${C.line}`}}>
            🔒 We store your full postcode to derive your district (e.g. SW4) and sector (e.g. SW4 9). Businesses on Investor tier can see sector-level signals — never your full postcode, name, or email. All demographic data is aggregated and anonymised.
          </div>
          <button disabled={!resOk} onClick={()=>{
                    const full = pc.trim().toUpperCase();
                    const parts = full.split(" ");
                    const district = parts[0];                          // SW4
                    const sector = parts.length>1 ? parts[0]+" "+parts[1][0] : district; // SW4 9
                    onDone({type:"resident",user:{postcode:district, sector, fullPostcode:full, age,gender:gndr,household:hh,kids}});
                  }}
            style={{width:"100%",padding:"14px",borderRadius:14,background:resOk?C.coral:C.surface2,color:resOk?"#fff":C.t3,border:"none",cursor:resOk?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15}}>
            Enter Cravz →
          </button>
        </>}
      </div>
    </div>
  );

  // -- STEP 1: ACCOUNT TYPE
  if(step==="acct_type") return (
    <Wrap>
      <BackBtn to={()=>setStep("verify")}/>
      <ProgBar steps={4} cur={0}/>
      <h2 style={{...ty.h2,marginBottom:6}}>How are you using Cravz?</h2>
      <div style={{...ty.body,marginBottom:20}}>This shapes your dashboard and the reports you receive.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {ACCOUNT_TYPES.map(t=>(
          <button key={t.id} onClick={()=>setAcctType(t.id)}
            style={{background:acctType===t.id?`${t.color}15`:C.surface,border:`1px solid ${acctType===t.id?t.color:C.line}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:12,transition:"all .14s"}}>
            <div style={{width:40,height:40,borderRadius:11,background:acctType===t.id?`${t.color}20`:C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{t.emoji}</div>
            <div style={{flex:1}}>
              <div style={{...ty.bodyMd,fontSize:14,color:acctType===t.id?t.color:C.t1}}>{t.label}</div>
              <div style={{...ty.meta,marginTop:2,color:C.t3}}>{t.sub}</div>
            </div>
            {acctType===t.id&&<Check size={16} color={t.color}/>}
          </button>
        ))}
      </div>
      <button disabled={!bizAcctOk} onClick={()=>setStep("segment")}
        style={{width:"100%",padding:"14px",borderRadius:14,background:bizAcctOk?C.coral:C.surface2,color:bizAcctOk?"#fff":C.t3,border:"none",cursor:bizAcctOk?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15,marginTop:20}}>
        Next →
      </button>
    </Wrap>
  );

  // -- STEP 2: SEGMENT / FOCUS (primary + optional secondary for business)
  if(step==="segment"){
    const isInv = acctType==="investor";
    const isAgent = acctType==="agent"||acctType==="developer"||acctType==="other";
    const title = isInv ? "What sectors do you focus on?" : isAgent ? "Which sectors interest you most?" : "What kind of business?";
    const subtitle = isInv ? "We'll surface the most relevant demand signals for your portfolio." : isAgent ? "Helps us tailor your area reports." : "Choose your primary category. Some businesses straddle two — you can add a secondary.";
    const opts = isInv ? INV_FOCUS.map(f=>({...f,emoji:""})) : BIZ_SEGMENTS;
    const val = isInv ? invFocus : segment;
    const setter = isInv ? setInvFocus : setSegment;
    const stepOk = val !== "";
    const isBiz = acctType==="business";
    return (
      <Wrap>
        <BackBtn to={()=>setStep("acct_type")}/>
        <ProgBar steps={4} cur={1}/>
        <h2 style={{...ty.h2,marginBottom:6}}>{title}</h2>
        <div style={{...ty.body,marginBottom:16}}>{subtitle}</div>

        {isBiz&&<div style={{...ty.meta,color:C.coral,fontWeight:600,marginBottom:8}}>Primary category</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:isBiz?16:0}}>
          {opts.map(o=>(
            <button key={o.id} onClick={()=>{setter(o.id);if(segment2===o.id)setSegment2("");}}
              style={{background:val===o.id?`${C.coral}15`:C.surface,border:`1px solid ${val===o.id?C.coral:C.line}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:10,transition:"all .14s"}}>
              {o.emoji&&<span style={{fontSize:18,flexShrink:0}}>{o.emoji}</span>}
              <span style={{...ty.bodyMd,fontSize:14,flex:1,color:val===o.id?C.coral:C.t1}}>{o.label}</span>
              {val===o.id&&<Check size={14} color={C.coral}/>}
            </button>
          ))}
        </div>

        {isBiz&&segment&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{...ty.meta,color:C.t2,fontWeight:600}}>Secondary category</div>
              <div style={{...ty.meta,color:C.t3}}>(optional)</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:4}}>
              {BIZ_SEGMENTS.filter(o=>o.id!==segment).map(o=>(
                <button key={o.id} onClick={()=>setSegment2(s=>s===o.id?"":o.id)}
                  style={{padding:"7px 12px",borderRadius:9,border:`1px solid ${segment2===o.id?C.purple:C.line}`,background:segment2===o.id?`${C.purple}12`:"transparent",color:segment2===o.id?C.purple:C.t2,cursor:"pointer",...ty.meta,fontWeight:segment2===o.id?700:400,transition:"all .14s"}}>
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
            {segment2&&<div style={{...ty.meta,color:C.t3,marginTop:4}}>Data matching uses your primary category. Secondary is shown on your profile.</div>}
          </div>
        )}

        <button disabled={!stepOk} onClick={()=>setStep(acctType==="business"?"biz_stage":"areas")}
          style={{width:"100%",padding:"14px",borderRadius:14,background:stepOk?C.coral:C.surface2,color:stepOk?"#fff":C.t3,border:"none",cursor:stepOk?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15,marginTop:20}}>
          Next →
        </button>
      </Wrap>
    );
  }

  // -- STEP 3a: BUSINESS STAGE (business only)
  if(step==="biz_stage") return (
    <Wrap>
      <BackBtn to={()=>setStep("segment")}/>
      <ProgBar steps={4} cur={2}/>
      <h2 style={{...ty.h2,marginBottom:6}}>Where are you in the journey?</h2>
      <div style={{...ty.body,marginBottom:20}}>This determines what features and reports are available to you.</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {BIZ_STAGES.map(s=>(
          <button key={s.id} onClick={()=>setBizStage(s.id)}
            style={{background:bizStage===s.id?`${C.coral}15`:C.surface,border:`1px solid ${bizStage===s.id?C.coral:C.line}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:12,transition:"all .14s"}}>
            <div style={{flex:1}}>
              <div style={{...ty.bodyMd,fontSize:14,color:bizStage===s.id?C.coral:C.t1}}>{s.label}</div>
              <div style={{...ty.meta,marginTop:2,color:C.t3}}>{s.sub}</div>
            </div>
            {bizStage===s.id&&<Check size={14} color={C.coral}/>}
          </button>
        ))}
      </div>
      <button disabled={!stageOk} onClick={()=>setStep("areas")}
        style={{width:"100%",padding:"14px",borderRadius:14,background:stageOk?C.coral:C.surface2,color:stageOk?"#fff":C.t3,border:"none",cursor:stageOk?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15,marginTop:20}}>
        Next →
      </button>
    </Wrap>
  );

  // -- STEP 3b / STEP 4: AREAS OF INTEREST
  if(step==="areas"){
    // Primary = first selected. Extras always allowed but locked on free/starter in-app.
    const primaryArea = areas[0]||null;
    return (
    <Wrap>
      <BackBtn to={()=>setStep(acctType==="business"?"biz_stage":"segment")}/>
      <ProgBar steps={4} cur={3}/>
      <h2 style={{...ty.h2,marginBottom:6}}>Which areas are you focused on?</h2>
      <div style={{...ty.body,marginBottom:6}}>Your <span style={{color:C.coral,fontWeight:600}}>first selection becomes your Primary area</span> — always shown on your dashboard. Add more to unlock later.</div>
      <div style={{marginBottom:16}}>
        <AreaPicker
          selected={areas}
          onChange={setAreas}
          maxSelect={99}
          accentColor={C.coral}
          showPrimary={true}
        />
      </div>
      {areas.length>1&&(
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"9px 12px",borderRadius:10,background:`${C.amber}10`,border:`1px solid ${C.amber}20`,marginBottom:14}}>
          <Lock size={11} color={C.amber}/>
          <span style={{...ty.meta,color:C.amber}}>{areas.length-1} extra area{areas.length>2?"s":""} saved — unlock with Pro or Enterprise to view their data.</span>
        </div>
      )}
      <button disabled={!areasOk} onClick={()=>onDone({type:"business",acctType,segment:segment||invFocus,segment2:segment2||null,bizStage,areas})}
        style={{width:"100%",padding:"14px",borderRadius:14,background:areasOk?C.coral:C.surface2,color:areasOk?"#fff":C.t3,border:"none",cursor:areasOk?"pointer":"default",fontFamily:sans,fontWeight:600,fontSize:15}}>
        Enter Cravz →
      </button>
    </Wrap>
  );}


  return null;
}

/* ==================================================
   SHELL
================================================== */
function TopBar({user}){
  return <div className="cravz-top-bar" style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}F2`,backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.line}`,padding:"0 18px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}><CravzLogo size={23}/><span style={{...ty.meta,color:C.t3}}>{(user&&user.postcode)}</span><button style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><MoreHorizontal size={17}/></button></div></div>;
}

/* ==================================================
   RESIDENT NOTIFICATIONS
================================================== */

// ── ResPrelaunchSurvey ─────────────────────────────────────────────────────────
// Resident fills in a business's pre-launch survey from their Updates tab
// Firebase: writes to prelaunch_responses/{surveyId}/responses/{uid}
function ResPrelaunchSurvey({notif, survey, onBack, coinAlloc}) {
  var questions = (survey.questions||[]).slice(0,8);
  var [answers, setAnswers] = useState({});
  var [submitted, setSubmitted] = useState(false);

  var allAnswered = questions.length > 0 && questions.every(function(q){
    return answers[q.id] != null;
  });

  if(submitted) return (
    <div style={{padding:"40px 20px",textAlign:"center",fontFamily:sans}}>
      <div style={{width:64,height:64,borderRadius:20,background:C.green+"15",border:"1px solid "+C.green+"25",
        display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
        <Check size={30} color={C.green}/>
      </div>
      <div style={{...ty.h2,marginBottom:8}}>Answers sent</div>
      <div style={{...ty.body,color:C.t3,lineHeight:1.65,marginBottom:24}}>
        Your responses go directly to the business. They'll use them to shape what they build — opening hours, format, pricing, what to stock.
      </div>
      <div style={{padding:"14px 16px",background:C.surface,border:"1px solid "+C.line,borderRadius:14,textAlign:"left",marginBottom:20}}>
        <div style={{...ty.label,color:C.coral,marginBottom:6}}>What happens next</div>
        <div style={{...ty.sm,color:C.t2,lineHeight:1.65}}>Once the business collects enough responses, you'll get an update in your notifications. If they open, you'll be one of the first to know.</div>
      </div>
      <button onClick={onBack} style={{padding:"13px 28px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15}}>
        Back to Updates
      </button>
    </div>
  );

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:sans,color:C.t1}}>
      {/* Header */}
      <div style={{position:"sticky",top:0,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,zIndex:50}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
        <div style={{...ty.bodyMd,fontSize:14,flex:1}}>Business survey</div>
        <div style={{...ty.meta,color:C.t3,fontSize:11}}>{Object.keys(answers).length}/{questions.length} answered</div>
      </div>

      <div style={{padding:"20px 20px 100px"}}>
        {/* Business card */}
        <div style={{background:"linear-gradient(135deg,"+C.coral+"12,"+C.surface+")",border:"1px solid "+C.coral+"25",borderRadius:16,padding:"16px 18px",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:44,height:44,borderRadius:12,background:C.coral+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{survey.emoji}</div>
            <div style={{flex:1}}>
              <div style={{...ty.h3,marginBottom:2}}>{survey.label}</div>
              <div style={{...ty.meta,color:C.t3}}>{survey.area} · {survey.opening||"Opening soon"}</div>
            </div>
          </div>
          {survey.blurb&&<div style={{...ty.sm,color:C.t2,lineHeight:1.65,fontStyle:"italic"}}>"{survey.blurb}"</div>}
          <div style={{...ty.meta,color:C.t3,marginTop:10,lineHeight:1.5}}>
            🔒 Your answers are anonymous. The business only sees aggregated responses.
          </div>
        </div>

        {/* Why you're seeing this */}
        <div style={{padding:"10px 14px",background:C.purple+"0C",border:"1px solid "+C.purple+"25",borderRadius:10,marginBottom:20}}>
          <div style={{...ty.meta,color:C.purple,lineHeight:1.5}}>
            You're seeing this because you voted for something similar in {survey.area}. Your input matters — it's exactly the resident signal this business needs.
          </div>
        </div>

        {/* Questions */}
        {questions.map(function(q, qi){
          return (
            <div key={q.id} style={{marginBottom:20}}>
              <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:10,lineHeight:1.5}}>
                {qi+1}. {q.q}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {q.opts.map(function(opt){
                  var selected = answers[q.id]===opt;
                  return(
                    <button key={opt} onClick={function(){
                      setAnswers(function(a){return Object.assign({},a,{[q.id]:opt});});
                    }}
                      style={{padding:"11px 14px",borderRadius:11,cursor:"pointer",fontFamily:sans,fontSize:13,
                        textAlign:"left",transition:"all .12s",
                        background:selected?C.coral+"12":C.surface,
                        border:"1px solid "+(selected?C.coral+"60":C.line),
                        color:selected?C.t1:C.t2,fontWeight:selected?600:400}}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Submit */}
        <button disabled={!allAnswered} onClick={function(){setSubmitted(true);}}
          style={{width:"100%",padding:"15px",borderRadius:14,marginTop:8,
            background:allAnswered?C.coral:C.surface2,
            color:allAnswered?"#fff":C.t3,
            border:"none",cursor:allAnswered?"pointer":"default",
            fontFamily:sans,fontWeight:700,fontSize:15,transition:"all .2s"}}>
          {allAnswered ? "Send my answers →" : "Answer all questions to submit"}
        </button>
      </div>
    </div>
  );
}

function ResNotifications({user, coinAlloc, onAllocate, onShowPrelaunch}){
  const [dismissed, setDismissed] = useState([]);
  const [ctaNotif,  setCtaNotif]  = useState(null);
  // Firebase: query notifications where area in user.areas AND (type!=="prelaunch" OR user voted in that cat)
  // In prototype: filter prelaunch notifs to only show if resident voted in that category
  var userArea = (user&&user.homeArea)||"SW4";
  var userCats = {};
  if(coinAlloc) {
    Object.keys(coinAlloc).forEach(function(id){
      var item = FEED.find(function(f){return f.id===id;});
      if(item && coinAlloc[id]>0) userCats[item.cat] = true;
    });
  }
  const visible = ALL_NOTIFS.filter(function(n){
    if(dismissed.includes(n.id)) return false;
    // Non-prelaunch: show if area matches
    if(n.type!=="prelaunch") return !n.area || n.area===userArea;
    // Prelaunch: area match + voted in same category
    var areaMatch = !n.area || n.area===userArea;
    var catMatch = !n.cat || userCats[n.cat] || Object.keys(userCats).length===0;
    return areaMatch && catMatch;
  });

  const dismiss = id => setDismissed(p=>[...p,id]);

  const CTA_COPY = {
    opening:      "This will link to the business's public profile once they're live on Cravz. You'll be able to see their story, confirm you've visited, and leave feedback.",
    opening_soon: "This would open the business's pre-opening page — their timeline, what they're building, and a way to get notified the moment they open.",
    prelaunch:    "This would open the business's pre-launch page with their questions. Your answers directly shape what they build — opening hours, format, pricing, what to stock.",
    evaluating:   "This would show you the demand signal that caught this business's eye, and let you add more weight to it so they know exactly how serious local interest is.",
    almost_there: "This would let you share the demand signal directly with neighbours — the more people who vote, the stronger the signal and the more likely a business acts on it.",
    nudge:        "This would take you directly to the demand ranking so you can review and reallocate your coins based on what's changed in your area.",
  };

  const NotifCard = ({n}) => (
    <div style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:14,padding:"14px 15px",marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
      {/* Left accent bar */}
      <div style={{width:3,borderRadius:2,background:n.color,alignSelf:"stretch",flexShrink:0}}/>
      {/* Content */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
          <div style={{...ty.bodyMd,fontSize:13,color:C.t1,lineHeight:1.4,paddingRight:8}}>{n.title}</div>
          <button onClick={()=>dismiss(n.id)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",padding:0,flexShrink:0,lineHeight:1}}><X size={12}/></button>
        </div>
        <div style={{...ty.sm,color:C.t2,lineHeight:1.55,marginBottom:8}}>{n.body}</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{...ty.meta,color:C.t3,fontSize:11}}>{n.area} · {n.ts}</span>
          <button onClick={()=>setCtaNotif(n)}
            style={{padding:"5px 11px",borderRadius:7,background:"transparent",border:`1px solid ${n.color}50`,
              color:n.color,cursor:"pointer",...ty.meta,fontWeight:600,fontSize:11}}>
            {n.cta} →
          </button>
        </div>
      </div>
    </div>
  );

  if(ctaNotif) {
    // For prelaunch notifications: show the actual inline survey
    if(ctaNotif.type==="prelaunch") {
      var surveyPage = PRELAUNCH_PAGES.find(function(p){return p.id===ctaNotif.surveyId;}) ||
        {id:"demo_pl1", label:"Late-night ramen bar", emoji:"🍜", cat:"food", area:ctaNotif.area,
         blurb:"Authentic tonkotsu, open until 2am.", questions:PRELAUNCH_QUESTIONS["restaurant"]||[], responseCount:31, status:"active"};
      return <ResPrelaunchSurvey notif={ctaNotif} survey={surveyPage} onBack={function(){setCtaNotif(null);}} coinAlloc={coinAlloc}/>;
    }
    return (
      <div style={{padding:"20px 16px 100px"}}>
        <button onClick={function(){setCtaNotif(null);}}
          style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,marginBottom:20,padding:0,...ty.sm}}>
          ← Back
        </button>
        <div style={{background:ctaNotif.color+"0C",border:"1px solid "+ctaNotif.color+"25",borderRadius:18,padding:"22px 20px"}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
            <div style={{width:44,height:44,borderRadius:13,background:ctaNotif.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ctaNotif.icon}</div>
            <div style={{flex:1}}>
              <div style={{...ty.h3,fontSize:16,marginBottom:4}}>{ctaNotif.title}</div>
              <div style={{...ty.meta,color:C.t3}}>{ctaNotif.area} · {ctaNotif.ts}</div>
            </div>
          </div>
          <div style={{...ty.body,color:C.t1,lineHeight:1.75,marginBottom:20}}>{ctaNotif.body}</div>
          <div style={{padding:"14px 16px",borderRadius:12,background:C.surface2,border:"1px solid "+C.line}}>
            <div style={{...ty.label,color:ctaNotif.color,marginBottom:8}}>When Cravz launches</div>
            <div style={{...ty.sm,color:C.t2,lineHeight:1.75}}>{CTA_COPY[ctaNotif.type]||CTA_COPY.nudge}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 16px 100px"}}>
      <h2 style={{...ty.h2,marginBottom:4}}>Notifications</h2>
      <div style={{...ty.body,marginBottom:20}}>Updates on demand signals and businesses you helped shape.</div>

      {visible.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:32,marginBottom:12}}>🔔</div>
          <div style={{...ty.bodyMd,marginBottom:6}}>All caught up</div>
          <div style={{...ty.body}}>We'll notify you when something you voted for moves, or when a business opens nearby.</div>
        </div>
      )}

      {(()=>{
        const grouped = [
          { label:"Now open near you",            types:["opening"],        color:C.green  },
          { label:"Opening soon",                 types:["opening_soon"],   color:C.coral  },
          { label:"Businesses wanting your input",types:["prelaunch"],      color:C.purple },
          { label:"Businesses evaluating",        types:["evaluating"],     color:C.amber  },
          { label:"Almost there",                 types:["almost_there"],   color:C.amber  },
          { label:"Updates on your votes",        types:["nudge"],          color:C.t3     },
        ];
        return grouped.map(g=>{
          const items = visible.filter(n=>g.types.includes(n.type));
          if(!items.length) return null;
          return (
            <div key={g.label} style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:g.color,flexShrink:0}}/>
                <div style={{...ty.label,color:g.color}}>{g.label.toUpperCase()}</div>
              </div>
              {items.map(n=><NotifCard key={n.id} n={n}/>)}
            </div>
          );
        });
      })()}
    </div>
  );
}


/* ==================================================
   THE BRIEF — data, constants, helpers
================================================== */

const BRIEF_BRANDS_BY_CAT = {
  food:    ["Gail's","Dishoom","Megan's","Ottolenghi","Redemption Roasters","Notes Coffee","Caravan","Monmouth Coffee","Flat Iron","Hawksmoor"],
  fitness: ["Barry's","F45","1Rebel","Third Space","PureGym","Gymbox","Digme","BXR","Core Collective","Psycle","Triyoga","Frame"],
  kids:    ["Gambado","Trampoline Park","Little Kickers","Tumble Tots","Gymboree","Monkey Music"],
  health:  ["Third Space","Cowshed","Bamford","Glow Bar","FACEGYM"],
  retail:  ["Aesop","Anya Hindmarch","Labour and Wait","Magma","Daunt Books"],
  entertain:["Electric Brixton","Omeara","Village Underground","Jazz Cafe"],
  services:["Third Space","1Rebel","Barry's","F45"],
};
// Flat list for autocomplete (all brands)
const BRIEF_BRANDS = Object.values(BRIEF_BRANDS_BY_CAT).reduce(function(all,arr){
  arr.forEach(function(b){ if(all.indexOf(b)===-1) all.push(b); });
  return all;
},[]);

const BRIEF_LOCATIONS = [
  "Clapham High Street","Rectory Grove","Near the Common",
  "Old Town","Near Clapham South station","Near Clapham North station",
  "Abbeville Village","Nightingale Lane","Clapham Manor Street",
  "Near the park","Venn Street",
];

const BRIEF_ATTRIBUTES = [
  "premium","clean","modern","family-friendly","healthy","aesthetic",
  "quick","coffee","child-friendly","under-5s","date-night","outdoor",
  "independent","local","affordable","luxury","cosy",
];

// Seed comments per concept id — realistic Clapham resident voices
const BRIEF_SEED_COMMENTS = {
  "s75": [
    {id:"bc1", text:"Would love a Barry's or F45 with creche -- impossible to find in SW4", upvotes:14, ts:"2 days ago"},
    {id:"bc2", text:"Something near Rectory Grove would be perfect for the school run crowd", upvotes:11, ts:"3 days ago"},
    {id:"bc3", text:"Needs to be properly premium, not a glorified ball pit. Good coffee essential", upvotes:9, ts:"4 days ago"},
    {id:"bc4", text:"Gambado would be amazing here -- there's nothing like it south of the river", upvotes:7, ts:"5 days ago"},
    {id:"bc5", text:"Outdoor area would be a huge bonus given proximity to the Common", upvotes:6, ts:"1 week ago"},
  ],
  "s29": [
    {id:"bc6", text:"A natural wine bar please -- somewhere that feels like it belongs here not a chain", upvotes:18, ts:"1 day ago"},
    {id:"bc7", text:"Venn Street would be the perfect location, already has the footfall", upvotes:13, ts:"2 days ago"},
    {id:"bc8", text:"Needs outdoor seating. The Common crowd would make this work easily", upvotes:10, ts:"3 days ago"},
    {id:"bc9", text:"Something like Sager + Wilde or P.Franco but in Clapham. Please.", upvotes:8, ts:"4 days ago"},
  ],
  "s81": [
    {id:"bc10", text:"Electric Brixton is always packed — we need our own version in SW4", upvotes:16, ts:"1 day ago"},
    {id:"bc11", text:"Near Clapham High Street station would make sense for late nights", upvotes:12, ts:"2 days ago"},
    {id:"bc12", text:"Would happily travel for this but would rather not go to Brixton every time", upvotes:7, ts:"5 days ago"},
  ],
  "s66": [
    {id:"bc13", text:"The Climbing Hangar or Boulder World — either would transform the area", upvotes:15, ts:"1 day ago"},
    {id:"bc14", text:"Needs to be accessible without a car — near a tube would be key", upvotes:11, ts:"2 days ago"},
    {id:"bc15", text:"With a decent café please. The post-climb coffee is non-negotiable", upvotes:9, ts:"3 days ago"},
  ],
  "s23": [
    {id:"bc16", text:"Notes or Redemption Roasters please — we have enough Costas", upvotes:19, ts:"1 day ago"},
    {id:"bc17", text:"Laptop friendly with good wifi — the area is crying out for it", upvotes:14, ts:"2 days ago"},
    {id:"bc18", text:"Abbeville Village would be the dream location", upvotes:10, ts:"3 days ago"},
    {id:"bc19", text:"Dog friendly essential. Half of Clapham has a dog.", upvotes:8, ts:"4 days ago"},
  ],
  "s94": [
    {id:"bc20", text:"Baz Arts or similar — proper Latin dance not just beginner salsa", upvotes:12, ts:"2 days ago"},
    {id:"bc21", text:"Evening classes essential — working people need post-6pm slots", upvotes:9, ts:"3 days ago"},
  ],
  "s89": [
    {id:"bc22", text:"Triyoga quality but local — not worth going all the way to Chelsea", upvotes:16, ts:"1 day ago"},
    {id:"bc23", text:"Hot yoga option would make this even better", upvotes:11, ts:"2 days ago"},
  ],
};

// Default seed comments for any concept not in the list above
const BRIEF_DEFAULT_COMMENTS = [
  {id:"bcd1", text:"This is exactly what the area needs — been waiting years", upvotes:8, ts:"3 days ago"},
  {id:"bcd2", text:"Location matters — somewhere walkable from the Common", upvotes:5, ts:"5 days ago"},
  {id:"bcd3", text:"Would be great if it felt independent, not like a chain rollout", upvotes:4, ts:"1 week ago"},
];

function getBriefComments(conceptId) {
  return BRIEF_SEED_COMMENTS[conceptId] || BRIEF_DEFAULT_COMMENTS;
}

// Simple keyword extractor from comment text
function extractSignals(comments, cat) {
  var brands = {};
  var locations = {};
  var attributes = {};
  var brandList = (cat && BRIEF_BRANDS_BY_CAT[cat]) ? BRIEF_BRANDS_BY_CAT[cat] : BRIEF_BRANDS;
  comments.forEach(function(c) {
    var txt = c.text.toLowerCase();
    brandList.forEach(function(b) {
      if(txt.indexOf(b.toLowerCase()) !== -1) {
        brands[b] = (brands[b]||0) + 1;
      }
    });
    BRIEF_LOCATIONS.forEach(function(l) {
      if(txt.includes(l.toLowerCase())) {
        locations[l] = (locations[l]||0) + 1;
      }
    });
    BRIEF_ATTRIBUTES.forEach(function(a) {
      if(txt.includes(a.toLowerCase())) {
        attributes[a] = (attributes[a]||0) + 1;
      }
    });
  });
  const sort = function(obj) {
    return Object.entries(obj).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  };
  return { brands: sort(brands), locations: sort(locations), attributes: sort(attributes) };
}


/* ==================================================
   THE BRIEF COMPONENT
================================================== */
/* ==================================================
   LEGAL PAGE COMPONENT
================================================== */
function LegalPage({doc, onBack}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
      {/* Sticky header */}
      <div style={{position:"sticky",top:0,zIndex:50,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onBack}
          style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0,display:"flex",alignItems:"center",gap:6}}>
          ← Back
        </button>
        <div style={{...ty.bodyMd,fontSize:14}}>{doc.title}</div>
      </div>
      {/* Content */}
      <div style={{padding:"28px 24px 80px",maxWidth:640,margin:"0 auto"}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontFamily:serif,fontSize:22,fontWeight:700,marginBottom:6,color:C.t1}}>{doc.title}</h1>
          <div style={{...ty.meta,color:C.t3}}>Last updated: {doc.updated}</div>
        </div>
        {doc.sections.map(function(sec, i){return(
          <div key={i} style={{marginBottom:20}}>
            {sec.heading&&(
              <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:8}}>{sec.heading}</div>
            )}
            <div style={{...ty.sm,color:C.t2,lineHeight:1.8}}>{sec.body}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

/* ==================================================
   REPORT MODAL COMPONENT
================================================== */
function LegalScreen({onBack}) {
  const [openDoc, setOpenDoc] = useState(null);
  if(openDoc) return <LegalPage doc={openDoc} onBack={function(){setOpenDoc(null);}}/>;
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
      <div style={{position:"sticky",top:0,zIndex:50,background:C.bg+"F5",backdropFilter:"blur(12px)",borderBottom:"1px solid "+C.line,padding:"14px 20px",display:"flex",alignItems:"center",gap:14}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
        <div style={{...ty.bodyMd,fontSize:14}}>Legal</div>
      </div>
      <div style={{padding:"24px 20px 80px",maxWidth:520,margin:"0 auto"}}>
        <div style={{marginBottom:24}}>
          <h2 style={{fontFamily:serif,fontSize:20,fontWeight:700,marginBottom:6}}>Legal documents</h2>
          <div style={{...ty.meta,color:C.t3,lineHeight:1.65}}>Tale Labs Ltd · hello@cravz.co</div>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {LEGAL_DOCS.map(function(doc,i){return(
            <button key={doc.id} onClick={function(){setOpenDoc(doc);}}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"14px 0",background:"transparent",border:"none",
                borderBottom:"1px solid "+C.line,cursor:"pointer",fontFamily:sans,textAlign:"left",width:"100%"}}>
              <span style={{...ty.sm,color:C.t1}}>{doc.title}</span>
              <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
            </button>
          );})}
        </div>
      </div>
    </div>
  );
}

function ReportModal({onClose, onSubmit}) {
  var [reason, setReason] = useState("");
  var reasons = ["Misleading","Spam","Inappropriate","Other"];
  return (
    <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:C.surface,borderRadius:"22px 22px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480}} onClick={function(e){e.stopPropagation();}}>
        <div style={{...ty.h3,marginBottom:4}}>Report this content</div>
        <div style={{...ty.meta,color:C.t3,marginBottom:20}}>Help us maintain data quality and trust.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {reasons.map(function(r){
            var on = reason===r;
            return(
              <button key={r} onClick={function(){setReason(r);}}
                style={{padding:"11px 14px",borderRadius:12,textAlign:"left",width:"100%",cursor:"pointer",fontFamily:sans,
                  background:on?C.coral+"12":C.surface2, border:"1px solid "+(on?C.coral+"50":C.line)}}>
                <span style={{...ty.sm,color:on?C.t1:C.t2,fontWeight:on?600:400}}>{r}</span>
              </button>
            );
          })}
        </div>
        <button onClick={function(){if(reason){onSubmit(reason);onClose();}}}
          disabled={!reason}
          style={{width:"100%",padding:"13px",background:reason?C.coral:C.surface2,color:reason?"#fff":C.t3,
            border:"none",borderRadius:14,cursor:reason?"pointer":"default",fontFamily:sans,fontWeight:700,fontSize:14,marginBottom:10}}>
          Submit report
        </button>
        <button onClick={onClose}
          style={{width:"100%",padding:"10px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,fontSize:13,color:C.t3}}>
          Cancel
        </button>
      </div>
    </div>
  );
}


function TheBrief({coinAlloc, user}) {
  var allCatalogueItems = SERVICES;
  var votedItems = allCatalogueItems.filter(function(i){ return (coinAlloc[i.id]||0)>0; });
  var feedItems = FEED_WITH_METRICS;
  var selIdDefault = votedItems.length>0 ? votedItems[0].id : null;

  var [selId, setSelId] = useState(selIdDefault);
  var [comments, setComments] = useState(function(){
    var seed = getBriefComments(selIdDefault);
    return seed.map(function(c){ return Object.assign({},c,{userUpvoted:false}); });
  });
  var [userUpvoted, setUserUpvoted] = useState({});
  var [showInput, setShowInput] = useState(false);
  var [inputText, setInputText] = useState("");
  var [locText, setLocText] = useState("");
  var [showLocSugg, setShowLocSugg] = useState(false);
  var [showBrandSugg, setShowBrandSugg] = useState(false);
  var [brandSugg, setBrandSugg] = useState([]);
  var [submitted, setSubmitted] = useState(false);
  var [reportTarget, setReportTarget] = useState(null);

  useEffect(function(){
    var seed = getBriefComments(selId);
    setComments(seed.map(function(c){ return Object.assign({},c,{userUpvoted:false}); }));
    setUserUpvoted({});
    setShowInput(false);
    setInputText("");
    setLocText("");
    setBrandSugg([]);
    setShowBrandSugg(false);
  }, [selId]);

  function handleInputChange(val) {
    setInputText(val);
    if(val.length < 2) { setBrandSugg([]); setShowBrandSugg(false); return; }
    var words = val.split(/\s+/);
    var last = words[words.length-1].toLowerCase();
    if(last.length < 2) { setBrandSugg([]); setShowBrandSugg(false); return; }
    var catBrands = selItem && BRIEF_BRANDS_BY_CAT[selItem.cat] ? BRIEF_BRANDS_BY_CAT[selItem.cat] : BRIEF_BRANDS;
    var matches = catBrands.filter(function(b){ return b.toLowerCase().indexOf(last)===0; }).slice(0,4);
    setBrandSugg(matches);
    setShowBrandSugg(matches.length > 0);
  }

  function selectBrand(brand) {
    var words = inputText.split(/\s+/);
    words[words.length-1] = brand;
    setInputText(words.join(" ") + " ");
    setShowBrandSugg(false);
    setBrandSugg([]);
  }

  function handleUpvote(cid) {
    if(userUpvoted[cid]) return;
    setComments(function(prev){ return prev.map(function(c){ return c.id===cid ? Object.assign({},c,{upvotes:c.upvotes+1}) : c; }); });
    setUserUpvoted(function(prev){ return Object.assign({},prev,{[cid]:true}); });
  }

  function handleSubmit() {
    if(!inputText.trim()) return;
    var nc = {id:"u_"+Date.now(), text:inputText.trim()+(locText.trim()?" — "+locText.trim():""), upvotes:0, userUpvoted:false, ts:"Just now", isOwn:true};
    setComments(function(prev){ return [nc].concat(prev); });
    setInputText(""); setLocText(""); setShowInput(false); setSubmitted(true);
    setTimeout(function(){ setSubmitted(false); }, 3000);
  }

  var selItem = selId ? (allCatalogueItems.find(function(i){return i.id===selId;})||feedItems.find(function(i){return i.id===selId;})) : null;
  var cc = selItem ? (CAT_CFG[selItem.cat]||{color:C.coral,bg:C.surface2,label:"",emoji:""}) : {color:C.coral,bg:C.surface2,label:"",emoji:""};
  var hasVoted = selId ? (coinAlloc[selId]||0) > 0 : false;
  var sorted = comments.slice().sort(function(a,b){ return b.upvotes - a.upvotes; });
  var signals = extractSignals(comments, selItem ? selItem.cat : null);

  return (
    <div style={{padding:"20px 16px 100px",maxWidth:680,margin:"0 auto"}}>
      {reportTarget&&<ReportModal onClose={function(){setReportTarget(null);}} onSubmit={function(reason){console.log("Report:",reportTarget,reason);setReportTarget(null);}}/>}
      <div style={{marginBottom:20}}>
        <h2 style={{...ty.h2,marginBottom:4}}>The Brief</h2>
        <div style={{...ty.body,color:C.t3}}>Residents who backed a concept shape what it should look like.</div>
      </div>

      {votedItems.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{...ty.label,marginBottom:8}}>Your backed concepts</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
            {votedItems.map(function(item){
              var isel = item.id===selId;
              var icc = CAT_CFG[item.cat]||{color:C.coral};
              return(
                <button key={item.id} onClick={function(){setSelId(item.id);}}
                  style={{flexShrink:0,padding:"9px 16px",borderRadius:20,
                    background:isel?icc.color:C.surface,
                    border:"1px solid "+(isel?icc.color:C.line),
                    color:isel?"#fff":C.t1,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:isel?700:500,
                    display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:15}}>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {votedItems.length===0&&(
        <div style={{padding:"20px",background:C.surface,border:"1px dashed "+C.line,borderRadius:14,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:32,marginBottom:8}}>🗳️</div>
          <div style={{...ty.bodyMd,marginBottom:4}}>No votes placed yet</div>
          <div style={{...ty.sm,color:C.t3,lineHeight:1.6}}>Place your coins on concepts you want in your area to join the conversation and shape what gets built.</div>
        </div>
      )}

      {selItem&&(
        <div>
          <div style={{background:"linear-gradient(135deg,"+cc.color+"14 0%,"+C.surface+" 100%)",
            border:"1px solid "+cc.color+"25",borderRadius:16,padding:"16px 18px",marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:cc.bg||C.surface2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{selItem.emoji}</div>
              <div style={{flex:1}}>
                <div style={{...ty.bodyMd,fontSize:15,marginBottom:2}}>{selItem.label}</div>
                <div style={{...ty.meta,color:C.t3}}>{selItem.voters} voices · {comments.length} brief contributions</div>
              </div>
              {hasVoted&&<div style={{padding:"4px 10px",borderRadius:20,background:cc.color+"22",border:"1px solid "+cc.color+"40"}}>
                <span style={{...ty.meta,color:cc.color,fontWeight:700}}>You backed this</span>
              </div>}
            </div>
          </div>

          {(signals.brands.length>0||signals.locations.length>0)&&(
            <div style={{marginBottom:20}}>
              <div style={{...ty.label,marginBottom:10}}>Patterns emerging</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {signals.brands.slice(0,3).map(function(b){return(
                  <div key={b[0]} style={{padding:"5px 12px",borderRadius:20,background:C.purple+"18",border:"1px solid "+C.purple+"30",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{...ty.meta,color:C.purple,fontWeight:600}}>{b[0]}</span>
                    <span style={{...ty.meta,color:C.t3}}>mentioned {b[1]}×</span>
                  </div>
                );})}
                {signals.locations.slice(0,2).map(function(l){return(
                  <div key={l[0]} style={{padding:"5px 12px",borderRadius:20,background:C.amber+"18",border:"1px solid "+C.amber+"30",display:"flex",alignItems:"center",gap:6}}>
                    <MapPin size={10} color={C.amber}/>
                    <span style={{...ty.meta,color:C.amber,fontWeight:600}}>{l[0]}</span>
                  </div>
                );})}
              </div>
            </div>
          )}

          {!hasVoted ? (
            <div style={{marginBottom:20}}>
              <div style={{background:C.surface,border:"1px solid "+C.line,borderRadius:16,overflow:"hidden"}}>
                <div style={{padding:"14px 16px",filter:"blur(4px)",pointerEvents:"none",userSelect:"none",opacity:0.5}}>
                  {sorted.slice(0,3).map(function(c){return(
                    <div key={c.id} style={{background:C.surface2,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                      <div style={{...ty.sm,color:C.t1,marginBottom:4}}>{c.text}</div>
                      <div style={{...ty.meta,color:C.t3}}>👍 {c.upvotes}</div>
                    </div>
                  );})}
                </div>
                <div style={{padding:"16px 18px",borderTop:"1px solid "+C.line,textAlign:"center",background:C.surface2}}>
                  <Lock size={16} color={C.t3} style={{margin:"0 auto 8px"}}/>
                  <div style={{...ty.bodyMd,fontSize:13,marginBottom:4}}>Vote to join the conversation</div>
                  <div style={{...ty.meta,color:C.t3,marginBottom:12,lineHeight:1.6}}>{sorted.length} residents have shared their brief for this concept.</div>
                  <div style={{...ty.meta,color:C.t3,fontSize:10}}>Place your coins on {selItem.label} to read and contribute.</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{...ty.label}}>What residents want from it</div>
                <div style={{...ty.meta,color:C.t3}}>{sorted.length} voices</div>
              </div>
              {submitted&&(
                <div style={{padding:"10px 14px",background:C.green+"18",border:"1px solid "+C.green+"30",borderRadius:10,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <Check size={14} color={C.green}/>
                  <span style={{...ty.sm,color:C.green}}>Your voice has been added to the brief</span>
                </div>
              )}
              {!showInput ? (
                <button onClick={function(){setShowInput(true);}}
                  style={{width:"100%",padding:"12px 14px",borderRadius:12,marginBottom:14,
                    background:cc.color+"12",border:"1px solid "+cc.color+"30",
                    color:cc.color,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:500,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <Plus size={14} color={cc.color}/>
                  Add your voice to the brief
                </button>
              ) : (
                <div style={{background:C.surface,border:"1px solid "+cc.color+"40",borderRadius:14,padding:"14px",marginBottom:14}}>
                  <div style={{...ty.label,color:cc.color,marginBottom:10}}>What would you want from this?</div>
                  <div style={{position:"relative",marginBottom:10}}>
                    <textarea value={inputText} onChange={function(e){handleInputChange(e.target.value);}}
                      placeholder={
                      selItem && selItem.cat === "food" ? "e.g. Dishoom vibes but local · near the Common · great natural wine list" :
                      selItem && selItem.cat === "fitness" ? "e.g. Barry's-style classes · early morning slots · proper changing rooms" :
                      selItem && selItem.cat === "kids" ? "e.g. Gambado-style · soft play plus decent coffee for parents" :
                      selItem && selItem.cat === "health" ? "e.g. Glow Bar type facials · members pricing · Venn Street location" :
                      selItem && selItem.cat === "retail" ? "e.g. Labour and Wait feel · independent · curated homeware" :
                      selItem && selItem.cat === "entertain" ? "e.g. intimate like Jazz Cafe · proper sound · local acts" :
                      "e.g. something independent · near the Common · premium not a chain"
                    }
                      rows={3}
                      style={{width:"100%",background:C.bg,border:"1px solid "+C.line,
                        borderRadius:10,padding:"10px 12px",color:C.t1,fontSize:13,
                        fontFamily:sans,outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
                    {showBrandSugg&&(
                      <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,
                        background:C.surface,border:"1px solid "+C.line,borderRadius:10,marginTop:4,overflow:"hidden"}}>
                        {brandSugg.map(function(b){return(
                          <button key={b} onClick={function(){selectBrand(b);}}
                            style={{width:"100%",padding:"9px 14px",background:"transparent",border:"none",
                              borderBottom:"1px solid "+C.line,cursor:"pointer",fontFamily:sans,textAlign:"left",
                              display:"flex",alignItems:"center",gap:8}}>
                            <Zap size={11} color={C.amber}/>
                            <span style={{...ty.sm,color:C.t1}}>{b}</span>
                          </button>
                        );})}
                      </div>
                    )}
                  </div>
                  <div style={{position:"relative",marginBottom:14}}>
                    <input value={locText}
                      onChange={function(e){setLocText(e.target.value);setShowLocSugg(e.target.value.length>0);}}
                      placeholder="Suggested location (optional)"
                      style={{width:"100%",background:C.bg,border:"1px solid "+C.line,
                        borderRadius:10,padding:"9px 12px",color:C.t1,fontSize:12,
                        fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
                    {showLocSugg&&(
                      <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:20,
                        background:C.surface,border:"1px solid "+C.line,borderRadius:10,marginTop:4,overflow:"hidden"}}>
                        {BRIEF_LOCATIONS.filter(function(l){return l.toLowerCase().indexOf(locText.toLowerCase())!==-1;}).slice(0,5).map(function(l){return(
                          <button key={l} onClick={function(){setLocText(l);setShowLocSugg(false);}}
                            style={{width:"100%",padding:"9px 14px",background:"transparent",border:"none",
                              borderBottom:"1px solid "+C.line,cursor:"pointer",fontFamily:sans,textAlign:"left",
                              display:"flex",alignItems:"center",gap:8}}>
                            <MapPin size={11} color={C.t3}/>
                            <span style={{...ty.sm,color:C.t1}}>{l}</span>
                          </button>
                        );})}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={function(){setShowInput(false);setInputText("");setLocText("");setBrandSugg([]);}}
                      style={{padding:"10px 16px",borderRadius:10,background:"transparent",
                        border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13}}>
                      Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!inputText.trim()}
                      style={{flex:1,padding:"10px",borderRadius:10,
                        background:inputText.trim()?cc.color:C.surface,
                        border:"1px solid "+(inputText.trim()?cc.color:C.line),
                        color:inputText.trim()?"#fff":C.t3,
                        cursor:inputText.trim()?"pointer":"default",
                        fontFamily:sans,fontWeight:600,fontSize:13}}>
                      Add to brief →
                    </button>
                  </div>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {sorted.map(function(c){
                  var isPopular = c.upvotes>=8;
                  var alreadyUp = userUpvoted[c.id];
                  return(
                    <div key={c.id} style={{background:c.isOwn?cc.color+"0A":C.surface,
                      border:"1px solid "+(isPopular?cc.color+"40":C.line),
                      borderRadius:12,padding:"12px 14px",position:"relative"}}>
                      {isPopular&&(
                        <div style={{position:"absolute",top:-1,right:12,background:cc.color,borderRadius:"0 0 8px 8px",padding:"1px 8px"}}>
                          <span style={{...ty.meta,color:"#fff",fontSize:9,fontWeight:700}}>POPULAR IDEA</span>
                        </div>
                      )}
                      <div style={{...ty.sm,color:C.t1,lineHeight:1.55,marginBottom:8,paddingTop:isPopular?8:0}}>{c.text}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{...ty.meta,color:C.t3}}>{c.ts}</span>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button onClick={function(){handleUpvote(c.id);}} disabled={alreadyUp}
                          style={{display:"flex",alignItems:"center",gap:5,background:"transparent",
                            border:"1px solid "+(alreadyUp?cc.color:C.line),
                            borderRadius:20,padding:"3px 10px",cursor:alreadyUp?"default":"pointer",
                            color:alreadyUp?cc.color:C.t3,fontFamily:sans}}>
                          <span style={{fontSize:12}}>👍</span>
                          <span style={{...ty.meta,fontWeight:alreadyUp?700:400,color:alreadyUp?cc.color:C.t3}}>{c.upvotes}</span>
                        </button>
                        <button onClick={function(){setReportTarget(c.id);}}
                          style={{...ty.meta,color:C.t3,background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,padding:"3px 6px",borderRadius:20,fontSize:10}}>
                          Report
                        </button>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const BIZ_TIERS_WEB = [
  {
    id:"free", name:"Free", price:"£0", period:"forever",
    color:C.t3, badge:null,
    headline:"See what your area wants",
    desc:"Get a feel for local demand before committing.",
    features:["Top 20 ranked concepts","Voice count per concept","Demand level (High / Medium / Low)","1 postcode area"],
    locked:["Spend & frequency data","Revenue estimates","Demographics","The Brief insights"],
  },
  {
    id:"builder_old", name:"Builder", price:"£149", period:"30 days",
    color:C.amber, badge:null,
    headline:"Validate your concept",
    desc:"Core demand data to de-risk your location decision.",
    features:["All concepts, full rankings","Momentum trends","Avg spend & visit frequency","Catchment radius","Up to 3 areas"],
    locked:["Revenue estimates","Demographics","The Brief insights","Pre-launch data"],
  },
  {
    id:"pro", name:"Pro", price:"£249", period:"/month",
    color:C.coral, badge:"Most popular",
    headline:"Build your business case",
    desc:"Everything you need to convince yourself — and your investors.",
    features:["Everything in Builder","Monthly & annual revenue estimates","Full demographic profile","Demand leakage rate","Attribute tag breakdown","The Brief — resident intent signals","Pre-launch survey data"],
    locked:[],
  },
  {
    id:"investor_old", name:"Investor", price:"£499", period:"/month",
    color:C.purple, badge:null,
    headline:"Multi-site intelligence",
    desc:"For operators and investors evaluating multiple locations.",
    features:["Everything in Pro","Up to 5 areas","Team seats (3 included)","Data export (CSV)","Quarterly briefing call"],
    locked:[],
  },
  {
    id:"enterprise_old", name:"Enterprise", price:"£6,000+", period:"/year",
    color:C.green, badge:"For councils & developers",
    headline:"Borough-level demand intelligence",
    desc:"Full data access, API, and white-label options.",
    features:["Unlimited areas & concepts","Unlimited team seats","API access","White-label reporting","Custom data exports","Dedicated account manager"],
    locked:[],
  },
];

// Mock submitted leads

const MOCK_LEADS = [
  {id:"l1", name:"Sarah Chen", biz:"The Clap Coffee Co.", email:"sarah@clapcoffee.com", type:"Operator", area:"SW4", tier:"Pro", status:"pending", ts:"2 hours ago"},
  {id:"l2", name:"James Wright", biz:"JW Property Group", email:"james@jwproperty.co.uk", type:"Developer", area:"SW9, SW4", tier:"Enterprise", status:"approved", ts:"1 day ago"},
  {id:"l3", name:"Priya Kapoor", biz:"Fit London Group", email:"priya@fitlondon.co.uk", type:"Operator", area:"SW4", tier:"builder", status:"pending", ts:"2 days ago"},
];


function BizRequestPage({onBack, onDemoBiz, onFreeAccess}) {
  var [step, setStep] = useState("pricing");
  var [form, setForm] = useState({
    name:"", email:"", biz:"", type:"", stage:"", areas:[], reason:"", tier:"free"
  });

  function setField(k, v) {
    setForm(function(f){ return Object.assign({}, f, {[k]:v}); });
  }

  var isFree = form.tier === "free";
  var canSubmit = form.name.trim() && form.email.trim() && form.biz.trim() && form.type && form.areas.length > 0;

  var typeOpts = [
    {id:"operator",  label:"Business operator",  sub:"Opening or running a business"},
    {id:"investor",  label:"Investor",            sub:"Backing businesses or evaluating deals"},
    {id:"agent",     label:"Property agent",      sub:"Matching tenants to commercial spaces"},
    {id:"developer", label:"Developer / council", sub:"Building sites or planning strategy"},
    {id:"other",     label:"Just exploring",      sub:"Curious about local demand data"},
  ];
  var stageOpts = [
    "Actively researching a location",
    "Evaluating a specific site",
    "Planning to open in 6-12 months",
    "Already open — expanding",
    "Investor / feasibility only",
  ];
  var areaOpts = ["SW4","SW9","SW11","SW2","SW8","SW12","SE5","SE1","SW16","SW17","SW18","SW19"];

  var pricingCards = [
    {
      id:"free", name:"Free", price:"£0", period:"",
      color:C.green, highlight:false,
      sub:"See what your area is missing",
      features:["1 area included","Top concepts ranking","Demand level (High / Medium / Low)","Voice count"],
    },
    {
      id:"builder", name:"Builder", price:"£149", period:"30 days access",
      color:C.purple, highlight:false,
      sub:"Validate your concept before you commit",
      features:["3 areas included","Full concept rankings","What demand is growing vs fading","How often people will come","How much they will spend","How far people will travel","Compare multiple concepts"],
      footer:"Requires approval",
    },
    {
      id:"investor", name:"Investor", price:"£399", period:"90 days access",
      color:C.coral, highlight:true,
      sub:"Know if it is worth opening before you spend a pound",
      features:["Everything in Builder, plus:","Revenue potential (monthly and yearly)","Customer demographics","Demand leakage — unmet demand leaving the area","What people actually care about","The Brief — what locals are asking for","Pre-launch survey data","Multi-area comparison"],
      footer:"Requires approval",
    },
  ];

  // ── PRICING PAGE ─────────────────────────────────────────────
  if(step === "pricing") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
        <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
        </div>
        <div style={{padding:"32px 20px 40px",maxWidth:480,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <h1 style={{fontFamily:serif,fontSize:26,fontWeight:700,lineHeight:1.2,marginBottom:10,color:C.t1}}>Understand demand<br/>before you invest</h1>
            <div style={{...ty.body,color:C.t3,lineHeight:1.6}}>Start with free access. Unlock deeper insights inside.</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
            {pricingCards.map(function(card){return(
              <div key={card.id} style={{
                background:card.highlight?card.color+"0D":C.surface,
                border:"1px solid "+(card.highlight?card.color+"50":C.line),
                borderRadius:18, padding:"20px 18px", position:"relative",
                boxShadow:card.highlight?"0 4px 24px "+card.color+"18":"none",
              }}>
                {card.highlight&&(
                  <div style={{position:"absolute",top:-1,right:20,background:card.color,borderRadius:"0 0 10px 10px",padding:"3px 12px"}}>
                    <span style={{...ty.meta,color:"#fff",fontWeight:700,fontSize:10}}>MOST POPULAR</span>
                  </div>
                )}
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:serif,fontSize:18,fontWeight:700,color:card.highlight?card.color:C.t1,marginBottom:2}}>{card.name}</div>
                    <div style={{...ty.meta,color:C.t3,lineHeight:1.5}}>{card.sub}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                    <div style={{fontFamily:serif,fontSize:20,fontWeight:700,color:card.color}}>{card.price}</div>
                    {card.period&&<div style={{...ty.meta,color:C.t3,fontSize:10}}>{card.period}</div>}
                  </div>
                </div>
                <div style={{borderTop:"1px solid "+C.line,paddingTop:12,marginTop:4}}>
                  {card.features.map(function(f,fi){return(
                    <div key={fi} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <div style={{width:14,height:14,borderRadius:"50%",background:card.color+"20",border:"1px solid "+card.color+"40",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                        <div style={{width:4,height:4,borderRadius:"50%",background:card.color}}/>
                      </div>
                      <span style={{...ty.meta,color:C.t2,lineHeight:1.5}}>{f}</span>
                    </div>
                  );})}
                </div>
                {card.footer&&(
                  <div style={{...ty.meta,color:C.t3,fontSize:10,marginTop:10,paddingTop:10,borderTop:"1px solid "+C.line}}>{card.footer}</div>
                )}
              </div>
            );})}
          </div>
          <button onClick={function(){setStep("form");}}
            style={{width:"100%",padding:"16px",background:C.coral,color:"#fff",border:"none",borderRadius:16,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:16,marginBottom:10}}>
            Get access →
          </button>
          <div style={{...ty.meta,color:C.t3,textAlign:"center",lineHeight:1.6}}>Start free. Upgrade inside when you need deeper insights.</div>
          {onDemoBiz&&(
            <button onClick={onDemoBiz}
              style={{width:"100%",marginTop:14,padding:"10px",background:"transparent",border:"1px dashed "+C.line,borderRadius:12,cursor:"pointer",fontFamily:sans,fontSize:12,color:C.t3}}>
              ⚡ Demo: jump straight to business dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── PROFILE + TIER FORM ──────────────────────────────────────
  if(step === "form") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:sans,color:C.t1}}>
        <div style={{padding:"20px 20px 0",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={function(){setStep("pricing");}} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,padding:0}}>← Back</button>
        </div>
        <div style={{padding:"24px 20px 60px",maxWidth:480,margin:"0 auto"}}>
          <h2 style={{fontFamily:serif,fontSize:22,fontWeight:700,marginBottom:6}}>Create your profile</h2>
          <div style={{...ty.body,color:C.t3,marginBottom:24,lineHeight:1.6}}>Tell us about yourself. Free access is instant. Builder and Investor tiers are reviewed before access is granted.</div>

          {/* Name, Email, Business */}
          {[
            {k:"name",  label:"Your name",              ph:"Jane Smith"},
            {k:"email", label:"Email",                  ph:"jane@example.com"},
            {k:"biz",   label:"Business or organisation",ph:"The Nest SW4 / JW Property Group"},
          ].map(function(f){return(
            <div key={f.k} style={{marginBottom:16}}>
              <div style={{...ty.label,marginBottom:6}}>{f.label}</div>
              <input value={form[f.k]} onChange={function(e){setField(f.k,e.target.value);}}
                placeholder={f.ph}
                style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:12,padding:"12px 14px",color:C.t1,fontSize:14,fontFamily:sans,outline:"none",boxSizing:"border-box"}}/>
            </div>
          );})}

          {/* Account type */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:8}}>I am a</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {typeOpts.map(function(opt){
                var on = form.type===opt.id;
                return(
                  <button key={opt.id} onClick={function(){setField("type",opt.id);}}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,
                      background:on?C.coral+"12":C.surface, border:"1px solid "+(on?C.coral+"50":C.line),
                      cursor:"pointer",fontFamily:sans,textAlign:"left",width:"100%"}}>
                    <div style={{flex:1}}>
                      <div style={{...ty.sm,color:C.t1,fontWeight:on?600:400}}>{opt.label}</div>
                      <div style={{...ty.meta,color:C.t3,marginTop:1}}>{opt.sub}</div>
                    </div>
                    {on&&<div style={{width:8,height:8,borderRadius:"50%",background:C.coral,flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:8}}>Where are you in the process?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {stageOpts.map(function(s){
                var on = form.stage===s;
                return(
                  <button key={s} onClick={function(){setField("stage",s);}}
                    style={{padding:"10px 14px",borderRadius:10,textAlign:"left",width:"100%",cursor:"pointer",
                      fontFamily:sans, background:on?C.purple+"12":C.surface,
                      border:"1px solid "+(on?C.purple+"50":C.line)}}>
                    <span style={{...ty.sm,color:on?C.t1:C.t2,fontWeight:on?600:400}}>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Areas */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:6}}>Areas you are interested in</div>
            <div style={{...ty.meta,color:C.t3,marginBottom:10}}>Select the postcodes you want to explore.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {areaOpts.map(function(a){
                var on = form.areas.indexOf(a)!==-1;
                return(
                  <button key={a} onClick={function(){
                    setField("areas", on ? form.areas.filter(function(x){return x!==a;}) : form.areas.concat([a]));
                  }}
                    style={{padding:"8px 14px",borderRadius:20,cursor:"pointer",fontFamily:sans,fontSize:13,
                      background:on?C.coral+"15":C.surface, border:"1px solid "+(on?C.coral+"60":C.line),
                      color:on?C.t1:C.t3, fontWeight:on?600:400}}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tier selection */}
          <div style={{marginBottom:16}}>
            <div style={{...ty.label,marginBottom:8}}>Access level</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {id:"free",     label:"Free",     desc:"Instant access. Core demand data for 1 area.",                    color:C.green,  note:"Instant"},
                {id:"builder",  label:"Builder",  desc:"£149 — 30 days. Full validation data for 3 areas.",              color:C.purple, note:"Requires approval"},
                {id:"investor", label:"Investor", desc:"£399 — 90 days. Full decision data including revenue and demographics.", color:C.coral, note:"Requires approval"},
              ].map(function(opt){
                var on = form.tier===opt.id;
                return(
                  <button key={opt.id} onClick={function(){setField("tier",opt.id);}}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderRadius:14,
                      background:on?opt.color+"12":C.surface,
                      border:"1px solid "+(on?opt.color+"50":C.line),
                      cursor:"pointer",fontFamily:sans,textAlign:"left",width:"100%"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{...ty.sm,color:on?opt.color:C.t1,fontWeight:700}}>{opt.label}</span>
                        <span style={{...ty.meta,fontSize:9,color:on?opt.color:C.t3,background:on?opt.color+"15":C.surface2,padding:"1px 7px",borderRadius:20,border:"1px solid "+(on?opt.color+"30":C.line)}}>{opt.note}</span>
                      </div>
                      <div style={{...ty.meta,color:C.t3,lineHeight:1.5}}>{opt.desc}</div>
                    </div>
                    {on&&<div style={{width:8,height:8,borderRadius:"50%",background:opt.color,flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div style={{marginBottom:24}}>
            <div style={{...ty.label,marginBottom:6}}>
              What are you trying to decide?
              <span style={{color:C.t3,fontWeight:400,textTransform:"none",fontSize:10,letterSpacing:0}}> (optional)</span>
            </div>
            <textarea value={form.reason} onChange={function(e){setField("reason",e.target.value);}}
              placeholder="e.g. Evaluating two sites in Clapham for a wine bar. Want to understand footfall patterns and competition."
              rows={3}
              style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:12,
                padding:"12px 14px",color:C.t1,fontSize:13,fontFamily:sans,
                outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
          </div>

          {/* CTA — different outcome based on tier */}
          <button
            onClick={function(){
              if(!canSubmit) return;
              if(form.tier==="free" && onFreeAccess) {
                onFreeAccess({
                  type:"business", tier:"free",
                  areas:form.areas.slice(0,1),
                  email:form.email,
                  name:form.name,
                  biz:form.biz,
                  acctType:form.type||"business",
                  stage:form.stage,
                });
              } else {
                setStep("submitted");
              }
            }}
            disabled={!canSubmit}
            style={{width:"100%",padding:"15px",
              background:canSubmit?C.coral:C.surface2,
              color:canSubmit?"#fff":C.t3,
              border:"none",borderRadius:14,
              cursor:canSubmit?"pointer":"default",
              fontFamily:sans,fontWeight:700,fontSize:15,transition:"all .15s"}}>
            {isFree ? "Enter for free →" : "Request access →"}
          </button>
          {isFree&&canSubmit&&(
            <div style={{...ty.meta,color:C.green,textAlign:"center",marginTop:8}}>You will be taken straight in — no approval needed.</div>
          )}
          {!isFree&&canSubmit&&(
            <div style={{...ty.meta,color:C.t3,textAlign:"center",marginTop:8}}>We will review your request and get back to you within 24 hours.</div>
          )}
          {!canSubmit&&(
            <div style={{...ty.meta,color:C.t3,textAlign:"center",marginTop:8}}>Fill in your name, email, business and select at least one area to continue.</div>
          )}
        </div>
      </div>
    );
  }

  // ── SUBMITTED (paid tiers only) ──────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",fontFamily:sans,textAlign:"center"}}>
      <div style={{width:72,height:72,borderRadius:20,background:C.green+"18",border:"1px solid "+C.green+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:24}}>✓</div>
      <h2 style={{...ty.h2,marginBottom:12}}>Request received</h2>
      <div style={{...ty.body,color:C.t3,maxWidth:300,lineHeight:1.65,marginBottom:32}}>
        We will review your profile and send you access within 24 hours.
      </div>
      <button onClick={onBack}
        style={{padding:"13px 28px",background:C.coral,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:15}}>
        Back to home
      </button>
    </div>
  );
}
function BottomNav({active,onChange}){
  const tabs=[{id:"feed",Icon:Home,l:"Feed"},{id:"vote",Icon:Lightbulb,l:"Vote"},{id:"brief",Icon:FileText,l:"Brief"},{id:"insights",Icon:BarChart2,l:"Insights"},{id:"notifs",Icon:Bell,l:"Updates",badge:ALL_NOTIFS.length},{id:"profile",Icon:User,l:"Profile"}];
  return <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:`${C.bg}F6`,backdropFilter:"blur(14px)",borderTop:`1px solid ${C.line}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,10px)"}}>{tabs.map(t=>{const {id,Icon,l}=t;const on=active===id;return <button key={id} onClick={()=>onChange(id)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative"}}><Icon size={20} color={on?C.coral:C.t3} strokeWidth={on?2:1.5}/>{t.badge>0&&!on&&<div style={{position:"absolute",top:6,right:"24%",width:15,height:15,borderRadius:"50%",background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{t.badge}</div>}<span style={{...ty.tab,color:on?C.coral:C.t3,fontSize:10}}>{l}</span>{on&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.coral}}/>}</button>;})}</div>;
}

/* ==================================================
   ROOT
================================================== */
export default function CravzApp(){
  useEffect(function(){
    if(document.getElementById("cravz-fonts")) return;
    var s=document.createElement("style"); s.id="cravz-fonts"; s.textContent=FONT_CSS;
    document.head.appendChild(s);
  },[]);
  useEffect(function(){
    if(document.getElementById("cravz-web")) return;
    var s=document.createElement("style"); s.id="cravz-web";
    s.textContent=".cravz-main{max-width:480px;margin:0 auto;}.cravz-content{padding:0;}.cravz-top-bar{display:block;}@media(min-width:768px){.cravz-sidebar{display:flex !important;}.cravz-main{margin-left:240px !important;max-width:none !important;width:auto !important;min-height:100vh;}.cravz-bottom-nav{display:none !important;}.cravz-content{max-width:none !important;width:auto;margin:0;padding:16px 32px;}.cravz-top-bar{display:none !important;}}";
    document.head.appendChild(s);
  },[]);

  const [session,  setSession]  = useState(function(){try{var s=sessionStorage.getItem("cravz_v15");return s?JSON.parse(s):null;}catch(e){return null;}});
  const [authRoute,setAuthRoute]= useState("landing");
  const [userType, setUserType] = useState(null);
  const [tab,      setTab]      = useState("feed");
  const [voteItem, setVoteItem] = useState(null);
  const [isSuggest,setIsSuggest]= useState(false);
  const [coinAlloc,setCoinAlloc]= useState({});
  const [itemMeta, setItemMeta] = useState({});
  const [modQueue, setModQueue] = useState([]);

  useEffect(function(){
    try{
      if(session) sessionStorage.setItem("cravz_v15",JSON.stringify(session));
      else sessionStorage.removeItem("cravz_v15");
    }catch(e){}
  },[session]);

  function openVote(suggest,item){
    setIsSuggest(suggest||false);
    setVoteItem(item||null);
    setTab("vote");
  }
  useEffect(function(){
    window.__cravzOnSuggest=function(s){
      setModQueue(function(q){
        return q.concat([Object.assign({},s,{id:"sug_"+Date.now(),status:"pending",ts:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"})})]);
      });
    };
  },[]);

  function handleDone(result){setSession(result);setTab("feed");}
  function handleLogout(){setSession(null);setAuthRoute("landing");setCoinAlloc({});setItemMeta({});}
  function setUser(updater){
    setSession(function(s){
      var newUser = typeof updater==="function" ? updater(s&&s.user) : updater;
      return Object.assign({},s,{user:newUser});
    });
  }

  if(!session){
    if(authRoute==="landing") return <Landing
  onResident={function(){setUserType("resident");setAuthRoute("auth");}}
  onBusiness={function(){setUserType("business");setAuthRoute("auth");}}
  onBizRequest={function(){setAuthRoute("bizrequest");}}
/>;
    if(authRoute==="bizrequest") return <BizRequestPage
  onBack={function(){setAuthRoute("landing");}}
  onDemoBiz={function(){setSession({type:"business",tier:"investor",areas:["SW4","SW9"],email:"demo@cravz.co",acctType:"business",name:"Demo User",biz:"Cravz Demo Co.",stage:"Actively researching a location"});}}
  onFreeAccess={function(sess){setSession(sess);}}
/>;
    return <AuthFlow userType={userType} onBack={function(){setAuthRoute("landing");}} onDone={handleDone}/>;
  }

  if(session.type==="business") return <BizDashboard session={session} onLogout={handleLogout} onUpdateSession={function(s){setSession(s);}}/>;

  var user=session.user||{postcode:"SW4"};
  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.t1,fontFamily:sans,position:"relative"}}>
      {/* Desktop sidebar */}
      <div className="cravz-sidebar" style={{display:"none",position:"fixed",top:0,left:0,bottom:0,width:240,background:C.surface,borderRight:"1px solid "+C.line,flexDirection:"column",zIndex:50,padding:"24px 0"}}>
        <div style={{padding:"0 20px 24px",borderBottom:"1px solid "+C.line,marginBottom:16}}>
          <CravzLogo size={28}/>
          <div style={{...ty.meta,color:C.t3,marginTop:4}}>{user.postcode}</div>
        </div>
        {[
          {id:"feed",    Icon:Home,      l:"Feed"},
          {id:"vote",    Icon:Lightbulb, l:"Vote"},
          {id:"brief",   Icon:FileText,  l:"The Brief"},
          {id:"insights",Icon:BarChart2, l:"Insights"},
          {id:"notifs",  Icon:Bell,      l:"Updates"},
          {id:"profile", Icon:User,      l:"Profile"},
        ].map(function(t){
          var on=tab===t.id;
          var TIcon=t.Icon;
          return (
            <button key={t.id} onClick={function(){if(t.id==="vote"){openVote(true);}else{setTab(t.id);}}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",background:on?C.coral+"14":"transparent",border:"none",borderLeft:"3px solid "+(on?C.coral:"transparent"),cursor:"pointer",fontFamily:sans,color:on?C.coral:C.t2,fontSize:13,fontWeight:on?600:400,width:"100%",textAlign:"left"}}>
              <TIcon size={16} color={on?C.coral:C.t3}/>
              {t.l}
              {t.id==="notifs"&&ALL_NOTIFS.length>0&&<div style={{marginLeft:"auto",width:18,height:18,borderRadius:"50%",background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{ALL_NOTIFS.length}</div>}
            </button>
          );
        })}
        <div style={{marginTop:"auto",padding:"16px 20px",borderTop:"1px solid "+C.line}}>
          <button onClick={function(){setSession(null);}} style={{width:"100%",padding:"10px",borderRadius:10,background:C.surface2,border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:400}}>
            Sign out
          </button>
        </div>
      </div>
      {/* Main content */}
      <div className="cravz-main">
        <TopBar user={user}/>
        <div className="cravz-content">
        {tab==="vote"     &&<VoteFlow coinAlloc={coinAlloc} setCoinAlloc={setCoinAlloc} itemMeta={itemMeta} setItemMeta={setItemMeta} preItem={voteItem} isSuggestMode={isSuggest} onClose={function(){setVoteItem(null);setIsSuggest(false);setTab("feed");}} onGoToBrief={function(){setVoteItem(null);setIsSuggest(false);setTab("brief");}}/>}
        {tab==="feed"     &&<ResFeed user={user} coinAlloc={coinAlloc} itemMeta={itemMeta} onAllocate={openVote} onShowNotifs={function(){setTab("notifs");}} onGoInsights={function(){setTab("insights");}} modQueue={modQueue} onSuggest={function(s){setModQueue(function(q){return q.concat([Object.assign({},s,{id:"sug_"+Date.now(),status:"pending",ts:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"})})]);});}}/>}
        {tab==="brief"    &&<TheBrief coinAlloc={coinAlloc} user={user}/>}
        {tab==="notifs"   &&<ResNotifications user={user} coinAlloc={coinAlloc} onAllocate={openVote}/>}
        {tab==="insights" &&<ResInsights user={user} coinAlloc={coinAlloc} itemMeta={itemMeta} onAllocate={openVote}/>}
        {tab==="profile"  &&<ResProfile user={user} setUser={setUser} onLogout={handleLogout}/>}
        </div>
        <div className="cravz-bottom-nav"><BottomNav active={tab} onChange={function(t){if(t==="vote"){openVote(true);}else{setTab(t);}}}/></div>
      </div>
    </div>
  );
}