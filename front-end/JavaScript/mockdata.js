(function () {
  const existingData = JSON.parse(localStorage.getItem("serveEaseData")) || {};

  const updatedCategories = [
  {
    id: "home-cleaning",
    name: "Home Cleaning",
    icon: "🧹",
    bgImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
    subServices: ["Full Home Cleaning", "Kitchen Cleaning", "Bathroom Cleaning"]
  },
  {
    id: "salon-at-home",
    name: "Salon at Home",
    icon: "💇",
    bgImage: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80",
    subServices: ["Haircut & Styling", "Facial & Cleanup", "Manicure & Pedicure"]
  },
  {
    id: "plumbing",
    name: "Plumbing",
    icon: "🔧",
    bgImage: "assets/images/plumbing-category-realistic.jpeg",
    subServices: ["Plumbing"]
  },
  {
    id: "electrician",
    name: "Electrician",
    icon: "⚡",
    bgImage: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
    subServices: ["Electrician"]
  },
  {
    id: "appliance-repair-installation",
    name: "Appliance Repair / Installation",
    icon: "🛠",
    bgImage: "assets/images/appliance-repair-realistic.jpg",
    subServices: ["Washing Machine", "Refrigerator", "TV", "Geyser", "Chimney", "Laptop/Desktop", "AC"]
  },
  {
    id: "pest-control",
    name: "Pest Control",
    icon: "🐜",
    bgImage: "assets/images/pest-control-realistic.jpg",
    subServices: ["General Pest Control", "Termite Control", "Cockroach Control"]
  },
  {
    id: "painting",
    name: "Painting",
    icon: "🎨",
    bgImage: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80",
    subServices: ["Painting"]
  },
  {
    id: "carpentry",
    name: "Carpentry",
    icon: "🪚",
    bgImage: "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80",
    subServices: ["Furniture Repair", "Door Repair / Installation"]
  }
];

  const updatedPopularServices = [
    {
      title: "Full Home Cleaning",
      description: "Complete deep cleaning service for your entire home.",
      price: "₹999",
      rating: "4.9",
      categoryId: "home-cleaning",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Bathroom Cleaning",
      description: "Professional bathroom cleaning for a fresh and hygienic space.",
      price: "₹499",
      rating: "4.8",
      categoryId: "home-cleaning",
      image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Haircut & Styling",
      description: "Salon-quality haircut and styling services at home.",
      price: "₹399",
      rating: "4.8",
      categoryId: "salon-at-home",
      image: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Plumbing Service",
      description: "Quick plumbing assistance for leaks, taps, and fittings.",
      price: "₹299",
      rating: "4.8",
      categoryId: "plumbing",
      image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "AC Repair",
      description: "Fast AC servicing and repair by trained professionals.",
      price: "₹799",
      rating: "4.9",
      categoryId: "appliance-repair-installation",
      image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=900&q=80"
    },
    {
      title: "Pest Control",
      description: "Reliable pest control to keep your home safe and clean.",
      price: "₹899",
      rating: "4.8",
      categoryId: "pest-control",
      image: "assets/images/pest-control-realistic.jpg"
    }
  ];

  // cityId mapping: 1=Chennai, 2=Bangalore, 3=Hyderabad, 4=Delhi, 5=Mumbai
  const updatedProviders = [
    // ── Chennai (cityId: 1) ──────────────────────────────────────────────────
    { id: "cleanpro-service", name: "Cleanpro Service", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 8, rating: 4.9, reviews: 487, distance: "2.1 km", startingPrice: 999, location: "Chennai, Tamil Nadu", jobsDone: 1217, availableToday: true, verified: true, cityId: 1, image: "assets/images/home-cleaning/clean1.jpg" },
    { id: "fresh-space-cleaning", name: "Fresh Space Cleaning", category: "home-cleaning", subServices: ["Kitchen Cleaning"], years: 6, rating: 4.8, reviews: 392, distance: "3.0 km", startingPrice: 699, location: "Chennai, Tamil Nadu", jobsDone: 932, availableToday: true, verified: true, cityId: 1, image: "assets/images/home-cleaning/clean2.jpg" },
    { id: "urban-shine-cleaner", name: "Urban Shine Cleaner", category: "home-cleaning", subServices: ["Bathroom Cleaning"], years: 5, rating: 4.7, reviews: 301, distance: "1.9 km", startingPrice: 499, location: "Chennai, Tamil Nadu", jobsDone: 743, availableToday: false, verified: true, cityId: 1, image: "assets/images/home-cleaning/clean3.jpg" },
    { id: "sparkle-home-care", name: "Sparkle Home Care", category: "home-cleaning", subServices: ["Full Home Cleaning", "Bathroom Cleaning"], years: 7, rating: 4.8, reviews: 418, distance: "2.6 km", startingPrice: 899, location: "Chennai, Tamil Nadu", jobsDone: 1083, availableToday: true, verified: true, cityId: 1, image: "assets/images/home-cleaning/clean4.jpg" },
    { id: "drainmaster-solutions", name: "DrainMaster Solutions", category: "plumbing", subServices: ["Plumbing"], years: 8, rating: 4.9, reviews: 487, distance: "2.8 km", startingPrice: 399, location: "Chennai, Tamil Nadu", jobsDone: 1217, availableToday: true, verified: true, cityId: 1, image: "assets/images/plumbing/plumbing1.jpg.jpeg" },
    { id: "bugbusters-pro", name: "BugBusters Pro", category: "pest-control", subServices: ["General Pest Control"], years: 8, rating: 4.8, reviews: 405, distance: "2.0 km", startingPrice: 899, location: "Chennai, Tamil Nadu", jobsDone: 1040, availableToday: true, verified: true, cityId: 1, image: "assets/images/pest-control/pest1.jpg.jpeg" },
    { id: "homeglow-painters", name: "HomeGlow Painters", category: "painting", subServices: ["Painting"], years: 6, rating: 4.8, reviews: 298, distance: "1.8 km", startingPrice: 1299, location: "Chennai, Tamil Nadu", jobsDone: 703, availableToday: true, verified: true, cityId: 1, image: "assets/images/painting/painting1.jpg.jpeg" },
    { id: "woodcraft-repair", name: "WoodCraft Repair", category: "carpentry", subServices: ["Furniture Repair", "Door Repair / Installation"], years: 5, rating: 4.7, reviews: 262, distance: "1.6 km", startingPrice: 449, location: "Chennai, Tamil Nadu", jobsDone: 622, availableToday: true, verified: true, cityId: 1, image: "assets/images/carpentry/carpentry1.jpg.jpeg" },

    // ── Bangalore (cityId: 2) ────────────────────────────────────────────────
    { id: "beauty-express", name: "Beauty Express", category: "salon-at-home", subServices: ["Haircut & Styling"], years: 5, rating: 4.8, reviews: 256, distance: "2.0 km", startingPrice: 399, location: "Bangalore, Karnataka", jobsDone: 624, availableToday: true, verified: true, cityId: 2, image: "assets/images/salon-at-home/salon2.jpg" },
    { id: "glamour-at-doorstep", name: "Glamour At Doorstep", category: "salon-at-home", subServices: ["Facial & Cleanup"], years: 7, rating: 4.9, reviews: 381, distance: "1.5 km", startingPrice: 599, location: "Bangalore, Karnataka", jobsDone: 802, availableToday: true, verified: true, cityId: 2, image: "assets/images/salon-at-home/salon4.jpg" },
    { id: "royal-beauty-services", name: "Royal Beauty Services", category: "salon-at-home", subServices: ["Manicure & Pedicure"], years: 6, rating: 4.7, reviews: 275, distance: "2.9 km", startingPrice: 499, location: "Bangalore, Karnataka", jobsDone: 671, availableToday: false, verified: true, cityId: 2, image: "assets/images/salon-at-home/salon1.jpg" },
    { id: "brightwire-solutions", name: "BrightWire Solutions", category: "electrician", subServices: ["Electrician"], years: 8, rating: 4.9, reviews: 442, distance: "2.0 km", startingPrice: 399, location: "Bangalore, Karnataka", jobsDone: 1131, availableToday: true, verified: true, cityId: 2, image: "assets/images/electrician/ele2.jpg.jpeg" },
    { id: "currentcare-electrician", name: "CurrentCare Electrician", category: "electrician", subServices: ["Electrician"], years: 6, rating: 4.8, reviews: 370, distance: "2.6 km", startingPrice: 349, location: "Bangalore, Karnataka", jobsDone: 956, availableToday: true, verified: true, cityId: 2, image: "assets/images/electrician/ele4.jpg.jpeg" },
    { id: "carpenter-plus", name: "Carpenter Plus", category: "carpentry", subServices: ["Door Repair / Installation"], years: 7, rating: 4.8, reviews: 318, distance: "2.5 km", startingPrice: 499, location: "Bangalore, Karnataka", jobsDone: 820, availableToday: true, verified: true, cityId: 2, image: "assets/images/carpentry/carpentry2.jpg.jpeg" },
    { id: "pipepro-services", name: "PipePro Services", category: "plumbing", subServices: ["Plumbing"], years: 6, rating: 4.8, reviews: 398, distance: "3.2 km", startingPrice: 349, location: "Bangalore, Karnataka", jobsDone: 968, availableToday: true, verified: true, cityId: 2, image: "assets/images/plumbing/piumbling2.jpg.jpeg" },
    { id: "colorcraft-painters", name: "ColorCraft Painters", category: "painting", subServices: ["Painting"], years: 7, rating: 4.7, reviews: 310, distance: "3.2 km", startingPrice: 1399, location: "Bangalore, Karnataka", jobsDone: 760, availableToday: false, verified: true, cityId: 2, image: "assets/images/painting/painting2.jpg.jpeg" },

    // ── Hyderabad (cityId: 3) ────────────────────────────────────────────────
    { id: "stylehub-home-salon", name: "StyleHub Home Salon", category: "salon-at-home", subServices: ["Haircut & Styling", "Facial & Cleanup"], years: 8, rating: 4.9, reviews: 420, distance: "3.4 km", startingPrice: 699, location: "Hyderabad, Telangana", jobsDone: 1010, availableToday: true, verified: true, cityId: 3, image: "assets/images/salon-at-home/salon3.jpg" },
    { id: "elegance-home-spa", name: "Elegance Home Spa", category: "salon-at-home", subServices: ["Facial & Cleanup", "Manicure & Pedicure"], years: 5, rating: 4.8, reviews: 288, distance: "2.4 km", startingPrice: 549, location: "Hyderabad, Telangana", jobsDone: 700, availableToday: true, verified: true, cityId: 3, image: "assets/images/salon-at-home/salon1.jpg" },
    { id: "aquatech-plumbers", name: "AquaTech Plumbers", category: "plumbing", subServices: ["Plumbing"], years: 7, rating: 4.8, reviews: 421, distance: "2.3 km", startingPrice: 379, location: "Hyderabad, Telangana", jobsDone: 1034, availableToday: true, verified: true, cityId: 3, image: "assets/images/plumbing/plumber3.jpg.jpeg" },
    { id: "allfix-appliances", name: "AllFix Appliances", category: "appliance-repair-installation", subServices: ["Washing Machine", "Refrigerator"], years: 8, rating: 4.8, reviews: 410, distance: "2.2 km", startingPrice: 499, location: "Hyderabad, Telangana", jobsDone: 1077, availableToday: true, verified: true, cityId: 3, image: "assets/images/appliance-repair/refrigenator.jpg.jpeg" },
    { id: "greenshield-pest-control", name: "GreenShield Pest Control", category: "pest-control", subServices: ["Termite Control"], years: 7, rating: 4.8, reviews: 372, distance: "2.8 km", startingPrice: 1199, location: "Hyderabad, Telangana", jobsDone: 920, availableToday: true, verified: true, cityId: 3, image: "assets/images/pest-control/pest3.jpg.jpeg" },
    { id: "fixit-carpentry", name: "FixIt Carpentry", category: "carpentry", subServices: ["Door Repair / Installation", "Furniture Repair"], years: 6, rating: 4.8, reviews: 337, distance: "2.8 km", startingPrice: 549, location: "Hyderabad, Telangana", jobsDone: 870, availableToday: false, verified: true, cityId: 3, image: "assets/images/carpentry/carpentry3.jpg.jpeg" },
    { id: "homeapp-repair-pro", name: "HomeApp Repair Pro", category: "appliance-repair-installation", subServices: ["TV", "Geyser", "Chimney"], years: 5, rating: 4.7, reviews: 260, distance: "2.9 km", startingPrice: 399, location: "Hyderabad, Telangana", jobsDone: 640, availableToday: false, verified: true, cityId: 3, image: "assets/images/appliance-repair/washingmachine.jpg.jpeg" },

    // ── Delhi (cityId: 4) ────────────────────────────────────────────────────
    { id: "powerfix-electrician", name: "PowerFix Electrician", category: "electrician", subServices: ["Electrician"], years: 7, rating: 4.8, reviews: 418, distance: "1.8 km", startingPrice: 379, location: "Delhi, NCR", jobsDone: 1015, availableToday: false, verified: true, cityId: 4, image: "assets/images/electrician/ele4.jpg.jpeg" },
    { id: "spark-electric-service", name: "Spark Electric Service", category: "electrician", subServices: ["Electrician"], years: 5, rating: 4.7, reviews: 290, distance: "3.1 km", startingPrice: 299, location: "Delhi, NCR", jobsDone: 704, availableToday: true, verified: true, cityId: 4, image: "assets/images/electrician/ele2.jpg.jpeg" },
    { id: "brushmasters-pro", name: "BrushMasters Pro", category: "painting", subServices: ["Painting"], years: 8, rating: 4.8, reviews: 395, distance: "2.4 km", startingPrice: 1499, location: "Delhi, NCR", jobsDone: 980, availableToday: true, verified: true, cityId: 4, image: "assets/images/painting/painting4.jpg.jpeg" },
    { id: "quickfix-plumbing", name: "QuickFix Plumbing", category: "plumbing", subServices: ["Plumbing"], years: 5, rating: 4.7, reviews: 312, distance: "1.5 km", startingPrice: 299, location: "Delhi, NCR", jobsDone: 811, availableToday: true, verified: true, cityId: 4, image: "assets/images/plumbing/piumber4.jpg.jpeg" },
    { id: "quickrepair-services", name: "QuickRepair Services", category: "appliance-repair-installation", subServices: ["TV", "Washing Machine"], years: 6, rating: 4.8, reviews: 320, distance: "2.5 km", startingPrice: 449, location: "Delhi, NCR", jobsDone: 760, availableToday: true, verified: true, cityId: 4, image: "assets/images/appliance-repair/gesyer.jpg.jpeg" },
    { id: "safehome-pest-care", name: "SafeHome Pest Care", category: "pest-control", subServices: ["Termite Control", "General Pest Control"], years: 5, rating: 4.7, reviews: 248, distance: "2.7 km", startingPrice: 849, location: "Delhi, NCR", jobsDone: 610, availableToday: true, verified: true, cityId: 4, image: "assets/images/pest-control/pest4.jpg.jpeg" },
    { id: "mastercraft-services", name: "MasterCraft Services", category: "carpentry", subServices: ["Furniture Repair"], years: 9, rating: 4.9, reviews: 470, distance: "3.0 km", startingPrice: 649, location: "Delhi, NCR", jobsDone: 1210, availableToday: true, verified: true, cityId: 4, image: "assets/images/carpentry/carpentry4.jpg.jpeg" },

    // ── Mumbai (cityId: 5) ───────────────────────────────────────────────────
    { id: "voltmaster-electric", name: "VoltMaster Electric", category: "electrician", subServices: ["Electrician"], years: 9, rating: 4.9, reviews: 501, distance: "2.7 km", startingPrice: 449, location: "Mumbai, Maharashtra", jobsDone: 1308, availableToday: true, verified: true, cityId: 5, image: "assets/images/electrician/ele5.jpg.jpeg" },
    { id: "coolcare-ac-services", name: "CoolCare AC Services", category: "appliance-repair-installation", subServices: ["AC"], years: 7, rating: 4.9, reviews: 439, distance: "3.0 km", startingPrice: 799, location: "Mumbai, Maharashtra", jobsDone: 1120, availableToday: true, verified: true, cityId: 5, image: "assets/images/appliance-repair/ACrepair.jpg.jpeg" },
    { id: "digitech-solutions", name: "DigiTech Solutions", category: "appliance-repair-installation", subServices: ["Laptop/Desktop"], years: 6, rating: 4.7, reviews: 285, distance: "1.7 km", startingPrice: 649, location: "Mumbai, Maharashtra", jobsDone: 688, availableToday: true, verified: true, cityId: 5, image: "assets/images/appliance-repair/gesyer.jpg.jpeg" },
    { id: "techfix-appliances", name: "TechFix Appliances", category: "appliance-repair-installation", subServices: ["Refrigerator", "AC", "Chimney"], years: 8, rating: 4.9, reviews: 451, distance: "3.3 km", startingPrice: 549, location: "Mumbai, Maharashtra", jobsDone: 1184, availableToday: true, verified: true, cityId: 5, image: "assets/images/appliance-repair/refrigenator.jpg.jpeg" },
    { id: "pestguard-services", name: "PestGuard Services", category: "pest-control", subServices: ["General Pest Control", "Cockroach Control"], years: 9, rating: 4.9, reviews: 486, distance: "1.9 km", startingPrice: 999, location: "Mumbai, Maharashtra", jobsDone: 1295, availableToday: true, verified: true, cityId: 5, image: "assets/images/pest-control/pest5.jpg.jpeg" },
    { id: "elite-painting-services", name: "Elite Painting Services", category: "painting", subServices: ["Painting"], years: 9, rating: 4.9, reviews: 452, distance: "2.1 km", startingPrice: 1599, location: "Mumbai, Maharashtra", jobsDone: 1180, availableToday: true, verified: true, cityId: 5, image: "assets/images/painting/painting1.jpg.jpeg" },
    { id: "expert-woodworks", name: "Expert WoodWorks", category: "carpentry", subServices: ["Furniture Repair"], years: 8, rating: 4.9, reviews: 401, distance: "1.9 km", startingPrice: 599, location: "Mumbai, Maharashtra", jobsDone: 1033, availableToday: true, verified: true, cityId: 5, image: "assets/images/carpentry/carpentry5.jpg.jpeg" },
    { id: "perfect-finish-painting", name: "Perfect Finish Painting", category: "painting", subServices: ["Painting"], years: 5, rating: 4.7, reviews: 244, distance: "3.4 km", startingPrice: 1199, location: "Mumbai, Maharashtra", jobsDone: 598, availableToday: true, verified: true, cityId: 5, image: "assets/images/painting/painting4.jpg.jpeg" },

    // ── Additional providers to ensure full city × category coverage ─────────

    // home-cleaning: Bangalore(2), Hyderabad(3), Delhi(4), Mumbai(5)
    { id: "neatly-home-services-blr", name: "Neatly Home Services", category: "home-cleaning", subServices: ["Full Home Cleaning", "Kitchen Cleaning"], years: 5, rating: 4.7, reviews: 214, distance: "2.3 km", startingPrice: 799, location: "Bangalore, Karnataka", jobsDone: 530, availableToday: true, verified: true, cityId: 2, image: "assets/images/home-cleaning/clean2.jpg" },
    { id: "hygieneplus-hyd", name: "HygienePlus Cleaners", category: "home-cleaning", subServices: ["Bathroom Cleaning", "Full Home Cleaning"], years: 6, rating: 4.8, reviews: 289, distance: "3.1 km", startingPrice: 699, location: "Hyderabad, Telangana", jobsDone: 712, availableToday: true, verified: true, cityId: 3, image: "assets/images/home-cleaning/clean3.jpg" },
    { id: "sparkclean-delhi", name: "SparkClean Delhi", category: "home-cleaning", subServices: ["Kitchen Cleaning", "Bathroom Cleaning"], years: 4, rating: 4.6, reviews: 178, distance: "2.8 km", startingPrice: 649, location: "Delhi, NCR", jobsDone: 418, availableToday: true, verified: true, cityId: 4, image: "assets/images/home-cleaning/clean4.jpg" },
    { id: "freshstart-cleaning-mum", name: "FreshStart Cleaning", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 5, rating: 4.7, reviews: 231, distance: "2.0 km", startingPrice: 849, location: "Mumbai, Maharashtra", jobsDone: 571, availableToday: false, verified: true, cityId: 5, image: "assets/images/home-cleaning/clean5.jpg" },

    // salon-at-home: Chennai(1), Delhi(4), Mumbai(5)
    { id: "glam-studio-chennai", name: "Glam Studio Chennai", category: "salon-at-home", subServices: ["Haircut & Styling", "Facial & Cleanup"], years: 4, rating: 4.7, reviews: 196, distance: "1.8 km", startingPrice: 349, location: "Chennai, Tamil Nadu", jobsDone: 482, availableToday: true, verified: true, cityId: 1, image: "assets/images/salon-at-home/salon1.jpg" },
    { id: "luxe-salon-delhi", name: "Luxe Salon at Home", category: "salon-at-home", subServices: ["Manicure & Pedicure", "Facial & Cleanup"], years: 6, rating: 4.8, reviews: 263, distance: "2.2 km", startingPrice: 449, location: "Delhi, NCR", jobsDone: 640, availableToday: true, verified: true, cityId: 4, image: "assets/images/salon-at-home/salon4.jpg" },
    { id: "beauty-corner-mumbai", name: "Beauty Corner Mumbai", category: "salon-at-home", subServices: ["Haircut & Styling", "Manicure & Pedicure"], years: 5, rating: 4.7, reviews: 241, distance: "3.0 km", startingPrice: 399, location: "Mumbai, Maharashtra", jobsDone: 588, availableToday: true, verified: true, cityId: 5, image: "assets/images/salon-at-home/salon1.jpg" },

    // plumbing: Mumbai(5)
    { id: "rapidflow-plumbing-mum", name: "RapidFlow Plumbing", category: "plumbing", subServices: ["Plumbing"], years: 7, rating: 4.8, reviews: 334, distance: "2.4 km", startingPrice: 349, location: "Mumbai, Maharashtra", jobsDone: 856, availableToday: true, verified: true, cityId: 5, image: "assets/images/plumbing/plumber5.jpg.jpeg" },

    // electrician: Chennai(1), Hyderabad(3)
    { id: "voltfix-chennai", name: "VoltFix Electricians", category: "electrician", subServices: ["Electrician"], years: 6, rating: 4.8, reviews: 309, distance: "2.5 km", startingPrice: 329, location: "Chennai, Tamil Nadu", jobsDone: 780, availableToday: true, verified: true, cityId: 1, image: "assets/images/electrician/ele1.jpg.jpeg" },
    { id: "wiretech-hyd", name: "WireTech Electricals", category: "electrician", subServices: ["Electrician"], years: 5, rating: 4.7, reviews: 247, distance: "1.9 km", startingPrice: 299, location: "Hyderabad, Telangana", jobsDone: 602, availableToday: true, verified: true, cityId: 3, image: "assets/images/electrician/ele3.jpg.jpeg" },

    // appliance-repair-installation: Chennai(1), Bangalore(2)
    { id: "repairzone-chennai", name: "RepairZone Appliances", category: "appliance-repair-installation", subServices: ["Washing Machine", "Refrigerator", "AC"], years: 7, rating: 4.8, reviews: 362, distance: "2.6 km", startingPrice: 549, location: "Chennai, Tamil Nadu", jobsDone: 892, availableToday: true, verified: true, cityId: 1, image: "assets/images/appliance-repair/washingmachine.jpg.jpeg" },
    { id: "fixmaster-blr", name: "FixMaster Appliances", category: "appliance-repair-installation", subServices: ["TV", "AC", "Laptop/Desktop"], years: 6, rating: 4.7, reviews: 278, distance: "3.2 km", startingPrice: 499, location: "Bangalore, Karnataka", jobsDone: 674, availableToday: false, verified: true, cityId: 2, image: "assets/images/appliance-repair/ACrepair.jpg.jpeg" },

    // pest-control: Bangalore(2)
    { id: "pestaway-blr", name: "PestAway Bangalore", category: "pest-control", subServices: ["General Pest Control", "Cockroach Control"], years: 6, rating: 4.8, reviews: 291, distance: "2.1 km", startingPrice: 849, location: "Bangalore, Karnataka", jobsDone: 718, availableToday: true, verified: true, cityId: 2, image: "assets/images/pest-control/pest2.jpg.jpeg" },

    // painting: Hyderabad(3)
    { id: "colorwave-hyd", name: "ColorWave Painters", category: "painting", subServices: ["Painting"], years: 6, rating: 4.7, reviews: 258, distance: "2.7 km", startingPrice: 1249, location: "Hyderabad, Telangana", jobsDone: 634, availableToday: true, verified: true, cityId: 3, image: "assets/images/painting/painting3.jpg.jpeg" },

    // ── Auto-generated providers (min 3 per city per category) ───────────
    { id: "swiftclean-home-ban2", name: "SwiftClean Home", category: "home-cleaning", subServices: ["Bathroom Cleaning", "Full Home Cleaning"], years: 4, rating: 4.7, reviews: 199, distance: "1.5 km", startingPrice: 799, location: "Bangalore, Karnataka", jobsDone: 387, availableToday: true, verified: true, cityId: 2, image: "assets/images/home-cleaning/clean5.jpg" },
    { id: "cleancraft-solutions-ban3", name: "CleanCraft Solutions", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 5, rating: 4.8, reviews: 269, distance: "2.5 km", startingPrice: 499, location: "Bangalore, Karnataka", jobsDone: 495, availableToday: false, verified: true, cityId: 2, image: "assets/images/home-cleaning/clean6.jpg" },
    { id: "homeshine-experts-hyd2", name: "HomeShine Experts", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 5, rating: 4.8, reviews: 264, distance: "2.1 km", startingPrice: 599, location: "Hyderabad, Telangana", jobsDone: 492, availableToday: false, verified: true, cityId: 3, image: "assets/images/home-cleaning/clean1.jpg" },
    { id: "purehome-services-hyd3", name: "PureHome Services", category: "home-cleaning", subServices: ["Bathroom Cleaning", "Full Home Cleaning"], years: 6, rating: 4.8, reviews: 334, distance: "3.1 km", startingPrice: 799, location: "Hyderabad, Telangana", jobsDone: 600, availableToday: true, verified: true, cityId: 3, image: "assets/images/home-cleaning/clean5.jpg" },
    { id: "brightnest-cleaners-del2", name: "BrightNest Cleaners", category: "home-cleaning", subServices: ["Bathroom Cleaning", "Full Home Cleaning"], years: 6, rating: 4.8, reviews: 329, distance: "2.7 km", startingPrice: 899, location: "Delhi, NCR", jobsDone: 597, availableToday: true, verified: true, cityId: 4, image: "assets/images/home-cleaning/clean6.jpg" },
    { id: "aquaclean-home-del3", name: "AquaClean Home", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 7, rating: 4.6, reviews: 399, distance: "3.7 km", startingPrice: 599, location: "Delhi, NCR", jobsDone: 705, availableToday: true, verified: true, cityId: 4, image: "assets/images/home-cleaning/clean2.jpg" },
    { id: "greenmop-services-mum2", name: "GreenMop Services", category: "home-cleaning", subServices: ["Full Home Cleaning"], years: 7, rating: 4.6, reviews: 394, distance: "3.3 km", startingPrice: 699, location: "Mumbai, Maharashtra", jobsDone: 702, availableToday: true, verified: true, cityId: 5, image: "assets/images/home-cleaning/clean3.jpg" },
    { id: "spotless-living-mum3", name: "Spotless Living", category: "home-cleaning", subServices: ["Bathroom Cleaning", "Full Home Cleaning"], years: 8, rating: 4.7, reviews: 464, distance: "1.5 km", startingPrice: 899, location: "Mumbai, Maharashtra", jobsDone: 810, availableToday: false, verified: true, cityId: 5, image: "assets/images/home-cleaning/clean6.jpg" },
    { id: "stylemate-salon-che2", name: "StyleMate Salon", category: "salon-at-home", subServices: ["Manicure & Pedicure"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 399, location: "Chennai, Tamil Nadu", jobsDone: 314, availableToday: true, verified: true, cityId: 1, image: "assets/images/salon-at-home/salon2.jpg" },
    { id: "glowup-at-home-che3", name: "GlowUp At Home", category: "salon-at-home", subServices: ["Haircut & Styling"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 499, location: "Chennai, Tamil Nadu", jobsDone: 422, availableToday: false, verified: true, cityId: 1, image: "assets/images/salon-at-home/salon3.jpg" },
    { id: "trendylooks-studio-hyd2", name: "TrendyLooks Studio", category: "salon-at-home", subServices: ["Haircut & Styling"], years: 5, rating: 4.8, reviews: 264, distance: "2.1 km", startingPrice: 599, location: "Hyderabad, Telangana", jobsDone: 442, availableToday: false, verified: true, cityId: 3, image: "assets/images/salon-at-home/salon4.jpg" },
    { id: "luxora-beauty-del2", name: "Luxora Beauty", category: "salon-at-home", subServices: ["Haircut & Styling", "Facial & Cleanup"], years: 5, rating: 4.8, reviews: 312, distance: "2.4 km", startingPrice: 349, location: "Delhi, NCR", jobsDone: 506, availableToday: true, verified: true, cityId: 4, image: "assets/images/salon-at-home/salon2.jpg" },
    { id: "chichome-salon-del3", name: "ChicHome Salon", category: "salon-at-home", subServices: ["Facial & Cleanup", "Manicure & Pedicure"], years: 6, rating: 4.9, reviews: 382, distance: "3.4 km", startingPrice: 449, location: "Delhi, NCR", jobsDone: 614, availableToday: false, verified: true, cityId: 4, image: "assets/images/salon-at-home/salon3.jpg" },
    { id: "salonnest-services-mum2", name: "SalonNest Services", category: "salon-at-home", subServices: ["Facial & Cleanup", "Manicure & Pedicure"], years: 6, rating: 4.9, reviews: 377, distance: "3.0 km", startingPrice: 499, location: "Mumbai, Maharashtra", jobsDone: 611, availableToday: false, verified: true, cityId: 5, image: "assets/images/salon-at-home/salon3.jpg" },
    { id: "beautyhive-studio-mum3", name: "BeautyHive Studio", category: "salon-at-home", subServices: ["Haircut & Styling", "Facial & Cleanup"], years: 7, rating: 4.7, reviews: 447, distance: "1.2 km", startingPrice: 599, location: "Mumbai, Maharashtra", jobsDone: 719, availableToday: true, verified: true, cityId: 5, image: "assets/images/salon-at-home/salon4.jpg" },
    { id: "flowfix-plumbers-che2", name: "FlowFix Plumbers", category: "plumbing", subServices: ["Plumbing"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 349, location: "Chennai, Tamil Nadu", jobsDone: 414, availableToday: true, verified: true, cityId: 1, image: "assets/images/plumbing/piumbling2.jpg.jpeg" },
    { id: "tapmaster-services-che3", name: "TapMaster Services", category: "plumbing", subServices: ["Plumbing"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 449, location: "Chennai, Tamil Nadu", jobsDone: 522, availableToday: false, verified: true, cityId: 1, image: "assets/images/plumbing/plumber3.jpg.jpeg" },
    { id: "leakstop-experts-ban2", name: "LeakStop Experts", category: "plumbing", subServices: ["Plumbing"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 249, location: "Bangalore, Karnataka", jobsDone: 519, availableToday: false, verified: true, cityId: 2, image: "assets/images/plumbing/piumber4.jpg.jpeg" },
    { id: "hydrofix-plumbing-ban3", name: "HydroFix Plumbing", category: "plumbing", subServices: ["Plumbing"], years: 6, rating: 4.8, reviews: 303, distance: "3.1 km", startingPrice: 349, location: "Bangalore, Karnataka", jobsDone: 627, availableToday: true, verified: true, cityId: 2, image: "assets/images/plumbing/plumber5.jpg.jpeg" },
    { id: "pipeguard-solutions-hyd2", name: "PipeGuard Solutions", category: "plumbing", subServices: ["Plumbing"], years: 6, rating: 4.8, reviews: 298, distance: "2.7 km", startingPrice: 399, location: "Hyderabad, Telangana", jobsDone: 624, availableToday: true, verified: true, cityId: 3, image: "assets/images/plumbing/plumbing1.jpg.jpeg" },
    { id: "waterworks-pro-hyd3", name: "WaterWorks Pro", category: "plumbing", subServices: ["Plumbing"], years: 7, rating: 4.6, reviews: 368, distance: "3.7 km", startingPrice: 249, location: "Hyderabad, Telangana", jobsDone: 732, availableToday: true, verified: true, cityId: 3, image: "assets/images/plumbing/piumber4.jpg.jpeg" },
    { id: "trustpipe-services-del2", name: "TrustPipe Services", category: "plumbing", subServices: ["Plumbing"], years: 7, rating: 4.6, reviews: 363, distance: "3.3 km", startingPrice: 299, location: "Delhi, NCR", jobsDone: 729, availableToday: true, verified: true, cityId: 4, image: "assets/images/plumbing/plumber3.jpg.jpeg" },
    { id: "valvepro-plumbing-del3", name: "ValvePro Plumbing", category: "plumbing", subServices: ["Plumbing"], years: 8, rating: 4.7, reviews: 433, distance: "1.5 km", startingPrice: 399, location: "Delhi, NCR", jobsDone: 837, availableToday: false, verified: true, cityId: 4, image: "assets/images/plumbing/plumber5.jpg.jpeg" },
    { id: "fluidfix-experts-mum2", name: "FluidFix Experts", category: "plumbing", subServices: ["Plumbing"], years: 8, rating: 4.7, reviews: 428, distance: "3.9 km", startingPrice: 449, location: "Mumbai, Maharashtra", jobsDone: 834, availableToday: false, verified: true, cityId: 5, image: "assets/images/plumbing/piumbling2.jpg.jpeg" },
    { id: "pipecare-india-mum3", name: "PipeCare India", category: "plumbing", subServices: ["Plumbing"], years: 9, rating: 4.8, reviews: 498, distance: "2.1 km", startingPrice: 299, location: "Mumbai, Maharashtra", jobsDone: 942, availableToday: true, verified: true, cityId: 5, image: "assets/images/plumbing/plumbing1.jpg.jpeg" },
    { id: "powergrid-experts-che2", name: "PowerGrid Experts", category: "electrician", subServices: ["Electrician"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 349, location: "Chennai, Tamil Nadu", jobsDone: 414, availableToday: true, verified: true, cityId: 1, image: "assets/images/electrician/ele2.jpg.jpeg" },
    { id: "circuitpro-services-che3", name: "CircuitPro Services", category: "electrician", subServices: ["Electrician"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 449, location: "Chennai, Tamil Nadu", jobsDone: 522, availableToday: false, verified: true, cityId: 1, image: "assets/images/electrician/ele3.jpg.jpeg" },
    { id: "safewire-electricals-ban2", name: "SafeWire Electricals", category: "electrician", subServices: ["Electrician"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 249, location: "Bangalore, Karnataka", jobsDone: 519, availableToday: false, verified: true, cityId: 2, image: "assets/images/electrician/ele5.jpg.jpeg" },
    { id: "electech-solutions-hyd2", name: "ElecTech Solutions", category: "electrician", subServices: ["Electrician"], years: 5, rating: 4.8, reviews: 281, distance: "2.4 km", startingPrice: 349, location: "Hyderabad, Telangana", jobsDone: 583, availableToday: true, verified: true, cityId: 3, image: "assets/images/electrician/ele1.jpg.jpeg" },
    { id: "livewire-experts-hyd3", name: "LiveWire Experts", category: "electrician", subServices: ["Electrician"], years: 6, rating: 4.9, reviews: 351, distance: "3.4 km", startingPrice: 449, location: "Hyderabad, Telangana", jobsDone: 691, availableToday: false, verified: true, cityId: 3, image: "assets/images/electrician/ele4.jpg.jpeg" },
    { id: "energyfix-electricals-del2", name: "EnergyFix Electricals", category: "electrician", subServices: ["Electrician"], years: 6, rating: 4.9, reviews: 346, distance: "3.0 km", startingPrice: 249, location: "Delhi, NCR", jobsDone: 688, availableToday: false, verified: true, cityId: 4, image: "assets/images/electrician/ele5.jpg.jpeg" },
    { id: "zapcare-services-mum2", name: "ZapCare Services", category: "electrician", subServices: ["Electrician"], years: 7, rating: 4.6, reviews: 394, distance: "3.3 km", startingPrice: 349, location: "Mumbai, Maharashtra", jobsDone: 752, availableToday: true, verified: true, cityId: 5, image: "assets/images/electrician/ele3.jpg.jpeg" },
    { id: "amperetech-india-mum3", name: "AmpereTech India", category: "electrician", subServices: ["Electrician"], years: 8, rating: 4.7, reviews: 464, distance: "1.5 km", startingPrice: 449, location: "Mumbai, Maharashtra", jobsDone: 860, availableToday: false, verified: true, cityId: 5, image: "assets/images/electrician/ele1.jpg.jpeg" },
    { id: "serviceking-appliances-che2", name: "ServiceKing Appliances", category: "appliance-repair-installation", subServices: ["AC", "Geyser"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 499, location: "Chennai, Tamil Nadu", jobsDone: 364, availableToday: true, verified: true, cityId: 1, image: "assets/images/appliance-repair/ACrepair.jpg.jpeg" },
    { id: "prorepair-solutions-che3", name: "ProRepair Solutions", category: "appliance-repair-installation", subServices: ["AC", "Washing Machine"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 599, location: "Chennai, Tamil Nadu", jobsDone: 472, availableToday: false, verified: true, cityId: 1, image: "assets/images/appliance-repair/refrigenator.jpg.jpeg" },
    { id: "smartfix-technicians-ban2", name: "SmartFix Technicians", category: "appliance-repair-installation", subServices: ["AC", "Washing Machine"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 649, location: "Bangalore, Karnataka", jobsDone: 469, availableToday: false, verified: true, cityId: 2, image: "assets/images/appliance-repair/gesyer.jpg.jpeg" },
    { id: "homegadget-repair-ban3", name: "HomeGadget Repair", category: "appliance-repair-installation", subServices: ["AC", "Geyser"], years: 6, rating: 4.8, reviews: 303, distance: "3.1 km", startingPrice: 799, location: "Bangalore, Karnataka", jobsDone: 577, availableToday: true, verified: true, cityId: 2, image: "assets/images/appliance-repair/washingmachine.jpg.jpeg" },
    { id: "techserve-india-hyd2", name: "TechServe India", category: "appliance-repair-installation", subServices: ["AC", "Geyser"], years: 6, rating: 4.8, reviews: 298, distance: "2.7 km", startingPrice: 399, location: "Hyderabad, Telangana", jobsDone: 574, availableToday: true, verified: true, cityId: 3, image: "assets/images/appliance-repair/ACrepair.jpg.jpeg" },
    { id: "appliancecare-pro-del2", name: "ApplianceCare Pro", category: "appliance-repair-installation", subServices: ["TV", "Chimney", "Laptop/Desktop"], years: 6, rating: 4.9, reviews: 346, distance: "3.0 km", startingPrice: 499, location: "Delhi, NCR", jobsDone: 638, availableToday: false, verified: true, cityId: 4, image: "assets/images/appliance-repair/refrigenator.jpg.jpeg" },
    { id: "fixpoint-services-del3", name: "FixPoint Services", category: "appliance-repair-installation", subServices: ["Washing Machine", "Refrigerator"], years: 7, rating: 4.7, reviews: 416, distance: "1.2 km", startingPrice: 599, location: "Delhi, NCR", jobsDone: 746, availableToday: true, verified: true, cityId: 4, image: "assets/images/appliance-repair/washingmachine.jpg.jpeg" },
    { id: "shieldpest-services-che2", name: "ShieldPest Services", category: "pest-control", subServices: ["Termite Control", "General Pest Control"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 849, location: "Chennai, Tamil Nadu", jobsDone: 414, availableToday: true, verified: true, cityId: 1, image: "assets/images/pest-control/pest2.jpg.jpeg" },
    { id: "ecoguard-pest-control-che3", name: "EcoGuard Pest Control", category: "pest-control", subServices: ["General Pest Control"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 949, location: "Chennai, Tamil Nadu", jobsDone: 522, availableToday: false, verified: true, cityId: 1, image: "assets/images/pest-control/pest3.jpg.jpeg" },
    { id: "termishield-pro-ban2", name: "TermiShield Pro", category: "pest-control", subServices: ["General Pest Control"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 999, location: "Bangalore, Karnataka", jobsDone: 519, availableToday: false, verified: true, cityId: 2, image: "assets/images/pest-control/pest4.jpg.jpeg" },
    { id: "cleanzone-pest-ban3", name: "CleanZone Pest", category: "pest-control", subServices: ["Cockroach Control", "General Pest Control"], years: 6, rating: 4.8, reviews: 303, distance: "3.1 km", startingPrice: 799, location: "Bangalore, Karnataka", jobsDone: 627, availableToday: true, verified: true, cityId: 2, image: "assets/images/pest-control/pest5.jpg.jpeg" },
    { id: "pestkill-experts-hyd2", name: "PestKill Experts", category: "pest-control", subServices: ["Cockroach Control", "General Pest Control"], years: 6, rating: 4.8, reviews: 298, distance: "2.7 km", startingPrice: 849, location: "Hyderabad, Telangana", jobsDone: 624, availableToday: true, verified: true, cityId: 3, image: "assets/images/pest-control/pest1.jpg.jpeg" },
    { id: "bugfree-solutions-hyd3", name: "BugFree Solutions", category: "pest-control", subServices: ["Termite Control", "General Pest Control"], years: 7, rating: 4.6, reviews: 368, distance: "3.7 km", startingPrice: 949, location: "Hyderabad, Telangana", jobsDone: 732, availableToday: true, verified: true, cityId: 3, image: "assets/images/pest-control/pest4.jpg.jpeg" },
    { id: "nopest-services-del2", name: "NoPest Services", category: "pest-control", subServices: ["Termite Control", "General Pest Control"], years: 7, rating: 4.6, reviews: 363, distance: "3.3 km", startingPrice: 999, location: "Delhi, NCR", jobsDone: 729, availableToday: true, verified: true, cityId: 4, image: "assets/images/pest-control/pest2.jpg.jpeg" },
    { id: "safespace-pest-control-del3", name: "SafeSpace Pest Control", category: "pest-control", subServices: ["General Pest Control"], years: 8, rating: 4.7, reviews: 433, distance: "1.5 km", startingPrice: 799, location: "Delhi, NCR", jobsDone: 837, availableToday: false, verified: true, cityId: 4, image: "assets/images/pest-control/pest5.jpg.jpeg" },
    { id: "pestfree-india-mum2", name: "PestFree India", category: "pest-control", subServices: ["General Pest Control"], years: 8, rating: 4.7, reviews: 428, distance: "3.9 km", startingPrice: 849, location: "Mumbai, Maharashtra", jobsDone: 834, availableToday: false, verified: true, cityId: 5, image: "assets/images/pest-control/pest3.jpg.jpeg" },
    { id: "homeshield-pest-mum3", name: "HomeShield Pest", category: "pest-control", subServices: ["Cockroach Control", "General Pest Control"], years: 9, rating: 4.8, reviews: 498, distance: "2.1 km", startingPrice: 949, location: "Mumbai, Maharashtra", jobsDone: 942, availableToday: true, verified: true, cityId: 5, image: "assets/images/pest-control/pest1.jpg.jpeg" },
    { id: "paintpro-services-che2", name: "PaintPro Services", category: "painting", subServices: ["Painting"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 1149, location: "Chennai, Tamil Nadu", jobsDone: 364, availableToday: true, verified: true, cityId: 1, image: "assets/images/painting/painting2.jpg.jpeg" },
    { id: "wallcraft-painters-che3", name: "WallCraft Painters", category: "painting", subServices: ["Painting"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 1299, location: "Chennai, Tamil Nadu", jobsDone: 472, availableToday: false, verified: true, cityId: 1, image: "assets/images/painting/painting3.jpg.jpeg" },
    { id: "colorstar-painting-ban2", name: "ColorStar Painting", category: "painting", subServices: ["Painting"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 1399, location: "Bangalore, Karnataka", jobsDone: 469, availableToday: false, verified: true, cityId: 2, image: "assets/images/painting/painting4.jpg.jpeg" },
    { id: "arthome-painters-ban3", name: "ArtHome Painters", category: "painting", subServices: ["Painting"], years: 6, rating: 4.8, reviews: 303, distance: "3.1 km", startingPrice: 999, location: "Bangalore, Karnataka", jobsDone: 577, availableToday: true, verified: true, cityId: 2, image: "assets/images/painting/painting1.jpg.jpeg" },
    { id: "freshwall-solutions-hyd2", name: "FreshWall Solutions", category: "painting", subServices: ["Painting"], years: 6, rating: 4.8, reviews: 298, distance: "2.7 km", startingPrice: 1099, location: "Hyderabad, Telangana", jobsDone: 574, availableToday: true, verified: true, cityId: 3, image: "assets/images/painting/painting1.jpg.jpeg" },
    { id: "neatbrush-painters-hyd3", name: "NeatBrush Painters", category: "painting", subServices: ["Painting"], years: 7, rating: 4.6, reviews: 368, distance: "3.7 km", startingPrice: 1199, location: "Hyderabad, Telangana", jobsDone: 682, availableToday: true, verified: true, cityId: 3, image: "assets/images/painting/painting4.jpg.jpeg" },
    { id: "primepaint-india-del2", name: "PrimePaint India", category: "painting", subServices: ["Painting"], years: 7, rating: 4.6, reviews: 363, distance: "3.3 km", startingPrice: 1299, location: "Delhi, NCR", jobsDone: 679, availableToday: true, verified: true, cityId: 4, image: "assets/images/painting/painting2.jpg.jpeg" },
    { id: "wallmasters-pro-del3", name: "WallMasters Pro", category: "painting", subServices: ["Painting"], years: 8, rating: 4.7, reviews: 433, distance: "1.5 km", startingPrice: 1499, location: "Delhi, NCR", jobsDone: 787, availableToday: false, verified: true, cityId: 4, image: "assets/images/painting/painting3.jpg.jpeg" },
    { id: "shadeworks-painting-mum2", name: "ShadeWorks Painting", category: "painting", subServices: ["Painting"], years: 8, rating: 4.7, reviews: 428, distance: "3.9 km", startingPrice: 999, location: "Mumbai, Maharashtra", jobsDone: 784, availableToday: false, verified: true, cityId: 5, image: "assets/images/painting/painting2.jpg.jpeg" },
    { id: "woodwise-carpentry-che2", name: "WoodWise Carpentry", category: "carpentry", subServices: ["Door Repair / Installation"], years: 4, rating: 4.7, reviews: 168, distance: "1.5 km", startingPrice: 449, location: "Chennai, Tamil Nadu", jobsDone: 344, availableToday: true, verified: true, cityId: 1, image: "assets/images/carpentry/carpentry2.jpg.jpeg" },
    { id: "timberpro-services-che3", name: "TimberPro Services", category: "carpentry", subServices: ["Furniture Repair"], years: 5, rating: 4.8, reviews: 238, distance: "2.5 km", startingPrice: 549, location: "Chennai, Tamil Nadu", jobsDone: 452, availableToday: false, verified: true, cityId: 1, image: "assets/images/carpentry/carpentry3.jpg.jpeg" },
    { id: "joineryplus-experts-ban2", name: "JoineryPlus Experts", category: "carpentry", subServices: ["Furniture Repair"], years: 5, rating: 4.8, reviews: 233, distance: "2.1 km", startingPrice: 599, location: "Bangalore, Karnataka", jobsDone: 449, availableToday: false, verified: true, cityId: 2, image: "assets/images/carpentry/carpentry4.jpg.jpeg" },
    { id: "furnicraft-works-ban3", name: "FurniCraft Works", category: "carpentry", subServices: ["Furniture Repair", "Door Repair / Installation"], years: 6, rating: 4.8, reviews: 303, distance: "3.1 km", startingPrice: 399, location: "Bangalore, Karnataka", jobsDone: 557, availableToday: true, verified: true, cityId: 2, image: "assets/images/carpentry/carpentry5.jpg.jpeg" },
    { id: "grainworks-carpentry-hyd2", name: "GrainWorks Carpentry", category: "carpentry", subServices: ["Furniture Repair", "Door Repair / Installation"], years: 6, rating: 4.8, reviews: 298, distance: "2.7 km", startingPrice: 449, location: "Hyderabad, Telangana", jobsDone: 554, availableToday: true, verified: true, cityId: 3, image: "assets/images/carpentry/carpentry1.jpg.jpeg" },
    { id: "doorfix-solutions-hyd3", name: "DoorFix Solutions", category: "carpentry", subServices: ["Door Repair / Installation"], years: 7, rating: 4.6, reviews: 368, distance: "3.7 km", startingPrice: 549, location: "Hyderabad, Telangana", jobsDone: 662, availableToday: true, verified: true, cityId: 3, image: "assets/images/carpentry/carpentry4.jpg.jpeg" },
    { id: "woodart-pro-del2", name: "WoodArt Pro", category: "carpentry", subServices: ["Door Repair / Installation"], years: 7, rating: 4.6, reviews: 363, distance: "3.3 km", startingPrice: 599, location: "Delhi, NCR", jobsDone: 659, availableToday: true, verified: true, cityId: 4, image: "assets/images/carpentry/carpentry2.jpg.jpeg" },
    { id: "craftwood-india-del3", name: "CraftWood India", category: "carpentry", subServices: ["Furniture Repair"], years: 8, rating: 4.7, reviews: 433, distance: "1.5 km", startingPrice: 399, location: "Delhi, NCR", jobsDone: 767, availableToday: false, verified: true, cityId: 4, image: "assets/images/carpentry/carpentry5.jpg.jpeg" },
    { id: "nailit-carpentry-mum2", name: "NailIt Carpentry", category: "carpentry", subServices: ["Furniture Repair"], years: 8, rating: 4.7, reviews: 428, distance: "3.9 km", startingPrice: 449, location: "Mumbai, Maharashtra", jobsDone: 764, availableToday: false, verified: true, cityId: 5, image: "assets/images/carpentry/carpentry3.jpg.jpeg" },
    { id: "furnirepair-experts-mum3", name: "FurniRepair Experts", category: "carpentry", subServices: ["Furniture Repair", "Door Repair / Installation"], years: 9, rating: 4.8, reviews: 498, distance: "2.1 km", startingPrice: 549, location: "Mumbai, Maharashtra", jobsDone: 872, availableToday: true, verified: true, cityId: 5, image: "assets/images/carpentry/carpentry1.jpg.jpeg" }
  ];

  const finalData = {
    ...existingData,
    categories: updatedCategories,
    popularServices: updatedPopularServices,
    providers: updatedProviders
  };

  localStorage.setItem("serveEaseData", JSON.stringify(finalData));
})();