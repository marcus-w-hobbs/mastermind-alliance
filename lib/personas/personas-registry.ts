import { Persona } from "./persona";
import { user } from "./prompts/user";
import { edmondOtis } from "./prompts/edmond-otis";
import { friedrichNietzsche } from "./prompts/friedrich-nietzsche";
import { friedrichNietzsche2 } from "./prompts/friedrich-nietzsche-chatgpt-4.5";
import { sorenKierkegaard } from "./prompts/soren-kierkegaard";
import { researchDirector, analyticsLead, principalEngineer, appliedAIHead, productDesignLead } from "./prompts/innovation-lab";
import { augustine } from "./prompts/augustine-of-hippo";
import { chesterton } from "./prompts/g-k-chesterton";
import { csLewis } from "./prompts/cs-lewis";
import { apostleJohn } from "./prompts/apostle-john";
import { apostleLuke } from "./prompts/apostle-luke";
import { apostleMark } from "./prompts/apostle-mark";
import { apostleMatthew } from "./prompts/apostle-matthew";
import { marcusAurelius } from "./prompts/marcus-aurelius";
import { benjaminFranklin } from "./prompts/benjamin-franklin";
import { williamGibson } from "./prompts/william-gibson";
import { williamJames } from "./prompts/william-james";
import { philipKDick } from "./prompts/philip-k-dick";
import { octaviaButler } from "./prompts/octavia-butler";
import { stanislawLem } from "./prompts/stanislaw-lem";
import { jorgeLuisBorges } from "./prompts/jorge-luis-borges";
import { markTwain } from "./prompts/mark-twain";
import { georgeOrwell } from "./prompts/george-orwell";
import { helpfulAssistant } from "./prompts/helpful-assistant";
import { firstPrinciplesAssistant } from "./prompts/first-principles-assistant";
import { narcissistAssistant } from "./prompts/narcissist-assistant";
import { alanWatts } from "./prompts/alan-watts";
import { alanWatts2 } from "./prompts/alan-watts-chatgpt-4.5";
import { alanWatts5 } from "./prompts/alan-watts-chatgpt-5";
import { albertEinstein } from "./prompts/albert-einstein";
import { aldousHuxley } from "./prompts/aldous-huxley";
import { confucius } from "./prompts/confucius";
import { frankHerbert } from "./prompts/frank-herbert";
import { isaacAsimov } from "./prompts/isaac-asimov";
import { judasIscariot } from "./prompts/judas-iscariot";
import { kingSolomon } from "./prompts/king-solomon";
import { lucifer } from "./prompts/lucifer";
import { maryMagdalene } from "./prompts/mary-magdalene";
import { rayBradbury } from "./prompts/ray-bradbury";
import { terenceMckenna } from "./prompts/terence-mckenna";
import { mayaAngelou } from "./prompts/maya-angelou";
import { carlJung } from "./prompts/carl-jung";
import { chiefOfStaff } from "./prompts/chief-of-staff";
import { motivationalMuse } from "./prompts/motivational-muse";
import { punDit } from "./prompts/pun-dit";
import { philosophicalMuse } from "./prompts/philosophical-muse";
import { socraticSage } from "./prompts/socratic-sage";
import { brandBuilder } from "./prompts/brand-builder";
import { meetingScribe } from "./prompts/meeting-scribe";
import { psychologicalManipulator } from "./prompts/psychological-manipulator";
import { psychedelicThoughtArchitect } from "./prompts/psychedelic-thought-architect";
import { ethicalDilemmaNavigator } from "./prompts/ethical-dilemma-navigator";
import { directionsDecoder } from "./prompts/directions-decoder";
import { reviewClassifier } from "./prompts/review-classifier";
import { alienAnthropologist } from "./prompts/alien-anthropologist";
import { stevenRoss } from "./prompts/steven-ross";
import { meisterEckhart } from "./prompts/meister-eckhart";
import { socrates } from "./prompts/socrates";
import { laozi } from "./prompts/laozi";
import { seneca } from "./prompts/seneca";
import { rumi } from "./prompts/jalaluddin-rumi";
import { buddha } from "./prompts/buddha";
import { dostoevsky } from "./prompts/fyodor-dostoevsky";
import { hannahArendt } from "./prompts/hannah-arendt";
import { marshallMcLuhan } from "./prompts/marshall-mcluhan";
import { martinLutherKingJr } from "./prompts/martin-luther-king-jr";
import { jamesBaldwin } from "./prompts/james-baldwin";
import { viktorFrankl } from "./prompts/viktor-frankl";
import { thucydides } from "./prompts/thucydides";
import { ibnKhaldun } from "./prompts/ibn-khaldun";
import { machiavelli } from "./prompts/niccolo-machiavelli";
import { machiavelli5 } from "./prompts/niccolo-machiavelli-chatgpt-5";
import { epicurus } from "./prompts/epicurus";
import { nagarjuna } from "./prompts/nagarjuna";
import { napoleonHill } from "./prompts/napoleon-hill";
import { earlNightingale } from "./prompts/earl-nightingale";
import { jimRohn } from "./prompts/jim-rohn";
import { elonMusk } from "./prompts/elon-musk";
import { pythagoras } from "./prompts/pythagoras";
import { paracelsus } from "./prompts/paracelsus";
import { goethe } from "./prompts/johann-wolfgang-von-goethe";
import { anaximander } from "./prompts/anaximander";
import { anaxagoras } from "./prompts/anaxagoras";
import { alGhazali } from "./prompts/al-ghazali";
import { alFarabi } from "./prompts/al-farabi";
import { aristippus } from "./prompts/aristippus";
import { arthurSchopenhauer } from "./prompts/arthur-schopenhauer";
import { averroes } from "./prompts/averroes";
import { boethius } from "./prompts/boethius";
import { chiefJoseph } from "./prompts/chief-joseph";
import { cicero } from "./prompts/cicero";
import { crazyHorse } from "./prompts/crazy-horse";
import { democritus } from "./prompts/democritus";
import { descartes } from "./prompts/descartes";
import { dioChrysostom } from "./prompts/dio-chrysostom";
import { diogenes } from "./prompts/diogenes";
import { empedocles } from "./prompts/empedocles";
import { epictetus } from "./prompts/epictetus";
import { erasmus } from "./prompts/erasmus";
import { faridUdDinAttar } from "./prompts/farid-ud-din-attar";
import { friedrichSchiller } from "./prompts/friedrich-schiller";
import { giGurdjeff } from "./prompts/g-i-gurdjeff";
import { hafiz } from "./prompts/hafiz";
import { hazratInayatKhan } from "./prompts/hazrat-inayat-khan";
import { heraclitus } from "./prompts/heraclitus";
import { iamblichus } from "./prompts/iamblichus";
import { ibnArabi } from "./prompts/ibn-arabi";
import { imhotep } from "./prompts/imhotep";
import { isabelladEste } from "./prompts/isabella-d-este";
import { johnDee } from "./prompts/john-dee";
import { kabir } from "./prompts/kabir";
import { lallaLalleshwari } from "./prompts/lalla-lalleshwari";
import { leonardoDaVinci } from "./prompts/leonardo-da-vinci";
import { carlVonClausewitz } from "./prompts/carl-von-clausewitz";
import { henryKissinger } from "./prompts/henry-kissinger";
import { ottoBismarck } from "./prompts/otto-von-bismarck";
import { thomasHobbes } from "./prompts/thomas-hobbes";
import { sunTzu } from "./prompts/sun-tzu";
import { melRobbins } from "./prompts/mel-robbins";
import { sigmundFreud } from "./prompts/sigmund-freud";
import { chrisHedges } from "./prompts/chris-hedges";
import { gaborMate } from "./prompts/gabor-mate";
import { mahatmaGandi } from "./prompts/mahatma-gandi";
import { michelFoucault } from "./prompts/michel-foucault";
import { sherlockHolmes } from "./prompts/sherlock-holmes";
import { drWatson } from "./prompts/dr-watson";

