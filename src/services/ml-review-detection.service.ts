import { createServiceClient } from '@/lib/supabase';
import { 
  Review, 
  ReviewMLFeatures, 
  MLDetectionResult, 
  MLDetectionStatus,
  ReviewerProfile 
} from '@/types/review';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

interface TextFeatures {
  length: number;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  capsRatio: number;
  punctuationRatio: number;
  uniqueWordsRatio: number;
  repeatedPhrases: number;
  exclamationMarks: number;
  questionMarks: number;
  readabilityScore: number;
  sentimentScore: number;
  languageComplexity: number;
}

interface UserBehaviorFeatures {
  reviewFrequency: number;
  avgTimeBetweenReviews: number;
  reviewTimePatterns: number[];
  deviceConsistency: number;
  locationConsistency: number;
  verificationRate: number;
  helpfulnessRate: number;
  accountAge: number;
  profileCompleteness: number;
}

interface ProductFeatures {
  priceRange: number;
  categoryRisk: number;
  sellerReputation: number;
  reviewDensity: number;
  ratingDistribution: number[];
}

export class MLReviewDetectionService {
  private supabase = createServiceClient();
  private modelVersion = '1.0.0';

  // Main entry point for review analysis
  async analyzeReview(reviewId: string): Promise<MLDetectionResult> {
    try {
      const review = await this.getReviewWithContext(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      // Extract features
      const textFeatures = await this.extractTextFeatures(review);
      const userFeatures = await this.extractUserBehaviorFeatures(review.user_id);
      const productFeatures = await this.extractProductFeatures(review.product_id);

      // Combine all features
      const allFeatures = {
        ...textFeatures,
        ...userFeatures,
        ...productFeatures
      };

      // Run ML models
      const predictions = await this.runMLModels(allFeatures);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore(predictions);

      // Store results
      await this.storeMLResults(reviewId, allFeatures, predictions, overallScore);

      // Update review ML status
      await this.updateReviewMLStatus(reviewId, overallScore);

      const result: MLDetectionResult = {
        review_id: reviewId,
        is_fake_probability: predictions.is_fake,
        is_spam_probability: predictions.is_spam,
        is_bot_probability: predictions.is_bot,
        overall_score: overallScore,
        confidence: predictions.confidence,
        features_analyzed: Object.keys(allFeatures),
        recommendations: this.generateRecommendations(predictions, overallScore)
      };

      return result;
    } catch (error) {
      console.error('ML analysis failed:', error);
      await this.updateReviewMLStatus(reviewId, 0, 'error');
      throw error;
    }
  }

  // Extract text-based features from review content
  private async extractTextFeatures(review: Review): Promise<TextFeatures> {
    const content = review.content || '';
    const title = review.title || '';
    const fullText = `${title} ${content}`.trim();

    if (!fullText) {
      return this.getDefaultTextFeatures();
    }

    const words = fullText.toLowerCase().match(/\b\w+\b/g) || [];
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const uniqueWords = new Set(words);

    // Calculate various text metrics
    const length = fullText.length;
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    const capsRatio = (fullText.match(/[A-Z]/g) || []).length / length;
    const punctuationRatio = (fullText.match(/[.,!?;:]/g) || []).length / length;
    const uniqueWordsRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;
    const exclamationMarks = (fullText.match(/!/g) || []).length;
    const questionMarks = (fullText.match(/\?/g) || []).length;

    // Detect repeated phrases (potential spam indicator)
    const repeatedPhrases = this.detectRepeatedPhrases(words);

    // Calculate readability score (simplified Flesch Reading Ease)
    const readabilityScore = this.calculateReadabilityScore(wordCount, sentenceCount, this.countSyllables(fullText));

    // Simple sentiment analysis
    const sentimentScore = await this.calculateSentimentScore(fullText);

    // Language complexity
    const languageComplexity = this.calculateLanguageComplexity(words, uniqueWords);

    return {
      length,
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      capsRatio,
      punctuationRatio,
      uniqueWordsRatio,
      repeatedPhrases,
      exclamationMarks,
      questionMarks,
      readabilityScore,
      sentimentScore,
      languageComplexity
    };
  }

  // Extract user behavior features
  private async extractUserBehaviorFeatures(userId: string): Promise<UserBehaviorFeatures> {
    const [userReviews, userProfile] = await Promise.all([
      this.getUserReviews(userId),
      this.getUserProfile(userId)
    ]);

    if (!userReviews.length) {
      return this.getDefaultUserFeatures();
    }

    // Calculate review frequency (reviews per month)
    const reviewFrequency = this.calculateReviewFrequency(userReviews);

    // Average time between reviews
    const avgTimeBetweenReviews = this.calculateAvgTimeBetweenReviews(userReviews);

    // Review time patterns (detect bot-like regular intervals)
    const reviewTimePatterns = this.analyzeReviewTimePatterns(userReviews);

    // Device and location consistency (would need session data)
    const deviceConsistency = 0.8; // Placeholder
    const locationConsistency = 0.9; // Placeholder

    // Verification rate
    const verificationRate = userReviews.filter(r => r.is_verified).length / userReviews.length;

    // Helpfulness rate
    const helpfulnessRate = this.calculateHelpfulnessRate(userReviews);

    // Account age in days
    const accountAge = userProfile ? this.calculateAccountAge(userProfile.created_at) : 0;

    // Profile completeness
    const profileCompleteness = userProfile ? this.calculateProfileCompleteness(userProfile) : 0;

    return {
      reviewFrequency,
      avgTimeBetweenReviews,
      reviewTimePatterns,
      deviceConsistency,
      locationConsistency,
      verificationRate,
      helpfulnessRate,
      accountAge,
      profileCompleteness
    };
  }

  // Extract product-related features
  private async extractProductFeatures(productId: string): Promise<ProductFeatures> {
    const { data: product } = await this.supabase
      .from('products')
      .select(`
        price,
        category_id,
        seller_id,
        created_at,
        categories(name),
        seller:users!products_seller_id_fkey(created_at)
      `)
      .eq('id', productId)
      .single();

    if (!product) {
      return this.getDefaultProductFeatures();
    }

    // Price range categorization
    const priceRange = this.categorizePriceRange(product.price);

    // Category risk score (some categories have higher fake review rates)
    const categoryRisk = await this.getCategoryRiskScore(product.category_id);

    // Seller reputation
    const sellerReputation = await this.calculateSellerReputation(product.seller_id);

    // Review density (reviews per day since product launch)
    const reviewDensity = await this.calculateReviewDensity(productId, product.created_at);

    // Rating distribution analysis
    const ratingDistribution = await this.getProductRatingDistribution(productId);

    return {
      priceRange,
      categoryRisk,
      sellerReputation,
      reviewDensity,
      ratingDistribution
    };
  }

  // Run ML models for prediction
  private async runMLModels(features: any): Promise<{
    is_fake: number;
    is_spam: number;
    is_bot: number;
    confidence: number;
  }> {
    // Simplified ML model implementation
    // In production, this would call actual ML models (TensorFlow, PyTorch, etc.)

    // Fake review detection
    const fakeScore = this.calculateFakeScore(features);
    
    // Spam detection
    const spamScore = this.calculateSpamScore(features);
    
    // Bot detection
    const botScore = this.calculateBotScore(features);

    // Confidence calculation
    const confidence = this.calculateConfidence(features);

    return {
      is_fake: Math.min(Math.max(fakeScore, 0), 1),
      is_spam: Math.min(Math.max(spamScore, 0), 1),
      is_bot: Math.min(Math.max(botScore, 0), 1),
      confidence: Math.min(Math.max(confidence, 0), 1)
    };
  }

  // Calculate fake review score
  private calculateFakeScore(features: any): number {
    let score = 0;

    // Text features
    if (features.uniqueWordsRatio < 0.3) score += 0.2; // Too many repeated words
    if (features.repeatedPhrases > 2) score += 0.15; // Repeated phrases
    if (features.length < 20) score += 0.1; // Too short
    if (features.capsRatio > 0.3) score += 0.1; // Too many caps
    if (features.readabilityScore < 30 || features.readabilityScore > 90) score += 0.1; // Unusual readability

    // User behavior features
    if (features.reviewFrequency > 10) score += 0.2; // Too many reviews per month
    if (features.avgTimeBetweenReviews < 1) score += 0.15; // Reviews too close together
    if (features.verificationRate < 0.1) score += 0.2; // Low verification rate
    if (features.accountAge < 30) score += 0.15; // New account
    if (features.profileCompleteness < 0.3) score += 0.1; // Incomplete profile

    // Product features
    if (features.categoryRisk > 0.7) score += 0.1; // High-risk category
    if (features.reviewDensity > 5) score += 0.15; // Too many reviews per day

    return Math.min(score, 1);
  }

  // Calculate spam score
  private calculateSpamScore(features: any): number {
    let score = 0;

    if (features.exclamationMarks > 3) score += 0.2;
    if (features.capsRatio > 0.4) score += 0.25;
    if (features.repeatedPhrases > 3) score += 0.3;
    if (features.punctuationRatio > 0.15) score += 0.15;
    if (features.reviewFrequency > 20) score += 0.25;

    return Math.min(score, 1);
  }

  // Calculate bot score
  private calculateBotScore(features: any): number {
    let score = 0;

    // Temporal patterns indicating bot behavior
    const timePatternVariance = this.calculateVariance(features.reviewTimePatterns);
    if (timePatternVariance < 0.1) score += 0.3; // Too regular posting

    if (features.avgTimeBetweenReviews < 0.5) score += 0.2; // Too frequent
    if (features.deviceConsistency < 0.5) score += 0.15; // Inconsistent devices
    if (features.languageComplexity < 0.3) score += 0.2; // Simple language
    if (features.sentimentScore === 0) score += 0.1; // Neutral sentiment

    return Math.min(score, 1);
  }

  // Calculate confidence in the prediction
  private calculateConfidence(features: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data quality
    if (features.wordCount > 50) confidence += 0.1;
    if (features.accountAge > 365) confidence += 0.1;
    if (features.verificationRate > 0.8) confidence += 0.1;
    if (features.profileCompleteness > 0.8) confidence += 0.1;

    // Decrease confidence for edge cases
    if (features.wordCount < 10) confidence -= 0.2;
    if (features.accountAge < 7) confidence -= 0.2;

    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  // Calculate overall score combining all predictions
  private calculateOverallScore(predictions: any): number {
    // Weighted combination of different scores
    return (
      predictions.is_fake * 0.4 +
      predictions.is_spam * 0.3 +
      predictions.is_bot * 0.3
    ) * predictions.confidence;
  }

  // Store ML analysis results
  private async storeMLResults(
    reviewId: string, 
    features: any, 
    predictions: any, 
    overallScore: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('review_ml_features')
      .insert({
        review_id: reviewId,
        features,
        model_version: this.modelVersion,
        confidence_score: predictions.confidence,
        predictions
      });

    if (error) {
      console.error('Failed to store ML results:', error);
    }
  }

  // Update review ML status
  private async updateReviewMLStatus(
    reviewId: string, 
    score: number, 
    status?: MLDetectionStatus
  ): Promise<void> {
    let mlStatus: MLDetectionStatus = status || 'clean';
    
    if (!status) {
      if (score > 0.8) mlStatus = 'fake';
      else if (score > 0.6) mlStatus = 'suspicious';
      else mlStatus = 'clean';
    }

    const { error } = await this.supabase
      .from('reviews')
      .update({
        ml_score: score,
        ml_status: mlStatus,
        ml_analysis: { analyzed_at: new Date().toISOString(), model_version: this.modelVersion }
      })
      .eq('id', reviewId);

    if (error) {
      console.error('Failed to update ML status:', error);
    }
  }

  // Generate recommendations based on analysis
  private generateRecommendations(predictions: any, overallScore: number): string[] {
    const recommendations: string[] = [];

    if (overallScore > 0.8) {
      recommendations.push('High risk of fake review - recommend immediate moderation');
    } else if (overallScore > 0.6) {
      recommendations.push('Moderate risk - recommend manual review');
    } else if (overallScore > 0.3) {
      recommendations.push('Low risk - monitor for patterns');
    }

    if (predictions.is_spam > 0.7) {
      recommendations.push('High spam probability - check for promotional content');
    }

    if (predictions.is_bot > 0.7) {
      recommendations.push('Possible bot activity - verify user authenticity');
    }

    if (predictions.confidence < 0.5) {
      recommendations.push('Low confidence prediction - collect more data');
    }

    return recommendations;
  }

  // Helper methods

  private async getReviewWithContext(reviewId: string): Promise<Review | null> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error) return null;
    return data;
  }

