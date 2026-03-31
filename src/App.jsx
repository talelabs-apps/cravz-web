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
  business:  {label:"Businesses",   emoji:"🏪", color:C.coral,  bg:"#2A0A06"},
  activity:  {label:"Activities",   emoji:"🎯", color:C.purple, bg:"#160A2A"},
  food:      {label:"Food & Drink", emoji:"🍽️", color:C.coral,  bg:"#2A0A06"},
  retail:    {label:"Retail",       emoji:"🛍️", color:C.amber,  bg:"#2A1400"},
  health:    {label:"Health",       emoji:"💊",  color:C.green,  bg:"#0A1A0A"},
  fitness:   {label:"Fitness",      emoji:"🏋️", color:C.green,  bg:"#0A1A0A"},
  kids:      {label:"Family & Kids",emoji:"🧸",  color:C.coral,  bg:"#2A0A06"},
  entertain: {label:"Entertainment",emoji:"🎭",  color:C.purple, bg:"#160A2A"},
  services:  {label:"Services",     emoji:"🔧",  color:C.amber,  bg:"#2A1400"},
  sports:    {label:"Sports",       emoji:"⚽",  color:C.green,  bg:"#0A1A0A"},
  dance:     {label:"Dance",        emoji:"💃",  color:C.purple, bg:"#160A2A"},
  creative:  {label:"Creative",     emoji:"🎨",  color:C.purple, bg:"#160A2A"},
  learning:  {label:"Learning",     emoji:"📚",  color:C.amber,  bg:"#2A1400"},
  community: {label:"Community",    emoji:"🏘️", color:C.green,  bg:"#0A1A0A"},
};
// VoteFlow only shows these two top-level categories
const VOTE_CATS = {
  business: CAT_CFG.business,
  activity:  CAT_CFG.activity,
};

// Catalogue display groups (collapsible sections)
const CATALOGUE_GROUPS = {
  business: {
    food: {
      label: "Food & Drink", emoji: "🍽️",
      groups: [
        {id:"rest_cuisine", label:"Cuisine Restaurants", ids:["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11", "b12", "b13", "b14", "b15", "b16"]},
        {id:"rest_concept", label:"Concept Restaurants", ids:["b17", "b18", "b19", "b20", "b21", "b22"]},
        {id:"cafe",   label:"Café",                ids:["b23"]},
        {id:"bakery", label:"Bakeries",             ids:["b24"]},
        {id:"dessert",label:"Dessert & Ice Cream",  ids:["b25", "b26"]},
        {id:"bars", label:"Bars & Pubs", ids:["b27", "b28", "b29", "b30", "b31"]},
        {id:"food_grocery", label:"Grocery", ids:["b32", "b33"]},
        {id:"food_specialty", label:"Specialty Food", ids:["b34", "b35", "b36", "b37", "b38", "b39"]},
        {id:"food_alcohol", label:"Drinks Retail", ids:["b40", "b41"]},
      ],
    },
    retail: {
      label: "Retail", emoji: "🛍️",
      groups: [
        {id:"retail", label:"Retail Shops", ids:["b42", "b43", "b44", "b45", "b46", "b47", "b48", "b49"]},
      ],
    },
    health: {
      label: "Health", emoji: "💆",
      groups: [
        {id:"beauty_hair", label:"Hair & Grooming", ids:["b50", "b51", "b52", "b53"]},
        {id:"beauty_wellness", label:"Wellness", ids:["b54", "b55"]},
        {id:"clinics", label:"Health Clinics", ids:["b56", "b57", "b58", "b59"]},
      ],
    },
    fitness: {
      label: "Fitness & Sports", emoji: "🏋️",
      groups: [
        {id:"fit_gym",     label:"Gym",             ids:["b60"]},
        {id:"fit_wellness", label:"Wellness Club",   ids:["b61"]},
        {id:"fit_boutique", label:"Boutique Fitness", ids:["b62"]},
        {id:"fit_mind", label:"Mind & Body", ids:["b63", "b66"]},
        {id:"fit_functional", label:"Functional Fitness", ids:["b65"]},
        {id:"fit_climbing", label:"Climbing", ids:["b66"]},
        {id:"fit_combat", label:"Combat Sports", ids:["b67", "b68", "b69"]},
        {id:"sports_courts", label:"Courts & Pitches", ids:["b70", "b71", "b72", "b75"]},
        {id:"sports_aquatic", label:"Aquatic", ids:["b74"]},
      ],
    },
    kids: {
      label: "Family & Kids", emoji: "🧸",
      groups: [
        {id:"kids_play", label:"Play Venues", ids:["b75", "b76", "b77"]},
        {id:"kids_fitness", label:"Kids Fitness", ids:["b78"]},
      ],
    },
    entertain: {
      label: "Entertainment", emoji: "🎭",
      groups: [
        {id:"screen_stage", label:"Screen & Stage", ids:["b81", "b80"]},
        {id:"music", label:"Live Music", ids:["b81"]},
      ],
    },
    services: {
      label: "Services", emoji: "🔧",
      groups: [
        {id:"coworking", label:"Coworking Space", ids:["b82"]},
        {id:"tutoring",   label:"Tutoring Centre",  ids:["b83"]},
        {id:"household", label:"Household & Repairs", ids:["b84", "b85", "b86"]},
        {id:"pet_services", label:"Pet Services", ids:["b87"]},
      ],
    },
  },
  activity: {
    sports: {
      label: "Sports", emoji: "🏅",
      groups: [
        {id:"racket", label:"Racket Sports", ids:["a1", "a2"]},
        {id:"water", label:"Water Sports", ids:["a3"]},
        {id:"team", label:"Team Sports", ids:["a4", "a5"]},
        {id:"gymnastics", label:"Gymnastics", ids:["a6"]},
        {id:"martial_arts", label:"Martial Arts", ids:["a7"]},
      ],
    },
    fitness: {
      label: "Fitness", emoji: "🏃",
      groups: [
        {id:"yoga_pilates", label:"Yoga & Pilates", ids:["a8", "a9"]},
        {id:"fit_training", label:"Fitness Training", ids:["a10", "a11"]},
        {id:"cycling", label:"Cycling", ids:["a12"]},
      ],
    },
    dance: {
      label: "Dance", emoji: "💃",
      groups: [
        {id:"dance", label:"Dance", ids:["a13"]},
        {id:"ballet", label:"Ballet", ids:["a14"]},
      ],
    },
    creative: {
      label: "Creative", emoji: "🎨",
      groups: [
        {id:"ceramics", label:"Ceramics", ids:["a15"]},
        {id:"art", label:"Art", ids:["a16", "a17"]},
        {id:"photography", label:"Photography", ids:["a18"]},
        {id:"crafts", label:"Crafts", ids:["a19"]},
      ],
    },
    learning: {
      label: "Learning", emoji: "📚",
      groups: [
        {id:"languages", label:"Languages", ids:["a20"]},
        {id:"cooking", label:"Cooking", ids:["a21"]},
        {id:"technology", label:"Technology", ids:["a22"]},
        {id:"music", label:"Music", ids:["a23"]},
      ],
    },
    community: {
      label: "Community", emoji: "🤝",
      groups: [
        {id:"running", label:"Running", ids:["a24"]},
        {id:"reading", label:"Reading", ids:["a25"]},
        {id:"strategy", label:"Strategy Games", ids:["a26"]},
        {id:"games", label:"Games", ids:["a27"]},
      ],
    },
  },
};

const CATALOGUE = {
  business: [
    {id:"b1", emoji:"🇮🇹", label:"Italian restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b2", emoji:"🥐", label:"French restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b3", emoji:"🥘", label:"Spanish restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b4", emoji:"🌍", label:"Modern European restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b5", emoji:"🇧🇷", label:"Brazilian restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b6", emoji:"🌮", label:"Mexican restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b7", emoji:"🥡", label:"Japanese restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b8", emoji:"🥡", label:"Chinese restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b9", emoji:"🌶️", label:"Thai restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b10", emoji:"🍛", label:"Indian restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b11", emoji:"🧆", label:"Middle Eastern restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b12", emoji:"🇬🇷", label:"Greek restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b13", emoji:"🍜", label:"Korean restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b14", emoji:"🍲", label:"Vietnamese restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b15", emoji:"🥩", label:"Steakhouse", cat:"food", subcat:"rest_cuisine"},
    {id:"b16", emoji:"🦞", label:"Seafood restaurant", cat:"food", subcat:"rest_cuisine"},
    {id:"b17", emoji:"🍔", label:"Burger place", cat:"food", subcat:"rest_concept"},
    {id:"b18", emoji:"🍕", label:"Pizzeria", cat:"food", subcat:"rest_concept"},
    {id:"b19", emoji:"🥞", label:"Crêperie", cat:"food", subcat:"rest_concept"},
    {id:"b20", emoji:"🍗", label:"Rotisserie chicken", cat:"food", subcat:"rest_concept"},
    {id:"b21", emoji:"🐟", label:"Fish & chips", cat:"food", subcat:"rest_concept"},
    {id:"b22", emoji:"🏪", label:"Food hall / street food market", cat:"food", subcat:"rest_concept"},
    {id:"b23", emoji:"☕", label:"Café", cat:"food", subcat:"cafe"},
    {id:"b24", emoji:"🥖", label:"Artisan bakery", cat:"food", subcat:"bakery"},
    {id:"b25", emoji:"🍮", label:"Dessert shop", cat:"food", subcat:"dessert"},
    {id:"b26", emoji:"🍦", label:"Ice cream / gelato shop", cat:"food", subcat:"dessert"},
    {id:"b27", emoji:"🍺", label:"Pub", cat:"food", subcat:"bars"},
    {id:"b28", emoji:"🍸", label:"Cocktail bar", cat:"food", subcat:"bars"},
    {id:"b29", emoji:"🍷", label:"Wine bar", cat:"food", subcat:"bars"},
    {id:"b30", emoji:"🍻", label:"Craft beer bar", cat:"food", subcat:"bars"},
    {id:"b31", emoji:"📺", label:"Sports bar", cat:"food", subcat:"bars"},
    {id:"b32", emoji:"🛒", label:"Supermarket", cat:"food", subcat:"food_grocery"},
    {id:"b33", emoji:"🏘️", label:"Neighbourhood grocery store", cat:"food", subcat:"food_grocery"},
    {id:"b34", emoji:"🥗", label:"Delicatessen", cat:"food", subcat:"food_specialty"},
    {id:"b35", emoji:"🧀", label:"Cheese shop", cat:"food", subcat:"food_specialty"},
    {id:"b36", emoji:"🥩", label:"Butcher", cat:"food", subcat:"food_specialty"},
    {id:"b37", emoji:"🐟", label:"Fishmonger", cat:"food", subcat:"food_specialty"},
    {id:"b38", emoji:"🥦", label:"Greengrocer", cat:"food", subcat:"food_specialty"},
    {id:"b39", emoji:"🌿", label:"Organic food shop", cat:"food", subcat:"food_specialty"},
    {id:"b40", emoji:"🍷", label:"Wine shop", cat:"food", subcat:"food_alcohol"},
    {id:"b41", emoji:"🥃", label:"Wine & spirits shop", cat:"food", subcat:"food_alcohol"},
    {id:"b42", emoji:"📚", label:"Bookstore", cat:"retail", subcat:"retail"},
    {id:"b43", emoji:"🧸", label:"Toy shop", cat:"retail", subcat:"retail"},
    {id:"b44", emoji:"🏠", label:"Homeware shop", cat:"retail", subcat:"retail"},
    {id:"b45", emoji:"🎁", label:"Gift shop", cat:"retail", subcat:"retail"},
    {id:"b46", emoji:"💐", label:"Florist", cat:"retail", subcat:"retail"},
    {id:"b47", emoji:"👗", label:"Clothing shop", cat:"retail", subcat:"retail"},
    {id:"b48", emoji:"🐾", label:"Pet shop", cat:"retail", subcat:"retail"},
    {id:"b49", emoji:"🔨", label:"Hardware / DIY shop", cat:"retail", subcat:"retail"},
    {id:"b50", emoji:"✂️", label:"Hair salon", cat:"health", subcat:"beauty_hair"},
    {id:"b51", emoji:"💅", label:"Nail salon", cat:"health", subcat:"beauty_hair"},
    {id:"b52", emoji:"💆", label:"Beauty salon", cat:"health", subcat:"beauty_hair"},
    {id:"b53", emoji:"💈", label:"Barbershop", cat:"health", subcat:"beauty_hair"},
    {id:"b54", emoji:"🧖", label:"Spa", cat:"health", subcat:"beauty_wellness"},
    {id:"b55", emoji:"🫁", label:"Massage studio", cat:"health", subcat:"beauty_wellness"},
    {id:"b56", emoji:"🩺", label:"Doctor clinic", cat:"health", subcat:"clinics"},
    {id:"b57", emoji:"🦷", label:"Dentist clinic", cat:"health", subcat:"clinics"},
    {id:"b58", emoji:"🦴", label:"Physiotherapy clinic", cat:"health", subcat:"clinics"},
    {id:"b59", emoji:"💊", label:"Pharmacy", cat:"health", subcat:"clinics"},
    {id:"b60", emoji:"🏋️", label:"Gym", cat:"fitness", subcat:"fit_gym"},
    {id:"b61", emoji:"🌸", label:"Wellness club", cat:"fitness", subcat:"fit_wellness"},
    {id:"b62", emoji:"🏃", label:"Boutique fitness studio", cat:"fitness", subcat:"fit_boutique"},
    {id:"b63", emoji:"🧘", label:"Yoga studio", cat:"fitness", subcat:"fit_mind"},
    {id:"b66", emoji:"🤸", label:"Pilates studio", cat:"fitness", subcat:"fit_mind"},
    {id:"b65", emoji:"💪", label:"CrossFit gym", cat:"fitness", subcat:"fit_functional"},
    {id:"b66", emoji:"🧗", label:"Climbing gym", cat:"fitness", subcat:"fit_climbing"},
    {id:"b67", emoji:"🥊", label:"Boxing gym", cat:"fitness", subcat:"fit_combat"},
    {id:"b68", emoji:"🥋", label:"Martial arts gym", cat:"fitness", subcat:"fit_combat"},
    {id:"b69", emoji:"🥋", label:"Jiu-jitsu gym", cat:"fitness", subcat:"fit_combat"},
    {id:"b70", emoji:"🎾", label:"Tennis courts", cat:"fitness", subcat:"sports_courts"},
    {id:"b71", emoji:"🏓", label:"Padel courts", cat:"fitness", subcat:"sports_courts"},
    {id:"b72", emoji:"⚽", label:"Football / 5-a-side pitch", cat:"fitness", subcat:"sports_courts"},
    {id:"b75", emoji:"🏀", label:"Basketball courts", cat:"fitness", subcat:"sports_courts"},
    {id:"b74", emoji:"🏊", label:"Swimming pool", cat:"fitness", subcat:"sports_aquatic"},
    {id:"b75", emoji:"🧸", label:"Soft play café", cat:"kids", subcat:"kids_play"},
    {id:"b76", emoji:"🎪", label:"Indoor activity centre", cat:"kids", subcat:"kids_play"},
    {id:"b77", emoji:"🛝", label:"Outdoor playground", cat:"kids", subcat:"kids_play"},
    {id:"b78", emoji:"🤸", label:"Kids gym", cat:"kids", subcat:"kids_fitness"},
    {id:"b81", emoji:"🎬", label:"Cinema", cat:"entertain", subcat:"screen_stage"},
    {id:"b80", emoji:"🎭", label:"Theatre", cat:"entertain", subcat:"screen_stage"},
    {id:"b81", emoji:"🎵", label:"Concert hall / live music venue", cat:"entertain", subcat:"music"},
    {id:"b82", emoji:"💻", label:"Coworking space", cat:"services", subcat:"coworking"},
    {id:"b83", emoji:"📖", label:"Tutoring centre", cat:"services", subcat:"tutoring"},
    {id:"b84", emoji:"👕", label:"Laundry / dry cleaners", cat:"services", subcat:"household"},
    {id:"b85", emoji:"🚲", label:"Bike repair shop", cat:"services", subcat:"household"},
    {id:"b86", emoji:"📱", label:"Electronics repair shop", cat:"services", subcat:"household"},
    {id:"b87", emoji:"🐩", label:"Pet grooming", cat:"services", subcat:"pet_services"},
  ],
  activity: [
    {id:"a1", emoji:"🎾", label:"Tennis lessons", cat:"sports", subcat:"racket"},
    {id:"a2", emoji:"🏓", label:"Padel lessons", cat:"sports", subcat:"racket"},
    {id:"a3", emoji:"🏊", label:"Swimming lessons", cat:"sports", subcat:"water"},
    {id:"a4", emoji:"⚽", label:"Football training", cat:"sports", subcat:"team"},
    {id:"a5", emoji:"🏀", label:"Basketball training", cat:"sports", subcat:"team"},
    {id:"a6", emoji:"🤸", label:"Gymnastics classes", cat:"sports", subcat:"gymnastics"},
    {id:"a7", emoji:"🥋", label:"Martial arts classes", cat:"sports", subcat:"martial_arts"},
    {id:"a8", emoji:"🧘", label:"Yoga classes", cat:"fitness", subcat:"yoga_pilates"},
    {id:"a9", emoji:"🤸", label:"Pilates classes", cat:"fitness", subcat:"yoga_pilates"},
    {id:"a10", emoji:"🏃", label:"HIIT / fitness classes", cat:"fitness", subcat:"fit_training"},
    {id:"a11", emoji:"🏋️", label:"Strength training classes", cat:"fitness", subcat:"fit_training"},
    {id:"a12", emoji:"🚴", label:"Spin / cycling classes", cat:"fitness", subcat:"cycling"},
    {id:"a13", emoji:"💃", label:"Dance classes", cat:"dance", subcat:"dance"},
    {id:"a14", emoji:"🩰", label:"Ballet classes", cat:"dance", subcat:"ballet"},
    {id:"a15", emoji:"🏺", label:"Pottery classes", cat:"creative", subcat:"ceramics"},
    {id:"a16", emoji:"🎨", label:"Painting classes", cat:"creative", subcat:"art"},
    {id:"a17", emoji:"✏️", label:"Drawing classes", cat:"creative", subcat:"art"},
    {id:"a18", emoji:"📷", label:"Photography classes", cat:"creative", subcat:"photography"},
    {id:"a19", emoji:"✂️", label:"Craft workshops", cat:"creative", subcat:"crafts"},
    {id:"a20", emoji:"🗣️", label:"Language classes", cat:"learning", subcat:"languages"},
    {id:"a21", emoji:"🍳", label:"Cooking classes", cat:"learning", subcat:"cooking"},
    {id:"a22", emoji:"💻", label:"Coding classes", cat:"learning", subcat:"technology"},
    {id:"a23", emoji:"🎵", label:"Music lessons", cat:"learning", subcat:"music"},
    {id:"a24", emoji:"🏃", label:"Running club", cat:"community", subcat:"running"},
    {id:"a25", emoji:"📚", label:"Book club", cat:"community", subcat:"reading"},
    {id:"a26", emoji:"♟️", label:"Chess club", cat:"community", subcat:"strategy"},
    {id:"a27", emoji:"🎲", label:"Board game club", cat:"community", subcat:"games"},
  ],
};


