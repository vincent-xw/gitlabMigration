import Axios, { AxiosRequestConfig } from "axios";
import { FromGitLabKeys, ToGitLabKeys } from "../const/keys";
// 为axios配置超时时长
const axios = Axios.create({
    timeout: 30 * 60 * 1000,
    withCredentials: true,
});

axios.interceptors.request.use((config) => {
    const keys = config.headers ? config.headers.source === 'sg' ? FromGitLabKeys : ToGitLabKeys : ToGitLabKeys;
    if (config.headers) {
        config.headers['PRIVATE-TOKEN'] = keys;
    } else {
        config.headers = {
            'PRIVATE-TOKEN': keys,
        }
    }
    
    return config;
});



export function get<D>(url: string, params?: any, config?: AxiosRequestConfig): Promise<D> {
    return axios.get<D, D>(url, { ...config, params });
}

export function post<D = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<D> {
    return axios.post<D, D>(url, data, config);
}

axios.interceptors.response.use((res) => {
    return Promise.resolve(res.data);
},(error) => {
    const Msg: {
        /**
         * 错误提示
         * @param m 错误文案
         */
        error(m: string): void;
    } = console;

    if (error.response) {
        Msg.error(`系统错误(${error.response.status})：${error.message}`);
    } else if (error.request) {
        Msg.error(`服务未响应：${error.message}`);
    } else {
        Msg.error(`请求失败：${error.message}`);
    }
    return Promise.reject(error);
});