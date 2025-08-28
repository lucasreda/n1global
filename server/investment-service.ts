import { db } from "./db";
import { 
  users,
  investmentPools,
  investorProfiles,
  investments,
  investmentTransactions,
  poolPerformanceHistory,
  type Investment,
  type InvestmentPool,
  type InvestorProfile,
  type InvestmentTransaction,
  type PoolPerformanceHistory
} from "@shared/schema";
import { eq, and, desc, sql, sum, avg, count } from "drizzle-orm";

export interface InvestorDashboardData {
  // Portfolio overview
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  returnRate: number;
  monthlyReturn: number;
  
  // Next payment info
  nextPaymentAmount: number;
  nextPaymentDate: string;
  
  // Pool performance
  poolPerformance: {
    poolName: string;
    totalValue: number;
    monthlyReturn: number;
    yearlyReturn: number;
    riskLevel: string;
  };
  
  // Recent transactions
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
    status: string;
    description: string;
  }>;
}

export interface InvestmentOpportunity {
  id: string;
  name: string;
  description: string;
  minInvestment: number;
  monthlyReturn: number;
  yearlyReturn: number;
  riskLevel: string;
  totalValue: number;
  remainingSlots: number;
  strategy: string;
}

export interface PortfolioDistribution {
  poolName: string;
  allocation: number;
  value: number;
  returnRate: number;
  riskLevel: string;
}

export interface PerformanceMetrics {
  period: string;
  date: string;
  value: number;
  returns: number;
  benchmarkReturn?: number;
}

export class InvestmentService {
  
