import axiosClient from './axiosClient';

export const logInteraction = (data) => axiosClient.post('/log-interaction', data);

export const editInteraction = (data) => axiosClient.post('/edit-interaction', data);

export const getInteractions = () => axiosClient.get('/interactions');

export const sendChat = (message) => axiosClient.post('/chat', { message });