/* ==================================================
   TAG SYSTEM
   ALL_TAGS: master list with id, label, group
   SUBCAT_TAGS: maps subcat key → array of tag ids
   Activity competitive whitelist: competitive:true on item
================================================== */

const ALL_TAGS = {
  // ATMOSPHERE
  cozy_quiet:       {label:"Cozy / Quiet",              group:"Atmosphere"},
  relaxed:          {label:"Relaxed / Casual",           group:"Atmosphere"},
  lively:           {label:"Lively",                     group:"Atmosphere"},
  // AUDIENCE
  family:           {label:"Family friendly",            group:"Audience"},
  dog:              {label:"Dog friendly",               group:"Audience"},
  groups:           {label:"Great for groups",           group:"Audience"},
  laptop:           {label:"Laptop-friendly",            group:"Audience"},
  health_conscious: {label:"Health-conscious",           group:"Audience"},
  beginner:         {label:"Beginner friendly",          group:"Audience"},
  kid_focused:      {label:"Kid-focused",                group:"Audience"},
  adults:           {label:"Adults",                     group:"Audience"},
  // OCCASION
  quick_stop:       {label:"Quick stop",                 group:"Occasion"},
  lunch:            {label:"Lunch / Brunch",             group:"Occasion"},
  evening:          {label:"Evening",                    group:"Occasion"},
  late_night:       {label:"Late night",                 group:"Occasion"},
  weekday:          {label:"Weekday",                    group:"Occasion"},
  weekend:          {label:"Weekend",                    group:"Occasion"},
  date_night:       {label:"Date night",                 group:"Occasion"},
  celebration:      {label:"Celebration",                group:"Occasion"},
  // SETTING
  outdoor:          {label:"Outdoor space",              group:"Setting"},
  design_led:       {label:"Design-led / Instagrammable",group:"Setting"},
  natural:          {label:"Natural / green feel",       group:"Setting"},
  flexible_space:   {label:"Flexible space",             group:"Setting"},
  coworking_space:  {label:"Coworking / work space",     group:"Setting"},
  indoor:           {label:"Indoor venue",               group:"Setting"},
  outdoor_venue:    {label:"Outdoor venue",              group:"Setting"},
  // OFFER
  specialist:       {label:"Specialist offer",           group:"Offer"},
  healthy:          {label:"Healthy options",            group:"Offer"},
  vegan:            {label:"Vegetarian / Vegan options", group:"Offer"},
  gluten_free:      {label:"Gluten-free options",        group:"Offer"},
  authentic:        {label:"Authentic",                  group:"Offer"},
  innovative:       {label:"Innovative",                 group:"Offer"},
  local_indie:      {label:"Local / independent",        group:"Offer"},
  organic:          {label:"Organic products",           group:"Offer"},
  premium:          {label:"Premium products",           group:"Offer"},
  wine:             {label:"Great wine selection",       group:"Offer"},
  cocktails:        {label:"Great cocktails",            group:"Offer"},
  live_music:       {label:"Live music / events",        group:"Offer"},
  workshops:        {label:"Classes / workshops",        group:"Offer"},
  fitness_classes:  {label:"Fitness classes",            group:"Offer"},
  active_kids:      {label:"Active play (kids)",         group:"Offer"},
  pool:             {label:"Pool / aquatic facilities",  group:"Offer"},
  sports_courts:    {label:"Sports courts / facilities", group:"Offer"},
  // EXPERIENCE
  coaching:         {label:"Coaching available",         group:"Experience"},
  beginner_classes: {label:"Beginner classes",           group:"Experience"},
  competitive:      {label:"Competitive training",       group:"Experience"},
  kids_programs:    {label:"Kids programs",              group:"Experience"},
  performance:      {label:"Performance events",         group:"Experience"},
  // FORMAT
  delivery:         {label:"Delivery / takeaway",        group:"Format"},
  flexible_hours:   {label:"Flexible hours",             group:"Format"},
  small_group:      {label:"Small group format",         group:"Format"},
  one_to_one:       {label:"One-to-one service",         group:"Format"},
};

const SUBCAT_TAGS = {
  rest_cuisine:  ["cozy_quiet","relaxed","lively","family","dog","groups","lunch","evening","weekday","weekend","date_night","celebration","outdoor","design_led","authentic","innovative","vegan","gluten_free","wine","cocktails","delivery"],
  rest_concept:  ["relaxed","lively","family","groups","lunch","evening","weekday","weekend","outdoor","authentic","innovative","vegan","gluten_free","delivery"],
  cafe:          ["cozy_quiet","relaxed","family","dog","laptop","quick_stop","lunch","weekday","weekend","outdoor","natural","design_led","specialist","healthy","vegan","gluten_free","delivery"],
  bakery:        ["cozy_quiet","relaxed","family","quick_stop","weekday","weekend","specialist","delivery"],
  dessert:       ["relaxed","lively","family","quick_stop","evening","weekend","outdoor","specialist"],
  bars:          ["cozy_quiet","lively","groups","evening","late_night","weekday","weekend","date_night","celebration","outdoor","design_led","wine","cocktails","live_music"],
  food_grocery:  ["family","health_conscious","quick_stop","weekday","weekend","local_indie","organic","premium"],
  food_specialty:["health_conscious","quick_stop","weekday","weekend","specialist","organic","local_indie","premium"],
  food_alcohol:  ["adults","weekday","weekend","specialist","premium"],
  retail:        ["family","weekday","weekend","specialist","premium","local_indie"],
  beauty_hair:   ["relaxed","adults","health_conscious","weekday","weekend","design_led","one_to_one"],
  beauty_wellness:["relaxed","adults","health_conscious","weekday","weekend","natural","one_to_one"],
  clinics:       ["family","weekday","weekend","one_to_one"],
  fit_gym:       ["health_conscious","beginner","family","weekday","weekend","evening","indoor","flexible_space","fitness_classes","coaching","beginner_classes","one_to_one"],
  fit_wellness:  ["health_conscious","beginner","family","weekday","weekend","evening","indoor","flexible_space","natural","fitness_classes","pool","coaching","beginner_classes","one_to_one"],
  fit_boutique:  ["health_conscious","beginner","family","weekday","weekend","evening","indoor","flexible_space","natural","fitness_classes","coaching","beginner_classes","one_to_one"],
  fit_mind:      ["relaxed","health_conscious","beginner","weekday","weekend","evening","indoor","natural","fitness_classes","beginner_classes"],
  fit_functional:["health_conscious","beginner","weekday","weekend","evening","indoor","fitness_classes","coaching","beginner_classes"],
  fit_combat:    ["beginner","health_conscious","kid_focused","weekday","weekend","evening","indoor","coaching","beginner_classes","competitive","kids_programs","small_group","one_to_one"],
  fit_climbing:  ["beginner","family","weekday","weekend","evening","indoor","coaching","beginner_classes"],
  sports_courts: ["family","kid_focused","health_conscious","weekday","weekend","evening","indoor","outdoor_venue","sports_courts","pool","coaching","beginner_classes","competitive","kids_programs"],
  sports_aquatic:["family","kid_focused","health_conscious","weekday","weekend","evening","indoor","pool","coaching","beginner_classes","competitive","kids_programs"],
  kids_play:     ["family","kid_focused","weekday","weekend","evening","indoor","outdoor_venue","flexible_space","active_kids","kids_programs"],
  kids_fitness:  ["family","kid_focused","weekday","weekend","evening","indoor","flexible_space","active_kids","kids_programs","coaching"],
  screen_stage:  ["family","groups","evening","weekday","weekend","celebration","indoor","live_music","performance"],
  music:         ["family","groups","evening","weekday","weekend","celebration","indoor","live_music","performance"],
  coworking:     ["laptop","weekday","weekend","evening","coworking_space","workshops","one_to_one","small_group"],
  tutoring:      ["beginner","weekday","weekend","evening","indoor","workshops","one_to_one","small_group"],
  household:     ["family","quick_stop","weekday","weekend","specialist","one_to_one"],
  pet_services:  ["family","quick_stop","weekday","weekend","specialist","one_to_one"],
};

// Activities with competitive mode available
const COMPETITIVE_ACTIVITIES = new Set(["a1","a2","a3","a4","a5","a6","a7","a10","a11","a12","a13"]);


const ALL_ITEMS = Object.values(CATALOGUE).flat();


// spendDist: [%=0-5, %=5-10, %=10-20, %=20-35, %=35-50, %=50+]
// freqDist:  [%once/mo, %2-3x, %weekly, %multiple/wk]
// distrib:   [%<5min, %5-10min, %10-20min, %20min+]
const FEED = [
  {id:"b75",cat:"business",emoji:"🧸",label:"Soft play café",
    voters:284, avgCoins:8.2, momentum:+31,
    spendDist:[0,5,45,35,12,3],   freqDist:[20,55,20,5],  distrib:[18,42,30,10],
    demo:{age:"25–34",gender:"Mostly women",hh:"Families with kids"}},
  {id:"a13",cat:"activity",emoji:"💃",label:"Dance classes",
    voters:167, avgCoins:7.1, momentum:+24,
    spendDist:[0,8,52,28,10,2],   freqDist:[10,35,40,15], distrib:[10,28,48,14],
    demo:{age:"25–44",gender:"Mixed",hh:"Couples & solo"}},
  {id:"b81",cat:"business",emoji:"🎵",label:"Concert hall / live music venue",
    voters:134, avgCoins:5.4, momentum:+12,
    spendDist:[0,2,12,28,38,20],  freqDist:[45,35,14,6],  distrib:[8,20,38,34],
    demo:{age:"25–44",gender:"Mostly men",hh:"Solo"}},
  {id:"a15",cat:"activity",emoji:"🏺",label:"Pottery classes",
    voters:121, avgCoins:7.6, momentum:+15,
    spendDist:[0,3,18,45,28,6],   freqDist:[25,50,20,5],  distrib:[10,32,42,16],
    demo:{age:"25–44",gender:"Mostly women",hh:"Solo & couples"}},
  {id:"b29",cat:"business",emoji:"🍷",label:"Wine bar",
    voters:108, avgCoins:6.1, momentum:+18,
    spendDist:[0,3,22,40,28,7],   freqDist:[30,45,20,5],  distrib:[12,35,38,15],
    demo:{age:"28–44",gender:"Mixed",hh:"Couples & solo"}},
  {id:"b66",cat:"business",emoji:"🧗",label:"Climbing gym",
    voters:97,  avgCoins:5.8, momentum:+22,
    spendDist:[0,2,15,38,32,13],  freqDist:[15,40,35,10], distrib:[10,25,42,23],
    demo:{age:"20–35",gender:"Mixed",hh:"Solo & couples"}},
  {id:"a8", cat:"activity",emoji:"🧘",label:"Yoga classes",
    voters:89,  avgCoins:6.3, momentum:+9,
    spendDist:[0,4,28,42,22,4],   freqDist:[10,30,45,15], distrib:[8,28,44,20],
    demo:{age:"25–44",gender:"Mostly women",hh:"Solo"}},
  {id:"b23",cat:"business",emoji:"☕", label:"Café",
    voters:76,  avgCoins:4.2, momentum:+7,
    spendDist:[5,20,50,20,4,1],   freqDist:[8,22,40,30],  distrib:[22,45,25,8],
    demo:{age:"18–45",gender:"Mixed",hh:"All"}},
];

// Pre-compute metrics for each item
const FEED_WITH_METRICS = FEED.map(item=>({...item, ...calcMetrics(item)}));


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
  "a8": ["fitness","wellness"],                      // running club
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
    area:"SW9", ts:"1 week ago"
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
const TIERS = [
  {id:"free",       name:"Free",       price:"£0/mo",   color:C.t3,    maxDistricts:1,
   features:["Top 20 items","Voice count + confidence","1 district"]},
  {id:"starter",    name:"Starter",    price:"£99/mo",  color:C.amber, maxDistricts:3,
   features:["All items","Momentum trends","Up to 3 districts","Intensity score"]},
  {id:"pro",        name:"Pro",        price:"£299/mo", color:C.coral, maxDistricts:3,
   features:["Everything in Starter","Avg spend + frequency","Monthly & annual revenue","Full postcode sectors","Catchment classification"]},
  {id:"enterprise", name:"Enterprise", price:"£799/mo", color:C.green, maxDistricts:99,
   features:["Everything in Pro","Demographics breakdown","Distance distribution","Concept reports","Unlimited districts","API access"]},
];

