import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, Pause, SkipForward, Volume2, Globe, Sparkles, MapPin, 
  HelpCircle, Info, Radio, Settings, Languages, MessageSquare, 
  ChevronRight, VolumeX, BookOpen, Headset, Mic
} from "lucide-react";

interface TourDestination {
  id: string;
  name: string;
  location: string;
  image: string;
  category: "Heritage" | "Nature" | "Spiritual" | "Adventure";
  narrations: {
    English: {
      title: string;
      role: string;
      text: string;
      duration: string;
    };
    Hindi: {
      title: string;
      role: string;
      text: string;
      duration: string;
    };
    Marathi: {
      title: string;
      role: string;
      text: string;
      duration: string;
    };
  };
}

const DESTINATIONS: TourDestination[] = [
  {
    id: "shaniwar_wada",
    name: "Shaniwar Wada Palace",
    location: "Pune, Maharashtra",
    image: "🕌",
    category: "Heritage",
    narrations: {
      English: {
        title: "The Peshwas' Fortified Stronghold",
        role: "Mughal & Maratha Historian",
        text: "Welcome to Shaniwar Wada, the majestic seven-story stone palace of the Maratha Empire. Built in 1732 by Peshwa Baji Rao I, this fortress was once the nerve center of Indian politics. As you walk through the heavy Dilli Darwaza, look up at the iron spikes designed to repel enemy elephants. Listen closely to the rustle of the leaves—legend says that on full moon nights, the tragic cry of 'Kaka, mala vachva' still echoes through the ruins.",
        duration: "2 min 15s"
      },
      Hindi: {
        title: "पेशवाओं का अभेद्य किला",
        role: "शाही मार्गदर्शक",
        text: "शनिवार वाड़ा में आपका स्वागत है, जो मराठा साम्राज्य का सात मंजिला भव्य किला है। १७३२ में महान पेशवा बाजीराव प्रथम द्वारा निर्मित, यह किला राजनीति का मुख्य केंद्र था। जैसे ही आप मुख्य दिल्ली दरवाज़े से प्रवेश करते हैं, इसके भारी नुकीले लोहे के कीलों को देखें, जो हाथियों के हमले को रोकने के लिए बनाए गए थे। कहा जाता है कि आज भी पूर्णिमा की रातों में नारायणराव की आत्मा की पुकार सुनाई देती है।",
        duration: "2 min 45s"
      },
      Marathi: {
        title: "थोरल्या पेशव्यांचा शनिवार वाडा",
        role: "इतिहासकार आणि संशोधक",
        text: "नमस्कार, शनिवार वाड्यात आपले सहर्ष स्वागत! थोरले बाजीराव पेशवे यांनी १७३२ मध्ये या ऐतिहासिक वास्तूची पायाभरणी केली. मराठा साम्राज्याच्या वैभवाची आणि पराक्रमाची साक्ष देणारा हा वाडा एकेकाळी संपूर्ण हिंदुस्थानच्या राजकारणाचे केंद्र होता. दिल्ली दरवाजातून आत जाताना, हत्तींना रोखण्यासाठी बसवलेले अणकुचीदार खिळे तुमचे लक्ष वेधून घेतात. इतिहासाची पाने उलटताना, येथील प्रत्येक भिंत आपल्याला मराठ्यांच्या पराक्रमाची गाथा सांगते.",
        duration: "2 min 30s"
      }
    }
  },
  {
    id: "taj_mahal",
    name: "Taj Mahal",
    location: "Agra, Uttar Pradesh",
    image: "🕌",
    category: "Heritage",
    narrations: {
      English: {
        title: "The Monument of Eternal Love",
        role: "Archeological Guide",
        text: "Standing before the Taj Mahal, you are looking at the finest example of Mughal architecture in the world. Commissioned in 1632 by Emperor Shah Jahan in memory of his beloved wife Mumtaz Mahal, it took 20,000 artisans over 22 years to complete. The pristine white marble was brought from Makrana and is inlaid with precious stones like Lapis Lazuli and Jade. Notice how the monument changes color with the rising sun, turning from a soft pink to a radiant golden-white.",
        duration: "3 min 10s"
      },
      Hindi: {
        title: "शाश्वत प्रेम का प्रतीक - ताज महल",
        role: "पुरातात्विक विशेषज्ञ",
        text: "ताजमहल के सामने खड़े होकर आप दुनिया की सबसे बेहतरीन वास्तुकला को देख रहे हैं। मुगल सम्राट शाहजहां ने अपनी बेगम मुमताज महल की याद में १६३२ में इसका निर्माण शुरू करवाया था। मकराना के बेहतरीन सफेद संगमरमर से बने इस स्मारक को पूरा करने में २० हजार से अधिक कारीगरों को २२ साल लगे। सुबह की पहली किरण इस पर पड़ते ही इसका रंग हल्का गुलाबी दिखाई देता है, जो दोपहर तक चमकदार सफेद हो जाता है।",
        duration: "3 min 40s"
      },
      Marathi: {
        title: "अमर प्रेमाचे प्रतीक - ताज महाल",
        role: "कला आणि वास्तू अभ्यासक",
        text: "जगातील सात आश्चर्यांपैकी एक असलेल्या ताज महालासमोर तुमचे स्वागत आहे. मुघल सम्राट शाहजहान यांनी आपली प्रिय बेगम मुमताज महाल हिच्या स्मृतीप्रित्यर्थ १६३२ मध्ये हा देखणा महाल बांधायला घेतला. संगमरवरी दगडात कोरलेले हे काव्यात्मक शिल्प पूर्ण करण्यासाठी २०,००० कारागिरांना तब्बल २२ वर्षे लागली. मकरानाहून आणलेला पांढरा शुभ्र संगमरवर आणि त्यात जडवलेली मौल्यवान रत्ने आजही पाहणाऱ्याला थक्क करतात.",
        duration: "3 min 25s"
      }
    }
  },
  {
    id: "gateway_india",
    name: "Gateway of India",
    location: "Mumbai, Maharashtra",
    image: "🌉",
    category: "Heritage",
    narrations: {
      English: {
        title: "The Portal of Empires",
        role: "Maritime Guide",
        text: "Rising over the Arabian Sea, the Gateway of India isMumbai's most iconic arch. Erected in 1924 to commemorate the landing of King George V and Queen Mary, it blends Hindu-Saracenic architectural styles with local Gujarati elements. Ironically, this symbol of British power also witnessed its end—it was from here that the last British troops departed India in 1948. Feel the cool sea breeze and listen to the waves lapping against the stone harbor.",
        duration: "2 min 00s"
      },
      Hindi: {
        title: "मुंबई का मुख्य द्वार - गेटवे ऑफ इंडिया",
        role: "स्थानीय इतिहासकार",
        text: "अरब सागर के तट पर खड़ा गेटवे ऑफ इंडिया मुंबई की सबसे प्रसिद्ध पहचान है। ब्रिटिश किंग जॉर्ज पंचम के आगमन की स्मृति में १९२४ में इसका निर्माण किया गया था। यह वास्तुकला हिंदू और इस्लामी शैलियों का एक अनूठा संगम है। दिलचस्प बात यह है कि ब्रिटिश सत्ता के इस प्रतीक मार्ग से ही १९४८ में आखिरी ब्रिटिश सेना भारत से विदा हुई थी।",
        duration: "2 min 20s"
      },
      Marathi: {
        title: "मुंबईचे प्रवेशद्वार - गेटवे ऑफ इंडिया",
        role: "सागरी इतिहास संशोधक",
        text: "अरबी समुद्राच्या लाटांवर स्वार असलेले गेटवे ऑफ इंडिया हे मुंबईचे सर्वात मोठे वैभव आहे. १९२४ मध्ये ब्रिटिश सम्राट जॉर्ज पाचवे आणि राणी मेरी यांच्या स्वागतासाठी हे भव्य प्रवेशद्वार उभारण्यात आले. इंडो-सारसेनिक वास्तुकलेचा हा एक अप्रतिम नमुना आहे. याच ऐतिहासिक प्रवेशद्वारातून १९४८ मध्ये ब्रिटिश सैन्याची शेवटची तुकडी मायदेशी रवाना झाली होती, ज्यामुळे भारताच्या स्वातंत्र्यलढ्यात या वास्तूला विशेष महत्त्व आहे.",
        duration: "2 min 10s"
      }
    }
  },
  {
    id: "ellora_caves",
    name: "Kailash Temple (Ellora Caves)",
    location: "Sambhaji Nagar, Maharashtra",
    image: "⛰️",
    category: "Spiritual",
    narrations: {
      English: {
        title: "The Monolithic Engineering Marvel",
        role: "Mystic Archaeologist",
        text: "You are standing before Cave 16: the Kailash Temple. This is not built; it was carved out of a single solid basalt cliff from the top down. Built in the 8th century by the Rashtrakuta King Krishna I, it is the largest monolithic rock excavation in the world. Over 400,000 tons of rock were carefully chiseled away with absolute geometric precision. Think about the sculptors who started at the peak of the mountain and worked their way down, carving massive stone pillars, halls, and intricate panels of gods and elephants.",
        duration: "3 min 30s"
      },
      Hindi: {
        title: "कैलाश मंदिर - एक ही चट्टान से तराशा गया चमत्कार",
        role: "धार्मिक मार्गदर्शक",
        text: "एलोरा की गुफा संख्या १६ यानी कैलाश मंदिर में आपका स्वागत है। इसे पत्थरों को जोड़कर नहीं बनाया गया, बल्कि पूरे पहाड़ को ऊपर से नीचे की ओर तराश कर निकाला गया है। आठवीं शताब्दी में राष्ट्रकूट राजा कृष्ण प्रथम द्वारा निर्मित यह मंदिर दुनिया का सबसे बड़ा एकाश्म (monolithic) रॉक-कट स्थापत्य है। ४ लाख टन से अधिक बेसाल्ट चट्टान को सावधानीपूर्वक तराशा गया ताकि यह अदभुत मंदिर आकार ले सके।",
        duration: "4 min 05s"
      },
      Marathi: {
        title: "कैलास मंदिर - अद्भूत अखंड पाषाण शिल्प",
        role: "प्राचीन संस्कृती अभ्यासक",
        text: "वेरूळ येथील १६ क्रमांकाच्या गुहेत असलेल्या जगप्रसिद्ध कैलास मंदिरासमोर आपले स्वागत आहे. हे मंदिर कोणत्याही विटा किंवा दगड जोडून बांधलेले नसून, एका अखंड काळ्या पाषाणाच्या डोंगराला वरून खाली अशा उलट दिशेने कोरून तयार केले आहे. ८ व्या शतकात राष्ट्रकूट राजा कृष्ण प्रथम याने याचे निर्माण केले. ४ लाख टन वजनाचा कठीण दगड केवळ छिन्नी आणि हातोड्याच्या साहाय्याने कोरून हे अफाट शिल्प साकारले आहे. हे मानवी इतिहासातील एक अद्भुत स्थापत्य आश्चर्य आहे.",
        duration: "3 min 50s"
      }
    }
  }
];

