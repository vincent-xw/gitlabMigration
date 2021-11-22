
import { get } from "../util/fetch"

export interface groupsData {
    id: number;
    name: string;
    path: string;
    description: string;
    projects: projectData[];
    parent_id: number | null;
}
export interface projectData {
    id: number;
    ssh_url_to_repo: string;
    name: string;
    path: string;
    description: string;
    namespace: {
        id: number;
        name: string;
        path: string;
        kind: string;
        full_path: string;
        parent_id: number | null;
    }
}
export const readGroups = async (api: string, source?: string) => {
    // 第一步先取当前用户的所有group
    const groupList = await get<groupsData[]>(`${api}/groups`, {}, {headers: {source: source || 'sg'}});
    return groupList;
}

const readRepo = async (api: string):Promise<projectData[][]> => {

    const repo = await readGroups(api);
    // 通过读取到的groups查找我们需要到的groupId
    const groupIds = repo.map(item => item.id);
    // 通过groupId获取对应group底下的项目信息
    const repos = await Promise.all(groupIds.map(id => get<projectData[]>(`${api}/groups/${id}`, {}, {headers: {source: 'sg'}})))
    return repos;
}
export default readRepo;