  /**
   * Get comprehensive dashboard data for an investor
   */
  async getInvestorDashboard(investorId: string): Promise<InvestorDashboardData> {
    // Get investor's investments
    const investorInvestments = await db
      .select({
        investment: investments,
        pool: investmentPools,
      })
      .from(investments)
      .leftJoin(investmentPools, eq(investments.poolId, investmentPools.id))
      .where(
        and(
          eq(investments.investorId, investorId),
          eq(investments.status, 'active')
        )
      );

    if (investorInvestments.length === 0) {
      return {
        totalInvested: 0,
        currentValue: 0,
        totalReturns: 0,
        returnRate: 0,
        monthlyReturn: 0,
        nextPaymentAmount: 0,
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        poolPerformance: {
          poolName: 'N/A',
          totalValue: 0,
          monthlyReturn: 0,
          yearlyReturn: 0,
          riskLevel: 'medium',
        },
        recentTransactions: [],
      };
    }

    // Calculate totals
    let totalInvested = 0;
    let currentValue = 0;
    let totalReturns = 0;
    let weightedMonthlyReturn = 0;

    for (const { investment, pool } of investorInvestments) {
      if (investment) {
        const invested = parseFloat(investment.totalInvested);
        const value = parseFloat(investment.currentValue);
        const returns = parseFloat(investment.totalReturns);
        const monthlyReturn = parseFloat(investment.monthlyReturn || '0');
        
        totalInvested += invested;
        currentValue += value;
        totalReturns += returns;
        
        // Weight monthly return by investment value
        if (value > 0) {
          weightedMonthlyReturn += monthlyReturn * (value / currentValue);
        }
      }
    }

    const returnRate = totalInvested > 0 ? (totalReturns / totalInvested) : 0;

    // Get pool performance (use the largest investment)
    const primaryPool = investorInvestments.reduce((max, current) => 
      parseFloat(current.investment?.currentValue || '0') > parseFloat(max.investment?.currentValue || '0') 
        ? current 
        : max
    );

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: investmentTransactions.id,
        type: investmentTransactions.type,
        amount: investmentTransactions.amount,
        createdAt: investmentTransactions.createdAt,
        paymentStatus: investmentTransactions.paymentStatus,
        description: investmentTransactions.description,
      })
      .from(investmentTransactions)
      .where(eq(investmentTransactions.investorId, investorId))
      .orderBy(desc(investmentTransactions.createdAt))
      .limit(10);

    // Calculate next payment (monthly returns)
    const nextPaymentAmount = currentValue * (weightedMonthlyReturn / 100);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1); // First day of next month

    return {
      totalInvested,
      currentValue,
      totalReturns,
      returnRate,
      monthlyReturn: weightedMonthlyReturn,
      nextPaymentAmount,
      nextPaymentDate: nextMonth.toISOString(),
      poolPerformance: {
        poolName: primaryPool.pool?.name || 'COD Operations Fund I',
        totalValue: parseFloat(primaryPool.pool?.totalValue || '0'),
        monthlyReturn: parseFloat(primaryPool.pool?.monthlyReturn || '0'),
        yearlyReturn: parseFloat(primaryPool.pool?.yearlyReturn || '0'),
        riskLevel: primaryPool.pool?.riskLevel || 'medium',
      },
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        date: tx.createdAt?.toISOString() || '',
        status: tx.paymentStatus || 'pending',
        description: tx.description || `${tx.type} transaction`,
      })),
    };
  }

  /**
   * Get available investment opportunities
   */
  async getInvestmentOpportunities(investorId?: string): Promise<InvestmentOpportunity[]> {
    const pools = await db
      .select()
      .from(investmentPools)
      .where(eq(investmentPools.status, 'active'));

    return pools.map(pool => ({
      id: pool.id,
      name: pool.name,
      description: pool.description || '',
      minInvestment: parseFloat(pool.minInvestment),
      monthlyReturn: parseFloat(pool.monthlyReturn || '0'),
      yearlyReturn: parseFloat(pool.yearlyReturn || '0'),
      riskLevel: pool.riskLevel,
      totalValue: parseFloat(pool.totalValue),
      remainingSlots: Math.max(0, Math.floor((parseFloat(pool.totalValue) - parseFloat(pool.totalInvested)) / parseFloat(pool.minInvestment))),
      strategy: pool.investmentStrategy || 'Growth-oriented COD operations investment',
    }));
  }

  /**
   * Get portfolio distribution for an investor
   */
  async getPortfolioDistribution(investorId: string): Promise<PortfolioDistribution[]> {
    const investorInvestments = await db
      .select({
        investment: investments,
        pool: investmentPools,
      })
      .from(investments)
      .leftJoin(investmentPools, eq(investments.poolId, investmentPools.id))
      .where(
        and(
          eq(investments.investorId, investorId),
          eq(investments.status, 'active')
        )
      );

    const totalValue = investorInvestments.reduce((sum, { investment }) => 
      sum + parseFloat(investment?.currentValue || '0'), 0
    );

    return investorInvestments.map(({ investment, pool }) => ({
      poolName: pool?.name || 'Unknown Pool',
      allocation: totalValue > 0 ? (parseFloat(investment?.currentValue || '0') / totalValue) * 100 : 0,
      value: parseFloat(investment?.currentValue || '0'),
      returnRate: parseFloat(investment?.returnRate || '0'),
      riskLevel: pool?.riskLevel || 'medium',
    }));
  }

  /**
   * Get performance history for charts
   */
  async getPerformanceHistory(investorId: string, period: 'daily' | 'monthly' | 'yearly' = 'monthly'): Promise<PerformanceMetrics[]> {
    // For now, return simulated performance history
    // In a real implementation, this would aggregate historical investment performance
    const months = 12;
    const performance: PerformanceMetrics[] = [];
    
    const baseReturn = 0.02; // 2% base monthly return
    const volatility = 0.005; // 0.5% volatility

    for (let i = months; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const randomReturn = baseReturn + (Math.random() - 0.5) * volatility;
      const value = 10000 * Math.pow(1 + randomReturn, months - i); // Compound returns
      const returns = value - 10000;
      
      performance.push({
        period: 'monthly',
        date: date.toISOString(),
        value,
        returns,
        benchmarkReturn: 1.1, // 1.1% CDI benchmark
      });
    }

    return performance;
  }

  /**
   * Create new investment
   */
  async createInvestment(investorId: string, poolId: string, amount: number): Promise<Investment> {
    // Check if pool exists and is active
    const [pool] = await db
      .select()
      .from(investmentPools)
      .where(
        and(
          eq(investmentPools.id, poolId),
          eq(investmentPools.status, 'active')
        )
      );

    if (!pool) {
      throw new Error('Investment pool not found or inactive');
    }

    // Check minimum investment
    if (amount < parseFloat(pool.minInvestment)) {
      throw new Error(`Minimum investment is €${pool.minInvestment}`);
    }

    // Check if investor already has investment in this pool
    const [existingInvestment] = await db
      .select()
      .from(investments)
      .where(
        and(
          eq(investments.investorId, investorId),
          eq(investments.poolId, poolId),
          eq(investments.status, 'active')
        )
      );

    if (existingInvestment) {
      // Add to existing investment
      const newTotalInvested = parseFloat(existingInvestment.totalInvested) + amount;
      const newCurrentValue = parseFloat(existingInvestment.currentValue) + amount; // New investment starts at face value

      const [updatedInvestment] = await db
        .update(investments)
        .set({
          totalInvested: newTotalInvested.toString(),
          currentValue: newCurrentValue.toString(),
          lastTransactionDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(investments.id, existingInvestment.id))
        .returning();

      return updatedInvestment;
    } else {
      // Create new investment
      const [newInvestment] = await db
        .insert(investments)
        .values({
          investorId,
          poolId,
          totalInvested: amount.toString(),
          currentValue: amount.toString(), // New investment starts at face value
          firstInvestmentDate: new Date(),
          lastTransactionDate: new Date(),
        })
        .returning();

      return newInvestment;
    }
  }

  /**
   * Process investment transaction
   */
  async createInvestmentTransaction(
    investorId: string,
    investmentId: string,
    type: 'deposit' | 'withdrawal' | 'return_payment' | 'fee',
    amount: number,
    description?: string,
    paymentMethod?: string
  ): Promise<InvestmentTransaction> {
    const [investment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, investmentId));

    if (!investment) {
      throw new Error('Investment not found');
    }

    // Create transaction
    const [transaction] = await db
      .insert(investmentTransactions)
      .values({
        investmentId,
        investorId,
        poolId: investment.poolId,
        type,
        amount: amount.toString(),
        description,
        paymentMethod,
        paymentStatus: 'pending',
      })
      .returning();

    return transaction;
  }

  /**
   * Get investor profile
   */
  async getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
    const [profile] = await db
      .select()
      .from(investorProfiles)
      .where(eq(investorProfiles.userId, userId));

    return profile || null;
  }

  /**
   * Create or update investor profile
   */
  async upsertInvestorProfile(userId: string, profileData: Partial<InvestorProfile>): Promise<InvestorProfile> {
    const existingProfile = await this.getInvestorProfile(userId);

    if (existingProfile) {
      const [updatedProfile] = await db
        .update(investorProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(investorProfiles.userId, userId))
        .returning();

      return updatedProfile;
    } else {
      const [newProfile] = await db
        .insert(investorProfiles)
        .values({
          userId,
          ...profileData,
        })
        .returning();

      return newProfile;
    }
  }

  /**
   * Simulate investment returns (for simulator)
   */
  simulateReturns(
    initialAmount: number,
    monthlyContribution: number,
    monthlyReturnRate: number,
    months: number
  ): Array<{ month: number; invested: number; value: number; returns: number }> {
    const results = [];
    let totalInvested = initialAmount;
    let currentValue = initialAmount;

    results.push({
      month: 0,
      invested: totalInvested,
      value: currentValue,
      returns: 0,
    });

    for (let month = 1; month <= months; month++) {
      // Add monthly contribution
      totalInvested += monthlyContribution;
      currentValue += monthlyContribution;
      
      // Apply monthly return
      currentValue *= (1 + monthlyReturnRate / 100);
      
      results.push({
        month,
        invested: totalInvested,
        value: Math.round(currentValue * 100) / 100,
        returns: Math.round((currentValue - totalInvested) * 100) / 100,
      });
    }

    return results;
  }
}

export const investmentService = new InvestmentService();