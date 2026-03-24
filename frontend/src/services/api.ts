import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem('vm_token');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

// Public APIs
export const getReleases = (pkg?: string) => api.get('/releases', { params: pkg && pkg !== 'all' ? { package: pkg } : {} }).then((r) => r.data);
export const getRelease = (tag: string) => api.get(`/releases/${tag}`).then((r) => r.data);
export const getPackages = () => api.get('/packages').then((r) => r.data);
export const getPackageReleases = (name: string) => api.get(`/packages/${name}/releases`).then((r) => r.data);
export const getStats = () => api.get('/stats').then((r) => r.data);
export const downloadAsset = (id: number) => {
  window.open(`/api/assets/${id}/download`, '_blank');
};

// Admin APIs
export const adminLogin = (username: string, password: string) =>
  api.post('/admin/login', { username, password }).then((r) => r.data);

export const getAdminReleases = () => api.get('/admin/releases').then((r) => r.data);
export const createRelease = (data: any) => api.post('/admin/releases', data).then((r) => r.data);
export const updateRelease = (id: number, data: any) => api.put(`/admin/releases/${id}`, data).then((r) => r.data);
export const deleteRelease = (id: number) => api.delete(`/admin/releases/${id}`).then((r) => r.data);

export const getAdminPackages = () => api.get('/admin/packages').then((r) => r.data);
export const createPackage = (data: any) => api.post('/admin/packages', data).then((r) => r.data);
export const deletePackage = (id: number) => api.delete(`/admin/packages/${id}`).then((r) => r.data);

export const uploadAsset = (releaseId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('vm_token');
  return axios.post(`/api/admin/releases/${releaseId}/assets`, formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((r) => r.data);
};

export const deleteAsset = (id: number) => api.delete(`/admin/assets/${id}`).then((r) => r.data);
export const getAdminStats = () => api.get('/admin/stats').then((r) => r.data);

// User management
export const getAdminUsers = () => api.get('/admin/users').then((r) => r.data);
export const createUser = (data: { username: string; password: string; role?: string }) =>
  api.post('/admin/users', data).then((r) => r.data);
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}`).then((r) => r.data);

// Jenkins CI APIs
export const getJenkinsConfigs = () => api.get('/admin/jenkins-configs').then((r) => r.data);
export const getJenkinsConfig = (packageId: number) => api.get(`/admin/jenkins-config/${packageId}`).then((r) => r.data);
export const saveJenkinsConfig = (data: any) => api.post('/admin/jenkins-config', data).then((r) => r.data);
export const deleteJenkinsConfig = (packageId: number) => api.delete(`/admin/jenkins-config/${packageId}`).then((r) => r.data);
export const triggerAllJenkinsBuilds = () => api.post('/admin/jenkins-build/trigger-all').then((r) => r.data);
export const getJenkinsBuildSession = (sessionId: string) => api.get(`/admin/jenkins-build/session/${sessionId}`).then((r) => r.data);
export const getJenkinsBuildActive = () => api.get('/admin/jenkins-build/active').then((r) => r.data);
export const getJenkinsBuildHistory = () => api.get('/admin/jenkins-build/history').then((r) => r.data);

export default api;
