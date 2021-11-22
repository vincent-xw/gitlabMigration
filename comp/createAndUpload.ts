import { groupsData, projectData } from "./readRepo";
import fs from 'fs';
import {execSync} from 'child_process';
import path from "path";
import { ToGitLabApi } from "../const/url";
import { get, post } from "../util/fetch";

const createAndUpload = async (repoInfo: projectData, groupInfo: groupsData) => {
    if (!repoInfo?.id) {
        throw new Error('repoId错误，无法下载仓库代码');
    }
    console.log(`检查当前分组是否已经在大分组下创建`);
    // 现检查有没有分组
    const isHaveGroup = await checkIsHaveGroup(repoInfo.namespace.name);
    // 如果分组不存在，则要先新增分组
    let groupData = isHaveGroup;
    if (!isHaveGroup) {
        console.log(`当前的分组group-${groupInfo.name}未创建，先创建一下`);
        
        groupData = await createGroup({
            name: groupInfo.name,
            path: groupInfo.path,
            isSubGroup: groupInfo.parent_id !== null,
            description: groupInfo.description
        });

        console.log(`group-${groupInfo.name}创建完成`);
        
    }
    console.log(`检查当前项目是否已经在项目组创建`);
    
    // 检查代码库是否已经创建好了，如果创建好了就跳过
    const isHaveProject = await checkIsHaveProject(repoInfo.name, groupData?.id || 0);
    let projectInfo = isHaveProject;
    let isNew = 0;
    if (!isHaveProject) {
        console.log(`未创建，创建项目`);
        // 创建project
        projectInfo = await createProject({
            name: repoInfo.name,
            path: repoInfo.path,
            description: repoInfo.description,
            namespace_id: groupData?.id
        })
        if (!projectInfo.id) {
            console.log(`创建仓库${repoInfo.name}失败`);
            return;
        }
        isNew = 1;
        console.log(`创建仓库${repoInfo.name}成功，id:${projectInfo.id}`);
    }

    // 仓库创建成功后就去着手上传
    // 继续检查当前仓库有无必要去上传，我们采用的方案是，如果是新建仓库直接上传，否则进一步去看仓库内有无提交记录，无记录上传，有记录跳过上传
    if (isNew || !isEmptyRepo(projectInfo)) {
        uploadRepo(repoInfo, projectInfo);
        console.log(`上传成功`);
    } else {
        console.log(`当前仓库${repoInfo.name}已有且不为空，跳过上传`);
    }
    return true;
    
}
interface commitHistory {
    id: string;
    message: string;
}
// 检查是否是个空仓库
const isEmptyRepo = async (projectData?: projectData) => {
    const commitHistory = await get<commitHistory[]>(`${ToGitLabApi}/projects/${projectData?.id}/repository/commits`, {
        page: 1,
        per_page: 20,
    });
    return commitHistory.length <=1;
}

const uploadRepo = async (repoInfo: projectData, projectData?: projectData) => {

    // 尝试下载repo
    // 检查项目目录是否有repos目录
    if (!fs.existsSync(`${__dirname}/repos`)) {
        // console.log('`${__dirname}/repos` :>> ', `${__dirname}/repos`);
        fs.mkdir(`${__dirname}/repos`, {recursive: true}, () => {
            console.log('未检测到repos目录，创建一个成功');       
        })
    }
    // 检查repos目录下有没有我们这次要下载的仓库目录，有的话就删掉直接下载
    if (fs.existsSync(`${__dirname}/repos/${repoInfo.name}`)) {
        fs.rmSync(`${__dirname}/repos/${repoInfo.name}`, {recursive: true, force: true});
        console.log('检测到仓库已存在，删除重新拉取');
    }
    // 因为是同步方法，所以我们可以直接等待命令执行完成
    execSync(`git clone ${repoInfo.ssh_url_to_repo} ${__dirname}/repos/${repoInfo.name}`, {
        stdio: [0, 1, 2], // we need this so node will print the command output
        cwd: path.resolve(__dirname, ''), // path to where you want to save the file
    });
    console.log(`代码库: ${repoInfo.name}下完了`);
    // 如果没有projectData则 不能正确上传
    if (!projectData) {
        return;
    } 
    console.log(`开始上传代码库`);
    console.log(`cd ${__dirname}/repos/${repoInfo.name} && git remote rm origin && git remote add origin ${projectData.ssh_url_to_repo} && git push -u origin master`);
    
    execSync(`cd ${__dirname}/repos/${repoInfo.name} && git remote rm origin && git remote add origin ${projectData.ssh_url_to_repo} && git push -u origin master`, {
        stdio: [0, 1, 2], // we need this so node will print the command output
        cwd: path.resolve(__dirname, ''), // path to where you want to save the file
    });


    
}

interface Project extends Partial<projectData> {
    namespace_id: number | undefined;
}
const createProject = async (projectData: Project) => {
    const res = await post<projectData>(`${ToGitLabApi}/projects`, projectData);
    return res;
}

interface woaGroupData {
    id: number;
    name: string;
    path: string;
    projects: projectData[];
}

/**
 * 检查当前分组下是否已经存在同名的项目
 * @param projectName 项目名称
 * @param groupId 分组id
 */
export const checkIsHaveProject = async (projectName: string, groupId: number) => {
    const groupInfo = await get<woaGroupData>(`${ToGitLabApi}/groups/${groupId}`, {include_subgroups : true});
    const project  = groupInfo.projects.find(item => item.name === projectName);
    return project;
}
/**
 * 检查是否已经存在项目组
 */
export const checkIsHaveGroup = async (groupName: string) => {
    const groupList = await get<groupsData[]>(`${ToGitLabApi}/groups/302036/subgroups`);
    // console.log('groupList :>> ', groupList);
    const distGroup = groupList.find(item => item.name === groupName);
    return distGroup;
}

interface CreateGroupProp {
    name: string;
    path?: string;
    isSubGroup?: boolean;
    description?: string;
    parent_id?: number;
}
const createGroup = async (groupProps: CreateGroupProp) => {
    const {name, path, description} = groupProps;
    // TODO 预先在目标平台创建了根分组，这里直接填写这个项目组的projectId（123456）作为parentId。如无必要这里的parentId 也可以不填
    const data: CreateGroupProp = {
        name,
        path,
        description,
        parent_id: 123456,
    };
    const res = await post(`${ToGitLabApi}/groups`, {...data});
    return res;
}
export default createAndUpload;