import { type User, type InsertUser, type Order, type InsertOrder, type UpdateOrder, type DashboardMetrics, type FulfillmentLead, type InsertFulfillmentLead, type Product, type InsertProduct, type ShippingProvider } from "@shared/schema";
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
  
  // Fulfillment leads
  getFulfillmentLeads(): Promise<FulfillmentLead[]>;
  getFulfillmentLead(id: string): Promise<FulfillmentLead | undefined>;
  getFulfillmentLeadByNumber(leadNumber: string): Promise<FulfillmentLead | undefined>;
  createFulfillmentLead(lead: InsertFulfillmentLead): Promise<FulfillmentLead>;
  updateFulfillmentLead(id: string, updates: Partial<FulfillmentLead>): Promise<FulfillmentLead | undefined>;
  deleteFulfillmentLead(id: string): Promise<boolean>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  // Shipping providers
  getShippingProviders(): Promise<ShippingProvider[]>;
  getShippingProvider(id: string): Promise<ShippingProvider | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private orders: Map<string, Order>;
  private dashboardMetrics: Map<string, DashboardMetrics>;
  private fulfillmentLeads: Map<string, FulfillmentLead>;
  private products: Map<string, Product>;
  private shippingProviders: Map<string, ShippingProvider>;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.dashboardMetrics = new Map();
    this.fulfillmentLeads = new Map();
    this.products = new Map();
    this.shippingProviders = new Map();
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

    // Create European Fulfillment shipping provider
    const europeanFulfillmentProvider: ShippingProvider = {
      id: randomUUID(),
      name: "European Fulfillment Center",
      apiUrl: "https://api-test.ecomfulfilment.eu/",
      isActive: true,
      createdAt: new Date(),
    };
    this.shippingProviders.set(europeanFulfillmentProvider.id, europeanFulfillmentProvider);

    // Create sample products
    const sampleProducts: Product[] = [
      {
        id: randomUUID(),
        sku: "RS-8050",
        name: "Produto Premium",
        description: "Produto de alta qualidade",
        price: "149.90",
        stock: 25,
        lowStock: 5,
        imageUrl: "https://via.placeholder.com/300x300",
        videoUrl: "https://example.com/video",
        productUrl: "https://example.com/product",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        sku: "PD-933000",
        name: "Parfum Luxo",
        description: "Perfume importado",
        price: "199.50",
        stock: 40,
        lowStock: 10,
        imageUrl: "https://via.placeholder.com/300x300",
        videoUrl: "https://example.com/video2",
        productUrl: "https://example.com/product2",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
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
      role: insertUser.role || "user",
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
      status: insertOrder.status || "processing",
      trackingCode: insertOrder.trackingCode || null,
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

  // Fulfillment leads methods
  async getFulfillmentLeads(): Promise<FulfillmentLead[]> {
    return Array.from(this.fulfillmentLeads.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getFulfillmentLead(id: string): Promise<FulfillmentLead | undefined> {
    return this.fulfillmentLeads.get(id);
  }

  async getFulfillmentLeadByNumber(leadNumber: string): Promise<FulfillmentLead | undefined> {
    return Array.from(this.fulfillmentLeads.values()).find(lead => lead.leadNumber === leadNumber);
  }

  async createFulfillmentLead(insertLead: InsertFulfillmentLead): Promise<FulfillmentLead> {
    const id = randomUUID();
    const leadNumber = `EFC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    
    const lead: FulfillmentLead = {
      ...insertLead,
      id,
      leadNumber,
      customerEmail: insertLead.customerEmail || null,
      status: insertLead.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.fulfillmentLeads.set(id, lead);
    return lead;
  }

  async updateFulfillmentLead(id: string, updates: Partial<FulfillmentLead>): Promise<FulfillmentLead | undefined> {
    const existingLead = this.fulfillmentLeads.get(id);
    if (!existingLead) return undefined;

    const updatedLead: FulfillmentLead = {
      ...existingLead,
      ...updates,
      updatedAt: new Date(),
    };

    this.fulfillmentLeads.set(id, updatedLead);
    return updatedLead;
  }

  async deleteFulfillmentLead(id: string): Promise<boolean> {
    return this.fulfillmentLeads.delete(id);
  }

  // Products methods
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(product => product.sku === sku);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    
    const product: Product = {
      ...insertProduct,
      id,
      description: insertProduct.description || null,
      imageUrl: insertProduct.imageUrl || null,
      videoUrl: insertProduct.videoUrl || null,
      productUrl: insertProduct.productUrl || null,
      isActive: insertProduct.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) return undefined;

    const updatedProduct: Product = {
      ...existingProduct,
      ...updates,
      updatedAt: new Date(),
    };

    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Shipping providers methods
  async getShippingProviders(): Promise<ShippingProvider[]> {
    return Array.from(this.shippingProviders.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getShippingProvider(id: string): Promise<ShippingProvider | undefined> {
    return this.shippingProviders.get(id);
  }
}

export const storage = new MemStorage();