function tierIdx(id){ return TIERS.findIndex(t=>t.id===id); }
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
  let h=0; for(const c of area) h=(h*31+c.charCodeAt(0))&0xFFFF;
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
function CoinStack({remaining,total=20}){
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
  const [open, setOpen] = React.useState(false);
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

function VoteFlow({coinAlloc,setCoinAlloc,itemMeta,setItemMeta,preItem,isSuggestMode,onClose}){
  const [step,       setStep]      = useState(preItem?"gate":"cat");
  const [selCat,     setSelCat]    = useState(preItem?.cat||"business");
  const [selTopCat,  setSelTopCat] = useState(null);
  const [selAttrs,   setSelAttrs]  = useState(new Set());
  const [selCoins,   setSelCoins]  = useState(1);
  const [actAudience,setActAudience] = useState("");
  const [actStyle,   setActStyle]   = useState("");
  const [actAccess,  setActAccess]  = useState(""); // top-level category tab within selCat
  const [selItem,    setSelItem]   = useState(preItem||null);
  const [search,     setSearch]    = useState("");
  const [spend,      setSpend]     = useState("");
  const [freq,       setFreq]      = useState("");
  const [dist,       setDist]      = useState("");
  const [access,     setAccess]    = useState("");
  const [query,      setQuery]     = useState("");
  const [similar,    setSimilar]   = useState([]);
  const [sugStep,    setSugStep]   = useState("idle");
  const [reason,     setReason]    = useState("");
  const [showSuggestFromVote, setShowSuggestFromVote] = useState(false);

  const coinsUsed=cat=>(CATALOGUE[cat]||[]).reduce((s,i)=>s+(coinAlloc[i.id]||0),0);
  const coinsLeft=cat=>10-coinsUsed(cat);
  const setCoin=(id,cat,val)=>{
    const avail=coinsLeft(cat)+(coinAlloc[id]||0);
    const next=Math.min(Math.max(0,val),avail);
    setCoinAlloc(p=>({...p,[id]:next}));
    if(next===0) setItemMeta(m=>{const n={...m};delete n[id];return n;});
  };

  // Derive active top-cat (auto-select first if none chosen)
  const catConfig = CATALOGUE_GROUPS[selCat] || {};
  const topCatKeys = Object.keys(catConfig);
  const activeTopCat = selTopCat && catConfig[selTopCat] ? selTopCat : topCatKeys[0];
  const activeTopCatCfg = catConfig[activeTopCat] || {};
  const itemsInTopCat = (CATALOGUE[selCat]||[]).filter(i=>i.cat===activeTopCat);

  function doSearch(){
    if(!query.trim()) return;
    const q=query.toLowerCase().trim();
    const exact=ALL_ITEMS.find(i=>i.label.toLowerCase().includes(q));
    if(exact){
      const cat=Object.keys(CATALOGUE).find(c=>CATALOGUE[c].some(i=>i.id===exact.id))||"business";
      setSelCat(cat);setSelItem(exact);setSpend("");setFreq("");setDist("");setAccess("");setStep("gate");return;
    }
    const allCatItems=(CATALOGUE[selCat]||[]);
    const words=q.split(/\s+/).filter(w=>w.length>2);
    const sim=allCatItems.map(i=>({...i,_s:words.filter(w=>i.label.toLowerCase().includes(w)).length}))
      .filter(i=>i._s>0).sort((a,b)=>b._s-a._s).slice(0,4);
    setSimilar(sim);setSugStep(sim.length?"results":"describe");
  }

  const displayItems=(CATALOGUE[selCat]||[]).filter(i=>
    i.cat===activeTopCat && (!search||i.label.toLowerCase().includes(search.toLowerCase()))
  );
  const cfg=CAT_CFG[selCat]||CAT_CFG.business;

  if(showSuggestFromVote) return (
    <SuggestModal
      defaultCat={selCat}
      defaultName={query}
      onSubmit={s=>{if(typeof window!=="undefined"&&window.__cravzOnSuggest)window.__cravzOnSuggest(s);}}
      onClose={()=>{setShowSuggestFromVote(false);onClose();}}
    />
  );

  if(step==="cat") return (
    <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",display:"flex",flexDirection:"column",fontFamily:sans,paddingBottom:80}}>
      <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.line}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{...ty.h2,fontSize:20}}>{isSuggestMode?"Suggest or vote":"Your demand coins"}</div>
        <button onClick={onClose} style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><X size={16}/></button>
      </div>

      {/* == COIN EXPLAINER BANNER */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.line}`,background:C.surface}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
          <div style={{fontSize:28,lineHeight:1}}>🪙</div>
          <div style={{flex:1}}>
            <div style={{...ty.bodyMd,fontSize:15,color:C.t1,marginBottom:4}}>
              You have <span style={{color:C.coral,fontWeight:700}}>20 coins</span> to place each year
            </div>
            <div style={{...ty.sm,color:C.t2,lineHeight:1.65}}>
              Split across two categories — <span style={{color:C.coral,fontWeight:600}}>10 for Businesses</span> and <span style={{color:C.purple,fontWeight:600}}>10 for Activities</span>. Place them on the things you most want in your neighbourhood. The more coins a concept gets, the stronger the signal to operators deciding where to open.
            </div>
          </div>
        </div>
        {/* Per-category progress */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {Object.entries(VOTE_CATS).map(([cat,cc])=>{const used=coinsUsed(cat),left=10-used,pct=Math.min(100,(used/10)*100);return(
            <div key={cat} style={{padding:"10px 12px",background:C.bg,borderRadius:10,border:`1px solid ${C.line}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:15}}>{cc.emoji}</span>
                  <span style={{...ty.sm,color:C.t1,fontWeight:600}}>{cc.label}</span>
                </div>
                <span style={{...ty.meta,color:left===0?cc.color:C.t3,fontWeight:700}}>{left}/10 left</span>
              </div>
              <div style={{height:5,background:C.line,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:cc.color,borderRadius:3,transition:"width .3s"}}/>
              </div>
            </div>
          );})}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 18px"}}>
        <p style={{...ty.body,marginBottom:18,color:C.t2}}>Pick a category to start placing coins.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {Object.entries(VOTE_CATS).map(([cat,cc])=>{const used=coinsUsed(cat),left=10-used;return(
            <button key={cat} onClick={()=>{setSelCat(cat);setSelTopCat(null);setSugStep("idle");setQuery("");setSearch("");setStep("list");}}
              style={{background:C.surface,border:`1px solid ${left===0?cc.color+"50":C.line}`,borderRadius:16,padding:"18px",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:14,transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=cc.color}
              onMouseLeave={e=>e.currentTarget.style.borderColor=left===0?cc.color+"50":C.line}>
              <div style={{width:52,height:52,borderRadius:14,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{cc.emoji}</div>
              <div style={{flex:1}}>
                <div style={{...ty.bodyMd,fontSize:15,marginBottom:3}}>{cc.label}</div>
                <div style={{...ty.sm,color:C.t3,marginBottom:6}}>{(CATALOGUE[cat]||[]).length} items · {left}/10 coins remaining</div>
                <div style={{height:3,background:C.line,borderRadius:2,overflow:"hidden",width:100}}>
                  <div style={{height:"100%",width:`${(used/10)*100}%`,background:cc.color,borderRadius:2}}/>
                </div>
              </div>
              <ArrowRight size={18} color={C.t3}/>
            </button>
          );})}
        </div>
      </div>
    </div>
  );

  if(step==="list") return (
    <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",display:"flex",flexDirection:"column",fontFamily:sans,paddingBottom:80}}>
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.line}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={()=>setStep("cat")} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,display:"flex",alignItems:"center",gap:4}}>← Back</button>
          <button onClick={onClose} style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><X size={15}/></button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{width:32,height:32,borderRadius:9,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{cfg.emoji}</div>
          <div style={{...ty.h2,fontSize:17}}>{cfg.label}</div>
          <span style={{...ty.meta,marginLeft:"auto",color:coinsLeft(selCat)===0?cfg.color:C.t3,fontWeight:600}}>{coinsLeft(selCat)}/10 left</span>
        </div>
        <div style={{height:3,background:C.line,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(coinsUsed(selCat)/10)*100}%`,background:cfg.color,borderRadius:2,transition:"width .3s"}}/>
        </div>
      </div>
      {/* search / suggest panel */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.line}`}}>
        {sugStep==="pending"?(
          <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",background:`${C.amber}10`,border:`1px solid ${C.amber}22`,borderRadius:10}}>
            <Clock size={14} color={C.amber} style={{flexShrink:0,marginTop:1}}/>
            <div><div style={{...ty.sm,color:C.amber,fontWeight:600}}>"{query}" is under review</div><div style={{...ty.meta,marginTop:1}}>We'll notify you when approved — then you can allocate coins.</div></div>
            <button onClick={()=>{setSugStep("idle");setQuery("");setReason("");}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",flexShrink:0}}><X size={12}/></button>
          </div>
        ):sugStep==="describe"?(
          <div style={{padding:"10px 12px",background:`${C.coral}08`,border:`1px solid ${C.coral}20`,borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <span style={{fontSize:16}}>🌱</span>
              <div style={{...ty.sm,color:C.t1,fontWeight:600}}>"{query}" isn't on the list yet</div>
            </div>
            <div style={{...ty.meta,color:C.t2,marginBottom:10,lineHeight:1.6}}>Suggest it to the community. If approved by a moderator or community hero, you'll be notified and can vote on it.</div>
            <div style={{display:"flex",gap:6}}> 
              <button onClick={()=>setSugStep("idle")} style={{padding:"7px 12px",borderRadius:8,background:"transparent",border:`1px solid ${C.line}`,color:C.t2,cursor:"pointer",...ty.meta,fontWeight:600,fontFamily:sans}}>← Back</button>
              <button onClick={()=>setShowSuggestFromVote(true)}
                style={{flex:1,padding:"7px",borderRadius:8,background:C.coral,color:"#fff",border:"none",cursor:"pointer",...ty.meta,fontWeight:700,fontFamily:sans}}>
                Suggest this →
              </button>
            </div>
          </div>
        ):
        null
        }
      </div>

      {/* search / suggest panel */}
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.line}`}}>
        {sugStep==="pending"?(
          <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",background:`${C.amber}10`,border:`1px solid ${C.amber}22`,borderRadius:10}}>
            <Clock size={14} color={C.amber} style={{flexShrink:0,marginTop:1}}/>
            <div><div style={{...ty.sm,color:C.amber,fontWeight:600}}>"{query}" is under review</div><div style={{...ty.meta,marginTop:1}}>We'll notify you when approved — then you can allocate coins.</div></div>
            <button onClick={()=>{setSugStep("idle");setQuery("");setReason("");}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",flexShrink:0}}><X size={12}/></button>
          </div>
        ):sugStep==="describe"?(
          <div>
            <div style={{...ty.sm,color:C.t1,fontWeight:500,marginBottom:6}}>Why is "{query}" different?</div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={2}
              placeholder="Explain what makes this distinct from existing items…"
              style={{width:"100%",background:C.surface2,border:`1px solid ${C.line}`,borderRadius:9,padding:"9px",color:C.t1,fontSize:12,fontFamily:sans,outline:"none",resize:"none",lineHeight:1.5,marginBottom:7}}
              onFocus={e=>e.target.style.borderColor=C.coral} onBlur={e=>e.target.style.borderColor=C.line}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setSugStep("idle")} style={{padding:"7px 12px",borderRadius:8,background:C.surface2,border:`1px solid ${C.line}`,color:C.t2,cursor:"pointer",...ty.meta,fontWeight:600}}>← Back</button>
              <button disabled={reason.trim().length<15} onClick={()=>setSugStep("pending")}
                style={{flex:1,padding:"7px",borderRadius:8,background:reason.trim().length>=15?C.coral:C.surface2,color:reason.trim().length>=15?"#fff":C.t3,border:"none",cursor:reason.trim().length>=15?"pointer":"default",...ty.meta,fontWeight:600,transition:"all .2s"}}>
                Submit for review →
              </button>
            </div>
          </div>
        ):(
          <div>
            <div style={{display:"flex",gap:7}}>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:C.surface2,borderRadius:10,padding:"8px 12px"}}>
                <Search size={13} color={C.t3}/>
                <input value={isSuggestMode?query:search}
                  onChange={e=>{if(isSuggestMode){setQuery(e.target.value);setSugStep("idle");setSimilar([]);}else{setSearch(e.target.value);setQuery(e.target.value);}}}
                  onKeyDown={e=>e.key==="Enter"&&isSuggestMode&&doSearch()}
                  placeholder={isSuggestMode?"Search or suggest something new…":`Search ${cfg.label.toLowerCase()}…`}
                  style={{flex:1,background:"transparent",border:"none",color:C.t1,fontSize:12,fontFamily:sans,outline:"none"}}/>
                {(isSuggestMode?query:search)&&<button onClick={()=>{isSuggestMode?(setQuery(""),setSugStep("idle"),setSimilar([])):setSearch("");}} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",lineHeight:1}}><X size={11}/></button>}
              </div>
              {isSuggestMode&&<button onClick={doSearch} disabled={!query.trim()} style={{padding:"8px 12px",borderRadius:10,background:query.trim()?C.coral:C.surface2,color:query.trim()?"#fff":C.t3,border:"none",cursor:query.trim()?"pointer":"default",...ty.meta,fontWeight:700,transition:"all .2s"}}>Go</button>}
            </div>
            {/* Live search suggestions — fires in both modes at 3+ chars */}
            {(isSuggestMode?query:search).length>=3&&(()=>{
              const q=(isSuggestMode?query:search).toLowerCase();
              const allItems=Object.values(CATALOGUE).flat();
              const suggestions=allItems.filter(function(i){
                return i.label.toLowerCase().includes(q)
                  || (i.subcat&&i.subcat.replace(/_/g," ").includes(q))
                  || (i.cat&&i.cat.includes(q));
              }).slice(0,6);
              if(!suggestions.length) return null;
              return(
                <div style={{marginTop:6,background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.3)"}}>
                  {suggestions.map(function(item,idx){
                    const cc2=CAT_CFG[item.cat]||CAT_CFG.business;
                    return(
                      <button key={item.id}
                        onClick={function(){
                          setSelItem(item);
                          setSearch("");
                          setSpend("");setFreq("");setDist("");setAccess("");
                          setSelCoins(1);setSelAttrs(new Set());
                          setActAudience("");setActStyle("");setActAccess("");
                          setStep("gate");
                        }}
                        style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"transparent",border:"none",borderTop:idx>0?`1px solid ${C.line}`:"none",cursor:"pointer",fontFamily:sans,textAlign:"left"}}>
                        <div style={{width:32,height:32,borderRadius:9,background:cc2.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{item.emoji}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{...ty.sm,color:C.t1,fontWeight:500,marginBottom:1}}>{item.label}</div>
                          <span style={{...ty.meta,fontSize:10,color:cc2.color,background:`${cc2.color}15`,borderRadius:4,padding:"1px 5px"}}>{cc2.label}</span>
                        </div>
                        <ChevronDown size={13} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {sugStep==="results"&&similar.length>0&&(
              <div style={{marginTop:8}}>
                <div style={{...ty.meta,color:C.amber,marginBottom:6,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11} color={C.amber}/> Similar items already exist:</div>
                {similar.map(item=>(
                  <button key={item.id} onClick={()=>{const c=Object.keys(CATALOGUE).find(cc=>CATALOGUE[cc].some(i=>i.id===item.id))||"business";setSelCat(c);setSelItem(item);setSpend("");setFreq("");setDist("");setAccess("");setStep("gate");}}
                    style={{width:"100%",background:C.surface2,border:`1px solid ${C.line}`,borderRadius:9,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:9,fontFamily:sans,textAlign:"left",marginBottom:3}}>
                    <span style={{fontSize:16}}>{item.emoji}</span><span style={{...ty.sm,flex:1,color:C.t1}}>{item.label}</span><span style={{...ty.meta,color:C.green}}>Vote →</span>
                  </button>
                ))}
                <button onClick={()=>setSugStep("describe")} style={{width:"100%",marginTop:4,padding:"7px",borderRadius:8,background:"transparent",border:`1px dashed ${C.line}`,color:C.t3,cursor:"pointer",...ty.meta,fontWeight:600}}>
                  None of these — it's something different →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* == Category tab bar */}
      <div style={{display:"flex",gap:0,overflowX:"auto",borderBottom:`1px solid ${C.line}`,background:C.bg,flexShrink:0}}>
        {topCatKeys.map(k=>{
          const tc=catConfig[k];
          const used=(CATALOGUE[selCat]||[]).filter(i=>i.cat===k).reduce((s,i)=>s+(coinAlloc[i.id]||0),0);
          const isActive=k===activeTopCat;
          return(
            <button key={k} onClick={()=>{setSelTopCat(k);setSearch("");setSugStep("idle");}}
              style={{padding:"10px 14px",background:"transparent",border:"none",borderBottom:isActive?`2px solid ${cfg.color}`:"2px solid transparent",
                cursor:"pointer",fontFamily:sans,whiteSpace:"nowrap",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:14}}>{tc.emoji}</span>
              <span style={{...ty.meta,color:isActive?cfg.color:C.t3,fontWeight:isActive?700:400,fontSize:10}}>{tc.label}</span>
              {used>0&&<span style={{width:5,height:5,borderRadius:"50%",background:cfg.color,display:"block"}}/>}
            </button>
          );
        })}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"10px 16px 20px"}}>
        {coinsLeft(selCat)===0&&<div style={{...ty.sm,color:cfg.color,background:`${cfg.color}10`,border:`1px solid ${cfg.color}20`,borderRadius:10,padding:"9px 12px",marginBottom:10}}>Budget full — remove coins from an item to reallocate</div>}
        {(()=>{
          // When searching, show flat filtered list
          if(search.trim().length > 0){
            return (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {displayItems.map(opt=><CatalogueItem key={opt.id} opt={opt} coins={coinAlloc[opt.id]||0} meta={itemMeta[opt.id]} cfg={cfg} selCat={selCat} coinsLeft={coinsLeft} setSelItem={setSelItem} setSpend={setSpend} setFreq={setFreq} setDist={setDist} setAccess={setAccess} setStep={setStep} setSelAttrs={setSelAttrs} setActAudience={setActAudience} setActStyle={setActStyle} setActAccess={setActAccess} setSelCoins={setSelCoins}/>)}
                {displayItems.length===0&&(
                  <div style={{marginTop:8,padding:"12px 14px",background:`${C.coral}08`,border:`1px solid ${C.coral}20`,borderRadius:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><span style={{fontSize:15}}>🌱</span><span style={{...ty.sm,color:C.t1,fontWeight:600}}>"{search}" isn't on the list yet</span></div>
                    <div style={{...ty.meta,color:C.t2,lineHeight:1.6,marginBottom:10}}>Suggest it to the community. If approved, you'll be notified and can vote on it.</div>
                    <button onClick={()=>setShowSuggestFromVote(true)} style={{width:"100%",padding:"9px",borderRadius:10,background:C.coral,color:"#fff",border:"none",cursor:"pointer",...ty.sm,fontWeight:700,fontFamily:sans}}>Suggest this →</button>
                  </div>
                )}
              </div>
            );
          }
          // Grouped by subcat within active top-cat
          const subGroups = activeTopCatCfg.groups || [];
          const idMap = {};
          (CATALOGUE[selCat]||[]).forEach(i=>{ idMap[i.id]=i; });
          return (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {subGroups.map(grp=>{
                const grpItems = grp.ids.map(id=>idMap[id]).filter(Boolean);
                const allocatedInGroup = grpItems.filter(it=>(coinAlloc[it.id]||0)>0).length;
                return <CollapsibleGroup key={grp.id} grp={grp} items={grpItems} allocated={allocatedInGroup} cfg={cfg} selCat={selCat} coinsLeft={coinsLeft} setSelItem={setSelItem} setSpend={setSpend} setFreq={setFreq} setDist={setDist} setAccess={setAccess} setStep={setStep} coinAlloc={coinAlloc} itemMeta={itemMeta} setSelAttrs={setSelAttrs} setActAudience={setActAudience} setActStyle={setActStyle} setActAccess={setActAccess} setSelCoins={setSelCoins}/>;
              })}
            </div>
          );
        })()}
      </div>
      <div style={{padding:"12px 16px 28px",background:C.bg,borderTop:`1px solid ${C.line}`}}>
        <button onClick={onClose} style={{width:"100%",padding:"14px",borderRadius:14,background:C.coral,color:"#fff",border:"none",cursor:"pointer",...ty.btn,fontSize:15}}>Save & done →</button>
      </div>
    </div>
  );

  if(step==="gate"){
    const isActivity = selCat==="activity";
    const itemSubcat = selItem?.subcat||"";
    const tagOptions = (SUBCAT_TAGS[itemSubcat]||[]).map(id=>Object.assign({id:id},ALL_TAGS[id]||{})).filter(t=>t.label);
    const showCompetitive = isActivity && COMPETITIVE_ACTIVITIES.has(selItem ? selItem.id : "");
    const tagGroupNames = tagOptions.reduce(function(acc,t){if(acc.indexOf(t.group)<0)acc.push(t.group);return acc;},[]);
    const actOk = isActivity ? (actAudience&&actStyle&&actAccess) : true;
    const ok = spend&&freq&&dist&&access&&actOk;
    return (
      <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <div style={{background:C.surface,borderTop:`1px solid ${C.line}`,borderRadius:"22px 22px 0 0",padding:"8px 20px 48px",width:"100%",maxWidth:480,boxShadow:"0 -24px 64px #00000090",overflowY:"auto",maxHeight:"92vh"}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.line,margin:"12px auto 22px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,padding:"13px",background:C.surface2,borderRadius:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:cfg.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{selItem?.emoji}</div>
            <div style={{flex:1}}><div style={{...ty.h3,marginBottom:2}}>{selItem?.label}</div><div style={{...ty.sm}}>{selCat==="activity"?"Answer a few questions to place your coins":"A few questions before your coins count"}</div></div>
            <button onClick={()=>setStep("list")} style={{background:"transparent",border:"none",color:C.t3,cursor:"pointer"}}><X size={16}/></button>
          </div>
          {/* == COIN STEPPER */}
          <div style={{marginBottom:20,padding:"14px 16px",background:`${cfg.color}0A`,border:`1px solid ${cfg.color}25`,borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{...ty.bodyMd,fontSize:14,color:C.t1,marginBottom:2}}>How many coins?</div>
                <div style={{...ty.meta,color:C.t3}}>{coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0))} remaining · max 10 per item</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>setSelCoins(c=>Math.max(1,c-1))}
                  style={{width:32,height:32,borderRadius:9,background:C.surface2,border:`1px solid ${C.line}`,color:selCoins>1?C.t1:C.t3,cursor:selCoins>1?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Minus size={13}/>
                </button>
                <span style={{fontFamily:serif,fontSize:24,fontWeight:700,color:cfg.color,minWidth:24,textAlign:"center"}}>{selCoins}</span>
                <button onClick={()=>setSelCoins(c=>Math.min(Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0))),c+1))}
                  disabled={selCoins>=Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0)))}
                  style={{width:32,height:32,borderRadius:9,background:selCoins<Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0)))?`${cfg.color}15`:C.surface2,border:`1px solid ${selCoins<Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0)))?cfg.color+"30":C.line}`,color:selCoins<Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0)))?cfg.color:C.t3,cursor:selCoins<Math.min(10,coinsLeft(selCat)+((selItem ? coinAlloc[selItem.id]||0 : 0)))?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Plus size={13}/>
                </button>
              </div>
            </div>
          </div>

          {[
            {lbl:"How much would you spend per visit?",opts:SPEND_OPTS,val:spend,set:setSpend,color:cfg.color},
            {lbl:"How often would you go?",            opts:FREQ_OPTS, val:freq, set:setFreq, color:cfg.color},
            {lbl:"How far would you travel?",          opts:DIST_OPTS, val:dist, set:setDist, color:C.amber},
          ].map(row=>(
            <div key={row.lbl} style={{marginBottom:18}}>
              <SLabel>{row.lbl}</SLabel>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {row.opts.map(o=><Chip key={o} label={o} active={row.val===o} onClick={()=>row.set(o)} color={row.color} sm/>)}
              </div>
            </div>
          ))}
          {/* Access question — how do you currently get this? */}
          <div style={{marginBottom:18}}>
            <SLabel>How do you currently get this?</SLabel>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {ACCESS_OPTS.map(o=>(
                <button key={o.v} onClick={()=>setAccess(o.v)}
                  style={{padding:"10px 14px",borderRadius:10,border:`1px solid ${access===o.v?cfg.color:C.line}`,
                    background:access===o.v?`${cfg.color}12`:"transparent",
                    color:access===o.v?cfg.color:C.t2,cursor:"pointer",fontFamily:sans,fontSize:13,
                    textAlign:"left",fontWeight:access===o.v?600:400,transition:"all .14s",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${access===o.v?cfg.color:C.line}`,
                    background:access===o.v?cfg.color:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {access===o.v&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
                  </div>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {/* == ACTIVITY QUESTIONS (activities only) */}
          {isActivity&&(
            <div style={{marginBottom:18,padding:"14px",background:C.surface2,borderRadius:14,border:`1px solid ${C.line}`}}>
              <SLabel>A few more details</SLabel>
              {/* Audience */}
              <div style={{marginBottom:14}}>
                <div style={{...ty.sm,color:C.t2,marginBottom:7}}>Who is this for?</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["Kids","Adults","Everyone"].map(o=>(
                    <button key={o} onClick={()=>setActAudience(o)}
                      style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${actAudience===o?cfg.color:C.line}`,
                        background:actAudience===o?`${cfg.color}15`:"transparent",
                        color:actAudience===o?cfg.color:C.t2,cursor:"pointer",fontFamily:sans,...ty.sm,fontWeight:actAudience===o?700:400}}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              {/* Participation style */}
              <div style={{marginBottom:14}}>
                <div style={{...ty.sm,color:C.t2,marginBottom:7}}>What style?</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["Casual","Structured classes",...(showCompetitive?["Advanced / competitive"]:[])]
                    .map(o=>(
                      <button key={o} onClick={()=>setActStyle(o)}
                        style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${actStyle===o?cfg.color:C.line}`,
                          background:actStyle===o?`${cfg.color}15`:"transparent",
                          color:actStyle===o?cfg.color:C.t2,cursor:"pointer",fontFamily:sans,...ty.sm,fontWeight:actStyle===o?700:400}}>
                        {o}
                      </button>
                    ))}
                </div>
              </div>
              {/* Access model */}
              <div>
                <div style={{...ty.sm,color:C.t2,marginBottom:7}}>How do you want to join?</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["Drop-in","Membership / subscription"].map(o=>(
                    <button key={o} onClick={()=>setActAccess(o)}
                      style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${actAccess===o?cfg.color:C.line}`,
                        background:actAccess===o?`${cfg.color}15`:"transparent",
                        color:actAccess===o?cfg.color:C.t2,cursor:"pointer",fontFamily:sans,...ty.sm,fontWeight:actAccess===o?700:400}}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* == BUSINESS TAGS (businesses only) */}
          {!isActivity&&tagOptions.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                <SLabel noMargin>What matters most to you?</SLabel>
                <span style={{...ty.meta,color:selAttrs.size>=3?cfg.color:C.t3,fontWeight:600}}>
                  {selAttrs.size}/3
                </span>
              </div>
              <div style={{...ty.meta,color:C.t2,marginBottom:10}}>Pick up to 3 tags that best describe what you want from this place.</div>
              {/* Group tags by group label */}
              {tagGroupNames.map(function(grp){
                const grpTags=tagOptions.filter(function(t){return t.group===grp;});
                return(
                  <div key={grp} style={{marginBottom:12}}>
                    <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,letterSpacing:"0.06em",marginBottom:6}}>{grp.toUpperCase()}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {grpTags.map(function(t){
                        const on=selAttrs.has(t.id);
                        const disabled=!on&&selAttrs.size>=3;
                        return(
                          <button key={t.id} disabled={disabled}
                            onClick={function(){var arr=Array.from(selAttrs);var idx=arr.indexOf(t.id);if(idx>=0){arr.splice(idx,1);}else{arr.push(t.id);}setSelAttrs(new Set(arr));}}
                            style={{padding:"6px 12px",borderRadius:8,border:"1px solid "+(on?cfg.color:C.line),
                              background:on?(cfg.color+"15"):"transparent",
                              color:on?cfg.color:(disabled?C.t3:C.t2),
                              cursor:disabled?"default":"pointer",fontFamily:sans,...ty.meta,
                              fontWeight:on?700:400,opacity:disabled?0.4:1,transition:"all .12s"}}>
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{...ty.meta,color:C.t3,lineHeight:1.65,padding:"9px 12px",background:C.surface2,borderRadius:9,marginBottom:16}}>
            🔒 Fully anonymised. Businesses only see aggregated signals — never your identity.
          </div>
          <button disabled={!ok} onClick={()=>{
              const metaBase={spend,freq,dist,access,attrs:Array.from(selAttrs)};
              const meta=isActivity?{spend,freq,dist,access,attrs:Array.from(selAttrs),actAudience:actAudience,actStyle:actStyle,actAccess:actAccess}:metaBase;
              setItemMeta(m=>({...m,[selItem.id]:meta}));
              setCoin(selItem.id,selCat,selCoins);
              setSelAttrs(new Set());setActAudience("");setActStyle("");setActAccess("");
              setStep("done");
            }}
            style={{width:"100%",padding:"15px",borderRadius:14,background:ok?cfg.color:C.surface2,color:ok?"#fff":C.t3,border:"none",cursor:ok?"pointer":"default",...ty.btn,fontSize:15,transition:"all .2s"}}>
            Confirm & place coins →
          </button>
        </div>
      </div>
    );
  }

  if(step==="done") return (
    <div style={{background:C.bg,minHeight:"calc(100vh - 120px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:sans,textAlign:"center",paddingBottom:100}}>
      <div style={{width:64,height:64,borderRadius:20,background:`${C.green}15`,border:`1px solid ${C.green}25`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><Check size={30} color={C.green}/></div>
      <div style={{...ty.h2,marginBottom:6}}>Coins placed!</div>
      <div style={{padding:"10px 16px",background:C.purple+"14",border:"1px solid "+C.purple+"30",borderRadius:12,marginBottom:16,maxWidth:280,textAlign:"center"}}>
        <div style={{...ty.sm,color:C.purple,fontWeight:600,marginBottom:2}}>Want to shape what it looks like?</div>
        <div style={{...ty.meta,color:C.t3,lineHeight:1.5}}>Visit The Brief — add your ideas and see what other residents are asking for.</div>
      </div>
      <div style={{fontSize:24,marginBottom:4}}>{selItem?.emoji}</div>
      <div style={{...ty.bodyMd,marginBottom:4}}>{selItem?.label}</div>
      <div style={{...ty.sm,color:C.t3,marginBottom:28}}>Your demand is now part of the signal for this area.</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{setStep("cat");setSelItem(null);setSpend("");setFreq("");setDist("");setAccess("");setQuery("");setSugStep("idle");setSelAttrs(new Set());setActAudience("");setActStyle("");setActAccess("");setSelCoins(1);}} style={{padding:"11px 18px",background:C.surface,border:`1px solid ${C.line}`,borderRadius:12,color:C.t2,cursor:"pointer",...ty.btn,fontSize:13}}>Vote on more</button>
        <button onClick={onClose} style={{padding:"11px 18px",background:C.coral,color:"#fff",border:"none",borderRadius:12,cursor:"pointer",...ty.btn,fontSize:13}}>Done</button>
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
            <div style={{...ty.sm,color:C.t1,fontWeight:600,marginBottom:14}}>{step+1} of {qs.length} · {qs[step]?.q}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
              {(qs[step]?.opts||[]).map(o=>(
                <button key={o} onClick={()=>{setAnswers(a=>({...a,[qs[step].id]:o}));if(step<qs.length-1)setStep(s=>s+1);}}
                  style={{padding:"13px 16px",borderRadius:12,border:`1px solid ${answers[qs[step]?.id]===o?C.purple:C.line}`,background:answers[qs[step]?.id]===o?`${C.purple}15`:C.surface2,color:answers[qs[step]?.id]===o?C.purple:C.t1,cursor:"pointer",fontFamily:sans,fontSize:14,textAlign:"left",fontWeight:answers[qs[step]?.id]===o?600:400,transition:"all .14s"}}>
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
  const [open, setOpen] = React.useState(false);
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
  const remaining  = 20 - totalSpent;
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
              {remaining>0?`${20-remaining} / 20 placed`:"All 20 placed ✓"}
            </span>
          </div>
          <div style={{height:5,background:C.line,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.round(((20-remaining)/20)*100)}%`,background:remaining>0?C.coral:C.green,borderRadius:3}}/>
          </div>
        </div>

        {/* Two main actions */}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <button onClick={()=>onAllocate(false)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",
              background:`${C.coral}14`,border:`1px solid ${C.coral}35`,borderRadius:16,
              cursor:"pointer",textAlign:"left",width:"100%",fontFamily:sans}}>
            <div style={{width:44,height:44,borderRadius:12,background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🪙</div>
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

        {/* Social proof nudge */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:16,padding:"10px 14px",background:C.surface2,borderRadius:12,border:`1px solid ${C.line}`}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${C.coral}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🏘️</div>
          <div style={{...ty.meta,color:C.t2,lineHeight:1.5}}>
            Joining <span style={{color:C.t1,fontWeight:600}}>{FEED_WITH_METRICS.reduce(function(s,i){return s+i.voters;},0).toLocaleString()} residents</span> already shaping their area
          </div>
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
        {[{l:"Coins placed",v:totalSpent,unit:"/20",c:C.coral},{l:"Items supported",v:allVotedCount,c:C.t1}].map(s=>(
          <Card key={s.l} style={{textAlign:"center",padding:"20px 14px"}}><div style={{fontFamily:serif,fontSize:32,fontWeight:700,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}<span style={{fontSize:13,color:C.t3}}>{s.unit}</span></div><div style={{...ty.meta}}>{s.l}</div></Card>
        ))}
      </div>

      {/* Trending header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <SLabel noMargin>Trending in {user.postcode}</SLabel>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[{id:"all",l:"All"},{id:"business",l:"Businesses"},{id:"activity",l:"Activities"}].map(f=><Chip key={f.id} label={f.l} active={filter===f.id} onClick={()=>setFilter(f.id)} sm/>)}
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
  const [editing,setEditing]=useState(false);
  const [age,  setAge]  =useState(user.age||"");
  const [gndr, setGndr] =useState(user.gender||"");
  const [hh,   setHH]   =useState(user.household||"");
  const [kids, setKids] =useState(user.kids??null);

  function saveProfile(){
    setUser(u=>({...u,age,gender:gndr,household:hh,kids}));
    setEditing(false);
  }

  return (
    <div style={{padding:"26px 16px 100px"}}>
      <h2 style={{...ty.h2,marginBottom:4}}>Profile</h2>
      <div style={{...ty.body,marginBottom:20}}>Update your details any time — your allocation history is kept.</div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <SLabel noMargin>Your details</SLabel>
        <button onClick={()=>setEditing(e=>!e)} style={{background:"none",border:`1px solid ${editing?C.coral:C.line}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",color:editing?C.coral:C.t2,...ty.meta,fontWeight:600}}>
          {editing?"Cancel":"Edit"}
        </button>
      </div>

      {!editing?(
        <Card style={{padding:0,overflow:"hidden",marginBottom:20}}>
          {[
            {l:"District",          v:user.postcode},
            {l:"Age range",         v:user.age||"—"},
            {l:"Gender",            v:user.gender||"—"},
            {l:"Household",         v:user.household||"—"},
            {l:"Children under 12", v:user.kids?"Yes":"No"},
          ].map((row,i)=>(
            <div key={row.l}>{i>0&&<HR/>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 18px"}}>
                <span style={{...ty.sm,color:C.t2}}>{row.l}</span>
                <span style={{...ty.bodyMd,fontSize:13}}>{row.v}</span>
              </div>
            </div>
          ))}
        </Card>
      ):(
        <Card style={{marginBottom:20}}>
          {[{l:"Age bracket",opts:AGES,v:age,s:setAge,c:C.coral},{l:"Gender",opts:GNDR,v:gndr,s:setGndr,c:C.coral},{l:"Household",opts:HHLD,v:hh,s:setHH,c:C.coral}].map(f=>(
            <div key={f.l} style={{marginBottom:16}}>
              <SLabel>{f.l}</SLabel>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{f.opts.map(o=><Chip key={o} label={o} active={f.v===o} onClick={()=>f.s(o)} color={f.c} sm/>)}</div>
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <SLabel>Children under 12 at home?</SLabel>
            <div style={{display:"flex",gap:8}}>
              {["Yes","No"].map(v=><button key={v} onClick={()=>setKids(v==="Yes")} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${kids===(v==="Yes")?C.coral:C.line}`,background:kids===(v==="Yes")?`${C.coral}15`:"transparent",color:kids===(v==="Yes")?C.coral:C.t2,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:kids===(v==="Yes")?600:400}}>{v}</button>)}
            </div>
          </div>
          <button onClick={saveProfile} style={{width:"100%",padding:"12px",borderRadius:12,background:C.coral,color:"#fff",border:"none",cursor:"pointer",...ty.btn}}>Save changes →</button>
        </Card>
      )}

      {/* Data transparency */}
      <SLabel>What we share — and what we don't</SLabel>
      <Card style={{marginBottom:12,padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#E8A83020",border:"1px solid #E8A83030",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Check size={11} color={C.amber}/></div>
            <div style={{...ty.sm,color:C.amber,fontWeight:600}}>Shared with businesses — anonymously</div>
          </div>
          <div style={{...ty.meta,color:C.t2,lineHeight:1.7,marginLeft:28}}>Age range · Gender · Household type · Whether children at home · Spend ranges · Visit frequency · Travel distance · District (e.g. SW4) — sector-level (e.g. SW4 9) visible to Pro+ businesses only</div>
          <div style={{...ty.meta,color:C.t3,lineHeight:1.6,marginLeft:28,marginTop:6}}>Businesses see aggregated signals only — e.g. "42% of voters are families aged 25–34". They never see individual responses.</div>
        </div>
        <div style={{height:1,background:C.line}}/>
        <div style={{padding:"14px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#2ECC8A20",border:"1px solid #2ECC8A30",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><X size={11} color={C.green}/></div>
            <div style={{...ty.sm,color:C.green,fontWeight:600}}>Never shared or sold</div>
          </div>
          <div style={{...ty.meta,color:C.t2,lineHeight:1.7,marginLeft:28}}>Your email · Your name · Your full postcode (stored securely, never shared) · Your individual votes · Any data that could identify you personally</div>
        </div>
      </Card>

      <Card style={{marginBottom:20,background:"#9B7DF50A",border:"1px solid #9B7DF520"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{flexShrink:0,marginTop:1,fontSize:14}}>🔄</div>
          <div>
            <div style={{...ty.sm,color:C.purple,fontWeight:600,marginBottom:3}}>Annual vote refresh</div>
            <div style={{...ty.meta,color:C.t2,lineHeight:1.65}}>Your 30 coins reset once a year so the data stays current. We nudge you every 2 months in case anything has changed — but you can reallocate anytime.</div>
          </div>
        </div>
      </Card>

      <button onClick={onLogout} style={{width:"100%",padding:"13px",borderRadius:14,background:"transparent",border:`1px solid ${C.line}`,color:C.t2,cursor:"pointer",...ty.btn}}>Sign out</button>
    </div>
  );
}


/* ==================================================
   PRE-LAUNCH PAGE DATA
================================================== */

// Question bank by industry -- curated by Cravz
const PRELAUNCH_QUESTIONS = {
  restaurant: [
    {id:"rq1", q:"What type of cuisine is most missing locally?", opts:["Japanese / Sushi","Middle Eastern","Modern European","Korean","South American"]},
    {id:"rq2", q:"What price point suits you most?", opts:["Under £15 per head","£15–25 per head","£25–40 per head","£40+ per head"]},
    {id:"rq3", q:"What matters most to you in a local restaurant?", opts:["Quality of food","Value for money","Atmosphere","Service","Convenience"]},
  ],
  fitness: [
    {id:"fq1", q:"What type of fitness offering is most missing?", opts:["Strength & conditioning","Group classes","Mind-body (yoga/pilates)","Combat sports","Swimming"]},
    {id:"fq2", q:"What membership model works best for you?", opts:["Monthly rolling","Class packs","Annual upfront","Pay per session"]},
  ],
  retail: [
    {id:"roq1", q:"What type of independent retail is most missing?", opts:["Clothing & fashion","Books","Homewares","Specialist food","Health & beauty"]},
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
  const [openGroups, setOpenGroups] = React.useState(new Set());
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

// -- ClosedSurveyCard -- proper component so useState is valid
function ClosedSurveyCard({survey, allQs}){
  const [expanded, setExpanded] = React.useState(false);
  const totalResponses = 47 + (survey.id % 20);
  const qBank2 = survey.questions || (survey.qIds ? allQs.filter(q=>survey.qIds.includes(q.id)) : allQs.slice(0,5));
  const resultsData = getSimResponses(qBank2.length ? qBank2 : allQs.slice(0,5), totalResponses);
  return (
    <Card style={{marginBottom:10,padding:0,overflow:"hidden"}}>
      <button onClick={()=>setExpanded(e=>!e)}
        style={{width:"100%",padding:"14px 16px",background:"transparent",border:"none",cursor:"pointer",
          fontFamily:sans,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:C.amber,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{...ty.bodyMd,fontSize:13}}>{survey.label||survey.title}</div>
          <div style={{...ty.meta,color:C.t3}}>{totalResponses} responses · {survey.status||"closed"} · {survey.createdAt||survey.opening||""}</div>
        </div>
        <ChevronDown size={14} color={C.t3} style={{transform:expanded?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
      </button>
      {expanded&&(
        <div style={{borderTop:`1px solid ${C.line}`,padding:"14px 16px"}}>
          {resultsData.map(q=>{
            const max=Math.max(...q.counts,1);
            return (
              <div key={q.id} style={{marginBottom:14}}>
                <div style={{...ty.sm,color:C.t1,marginBottom:8,fontWeight:500}}>{q.q}</div>
                {q.opts.map((o,i)=>(
                  <div key={i} style={{marginBottom:5}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{...ty.meta,color:C.t2,fontSize:11}}>{o}</span>
                      <span style={{...ty.meta,color:C.amber,fontWeight:600,fontSize:11}}>{q.counts[i]||0}</span>
                    </div>
                    <div style={{height:5,background:C.line,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${((q.counts[i]||0)/max)*100}%`,background:C.amber,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Card>
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
const FAQ_ITEMS = [
  {q:"What is the Confidence score?",a:"Confidence reflects how many independent voices have voted for an item. Indicative (<50), Low (50–99), Medium (100–199), High (200–499), Very High (500+). More voices = more reliable as a business signal."},
  {q:"What does Intensity (X/10) mean?",a:"Intensity is the average number of coins voters placed on this item, out of 10. High intensity means voters feel strongly — they didn't just add a token coin, they allocated serious budget. A score above 7 suggests this is a genuine priority, not casual interest."},
  {q:"How is Avg Spend calculated?",a:"Voters answer 'how much would you spend per visit?' when placing coins. We take the weighted average across all responses. This is a stated preference, not observed spend — treat it as directional rather than precise."},
  {q:"What is Catchment type?",a:"Catchment is derived from how far voters say they'd travel. Hyper-local means 50%+ would walk under 5 minutes — this item needs to be very close to where people live. Destination means demand comes from a wider area and footfall may be more distributed."},
  {q:"How is Monthly Revenue estimated?",a:"Monthly Revenue = voters × avg spend × visits per month. This is an estimate based on stated preferences from the voters in your selected area. It represents potential revenue from those verified demand signals — not a forecast of total market revenue."},
  {q:"What does Distance distribution show?",a:"The percentage of voters who'd travel each distance to use this business. A bar heavy on '<5 min' means you need to be hyper-local. A spread toward '20 min+' means people will travel — useful for site selection."},
  {q:"What do Demographics show?",a:"Demographics show the age, gender, and household composition of voters for this specific item. These are aggregated and anonymised — no individual voter can be identified. Useful for understanding who your customer actually is, vs who you assumed it would be."},
  {q:"Why do votes reset annually?",a:"Annual resets keep demand data current. A neighbourhood's needs change as new businesses open, populations shift, and people's lives evolve. Stale demand data is worse than no data — it can lead businesses to the wrong decision. Residents are notified and can reallocate any time."},
  {q:"What is Momentum?",a:"Momentum tracks the percentage change in voter count over the past 30 days. +31% means 31% more people voted for this item this month vs last month. Useful for spotting items gaining traction quickly — these may be worth acting on before a competitor does."},
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
                      {canSee(tier,"pro")&&<div style={{...ty.meta,color:C.t3,marginTop:2}}>{fmtMoney(item.monthlyRev)}/mo</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Adjacent areas — top 3 */}
            {hasAdj&&canSee(tier,"starter")&&(
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

            {!canSee(tier,"starter")&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,background:C.surface2,border:`1px solid ${C.line}`}}>
                <Lock size={13} color={C.t3}/>
                <div style={{flex:1,...ty.sm,color:C.t2}}>Adjacent area signals — Starter+</div>
                <button onClick={()=>bump("starter")} style={{padding:"5px 11px",borderRadius:8,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:11}}>Unlock</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function OfferInput({itemId, onSave}){
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
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

function BizDashboard({session,onLogout,onUpdateSession}){
  const acctType = session?.acctType||"business";
  const acctCfg = ACCOUNT_TYPES.find(a=>a.id===acctType)||ACCOUNT_TYPES[0];
  const [tier, setTier] = useState(session?.tier||"free");
  const [bizTab, setBizTab] = useState("demand");
  const [showUpgrade, setUpg] = useState(false);
  const [upgradeTarget, setUT] = useState("starter");
  const sessionAreas = session?.areas||["SW4"];
  const sessionAreas2 = sessionAreas.length>0 ? sessionAreas : ["SW4"];
  const homeArea = sessionAreas[0]||"SW4";
  const thisTier = TIERS.find(t=>t.id===tier)||TIERS[0];
  
  function bump(targetTier){setUT(targetTier);setUpg(true);}

  // Report state
  const [reportMode, setReportMode] = useState("business");
  const [reportConcept, setReportConcept] = useState(null);
  const [reportConceptOpen, setReportConceptOpen] = useState(false);
  const [reportArea, setReportArea] = useState(null);
  const [reportSector, setReportSector] = useState(null);
  const activeArea = reportArea || sessionAreas2[0];
  const activeSectors = (SECTORS_MAP[activeArea]||[]);
  const activeSector = reportSector && activeSectors.includes(reportSector) ? reportSector : null;
  const activeConcept = reportConcept || FEED_WITH_METRICS[0];
  const cc = CAT_CFG[activeConcept.cat] || CAT_CFG.business;
  const cf = conf(activeConcept.voters);
  const m = calcMetrics(activeConcept);
  const avgSpendFmt = fmtAvgSpend(m.avgSpend);
  const localPct = Math.round((activeConcept.distrib[0]+activeConcept.distrib[1]));
  const highSpend = activeConcept.spendDist.slice(4).reduce((s,v)=>s+v,0);
  const lowSpend = activeConcept.spendDist.slice(0,2).reduce((s,v)=>s+v,0);
  const freqLabels = ["A few times a year","Once a month","2–3× a month","Weekly","Multiple times a week"];
  const oppScore = Math.round((activeConcept.voters/500)*4 + (activeConcept.momentum/50)*3 + (localPct/100)*3);
  const momentumWord = activeConcept.momentum>20?"accelerating":activeConcept.momentum>10?"growing steadily":"building";
  const catchmentWord = localPct>60?"hyper-local":"neighbourhood-level";
  const spendWord = highSpend>40?"premium":"mid-range";
  const trendForArea = TREND_DATA[activeArea]||TREND_DATA["SW4"];
  const trendVals = trendForArea[activeConcept.id]||[Math.round(activeConcept.voters*0.6),Math.round(activeConcept.voters*0.8),activeConcept.voters];
  const heatData = (HEATMAP[activeConcept.id]||[]).sort((a,b)=>b.score-a.score);
  const insightText = `${activeConcept.voters} verified residents in ${activeArea} have declared demand for ${activeConcept.label.toLowerCase()}, with signal ${momentumWord} at +${activeConcept.momentum}% month-on-month. Catchment analysis suggests this is a ${catchmentWord} opportunity — ${localPct}% of voters are within a 10-minute walk. Declared spend skews ${spendWord} at an average of ${avgSpendFmt} per visit. The demographic profile points to ${activeConcept.demo.hh.toLowerCase()} as the primary audience.`;
  const [faqOpen, setFaqOpen] = useState(null);

  const TABS = [
    {id:"demand", l:"Demand"}, {id:"prelaunch", l:"Pre-launch"}, {id:"reports", l:"Reports"}, {id:"faq", l:"FAQ"}, {id:"profile", l:"Profile"}
  ];
  // Pre-launch state
  const [plStep, setPlStep] = useState("list");
  const [plSelected, setPlSelected] = useState(new Set());
  const [activePL, setActivePL] = useState(null);

  return (
    <div style={{background:C.bg, minHeight:"100vh", fontFamily:sans, color:C.t1}}>
      {/* Upgrade modal */}
      {showUpgrade&&(
        <div style={{position:"fixed",inset:0,background:"#000000CC",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:C.surface,borderRadius:"22px 22px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480}}>
            <div style={{...ty.h3,marginBottom:8}}>Upgrade to {TIERS.find(t=>t.id===upgradeTarget)?.name}</div>
            <div style={{...ty.body,color:C.t2,marginBottom:20}}>{TIERS.find(t=>t.id===upgradeTarget)?.features.join(" · ")}</div>
            <button onClick={()=>{setTier(upgradeTarget);setUpg(false);onUpdateSession&&onUpdateSession({...session,tier:upgradeTarget});}}
              style={{width:"100%",padding:"14px",borderRadius:14,background:C.coral,color:"#fff",border:"none",cursor:"pointer",...ty.btn,fontSize:15,marginBottom:10}}>
              Upgrade now →
            </button>
            <button onClick={()=>setUpg(false)} style={{width:"100%",padding:"12px",borderRadius:14,background:"transparent",border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:14}}>Cancel</button>
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
          <button onClick={()=>bump(tier==="free"?"starter":tier==="starter"?"pro":tier==="pro"?"enterprise":"enterprise")}
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
          {FEED_WITH_METRICS.slice(0,canSee(tier,"starter")?FEED_WITH_METRICS.length:5).map((item,i)=>{
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
                    {canSee(tier,"pro")&&<div style={{...ty.meta,color:C.t3,marginTop:2}}>{fmtMoney(item.monthlyRev)}/mo</div>}
                  </div>
                </div>
              </Card>
            );
          })}
          {!canSee(tier,"starter")&&(
            <div style={{padding:"14px",background:C.surface,border:"1px solid "+C.line,borderRadius:12,textAlign:"center"}}>
              <Lock size={14} color={C.t3} style={{marginBottom:6}}/>
              <div style={{...ty.sm,color:C.t2,marginBottom:10}}>Starter+ unlocks all concepts and full data</div>
              <button onClick={()=>bump("starter")} style={{padding:"9px 20px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade to Starter</button>
            </div>
          )}
        </div>
      )}

      {/* REPORTS TAB */}
      {bizTab==="reports"&&(()=>{
        return (
          <div style={{padding:"16px 16px 80px"}}>
            {/* Mode toggle */}
            <div style={{display:"flex",gap:0,marginBottom:20,background:C.surface2,borderRadius:10,padding:3,border:"1px solid "+C.line}}>
              {[{id:"business",l:"By Business"},{id:"area",l:"By Area"}].map(m=>(
                <button key={m.id} onClick={()=>setReportMode(m.id)}
                  style={{flex:1,padding:"8px",borderRadius:8,background:reportMode===m.id?C.surface:"transparent",
                    border:"1px solid "+(reportMode===m.id?C.line:"transparent"),
                    color:reportMode===m.id?C.t1:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,fontWeight:reportMode===m.id?600:400}}>
                  {m.l}
                </button>
              ))}
            </div>

            {reportMode==="area"&&(()=>{
              const allBiz = FEED_WITH_METRICS.filter(i=>i.cat==="business").sort((a,b)=>b.voters-a.voters);
              const allActs = FEED_WITH_METRICS.filter(i=>i.cat==="activity").sort((a,b)=>b.voters-a.voters);
              const totalVoters = FEED_WITH_METRICS.reduce((s,i)=>s+i.voters,0);
              const totalMonthlyRev = allBiz.reduce((s,i)=>s+i.monthlyRev,0);
              return (
                <div>
                  <div style={{marginBottom:16}}>
                    <select value={activeArea} onChange={e=>setReportArea(e.target.value)}
                      style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:10,padding:"10px 12px",fontFamily:sans,fontSize:13,color:C.t1,appearance:"none"}}>
                      {sessionAreas2.map((a,ai)=><option key={a} value={a}>{ai===0?"★ ":""}{a}</option>)}
                    </select>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                    {[
                      {l:"Verified voices",v:totalVoters.toLocaleString(),c:C.green},
                      {l:"Concepts tracked",v:FEED_WITH_METRICS.length,c:C.t1},
                      {l:"Est. monthly rev",v:canSee(tier,"pro")?fmtMoney(totalMonthlyRev):"Pro+",c:canSee(tier,"pro")?C.green:C.t3},
                    ].map(s=>(
                      <div key={s.l} style={{textAlign:"center",padding:"10px 8px",background:C.surface2,borderRadius:12}}>
                        <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                        <div style={{...ty.meta,color:C.t3,fontSize:9,marginTop:3}}>{s.l.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                  <Card style={{marginBottom:16,padding:0,overflow:"hidden"}}>
                    <div style={{padding:"14px 16px 10px",borderBottom:"1px solid "+C.line}}><SLabel noMargin>Business demand — {activeArea}</SLabel></div>
                    {allBiz.map((it,i)=>{
                      const cf2=conf(it.voters);
                      return(
                        <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderTop:i>0?"1px solid "+C.line:"none"}}>
                          <span style={{...ty.meta,color:i<3?C.amber:C.t3,fontWeight:700,width:16,textAlign:"center",flexShrink:0}}>{i+1}</span>
                          <div style={{width:34,height:34,borderRadius:10,background:CAT_CFG[it.cat].bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{it.emoji}</div>
                          <div style={{flex:1}}>
                            <div style={{...ty.sm,fontWeight:600,marginBottom:2}}>{it.label}</div>
                            <span style={{...ty.meta,color:cf2.color,fontWeight:600,fontSize:10}}>{cf2.label} · {it.voters} voices</span>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{...ty.meta,color:C.green,fontWeight:700}}>+{it.momentum}%</div>
                            {canSee(tier,"pro")&&<div style={{...ty.meta,color:C.t3,fontSize:10}}>{fmtMoney(it.monthlyRev)}/mo</div>}
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              );
            })()}

            {reportMode==="business"&&(<>
            <div style={{display:"flex",gap:8,marginBottom:20,alignItems:"stretch"}}>
              <div style={{flex:2,position:"relative"}}>
                <div style={{...ty.label,marginBottom:5}}>Concept</div>
                <button onClick={()=>setReportConceptOpen(o=>!o)}
                  style={{width:"100%",background:C.surface,border:"1px solid "+(reportConceptOpen?C.coral:C.line),borderRadius:10,padding:"9px 12px",cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:8,textAlign:"left"}}>
                  <span style={{fontSize:16}}>{activeConcept.emoji}</span>
                  <span style={{...ty.bodyMd,fontSize:13,flex:1,color:C.t1}}>{activeConcept.label}</span>
                  <ChevronDown size={14} color={C.t3} style={{transform:reportConceptOpen?"rotate(180deg)":"none",transition:"transform .2s",flexShrink:0}}/>
                </button>
                {reportConceptOpen&&(
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:30,background:C.surface,border:"1px solid "+C.line,borderRadius:10,marginTop:4,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
                    {FEED_WITH_METRICS.map(item=>(
                      <button key={item.id} onClick={()=>{setReportConcept(item);setReportConceptOpen(false);}}
                        style={{width:"100%",padding:"9px 12px",background:activeConcept.id===item.id?cc.color+"18":"transparent",border:"none",cursor:"pointer",fontFamily:sans,display:"flex",alignItems:"center",gap:8,textAlign:"left",borderBottom:"1px solid "+C.line}}>
                        <span style={{fontSize:15}}>{item.emoji}</span>
                        <span style={{...ty.bodyMd,fontSize:12,flex:1,color:activeConcept.id===item.id?cc.color:C.t2}}>{item.label}</span>
                        <span style={{...ty.meta,color:C.t3,fontSize:10}}>{item.voters} voices</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{flex:1}}>
                <div style={{...ty.label,marginBottom:5}}>Area</div>
                <select value={activeArea} onChange={e=>{setReportArea(e.target.value);setReportSector(null);}}
                  style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:10,padding:"9px 10px",cursor:"pointer",fontFamily:sans,fontSize:13,color:C.t1,appearance:"none",height:40}}>
                  {sessionAreas2.map((a,ai)=><option key={a} value={a}>{ai===0?"★ ":""}{a}</option>)}
                </select>
              </div>
            </div>

            {/* Sector selector — Pro+ only */}
            {activeSectors.length>0&&(
              <div style={{marginBottom:16}}>
                {canSee(tier,"pro") ? (
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{...ty.label,marginBottom:0}}>Sector:</span>
                    <button onClick={()=>setReportSector(null)}
                      style={{padding:"4px 12px",borderRadius:20,background:!activeSector?C.coral:"transparent",border:"1px solid "+(!activeSector?C.coral:C.line),color:!activeSector?"#fff":C.t3,cursor:"pointer",fontFamily:sans,fontSize:11,fontWeight:!activeSector?700:400}}>
                      All of {activeArea}
                    </button>
                    {activeSectors.map(function(s){
                      const on = activeSector===s;
                      return(
                        <button key={s} onClick={()=>setReportSector(s)}
                          style={{padding:"4px 12px",borderRadius:20,background:on?C.coral:"transparent",border:"1px solid "+(on?C.coral:C.line),color:on?"#fff":C.t2,cursor:"pointer",fontFamily:sans,fontSize:11,fontWeight:on?700:400}}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.surface2,border:"1px solid "+C.line,borderRadius:10}}>
                    <Lock size={11} color={C.t3}/>
                    <span style={{...ty.meta,color:C.t3}}>Sector-level filtering ({activeArea} 0–9) — </span>
                    <button onClick={()=>bump("pro")} style={{background:"none",border:"none",color:C.amber,cursor:"pointer",fontFamily:sans,fontSize:11,fontWeight:700,padding:0}}>Pro+ only</button>
                  </div>
                )}
              </div>
            )}

            {/* Opportunity Score */}
            <div style={{background:"radial-gradient(ellipse 80% 60% at 20% 30%, "+cc.color+"18 0%, "+C.bg+" 70%)",border:"1px solid "+cc.color+"30",borderRadius:18,padding:"20px",marginBottom:16}}>
              <div style={{...ty.label,color:cc.color,marginBottom:10}}>{activeConcept.emoji} {activeConcept.label} — {activeArea}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {[{l:"Demand",v:cf.label,c:cf.color},{l:"Verified voters",v:activeConcept.voters,c:C.t1},{l:"Monthly growth",v:"+"+activeConcept.momentum+"%",c:C.green}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",padding:"10px 8px",background:C.surface2+"CC",borderRadius:10}}>
                    <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                    <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:12,borderTop:"1px solid "+cc.color+"20"}}>
                <div>
                  <div style={{...ty.label,color:C.t3,marginBottom:2}}>Opportunity score</div>
                  <div style={{fontFamily:serif,fontSize:38,fontWeight:700,color:cc.color,lineHeight:1}}>{oppScore}<span style={{fontSize:18,color:C.t3}}> / 10</span></div>
                </div>
                <ConfBar voters={activeConcept.voters}/>
              </div>
            </div>

            {/* Who wants it — Starter+ */}
            {(()=>{
              const dd=DEMO_DIST[activeConcept.id];
              return(
                <Card style={{marginBottom:16,overflow:"hidden",position:"relative"}}>
                  {!canSee(tier,"starter")&&(
                    <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(17,17,16,0.85)",borderRadius:12}}>
                      <Lock size={18} color={C.t3} style={{marginBottom:8}}/>
                      <div style={{...ty.sm,color:C.t2,marginBottom:12,textAlign:"center"}}>Demographic breakdown — Starter+</div>
                      <button onClick={()=>bump("starter")} style={{padding:"8px 18px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade →</button>
                    </div>
                  )}
                  <div style={{filter:canSee(tier,"starter")?"none":"blur(4px)",pointerEvents:canSee(tier,"starter")?"auto":"none"}}>
                  <SLabel>Who wants it</SLabel>
                  {dd?(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <div><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>AGE BREAKDOWN</div><DemoBar items={dd.age} color={cc.color}/></div>
                      <div style={{paddingTop:12,borderTop:"1px solid "+C.line}}><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>HOUSEHOLD TYPE</div><DemoBar items={dd.hh} color={C.purple}/></div>
                      <div style={{paddingTop:12,borderTop:"1px solid "+C.line}}><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>GENDER SPLIT</div><DemoBar items={dd.gender} color={C.amber}/></div>
                    </div>
                  ):(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>PRIMARY AGE</div><div style={{...ty.bodyMd,fontSize:13}}>{activeConcept.demo.age}</div></div>
                      <div><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>HOUSEHOLD</div><div style={{...ty.bodyMd,fontSize:13}}>{activeConcept.demo.hh}</div></div>
                      <div style={{gridColumn:"1/-1"}}><div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:6}}>GENDER</div><div style={{...ty.bodyMd,fontSize:13}}>{activeConcept.demo.gender}</div></div>
                    </div>
                  )}
                  </div>
                </Card>
              );
            })()}

            {/* Spend — Starter+ */}
            <Card style={{marginBottom:16,overflow:"hidden",position:"relative"}}>
              {!canSee(tier,"starter")&&(
                <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(17,17,16,0.85)",borderRadius:12}}>
                  <Lock size={18} color={C.t3} style={{marginBottom:8}}/>
                  <div style={{...ty.sm,color:C.t2,marginBottom:12,textAlign:"center"}}>Spend & frequency data — Starter+</div>
                  <button onClick={()=>bump("starter")} style={{padding:"8px 18px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade →</button>
                </div>
              )}
              <div style={{filter:canSee(tier,"starter")?"none":"blur(4px)",pointerEvents:canSee(tier,"starter")?"auto":"none"}}>
              <SLabel>Spending signal</SLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[{l:"Avg declared spend",v:avgSpendFmt,c:C.t1},{l:"Higher spend voters",v:highSpend+"%",c:highSpend>30?C.coral:C.t2},{l:"Lower spend voters",v:lowSpend+"%",c:C.t2}].map(s=>(
                  <div key={s.l} style={{padding:"10px 8px",background:C.surface2,borderRadius:10,textAlign:"center"}}>
                    <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                    <div style={{fontFamily:serif,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{paddingTop:12,borderTop:"1px solid "+C.line}}>
                <div style={{...ty.meta,color:C.t3,fontSize:10,marginBottom:8}}>VISIT FREQUENCY</div>
                <DemoBar items={freqLabels.map((l,i)=>({l,p:activeConcept.freqDist[i]||0}))} color={C.amber}/>
              </div>
              </div>
            </Card>

            {/* Revenue - pro+ */}
            {canSee(tier,"pro")&&(
              <Card style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <SLabel noMargin>Revenue estimate</SLabel>
                  <span style={{...ty.meta,fontSize:9,padding:"2px 7px",borderRadius:20,background:C.amber+"22",color:C.amber,fontWeight:700}}>PRO+</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  {[{l:"Monthly (est.)",v:fmtMoney(activeConcept.monthlyRev),sub:"from verified demand",c:C.green},{l:"Annual (est.)",v:fmtMoney(activeConcept.annualRev),sub:"per 100 residents",c:C.green}].map(s=>(
                    <div key={s.l} style={{padding:"12px 10px",background:C.green+"0A",border:"1px solid "+C.green+"20",borderRadius:12,textAlign:"center"}}>
                      <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                      <div style={{fontFamily:serif,fontSize:22,fontWeight:700,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</div>
                      <div style={{...ty.meta,color:C.t3,fontSize:10}}>{s.sub}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Brief signals - pro+ */}
            {activeConcept.cat==="business"&&canSee(tier,"pro")&&(()=>{
              const briefComments = getBriefComments(activeConcept.id);
              const sigs = extractSignals(briefComments);
              if(!sigs.brands.length&&!sigs.locations.length) return null;
              return(
                <Card style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                    <SLabel noMargin>The Brief — resident intent</SLabel>
                    <span style={{...ty.meta,fontSize:9,padding:"2px 7px",borderRadius:20,background:C.amber+"22",color:C.amber,fontWeight:700}}>PRO+</span>
                  </div>
                  {sigs.brands.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Brands mentioned</div>
                      {sigs.brands.map(b=>(
                        <div key={b[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <span style={{...ty.sm,color:C.t1,flex:1}}>{b[0]}</span>
                          <span style={{...ty.meta,color:C.purple,fontWeight:700}}>{b[1]} mention{b[1]!==1?"s":""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {sigs.locations.length>0&&(
                    <div>
                      <div style={{...ty.meta,color:C.t3,fontSize:10,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Preferred locations</div>
                      {sigs.locations.map(l=>(
                        <div key={l[0]} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <MapPin size={11} color={C.amber}/>
                          <span style={{...ty.sm,color:C.t1,flex:1}}>{l[0]}</span>
                          <span style={{...ty.meta,color:C.amber,fontWeight:700}}>{l[1]} mention{l[1]!==1?"s":""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* Insight */}
            <div style={{background:cc.color+"0A",border:"1px solid "+cc.color+"25",borderRadius:16,padding:"18px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:cc.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✦</div>
                <div style={{...ty.label,color:cc.color}}>Cravz insight</div>
              </div>
              <div style={{...ty.body,color:C.t1,lineHeight:1.7,fontSize:13}}>{insightText}</div>
            </div>
            </>)}
          </div>
        );
      })()}

      {/* PRE-LAUNCH TAB */}
      {bizTab==="prelaunch"&&(
        <div style={{padding:"20px 16px 80px"}}>
          <h2 style={{...ty.h2,marginBottom:4}}>Pre-launch pages</h2>
          <div style={{...ty.body,color:C.t3,marginBottom:20}}>Businesses planning to open have published pages to collect resident input before committing.</div>
          {!canSee(tier,"starter")&&(
            <div style={{background:C.surface,border:"1px solid "+C.line,borderRadius:14,padding:"20px",textAlign:"center",marginBottom:16}}>
              <Lock size={20} color={C.t3} style={{margin:"0 auto 10px"}}/>
              <div style={{...ty.bodyMd,marginBottom:6}}>Pre-launch data — Starter+</div>
              <div style={{...ty.sm,color:C.t3,marginBottom:14}}>See what businesses are planning to open in your area and respond to their surveys</div>
              <button onClick={()=>bump("starter")} style={{padding:"9px 20px",borderRadius:10,background:C.amber,color:"#000",border:"none",cursor:"pointer",fontFamily:sans,fontWeight:700,fontSize:12}}>Upgrade to Starter →</button>
            </div>
          )}
          {canSee(tier,"starter")&&(
            activePL ? (
              <div>
                <button onClick={()=>setActivePL(null)} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>← Back to all pages</button>
                <div style={{background:"linear-gradient(135deg, "+C.coral+"14, "+C.surface+")",border:"1px solid "+C.coral+"30",borderRadius:16,padding:"18px 20px",marginBottom:20}}>
                  <div style={{...ty.label,color:C.coral,marginBottom:4}}>Pre-launch · {activePL.area}</div>
                  <div style={{...ty.h3,marginBottom:6}}>{activePL.emoji} {activePL.label}</div>
                  <div style={{...ty.sm,color:C.t2,lineHeight:1.65,marginBottom:10,fontStyle:"italic"}}>"{activePL.blurb}"</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{padding:"4px 10px",borderRadius:20,background:C.coral+"18",border:"1px solid "+C.coral+"30"}}><span style={{...ty.meta,color:C.coral,fontWeight:600}}>{activePL.responseCount||activePL.voices} resident responses</span></div>
                    <div style={{padding:"4px 10px",borderRadius:20,background:C.surface2,border:"1px solid "+C.line}}><span style={{...ty.meta,color:C.t3}}>{activePL.status}</span></div>
                  </div>
                </div>
                <ClosedSurveyCard survey={activePL} allQs={Object.values(PRELAUNCH_QUESTIONS).flat()}/>
              </div>
            ) : (
              <div>
                {PRELAUNCH_PAGES.map(function(page){
                  return(
                    <button key={page.id} onClick={()=>setActivePL(page)}
                      style={{width:"100%",background:C.surface,border:"1px solid "+C.line,borderRadius:14,padding:"16px 18px",cursor:"pointer",fontFamily:sans,textAlign:"left",marginBottom:10,display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:44,height:44,borderRadius:12,background:C.coral+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{page.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{...ty.bodyMd,fontSize:14,marginBottom:3}}>{page.label}</div>
                        <div style={{...ty.meta,color:C.t3}}>{page.area} · {page.responseCount||page.voices} responses · {page.status}</div>
                      </div>
                      <ChevronDown size={14} color={C.t3} style={{transform:"rotate(-90deg)",flexShrink:0}}/>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* FAQ TAB */}
      {bizTab==="faq"&&(
        <div style={{padding:"20px 16px 60px"}}>
          <h2 style={{...ty.h2,marginBottom:4}}>Understanding the data</h2>
          <Card style={{padding:0,overflow:"hidden"}}>
            {FAQ_ITEMS.map((f,i)=>(
              <div key={i}>{i>0&&<HR/>}
                <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                  style={{width:"100%",padding:"14px 18px",background:"transparent",border:"none",cursor:"pointer",fontFamily:sans,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,...ty.bodyMd,fontSize:13,color:faqOpen===i?C.coral:C.t1}}>{f.q}</div>
                  <ChevronDown size={14} color={faqOpen===i?C.coral:C.t3} style={{flexShrink:0,transform:faqOpen===i?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                </button>
                {faqOpen===i&&<div style={{padding:"0 18px 14px",...ty.sm,color:C.t2,lineHeight:1.7}}>{f.a}</div>}
              </div>
            ))}
          </Card>
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
                <div style={{...ty.meta,color:C.t3}}>{session?.email||"account@cravz.co"}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{l:"Plan",v:thisTier.name},{l:"Areas",v:sessionAreas.join(", ")},{l:"Account type",v:acctCfg.label}].map(s=>(
                <div key={s.l} style={{padding:"10px 12px",background:C.surface2,borderRadius:10}}>
                  <div style={{...ty.meta,color:C.t3,fontSize:9,marginBottom:4}}>{s.l.toUpperCase()}</div>
                  <div style={{...ty.sm,color:C.t1,fontWeight:600}}>{s.v}</div>
                </div>
              ))}
            </div>
            <button onClick={onLogout} style={{width:"100%",marginTop:16,padding:"12px",borderRadius:12,background:"transparent",border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:13}}>Sign out</button>
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
      {["Continue with Apple","Continue with Google"].map(l=>(
        <button key={l} onClick={()=>setStep(userType==="resident"?"profile":"acct_type")}
          style={{width:"100%",padding:"13px",background:"#EDE8E0",border:"none",borderRadius:12,cursor:"pointer",fontFamily:sans,color:"#111",fontWeight:600,fontSize:13,marginBottom:8,textAlign:"center"}}>{l}</button>
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
          {(()=>{
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
            🔒 We store your full postcode to derive your district (e.g. SW4) and sector (e.g. SW4 9). Businesses on Pro+ can see sector-level signals — never your full postcode, name, or email. All demographic data is aggregated and anonymised.
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
  return <div style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}F2`,backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.line}`,padding:"0 18px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}><CravzLogo size={23}/><span style={{...ty.meta,color:C.t3}}>{user?.postcode}</span><button style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.t2}}><MoreHorizontal size={17}/></button></div></div>;
}

/* ==================================================
   RESIDENT NOTIFICATIONS
================================================== */
function ResNotifications({user, onAllocate, onShowPrelaunch}){
  const [dismissed, setDismissed] = useState([]);
  const [ctaNotif,  setCtaNotif]  = useState(null);
  const visible = ALL_NOTIFS.filter(n=>!dismissed.includes(n.id));

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

  if(ctaNotif) return (
    <div style={{padding:"20px 16px 100px"}}>
      <button onClick={()=>setCtaNotif(null)}
        style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.t3,cursor:"pointer",fontFamily:sans,marginBottom:20,padding:0,...ty.sm}}>
        ← Back
      </button>
      <div style={{background:`${ctaNotif.color}0C`,border:`1px solid ${ctaNotif.color}25`,borderRadius:18,padding:"22px 20px"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16}}>
          <div style={{width:44,height:44,borderRadius:13,background:`${ctaNotif.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{ctaNotif.icon}</div>
          <div style={{flex:1}}>
            <div style={{...ty.h3,fontSize:16,marginBottom:4}}>{ctaNotif.title}</div>
            <div style={{...ty.meta,color:C.t3}}>{ctaNotif.area} · {ctaNotif.ts}</div>
          </div>
        </div>
        <div style={{...ty.body,color:C.t1,lineHeight:1.75,marginBottom:20}}>{ctaNotif.body}</div>
        <div style={{padding:"14px 16px",borderRadius:12,background:C.surface2,border:`1px solid ${C.line}`}}>
          <div style={{...ty.label,color:ctaNotif.color,marginBottom:8}}>When Cravz launches</div>
          <div style={{...ty.sm,color:C.t2,lineHeight:1.75}}>{CTA_COPY[ctaNotif.type]||CTA_COPY.nudge}</div>
        </div>
      </div>
    </div>
  );

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

const BRIEF_BRANDS = [
  "Barry's","F45","1Rebel","Third Space","PureGym","Gail's","Dishoom",
  "Megan's","Ottolenghi","Gambado","Trampoline Park","Aesop","Gymbox",
  "Digme","BXR","Core Collective","Redemption Roasters","Notes Coffee",
];

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
  "b75": [
    {id:"bc1", text:"Would love a Barry's or F45 with creche -- impossible to find in SW4", upvotes:14, ts:"2 days ago"},
    {id:"bc2", text:"Something near Rectory Grove would be perfect for the school run crowd", upvotes:11, ts:"3 days ago"},
    {id:"bc3", text:"Needs to be properly premium, not a glorified ball pit. Good coffee essential", upvotes:9, ts:"4 days ago"},
    {id:"bc4", text:"Gambado would be amazing here -- there's nothing like it south of the river", upvotes:7, ts:"5 days ago"},
    {id:"bc5", text:"Outdoor area would be a huge bonus given proximity to the Common", upvotes:6, ts:"1 week ago"},
  ],
  "b29": [
    {id:"bc6", text:"A natural wine bar please -- somewhere that feels like it belongs here not a chain", upvotes:18, ts:"1 day ago"},
    {id:"bc7", text:"Venn Street would be the perfect location, already has the footfall", upvotes:13, ts:"2 days ago"},
    {id:"bc8", text:"Needs outdoor seating. The Common crowd would make this work easily", upvotes:10, ts:"3 days ago"},
    {id:"bc9", text:"Something like Sager + Wilde or P.Franco but in Clapham. Please.", upvotes:8, ts:"4 days ago"},
  ],
  "b81": [
    {id:"bc10", text:"Electric Brixton is always packed — we need our own version in SW4", upvotes:16, ts:"1 day ago"},
    {id:"bc11", text:"Near Clapham High Street station would make sense for late nights", upvotes:12, ts:"2 days ago"},
    {id:"bc12", text:"Would happily travel for this but would rather not go to Brixton every time", upvotes:7, ts:"5 days ago"},
  ],
  "b66": [
    {id:"bc13", text:"The Climbing Hangar or Boulder World — either would transform the area", upvotes:15, ts:"1 day ago"},
    {id:"bc14", text:"Needs to be accessible without a car — near a tube would be key", upvotes:11, ts:"2 days ago"},
    {id:"bc15", text:"With a decent café please. The post-climb coffee is non-negotiable", upvotes:9, ts:"3 days ago"},
  ],
  "b23": [
    {id:"bc16", text:"Notes or Redemption Roasters please — we have enough Costas", upvotes:19, ts:"1 day ago"},
    {id:"bc17", text:"Laptop friendly with good wifi — the area is crying out for it", upvotes:14, ts:"2 days ago"},
    {id:"bc18", text:"Abbeville Village would be the dream location", upvotes:10, ts:"3 days ago"},
    {id:"bc19", text:"Dog friendly essential. Half of Clapham has a dog.", upvotes:8, ts:"4 days ago"},
  ],
  "a13": [
    {id:"bc20", text:"Baz Arts or similar — proper Latin dance not just beginner salsa", upvotes:12, ts:"2 days ago"},
    {id:"bc21", text:"Evening classes essential — working people need post-6pm slots", upvotes:9, ts:"3 days ago"},
  ],
  "a8": [
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
function extractSignals(comments) {
  const brands = {};
  const locations = {};
  const attributes = {};
  comments.forEach(function(c) {
    const txt = c.text.toLowerCase();
    BRIEF_BRANDS.forEach(function(b) {
      if(txt.includes(b.toLowerCase())) {
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
function TheBrief({coinAlloc, user}) {
  // Voted items = ANY item across full catalogue that has coins
  const allCatalogueItems = Object.values(CATALOGUE).flat();
  const votedItems = allCatalogueItems.filter(function(i){ return (coinAlloc[i.id]||0)>0; });
  // For unvoted "other concepts" use FEED_WITH_METRICS as the curated list
  const feedItems = FEED_WITH_METRICS;
  const unvotedFeedItems = feedItems.filter(function(i){ return (coinAlloc[i.id]||0)===0; });
  // Selected concept — prefer voted, fallback to first feed item
  const allSelectableItems = votedItems.concat(unvotedFeedItems);
  
  const [selId, setSelId] = useState(votedItems.length>0 ? votedItems[0].id : feedItems[0].id);
  // selItem may come from catalogue or feed
  const selItem = allCatalogueItems.find(function(i){return i.id===selId;}) 
    || feedItems.find(function(i){return i.id===selId;}) 
    || feedItems[0];
  const cc = CAT_CFG[selItem.cat] || CAT_CFG[selItem.subcat] || CAT_CFG.business;

  // Comment state — seed + user added
  const [comments, setComments] = useState(function(){
    var seed = getBriefComments(selId);
    return seed.map(function(c){ return {...c, userUpvoted:false}; });
  });
  const [userUpvoted, setUserUpvoted] = useState({});
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");
  const [locText, setLocText] = useState("");
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  // Update comments when concept changes
  useEffect(function(){
    var seed = getBriefComments(selId);
    setComments(seed.map(function(c){ return {...c, userUpvoted:false}; }));
    setUserUpvoted({});
    setShowInput(false);
    setInputText("");
    setLocText("");
    setBrandSuggestions([]);
    setShowBrandSuggestions(false);
  }, [selId]);

  // Brand autocomplete — detect as user types
  function handleInputChange(val) {
    setInputText(val);
    if(val.length < 2) { setBrandSuggestions([]); setShowBrandSuggestions(false); return; }
    const words = val.split(/\s+/);
    const last = words[words.length-1].toLowerCase();
    if(last.length < 2) { setBrandSuggestions([]); setShowBrandSuggestions(false); return; }
    const matches = BRIEF_BRANDS.filter(function(b){ return b.toLowerCase().startsWith(last); }).slice(0,4);
    setBrandSuggestions(matches);
    setShowBrandSuggestions(matches.length > 0);
  }

  function selectBrand(brand) {
    const words = inputText.split(/\s+/);
    words[words.length-1] = brand;
    setInputText(words.join(" ") + " ");
    setShowBrandSuggestions(false);
    setBrandSuggestions([]);
  }

  function handleUpvote(commentId) {
    if(userUpvoted[commentId]) return;
    setComments(function(prev){ return prev.map(function(c){ return c.id===commentId ? {...c, upvotes:c.upvotes+1} : c; }); });
    setUserUpvoted(function(prev){ return {...prev, [commentId]:true}; });
  }

  function handleSubmit() {
    if(!inputText.trim()) return;
    var newComment = {
      id: "user_" + Date.now(),
      text: inputText.trim() + (locText.trim() ? " — " + locText.trim() : ""),
      upvotes: 0,
      userUpvoted: false,
      ts: "Just now",
      isOwn: true,
    };
    setComments(function(prev){ return [newComment, ...prev]; });
    setInputText("");
    setLocText("");
    setShowInput(false);
    setSubmitted(true);
    setTimeout(function(){ setSubmitted(false); }, 3000);
  }

  // Sort by upvotes
  var sorted = comments.slice().sort(function(a,b){ return b.upvotes - a.upvotes; });
  
  // Extract signals from all comments for display
  var allText = comments.map(function(c){return {text:c.text, upvotes:c.upvotes};});
  var signals = extractSignals(comments);

  const hasVoted = (coinAlloc[selId]||0) > 0;

  return (
    <div style={{padding:"20px 16px 100px", maxWidth:680, margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <h2 style={{...ty.h2, marginBottom:4}}>The Brief</h2>
        <div style={{...ty.body, color:C.t3}}>Residents who backed a concept shape what it should look like.</div>
      </div>

      {/* Concept selector — voted first, prominent; unvoted take backseat */}
      {/* Your voted concepts — prominent chips at top */}
      {votedItems.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{...ty.label, marginBottom:8}}>Your backed concepts</div>
          <div style={{display:"flex", gap:8, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none"}}>
            {votedItems.map(function(item){
              const isel = item.id === selId;
              const icc = CAT_CFG[item.cat] || CAT_CFG.business;
              return (
                <button key={item.id} onClick={function(){setSelId(item.id);}}
                  style={{flexShrink:0, padding:"9px 16px", borderRadius:20,
                    background: isel ? (icc.color||C.coral) : C.surface,
                    border: "1px solid " + (isel ? (icc.color||C.coral) : C.line),
                    color: isel ? "#fff" : C.t1,
                    cursor:"pointer", fontFamily:sans, fontSize:13, fontWeight:isel?700:500,
                    display:"flex", alignItems:"center", gap:7}}>
                  <span style={{fontSize:15}}>{item.emoji}</span>
                  <span>{item.label}</span>
                  {isel && <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,0.8)",flexShrink:0}}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Empty state when no votes yet */}
      {votedItems.length===0&&(
        <div style={{padding:"20px",background:C.surface,border:"1px dashed "+C.line,borderRadius:14,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:32,marginBottom:8}}>🗳️</div>
          <div style={{...ty.bodyMd,marginBottom:4}}>No votes placed yet</div>
          <div style={{...ty.sm,color:C.t3,lineHeight:1.6}}>Place your coins on concepts you want in your area to join the conversation and shape what gets built.</div>
        </div>
      )}

      {/* Concept header */}
      <div style={{background:"linear-gradient(135deg, " + cc.color + "14 0%, " + C.surface + " 100%)",
        border:"1px solid " + cc.color + "25", borderRadius:16, padding:"16px 18px", marginBottom:20}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:cc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{selItem.emoji}</div>
          <div style={{flex:1}}>
            <div style={{...ty.bodyMd, fontSize:15, marginBottom:2}}>{selItem.label}</div>
            <div style={{...ty.meta, color:C.t3}}>{selItem.voters} voices · {comments.length} brief contributions</div>
          </div>
          {hasVoted && <div style={{padding:"4px 10px", borderRadius:20, background:cc.color+"22", border:"1px solid "+cc.color+"40"}}>
            <span style={{...ty.meta, color:cc.color, fontWeight:700}}>You backed this</span>
          </div>}
        </div>
      </div>

      {/* Signals extracted — only show if there are matches */}
      {(signals.brands.length>0 || signals.locations.length>0) && (
        <div style={{marginBottom:20}}>
          <div style={{...ty.label, marginBottom:10}}>Patterns emerging</div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {signals.brands.slice(0,3).map(function(b){
              return (
                <div key={b[0]} style={{padding:"5px 12px", borderRadius:20, background:C.purple+"18",
                  border:"1px solid "+C.purple+"30", display:"flex", alignItems:"center", gap:6}}>
                  <span style={{...ty.meta, color:C.purple, fontWeight:600}}>{b[0]}</span>
                  <span style={{...ty.meta, color:C.t3}}>mentioned {b[1]}×</span>
                </div>
              );
            })}
            {signals.locations.slice(0,2).map(function(l){
              return (
                <div key={l[0]} style={{padding:"5px 12px", borderRadius:20, background:C.amber+"18",
                  border:"1px solid "+C.amber+"30", display:"flex", alignItems:"center", gap:6}}>
                  <MapPin size={10} color={C.amber}/>
                  <span style={{...ty.meta, color:C.amber, fontWeight:600}}>{l[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked state for unvoted concepts */}
      {!hasVoted ? (
        <div style={{marginBottom:20}}>
          <div style={{background:C.surface, border:"1px solid "+C.line, borderRadius:16, overflow:"hidden"}}>
            {/* Blurred preview of comments */}
            <div style={{padding:"14px 16px", filter:"blur(4px)", pointerEvents:"none", userSelect:"none", opacity:0.5}}>
              {sorted.slice(0,3).map(function(c){
                return (
                  <div key={c.id} style={{background:C.surface2, borderRadius:10, padding:"10px 12px", marginBottom:8}}>
                    <div style={{...ty.sm, color:C.t1, marginBottom:4}}>{c.text}</div>
                    <div style={{...ty.meta, color:C.t3}}>👍 {c.upvotes}</div>
                  </div>
                );
              })}
            </div>
            {/* Lock overlay */}
            <div style={{padding:"16px 18px", borderTop:"1px solid "+C.line, textAlign:"center", background:C.surface2}}>
              <Lock size={16} color={C.t3} style={{margin:"0 auto 8px"}}/>
              <div style={{...ty.bodyMd, fontSize:13, marginBottom:4}}>Vote to join the conversation</div>
              <div style={{...ty.meta, color:C.t3, marginBottom:12, lineHeight:1.6}}>{sorted.length} residents have shared ideas about this concept</div>
              <div style={{...ty.meta, color:C.t3, fontSize:10}}>Place your coins on {selItem.label} to read and contribute</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{marginBottom:20}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
            <div style={{...ty.label}}>What residents want from it</div>
            <div style={{...ty.meta, color:C.t3}}>{sorted.length} voices</div>
          </div>

          {/* INPUT AT THE TOP — before comments */}
          {submitted && (
            <div style={{padding:"10px 14px", background:C.green+"18", border:"1px solid "+C.green+"30",
              borderRadius:10, marginBottom:12, display:"flex", alignItems:"center", gap:8}}>
              <Check size={14} color={C.green}/>
              <span style={{...ty.sm, color:C.green}}>Your voice has been added to the brief</span>
            </div>
          )}

          {!showInput ? (
            <button onClick={function(){setShowInput(true);}}
              style={{width:"100%", padding:"12px 14px", borderRadius:12, marginBottom:14,
                background:cc.color+"12", border:"1px solid "+cc.color+"30",
                color:cc.color, cursor:"pointer", fontFamily:sans, fontSize:13, fontWeight:500,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8}}>
              <Plus size={14} color={cc.color}/>
              Add your voice to the brief
            </button>
          ) : (
            <div style={{background:C.surface, border:"1px solid "+cc.color+"40", borderRadius:14, padding:"14px", marginBottom:14, position:"relative"}}>
              <div style={{...ty.label, color:cc.color, marginBottom:10}}>What would you want from this?</div>
              
              <div style={{position:"relative", marginBottom:10}}>
                <textarea value={inputText} onChange={function(e){handleInputChange(e.target.value);}}
                  placeholder="e.g. Barry's would do really well here · near the school run · premium, not a basic chain"
                  rows={3}
                  style={{width:"100%", background:C.bg, border:"1px solid "+C.line,
                    borderRadius:10, padding:"10px 12px", color:C.t1, fontSize:13,
                    fontFamily:sans, outline:"none", resize:"none", lineHeight:1.5,
                    boxSizing:"border-box"}}/>
                {showBrandSuggestions && (
                  <div style={{position:"absolute", top:"100%", left:0, right:0, zIndex:20,
                    background:C.surface, border:"1px solid "+C.line, borderRadius:10,
                    marginTop:4, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                    {brandSuggestions.map(function(b){
                      return (
                        <button key={b} onClick={function(){selectBrand(b);}}
                          style={{width:"100%", padding:"9px 14px", background:"transparent",
                            border:"none", borderBottom:"1px solid "+C.line,
                            cursor:"pointer", fontFamily:sans, textAlign:"left",
                            display:"flex", alignItems:"center", gap:8}}>
                          <Zap size={11} color={C.amber}/>
                          <span style={{...ty.sm, color:C.t1}}>{b}</span>
                          <span style={{...ty.meta, color:C.t3, marginLeft:"auto"}}>brand</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{position:"relative", marginBottom:14}}>
                <input value={locText}
                  onChange={function(e){setLocText(e.target.value); setShowLocSuggestions(e.target.value.length>0);}}
                  onFocus={function(){if(locText.length>0) setShowLocSuggestions(true);}}
                  placeholder="Suggested location (optional)"
                  style={{width:"100%", background:C.bg, border:"1px solid "+C.line,
                    borderRadius:10, padding:"9px 12px", color:C.t1, fontSize:12,
                    fontFamily:sans, outline:"none", boxSizing:"border-box"}}/>
                {showLocSuggestions && (
                  <div style={{position:"absolute", top:"100%", left:0, right:0, zIndex:20,
                    background:C.surface, border:"1px solid "+C.line, borderRadius:10,
                    marginTop:4, overflow:"hidden", boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                    {BRIEF_LOCATIONS.filter(function(l){return l.toLowerCase().includes(locText.toLowerCase());}).slice(0,5).map(function(l){
                      return (
                        <button key={l} onClick={function(){setLocText(l); setShowLocSuggestions(false);}}
                          style={{width:"100%", padding:"9px 14px", background:"transparent",
                            border:"none", borderBottom:"1px solid "+C.line,
                            cursor:"pointer", fontFamily:sans, textAlign:"left",
                            display:"flex", alignItems:"center", gap:8}}>
                          <MapPin size={11} color={C.t3}/>
                          <span style={{...ty.sm, color:C.t1}}>{l}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{display:"flex", gap:8}}>
                <button onClick={function(){setShowInput(false); setInputText(""); setLocText(""); setBrandSuggestions([]); setShowBrandSuggestions(false);}}
                  style={{padding:"10px 16px", borderRadius:10, background:"transparent",
                    border:"1px solid "+C.line, color:C.t3, cursor:"pointer", fontFamily:sans, fontSize:13}}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!inputText.trim()}
                  style={{flex:1, padding:"10px", borderRadius:10,
                    background:inputText.trim()?cc.color:C.surface,
                    border:"1px solid "+(inputText.trim()?cc.color:C.line),
                    color:inputText.trim()?"#fff":C.t3,
                    cursor:inputText.trim()?"pointer":"default",
                    fontFamily:sans, fontWeight:600, fontSize:13, transition:"all .15s"}}>
                  Add to brief →
                </button>
              </div>
            </div>
          )}

          {/* Comment feed — below input */}
          <div style={{display:"flex", flexDirection:"column", gap:10}}>
            {sorted.map(function(c, i){
              const isPopular = c.upvotes >= 8;
              const alreadyUpvoted = userUpvoted[c.id];
              return (
                <div key={c.id} style={{
                  background: c.isOwn ? cc.color+"0A" : C.surface,
                  border: "1px solid " + (isPopular ? cc.color+"40" : C.line),
                  borderRadius:12, padding:"12px 14px",
                  position:"relative"}}>
                  {isPopular && (
                    <div style={{position:"absolute", top:-1, right:12,
                      background:cc.color, borderRadius:"0 0 8px 8px",
                      padding:"1px 8px"}}>
                      <span style={{...ty.meta, color:"#fff", fontSize:9, fontWeight:700}}>POPULAR IDEA</span>
                    </div>
                  )}
                  <div style={{...ty.sm, color:C.t1, lineHeight:1.55, marginBottom:8, paddingTop:isPopular?8:0}}>{c.text}</div>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <span style={{...ty.meta, color:C.t3}}>{c.ts}</span>
                    <button onClick={function(){handleUpvote(c.id);}} disabled={alreadyUpvoted}
                      style={{display:"flex", alignItems:"center", gap:5, background:"transparent",
                        border:"1px solid "+(alreadyUpvoted?cc.color:C.line),
                        borderRadius:20, padding:"3px 10px", cursor:alreadyUpvoted?"default":"pointer",
                        color:alreadyUpvoted?cc.color:C.t3, fontFamily:sans}}>
                      <span style={{fontSize:12}}>👍</span>
                      <span style={{...ty.meta, fontWeight:alreadyUpvoted?700:400, color:alreadyUpvoted?cc.color:C.t3}}>{c.upvotes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ==================================================
   BUSINESS REQUEST ACCESS — pre-login tier page
================================================== */

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
    id:"starter", name:"Starter", price:"£99", period:"/month",
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
    features:["Everything in Starter","Monthly & annual revenue estimates","Full demographic profile","Demand leakage rate","Attribute tag breakdown","The Brief — resident intent signals","Pre-launch survey data"],
    locked:[],
  },
  {
    id:"proplus", name:"Pro+", price:"£499", period:"/month",
    color:C.purple, badge:null,
    headline:"Multi-site intelligence",
    desc:"For operators and investors evaluating multiple locations.",
    features:["Everything in Pro","Up to 5 areas","Team seats (3 included)","Data export (CSV)","Quarterly briefing call"],
    locked:[],
  },
  {
    id:"enterprise", name:"Enterprise", price:"£6,000+", period:"/year",
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
  {id:"l3", name:"Priya Kapoor", biz:"Fit London Group", email:"priya@fitlondon.co.uk", type:"Operator", area:"SW4", tier:"Starter", status:"pending", ts:"2 days ago"},
];

function BizRequestPage({onBack}) {
  const [selTier, setSelTier] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({name:"",biz:"",email:"",type:"",area:"",reason:"",tier:""});
  const [submitted, setSubmitted] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [leads, setLeads] = useState(MOCK_LEADS);

  function handleRequest(tierId) {
    setSelTier(tierId);
    setForm(function(f){ return {...f, tier:tierId}; });
    setShowForm(true);
  }

  function handleSubmit() {
    if(!form.name.trim()||!form.email.trim()) return;
    setLeads(function(l){ return [{id:"l"+Date.now(), ...form, status:"pending", ts:"Just now"}, ...l]; });
    setSubmitted(true);
  }

  const canSubmit = form.name.trim()&&form.email.trim()&&form.biz.trim()&&form.type;

  if(submitted) return (
    <div style={{minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", fontFamily:sans, textAlign:"center"}}>
      <div style={{width:72, height:72, borderRadius:20, background:C.green+"18", border:"1px solid "+C.green+"30", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, marginBottom:24}}>✓</div>
      <h2 style={{...ty.h2, marginBottom:12}}>Request received</h2>
      <div style={{...ty.body, color:C.t2, maxWidth:320, lineHeight:1.7, marginBottom:32}}>
        We'll review your request and be in touch within 24 hours. You'll get access to the <strong style={{color:C.t1}}>{(BIZ_TIERS_WEB.find(function(t){return t.id===form.tier;})||{name:form.tier}).name}</strong> tier as soon as we've confirmed your details.
      </div>
      <button onClick={onBack} style={{padding:"13px 28px", borderRadius:12, background:C.coral, color:"#fff", border:"none", cursor:"pointer", fontFamily:sans, fontWeight:600, fontSize:14}}>Back to Cravz</button>
    </div>
  );

  if(showAdmin) return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:sans, padding:"24px 20px"}}>
      <div style={{maxWidth:760, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:24}}>
          <button onClick={function(){setShowAdmin(false);}} style={{background:"none", border:"none", color:C.t3, cursor:"pointer", fontSize:13, fontFamily:sans}}>← Back</button>
          <h2 style={{...ty.h2}}>Access Requests</h2>
          <div style={{marginLeft:"auto", padding:"4px 10px", borderRadius:20, background:C.amber+"20", border:"1px solid "+C.amber+"30"}}>
            <span style={{...ty.meta, color:C.amber, fontWeight:700}}>{leads.filter(function(l){return l.status==="pending";}).length} pending</span>
          </div>
        </div>
        {leads.map(function(lead){
          return (
            <div key={lead.id} style={{background:C.surface, border:"1px solid "+(lead.status==="approved"?C.green+"40":C.line), borderRadius:14, padding:"16px 18px", marginBottom:10}}>
              <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:200}}>
                  <div style={{...ty.bodyMd, marginBottom:3}}>{lead.name} · {lead.biz}</div>
                  <div style={{...ty.meta, color:C.t3}}>{lead.email} · {lead.area} · {lead.type}</div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{padding:"3px 9px", borderRadius:20, background:C.purple+"18", border:"1px solid "+C.purple+"30"}}>
                    <span style={{...ty.meta, color:C.purple, fontWeight:600}}>{lead.tier}</span>
                  </span>
                  <span style={{padding:"3px 9px", borderRadius:20,
                    background:lead.status==="approved"?C.green+"18":C.amber+"18",
                    border:"1px solid "+(lead.status==="approved"?C.green+"30":C.amber+"30")}}>
                    <span style={{...ty.meta, color:lead.status==="approved"?C.green:C.amber, fontWeight:600, textTransform:"capitalize"}}>{lead.status}</span>
                  </span>
                  <span style={{...ty.meta, color:C.t3}}>{lead.ts}</span>
                </div>
              </div>
              {lead.reason&&<div style={{...ty.sm, color:C.t2, marginTop:10, padding:"8px 10px", background:C.bg, borderRadius:8}}>{lead.reason}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  if(showForm) {
    const tier = BIZ_TIERS_WEB.find(function(t){return t.id===selTier;});
    return (
      <div style={{minHeight:"100vh", background:C.bg, fontFamily:sans, padding:"32px 20px"}}>
        <div style={{maxWidth:520, margin:"0 auto"}}>
          <button onClick={function(){setShowForm(false);}} style={{background:"none", border:"none", color:C.t3, cursor:"pointer", fontSize:13, fontFamily:sans, marginBottom:24, display:"flex", alignItems:"center", gap:6}}>
            <span>←</span> Back to plans
          </button>
          <div style={{background:"linear-gradient(135deg, "+tier.color+"14, "+C.surface+")", border:"1px solid "+tier.color+"30", borderRadius:16, padding:"18px 20px", marginBottom:24}}>
            <div style={{...ty.label, color:tier.color, marginBottom:4}}>Requesting access</div>
            <div style={{...ty.h3, marginBottom:4}}>{tier.name} — {tier.price}{tier.period}</div>
            <div style={{...ty.sm, color:C.t2}}>{tier.headline}</div>
          </div>
          {/* Text fields */}
          {[
            {key:"name",  label:"Your name",             placeholder:"First and last name",        type:"text"},
            {key:"biz",   label:"Business / organisation",placeholder:"e.g. The Clap Coffee Co.",  type:"text"},
            {key:"email", label:"Email address",          placeholder:"you@yourbusiness.com",        type:"email"},
            {key:"area",  label:"Area(s) of interest",   placeholder:"e.g. SW4, SW9, Clapham",     type:"text"},
          ].map(function(f){
            return (
              <div key={f.key} style={{marginBottom:14}}>
                <div style={{...ty.meta, color:C.t3, marginBottom:5, textTransform:"uppercase", letterSpacing:0.8, fontSize:10}}>{f.label}</div>
                <input value={form[f.key]} type={f.type}
                  onChange={function(e){ var v=e.target.value; setForm(function(prev){ var n={...prev}; n[f.key]=v; return n; }); }}
                  placeholder={f.placeholder}
                  style={{width:"100%", background:C.surface, border:"1px solid "+(form[f.key].trim()?C.green:C.line),
                    borderRadius:10, padding:"12px 14px", color:C.t1, fontSize:13,
                    fontFamily:sans, outline:"none", boxSizing:"border-box"}}/>
              </div>
            );
          })}

          {/* I am a — chips */}
          <div style={{marginBottom:18}}>
            <div style={{...ty.meta, color:C.t3, marginBottom:8, textTransform:"uppercase", letterSpacing:0.8, fontSize:10}}>I am a...</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {["Operator","Investor","Property agent","Developer","Council / public sector","Other"].map(function(opt){
                const on = form.type === opt;
                return (
                  <button key={opt} onClick={function(){setForm(function(prev){return {...prev, type:opt};});}}
                    style={{padding:"8px 14px", borderRadius:20,
                      background: on ? tier.color : C.surface,
                      border: "1px solid " + (on ? tier.color : C.line),
                      color: on ? "#fff" : C.t2,
                      cursor:"pointer", fontFamily:sans, fontSize:12, fontWeight:on?600:400,
                      transition:"all .15s"}}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {!form.type && <div style={{...ty.meta, color:C.t3, marginTop:6, fontSize:10}}>Select one to continue</div>}
          </div>

          {/* Stage — chips */}
          <div style={{marginBottom:18}}>
            <div style={{...ty.meta, color:C.t3, marginBottom:8, textTransform:"uppercase", letterSpacing:0.8, fontSize:10}}>Where are you right now?</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {[
                {v:"exploring",   l:"Just exploring",       sub:"Getting a feel for what's possible"},
                {v:"researching", l:"Actively researching", sub:"Evaluating a specific area or concept"},
                {v:"committing",  l:"Ready to commit",      sub:"Have a site or concept, need data to confirm"},
                {v:"operating",   l:"Already operating",    sub:"Looking to expand or optimise"},
              ].map(function(opt){
                const on = form.stage === opt.v;
                return (
                  <button key={opt.v} onClick={function(){setForm(function(prev){return {...prev, stage:opt.v};});}}
                    style={{padding:"9px 14px", borderRadius:12,
                      background: on ? tier.color+"18" : C.surface,
                      border: "1px solid " + (on ? tier.color : C.line),
                      color: on ? tier.color : C.t2,
                      cursor:"pointer", fontFamily:sans, fontSize:12, fontWeight:on?600:400,
                      textAlign:"left", transition:"all .15s"}}>
                    <div style={{fontWeight:on?700:500, marginBottom:2}}>{opt.l}</div>
                    <div style={{fontSize:10, color:on?tier.color:C.t3, opacity:0.8}}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div style={{marginBottom:20}}>
            <div style={{...ty.meta, color:C.t3, marginBottom:5, textTransform:"uppercase", letterSpacing:0.8, fontSize:10}}>What are you looking for? (optional)</div>
            <textarea value={form.reason} onChange={function(e){setForm(function(f){return {...f,reason:e.target.value};});}}
              placeholder="e.g. Evaluating a site on Clapham High Street for a second location..."
              rows={3}
              style={{width:"100%", background:C.surface, border:"1px solid "+C.line,
                borderRadius:10, padding:"12px 14px", color:C.t1, fontSize:13,
                fontFamily:sans, outline:"none", resize:"none", lineHeight:1.5, boxSizing:"border-box"}}/>
          </div>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{width:"100%", padding:"15px", borderRadius:14,
              background:canSubmit?tier.color:C.surface,
              border:"1px solid "+(canSubmit?tier.color:C.line),
              color:canSubmit?"#fff":C.t3,
              cursor:canSubmit?"pointer":"default",
              fontFamily:sans, fontWeight:600, fontSize:15, transition:"all .2s"}}>
            Request access →
          </button>
          <div style={{...ty.meta, color:C.t3, textAlign:"center", marginTop:12, lineHeight:1.7}}>We'll review and respond within 24 hours. No payment until access is confirmed.</div>
        </div>
      </div>
    );
  }

  // Tier overview page
  return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:sans}}>
      {/* Header */}
      <div style={{padding:"28px 24px 20px", borderBottom:"1px solid "+C.line, display:"flex", alignItems:"center", justifyContent:"space-between", maxWidth:1100, margin:"0 auto"}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <CravzLogo size={32}/>
          <div style={{...ty.label, color:C.t3}}>Demand Intelligence</div>
        </div>
        <div style={{display:"flex", gap:10}}>
          <button onClick={function(){setShowAdmin(true);}} style={{padding:"8px 16px", borderRadius:10, background:C.surface, border:"1px solid "+C.line, color:C.t3, cursor:"pointer", fontFamily:sans, fontSize:12}}>Admin view</button>
          <button onClick={onBack} style={{padding:"8px 16px", borderRadius:10, background:"transparent", border:"1px solid "+C.line, color:C.t2, cursor:"pointer", fontFamily:sans, fontSize:12}}>← Back</button>
        </div>
      </div>

      {/* Hero */}
      <div style={{padding:"52px 24px 40px", textAlign:"center", background:"radial-gradient(ellipse 80% 50% at 50% 0%, "+C.coral+"12, "+C.bg+" 60%)"}}>
        <div style={{...ty.label, color:C.coral, marginBottom:12}}>OPERATOR INTELLIGENCE</div>
        <h1 style={{...ty.hero, fontSize:42, maxWidth:520, margin:"0 auto 16px", lineHeight:1.1}}>Verified resident demand.<br/>Before you commit.</h1>
        <p style={{...ty.body, fontSize:15, color:C.t2, maxWidth:440, margin:"0 auto 32px", lineHeight:1.7}}>Real spend intent, frequency, demographics and concept preferences — from verified residents in your target postcode.</p>
        <div style={{display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap"}}>
          {[{v:"1,076+",l:"Verified voters"},{v:"8",l:"Concepts tracked"},{v:"SW postcodes",l:"Currently live"}].map(function(s){
            return (
              <div key={s.l} style={{padding:"14px 20px", background:C.surface, border:"1px solid "+C.line, borderRadius:12, textAlign:"center"}}>
                <div style={{fontFamily:serif, fontSize:22, fontWeight:700, color:C.coral, marginBottom:2}}>{s.v}</div>
                <div style={{...ty.meta, color:C.t3}}>{s.l}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Teaser report preview */}
      <div style={{padding:"32px 24px", maxWidth:1100, margin:"0 auto"}}>
        <div style={{...ty.label, marginBottom:16, textAlign:"center"}}>What you get access to</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12, marginBottom:40}}>
          {[
            {emoji:"📊", title:"Demand ranking", desc:"All concepts ranked by verified voices in your area"},
            {emoji:"💰", title:"Spend signals", desc:"Declared avg spend and visit frequency per concept"},
            {emoji:"🗺️", title:"Catchment data", desc:"How far residents will travel — hyper-local to destination"},
            {emoji:"👥", title:"Demographics", desc:"Age, household type, gender split per concept"},
            {emoji:"📈", title:"Revenue estimates", desc:"Monthly and annual revenue from verified demand signals"},
            {emoji:"✍️", title:"The Brief", desc:"Resident intent — brands, locations, concept direction"},
          ].map(function(card){
            return (
              <div key={card.title} style={{background:C.surface, border:"1px solid "+C.line, borderRadius:14, padding:"16px 14px"}}>
                <div style={{fontSize:24, marginBottom:8}}>{card.emoji}</div>
                <div style={{...ty.bodyMd, fontSize:13, marginBottom:4}}>{card.title}</div>
                <div style={{...ty.meta, color:C.t3, lineHeight:1.6}}>{card.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Tiers */}
        <div style={{...ty.label, marginBottom:16, textAlign:"center"}}>Choose your plan</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:14, marginBottom:48}}>
          {BIZ_TIERS_WEB.map(function(tier){
            return (
              <div key={tier.id} style={{
                background: tier.badge==="Most popular" ? "linear-gradient(160deg, "+tier.color+"18, "+C.surface+")" : C.surface,
                border: "1px solid " + (tier.badge==="Most popular" ? tier.color+"50" : C.line),
                borderRadius:16, padding:"20px 18px", display:"flex", flexDirection:"column",
                position:"relative"}}>
                {tier.badge && (
                  <div style={{position:"absolute", top:-1, left:18, background:tier.color, borderRadius:"0 0 8px 8px", padding:"2px 10px"}}>
                    <span style={{...ty.meta, color:"#fff", fontSize:9, fontWeight:700}}>{tier.badge.toUpperCase()}</span>
                  </div>
                )}
                <div style={{paddingTop:tier.badge?12:0}}>
                  <div style={{...ty.label, color:tier.color, marginBottom:6}}>{tier.name.toUpperCase()}</div>
                  <div style={{display:"flex", alignItems:"baseline", gap:4, marginBottom:4}}>
                    <span style={{fontFamily:serif, fontSize:28, fontWeight:700, color:C.t1}}>{tier.price}</span>
                    <span style={{...ty.meta, color:C.t3}}>{tier.period}</span>
                  </div>
                  <div style={{...ty.sm, color:C.t2, marginBottom:14, lineHeight:1.5}}>{tier.headline}</div>
                  <div style={{flex:1, marginBottom:16}}>
                    {tier.features.map(function(f){
                      return (
                        <div key={f} style={{display:"flex", alignItems:"flex-start", gap:7, marginBottom:7}}>
                          <Check size={12} color={tier.color} style={{flexShrink:0, marginTop:2}}/>
                          <span style={{...ty.meta, color:C.t2, lineHeight:1.5}}>{f}</span>
                        </div>
                      );
                    })}
                    {tier.locked.map(function(f){
                      return (
                        <div key={f} style={{display:"flex", alignItems:"flex-start", gap:7, marginBottom:7, opacity:0.4}}>
                          <Lock size={11} color={C.t3} style={{flexShrink:0, marginTop:2}}/>
                          <span style={{...ty.meta, color:C.t3, lineHeight:1.5}}>{f}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button onClick={function(){handleRequest(tier.id);}}
                  style={{width:"100%", padding:"11px", borderRadius:10,
                    background:tier.id==="free"?"transparent":tier.color,
                    border:"1px solid "+(tier.id==="free"?C.line:tier.color),
                    color:tier.id==="free"?C.t2:"#fff",
                    cursor:"pointer", fontFamily:sans, fontWeight:600, fontSize:13, transition:"all .15s"}}>
                  {tier.id==="free" ? "Get free access" : "Request access →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BottomNav({active,onChange}){
  const tabs=[{id:"feed",Icon:Home,l:"Feed"},{id:"brief",Icon:FileText,l:"Brief"},{id:"insights",Icon:BarChart2,l:"Insights"},{id:"suggest",Icon:Lightbulb,l:"Suggest"},{id:"notifs",Icon:Bell,l:"Updates",badge:ALL_NOTIFS.length},{id:"profile",Icon:User,l:"Profile"}];
  return <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:`${C.bg}F6`,backdropFilter:"blur(14px)",borderTop:`1px solid ${C.line}`,display:"flex",paddingBottom:"env(safe-area-inset-bottom,10px)"}}>{tabs.map(t=>{const {id,Icon,l}=t;const on=active===id;return <button key={id} onClick={()=>onChange(id)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative"}}><Icon size={20} color={on?C.coral:C.t3} strokeWidth={on?2:1.5}/>{t.badge>0&&!on&&<div style={{position:"absolute",top:6,right:"24%",width:15,height:15,borderRadius:"50%",background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{t.badge}</div>}<span style={{...ty.tab,color:on?C.coral:C.t3,fontSize:10}}>{l}</span>{on&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:C.coral}}/>}</button>;})}</div>;
}

/* ==================================================
   ROOT
================================================== */
export default 
function CravzApp(){
  useEffect(()=>{
    if(document.getElementById("cravz-fonts")) return;
    const s=document.createElement("style"); s.id="cravz-fonts"; s.textContent=FONT_CSS;
    document.head.appendChild(s);
  },[]);
  useEffect(()=>{
    if(document.getElementById("cravz-web")) return;
    const s=document.createElement("style"); s.id="cravz-web";
    s.textContent="@media(min-width:768px){.cravz-sidebar{display:flex !important;}.cravz-main{margin-left:220px !important;max-width:none !important;}}.cravz-main{max-width:480px;margin:0 auto;}";
    document.head.appendChild(s);
  },[]);

  const [session,  setSession]  = useState(()=>{try{const s=sessionStorage.getItem("cravz_v15");return s?JSON.parse(s):null;}catch{return null;}});
  const setUser = (updater) => setSession(s => ({...s, user: typeof updater === 'function' ? updater(s.user) : updater}));
  const [authRoute,setAuthRoute]= useState("landing");
  const [userType, setUserType] = useState(null);
  const [tab,      setTab]      = useState("feed");
  const [voteItem, setVoteItem] = useState(null);
  const [isSuggest,setIsSuggest]= useState(false);
  const [coinAlloc,setCoinAlloc]= useState({});
  const [itemMeta, setItemMeta] = useState({});
  const [modQueue,    setModQueue]    = useState([]);

  useEffect(()=>{try{if(session)sessionStorage.setItem("cravz_v15",JSON.stringify(session));else sessionStorage.removeItem("cravz_v15");}catch{}},[session]);

  const openVote=(suggest=false,item=null)=>{setIsSuggest(suggest);setVoteItem(item);setTab("vote");};
  useEffect(()=>{ window.__cravzOnSuggest=s=>setModQueue(q=>[...q,{...s,id:"sug_"+Date.now(),status:"pending",ts:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"})}]); },[]);
  const handleDone=result=>{setSession(result);setTab("feed");};
  const handleLogout=()=>{setSession(null);setAuthRoute("landing");setCoinAlloc({});setItemMeta({});};

  if(!session){
    if(authRoute==="landing") return <Landing onResident={()=>{setUserType("resident");setAuthRoute("auth");}} onBusiness={()=>{setUserType("business");setAuthRoute("auth");}} onBizRequest={()=>setAuthRoute("bizrequest")}/>;
    if(authRoute==="bizrequest") return <BizRequestPage onBack={()=>setAuthRoute("landing")}/>;
    return <AuthFlow userType={userType} onBack={()=>setAuthRoute("landing")} onDone={handleDone}/>;
  }

  if(session.type==="business") return <BizDashboard session={session} onLogout={handleLogout} onUpdateSession={s=>setSession(s)}/>;

  const user=session.user||{postcode:"SW4"};
  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.t1,fontFamily:sans,position:"relative"}}>
{/* web layout styles injected via useEffect in CravzApp */}
      {/* Desktop sidebar */}
      <div className="cravz-sidebar" style={{display:"none",position:"fixed",top:0,left:0,bottom:0,width:220,background:C.surface,borderRight:"1px solid "+C.line,flexDirection:"column",zIndex:50,padding:"24px 0"}}>
        <div style={{padding:"0 20px 24px",borderBottom:"1px solid "+C.line,marginBottom:16}}>
          <CravzLogo size={28}/>
          <div style={{...ty.meta,color:C.t3,marginTop:4}}>{user.postcode}</div>
        </div>
        {[
          {id:"feed",Icon:Home,l:"Feed"},
          {id:"brief",Icon:FileText,l:"The Brief"},
          {id:"insights",Icon:BarChart2,l:"Insights"},
          {id:"notifs",Icon:Bell,l:"Updates"},
          {id:"profile",Icon:User,l:"Profile"},
        ].map(function(t){
          const on=tab===t.id;
          return (
            <button key={t.id} onClick={()=>{if(t.id==="suggest"){openVote(true);}else setTab(t.id);}}
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",background:on?C.coral+"14":"transparent",border:"none",borderLeft:"3px solid "+(on?C.coral:"transparent"),cursor:"pointer",fontFamily:sans,color:on?C.coral:C.t2,fontSize:13,fontWeight:on?600:400,width:"100%",textAlign:"left"}}>
              <t.Icon size={16} color={on?C.coral:C.t3}/>
              {t.l}
              {t.id==="notifs"&&ALL_NOTIFS.length>0&&<div style={{marginLeft:"auto",width:18,height:18,borderRadius:"50%",background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{ALL_NOTIFS.length}</div>}
            </button>
          );
        })}
        <div style={{marginTop:"auto",padding:"16px 20px",borderTop:"1px solid "+C.line}}>
          <button onClick={()=>setSession(null)} style={{width:"100%",padding:"10px",borderRadius:10,background:C.surface2,border:"1px solid "+C.line,color:C.t3,cursor:"pointer",fontFamily:sans,fontSize:12,fontWeight:400}}>
            Sign out
          </button>
        </div>
      </div>
      {/* Main content */}
      <div className="cravz-main">
        <TopBar user={user}/>
        {tab==="vote"     &&<VoteFlow coinAlloc={coinAlloc} setCoinAlloc={setCoinAlloc} itemMeta={itemMeta} setItemMeta={setItemMeta} preItem={voteItem} isSuggestMode={isSuggest} onClose={()=>{setVoteItem(null);setIsSuggest(false);setTab("feed");}}/>}
        {tab==="feed"     &&<ResFeed     user={user} coinAlloc={coinAlloc} itemMeta={itemMeta} onAllocate={openVote} onShowNotifs={()=>setTab("notifs")} onGoInsights={()=>setTab("insights")} modQueue={modQueue} onSuggest={s=>setModQueue(q=>[...q,{...s,id:"sug_"+Date.now(),status:"pending",ts:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"})}])}/>}
        {tab==="brief"    &&<TheBrief coinAlloc={coinAlloc} user={user}/>}
        {tab==="notifs"   &&<ResNotifications user={user} onAllocate={openVote}/>}
        {tab==="insights" &&<ResInsights user={user} coinAlloc={coinAlloc} itemMeta={itemMeta} onAllocate={openVote}/>}
        {tab==="profile"  &&<ResProfile  user={user} setUser={setUser} onLogout={handleLogout}/>}
        <BottomNav active={tab} onChange={t=>{if(t==="suggest"){openVote(true);}else setTab(t);}}/>
      </div>
    </div>
  );
}
