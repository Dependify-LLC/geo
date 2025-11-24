import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    login: (credentials: any) => api.post('/auth/login', credentials),
    createUser: (userData: any) => api.post('/auth/users', userData),
    getUsers: () => api.get('/auth/users'),
    updateUser: (id: number, data: any) => api.put(`/auth/users/${id}`, data),
    deleteUser: (id: number) => api.delete(`/auth/users/${id}`),
    changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const searchApi = {
    create: (location: string, keyword: string) =>
        api.post('/search', { location, keyword }),

    get: (id: string) =>
        api.get(`/search/${id}`),

    exportUrl: (id: string, format: 'json' | 'csv') => {
        return `http://localhost:3000/api/search/${id}/sublocations/download`;
    },

    startScraping: (id: string) =>
        api.post(`/search/${id}/scrape`),

    scrapeSubLocation: (id: string, subId: number) =>
        api.post(`/search/${id}/sublocations/${subId}/scrape`),
};

export const locationsApi = {
    getAll: () => api.get('/locations'),
    getSublocations: (id: number) => api.get(`/locations/${id}/sublocations`),
    update: (id: number, name: string) => api.put(`/locations/${id}`, { name }),
    delete: (id: number) => api.delete(`/locations/${id}`),
    addSublocation: (id: number, name: string, type: string) =>
        api.post(`/locations/${id}/sublocations`, { name, type }),
    updateSublocation: (id: number, subId: number, name: string, type: string) =>
        api.put(`/locations/${id}/sublocations/${subId}`, { name, type }),
    deleteSublocation: (id: number, subId: number) =>
        api.delete(`/locations/${id}/sublocations/${subId}`),
};

export const businessesApi = {
    enrich: (businessIds: number[]) => api.post('/businesses/enrich', { businessIds }),
    reResearch: (businessIds: number[]) => api.post('/businesses/re-research', { businessIds }),
    getEnrichment: (id: number) => api.get(`/businesses/${id}/enrichment`),
};
