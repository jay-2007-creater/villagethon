/**
 * CityAssist AI Intelligence Engine
 * Provides real-time NLP classification, priority detection, department routing, and duplicate checking
 */

const CityAIEngine = {
  // Knowledge base for keyword analysis and department routing
  rules: [
    {
      category: "Overflowing Bin",
      department: "PMC Solid Waste Management Dept",
      keywords: ["overflow", "dustbin", "bin full", "garbage pile", "spilling", "kachra", "bin", "trash"],
      priorityKeywords: {
        critical: ["school", "hospital", "toxic", "fire", "maggots", "disease", "blocked entrance"],
        high: ["market", "main road", "smell", "rotting", "animals", "dogs", "3 days", "week"]
      }
    },
    {
      category: "Illegal Dumping",
      department: "PMC Vigilance & Sanitation Squad",
      keywords: ["dumping", "debris", "construction", "commercial waste", "night dump", "plastic dump", "empty plot"],
      priorityKeywords: {
        critical: ["river", "canal", "hazardous", "chemical", "burning waste"],
        high: ["footpath", "highway", "heavy trucks", "regular dumping"]
      }
    },
    {
      category: "Missed Pickup",
      department: "PMC Door-to-Door Collection Division",
      keywords: ["missed", "not collected", "truck didn't come", "pickup", "van missing", "morning pickup", "no collection"],
      priorityKeywords: {
        critical: ["entire society", "whole street", "4 days"],
        high: ["society", "apartment", "2 days"]
      }
    },
    {
      category: "Dirty Area",
      department: "PMC Ward Sanitation Team",
      keywords: ["dirty", "filth", "unclean", "sweep", "litter", "gutters", "drain", "mud"],
      priorityKeywords: {
        critical: ["stagnant water", "dengue", "mosquitos", "flooding"],
        high: ["bus stop", "public park", "near temple"]
      }
    },
    {
      category: "Road Littering",
      department: "PMC Road & Highway Maintenance",
      keywords: ["road", "street", "highway", "bottles", "wrappers", "pavement", "divider"],
      priorityKeywords: {
        critical: ["glass on road", "accident risk", "oil spill"],
        high: ["busy junction", "traffic lane"]
      }
    }
  ],

  /**
   * Analyze description in real time to suggest Category, Priority & Department
   */
  analyzeText(text) {
    const lower = text.toLowerCase().trim();
    if (!lower || lower.length < 3) {
      return null;
    }

    let bestMatch = null;
    let maxScore = 0;

    for (const rule of this.rules) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (lower.includes(kw)) {
          score += 2;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = rule;
      }
    }

    if (!bestMatch) {
      bestMatch = {
        category: "Other Issue",
        department: "PMC General Citizen Support",
        priorityKeywords: {}
      };
    }

    // Determine priority
    let priority = "Normal";
    let priorityColor = "#16A34A";

    if (bestMatch.priorityKeywords.critical && bestMatch.priorityKeywords.critical.some(k => lower.includes(k))) {
      priority = "Critical (Urgent Response)";
      priorityColor = "#DC2626";
    } else if (bestMatch.priorityKeywords.high && bestMatch.priorityKeywords.high.some(k => lower.includes(k))) {
      priority = "High Priority";
      priorityColor = "#EA580C";
    }

    // Confidence Calculation (70% - 98%)
    const confidence = Math.min(98, Math.max(72, 70 + maxScore * 8 + Math.floor(Math.random() * 5)));

    return {
      category: bestMatch.category,
      department: bestMatch.department,
      priority: priority,
      priorityColor: priorityColor,
      confidence: confidence,
      duplicateCheck: this.checkDuplicates(lower)
    };
  },

  /**
   * Check for duplicate complaints in the same location / description
   */
  checkDuplicates(text) {
    const existing = CityData.municipality.triageQueue || [];
    for (const ticket of existing) {
      const titleLower = ticket.title.toLowerCase();
      if (text.length > 5 && (titleLower.includes(text) || text.includes(ticket.category.toLowerCase()))) {
        return {
          isDuplicate: true,
          existingId: ticket.id,
          existingTitle: ticket.title,
          location: ticket.location
        };
      }
    }
    return { isDuplicate: false };
  }
};
