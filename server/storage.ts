import { type User, type InsertUser, type Order, type InsertOrder, type UpdateOrder, type DashboardMetrics } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Order operations
  getOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: UpdateOrder): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]>;
  
  // Dashboard metrics
  getDashboardMetrics(date?: string): Promise<DashboardMetrics>;
  updateDashboardMetrics(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private orders: Map<string, Order>;
  private dashboardMetrics: Map<string, DashboardMetrics>;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.dashboardMetrics = new Map();
    this.seedData();
  }

  private async seedData() {
    // Create admin user
    const adminUser: User = {
      id: randomUUID(),
      name: "Administrador",
      email: "admin@cod-dashboard.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample orders
    const sampleOrders: Order[] = [
      {
        id: randomUUID(),
        customerId: randomUUID(),
        customerName: "Maria Silva",
        customerEmail: "maria@example.com",
        amount: "249.90",
        status: "paid",
        shippingProvider: "correios",
        trackingCode: "BR123456789",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        customerId: randomUUID(),
        customerName: "João Santos",
        customerEmail: "joao@example.com",
        amount: "189.50",
        status: "processing",
        shippingProvider: "jadlog",
        trackingCode: "JD987654321",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        customerId: randomUUID(),
        customerName: "Ana Costa",
        customerEmail: "ana@example.com",
        amount: "329.00",
        status: "refused",
        shippingProvider: "correios",
        trackingCode: "BR555666777",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleOrders.forEach(order => {
      this.orders.set(order.id, order);
    });

    await this.updateDashboardMetrics();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      createdAt: new Date(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async getOrders(limit: number = 50, offset: number = 0): Promise<Order[]> {
    const allOrders = Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    return allOrders.slice(offset, offset + limit);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.orders.set(id, order);
    await this.updateDashboardMetrics();
    return order;
  }

  async updateOrder(id: string, updates: UpdateOrder): Promise<Order | undefined> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) return undefined;

    const updatedOrder: Order = {
      ...existingOrder,
      ...updates,
      updatedAt: new Date(),
    };

    this.orders.set(id, updatedOrder);
    await this.updateDashboardMetrics();
    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const deleted = this.orders.delete(id);
    if (deleted) {
      await this.updateDashboardMetrics();
    }
    return deleted;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.status === status);
  }

  async getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.orders.values()).filter(order => {
      const orderDate = new Date(order.createdAt!);
      return orderDate >= start && orderDate <= end;
    });
  }

  async getDashboardMetrics(date?: string): Promise<DashboardMetrics> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const existing = this.dashboardMetrics.get(targetDate);
    if (existing) return existing;

    await this.updateDashboardMetrics();
    return this.dashboardMetrics.get(targetDate) || this.getDefaultMetrics(targetDate);
  }

  async updateDashboardMetrics(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const orders = Array.from(this.orders.values());
    
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === "paid").length;
    const refusedOrders = orders.filter(o => o.status === "refused").length;
    const processingOrders = orders.filter(o => o.status === "processing").length;
    
    const totalRevenue = orders
      .filter(o => o.status === "paid")
      .reduce((sum, o) => sum + parseFloat(o.amount), 0)
      .toFixed(2);
    
    const successRate = totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(2) : "0";

    const metrics: DashboardMetrics = {
      id: randomUUID(),
      date: today,
      totalOrders,
      paidOrders,
      refusedOrders,
      processingOrders,
      totalRevenue,
      successRate,
    };

    this.dashboardMetrics.set(today, metrics);
  }

  private getDefaultMetrics(date: string): DashboardMetrics {
    return {
      id: randomUUID(),
      date,
      totalOrders: 0,
      paidOrders: 0,
      refusedOrders: 0,
      processingOrders: 0,
      totalRevenue: "0",
      successRate: "0",
    };
  }
}

export const storage = new MemStorage();