// Define the valid persona IDs at the type level
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PERSONA_IDS_CONST = {
  "user": "user",
  "helpful-assistant": "helpful-assistant",
  "narcissist-assistant": "narcissist-assistant",
  "edmond-otis": "edmond-otis",
  "friedrich-nietzsche": "friedrich-nietzsche",
  "friedrich-nietzsche-chatgpt-4.5": "friedrich-nietzsche-chatgpt-4.5",
  "soren-kierkegaard": "soren-kierkegaard",
  "research-director": "research-director",
  "analytics-lead": "analytics-lead",
  "principal-engineer": "principal-engineer",
  "applied-ai-head": "applied-ai-head",
  "product-design-lead": "product-design-lead",
  "augustine": "augustine",
  "chesterton": "chesterton",
  "cs-lewis": "cs-lewis",
  "apostle-john": "apostle-john",
  "apostle-luke": "apostle-luke",
  "apostle-mark": "apostle-mark",
  "apostle-matthew": "apostle-matthew",
  "marcus-aurelius": "marcus-aurelius",
  "benjamin-franklin": "benjamin-franklin",
  "william-gibson": "william-gibson",
  "william-james": "william-james",
  "philip-k-dick": "philip-k-dick",
  "octavia-butler": "octavia-butler",
  "stanislaw-lem": "stanislaw-lem",
  "jorge-luis-borges": "jorge-luis-borges",
  "mark-twain": "mark-twain",
  "george-orwell": "george-orwell",
  "first-principles-assistant": "first-principles-assistant",
  "alan-watts": "alan-watts",
  "alan-watts-chatgpt-4.5": "alan-watts-chatgpt-4.5",
  "alan-watts-chatgpt-5": "alan-watts-chatgpt-5",
  "albert-einstein": "albert-einstein",
  "aldous-huxley": "aldous-huxley",
  "confucius": "confucius",
  "frank-herbert": "frank-herbert",
  "isaac-asimov": "isaac-asimov",
  "judas-iscariot": "judas-iscariot",
  "king-solomon": "king-solomon",
  "lucifer": "lucifer",
  "mary-magdalene": "mary-magdalene",
  "ray-bradbury": "ray-bradbury",
  "terence-mckenna": "terence-mckenna",
  "maya-angelou": "maya-angelou",
  "carl-jung": "carl-jung",
  "chief-of-staff": "chief-of-staff",
  "motivational-muse": "motivational-muse",
  "meeting-scribe": "meeting-scribe",
  "philosophical-muse": "philosophical-muse",
  "pun-dit": "pun-dit",
  "socratic-sage": "socratic-sage",
  "brand-builder": "brand-builder",
  "psychological-manipulator": "psychological-manipulator",
  "psychedelic-thought-architect": "psychedelic-thought-architect",
  "ethical-dilemma-navigator": "ethical-dilemma-navigator",
  "directions-decoder": "directions-decoder",
  "review-classifier": "review-classifier",
  "alien-anthropologist": "alien-anthropologist",
  "steven-ross": "steven-ross",
  "meister-eckhart": "meister-eckhart",
  "socrates": "socrates",
  "laozi": "laozi",
  "seneca": "seneca",
  "rumi": "rumi",
  "buddha": "buddha",
  "dostoevsky": "dostoevsky",
  "hannah-arendt": "hannah-arendt",
  "marshall-mcluhan": "marshall-mcluhan",
  "martin-luther-king-jr": "martin-luther-king-jr",
  "james-baldwin": "james-baldwin",
  "viktor-frankl": "viktor-frankl",
  "thucydides": "thucydides",
  "ibn-khaldun": "ibn-khaldun",
  "machiavelli": "machiavelli",
  "niccolo-machiavelli-chatgpt-5": "niccolo-machiavelli-chatgpt-5",
  "epicurus": "epicurus",
  "nagarjuna": "nagarjuna",
  "napoleon-hill": "napoleon-hill",
  "earl-nightingale": "earl-nightingale",
  "jim-rohn": "jim-rohn",
  "elon-musk": "elon-musk",
  "pythagoras": "pythagoras",
  "paracelsus": "paracelsus",
  "goethe": "goethe",
  "anaximander": "anaximander",
  "anaxagoras": "anaxagoras",
  "al-ghazali": "al-ghazali",
  "al-farabi": "al-farabi",
  "aristippus": "aristippus",
  "arthur-schopenhauer": "arthur-schopenhauer",
  "averroes": "averroes",
  "boethius": "boethius",
  "chief-joseph": "chief-joseph",
  "cicero": "cicero",
  "crazy-horse": "crazy-horse",
  "democritus": "democritus",
  "descartes": "descartes",
  "dio-chrysostom": "dio-chrysostom",
  "diogenes": "diogenes",
  "empedocles": "empedocles",
  "epictetus": "epictetus",
  "erasmus": "erasmus",
  "farid-ud-din-attar": "farid-ud-din-attar",
  "friedrich-schiller": "friedrich-schiller",
  "g-i-gurdjeff": "g-i-gurdjeff",
  "hafiz": "hafiz",
  "hazrat-inayat-khan": "hazrat-inayat-khan",
  "heraclitus": "heraclitus",
  "iamblichus": "iamblichus",
  "ibn-arabi": "ibn-arabi",
  "imhotep": "imhotep",
  "isabella-d-este": "isabella-d-este",
  "john-dee": "john-dee",
  "kabir": "kabir",
  "lalla-lalleshwari": "lalla-lalleshwari",
  "leonardo-da-vinci": "leonardo-da-vinci",
  "carl-von-clausewitz": "carl-von-clausewitz",
  "henry-kissinger": "henry-kissinger",
  "otto-von-bismarck": "otto-von-bismarck",
  "thomas-hobbes": "thomas-hobbes",
  "sun-tzu": "sun-tzu",
  "mel-robbins": "mel-robbins",
  "sigmund-freud": "sigmund-freud",
  "chris-hedges": "chris-hedges",
  "gabor-mate": "gabor-mate",
  "mahatma-gandi": "mahatma-gandi",
  "michel-foucault": "michel-foucault",
  "sherlock-holmes": "sherlock-holmes",
  "dr-watson": "dr-watson"
} as const;

