export const careTranslations: Record<string, {
  title: string;
  category: string;
  urgency: string;
  summary: string;
  symptoms: string[];
  firstSteps: string[];
  avoid: string[];
  observe: string[];
  diagnoseWhen: string[];
  nextStep: string;
  keywords: string[];
  _srcHash?: string;
}> = {
  "guide_new_fish_acclimation": {
    "title": "New Fish Acclimation",
    "category": "Fish Abnormalities",
    "urgency": "High Priority",
    "summary": "Temperature and water adjustment (acclimation) workflow before introducing newly purchased fish, shrimp, or other aquatic life into the tank.",
    "symptoms": [
      "New fish packed in a plastic bag with a temperature different from the tank's.",
      "New fish experienced long-distance transport, causing high stress and weakness.",
      "The bag water contains substantial waste and bacteria, making it contaminated."
    ],
    "firstSteps": [
      "Step 1: Floating (Temperature Alignment) - Place the unopened bag directly onto the tank water for 20-30 minutes to equalize temperatures.",
      "Step 2: Mixing Water (Water Parameters Adaptation) - Open the bag, scoop a small amount of tank water into it every 5-10 minutes. Repeat 3-4 times to let fish adapt to pH and hardness.",
      "Step 3: Transfer Fish Only - Use a net to transfer the new fish into the tank. Discard all the dirty water in the bag; never pour it into the main tank."
    ],
    "avoid": [
      "Do not pour the dirty bag water together with the new fish directly into the aquarium.",
      "Do not release the fish immediately after opening the bag. Sudden temperature or pH shifts can cause shock or death.",
      "Do not turn on bright lights during water mixing and initial release. Keep the environment quiet to reduce panic and stress."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, place new fish in a quarantine tank for 3-7 days. Cohouse them in the main tank only after verifying no signs of disease."
    ],
    "nextStep": "Next, place new fish in a quarantine tank for 3-7 days. Cohouse them in the main tank only after verifying no signs of disease.",
    "keywords": [
      "Acclimation",
      "Routine",
      "Quarantine"
    ]
  },
  "guide_water_deteriorate": {
    "title": "What to Do When Water Quality Deteriorates",
    "category": "Water Quality Problems",
    "urgency": "High Priority",
    "summary": "Quick troubleshooting for issues like fish gasping at the surface, cloudy water, foul odor, or sudden bottom lethargy.",
    "symptoms": [
      "Water turns cloudy, whitish, or greenish.",
      "Fish are gasping at the surface, swimming frantically, or sitting on the bottom.",
      "A noticeable fishy or foul smell from the tank.",
      "Filter media is heavily soiled or overfeeding occurred recently."
    ],
    "firstSteps": [
      "Stop feeding for 12-24 hours.",
      "Perform small, frequent water changes (20%-30% each time) with treated water.",
      "Check if the filter is outletting water normally.",
      "Increase aeration/oxygenation and observe fish breathing patterns."
    ],
    "avoid": [
      "Do not perform a 100% water change.",
      "Do not add large amounts of medication and clean filter media at the same time.",
      "Do not rinse filter media directly under tap water."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, provide measurements for Ammonia, Nitrite, pH, and Temperature. The system can then determine if it is a nitrifying crash, oxygen depletion, or organic overload."
    ],
    "nextStep": "Next, provide measurements for Ammonia, Nitrite, pH, and Temperature. The system can then determine if it is a nitrifying crash, oxygen depletion, or organic overload.",
    "keywords": [
      "Water Quality",
      "High Priority"
    ]
  },
  "guide_pregnant_care": {
    "title": "Pregnant Fish Care",
    "category": "Pregnancy / Fry",
    "urgency": "High Priority",
    "summary": "Prenatal and postnatal care for livebearing fish like Guppies, Mollies, Platies, etc.",
    "symptoms": [
      "Female's belly is heavily swollen, showing a boxy/square shape from the side or top ('square butt').",
      "A dark black or deep red 'gravid spot' appears near the female's vent.",
      "Female isolates herself, hiding in corners, plants, or behind the heater.",
      "Rapid breathing; chases off or exhibits aggression toward approaching males."
    ],
    "firstSteps": [
      "Gently transfer the pregnant female to the upper compartment of a double-layer breeding box using a net.",
      "Add a small amount of moss or floating plants to the breeding box to provide cover and a sense of security.",
      "Once birth is complete (belly looks noticeably deflated), return the female to the main tank or a separate resting tank immediately.",
      "Isolate the post-birth female for 1-2 days, feeding nutritious live foods like baby brine shrimp to restore her energy."
    ],
    "avoid": [
      "Do not leave the pregnant female to give birth in a large community tank without hides; the fry will be eaten quickly.",
      "Do not keep the female and fry in the same compartment post-birth; a hungry female will consume her own fry.",
      "Avoid strong water currents or bright lights during birth to prevent stress-induced miscarriages."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, observe if the fry are swimming horizontally, and prepare baby brine shrimp or egg yolk water for their first feeding 24 hours after birth."
    ],
    "nextStep": "Next, observe if the fry are swimming horizontally, and prepare baby brine shrimp or egg yolk water for their first feeding 24 hours after birth.",
    "keywords": [
      "Breeding",
      "Urgent"
    ]
  },
  "guide_fry_care": {
    "title": "Fry Care",
    "category": "Pregnancy / Fry",
    "urgency": "High Priority",
    "summary": "First feeding, temperature maintenance, hiding spots, and water change management for newborn fry.",
    "symptoms": [
      "Newborn fry are only a few millimeters long, tiny, and semi-transparent.",
      "Fry have a noticeable yolk sac under their bellies and swim unstable.",
      "Fry start swimming horizontally, searching for food (free-swimming stage).",
      "Filter intake has strong suction, which can suck in and kill tiny fry."
    ],
    "firstSteps": [
      "Do not feed the fry for the first 1-2 days as they rely on their yolk sacs for nutrition.",
      "Once the yolk sac disappears and fry swim freely, feed them tiny amounts of baby brine shrimp or egg yolk water.",
      "Cover the filter intake with a fine mesh or pantyhose to prevent fry from being sucked in.",
      "Use a dropper for localized waste removal, and add treated water of matching temperature slowly using a drip method."
    ],
    "avoid": [
      "Do not feed food particles that are too large or stale; fry cannot swallow them, and they quickly pollute the water.",
      "Do not perform large-volume or aggressive water changes; sudden temperature or water parameter shifts can cause mass mortality.",
      "Do not cohouse fry with adult fish; they must be isolated in a fry tank or breeding box."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, monitor the fry tank's water temperature (keep it constant at 24°C-26°C) and adjust food particle size as they grow."
    ],
    "nextStep": "Next, monitor the fry tank's water temperature (keep it constant at 24°C-26°C) and adjust food particle size as they grow.",
    "keywords": [
      "Fry",
      "Urgent"
    ]
  },
  "guide_safe_water_change": {
    "title": "How to Change Water Safely",
    "category": "Water Changes / Maintenance",
    "urgency": "High Priority",
    "summary": "Establish a consistent water change routine for beginners to minimize temperature shock, chlorine toxicity, and parameter swings.",
    "symptoms": [
      "Water eutrophication; fish waste, leftovers, and debris accumulate on the substrate.",
      "An oil film forms on the surface; water turns slightly yellow.",
      "It has been over a week since the last water change, and Nitrite/Nitrate test values are high."
    ],
    "firstSteps": [
      "Dechlorinate tap water by aging it in an open container under the sun for 24 hours prior to the water change.",
      "Measure new and old water temperatures before changing; ensure the temperature difference is within 1°C.",
      "Insert a siphon gravel vacuum into the substrate to suck out waste, limiting the volume changed to 20%-30%.",
      "Add new water slowly into the tank using a small hose (a drip method is ideal)."
    ],
    "avoid": [
      "Do not use fresh tap water directly; residual chlorine will burn fish gills and cause poisoning.",
      "Do not remove the fish to wash the gravel or scrub the tank; avoid aggressive cleanups that destroy the nitrifying system.",
      "Do not change a large portion of water (over 50%) at once, preventing parameter shock."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, add an appropriate amount of water conditioner after the change, and test water parameters 24 hours later to verify the effects."
    ],
    "nextStep": "Next, add an appropriate amount of water conditioner after the change, and test water parameters 24 hours later to verify the effects.",
    "keywords": [
      "Water Change",
      "Routine"
    ]
  },
  "guide_fish_death_action": {
    "title": "What to Do After a Fish Dies",
    "category": "Fish Abnormalities",
    "urgency": "High Priority",
    "summary": "Quarantine, inspection, and prevention of consecutive deaths after finding a dead fish.",
    "symptoms": [
      "A dead fish body is found at the bottom or in plants, turning pale or starting to decompose.",
      "Remaining fish show clamped fins, lethargy, loss of appetite, or body congestion.",
      "Water suddenly turns cloudy, accompanied by foul odor and bubbles on the surface.",
      "Ammonia or Nitrite levels surge abnormally after the fish's death."
    ],
    "firstSteps": [
      "Remove the dead fish immediately with a net to prevent decomposition and tankmates from feeding on it.",
      "Perform a 30% water change and clean the physical filter floss to quickly lower bacterial and organic levels.",
      "Test Ammonia and Nitrite levels to determine if poor water quality caused the death.",
      "Examine surviving fish closely for symptoms like white spots, fin rot, or pinecone scales."
    ],
    "avoid": [
      "Do not leave the dead fish in the tank; decaying bodies are severe sources of toxins and pathogens.",
      "Do not blindly dose the main tank with harsh medications before confirming the cause, preventing damage to beneficial bacteria.",
      "Do not ignore abnormalities in other fish; a single death is often a precursor to a disease outbreak."
    ],
    "observe": [],
    "diagnoseWhen": [
      "Next, if other fish exhibit symptoms, isolate them immediately in a quarantine tank for treatment, and perform mild physical disinfection on the main tank."
    ],
    "nextStep": "Next, if other fish exhibit symptoms, isolate them immediately in a quarantine tank for treatment, and perform mild physical disinfection on the main tank.",
    "keywords": [
      "Handling Death",
      "High Priority"
    ]
  },
  "qa_gen_001": {
    "title": "I just filled my new tank yesterday, and the water turned milky white. Will the fish die?",
    "category": "Water Quality Problems",
    "urgency": "Urgent",
    "summary": "This is a typical bloom of heterotrophic bacteria (milky water in a new tank). Keep the filter and aeration running; the water will clear up on its own in 3-5 days. Do not add fish yet.",
    "symptoms": [
      "New water has trace organic nutrients but no nitrifying bacteria, causing airborne bacteria to multiply rapidly and cloud the water. Once the nitrifying system is established, these bacteria will naturally recede as nutrients deplete."
    ],
    "firstSteps": [
      "Be patient. Do not perform frequent water changes, which disrupt the establishment of beneficial bacteria.",
      "Keep the filter and air pump running 24 hours a day.",
      "Add fish only after the water is completely clear and Ammonia and Nitrite test at 0."
    ],
    "avoid": [
      "Do not pour clearing agents into the tank or clean the tank frequently; this only extends the cloudy period and disrupts the cycling process."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Cycling",
      "Cloudy Water",
      "White Bloom"
    ]
  },
  "qa_gen_002": {
    "title": "I've only kept fish for two days, and Ammonia and Nitrite are off the charts. Fish are gasping and have red gills. What should I do?",
    "category": "Water Quality Problems",
    "urgency": "High Priority",
    "summary": "This is acute ammonia poisoning! Immediately change 30%-50% of the water (temp-matched, dechlorinated), and stop feeding until water parameters normalize.",
    "symptoms": [
      "The new tank's nitrifying system is not yet established. Fish waste and uneaten food release highly toxic ammonia, which cannot be converted into non-toxic nitrate, leading to gill burns and suffocation."
    ],
    "firstSteps": [
      "Siphon out dirty water from the bottom and replace it with temp-matched dechlorinated water.",
      "Stop feeding immediately to eliminate the source of ammonia.",
      "Add a water detoxifier (like Seachem Prime) to temporarily neutralize toxins, and add high-quality live nitrifying bacteria."
    ],
    "avoid": [
      "Do not wash the filter or filter media during this time, which would further damage the weak beneficial bacteria."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Ammonia Poisoning",
      "Nitrite",
      "Gasping Emergency"
    ]
  },
  "qa_gen_003": {
    "title": "There's a shiny film of oil floating on the water surface. Is it harmful? How did it get there?",
    "category": "Water Quality Problems",
    "urgency": "Urgent",
    "summary": "The oil film itself is not highly toxic, but it seals the water surface, blocking oxygen from dissolving and causing fish to suffocate. It must be cleared timely.",
    "symptoms": [
      "The oil film consists mainly of proteins and lipids from uneaten fish food, fish body mucus, and decomposing microalgae accumulating in stagnant areas."
    ],
    "firstSteps": [
      "Adjust the filter outlet or add an air stone to create surface agitation; water flow will break up and remove the film.",
      "Install a surface skimmer to automatically clear the oil film.",
      "In emergencies, place paper towels on the water surface to physically absorb and lift the oil."
    ],
    "avoid": [
      "Do not ignore the oil film! Persistent bubbles that don't pop and a fishy smell are warning signs of surface oxygen blockage."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Oil Film",
      "Dissolved Oxygen",
      "Surface Pollution"
    ]
  },
  "qa_gen_004": {
    "title": "Is 'soft water' and 'hardness (GH/KH)' really that important in fishkeeping?",
    "category": "Water Quality Problems",
    "urgency": "Urgent",
    "summary": "Hardness determines the survival quality of your livestock. Incorrect hardness causes tetras to deteriorate, shrimp to die during molting, snail shells to turn white and erode, and low KH causes pH crashes that trigger mass die-offs.",
    "symptoms": [
      "GH (General Hardness) represents calcium and magnesium concentrations, affecting osmotic pressure. KH (Carbonate Hardness) represents pH buffering capacity. Different species have entirely different requirements."
    ],
    "firstSteps": [
      "Soft water species (GH 0-4): Neon Tetras, Cardinal Tetras, Angelfish, Discus, Dwarf Cichlids.",
      "Hard water/alkaline species (GH 12+): Guppies, Mollies, African Cichlids, snails, cherry/crystal shrimp.",
      "If hardness is too low, add crushed coral or mineral salts. If too high, dilute tap water with RO water."
    ],
    "avoid": [
      "Do not house Neon Tetras (soft/acidic water) together with African Cichlids (hard/alkaline water). Hardness conflict is a major cause of chronic fish deaths."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Water Hardness",
      "GH",
      "KH",
      "Osmotic Pressure"
    ]
  },
  "qa_gen_005": {
    "title": "Can I use tap water directly from the faucet to keep fish? Will tap water kill them?",
    "category": "Water Quality Problems",
    "urgency": "High Priority",
    "summary": "Absolutely not! Residual chlorine in tap water burns fish gills, causing suffocation, and kills nitrifying bacteria in your filter media, crashing the cycle.",
    "symptoms": [
      "Tap water is treated with chlorine or chloramines for disinfection. Residual chlorine is highly oxidative and destructive to the delicate mucous membranes of aquatic organisms."
    ],
    "firstSteps": [
      "Aging water: Let tap water stand in an open container under direct sunlight for 24 hours or indoors for 2-3 days to let chlorine evaporate.",
      "Active aeration: Place an air stone connected to an air pump in the water bucket for 12 hours for quick, safe use.",
      "Use dechlorinator: For emergency water changes, add water conditioner according to dosage to instantly neutralize chlorine."
    ],
    "avoid": [
      "Do not spray tap water directly into the fish tank with a shower head. Tap water chlorine is a hidden killer of newly introduced fish."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Tap Water",
      "Dechlorinate",
      "Aging Water"
    ]
  },
  "qa_gen_006": {
    "title": "Can I pour cold water straight into the tank during water changes? Does temperature difference matter?",
    "category": "Water Quality Problems",
    "urgency": "Urgent",
    "summary": "Temperature shock is deadly! A sudden shift of over 2°C triggers severe stress, compromises immunity, and easily induces Ich (white spot disease), catching colds, or sudden shock.",
    "symptoms": [
      "Fish are cold-blooded ectotherms; their body temperature changes with the water. Temperature spikes or drops damage their nervous and circulatory systems and strip their slime coat."
    ],
    "firstSteps": [
      "Measure new and old water temperatures; ensure the difference is under 1°C (add a bit of hot water in winter).",
      "Add new water slowly. Use a small hose to slowly trickle water in, avoiding pouring directly onto the fish.",
      "Install a heater and thermometer to ensure stable, constant temperature."
    ],
    "avoid": [
      "Do not pour cold water straight into a tropical fish tank. Tropical fish (like Guppies and Tetras) require 24°C-26°C and hate temperature drops."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Temp Fluctuations",
      "Temperature Shock",
      "Ich/White Spot"
    ]
  },
  "qa_gen_007": {
    "title": "What rules must I follow to create a community tank? Can fish, shrimp, and snails just be mixed?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "Rules to follow: Size compatibility (big fish eat little fish), parameter compatibility (do not mix cold/tropical species), and temperament compatibility (avoid fin-nipping/aggressive species).",
    "symptoms": [
      "In the fish world, any smaller fish that fits in a larger fish's mouth is food. Territorial fish (like Tiger Barbs, Bettas) will nip at the fins of peaceful, long-finned species."
    ],
    "firstSteps": [
      "Space separation: Upper level (Guppies, Mollies), mid-level (Tetras, Angelfish), bottom level (Corydoras, Plecos).",
      "Temperament matching: Select peaceful schooling tetras as community tankmates.",
      "Verify that all species share similar pH, hardness, and temperature ranges before mixing."
    ],
    "avoid": [
      "Do not house Tiger Barbs with Guppies or Angelfish (Tiger Barbs will shred their fins); do not house large predatory fish (like Oscar fish) with tiny Tetras."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Community Tank",
      "Mixing Principles",
      "Space Layering"
    ]
  },
  "qa_gen_008": {
    "title": "Fish are chasing each other and nipping. How do I tell if they are fighting or courting?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "Courting involves males trailing females and displaying fins without inflicting wounds. Fighting is face-to-face jaw-locking, fin-shredding, and the submissive fish turning pale and hiding in corners.",
    "symptoms": [
      "Fish fight aggressively to secure food, establish territories, or gain breeding rights. Courting is a gentle display of colors to attract a mate."
    ],
    "firstSteps": [
      "Check for injuries: If the chased fish has torn fins, missing scales, or clamps its fins and sits in corners, isolate it immediately.",
      "Add hides: Place driftwood, rocks, or plants to break sightlines and give bullied fish space to rest.",
      "Schooling: For fin-nippers (like Tiger Barbs), keeping them in groups of 6-10 disperses aggression within the school."
    ],
    "avoid": [
      "Do not ignore bullied fish hiding in corners. Chronic stress leads to starvation, immune collapse, and rapid sickness or death."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Fish Behavior",
      "Territorial Chasing",
      "Courting Display"
    ]
  },
  "qa_gen_009": {
    "title": "Can fish, shrimp, snails, and crabs be kept together? Will they hurt each other?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "A clear predator-prey chain exists. Large crabs and crayfish will hunt sleeping fish at night; almost all medium-to-large fish eat baby shrimp; Pea Puffers and Cichlids are expert snail eaters.",
    "symptoms": [
      "Invertebrates like crayfish are opportunistic predators whose claws are lethal at night. Shrimp and snails are natural food for many predatory fish."
    ],
    "firstSteps": [
      "Do not house crayfish or large crabs with slow-moving fish (like Goldfish or Corydoras); keep them single-specimen or with tiny shrimp only.",
      "If keeping valuable ornamental snails (like Nerite snails), avoid Pea Puffers or aggressive Cichlids.",
      "Grow dense moss or add shrimp shelters to give dwarf shrimp safe hiding spots."
    ],
    "avoid": [
      "Do not fall for pet store claims of 'peaceful fish and crayfish coexistence'. They will clip and eat sleeping bottom fish at night."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Incompatibility",
      "Food Chain",
      "Ecological Pitfalls"
    ]
  },
  "qa_gen_010": {
    "title": "How many fish can I keep in my tank? How do I tell if my tank is overstocked?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "Follow the basic rule of '1 liter of water per 1 centimeter of fish'. Overstocking causes oxygen depletion and Ammonia/Nitrite spikes, crashing the tank.",
    "symptoms": [
      "Tank volume limits biological capacity. Excessive waste and respiration exhaust dissolved oxygen and exceed the processing capacity of nitrifying bacteria."
    ],
    "firstSteps": [
      "Calculate actual water volume (Liters): Length × Width × Height / 1000 (subtract approx. 10% for substrate).",
      "Control density: e.g., a 60L tank can hold at most 20 small 3cm tetras. Reduce quantities significantly for larger fish.",
      "Watch for overload signs: cloudy or smelly water, fish gasping without obvious disease, or high Ammonia levels mean you must split the tank."
    ],
    "avoid": [
      "Do not overstock small tanks with high-waste large fish. Heavy bioloads demand larger volumes and stronger filtration."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Stocking Density",
      "Filter Load",
      "Volume Calculation"
    ]
  },
  "qa_gen_011": {
    "title": "My fish has white spots like salt grains all over its body and keeps rubbing against rocks. How do I treat it?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "This is Ich (white spot disease)! Immediately raise the water temperature gradually to 30°C using a heater and increase aeration to kill the parasites.",
    "symptoms": [
      "Large temperature swings during water changes or seasonal changes compromise fish immunity, allowing Ich parasites to infect the skin. Ich cannot survive in temperatures above 28°C."
    ],
    "firstSteps": [
      "Raise water temp by 1°C every 2 hours until it reaches 30°C (for coldwater fish, watch closely and double aeration at 28-30°C).",
      "Increase aeration significantly; warmer water holds less oxygen, and fish will suffocate without heavy aeration.",
      "In severe cases, use Ich treatments (like copper-based meds or malachite green) in a bath, removing active carbon from the filter first."
    ],
    "avoid": [
      "Do not perform large water changes during an Ich outbreak; further temperature swings accelerate parasite breeding and kill fish."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Ich/White Spot",
      "Parasite",
      "Flashing/Scratching",
      "Temperature Raise"
    ]
  },
  "qa_gen_012": {
    "title": "My fish has white fuzz like mold, or its fins are rotting into shreds. What's the difference?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "White fuzz is saprolegniasis (columnaris/fungus), while shredded fins indicate bacterial fin rot. Both require improved water quality and targeted baths.",
    "symptoms": [
      "When fish are injured or water quality is poor, fungal spores (fungus) or opportunistic bacteria (fin rot) infect wounds and mucous membranes, multiplying rapidly."
    ],
    "firstSteps": [
      "Fungal infection (fuzz): Cotton-like growths on body. Use methylene blue, oxytetracycline, or commercial anti-fungal treatments with aquarium salt.",
      "Fin rot (bacterial): Congested, frayed fins without fuzz. Change 30% of water, use yellow powder (nifurpirinol) or oxytetracycline baths.",
      "Improving water quality is the first step to cure. Handle fish gently to avoid damaging their skin."
    ],
    "avoid": [
      "Do not pour methylene blue directly into a planted tank; it kills aquatic plants and destroys the biological filter."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Fungus",
      "Fin Rot",
      "Bacterial Infection",
      "Fungal Infection"
    ]
  },
  "qa_gen_013": {
    "title": "Can I pour new fish straight into my tank? Why is this a 'suicide operation'?",
    "category": "Fish Abnormalities",
    "urgency": "Urgent",
    "summary": "Absolutely not! You must 'acclimate' them. Direct release causes temperature shock or pH shock, resulting in instant death, and risks introducing foreign pathogens into the tank.",
    "symptoms": [
      "Water in the shipping bag is vastly different in temp and pH from the tank water. The fish's immunity is at its lowest; direct release causes stress collapse."
    ],
    "firstSteps": [
      "Step 1: Float the bag unopened in the tank for 20 minutes to equalize temperatures.",
      "Step 2: Scoop small amounts of tank water into the bag every 5-10 minutes. Repeat 3-4 times to adapt parameters.",
      "Step 3: Net the fish out individually and release them. Discard all shipping bag water."
    ],
    "avoid": [
      "Do not pour the shipping bag water into the tank. It is heavily contaminated with fish waste and transportation residues."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "New Fish",
      "Acclimation Flow",
      "Temperature Shock"
    ]
  },
  "qa_gen_014": {
    "title": "How often should I change water? Do I need to take the fish out to scrub the tank?",
    "category": "Water Changes / Maintenance",
    "urgency": "Urgent",
    "summary": "Change 20%-30% of the water once a week. Never remove the fish and do not scrub the entire tank; this destroys the nitrifying cycle and stresses fish to death.",
    "symptoms": [
      "Aggressive cleanups kill over 90% of beneficial bacteria on filter media and substrate. Catching fish causes severe panic and physical injury."
    ],
    "firstSteps": [
      "Use a siphon gravel vacuum to suck out waste from the bottom. Do not move or wash the substrate.",
      "Ensure new water temp is within 1°C of the tank temp and has been aged/dechlorinated.",
      "Scrub algae off glass surfaces directly inside the tank using a magnetic scraper or razor."
    ],
    "avoid": [
      "Do not wash filter media or substrate under tap water; chlorine instantly kills beneficial bacterial films, leading to toxic spikes post-cleanup."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Water Change Frequency",
      "Siphon Vacuum",
      "Cleanup Misconceptions"
    ]
  },
  "qa_gen_015": {
    "title": "How many times a day should I feed the fish? Is it okay to leave uneaten food in the tank?",
    "category": "Daily Feeding",
    "urgency": "Urgent",
    "summary": "Feed adult fish 1-2 times daily, with amounts eaten within 2 minutes. If food remains after 5 minutes, scoop it out immediately; do not leave it overnight.",
    "symptoms": [
      "Uneaten food rots in water, releasing toxic ammonia, clouding water, forming mold, and causing gasping, lethargy, or death."
    ],
    "firstSteps": [
      "Feed small pinches first. Add a bit more only after they eat it.",
      "Control portion sizes strictly to amounts finished within 2 minutes.",
      "If you go away for 2-3 days, fish will not starve; do not overfeed before leaving."
    ],
    "avoid": [
      "Do not feed fish just because they beg at the glass. Begging is natural, not a sign of hunger. Overfeeding and rotting food are primary causes of fish death."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Feeding Frequency",
      "Leftover Food Risks",
      "Beginner Tips"
    ]
  },
  "qa_gen_016": {
    "title": "How do I clean a dirty filter? Why did all my fish die after I washed the filter sponge under tap water?",
    "category": "Daily Feeding",
    "urgency": "Urgent",
    "summary": "Physical filter floss can be rinsed under tap water or replaced; however, biological filter media (ceramic/glass rings) must only be gently swished in discarded tank water.",
    "symptoms": [
      "Biological media houses nitrifying bacteria. Tap water chlorine kills these beneficial bacterial films, causing water quality to crash and turn cloudy post-cleaning."
    ],
    "firstSteps": [
      "Differentiate media: Wash or replace white physical floss using tap water.",
      "Clean ceramic rings: Scoop tank water into a bucket, swish ceramic rings gently to remove sludge and debris.",
      "Clean in stages: If filter media volume is large, clean only half at a time to preserve bacterial activity."
    ],
    "avoid": [
      "Do not use soaps, detergents, or chemical cleaners on any filter components; residues are highly toxic to fish."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Filter Cleaning",
      "Biological Media",
      "Nitrifying Bacteria"
    ]
  },
  "qa_gen_017": {
    "title": "The tank walls are covered in green hair, and driftwood is growing black fuzz that won't scrub off. How do I get rid of algae?",
    "category": "Plants & Algae",
    "urgency": "Urgent",
    "summary": "Reduce light duration to 6-8 hours daily, change 30% of water weekly, and introduce algae-eating species like cherry shrimp or Nerite snails.",
    "symptoms": [
      "Algae blooms are caused by 'excessive light + high nutrients'. Cutting off excess light and exporting nitrate/phosphate naturally starves out algae."
    ],
    "firstSteps": [
      "Use a timer socket to limit aquarium light to 6-8 hours daily; avoid direct sunlight.",
      "Add clean-up crew: cherry shrimp eat tender green algae; Nerite snails scrub hard green spot algae off glass.",
      "For black beard algae: Turn off the filter, and spot-treat affected areas with a small dose of glutaraldehyde using a syringe."
    ],
    "avoid": [
      "Do not rely solely on scraping glass to cure algae. Without controlling light and food inputs, green and brown algae will return in two days."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Algae Control",
      "Light Management",
      "Black Beard Algae"
    ]
  },
  "qa_gen_018": {
    "title": "What do different colors of algae (green, brown, black, blue-green) indicate about my tank?",
    "category": "Plants & Algae",
    "urgency": "Urgent",
    "summary": "Brown algae indicates insufficient cycling; green spot algae means excess light; black beard algae means organic overload; blue-green algae (cyanobacteria) means dead flow zones and severe eutrophication.",
    "symptoms": [
      "Different algae thrive under different conditions, serving as natural water quality indicators. Understanding their traits helps adjust parameters."
    ],
    "firstSteps": [
      "Brown algae (diatoms): Normal in new tanks. Disappears as beneficial bacteria establish (3-4 weeks) or when algae eaters are added.",
      "Green spot algae: Reduce light intensity and scrape off glass. Black beard algae: Reduce feeding and siphon out organic wastes.",
      "Blue-green algae (slimy, foul-smelling): Black out the tank for 3 days, or spot-treat with erythromycin."
    ],
    "avoid": [
      "Blue-green algae is not true algae but cyanobacteria. Siphon it out immediately; its toxins and foul odor are highly hazardous to fish."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Algae Identification",
      "Water Indicator",
      "Water Parameter Tuning"
    ]
  },
  "qa_gen_019": {
    "title": "My newly bought aquatic plants are melting and rotting away after a few days. Are they fake?",
    "category": "Plants & Algae",
    "urgency": "Urgent",
    "summary": "This is normal plant transition (melting). As long as the roots and crowns are not black or mushy, they are alive and will grow new submersed leaves.",
    "symptoms": [
      "Plants are often cultivated emersed (above water) by growers. Once submersed, they must shed emersed leaves to grow submersed leaves."
    ],
    "firstSteps": [
      "Trim off decaying or melting leaves to prevent them from rotting and polluting the water.",
      "Do not pull the plants out to check roots; give them 2-3 weeks to adapt and root.",
      "Provide adequate CO2 and basic light to help plants sprout new growth quickly."
    ],
    "avoid": [
      "Do not discard plants just because leaves melt. Healthy roots in Cryptocoryne or Anubias will sprout beautiful new leaves within two weeks."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Plant Melting",
      "Submersed Transition",
      "Adaptation Period"
    ]
  },
  "qa_gen_020": {
    "title": "I woke up and found all my fish and snails gasping at the water surface. What's wrong?",
    "category": "Daily Feeding",
    "urgency": "Urgent",
    "summary": "This is an acute oxygen crisis or toxic surge! Turn on the air pump to aerate heavily, and change 30%-50% of the water to dilute toxins and add oxygen.",
    "symptoms": [
      "Without light at night, plants and fish consume oxygen. High summer temperatures or overstocking crashes dissolved oxygen by morning; ammonia spikes also suffocate gills."
    ],
    "firstSteps": [
      "Raise the filter outlet above water to create splashing water drops and increase oxygen dissolution.",
      "Keep an air stone aerating 24/7.",
      "If water deterioration caused this, perform a water change with treated, temp-matched water."
    ],
    "avoid": [
      "Do not feed fish while they are gasping at the surface! Gasping fish have suspended digestive systems. Feeding will kill them and worsen water quality."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Surface Gasping",
      "Oxygen Depletion",
      "Emergency Rescue"
    ]
  },
  "qa_gen_021": {
    "title": "How do I know if my female fish is pregnant? What are signs of giving birth? Do I need to isolate her?",
    "category": "Pregnancy / Fry",
    "urgency": "Urgent",
    "summary": "When livebearers (like Guppies) have a boxy, 90-degree belly, deep black gravid spots, and hide in corners breathing rapidly, they will give birth within 24 hours. Isolate them immediately.",
    "symptoms": [
      "If not isolated, newborn fry will be eaten within seconds by other adult fish (and the mother herself) in a community tank."
    ],
    "firstSteps": [
      "Gently transfer the mother to a double-layer breeding box or a separate, densely planted nursery tank.",
      "Once the mother's belly is deflated, return her to the main tank to protect the fry.",
      "Add moss to the breeding box to provide cover and soothe the mother."
    ],
    "avoid": [
      "Do not leave the mother and newborns in the same compartment long after birth. A hungry post-birth mother will consume her own fry."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Pregnant Female",
      "Signs of Birth",
      "Breeding Isolation"
    ]
  },
  "qa_gen_022": {
    "title": "I want to breed my fish, but they fight aggressively when placed together. How do I handle this?",
    "category": "Pregnancy / Fry",
    "urgency": "Urgent",
    "summary": "Use the 'divider pairing method'. Place a clear, perforated divider in the middle to keep them separated while they adjust to each other's scent and sight. Combine them only when calm.",
    "symptoms": [
      "Fish treat unfamiliar partners as invaders when territorial instincts are high, leading to severe injuries or death instead of mating."
    ],
    "firstSteps": [
      "Ensure the divider has holes so water and pheromones flow through normally.",
      "Place male and female on opposite sides; watch if they flare or display near the divider.",
      "If they bite violently after combining, divide them again until behavior calms down."
    ],
    "avoid": [
      "Do not dump two mature, unpaired Bettas or Cichlids together in a small tank without dividers; they can easily kill each other overnight."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Fish Pairing",
      "Visual Contact",
      "Physical Dividers"
    ]
  },
  "qa_gen_023": {
    "title": "The baby fry have finally hatched! How do I feed them to ensure survival and growth?",
    "category": "Pregnancy / Fry",
    "urgency": "Urgent",
    "summary": "Do not feed them for the first 1-2 days while they have yolk sacs. Once the yolk sac disappears and fry swim freely, feed them baby brine shrimp or filtered egg yolk water.",
    "symptoms": [
      "Newborn fry have underdeveloped digestive tracts and live off yolk nutrients. Early feeding only rots the nursery water, killing fry quickly."
    ],
    "firstSteps": [
      "Observe fry: Start feeding only after they swim horizontally and yolk sacs disappear.",
      "First foods: Baby brine shrimp (artemia nauplii) are best, or tiny drops of cooked egg yolk water (do not cloud water).",
      "Cover filter intakes with a fine mesh to prevent tiny fry from being sucked in."
    ],
    "avoid": [
      "Do not feed regular large pellets. Large food decaying on the bottom leads to mold and bacterial rot, causing mass fry deaths."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Feeding Fry",
      "Starter Food",
      "Yolk Sac Stage"
    ]
  },
  "qa_gen_024": {
    "title": "How do I tell male and female fish apart? Are there general methods?",
    "category": "Pregnancy / Fry",
    "urgency": "Urgent",
    "summary": "Using Guppies as an example: males are brightly colored, have narrow bodies, and their anal fin is modified into a rod (gonopodium); females have duller colors, fan-shaped anal fins, and round bellies with gravid spots.",
    "symptoms": [
      "Most species show sexual dimorphism. Males develop vibrant colors and long fins to attract mates and specialized mating organs; females require rounded bellies to hold eggs."
    ],
    "firstSteps": [
      "Check colors and fins: Usually, the more colorful fish with longer fins is the male.",
      "Check anal fin: Female guppy anal fin is triangular; male is a thin rod.",
      "Check breeding tube: For large fish (like Angelfish), the male's tube is narrow and pointed, while the female's is wide and blunt during spawning."
    ],
    "avoid": [
      "Do not try to sex young juveniles. It is best to differentiate them after they reach 2-3 cm and sexual maturity."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Sexing Fish",
      "Male Female Difference",
      "Feature Comparison"
    ]
  },
  "qa_gen_025": {
    "title": "Will a broken heater turn my tank into a 'fish soup cooker'? How should I place it?",
    "category": "Equipment Issues",
    "urgency": "Urgent",
    "summary": "Heaters should be placed horizontally or at an angle directly in the flow path under the filter outlet. Never hang it vertically in dead spots or leave it exposed above water.",
    "symptoms": [
      "In stagnant zones, the heater shuts off once local water hits target temp, leaving the rest of the tank freezing; exposing it to air while heating cracks the glass or melts the casing."
    ],
    "firstSteps": [
      "Place the heater at a 45-degree angle or horizontal near the bottom, aligned with filter outlet currents for heat distribution.",
      "Always cut power to the heater 10 minutes before siphoning water out during changes to prevent dry burning.",
      "Install a high-quality double-controller heater with automatic overheat shutoff."
    ],
    "avoid": [
      "Do not use cheap, unshielded glass heaters. If the internal thermostat fuses closed, it will heat continuously, cooking all your fish."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Heater Safety",
      "Heater Placement",
      "Dry Burning Prevention"
    ]
  },
  "qa_gen_026": {
    "title": "There are so many types of filters. How do I choose? Is more expensive always better?",
    "category": "Equipment Issues",
    "urgency": "Urgent",
    "summary": "Choose based on needs. High-waste fish need trickle or top filters; planted tanks need canister filters; small desktop tanks need hang-on-back (HOB) filters; shrimp/fry tanks need air-driven sponge filters.",
    "symptoms": [
      "Filters differ in flow rate, media capacity, and current strength. Incorrect selection causes cloudy water, CO2 escape in planted tanks, or sucks in fry."
    ],
    "firstSteps": [
      "High-waste large fish (Goldfish, Koi): Recommend trickle/top filters with large media capacity and dry-wet separation.",
      "Planted aquascapes: Recommend canister filters which keep water surface agitation low to preserve CO2.",
      "Shrimp or fry tanks: Recommend air-driven sponge filters, which have gentle suction and grow rich biofilms."
    ],
    "avoid": [
      "Do not put a powerful canister filter in a 30cm tank; the whirlpool current will exhaust and kill tiny fish. Do not use HOB filters for large goldfish; their biological capacity is insufficient."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Filter Selection",
      "Canister/Top Filter",
      "Sponge Filter",
      "Filter Scenarios"
    ]
  },
  "qa_gen_027": {
    "title": "Does an aquarium always need an air pump? Where does water oxygen come from?",
    "category": "Equipment Issues",
    "urgency": "Urgent",
    "summary": "Not necessarily. 99% of dissolved oxygen enters via surface gas exchange created by ripples and waves; bubbles themselves dissolve very little. If your filter outlet ripples the surface, a separate air pump is unnecessary.",
    "symptoms": [
      "Gas exchange happens at the surface. Air pumps work by bringing water up, breaking surface tension, and vibrating water to increase the contact area with air."
    ],
    "firstSteps": [
      "If your filter outlet is above water, splashing ripples and waves, oxygen levels are adequate without an air pump.",
      "If stocking density is extremely high or during medication baths (which demand high oxygen), run an air pump for safety.",
      "If the tank has dense plants and strong lighting, photosynthesis produces ample oxygen (visible as plant pearling)."
    ],
    "avoid": [
      "Do not assume bubbles alone oxygenate water. If a thick oil film covers the surface and blocks ripple exchange, fish can still suffocate despite heavy bubbling."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Aeration Principles",
      "Air Pump Necessity",
      "Surface Ripples"
    ]
  },
  "qa_gen_028": {
    "title": "How do I control marine tank salinity? What is the most accurate measurement tool?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Keep marine specific gravity at 1.024-1.026 (salinity 33-35ppt). Recommend using an optical refractometer, calibrated with pure water before each use.",
    "symptoms": [
      "Salinity directly affects marine osmotic pressure. Parameter swings cause corals to melt and fish to dehydrate. Plastic hydrometers have large errors due to bubbles or salt deposits."
    ],
    "firstSteps": [
      "Buy an optical refractometer as your core measurement tool.",
      "Calibrate the refractometer with pure RO water weekly.",
      "When topping off evaporated water, add only pure RO water (freshwater), not saltwater, since only water evaporates, not salt."
    ],
    "avoid": [
      "Do not use cheap plastic swing-arm hydrometers; their errors can reach 0.005, which is enough to kill delicate SPS corals."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Marine Tank",
      "Salinity Control",
      "Refractometer",
      "Specific Gravity"
    ]
  },
  "qa_gen_029": {
    "title": "Why must a marine tank go through an 'algae bloom cycle'? When does it end?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Cycling/blooming is using strong lights to consume nutrients released by curing live rock. It ends when green hair algae turns yellow, dies back, and detaches.",
    "symptoms": [
      "Fresh live rock contains many decaying micro-organisms. Cycling lets diatoms and green hair algae consume highly toxic ammonia and nitrites, establishing a robust biological filter."
    ],
    "firstSteps": [
      "Run lights 14-24 hours daily during cycling to accelerate algae growth.",
      "Once algae turns yellow and dies, scrub the rocks clean and siphon out all dead algae and debris from the bottom.",
      "Once Nitrite (NO2) is 0 and Nitrate (NO3) is low, perform a 50% water change before adding corals or fish."
    ],
    "avoid": [
      "Do not add fish, corals, or cleanup crew during the algae bloom stage. High Ammonia and Nitrite levels will kill them instantly."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Algae Bloom",
      "Live Rock",
      "Cycling",
      "Marine Tank"
    ]
  },
  "qa_gen_030": {
    "title": "What is the relationship between Calcium (Ca), Magnesium (Mg), and Alkalinity (KH) in a reef tank?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Calcium (400-450ppm), Magnesium (1250-1350ppm), and Alkalinity (7-9dKH) are the three pillars of coral skeleton growth. Magnesium stabilizes Calcium and KH balance.",
    "symptoms": [
      "Corals absorb calcium and carbonate ions to build skeletons. If Magnesium is low, Calcium and Alkalinity precipitate out, becoming unavailable and destabilizing pH."
    ],
    "firstSteps": [
      "Test these three parameters regularly using high-precision test kits (e.g. Salifert).",
      "If coral demand is high, use a dosing pump to automatically add three-part supplements daily.",
      "Always raise Magnesium to standard levels first, then adjust Calcium and dKH."
    ],
    "avoid": [
      "Do not dose large amounts manually. Parameter swings (especially KH swings) trigger instant RTN (rapid tissue necrosis) and kill SPS corals."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Marine Parameters",
      "Calcium/Magnesium/KH",
      "Coral Growth",
      "SPS Coral"
    ]
  },
  "qa_gen_031": {
    "title": "There's white salt crust forming on the edges and equipment of my marine tank. How do I clean it?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "This is 'salt creep'. Wipe it away with a damp cloth to prevent 'salt bridges' that short-circuit equipment or cause water to leak along glass walls.",
    "symptoms": [
      "Popping bubbles and splashing waves throw tiny saltwater droplets onto tank rims and cords. Once water evaporates, the salt crystals draw humidity and creep outward."
    ],
    "firstSteps": [
      "Wipe rims, cords, and light fixtures clean of salt creep weekly using a warm, damp cloth.",
      "Install lids or splash guards over high-splash zones to reduce water splatter.",
      "Keep outlets and power strips away from creep zones, and leave drip loops on all power cords."
    ],
    "avoid": [
      "Do not let salt creep contact metal heat sinks or wire terminals. Corrosive saltwater ruins electronics and poses fire hazards."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Salt Creep",
      "Marine Maintenance",
      "Salt Bridge",
      "Equipment Care"
    ]
  },
  "qa_gen_032": {
    "title": "My newly bought anemone keeps walking around and stinging other corals. What should I do?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Anemones move to find comfortable flow and light. Cover wavemakers with guards to prevent them from being shredded, and move sensitive corals away.",
    "symptoms": [
      "Anemones are mobile invertebrates. If flow or light is unsatisfactory, they detach and drift. Their tentacles carry strong toxins that sting and burn other corals."
    ],
    "firstSteps": [
      "Ensure all wavemakers have anemone guard meshes to prevent them from being sucked in, shredded, and poisoning the tank.",
      "If the anemone attaches to a bad spot, gently blow a slow powerhead current at its foot, or place an ice pack in a bag against its foot to make it detach.",
      "When releasing it, place it in a moderate-light, low-flow crevice to encourage it to settle."
    ],
    "avoid": [
      "Do not tear or pull the anemone foot off rock. If the foot is torn or damaged, it will infect, rot, and die, polluting the water."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Anemone Moving",
      "Wavemaker Safety",
      "Coral Sting",
      "Marine Biology"
    ]
  },
  "qa_gen_033": {
    "title": "Can I use tap water directly to mix marine salt? Why does everyone say to use RO water?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Absolutely not! You must use RO (Reverse Osmosis) or DI (Deionized) water. Tap water contains silicates, phosphates, and metals that cause severe algae blooms and poison sensitive corals.",
    "symptoms": [
      "Tap water contains chlorine, heavy metals, silicates, and phosphates. These feed massive marine algae blooms, and accumulated copper/metals are lethal to corals and invertebrates."
    ],
    "firstSteps": [
      "Buy a home RO unit, or purchase RO water from local aquarium stores or supermarkets.",
      "Heat the pure water to approx. 25°C, then add marine salt (usually 33-35g per liter of water).",
      "Mix with a powerhead or air stone for 12-24 hours until salt is completely dissolved and water is clear before checking salinity."
    ],
    "avoid": [
      "Do not use mineral bottled water; it contains added minerals that will throw off marine parameter balances and cause algae blooms."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Marine Salt",
      "RO Water",
      "Setup Preparation",
      "Marine Tank"
    ]
  },
  "qa_gen_034": {
    "title": "Can I convert my standard freshwater rimless tank to keep marine fish and corals?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "Yes for simple marine fish, but corals are very hard to keep without a sump system. A dedicated marine sump tank is highly recommended.",
    "symptoms": [
      "Marine aquariums require extensive equipment (skimmers, heaters, chillers, dosers). Hanging all these on a rimless tank looks cluttered, salt corrodes exposed cords, and surface oil film is hard to clear."
    ],
    "firstSteps": [
      "If using a standard tank, install a high-quality hang-on skimmer and a surface oil skimmer inlet.",
      "Replace freshwater plants lights with specialized reef LED lights that provide correct spectrums for coral growth.",
      "Wipe splash salt crust off rims regularly to protect surrounding furniture."
    ],
    "avoid": [
      "Do not use tanks with metal frames or metal parts for marine setups. Saltwater is extremely corrosive, and dissolved copper/iron will kill corals and snails."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Marine Equipment",
      "Tank Choice",
      "Sump Tank",
      "Marine Tank"
    ]
  },
  "qa_gen_035": {
    "title": "Can 'Clownfish' and 'Anemones' really be housed together? Will they fight?",
    "category": "Marine Aquarium Specials",
    "urgency": "Urgent",
    "summary": "They are symbiotic and will not fight. However, captive-bred clownfish might take weeks to hosting an anemone, and an unhealthy anemone might sting unfamiliar fish.",
    "symptoms": [
      "Wild clownfish hide in anemone tentacles for protection, relying on specialized body mucus to avoid stings. Captive-bred clowns might have lost this instinct initially; also, mismatched species (e.g. Tomato Clown with Carpet Anemone) can fail."
    ],
    "firstSteps": [
      "Choose classic symbiotic pairings: Ocellaris/Percula Clownfish with Bubble Tip Anemone (e.g. Rose/Green Bubble Tip).",
      "If they don't host, be patient. You can try spotlighting the anemone at night, or using an isolation box to keep them close.",
      "Ensure the anemone is healthy (tight mouth, sticky tentacles). A dying, melting anemone releases severe toxins that crash the tank."
    ],
    "avoid": [
      "Do not add an anemone to a newly cycled tank. Anemones are extremely sensitive to parameter swings; their death and rot will poison all fish in the tank."
    ],
    "observe": [],
    "diagnoseWhen": [],
    "nextStep": "",
    "keywords": [
      "Clownfish",
      "Anemone",
      "Symbiosis",
      "Marine Biology"
    ]
  }
};