  private async getUserReviews(userId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  private async getUserProfile(userId: string): Promise<any> {
    const { data } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    return data;
  }

  private detectRepeatedPhrases(words: string[]): number {
    const phrases: Record<string, number> = {};
    
    // Check for 2-3 word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }

    return Object.values(phrases).filter(count => count > 1).length;
  }

  private calculateReadabilityScore(wordCount: number, sentenceCount: number, syllableCount: number): number {
    if (sentenceCount === 0 || wordCount === 0) return 0;
    
    const avgSentenceLength = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;
    
    // Simplified Flesch Reading Ease
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }

  private async calculateSentimentScore(text: string): Promise<number> {
    // Simplified sentiment analysis using word lists
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount + negativeCount === 0) return 0;
    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  private calculateLanguageComplexity(words: string[], uniqueWords: Set<string>): number {
    if (words.length === 0) return 0;
    
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const vocabularyRichness = uniqueWords.size / words.length;
    
    return (avgWordLength / 10 + vocabularyRichness) / 2;
  }

  private calculateReviewFrequency(reviews: Review[]): number {
    if (reviews.length < 2) return 0;
    
    const sorted = reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const firstReview = new Date(sorted[0].created_at);
    const lastReview = new Date(sorted[sorted.length - 1].created_at);
    const monthsDiff = (lastReview.getTime() - firstReview.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return monthsDiff > 0 ? reviews.length / monthsDiff : 0;
  }

  private calculateAvgTimeBetweenReviews(reviews: Review[]): number {
    if (reviews.length < 2) return 0;
    
    const sorted = reviews.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const intervals: number[] = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i].created_at).getTime() - new Date(sorted[i-1].created_at).getTime();
      intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private analyzeReviewTimePatterns(reviews: Review[]): number[] {
    // Extract hour of day for each review
    return reviews.map(review => new Date(review.created_at).getHours());
  }

  private calculateHelpfulnessRate(reviews: Review[]): number {
    if (reviews.length === 0) return 0;
    
    const totalVotes = reviews.reduce((sum, r) => sum + r.helpful_count + r.unhelpful_count, 0);
    const helpfulVotes = reviews.reduce((sum, r) => sum + r.helpful_count, 0);
    
    return totalVotes > 0 ? helpfulVotes / totalVotes : 0;
  }

  private calculateAccountAge(createdAt: string): number {
    const accountDate = new Date(createdAt);
    const now = new Date();
    return (now.getTime() - accountDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  private calculateProfileCompleteness(user: any): number {
    let score = 0;
    if (user.name) score += 0.2;
    if (user.avatar_url) score += 0.2;
    if (user.email_verified_at) score += 0.3;
    // Add more profile fields as needed
    return Math.min(score + 0.3, 1); // Base score for having an account
  }

  private categorizePriceRange(price: number): number {
    // Categorize price into risk ranges (0-1)
    if (price < 10) return 0.8; // Very low price - higher risk
    if (price < 50) return 0.4;
    if (price < 200) return 0.2;
    return 0.1; // High price products typically have fewer fake reviews
  }

  private async getCategoryRiskScore(categoryId: number): Promise<number> {
    // This would be based on historical data about fake reviews per category
    // For now, return a default risk score
    return 0.3;
  }

  private async calculateSellerReputation(sellerId: string): Promise<number> {
    const { data: seller } = await this.supabase
      .from('users')
      .select('created_at')
      .eq('id', sellerId)
      .single();

    if (!seller) return 0;

    // Calculate based on account age and other factors
    const accountAge = this.calculateAccountAge(seller.created_at);
    return Math.min(accountAge / 365, 1); // Max reputation after 1 year
  }

  private async calculateReviewDensity(productId: string, productCreatedAt: string): Promise<number> {
    const { data: reviews } = await this.supabase
      .from('reviews')
      .select('created_at')
      .eq('product_id', productId);

    if (!reviews || reviews.length === 0) return 0;

    const productAge = (new Date().getTime() - new Date(productCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return productAge > 0 ? reviews.length / productAge : 0;
  }

  private async getProductRatingDistribution(productId: string): Promise<number[]> {
    const { data: reviews } = await this.supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    if (!reviews || reviews.length === 0) return [0, 0, 0, 0, 0];

    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating - 1]++;
      }
    });

    // Normalize to percentages
    const total = reviews.length;
    return distribution.map(count => count / total);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  // Default feature sets for edge cases
  private getDefaultTextFeatures(): TextFeatures {
    return {
      length: 0,
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      capsRatio: 0,
      punctuationRatio: 0,
      uniqueWordsRatio: 0,
      repeatedPhrases: 0,
      exclamationMarks: 0,
      questionMarks: 0,
      readabilityScore: 0,
      sentimentScore: 0,
      languageComplexity: 0
    };
  }

  private getDefaultUserFeatures(): UserBehaviorFeatures {
    return {
      reviewFrequency: 0,
      avgTimeBetweenReviews: 0,
      reviewTimePatterns: [],
      deviceConsistency: 0.5,
      locationConsistency: 0.5,
      verificationRate: 0,
      helpfulnessRate: 0,
      accountAge: 0,
      profileCompleteness: 0
    };
  }

  private getDefaultProductFeatures(): ProductFeatures {
    return {
      priceRange: 0.5,
      categoryRisk: 0.3,
      sellerReputation: 0.5,
      reviewDensity: 0,
      ratingDistribution: [0, 0, 0, 0, 0]
    };
  }

  // Batch processing for multiple reviews
  async batchAnalyzeReviews(reviewIds: string[]): Promise<MLDetectionResult[]> {
    const results: MLDetectionResult[] = [];
    
    // Process in chunks to avoid overwhelming the system
    const chunkSize = 10;
    for (let i = 0; i < reviewIds.length; i += chunkSize) {
      const chunk = reviewIds.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(reviewId => this.analyzeReview(reviewId).catch(error => {
          console.error(`Failed to analyze review ${reviewId}:`, error);
          return null;
        }))
      );
      
      results.push(...chunkResults.filter(result => result !== null) as MLDetectionResult[]);
    }
    
    return results;
  }

  // Get ML analysis history for a review
  async getReviewMLHistory(reviewId: string): Promise<ReviewMLFeatures[]> {
    const { data, error } = await this.supabase
      .from('review_ml_features')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Retrain model feedback (for future ML model improvements)
  async provideFeedback(reviewId: string, actualOutcome: 'fake' | 'legitimate', confidence: number): Promise<void> {
    // Store feedback for model retraining
    await redis.lpush('ml_feedback_queue', JSON.stringify({
      review_id: reviewId,
      actual_outcome: actualOutcome,
      confidence,
      timestamp: new Date().toISOString()
    }));
  }
}