const VOICE_STYLES = [
  { id: "historian", label: "📜 Mystic Historian", pitch: 0.85, rate: 0.9, ambient: "monastery" },
  { id: "guide", label: "🎒 Energetic Local", pitch: 1.05, rate: 1.0, ambient: "bazaar" },
  { id: "calm", label: "🧘 Calm Narrator", pitch: 0.95, rate: 0.85, ambient: "wind" }
];

const AMBIENTS = {
  none: { label: "🔇 Silent Background", icon: VolumeX },
  monastery: { label: "🪔 Sitar Drone", icon: Radio, frequency: 146.8 }, // D3 note drone
  bazaar: { label: "🍛 Temple Bells & Ambient Drone", icon: Volume2, frequency: 220 }, // A3 note drone
  wind: { label: "🏔️ Soft Mountain Wind Sim", icon: Sparkles, frequency: 110 } // A2 drone
};

export default function AIVoiceGuide() {
  const [activeDest, setActiveDest] = useState<TourDestination>(DESTINATIONS[0]);
  const [lang, setLang] = useState<"English" | "Hindi" | "Marathi">("English");
  const [voiceStyle, setVoiceStyle] = useState(VOICE_STYLES[1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [ambientSound, setAmbientSound] = useState<keyof typeof AMBIENTS>("none");
  const [interactiveQuery, setInteractiveQuery] = useState("");
  const [conciergeResponse, setConciergeResponse] = useState<string | null>(null);
  const [isSynthesizingConcierge, setIsSynthesizingConcierge] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeVoice, setActiveVoice] = useState<SpeechSynthesisVoice | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerRef = useRef<any>(null);
  const currentCharIndexRef = useRef(0);

  // Check speech synthesis support on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setSpeechSupported(true);
      const loadVoices = () => {
        const allVoices = window.speechSynthesis.getVoices();
        // Try to match Marathi voice for Marathi, Hindi for Hindi, etc.
        const defaultVoice = allVoices.find(v => v.lang.includes("IN")) || allVoices[0];
        if (defaultVoice) {
          setActiveVoice(defaultVoice);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Update speech synthesis speech parameters when settings change
  const stopSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSpeech = () => {
    if (!speechSupported) {
      // Simulate reading with timer
      if (isPlaying) {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setIsPlaying(true);
        startTextProgressSimulator();
      }
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        window.speechSynthesis.cancel();
        
        const textToSpeak = activeDest.narrations[lang].text;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Find suitable voice
        const allVoices = window.speechSynthesis.getVoices();
        let targetVoice = null;
        if (lang === "Marathi") {
          targetVoice = allVoices.find(v => v.lang === "mr-IN") || allVoices.find(v => v.lang.startsWith("mr"));
        } else if (lang === "Hindi") {
          targetVoice = allVoices.find(v => v.lang === "hi-IN") || allVoices.find(v => v.lang.startsWith("hi"));
        } else {
          targetVoice = allVoices.find(v => v.lang === "en-IN") || allVoices.find(v => v.lang.startsWith("en"));
        }
        
        if (targetVoice) {
          utterance.voice = targetVoice;
        }

        utterance.pitch = voiceStyle.pitch;
        utterance.rate = voiceStyle.rate * playbackSpeed;
        
        utterance.onend = () => {
          setIsPlaying(false);
          setProgress(100);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
        };

        // Track text character progress roughly
        let totalLength = textToSpeak.length;
        currentCharIndexRef.current = 0;
        
        utterance.onboundary = (event) => {
          if (event.name === "word") {
            const ratio = (event.charIndex / totalLength) * 100;
            setProgress(Math.min(99, Math.round(ratio)));
          }
        };

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  const startTextProgressSimulator = () => {
    setProgress(0);
    const textLength = activeDest.narrations[lang].text.length;
    const intervalTime = 120 / playbackSpeed; // MS per character approx
    let currentPos = 0;
    
    timerRef.current = setInterval(() => {
      currentPos += 3;
      if (currentPos >= textLength) {
        setProgress(100);
        setIsPlaying(false);
        clearInterval(timerRef.current);
      } else {
        setProgress(Math.round((currentPos / textLength) * 100));
      }
    }, intervalTime);
  };

  // Synthesize custom ambient background drone to demonstrate deep tech capabilities
  const toggleAmbientSound = (ambientId: keyof typeof AMBIENTS) => {
    setAmbientSound(ambientId);
    
    if (ambientId === "none") {
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {}
        oscillatorRef.current = null;
      }
      return;
    }

    try {
      // Lazy initialize web audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch {}
      }

      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft triangle/sine drone wave for meditative travel experience
      osc.type = "sine"; 
      osc.frequency.setValueAtTime(AMBIENTS[ambientId].frequency, ctx.currentTime);

      // Low volume ambient gain
      gain.gain.setValueAtTime(0.015, ctx.currentTime);

      // Simple low pass filter to make it cozy
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn("Web Audio API not fully initialized or supported inside container: ", e);
    }
  };

  // Turn off synthesis on navigate away
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleInteractiveAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactiveQuery.trim()) return;

    setIsSynthesizingConcierge(true);
    setConciergeResponse(null);

    // AI Concierge answering Marathi/Hindi query using simulated local knowledge base with multilingual prompt
    setTimeout(() => {
      let answer = "";
      const queryLower = interactiveQuery.toLowerCase();
      
      if (lang === "Marathi") {
        if (queryLower.includes("तिकीट") || queryLower.includes("ticket") || queryLower.includes("प्रवेश")) {
          answer = `शनिवार वाड्याचे प्रवेश तिकीट भारतीयांसाठी फक्त ₹२५ आहे, तर परदेशी पर्यटकांसाठी ₹३०० आहे. संध्याकाळी होणाऱ्या लाईट अँड साऊंड शो चे तिकीट स्वतंत्रपणे ₹५० ला मिळते.`;
        } else if (queryLower.includes("वेळ") || queryLower.includes("time")) {
          answer = `शनिवार वाडा सकाळी ८:०० ते संध्याकाळी ६:३० वाजेपर्यंत पर्यटकांसाठी खुला असतो. संध्याकाळी ६:०० वाजता शेवटचे प्रवेश तिकीट मिळते.`;
        } else {
          answer = `नक्कीच! तुमच्या "${interactiveQuery}" या प्रश्नाबद्दल माहिती अशी की, या वास्तूच्या गुप्त तळघरामध्ये पेशवेकालीन खजिना आणि जुनी कागदपत्रे लपवली गेली होती, जी १७९० च्या महाभयंकर आगीत नष्ट झाली असावी असा इतिहासकारांचा अंदाज आहे.`;
        }
      } else if (lang === "Hindi") {
        if (queryLower.includes("टिकट") || queryLower.includes("ticket") || queryLower.includes("प्रवेश")) {
          answer = `शनिवार वाड़ा का प्रवेश टिकट भारतीय नागरिकों के लिए मात्र ₹२५ है। विदेशी पर्यटकों के लिए यह ₹३०० है। शाम के लाइट एंड साउंड शो का शुल्क ₹५० अलग से देय है।`;
        } else if (queryLower.includes("समय") || queryLower.includes("time")) {
          answer = `शनिवार वाड़ा हर दिन सुबह ८:०० बजे से शाम ६:३० बजे तक पर्यटकों के लिए खुला रहता है। शाम का साउंड शो हिंदी और मराठी में होता है।`;
        } else {
          answer = `आपके प्रश्न "${interactiveQuery}" के संदर्भ में, शनिवार वाड़ा का मुख्य आकर्षण पाँच विशाल द्वार हैं, जिनमें 'दिल्ली दरवाज़ा' सबसे प्रमुख है। इसके अलावा मस्तानी महल के अवशेष भी यहाँ देखे जा सकते हैं।`;
        }
      } else {
        if (queryLower.includes("ticket") || queryLower.includes("price") || queryLower.includes("entry")) {
          answer = `For Shaniwar Wada, the entry fee is ₹25 for Indian nationals and ₹300 for foreign tourists. The legendary evening Light & Sound show tickets are priced at ₹50.`;
        } else if (queryLower.includes("time") || queryLower.includes("open") || queryLower.includes("schedule")) {
          answer = `It is open daily from 8:00 AM to 6:30 PM. The best time to visit is during sunset around 5:30 PM so you can stay back for the historical Light and Sound show.`;
        } else {
          answer = `Fascinating question! Regarding "${interactiveQuery}": Legend holds that the fortified palace complex once housed a majestic lotus fountain inside, which had sixteen petals, each feeding a beautifully pressurized stream of rose water!`;
        }
      }

      setConciergeResponse(answer);
      setIsSynthesizingConcierge(false);
      setInteractiveQuery("");

      // Automatically speak the concierge answer
      if (speechSupported) {
        window.speechSynthesis.cancel();
        const conciergeUtterance = new SpeechSynthesisUtterance(answer);
        
        const allVoices = window.speechSynthesis.getVoices();
        let targetVoice = null;
        if (lang === "Marathi") {
          targetVoice = allVoices.find(v => v.lang === "mr-IN") || allVoices.find(v => v.lang.startsWith("mr"));
        } else if (lang === "Hindi") {
          targetVoice = allVoices.find(v => v.lang === "hi-IN") || allVoices.find(v => v.lang.startsWith("hi"));
        } else {
          targetVoice = allVoices.find(v => v.lang === "en-IN") || allVoices.find(v => v.lang.startsWith("en"));
        }
        
        if (targetVoice) conciergeUtterance.voice = targetVoice;
        conciergeUtterance.pitch = voiceStyle.pitch;
        conciergeUtterance.rate = voiceStyle.rate;
        window.speechSynthesis.speak(conciergeUtterance);
      }
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-[#0B0F2B] border border-gray-100 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-xl text-left space-y-8">
      
      {/* Top Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800/60 pb-6">
        <div>
          <span className="bg-blue-50 dark:bg-[#1E90FF]/15 text-[#1E90FF] font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Headset size={12} className="animate-bounce" />
            USP FEATURE #1: PREMIUM MULTILINGUAL AUDIO GUIDE
          </span>
          <h3 className="text-2xl md:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight mt-2 flex items-center gap-2">
            AI Swadesh Audio Guide & Concierge
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-2xl font-semibold">
            Listen to realistic historical narrations in your regional language. Adjust narration style, speed, and query local secrets in real-time.
          </p>
        </div>

        {/* Quick Language Toggle */}
        <div className="flex bg-gray-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800/80 gap-1 w-fit shrink-0 self-start md:self-center">
          {(["English", "Hindi", "Marathi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => {
                stopSpeech();
                setLang(l);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                lang === l 
                  ? "bg-[#1E90FF] text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              {l === "English" && "🇺🇸 EN"}
              {l === "Hindi" && "🇮🇳 HI"}
              {l === "Marathi" && "🚩 MR"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Selector & Immersive Audio Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Destination Selector List */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 font-mono">
            Select Historical Monument
          </h4>
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {DESTINATIONS.map((dest) => (
              <button
                key={dest.id}
                onClick={() => {
                  stopSpeech();
                  setActiveDest(dest);
                  setProgress(0);
                  setConciergeResponse(null);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left group cursor-pointer ${
                  activeDest.id === dest.id
                    ? "bg-gradient-to-r from-blue-50/80 to-indigo-50/30 dark:from-[#1E90FF]/10 dark:to-transparent border-[#1E90FF]/40 shadow-sm"
                    : "bg-white dark:bg-[#070A21] border-gray-100 dark:border-slate-800/40 hover:border-gray-200 dark:hover:border-slate-700/50"
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${
                  activeDest.id === dest.id
                    ? "bg-[#1E90FF] text-white scale-110 rotate-3"
                    : "bg-gray-50 dark:bg-slate-900 text-gray-500 group-hover:scale-105"
                }`}>
                  {dest.image}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] uppercase font-extrabold tracking-widest ${
                    activeDest.id === dest.id ? "text-[#1E90FF]" : "text-gray-400"
                  }`}>
                    {dest.category} • {dest.narrations[lang].duration}
                  </span>
                  <h5 className="font-black text-sm text-gray-800 dark:text-slate-200 leading-snug truncate group-hover:text-[#1E90FF] transition-colors">
                    {dest.name}
                  </h5>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 font-semibold">
                    <MapPin size={10} /> {dest.location}
                  </p>
                </div>
                <ChevronRight size={14} className={`text-gray-300 group-hover:translate-x-1 transition-transform ${
                  activeDest.id === dest.id && "text-[#1E90FF] translate-x-1"
                }`} />
              </button>
            ))}
          </div>

          {/* Quick Sound settings block */}
          <div className="bg-gray-50/50 dark:bg-slate-900/40 rounded-3xl p-4 border border-gray-100 dark:border-slate-800/40 space-y-3">
            <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 font-mono">
              <Settings size={12} /> Live Ambient Soundscape
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AMBIENTS) as Array<keyof typeof AMBIENTS>).map((ambKey) => {
                const amb = AMBIENTS[ambKey];
                const Icon = amb.icon;
                return (
                  <button
                    key={ambKey}
                    onClick={() => toggleAmbientSound(ambKey)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 cursor-pointer ${
                      ambientSound === ambKey
                        ? "bg-[#1E90FF]/15 border-[#1E90FF]/30 text-[#1E90FF] border"
                        : "bg-white dark:bg-[#070A21] border border-gray-100 dark:border-slate-800/50 text-gray-500 hover:text-gray-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={12} />
                    <span className="truncate">{amb.label.split(" ").slice(1).join(" ") || "Silent"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Simulated High-tech Media Player */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-gray-50 dark:bg-[#070A21] rounded-[2rem] border border-gray-100 dark:border-slate-800/60 p-6 md:p-8 space-y-6 relative overflow-hidden">
          
          {/* Wave animation absolute overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E90FF]/5 rounded-full filter blur-xl pointer-events-none" />
          
          {/* Destination Header card */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#1E90FF] bg-blue-100/40 dark:bg-[#1E90FF]/10 px-2.5 py-1 rounded-md">
                {activeDest.category} Guide
              </span>
              <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1 leading-none">
                {activeDest.name}
              </h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1 font-semibold">
                <MapPin size={11} /> {activeDest.location}
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-mono font-extrabold text-[#1E90FF] bg-sky-100/50 dark:bg-sky-500/10 px-2 py-1 rounded-md">
                {activeDest.narrations[lang].duration}
              </span>
            </div>
          </div>

          {/* Interactive Narration block */}
          <div className="bg-white dark:bg-[#090C25] rounded-3xl p-5 border border-gray-100 dark:border-slate-800/40 min-h-[140px] flex flex-col justify-between relative group">
            
            {/* Soft waveform simulation in background */}
            <div className="absolute bottom-2 left-4 right-4 flex items-end gap-1 h-12 opacity-15 pointer-events-none">
              {Array.from({ length: 42 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-[#1E90FF] to-indigo-500 rounded-t"
                  animate={{
                    height: isPlaying 
                      ? [
                          Math.sin(i * 0.3) * 20 + 24, 
                          Math.cos(i * 0.5) * 15 + 20, 
                          Math.sin(i * 0.7) * 30 + 15,
                          Math.sin(i * 0.3) * 20 + 24
                        ] 
                      : 6
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.02
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs text-[#1E90FF] font-black font-mono">
                <Mic size={12} className="animate-pulse" />
                <span>NARRATOR: {activeDest.narrations[lang].role}</span>
              </div>
              <h5 className="font-extrabold text-sm text-gray-800 dark:text-slate-100 mt-1">
                "{activeDest.narrations[lang].title}"
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mt-2 line-clamp-4 font-semibold italic">
                {activeDest.narrations[lang].text}
              </p>
            </div>

            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold font-mono mt-4 relative z-10 flex items-center justify-between border-t border-gray-50 dark:border-slate-800/40 pt-3">
              <span>Playing in {lang}</span>
              {speechSupported ? (
                <span className="text-emerald-500 flex items-center gap-1 font-extrabold">● WebTTS Connected</span>
              ) : (
                <span className="text-amber-500 flex items-center gap-1 font-extrabold">▲ Voice Engine Simulated</span>
              )}
            </div>
          </div>

          {/* Player Media Controls */}
          <div className="space-y-4">
            
            {/* Progress Bar with smooth drag simulation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono font-black text-gray-400">
                <span>{isPlaying ? `${progress}% Played` : "Ready"}</span>
                <span>{activeDest.narrations[lang].duration}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden relative cursor-pointer group/progress">
                <div 
                  className="h-full bg-gradient-to-r from-[#1E90FF] to-indigo-500 rounded-full transition-all duration-300 relative" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#1E90FF] rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md" />
                </div>
              </div>
            </div>

            {/* Media buttons, speed controls, styles */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#090C25] rounded-3xl p-3 border border-gray-100 dark:border-slate-800/40">
              
              {/* Play / pause round button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSpeech}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 cursor-pointer ${
                    isPlaying 
                      ? "bg-gradient-to-r from-[#000080] to-[#1E90FF] hover:opacity-90" 
                      : "bg-[#1E90FF] hover:bg-blue-600"
                  }`}
                >
                  {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                
                <button
                  onClick={() => {
                    stopSpeech();
                    setProgress(0);
                  }}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center justify-center transition-all cursor-pointer"
                  title="Reset Guide"
                >
                  <SkipForward size={14} className="rotate-180" />
                </button>
              </div>

              {/* Narrator Tone selector dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold text-gray-400 dark:text-gray-500">Tone:</span>
                <select
                  value={voiceStyle.id}
                  onChange={(e) => {
                    stopSpeech();
                    const style = VOICE_STYLES.find(v => v.id === e.target.value) || VOICE_STYLES[1];
                    setVoiceStyle(style);
                    if (style.ambient && ambientSound !== "none") {
                      toggleAmbientSound(style.ambient as any);
                    }
                  }}
                  className="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-black text-gray-600 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {VOICE_STYLES.map((style) => (
                    <option key={style.id} value={style.id}>{style.label}</option>
                  ))}
                </select>
              </div>

              {/* Playback speed multiplier buttons */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900 p-1 rounded-xl border border-gray-100 dark:border-slate-800/50 gap-0.5">
                {([0.8, 1.0, 1.25, 1.5] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      stopSpeech();
                      setPlaybackSpeed(spd);
                    }}
                    className={`px-2 py-1 rounded-lg text-[9px] font-mono font-extrabold transition-all cursor-pointer ${
                      playbackSpeed === spd 
                        ? "bg-[#1E90FF] text-white" 
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Interactive AI Ask-Me-Anything: Live Local Concierge */}
          <div className="bg-white dark:bg-[#090C25] rounded-3xl p-4 border border-gray-100 dark:border-slate-800/40 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-700 dark:text-slate-200">
              <Sparkles size={14} className="text-[#1E90FF] animate-pulse" />
              <span>Ask the Monument's Local Guide (Marathi/Hindi/English)</span>
            </div>
            
            <form onSubmit={handleInteractiveAsk} className="flex gap-2">
              <input
                type="text"
                value={interactiveQuery}
                onChange={(e) => setInteractiveQuery(e.target.value)}
                placeholder={
                  lang === "Marathi" 
                    ? "उदा. शनिवार वाड्याचे तिकीट किती आहे?" 
                    : lang === "Hindi"
                      ? "उदा. शनिवार वाड़ा कितने बजे खुलता है?"
                      : "e.g. When does it open or how much are tickets?"
                }
                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1E90FF] text-gray-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={isSynthesizingConcierge}
                className="bg-[#1E90FF] hover:bg-blue-600 text-white font-black text-xs px-4 py-2 rounded-2xl flex items-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                {isSynthesizingConcierge ? "Asking..." : "Ask Voice"}
              </button>
            </form>

            {/* AI Assistant Audio Answer Box */}
            <AnimatePresence>
              {conciergeResponse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-blue-50/60 dark:bg-[#1E90FF]/5 p-3.5 rounded-2xl border border-blue-100/40 dark:border-[#1E90FF]/10 text-xs text-gray-700 dark:text-slate-300 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-[#1E90FF] uppercase text-[9px] tracking-widest">
                      🎙️ Audio Response
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined" && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                          const voiceAnswer = new SpeechSynthesisUtterance(conciergeResponse);
                          const allVoices = window.speechSynthesis.getVoices();
                          let targetVoice = null;
                          if (lang === "Marathi") {
                            targetVoice = allVoices.find(v => v.lang === "mr-IN") || allVoices.find(v => v.lang.startsWith("mr"));
                          } else if (lang === "Hindi") {
                            targetVoice = allVoices.find(v => v.lang === "hi-IN") || allVoices.find(v => v.lang.startsWith("hi"));
                          } else {
                            targetVoice = allVoices.find(v => v.lang === "en-IN") || allVoices.find(v => v.lang.startsWith("en"));
                          }
                          if (targetVoice) voiceAnswer.voice = targetVoice;
                          voiceAnswer.pitch = voiceStyle.pitch;
                          voiceAnswer.rate = voiceStyle.rate;
                          window.speechSynthesis.speak(voiceAnswer);
                        }
                      }}
                      className="text-[#1E90FF] font-black text-[9px] hover:underline"
                    >
                      Replay Voice
                    </button>
                  </div>
                  <p className="font-semibold leading-relaxed">{conciergeResponse}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
