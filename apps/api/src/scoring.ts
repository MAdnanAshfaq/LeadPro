interface LeadData {
  name: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  email?: string;
  phone?: string;
  socialLinks?: string[];
}

interface ScoreResult {
  score: number;
  breakdown: {
    completeness: number;
    ratingScore: number;
    reviewScore: number;
    contactScore: number;
  };
}

/**
 * Deterministic Lead Scoring Algorithm
 * Max Score: 100
 * - Completeness (Name, Phone, Website): up to 30 pts
 * - Google Rating: up to 20 pts (e.g. 5.0 = 20, 4.0 = 16)
 * - Review Count: up to 20 pts (maxed at 100 reviews)
 * - Contact Methods (Email, Socials): up to 30 pts
 */
export function calculateLeadScore(lead: LeadData): ScoreResult {
  let completeness = 0;
  if (lead.name) completeness += 10;
  if (lead.phone) completeness += 10;
  if (lead.website) completeness += 10;

  let ratingScore = 0;
  if (lead.rating) {
    ratingScore = Math.round((lead.rating / 5.0) * 20);
  }

  let reviewScore = 0;
  if (lead.reviewCount) {
    reviewScore = Math.min(20, Math.round((lead.reviewCount / 100) * 20));
  }

  let contactScore = 0;
  if (lead.email) contactScore += 15;
  if (lead.socialLinks && lead.socialLinks.length > 0) {
    contactScore += 15;
  }

  const totalScore = completeness + ratingScore + reviewScore + contactScore;

  return {
    score: totalScore,
    breakdown: {
      completeness,
      ratingScore,
      reviewScore,
      contactScore
    }
  };
}
