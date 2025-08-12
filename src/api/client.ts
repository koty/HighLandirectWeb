import axios from 'axios';
import type { 
  ApiResponse, 
  PaginatedResponse, 
  Order, 
  Shipper, 
  Consignee, 
  Product, 
  Store, 
  Address,
  OrderFormData,
  ShipperFormData,
  ConsigneeFormData
} from '@/types';

// CloudFlare Workers API エンドポイント
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const api = {
  // 注文関連
  orders: {
    list: async (params?: { 
      page?: number; 
      limit?: number; 
      status?: string;
      startDate?: string;
      endDate?: string;
      shipperId?: number;
    }): Promise<PaginatedResponse<Order>> => {
      const response = await apiClient.get('/orders', { params });
      return response.data;
    },

    get: async (id: number): Promise<ApiResponse<Order>> => {
      const response = await apiClient.get(`/orders/${id}`);
      return response.data;
    },

    create: async (data: OrderFormData): Promise<ApiResponse<Order>> => {
      const response = await apiClient.post('/orders', data);
      return response.data;
    },

    update: async (id: number, data: Partial<OrderFormData>): Promise<ApiResponse<Order>> => {
      const response = await apiClient.put(`/orders/${id}`, data);
      return response.data;
    },

    updateStatus: async (id: number, status: Order['OrderStatus']): Promise<ApiResponse<Order>> => {
      const response = await apiClient.patch(`/orders/${id}/status`, { status });
      return response.data;
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      const response = await apiClient.delete(`/orders/${id}`);
      return response.data;
    }
  },

  // 荷主関連
  shippers: {
    list: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string;
    }): Promise<PaginatedResponse<Shipper>> => {
      const response = await apiClient.get('/shippers', { params });
      return response.data;
    },

    get: async (id: number): Promise<ApiResponse<Shipper>> => {
      const response = await apiClient.get(`/shippers/${id}`);
      return response.data;
    },

    create: async (data: ShipperFormData): Promise<ApiResponse<Shipper>> => {
      const response = await apiClient.post('/shippers', data);
      return response.data;
    },

    update: async (id: number, data: Partial<ShipperFormData>): Promise<ApiResponse<Shipper>> => {
      const response = await apiClient.put(`/shippers/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      const response = await apiClient.delete(`/shippers/${id}`);
      return response.data;
    }
  },

  // 送付先関連
  consignees: {
    list: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string;
    }): Promise<PaginatedResponse<Consignee>> => {
      const response = await apiClient.get('/consignees', { params });
      return response.data;
    },

    get: async (id: number): Promise<ApiResponse<Consignee>> => {
      const response = await apiClient.get(`/consignees/${id}`);
      return response.data;
    },

    create: async (data: ConsigneeFormData): Promise<ApiResponse<Consignee>> => {
      const response = await apiClient.post('/consignees', data);
      return response.data;
    },

    update: async (id: number, data: Partial<ConsigneeFormData>): Promise<ApiResponse<Consignee>> => {
      const response = await apiClient.put(`/consignees/${id}`, data);
      return response.data;
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      const response = await apiClient.delete(`/consignees/${id}`);
      return response.data;
    }
  },

  // 商品関連
  products: {
    list: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      category?: string;
    }): Promise<PaginatedResponse<Product>> => {
      const response = await apiClient.get('/products', { params });
      return response.data;
    },

    get: async (id: number): Promise<ApiResponse<Product>> => {
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    }
  },

  // 集配所関連
  stores: {
    list: async (params?: { 
      page?: number; 
      limit?: number; 
      search?: string; 
      carrier?: string;
    }): Promise<PaginatedResponse<Store>> => {
      const response = await apiClient.get('/stores', { params });
      return response.data;
    },

    get: async (id: number): Promise<ApiResponse<Store>> => {
      const response = await apiClient.get(`/stores/${id}`);
      return response.data;
    }
  },

  // 住所関連
  addresses: {
    search: async (query: string): Promise<ApiResponse<Address[]>> => {
      const response = await apiClient.get(`/addresses/search`, { 
        params: { q: query } 
      });
      return response.data;
    }
  }
};

export default apiClient;