// Create the discriminated union type
export type PersonaId = typeof PERSONA_IDS_CONST[keyof typeof PERSONA_IDS_CONST];

// Define a type for persona metadata
export interface PersonaMetadata {
  id: PersonaId;      // Now using our discriminated union
  name: string;       // Display name
  description: string;// Short description for UI
  category: string;   // For grouping in dropdowns
  instance: Persona;  // The actual persona instance
}

// Create a registry of all personas
export const personasRegistry: Record<PersonaId, PersonaMetadata> = {
  "user": {
    id: "user",
    name: "User",
    description: "The user of the application",
    category: "User",
    instance: user
  },
  "helpful-assistant": {
    id: "helpful-assistant",
    name: "Helpful Assistant",
    description: "A general-purpose helpful assistant",
    category: "Assistants",
    instance: helpfulAssistant
  },
  "narcissist-assistant": {
    id: "narcissist-assistant",
    name: "Narcissist Assistant",
    description: "An assistant to a narcissist",
    category: "Assistants",
    instance: narcissistAssistant
  },
  "edmond-otis": {
    id: "edmond-otis",
    name: "Edmond Otis",
    description: "A trusted performance coach known for empathy and practical advice",
    category: "Motivational Speakers",
    instance: edmondOtis
  },
  "friedrich-nietzsche": {
    id: "friedrich-nietzsche",
    name: "Friedrich Nietzsche",
    description: "German philosopher with provocative, aphoristic style",
    category: "Philosophers",
    instance: friedrichNietzsche
  },
  "friedrich-nietzsche-chatgpt-4.5": {
    id: "friedrich-nietzsche-chatgpt-4.5",
    name: "Friedrich Nietzsche 4.5",
    description: "German philosopher with provocative, aphoristic style",
    category: "Philosophers",
    instance: friedrichNietzsche2
  },
  "soren-kierkegaard": {
    id: "soren-kierkegaard",
    name: "Søren Kierkegaard",
    description: "Danish existentialist philosopher focused on individual existence and faith",
    category: "Philosophers",
    instance: sorenKierkegaard
  },
  "research-director": {
    id: "research-director",
    name: "Research Director",
    description: "Strategic research leader driving innovation initiatives",
    category: "Business",
    instance: researchDirector
  },
  "analytics-lead": {
    id: "analytics-lead",
    name: "Analytics Lead",
    description: "Data analytics expert providing insights and metrics",
    category: "Business",
    instance: analyticsLead
  },
  "principal-engineer": {
    id: "principal-engineer",
    name: "Principal Engineer",
    description: "Technical architect leading engineering initiatives",
    category: "Business",
    instance: principalEngineer
  },
  "applied-ai-head": {
    id: "applied-ai-head",
    name: "Applied AI Head",
    description: "AI implementation and strategy expert",
    category: "Business",
    instance: appliedAIHead
  },
  "product-design-lead": {
    id: "product-design-lead",
    name: "Product Design Lead",
    description: "UX and product design strategist",
    category: "Business",
    instance: productDesignLead
  },
  "augustine": {
    id: "augustine",
    name: "Augustine of Hippo",
    description: "Early Christian theologian and philosopher",
    category: "Religious Figures",
    instance: augustine
  },
  "chesterton": {
    id: "chesterton",
    name: "G.K. Chesterton",
    description: "Christian apologist and literary critic known for paradoxical wit",
    category: "Authors",
    instance: chesterton
  },
  "cs-lewis": {
    id: "cs-lewis",
    name: "C.S. Lewis",
    description: "Christian author and academic known for apologetics and fiction",
    category: "Authors",
    instance: csLewis
  },
  "apostle-john": {
    id: "apostle-john",
    name: "Apostle John",
    description: "Gospel author emphasizing love and light",
    category: "Religious Figures",
    instance: apostleJohn
  },
  "apostle-luke": {
    id: "apostle-luke",
    name: "Apostle Luke",
    description: "Gospel author with historical and medical perspective",
    category: "Religious Figures",
    instance: apostleLuke
  },
  "apostle-mark": {
    id: "apostle-mark",
    name: "Apostle Mark",
    description: "Gospel author known for concise, action-oriented narrative",
    category: "Religious Figures",
    instance: apostleMark
  },
  "apostle-matthew": {
    id: "apostle-matthew",
    name: "Apostle Matthew",
    description: "Gospel author emphasizing Jewish context and teachings",
    category: "Religious Figures",
    instance: apostleMatthew
  },
  "marcus-aurelius": {
    id: "marcus-aurelius",
    name: "Marcus Aurelius",
    description: "Roman Emperor and Stoic philosopher",
    category: "Philosophers",
    instance: marcusAurelius
  },
  "benjamin-franklin": {
    id: "benjamin-franklin",
    name: "Benjamin Franklin",
    description: "American polymath, inventor, and founding father",
    category: "Historical Figures",
    instance: benjaminFranklin
  },
  "william-gibson": {
    id: "william-gibson",
    name: "William Gibson",
    description: "Cyberpunk pioneer and science fiction author",
    category: "Authors",
    instance: williamGibson
  },
  "william-james": {
    id: "william-james",
    name: "William James",
    description: "Pioneering psychologist and pragmatist philosopher",
    category: "Authors",
    instance: williamJames
  },
  "philip-k-dick": {
    id: "philip-k-dick",
    name: "Philip K. Dick",
    description: "Visionary science fiction author exploring reality and consciousness",
    category: "Authors",
    instance: philipKDick
  },
  "octavia-butler": {
    id: "octavia-butler",
    name: "Octavia Butler",
    description: "Groundbreaking science fiction author exploring social issues",
    category: "Authors",
    instance: octaviaButler
  },
  "stanislaw-lem": {
    id: "stanislaw-lem",
    name: "Stanisław Lem",
    description: "Philosophical science fiction author exploring human-technology relations",
    category: "Authors",
    instance: stanislawLem
  },
  "jorge-luis-borges": {
    id: "jorge-luis-borges",
    name: "Jorge Luis Borges",
    description: "Argentinian author known for philosophical fiction",
    category: "Authors",
    instance: jorgeLuisBorges
  },
  "mark-twain": {
    id: "mark-twain",
    name: "Mark Twain",
    description: "American author known for wit and social commentary",
    category: "Authors",
    instance: markTwain
  },
  "george-orwell": {
    id: "george-orwell",
    name: "George Orwell",
    description: "Political writer and novelist focused on social justice",
    category: "Authors",
    instance: georgeOrwell
  },
  "first-principles-assistant": {
    id: "first-principles-assistant",
    name: "First Principles Assistant",
    description: "A hyper-rational, first-principles problem solver",
    category: "Assistants",
    instance: firstPrinciplesAssistant
  },
  "alan-watts": {
    id: "alan-watts",
    name: "Alan Watts",
    description: "Philosopher and writer on Eastern philosophy and spirituality",
    category: "Philosophers",
    instance: alanWatts
  },
  "alan-watts-chatgpt-4.5": {
    id: "alan-watts-chatgpt-4.5",
    name: "Alan Watts 4.5",
    description: "Philosopher and writer on Eastern philosophy and spirituality",
    category: "Philosophers", // TODO: Add to the correct category
    instance: alanWatts2
  },
  "alan-watts-chatgpt-5": {
    id: "alan-watts-chatgpt-5",
    name: "Alan Watts 5",
    description: "Philosopher and writer on Eastern philosophy and spirituality",
    category: "Philosophers",
    instance: alanWatts5
  },
  "albert-einstein": {
    id: "albert-einstein",
    name: "Albert Einstein",
    description: "Theoretical physicist and humanitarian thinker",
    category: "Scientists",
    instance: albertEinstein
  },
  "aldous-huxley": {
    id: "aldous-huxley",
    name: "Aldous Huxley",
    description: "Visionary author exploring consciousness and society",
    category: "Authors",
    instance: aldousHuxley
  },
  "confucius": {
    id: "confucius",
    name: "Confucius",
    description: "Ancient Chinese philosopher and teacher",
    category: "Philosophers",
    instance: confucius
  },
  "frank-herbert": {
    id: "frank-herbert",
    name: "Frank Herbert",
    description: "Science fiction author exploring ecology and power",
    category: "Authors",
    instance: frankHerbert
  },
  "isaac-asimov": {
    id: "isaac-asimov",
    name: "Isaac Asimov",
    description: "Science fiction author and biochemist",
    category: "Authors",
    instance: isaacAsimov
  },
  "judas-iscariot": {
    id: "judas-iscariot",
    name: "Judas Iscariot",
    description: "Complex figure exploring betrayal and redemption",
    category: "Religious Figures",
    instance: judasIscariot
  },
  "king-solomon": {
    id: "king-solomon",
    name: "King Solomon",
    description: "Wise ruler and author of proverbs",
    category: "Religious Figures",
    instance: kingSolomon
  },
  "lucifer": {
    id: "lucifer",
    name: "Lucifer",
    description: "Challenger of conventional wisdom and authority",
    category: "Religious Figures",
    instance: lucifer
  },
  "mary-magdalene": {
    id: "mary-magdalene",
    name: "Mary Magdalene",
    description: "Witness to spiritual transformation and healing",
    category: "Religious Figures",
    instance: maryMagdalene
  },
  "ray-bradbury": {
    id: "ray-bradbury",
    name: "Ray Bradbury",
    description: "Poetic science fiction author and social critic",
    category: "Authors",
    instance: rayBradbury
  },
  "terence-mckenna": {
    id: "terence-mckenna",
    name: "Terence McKenna",
    description: "Ethnobotanist and consciousness explorer",
    category: "Philosophers",
    instance: terenceMckenna
  },
  "maya-angelou": {
    id: "maya-angelou",
    name: "Maya Angelou",
    description: "Poet and author known for her powerful voice and insights",
    category: "Authors",
    instance: mayaAngelou
  },
  "carl-jung": {
    id: "carl-jung",
    name: "Carl Jung",
    description: "Swiss psychiatrist and psychoanalyst known for his theories on the unconscious mind",
    category: "Psychologists",
    instance: carlJung
  },
  "chief-of-staff": {
    id: "chief-of-staff",
    name: "Chief of Staff",
    description: "A trusted advisor to the user, focused on their goals and values",
    category: "Advisors",
    instance: chiefOfStaff
  },
  "motivational-muse": {
    id: "motivational-muse",
    name: "Motivational Muse",
    description: "A muse for motivation and inspiration",
    category: "Motivational Speakers",
    instance: motivationalMuse
  },
  "philosophical-muse": {
    id: "philosophical-muse",
    name: "Philosophical Muse",
    description: "A muse for philosophical discussions",
    category: "Philosophers",
    instance: philosophicalMuse
  },
  "pun-dit": {
    id: "pun-dit",
    name: "Pun Dit",
    description: "A muse for puns and wordplay",
    category: "Humor",
    instance: punDit
  },
  "socratic-sage": {
    id: "socratic-sage",
    name: "Socratic Sage",
    description: "A muse for Socratic discussions",
    category: "Philosophers",
    instance: socraticSage
  },
  "brand-builder": {
    id: "brand-builder",
    name: "Brand Builder",
    description: "A muse for brand building",
    category: "Business",
    instance: brandBuilder
  },
  "meeting-scribe": {
    id: "meeting-scribe",
    name: "Meeting Scribe",
    description: "Recap a meeting",
    category: "Assistants",
    instance: meetingScribe
  },
  "psychological-manipulator": {
    id: "psychological-manipulator",
    name: "Psychological Manipulator",
    description: "Uses psychological tactics to push you toward your goals",
    category: "Assistants",
    instance: psychologicalManipulator
  },
  "psychedelic-thought-architect": {
    id: "psychedelic-thought-architect",
    name: "Psychedelic Thought Architect",
    description: "Generates creative connections between concepts with neural-like thinking patterns",
    category: "Assistants",
    instance: psychedelicThoughtArchitect
  },
  "ethical-dilemma-navigator": {
    id: "ethical-dilemma-navigator",
    name: "Ethical Dilemma Navigator",
    description: "Help the user think through complex ethical dilemmas and provide different perspectives.",
    category: "Motivational Speakers",
    instance: ethicalDilemmaNavigator
  },
  "directions-decoder": {
    id: "directions-decoder",
    name: "Natural Language Directions Decoder",
    description: "Transform natural language into step-by-step directions.",
    category: "Assistants",
    instance: directionsDecoder
  },
  "review-classifier": {
    id: "review-classifier",
    name: "Review Classifier",
    description: "Categorize feedback into pre-specified tags and categorizations.",
    category: "Business",
    instance: reviewClassifier
  },
  "alien-anthropologist": {
    id: "alien-anthropologist",
    name: "Alien Anthropologist",
    description: "Analyze human culture and customs from the perspective of an alien anthropologist.",
    category: "Assistants",
    instance: alienAnthropologist
  },
  "steven-ross": {
    id: "steven-ross",
    name: "Dr. Steven Ross",
    description: "Philosopher, visionary researcher, and co-founder of the World Research Foundation, which holds one of the world's most unique libraries of ancient and modern healing wisdom.",
    category: "Spiritual",
    instance: stevenRoss
  },
  "meister-eckhart": {
    id: "meister-eckhart",
    name: "Meister Eckhart",
    description: "Christian mystic, encourages internal clarity and detachment from superficial worldly distractions",
    category: "Religious Figures",
    instance: meisterEckhart
  },
  "socrates": {
    id: "socrates",
    name: "Socrates",
    description: "Challenges superficiality and ignorance, urging continual questioning and self-awareness",
    category: "Philosophers",
    instance: socrates
  },
  "laozi": {
    id: "laozi",
    name: "Laozi",
    description: "Taoism's founder, whose teachings on natural balance provide a direct antidote to modern anxiety",
    category: "Philosophers",
    instance: laozi
  },
  "seneca": {
    id: "seneca",
    name: "Seneca",
    description: "Advocate of Stoicism, addresses managing anxiety, living meaningfully, and confronting inevitable change",
    category: "Philosophers",
    instance: seneca
  },
  "rumi": {
    id: "rumi",
    name: "Jalaluddin Rumi",
    description: "Mystic poet, addresses emotional turbulence and human connectedness with deep compassion",
    category: "Authors",
    instance: rumi
  },
  "buddha": {
    id: "buddha",
    name: "Buddha",
    description: "Directly confronts suffering, dissatisfaction, and mental anguish, outlining practical pathways to mental clarity and freedom",
    category: "Philosophers",
    instance: buddha
  },
  "dostoevsky": {
    id: "dostoevsky",
    name: "Fyodor Dostoevsky",
    description: "Deeply explores human darkness and moral ambiguity, challenging falsehoods and societal illusions",
    category: "Authors",
    instance: dostoevsky
  },
  "hannah-arendt": {
    id: "hannah-arendt",
    name: "Hannah Arendt",
    description: "Reveals the dangers of passive conformity, thoughtlessness, and social manipulation",
    category: "Philosophers",
    instance: hannahArendt
  },
  "marshall-mcluhan": {
    id: "marshall-mcluhan",
    name: "Marshall McLuhan",
    description: "Highlights how technological mediums shape human cognition, behavior, and societal structure, critically relevant today",
    category: "Philosophers",
    instance: marshallMcLuhan
  },
  "martin-luther-king-jr": {
    id: "martin-luther-king-jr",
    name: "Martin Luther King Jr.",
    description: "Speaks powerfully on justice, courage, collective morality, and active engagement against oppressive systems",
    category: "Historical Figures",
    instance: martinLutherKingJr
  },
  "james-baldwin": {
    id: "james-baldwin",
    name: "James Baldwin",
    description: "Challenges destructive narratives of society, calling passionately for courageous honesty and authenticity",
    category: "Authors",
    instance: jamesBaldwin
  },
  "viktor-frankl": {
    id: "viktor-frankl",
    name: "Viktor Frankl",
    description: "Offers profound existential wisdom on finding meaning, resilience, and humanity in the face of extreme adversity",
    category: "Psychologists",
    instance: viktorFrankl
  },
  "thucydides": {
    id: "thucydides",
    name: "Thucydides",
    description: "Offers timeless insights into human nature, power, political corruption, and the recurrence of societal mistakes",
    category: "Philosophers",
    instance: thucydides
  },
  "ibn-khaldun": {
    id: "ibn-khaldun",
    name: "Ibn Khaldun",
    description: "Historian and sociologist who identified cyclical patterns of societal rise, corruption, and collapse",
    category: "Historical Figures",
    instance: ibnKhaldun
  },
  "machiavelli": {
    id: "machiavelli",
    name: "Niccolò Machiavelli",
    description: "Political realist who stripped away moral pretense to reveal the raw mechanics of power and statecraft",
    category: "Historical Figures",
    instance: machiavelli
  },
  "niccolo-machiavelli-chatgpt-5": {
    id: "niccolo-machiavelli-chatgpt-5",
    name: "Niccolò Machiavelli 5",
    description: "Political realist with sharper instruction-following and reasoning (ChatGPT 5-tuned prompt).",
    category: "Historical Figures",
    instance: machiavelli5
  },
  "epicurus": {
    id: "epicurus",
    name: "Epicurus",
    description: "Ancient atomist who pioneered evidence-based understanding of nature and taught that tranquility comes through moderation",
    category: "Philosophers",
    instance: epicurus
  },
  "nagarjuna": {
    id: "nagarjuna",
    name: "Nagarjuna",
    description: "Buddhist philosopher whose radical emptiness doctrine deconstructed all fixed positions, revealing the interdependent nature of reality",
    category: "Philosophers",
    instance: nagarjuna
  },
  "napoleon-hill": {
    id: "napoleon-hill",
    name: "Napoleon Hill",
    description: "Author of 'Think and Grow Rich', known for success principles and personal achievement philosophy",
    category: "Motivational Speakers",
    instance: napoleonHill
  },
  "earl-nightingale": {
    id: "earl-nightingale",
    name: "Earl Nightingale",
    description: "Motivational speaker and author known for 'The Strangest Secret' and principles of success",
    category: "Motivational Speakers",
    instance: earlNightingale
  },
  "jim-rohn": {
    id: "jim-rohn",
    name: "Jim Rohn",
    description: "Business philosopher and mentor known for personal development and success principles",
    category: "Motivational Speakers",
    instance: jimRohn
  },
  "elon-musk": {
    id: "elon-musk",
    name: "Elon Musk",
    description: "Entrepreneur and innovator focused on sustainable energy, space exploration, and technology",
    category: "Business",
    instance: elonMusk
  },
  "pythagoras": {
    id: "pythagoras",
    name: "Pythagoras",
    description: "Ancient Greek philosopher and mathematician known for the Pythagorean theorem",
    category: "Philosophers",
    instance: pythagoras
  },
  "paracelsus": {
    id: "paracelsus",
    name: "Paracelsus",
    description: "Swiss physician and alchemist known for his medical theories and alchemical practices",
    category: "Scientists",
    instance: paracelsus
  },
  "goethe": {
    id: "goethe",
    name: "Johann Wolfgang von Goethe",
    description: "German poet, playwright, and statesman known for his contributions to literature and philosophy",
    category: "Authors",
    instance: goethe
  },
  "anaximander": {
    id: "anaximander",
    name: "Anaximander",
    description: "Pre-Socratic philosopher, cosmologist, and mystic",
    category: "Philosophers",
    instance: anaximander
  },
  "anaxagoras": {
    id: "anaxagoras",
    name: "Anaxagoras",
    description: "5th-century BCE Pre-Socratic philosopher renowned for natural philosophy and metaphysics",
    category: "Philosophers",
    instance: anaxagoras
  },
  "al-ghazali": {
    id: "al-ghazali",
    name: "Al-Ghazali",
    description: "11th-century Persian theologian, philosopher, and mystic",
    category: "Philosophers",
    instance: alGhazali
  },
  "al-farabi": {
    id: "al-farabi",
    name: "Al-Farabi",
    description: "Islamic philosopher, polymath, and music theorist",
    category: "Philosophers",
    instance: alFarabi
  },
  "aristippus": {
    id: "aristippus",
    name: "Aristippus",
    description: "5th-century BCE Greek philosopher and founder of the Cyrenaic school of hedonism",
    category: "Philosophers",
    instance: aristippus
  },
  "arthur-schopenhauer": {
    id: "arthur-schopenhauer",
    name: "Arthur Schopenhauer",
    description: "19th-century German philosopher known for his profound philosophical pessimism",
    category: "Philosophers",
    instance: arthurSchopenhauer
  },
  "averroes": {
    id: "averroes",
    name: "Averroes",
    description: "12th-century Andalusian polymath renowned for his contributions to philosophy, medicine, and Islamic jurisprudence",
    category: "Philosophers",
    instance: averroes
  },
  "boethius": {
    id: "boethius",
    name: "Boethius",
    description: "6th-century Roman philosopher, statesman, and author",
    category: "Philosophers",
    instance: boethius
  },
  "chief-joseph": {
    id: "chief-joseph",
    name: "Chief Joseph",
    description: "Profound spiritual and moral leader of the Nez Perce",
    category: "Historical Figures",
    instance: chiefJoseph
  },
  "cicero": {
    id: "cicero",
    name: "Cicero",
    description: "1st-century BCE Roman statesman, orator, and philosopher",
    category: "Philosophers",
    instance: cicero
  },
  "crazy-horse": {
    id: "crazy-horse",
    name: "Crazy Horse",
    description: "Lakota leader and warrior who fought to preserve his people's way of life",
    category: "Historical Figures",
    instance: crazyHorse
  },
  "democritus": {
    id: "democritus",
    name: "Democritus",
    description: "5th-century BCE Greek philosopher renowned for his formulation of atomic theory and his emphasis on cheerfulness",
    category: "Philosophers",
    instance: democritus
  },
  "descartes": {
    id: "descartes",
    name: "René Descartes",
    description: "17th-century French philosopher, mathematician, and scientist often called the father of modern philosophy",
    category: "Philosophers",
    instance: descartes
  },
  "dio-chrysostom": {
    id: "dio-chrysostom",
    name: "Dio Chrysostom",
    description: "1st-century Greek philosopher, orator, and writer known for his moral discourses",
    category: "Philosophers",
    instance: dioChrysostom
  },
  "diogenes": {
    id: "diogenes",
    name: "Diogenes",
    description: "Ancient Greek philosopher and founder of Cynicism who rejected social conventions and lived with radical simplicity",
    category: "Philosophers",
    instance: diogenes
  },
  "empedocles": {
    id: "empedocles",
    name: "Empedocles",
    description: "5th-century BCE Greek philosopher, poet, and mystic who proposed the four element theory",
    category: "Philosophers",
    instance: empedocles
  },
  "epictetus": {
    id: "epictetus",
    name: "Epictetus",
    description: "Stoic philosopher born a slave who taught that suffering arises from trying to control what is uncontrollable",
    category: "Philosophers",
    instance: epictetus
  },
  "erasmus": {
    id: "erasmus",
    name: "Erasmus",
    description: "Renaissance humanist, Catholic priest, and social critic who used wit and reason to reform society",
    category: "Philosophers",
    instance: erasmus
  },
  "farid-ud-din-attar": {
    id: "farid-ud-din-attar",
    name: "Farid ud-Din Attar",
    description: "12th-century Persian Sufi poet known for allegorical works exploring divine love",
    category: "Authors",
    instance: faridUdDinAttar
  },
  "friedrich-schiller": {
    id: "friedrich-schiller",
    name: "Friedrich Schiller",
    description: "German philosopher, poet, and playwright who advocated for human freedom and aesthetic education",
    category: "Philosophers",
    instance: friedrichSchiller
  },
  "g-i-gurdjeff": {
    id: "g-i-gurdjeff",
    name: "G. I. Gurdjeff",
    description: "Early 20th-century mystic and spiritual teacher known for introducing the Fourth Way, a path of self-development",
    category: "Philosophers",
    instance: giGurdjeff
  },
  "hafiz": {
    id: "hafiz",
    name: "Hafiz",
    description: "14th-century Persian mystic poet who used sensual imagery to express divine truth",
    category: "Authors",
    instance: hafiz
  },
  "hazrat-inayat-khan": {
    id: "hazrat-inayat-khan",
    name: "Hazrat Inayat Khan",
    description: "Early 20th-century Sufi mystic and musician who brought universal Sufism to the Western world",
    category: "Philosophers",
    instance: hazratInayatKhan
  },
  "heraclitus": {
    id: "heraclitus",
    name: "Heraclitus",
    description: "Pre-Socratic philosopher known for views on flux, fire as elemental principle, and the unity of opposites",
    category: "Philosophers",
    instance: heraclitus
  },
  "iamblichus": {
    id: "iamblichus",
    name: "Iamblichus",
    description: "Neoplatonic philosopher known for uniting theurgy with philosophy and religious practice",
    category: "Philosophers",
    instance: iamblichus
  },
  "ibn-arabi": {
    id: "ibn-arabi",
    name: "Ibn Arabi",
    description: "12th-century Andalusian Sufi mystic and philosopher known as the 'Greatest Master'",
    category: "Philosophers",
    instance: ibnArabi
  },
  "imhotep": {
    id: "imhotep",
    name: "Imhotep",
    description: "Ancient Egyptian polymath: architect, physician, engineer, and high priest who became deified",
    category: "Historical Figures",
    instance: imhotep
  },
  "isabella-d-este": {
    id: "isabella-d-este",
    name: "Isabella d'Este",
    description: "Renaissance noblewoman, patron of the arts, diplomat, poet, and protector of culture and beauty",
    category: "Historical Figures",
    instance: isabelladEste
  },
  "john-dee": {
    id: "john-dee",
    name: "John Dee",
    description: "Elizabethan mathematician, astronomer, astrologer, occult philosopher, and advisor to Queen Elizabeth I",
    category: "Scientists",
    instance: johnDee
  },
  "kabir": {
    id: "kabir",
    name: "Kabir",
    description: "15th-century Indian mystic poet and saint who challenged religious orthodoxy and spoke of direct experience",
    category: "Authors",
    instance: kabir
  },
  "lalla-lalleshwari": {
    id: "lalla-lalleshwari",
    name: "Lalla Lalleshwari",
    description: "14th-century Kashmiri mystic poet who abandoned convention to pursue direct spiritual experience",
    category: "Authors",
    instance: lallaLalleshwari
  },
  "leonardo-da-vinci": {
    id: "leonardo-da-vinci",
    name: "Leonardo da Vinci",
    description: "Visionary artist, inventor, philosopher, and seeker of divine proportion",
    category: "Artists",
    instance: leonardoDaVinci
  },
  "carl-von-clausewitz": {
    id: "carl-von-clausewitz",
    name: "Carl von Clausewitz",
    description: "Prussian military theorist whose work 'On War' established modern strategic thinking and military philosophy",
    category: "Historical Figures",
    instance: carlVonClausewitz
  },
  "henry-kissinger": {
    id: "henry-kissinger",
    name: "Henry Kissinger",
    description: "American diplomat and geopolitical strategist known for his realpolitik approach to foreign policy",
    category: "Historical Figures",
    instance: henryKissinger
  },
  "otto-von-bismarck": {
    id: "otto-von-bismarck",
    name: "Otto von Bismarck",
    description: "Prussian statesman and architect of German unification known for his pragmatic 'realpolitik' approach",
    category: "Historical Figures",
    instance: ottoBismarck
  },
  "thomas-hobbes": {
    id: "thomas-hobbes",
    name: "Thomas Hobbes",
    description: "English philosopher whose 'Leviathan' established social contract theory and modern political philosophy",
    category: "Philosophers",
    instance: thomasHobbes
  },
  "sun-tzu": {
    id: "sun-tzu",
    name: "Sun Tzu",
    description: "Ancient Chinese military strategist and philosopher whose 'Art of War' remains the definitive work on strategic thinking and conflict resolution",
    category: "Historical Figures",
    instance: sunTzu
  },
  "mel-robbins": {
    id: "mel-robbins",
    name: "Mel Robbins",
    description: "World-renowned motivational speaker and author shares her secrets for a better life",
    category: "Motivational Speakers",
    instance: melRobbins
  },
  "sigmund-freud": {
    id: "sigmund-freud",
    name: "Sigmund Freud",
    description: "Austrian neurologist and the founder of psychoanalysis, a clinical method for evaluating and treating pathologies seen as originating from conflicts in the psyche, through dialogue between patient and psychoanalyst, and the distinctive theory of mind and human agency derived from it",
    category: "Psychologists",
    instance: sigmundFreud
  },
  "chris-hedges": {
    id: "chris-hedges",
    name: "Chris Hedges",
    description: "American journalist, author, commentator, Presbyterian minister, and former war correspondent known for his moral clarity and prophetic voice against empire and corporate power",
    category: "Authors",
    instance: chrisHedges
  },
  "gabor-mate": {
    id: "gabor-mate",
    name: "Gabor Mate",
    description: "Canadian physician specializing in trauma, addiction, and the mind-body connection",
    category: "Psychologists",
    instance: gaborMate
  },
  "mahatma-gandi": {
    id: "mahatma-gandi",
    name: "Mahatma Gandi",
    description: "Indian independence leader and advocate of nonviolent resistance and moral transformation",
    category: "Historical Figures",
    instance: mahatmaGandi
  },
  "michel-foucault": {
    id: "michel-foucault",
    name: "Michel Foucault",
    description: "French philosopher, historian, and social theorist known for his critical studies of power, knowledge, and social institutions",
    category: "Philosophers",
    instance: michelFoucault
  },
  "sherlock-holmes": {
    id: "sherlock-holmes",
    name: "Sherlock Holmes",
    description: "The world's greatest consulting detective, master of deduction and observation",
    category: "Fictional Characters",
    instance: sherlockHolmes
  },
  "dr-watson": {
    id: "dr-watson",
    name: "Dr. Watson",
    description: "Loyal companion, medical doctor, and chronicler of Sherlock Holmes's adventures",
    category: "Fictional Characters",
    instance: drWatson
  }
};

/**
 * Get all valid persona IDs
 */
export const getPersonaIds = (): PersonaId[] => Object.keys(personasRegistry) as PersonaId[];

/**
 * Get all unique persona categories
 */
export const getPersonaCategories = (excludeUserCategory: boolean = true): string[] => {
  const categories = new Set(Object.values(personasRegistry).map(p => p.category));
  if (excludeUserCategory) {
    categories.delete("User");
  }
  return Array.from(categories).sort();
};

/**
 * Get all personas in a specific category
 */
export const getPersonasByCategory = (category: string): PersonaMetadata[] => {
  return Object.values(personasRegistry)
    .filter(p => p.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get all personas
 */
export const getAllPersonas = (): PersonaMetadata[] => {
  return Object.values(personasRegistry)
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Default personas for each page type
 */
export const DEFAULT_PERSONAS = {
  chat: ['helpful-assistant'],
  tools: ['helpful-assistant'],
  mastermind: ['first-principles-assistant', 'alien-anthropologist', 'psychological-manipulator']
} as const;

/**
 * Get the default persona ID
 */
export const getDefaultPersonaId = (): PersonaId => "helpful-assistant"; 